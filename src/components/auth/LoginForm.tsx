import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useUser } from "@/contexts/UserContext";

export const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshUser } = useUser();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Check if user is a worker and verify their status
        const { data: workerData, error: workerError } = await supabase
          .from("workers")
          .select("status")
          .eq("id", data.user.id)
          .maybeSingle();

        if (workerError) {
          navigate("/");
          throw workerError;
        }

        // If user is a worker, check their status
        if (workerData) {
          if (workerData.status === "pending") {
            // Sign out the user
            await supabase.auth.signOut();

            toast({
              variant: "destructive",
              title: "Approval Required",
              description:
                "Your account is pending approval. Please wait for your organization admin to approve your request.",
              duration: 5000,
            });
            setLoading(false);
            navigate("/");
            return;
          }

          if (workerData.status !== "approved") {
            // Sign out the user if status is anything other than approved
            await supabase.auth.signOut();

            toast({
              variant: "destructive",
              title: "Access Denied",
              description: "Your account status does not allow login. Please contact your organization admin.",
              duration: 5000,
            });
            setLoading(false);
            navigate("/");
            return;
          }
        }

        // User is either an admin or an approved worker
        await refreshUser();
        
        toast({
          title: "Welcome back!",
          description: "Successfully logged in.",
        });

        // Keep loading state active during navigation
        setLoading(false);
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Logging in...
          </>
        ) : (
          "Log in"
        )}
      </Button>
    </form>
  );
};
