import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "../ui/button";
import { Plus, Trash2, Save, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
import { Skeleton } from "../ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

export interface Shift {
  id: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  color: string;
}

interface NewShift {
  shift_name: string;
  start_time: string;
  end_time: string;
  color: string;
}

interface ShiftsDisplayProps {
  clinicId: string;
  isAdmin: boolean;
}

const PASTEL_COLORS = [
  { name: "White", value: "#FFFFFF"},
  { name: "Pink", value: "#FFB3BA" },
  { name: "Blue", value: "#BAE1FF" },
  { name: "Yellow", value: "#FFFFBA" },
  { name: "Coral", value: "#FFD3B6" },
  { name: "Mint", value: "#C7FFDA" },
  { name: "Lavender", value: "#E0D4FF" },
  { name: "Peach", value: "#FFE0CC" },
];

const convertTo12Hour = (time24: string): string => {
  const [hours, minutes] = time24.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

export const ShiftsDisplay = ({ clinicId, isAdmin }: ShiftsDisplayProps) => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [newShifts, setNewShifts] = useState<NewShift[]>([]);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [hasNewShifts, setHasNewShifts] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [shiftToDelete, setShiftToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingShifts, setFetchingShifts] = useState(true);
  const { toast } = useToast();
  const { user } = useUser();

  useEffect(() => {
    fetchShifts();
  }, [clinicId]);

  const fetchShifts = async () => {
    setFetchingShifts(true);
    const { data, error } = await supabase
      .from("shifts")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("start_time");

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load shifts.",
      });
      setFetchingShifts(false);
      return;
    }

    setShifts(data || []);
    setFetchingShifts(false);
  };

  const handleAddNewShift = () => {
    setNewShifts([
      ...newShifts,
      { shift_name: "", start_time: "", end_time: "", color: "#FFB3BA" },
    ]);
    setHasNewShifts(true);
  };

  const handleNewShiftChange = (
    index: number,
    field: keyof NewShift,
    value: string
  ) => {
    const updated = [...newShifts];
    updated[index][field] = value;
    setNewShifts(updated);
  };

  const handleStartEditShift = (shift: Shift) => {
    setEditingShiftId(shift.id);
    setEditingShift({ ...shift });
  };

  const handleCancelEdit = () => {
    setEditingShiftId(null);
    setEditingShift(null);
  };

  const handleEditShiftChange = (field: keyof Shift, value: string) => {
    if (editingShift && field !== "id") {
      setEditingShift({ ...editingShift, [field]: value });
    }
  };

  const handleSaveEdit = async () => {
    if (!editingShift) return;

    if (!editingShift.shift_name || !editingShift.start_time || !editingShift.end_time) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "All fields must be filled.",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("shifts")
        .update({
          shift_name: editingShift.shift_name,
          start_time: editingShift.start_time,
          end_time: editingShift.end_time,
          color: editingShift.color,
        })
        .eq("id", editingShift.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Shift updated successfully.",
      });

      setEditingShiftId(null);
      setEditingShift(null);
      await fetchShifts();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update shift.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExistingShift = (shiftId: string) => {
    setShiftToDelete(shiftId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteShift = async () => {
    if (!shiftToDelete) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("shifts")
        .delete()
        .eq("id", shiftToDelete);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Shift deleted successfully.",
      });

      setShowDeleteDialog(false);
      setShiftToDelete(null);
      await fetchShifts();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete shift.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNewShift = (index: number) => {
    const updated = newShifts.filter((_, i) => i !== index);
    setNewShifts(updated);
    setHasNewShifts(updated.length > 0);
  };

  const handleSaveNewShifts = async () => {
    // Validate all new shifts
    const invalidShift = newShifts.find(
      (s) => !s.shift_name || !s.start_time || !s.end_time
    );

    if (invalidShift) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "All shift fields must be filled.",
      });
      return;
    }

    setLoading(true);
    try {
      const { error: insertError } = await supabase.from("shifts").insert(
        newShifts.map((s) => ({
          clinic_id: clinicId,
          organization_id: user?.organizationId,
          shift_name: s.shift_name,
          start_time: s.start_time,
          end_time: s.end_time,
          color: s.color,
        }))
      );

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: "Shifts added successfully.",
      });

      setNewShifts([]);
      setHasNewShifts(false);
      setShowSaveDialog(false);
      await fetchShifts();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save shifts.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 space-y-3">
      {fetchingShifts ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : shifts.length === 0 && newShifts.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-muted-foreground">No shifts available.</p>
        </div>
      ) : (
        <>
          {shifts.map((shift) => (
            <div key={shift.id}>
              {editingShiftId === shift.id && editingShift ? (
                <div className="p-3 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Edit Shift</Label>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <Label htmlFor={`edit-shift-name-${shift.id}`}>
                        Shift Name
                      </Label>
                      <Input
                        id={`edit-shift-name-${shift.id}`}
                        value={editingShift.shift_name}
                        onChange={(e) =>
                          handleEditShiftChange("shift_name", e.target.value)
                        }
                        placeholder="e.g., Morning Shift"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor={`edit-start-time-${shift.id}`}>
                          Start Time
                        </Label>
                        <Input
                          id={`edit-start-time-${shift.id}`}
                          type="time"
                          value={editingShift.start_time}
                          onChange={(e) =>
                            handleEditShiftChange("start_time", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor={`edit-end-time-${shift.id}`}>
                          End Time
                        </Label>
                        <Input
                          id={`edit-end-time-${shift.id}`}
                          type="time"
                          value={editingShift.end_time}
                          onChange={(e) =>
                            handleEditShiftChange("end_time", e.target.value)
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor={`edit-color-${shift.id}`}>Color</Label>
                      <Select
                        value={editingShift.color}
                        onValueChange={(value) =>
                          handleEditShiftChange("color", value)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a color" />
                        </SelectTrigger>
                        <SelectContent>
                          {PASTEL_COLORS.map((color) => (
                            <SelectItem key={color.value} value={color.value}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-4 h-4 rounded border"
                                  style={{ backgroundColor: color.value }}
                                />
                                <span>{color.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      disabled={loading}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={loading}
                      className="flex-1"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {loading ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: shift.color }}
                    />
                    <div>
                      <p className="font-medium">{shift.shift_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {convertTo12Hour(shift.start_time)} -{" "}
                        {convertTo12Hour(shift.end_time)}
                      </p>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleStartEditShift(shift)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteExistingShift(shift.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {newShifts.map((shift, index) => (
            <div key={`new-${index}`} className="p-3 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">New Shift</Label>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteNewShift(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="space-y-2">
                <div>
                  <Label htmlFor={`shift-name-${index}`}>Shift Name</Label>
                  <Input
                    id={`shift-name-${index}`}
                    value={shift.shift_name}
                    onChange={(e) =>
                      handleNewShiftChange(index, "shift_name", e.target.value)
                    }
                    placeholder="e.g., Morning Shift"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor={`start-time-${index}`}>Start Time</Label>
                    <Input
                      id={`start-time-${index}`}
                      type="time"
                      value={shift.start_time}
                      onChange={(e) =>
                        handleNewShiftChange(index, "start_time", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor={`end-time-${index}`}>End Time</Label>
                    <Input
                      id={`end-time-${index}`}
                      type="time"
                      value={shift.end_time}
                      onChange={(e) =>
                        handleNewShiftChange(index, "end_time", e.target.value)
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor={`color-${index}`}>Color</Label>
                  <Select
                    value={shift.color}
                    onValueChange={(value) =>
                      handleNewShiftChange(index, "color", value)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a color" />
                    </SelectTrigger>
                    <SelectContent>
                      {PASTEL_COLORS.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded border"
                              style={{ backgroundColor: color.value }}
                            />
                            <span>{color.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {isAdmin && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddNewShift}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Shift
          </Button>
          {hasNewShifts && (
            <Button
              size="sm"
              onClick={() => setShowSaveDialog(true)}
              disabled={loading}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          )}
        </div>
      )}

      <AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Changes</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to save these new shifts?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveNewShifts} disabled={loading}>
              {loading ? "Saving..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shift</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-destructive">Warning:</strong> You are
              about to delete this shift. Any data associated with this shift
              will also be deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteShift}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
