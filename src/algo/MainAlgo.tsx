import { supabase } from "@/integrations/supabase/client";
import { User } from "../contexts/UserContext";
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";

interface AlgoShift {
  id: string;
  clinic_id: string;
}

interface AlgoWorker {
  id: string;
  unavailable_days: string[];
  is_full_time: boolean;
}

interface ShiftAssignment {
  shift_id: string;
  worker_id: string;
  date: string;
}

const getPreviousSunday = (date: Date): Date => {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  d.setDate(d.getDate() - dayOfWeek);
  return d;
};

const getAllDatesForNextMonth = () => {
  const today = new Date();
  const nextMonth = addMonths(today, 1);
  const firstDayOfNextMonth = startOfMonth(nextMonth);
  const lastDayOfNextMonth = endOfMonth(nextMonth);

  // Get all days in next month only
  const allDays = eachDayOfInterval({
    start: firstDayOfNextMonth,
    end: lastDayOfNextMonth
  });

  return allDays;
};

const fetchOrgShiftsAndWorkers = async (user: User) => {
  const shifts: AlgoShift[] = [];
  const shiftMap: Record<string, AlgoShift> = {};
  const workerMap: Record<string, AlgoWorker> = {};
  const clinicWorkerMap: Record<string, string[]> = {};
  const fullTimeWorkers: string[] = [];
  const partTimeWorkers: string[] = [];

  const { data: shiftData, error: shiftError } = await supabase
    .from("shifts")
    .select("*")
    .eq("organization_id", user.organizationId);

  if (shiftError) {
    console.error("Error fetching shifts:", shiftError);
    throw shiftError;
  }

  if (shiftData) {
    shiftData.forEach((shift: any) => {
      const algoShift: AlgoShift = {
        id: shift.id,
        clinic_id: shift.clinic_id,
      };
      shiftMap[shift.id] = algoShift;
      shifts.push(algoShift);
    });
  }

  const { data: workerData, error: workerError } = await supabase
    .from("workers")
    .select("*")
    .eq("organization_id", user.organizationId);

  if (workerError) {
    console.error("Error fetching workers:", workerError);
    throw workerError;
  }

  if (workerData) {
    workerData.forEach((w: any) => {
      workerMap[w.id] = {
        id: w.id,
        unavailable_days: w.unavailable_days || [],
        is_full_time: w.is_full_time,
      };

      if (w.is_full_time) {
        fullTimeWorkers.push(w.id);
      } else {
        partTimeWorkers.push(w.id);
      }

      (w.worker_clinics || []).forEach((clinic: string) => {
        if (!clinicWorkerMap[clinic]) {
          clinicWorkerMap[clinic] = [];
        }
        clinicWorkerMap[clinic].push(w.id);
      });
    });
  }

  return { shifts, shiftMap, workerMap, clinicWorkerMap, fullTimeWorkers, partTimeWorkers };
};

const getWeekKey = (date: Date): string => {
  const sunday = getPreviousSunday(date);
  return format(sunday, "yyyy-MM-dd");
};

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const fetchExistingAssignmentsForWeekBoundary = async (
  organizationId: string,
  firstDayOfNextMonth: Date
) => {
  // Calculate the Sunday that starts the first week of next month
  const boundaryWeekStart = getPreviousSunday(firstDayOfNextMonth);
  
  // Only query if there are days between Sunday and first day of next month
  if (boundaryWeekStart >= firstDayOfNextMonth) {
    return []; // Next month starts on Sunday, no boundary issue
  }
  
  // Query existing assignments from previous month that fall in the boundary week
  const { data, error } = await supabase
    .from("shifts_and_workers")
    .select("worker_id, date")
    .eq("organization_id", organizationId)
    .gte("date", format(boundaryWeekStart, "yyyy-MM-dd"))
    .lt("date", format(firstDayOfNextMonth, "yyyy-MM-dd"));
  
  if (error) {
    console.error("Error fetching boundary week assignments:", error);
    return [];
  }
  
  return data || [];
};

export const generateSchedule = async (user: User): Promise<ShiftAssignment[]> => {
  const assignments: ShiftAssignment[] = [];
  const workerDaysWorkedInWeek: Record<string, Record<string, number>> = {}; // worker_id -> week_key -> count
  const workerShiftsOnDay: Record<string, Set<string>> = {}; // worker_id -> Set of dates they're already assigned

  const { shifts, shiftMap, workerMap, clinicWorkerMap, fullTimeWorkers, partTimeWorkers } = 
    await fetchOrgShiftsAndWorkers(user);

  const allDays = getAllDatesForNextMonth();
  const firstDayOfNextMonth = allDays[0];
  
  // Fetch existing assignments from the boundary week (previous month days in the same week)
  const existingAssignments = await fetchExistingAssignmentsForWeekBoundary(
    user.organizationId,
    firstDayOfNextMonth
  );
  
  // Pre-populate tracking structures with existing assignments from previous month
  for (const assignment of existingAssignments) {
    const dateStr = assignment.date;
    const workerId = assignment.worker_id;
    const weekKey = getWeekKey(new Date(dateStr));
    
    recordAssignment(workerId, dateStr, weekKey, workerDaysWorkedInWeek, workerShiftsOnDay);
  }

  // Process each day
  for (const date of allDays) {
    const dateStr = format(date, "yyyy-MM-dd");
    const weekKey = getWeekKey(date);

    // Process each shift
    for (const shift of shifts) {
      const clinicId = shiftMap[shift.id].clinic_id;
      const eligibleWorkers = clinicWorkerMap[clinicId] || [];

      // Try full-time workers first
      let assigned = false;
      const shuffledFullTime = shuffleArray(
        fullTimeWorkers.filter(wId => eligibleWorkers.includes(wId))
      );

      for (const workerId of shuffledFullTime) {
        if (canAssignWorker(workerId, dateStr, weekKey, workerMap, workerDaysWorkedInWeek, workerShiftsOnDay)) {
          assignments.push({
            shift_id: shift.id,
            worker_id: workerId,
            date: dateStr,
          });
          recordAssignment(workerId, dateStr, weekKey, workerDaysWorkedInWeek, workerShiftsOnDay);
          assigned = true;
          break;
        }
      }

      // If no full-time worker available, try part-time workers
      if (!assigned) {
        const shuffledPartTime = shuffleArray(
          partTimeWorkers.filter(wId => eligibleWorkers.includes(wId))
        );

        for (const workerId of shuffledPartTime) {
          if (canAssignWorker(workerId, dateStr, weekKey, workerMap, workerDaysWorkedInWeek, workerShiftsOnDay)) {
            assignments.push({
              shift_id: shift.id,
              worker_id: workerId,
              date: dateStr,
            });
            recordAssignment(workerId, dateStr, weekKey, workerDaysWorkedInWeek, workerShiftsOnDay);
            assigned = true;
            break;
          }
        }
      }
      // If still not assigned, skip this shift (as per requirements)
    }
  }

  return assignments;
};

const canAssignWorker = (
  workerId: string,
  dateStr: string,
  weekKey: string,
  workerMap: Record<string, AlgoWorker>,
  workerDaysWorkedInWeek: Record<string, Record<string, number>>,
  workerShiftsOnDay: Record<string, Set<string>>
): boolean => {
  const worker = workerMap[workerId];
  
  // Check if worker is unavailable on this day
  if (worker.unavailable_days.includes(dateStr)) {
    return false;
  }

  // Check if worker already has a shift on this day (across all clinics)
  if (workerShiftsOnDay[workerId]?.has(dateStr)) {
    return false;
  }

  // Check if worker has already worked 3 days this week
  const daysWorked = workerDaysWorkedInWeek[workerId]?.[weekKey] || 0;
  if (daysWorked >= 3) {
    return false;
  }

  return true;
};

const recordAssignment = (
  workerId: string,
  dateStr: string,
  weekKey: string,
  workerDaysWorkedInWeek: Record<string, Record<string, number>>,
  workerShiftsOnDay: Record<string, Set<string>>
) => {
  // Initialize structures if needed
  if (!workerDaysWorkedInWeek[workerId]) {
    workerDaysWorkedInWeek[workerId] = {};
  }
  if (!workerDaysWorkedInWeek[workerId][weekKey]) {
    workerDaysWorkedInWeek[workerId][weekKey] = 0;
  }
  if (!workerShiftsOnDay[workerId]) {
    workerShiftsOnDay[workerId] = new Set();
  }

  // Record the assignment
  workerDaysWorkedInWeek[workerId][weekKey]++;
  workerShiftsOnDay[workerId].add(dateStr);
};

export const saveScheduleToDatabase = async (
  assignments: ShiftAssignment[],
  organizationId: string
) => {
  // Delete existing assignments for next month
  const today = new Date();
  const nextMonth = addMonths(today, 1);
  const firstDayOfNextMonth = format(startOfMonth(nextMonth), "yyyy-MM-dd");
  const lastDayOfNextMonth = format(endOfMonth(nextMonth), "yyyy-MM-dd");

  await supabase
    .from("shifts_and_workers")
    .delete()
    .eq("organization_id", organizationId)
    .gte("date", firstDayOfNextMonth)
    .lte("date", lastDayOfNextMonth);

  // Insert new assignments
  const records = assignments.map(a => ({
    shift_id: a.shift_id,
    worker_id: a.worker_id,
    date: a.date,
    organization_id: organizationId,
  }));

  const { error } = await supabase
    .from("shifts_and_workers")
    .insert(records);

  if (error) {
    console.error("Error saving schedule:", error);
    throw error;
  }
};
