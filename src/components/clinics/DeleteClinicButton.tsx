import { Button } from "../ui/button";
import { Trash2 } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "../ui/alert-dialog";
import { supabase } from "../../integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "../../contexts/UserContext";

interface DeleteClinicButtonProps {
    clinicId: string;
    clinicName: string;
    onDelete?: () => void;
}

export const DeleteClinicButton = ({
    clinicId,
    clinicName,
    onDelete,
}: DeleteClinicButtonProps) => {
    const { toast } = useToast();
    const { user, refreshUser } = useUser();

    const handleDeleteClinic = async () => {
        if (!user?.organizationId) return;

        try {
            // Delete all shifts associated with the clinic
            const { error: shiftsDeleteError } = await supabase
                .from("shifts")
                .delete()
                .eq("clinic_id", clinicId);

            if (shiftsDeleteError) throw shiftsDeleteError;

            // Delete the clinic from clinics table
            const { error: deleteError } = await supabase
                .from("clinics")
                .delete()
                .eq("id", clinicId);

            if (deleteError) throw deleteError;

            // Remove clinic from org_clinics array
            const { data: orgData } = await supabase
                .from("organizations")
                .select("org_clinics")
                .eq("id", user.organizationId)
                .single();

            if (orgData) {
                const updatedClinics = (orgData.org_clinics || []).filter(
                    (id: string) => id !== clinicId
                );

                await supabase
                    .from("organizations")
                    .update({ org_clinics: updatedClinics })
                    .eq("id", user.organizationId);
            }

            // Remove clinic from all workers' worker_clinics arrays
            const { data: workers } = await supabase
                .from("workers")
                .select("id, worker_clinics")
                .eq("organization_id", user.organizationId);

            if (workers) {
                for (const worker of workers) {
                    if (worker.worker_clinics?.includes(clinicId)) {
                        const updatedWorkerClinics = worker.worker_clinics.filter(
                            (id: string) => id !== clinicId
                        );

                        await supabase
                            .from("workers")
                            .update({ 
                                worker_clinics: updatedWorkerClinics
                            })
                            .eq("id", worker.id);
                    }
                }
            }

            await refreshUser();
            onDelete?.();

            toast({
                title: "Success",
                description: "Clinic deleted successfully",
            });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    if (!user?.isAdmin) return null;

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the clinic "{clinicName}" and
                        all associated data. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDeleteClinic}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
