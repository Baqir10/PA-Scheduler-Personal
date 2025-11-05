import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShiftsDisplay } from "@/components/clinics/ShiftsDisplay";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Clinic {
  id: string;
  name: string;
  location: string;
}

export const CalendarShiftSelector = () => {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchClinics();
  }, []);

  const fetchClinics = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // Check if user is an organization
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_org")
        .eq("id", user.id)
        .single();

      let clinicsData;

      if (profile?.is_org) {
        // Fetch clinics for organization
        const { data, error } = await supabase
          .from("clinics")
          .select("id, name, location")
          .eq("organization_id", user.id)
          .order("name");

        if (error) throw error;
        clinicsData = data;
      } else {
        // Fetch clinics for worker
        const { data: worker } = await supabase
          .from("workers")
          .select("worker_clinics")
          .eq("id", user.id)
          .single();

        if (worker?.worker_clinics && worker.worker_clinics.length > 0) {
          const { data, error } = await supabase
            .from("clinics")
            .select("id, name, location")
            .in("id", worker.worker_clinics)
            .order("name");

          if (error) throw error;
          clinicsData = data;
        } else {
          clinicsData = [];
        }
      }

      setClinics(clinicsData || []);
      if (clinicsData && clinicsData.length > 0) {
        setSelectedClinicId(clinicsData[0].id);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load clinics.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mb-6 p-4 bg-card rounded-lg border border-border">
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (clinics.length === 0) {
    return (
      <div className="mb-6 p-4 bg-card rounded-lg border border-border">
        <p className="text-sm text-muted-foreground">No clinics available.</p>
      </div>
    );
  }

  return (
    <div className="mb-6 p-4 bg-card rounded-lg border border-border max-h-[300px]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
        <div className="flex flex-col justify-center">
          <Select value={selectedClinicId} onValueChange={setSelectedClinicId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a clinic" />
            </SelectTrigger>
            <SelectContent>
              {clinics.map((clinic) => (
                <SelectItem key={clinic.id} value={clinic.id}>
                  {clinic.name} - {clinic.location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col h-full">
          {selectedClinicId && (
            <ScrollArea className="flex-1">
              <ShiftsDisplay clinicId={selectedClinicId} isAdmin={false} />
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  );
};
