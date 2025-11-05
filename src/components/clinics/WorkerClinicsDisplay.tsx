import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Clinic } from "./Clinics";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "../../integrations/supabase/client";
import { User, useUser } from "../../contexts/UserContext";
import { DeleteClinicButton } from "./DeleteClinicButton";
import { ShiftsDisplay } from "./ShiftsDisplay";

interface WorkerClinicsDisplayProps {
    clinics: Clinic[];
}

export const WorkerClinicsDisplay = ({
    clinics,
}: WorkerClinicsDisplayProps) => {
    const { toast } = useToast();
    const { user, refreshUser } = useUser();
    const [workerClinics, setWorkerClinics] = useState<string[]>(
        user?.workerClinics || []
    );
    const [localWorkerClinics, setLocalWorkerClinics] = useState<string[]>(
        user?.workerClinics || []
    );
    const [submitting, setSubmitting] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [expandedClinicId, setExpandedClinicId] = useState<string | null>(null);

    if (!user) {
        return null;
    }

    const toggleShifts = (clinicId: string) => {
        setExpandedClinicId(expandedClinicId === clinicId ? null : clinicId);
    };

    const handleToggleWorkerClinic = (clinicId: string) => {
        const isSelected = localWorkerClinics.includes(clinicId);
        const updatedClinics = isSelected
            ? localWorkerClinics.filter((id) => id !== clinicId)
            : [...localWorkerClinics, clinicId];

        setLocalWorkerClinics(updatedClinics);
        setHasChanges(true);
    };

    const handleSubmitWorkerClinics = async () => {
        if (!user) return;

        setSubmitting(true);
        try {
            // Update worker_clinics in workers table
            const { error: workerError } = await supabase
                .from("workers")
                .update({ 
                    worker_clinics: localWorkerClinics
                })
                .eq("id", user.id);

            if (workerError) throw workerError;

            // Find clinics to add and remove worker from
            const clinicsToAdd = localWorkerClinics.filter(
                (id) => !workerClinics.includes(id)
            );
            const clinicsToRemove = workerClinics.filter(
                (id) => !localWorkerClinics.includes(id)
            );

            // Update worker_ids in clinics being added
            for (const clinicId of clinicsToAdd) {
                const clinic = clinics.find((c) => c.id === clinicId);
                if (clinic) {
                    const updatedWorkerIds = [
                        ...(clinic.worker_ids || []),
                        user.id,
                    ];
                    await supabase
                        .from("clinics")
                        .update({ worker_ids: updatedWorkerIds })
                        .eq("id", clinicId);
                }
            }

            // Update worker_ids in clinics being removed
            for (const clinicId of clinicsToRemove) {
                const clinic = clinics.find((c) => c.id === clinicId);
                if (clinic) {
                    const updatedWorkerIds = (clinic.worker_ids || []).filter(
                        (id) => id !== user.id
                    );
                    await supabase
                        .from("clinics")
                        .update({ worker_ids: updatedWorkerIds })
                        .eq("id", clinicId);
                }
            }

            setWorkerClinics(localWorkerClinics);
            setHasChanges(false);
            await refreshUser();

            toast({
                title: "Success",
                description: "Your clinic selections have been saved",
            });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };


    return (
        <Card>
            <CardHeader>
                <CardTitle>Select Your Clinics</CardTitle>
            </CardHeader>
            <CardContent>
                {clinics.length === 0 ? (
                    <p className="text-muted-foreground">
                        No clinics available in your organization yet.
                    </p>
                ) : (
                    <div className="space-y-4">
                        {clinics.map((clinic) => (
                            <div key={clinic.id} className="border rounded-lg">
                                <div className="flex items-start space-x-3 p-4">
                                    <Checkbox
                                        id={clinic.id}
                                        checked={localWorkerClinics.includes(
                                            clinic.id
                                        )}
                                        onCheckedChange={() =>
                                            handleToggleWorkerClinic(clinic.id)
                                        }
                                    />
                                    <div className="flex-1">
                                        <label
                                            htmlFor={clinic.id}
                                            className="font-semibold cursor-pointer"
                                        >
                                            {clinic.name}
                                        </label>
                                        <p className="text-sm text-muted-foreground">
                                            {clinic.location}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => toggleShifts(clinic.id)}
                                        >
                                            {expandedClinicId === clinic.id ? (
                                                <>
                                                    <ChevronUp className="h-4 w-4 mr-1" />
                                                    Hide Shifts
                                                </>
                                            ) : (
                                                <>
                                                    <ChevronDown className="h-4 w-4 mr-1" />
                                                    View Shifts
                                                </>
                                            )}
                                        </Button>
                                        {user.isAdmin && (
                                            <DeleteClinicButton
                                                clinicId={clinic.id}
                                                clinicName={clinic.name}
                                            />
                                        )}
                                    </div>
                                </div>
                                {expandedClinicId === clinic.id && (
                                    <div className="px-4 pb-4 border-t">
                                        <ShiftsDisplay clinicId={clinic.id} isAdmin={user.isAdmin || false} />
                                    </div>
                                )}
                            </div>
                        ))}
                        {hasChanges && (
                            <Button
                                onClick={handleSubmitWorkerClinics}
                                disabled={submitting}
                                className="w-full mt-4"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    "Submit"
                                )}
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
