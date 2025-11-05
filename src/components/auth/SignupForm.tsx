import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export const SignupForm = () => {
  const [orgEmail, setOrgEmail] = useState("");
  const [orgPassword, setOrgPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [workerEmail, setWorkerEmail] = useState("");
  const [workerPassword, setWorkerPassword] = useState("");
  const [workerFirstName, setWorkerFirstName] = useState("");
  const [workerLastName, setWorkerLastName] = useState("");
  const [organizationEmail, setOrganizationEmail] = useState("");
  const [employmentType, setEmploymentType] = useState<"full-time" | "part-time">("full-time");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleOrgSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // NOTE: For testing purposes, fake emails are allowed.
      // To enforce real emails, enable email confirmation in Supabase Auth settings.
      const { error } = await supabase.auth.signUp({
        email: orgEmail,
        password: orgPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            is_admin: true,
            organization_name: orgName,
          },
        },
      });

      if (error) throw error;

      toast({
        title: "Organization created!",
        description: "You can now log in with your credentials.",
      });

      setOrgEmail("");
      setOrgPassword("");
      setOrgName("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Signup failed",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWorkerSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // NOTE: For testing purposes, fake emails are allowed.
      // To enforce real emails, enable email confirmation in Supabase Auth settings.

      // First, look up the organization by email
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("id")
        .eq("email", organizationEmail)
        .maybeSingle();

      if (orgError) throw orgError;
      if (!orgData) {
        throw new Error("Organization not found with that email address");
      }

      // Sign up the worker
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: workerEmail,
        password: workerPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            is_admin: false,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (signUpData.user) {
        // Create worker entry
        const { error: workerError } = await supabase.from("workers").insert({
          id: signUpData.user.id,
          first_name: workerFirstName,
          last_name: workerLastName,
          organization_id: orgData.id,
          status: "pending",
          is_full_time: employmentType === "full-time",
          is_admin: false,
        });

        if (workerError) throw workerError;

        toast({
          title: "Request sent!",
          description: "The organization has been notified. You'll be able to log in once approved.",
          duration: 5000,
        });

        setWorkerEmail("");
        setWorkerPassword("");
        setWorkerFirstName("");
        setWorkerLastName("");
        setOrganizationEmail("");
        setEmploymentType("full-time");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Signup failed",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tabs defaultValue="organization" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="organization">Organization</TabsTrigger>
        <TabsTrigger value="worker">Worker</TabsTrigger>
      </TabsList>

      <TabsContent value="organization">
        <form onSubmit={handleOrgSignup} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              type="text"
              placeholder="ABC Corporation"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-email">Email</Label>
            <Input
              id="org-email"
              type="email"
              placeholder="organization@company.com"
              value={orgEmail}
              onChange={(e) => setOrgEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-password">Password</Label>
            <Input
              id="org-password"
              type="password"
              placeholder="••••••••"
              value={orgPassword}
              onChange={(e) => setOrgPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Sign up as Organization"
            )}
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="worker">
        <form onSubmit={handleWorkerSignup} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="worker-first-name">First Name</Label>
            <Input
              id="worker-first-name"
              type="text"
              placeholder="John"
              value={workerFirstName}
              onChange={(e) => setWorkerFirstName(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="worker-last-name">Last Name</Label>
            <Input
              id="worker-last-name"
              type="text"
              placeholder="Doe"
              value={workerLastName}
              onChange={(e) => setWorkerLastName(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="worker-email">Email</Label>
            <Input
              id="worker-email"
              type="email"
              placeholder="worker@email.com"
              value={workerEmail}
              onChange={(e) => setWorkerEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="worker-password">Password</Label>
            <Input
              id="worker-password"
              type="password"
              placeholder="••••••••"
              value={workerPassword}
              onChange={(e) => setWorkerPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organization-email">Organization Email</Label>
            <Input
              id="organization-email"
              type="email"
              placeholder="organization@company.com"
              value={organizationEmail}
              onChange={(e) => setOrganizationEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label>Employment Type</Label>
            <RadioGroup 
              value={employmentType} 
              onValueChange={(value: "full-time" | "part-time") => setEmploymentType(value)}
              disabled={loading}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="full-time" id="full-time" />
                <Label htmlFor="full-time" className="font-normal cursor-pointer">Full Time</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="part-time" id="part-time" />
                <Label htmlFor="part-time" className="font-normal cursor-pointer">Part Time</Label>
              </div>
            </RadioGroup>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Requesting access...
              </>
            ) : (
              "Request to Join"
            )}
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  );
};
