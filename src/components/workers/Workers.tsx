import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Worker {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  email: string;
  is_full_time: boolean;
}

export const Workers = () => {
  const [approvedWorkers, setApprovedWorkers] = useState<Worker[]>([]);
  const [pendingWorkers, setPendingWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useUser();

  const fetchWorkers = async () => {
    if (!user) return;
    
    try {

      const { data: workersData, error: workersError } = await supabase
        .from("workers")
        .select("id, first_name, last_name, status, is_full_time")
        .eq("organization_id", user.id);

      if (workersError) throw workersError;

      if (!workersData || workersData.length === 0) {
        setApprovedWorkers([]);
        setPendingWorkers([]);
        setLoading(false);
        return;
      }

      const workerIds = workersData.map((w) => w.id);

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", workerIds);

      if (profilesError) throw profilesError;

      const profilesMap = new Map(profilesData?.map((p) => [p.id, p.email]));

      const workersWithEmail = workersData.map((w) => ({
        id: w.id,
        first_name: w.first_name,
        last_name: w.last_name,
        status: w.status,
        email: profilesMap.get(w.id) || "",
        is_full_time: w.is_full_time,
      }));

      setApprovedWorkers(workersWithEmail.filter((w) => w.status === "approved"));
      setPendingWorkers(workersWithEmail.filter((w) => w.status === "pending"));
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchWorkers();
    }
  }, [user]);

  const handleStatusUpdate = async (workerId: string, newStatus: string) => {
    try {
      if (newStatus === "rejected") {
        // Call edge function to delete the worker and their auth credentials
        const { error } = await supabase.functions.invoke("delete-worker", {
          body: { workerId },
        });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Worker rejected and removed",
        });
      } else {
        // For approval, just update the status
        const { error } = await supabase
          .from("workers")
          .update({ status: newStatus })
          .eq("id", workerId);

        if (error) throw error;

        toast({
          title: "Success",
          description: `Worker ${newStatus}`,
        });
      }

      fetchWorkers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  if (loading) {
    return <div className="p-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 className="text-3xl font-bold text-foreground mb-6">Workers</h2>
      <Tabs defaultValue="approved">
        <TabsList>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
        </TabsList>
        
        <TabsContent value="approved">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Employment Type</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvedWorkers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No approved workers
                  </TableCell>
                </TableRow>
              ) : (
                approvedWorkers.map((worker) => (
                  <TableRow key={worker.id}>
                    <TableCell>{worker.first_name} {worker.last_name}</TableCell>
                    <TableCell>{worker.email}</TableCell>
                    <TableCell>{worker.is_full_time ? "Full Time" : "Part Time"}</TableCell>
                    <TableCell className="capitalize">{worker.status}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TabsContent>
        
        <TabsContent value="pending">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Employment Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingWorkers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No pending workers
                  </TableCell>
                </TableRow>
              ) : (
                pendingWorkers.map((worker) => (
                  <TableRow key={worker.id}>
                    <TableCell>{worker.first_name} {worker.last_name}</TableCell>
                    <TableCell>{worker.email}</TableCell>
                    <TableCell>{worker.is_full_time ? "Full Time" : "Part Time"}</TableCell>
                    <TableCell className="capitalize">{worker.status}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(worker.id, "approved")}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleStatusUpdate(worker.id, "rejected")}
                        >
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
};
