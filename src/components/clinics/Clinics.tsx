import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { OrgClinicsDisplay } from "./OrgClinicsDisplay";
import { WorkerClinicsDisplay } from "./WorkerClinicsDisplay";

export type Clinic = {
    id: string;
    name: string;
    location: string;
    organization_id: string;
    worker_ids?: string[];
};

export const Clinics = () => {
    const { toast } = useToast();
    const { user, loading: userLoading, refreshUser } = useUser();
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [newClinic, setNewClinic] = useState({ name: "", location: "" });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchClinicDetails = async () => {
            if (!user?.organizationId) return;

            try {
                // Fetch clinic details based on orgClinics from user context
                const { data: clinicsData, error } = await supabase
                    .from("clinics")
                    .select("*")
                    .eq("organization_id", user.organizationId)
                    .order("name");

                if (error) throw error;
                setClinics(clinicsData || []);
            } catch (error: any) {
                toast({
                    title: "Error",
                    description: error.message,
                    variant: "destructive",
                });
            }
        };

        fetchClinicDetails();
    }, [user?.organizationId, user?.orgClinics, toast]);

    const handleAddClinic = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newClinic.name || !newClinic.location || !user) return;

        setSubmitting(true);
        try {
            const { data, error } = await supabase
                .from("clinics")
                .insert({
                    name: newClinic.name,
                    location: newClinic.location,
                    organization_id: user.id,
                })
                .select()
                .single();

            if (error) throw error;

            const { data: org } = await supabase
                .from("organizations")
                .select("org_clinics")
                .eq("id", user.organizationId)
                .single();

            const updatedClinics = [...(org?.org_clinics || []), data.id];

            await supabase
                .from("organizations")
                .update({ org_clinics: updatedClinics })
                .eq("id", user.organizationId);

            setNewClinic({ name: "", location: "" });
            await refreshUser();

            toast({
                title: "Success",
                description: "Clinic added successfully",
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

    if (userLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-foreground mb-6">Clinics</h2>

            {user?.isAdmin ? (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Add New Clinic</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form
                                onSubmit={handleAddClinic}
                                className="space-y-4"
                            >
                                <div>
                                    <Label htmlFor="name">Clinic Name</Label>
                                    <Input
                                        id="name"
                                        value={newClinic.name}
                                        onChange={(e) =>
                                            setNewClinic({
                                                ...newClinic,
                                                name: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="location">Location</Label>
                                    <Input
                                        id="location"
                                        value={newClinic.location}
                                        onChange={(e) =>
                                            setNewClinic({
                                                ...newClinic,
                                                location: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                </div>
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Adding...
                                        </>
                                    ) : (
                                        "Add Clinic"
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {user?.isOrg ? (
                        <OrgClinicsDisplay clinics={clinics} />
                    ) : (
                        <WorkerClinicsDisplay clinics={clinics} />
                    )}
                </div>
            ) : (
                <WorkerClinicsDisplay clinics={clinics} />
            )}
        </div>
    );
};
