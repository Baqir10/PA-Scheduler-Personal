import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2, Calendar as CalendarIcon } from "lucide-react";
import { CalendarShiftSelector } from "./CalendarShiftSelector";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { generateSchedule, saveScheduleToDatabase } from "@/algo/MainAlgo";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

interface ShiftAssignment {
  shift_id: string;
  worker_id: string;
  date: string;
  shift_name: string;
  shift_color: string;
  worker_name: string;
  clinic_name: string;
}

export const Calendar = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [unavailableDays, setUnavailableDays] = useState<string[]>([]);
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shiftAssignments, setShiftAssignments] = useState<ShiftAssignment[]>([]);
  const [showOrgView, setShowOrgView] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const firstDayWeekday = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const isWorker = user && !user.isOrg;
  const isOrgAdmin = user && user.isOrg;
  const isWorkerAdmin = user && !user.isOrg && user.isAdmin;
  const isFullTime = user?.isFullTime ?? true;

  useEffect(() => {
    if (isWorker && user?.id) {
      fetchUnavailableDays();
    }
    if (user?.id) {
      fetchShiftAssignments();
    }
  }, [user?.id, isWorker, currentDate, showOrgView]);

  const fetchShiftAssignments = async () => {
    if (!user?.organizationId) return;

    try {
      const startDate = format(new Date(year, month, 1), "yyyy-MM-dd");
      const endDate = format(new Date(year, month + 1, 0), "yyyy-MM-dd");

      let query = supabase
        .from("shifts_and_workers")
        .select(`
          shift_id,
          worker_id,
          date,
          shifts (shift_name, color, clinic_id, clinics (name)),
          workers (first_name, last_name)
        `)
        .eq("organization_id", user.organizationId)
        .gte("date", startDate)
        .lte("date", endDate);

      // Filter by worker if not org admin and not in org view mode
      if (!isOrgAdmin && (!isWorkerAdmin || !showOrgView)) {
        query = query.eq("worker_id", user.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching shift assignments:", error);
        return;
      }

      const assignments: ShiftAssignment[] = (data || []).map((item: any) => ({
        shift_id: item.shift_id,
        worker_id: item.worker_id,
        date: item.date,
        shift_name: item.shifts?.shift_name || "",
        shift_color: item.shifts?.color || "#FFFFFF",
        worker_name: `${item.workers?.first_name || ""} ${item.workers?.last_name || ""}`.trim(),
        clinic_name: item.shifts?.clinics?.name || "",
      }));

      setShiftAssignments(assignments);
    } catch (error) {
      console.error("Error fetching shift assignments:", error);
    }
  };

  const fetchUnavailableDays = async () => {
    if (!user?.id) return;

    setIsLoading(true);

    const { data, error } = await supabase
      .from("workers")
      .select("unavailable_days")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching unavailable days:", error);
      setIsLoading(false);
      return;
    }

    const unavailable = data?.unavailable_days || [];
    setUnavailableDays(unavailable);
    
    // Initialize selected days based on worker type
    const currentMonthDays = new Set<string>();
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = format(new Date(year, month, day), "yyyy-MM-dd");
      const isUnavailable = unavailable.includes(dateStr);
      
      if (isFullTime) {
        // Full-time: selected days are unavailable
        if (isUnavailable) {
          currentMonthDays.add(dateStr);
        }
      } else {
        // Part-time: unselected days are unavailable
        if (!isUnavailable) {
          currentMonthDays.add(dateStr);
        }
      }
    }
    setSelectedDays(currentMonthDays);
    setIsLoading(false);
  };

  const previousMonth = () => {
    const newDate = new Date(year, month - 1, 1);
    setCurrentDate(newDate);
    if (isWorker) {
      setHasChanges(false);
    }
  };

  const nextMonth = () => {
    const newDate = new Date(year, month + 1, 1);
    setCurrentDate(newDate);
    if (isWorker) {
      setHasChanges(false);
    }
  };

  const handleDayClick = (day: number) => {
    if (!isWorker) return;

    const today = new Date();
    const clickedDate = new Date(year, month, day);
    
    // Can't select past days
    if (clickedDate < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
      return;
    }

    const dateStr = format(clickedDate, "yyyy-MM-dd");
    const newSelected = new Set(selectedDays);
    
    if (newSelected.has(dateStr)) {
      newSelected.delete(dateStr);
    } else {
      newSelected.add(dateStr);
    }
    
    setSelectedDays(newSelected);
    setHasChanges(true);
  };

  const handleSubmit = async () => {
    if (!user?.id || !isWorker) return;

    setIsSubmitting(true);

    try {
      // Calculate unavailable days based on worker type
      const newUnavailableDays: string[] = [];
      
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = format(new Date(year, month, day), "yyyy-MM-dd");
        const isSelected = selectedDays.has(dateStr);
        
        if (isFullTime) {
          // Full-time: selected days are unavailable
          if (isSelected) {
            newUnavailableDays.push(dateStr);
          }
        } else {
          // Part-time: unselected days are unavailable
          if (!isSelected) {
            newUnavailableDays.push(dateStr);
          }
        }
      }

      const { error } = await supabase
        .from("workers")
        .update({ unavailable_days: newUnavailableDays })
        .eq("id", user.id);

      if (error) throw error;

      setUnavailableDays(newUnavailableDays);
      setHasChanges(false);
      
      toast({
        title: "Success",
        description: "Your availability has been updated.",
      });
    } catch (error) {
      console.error("Error updating unavailable days:", error);
      toast({
        title: "Error",
        description: "Failed to update availability. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateSchedule = async () => {
    if (!user || !isOrgAdmin) return;

    setIsGenerating(true);

    try {
      const assignments = await generateSchedule(user);
      await saveScheduleToDatabase(assignments, user.organizationId);
      
      await fetchShiftAssignments();
      
      toast({
        title: "Success",
        description: `Generated ${assignments.length} shift assignments for next month.`,
      });
    } catch (error) {
      console.error("Error generating schedule:", error);
      toast({
        title: "Error",
        description: "Failed to generate schedule. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearSchedule = async () => {
    if (!user || !isOrgAdmin) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("shifts_and_workers")
        .delete()
        .eq("organization_id", user.organizationId);

      if (error) throw error;

      await fetchShiftAssignments();
      
      toast({
        title: "Success",
        description: "All shift assignments have been cleared.",
      });
    } catch (error) {
      console.error("Error clearing schedule:", error);
      toast({
        title: "Error",
        description: "Failed to clear schedule. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDays = () => {
    const days = [];
    const today = new Date();
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDayWeekday; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-24 bg-muted/30 border border-border" />
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = format(date, "yyyy-MM-dd");
      const isToday = date.getTime() === todayDateOnly.getTime();
      const isPast = date < todayDateOnly;
      const isFuture = date > todayDateOnly;
      const isSelected = selectedDays.has(dateStr);
      const dayAssignments = shiftAssignments.filter(a => a.date === dateStr);
      
      let bgColor = "bg-card";
      let textColor = "text-foreground";
      let hoverEffect = "hover:bg-accent/50";
      let cursorStyle = "cursor-pointer";

      if (isWorker) {
        if (isPast) {
          bgColor = "bg-muted/50";
          textColor = "text-muted-foreground";
          cursorStyle = "cursor-not-allowed";
          hoverEffect = "";
        } else if (isToday) {
          // Check if today is also unavailable
          const isTodayUnavailable = isFullTime ? isSelected : !isSelected;
          
          if (isTodayUnavailable) {
            bgColor = "bg-red-500/20";
            textColor = "text-blue-700 dark:text-blue-300";
          } else {
            bgColor = "bg-blue-500/20";
            textColor = "text-blue-700 dark:text-blue-300";
          }
        } else if (isFuture) {
          // Full-time: selected = unavailable (red), unselected = available (green)
          // Part-time: selected = available (green), unselected = unavailable (red)
          if (isFullTime) {
            if (isSelected) {
              bgColor = "bg-red-500/20";
              textColor = "text-red-700 dark:text-red-300";
            } else {
              bgColor = "bg-green-500/20";
              textColor = "text-green-700 dark:text-green-300";
            }
          } else {
            if (isSelected) {
              bgColor = "bg-green-500/20";
              textColor = "text-green-700 dark:text-green-300";
            } else {
              bgColor = "bg-red-500/20";
              textColor = "text-red-700 dark:text-red-300";
            }
          }
        }
      } else {
        // Organization view
        if (isPast) {
          bgColor = "bg-muted/50";
          textColor = "text-muted-foreground";
        } else if (isToday) {
          bgColor = "bg-accent";
          textColor = "text-primary";
        }
      }

      days.push(
        <div
          key={day}
          onClick={() => handleDayClick(day)}
          className={`h-24 border border-border ${bgColor} ${hoverEffect} transition-colors ${cursorStyle} p-2 overflow-hidden`}
        >
          <div className={`text-sm font-semibold ${textColor} mb-1`}>
            {day}
          </div>
          {dayAssignments.length > 0 && (
            <div className="space-y-1">
              {dayAssignments.slice(0, 2).map((assignment, idx) => {
                const displayText = isWorker && !showOrgView 
                  ? assignment.clinic_name 
                  : assignment.worker_name;
                const titleText = isWorker && !showOrgView
                  ? `${assignment.clinic_name} - ${assignment.shift_name}`
                  : `${assignment.worker_name} - ${assignment.shift_name}`;
                
                return (
                  <div
                    key={idx}
                    className="text-xs px-1 py-0.5 rounded truncate"
                    style={{ 
                      backgroundColor: assignment.shift_color,
                      color: 'hsl(var(--foreground))'
                    }}
                    title={titleText}
                  >
                    {displayText}
                  </div>
                );
              })}
              {dayAssignments.length > 2 && (
                <div className="text-xs text-muted-foreground">
                  +{dayAssignments.length - 2} more
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  if (isLoading && isWorker) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6">
        <CalendarShiftSelector />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <CalendarShiftSelector />
      
      <div className="mb-4 flex items-center justify-between">
        {isOrgAdmin && (
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleGenerateSchedule} 
              disabled={isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Schedule...
                </>
              ) : (
                <>
                  <CalendarIcon className="h-4 w-4" />
                  Generate Schedule
                </>
              )}
            </Button>
            <Button 
              onClick={handleClearSchedule} 
              disabled={isSubmitting}
              variant="destructive"
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Clearing...
                </>
              ) : (
                "Clear Schedule"
              )}
            </Button>
          </div>
        )}
        
        {isWorkerAdmin && (
          <div className="flex items-center gap-2">
            <Switch
              id="org-view"
              checked={showOrgView}
              onCheckedChange={setShowOrgView}
            />
            <Label htmlFor="org-view">
              {showOrgView ? "Organization View" : "My Shifts View"}
            </Label>
          </div>
        )}
      </div>
      
      {isWorker && (
        <div className="mb-4 p-4 bg-muted/50 rounded-lg border border-border">
          <p className="text-sm font-medium text-foreground">
            {isFullTime 
              ? "Select the days you are unavailable to work this month"
              : "Select the days you are available to work this month"
            }
          </p>
          {hasChanges && (
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="mt-3"
            >
              {isSubmitting ? "Saving..." : "Submit Changes"}
            </Button>
          )}
        </div>
      )}
      
      <div className="bg-card rounded-lg shadow-lg border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <Button
            variant="ghost"
            size="icon"
            onClick={previousMonth}
            className="hover:bg-accent"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <h2 className="text-2xl font-semibold text-foreground">
            {MONTHS[month]} {year}
          </h2>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={nextMonth}
            className="hover:bg-accent"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 bg-muted/50">
          {DAYS.map((day) => (
            <div
              key={day}
              className="py-3 text-center text-sm font-semibold text-muted-foreground border-r border-border last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {renderDays()}
        </div>
      </div>
    </div>
  );
};
