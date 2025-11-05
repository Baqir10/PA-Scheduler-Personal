import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type User = {
  id: string;
  email: string;
  isOrg: boolean;
  organizationId: string;
  organizationName: string;
  isAdmin: boolean;
  orgClinics: string[];
  firstName?: string;
  lastName?: string;
  status?: string;
  isFullTime?: boolean;
  workerClinics?: string[];
};

type UserContextType = {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserInfo = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("email, is_org")
        .eq("id", authUser.id)
        .single();

      if (profileError) throw profileError;

      const isOrg = profile?.is_org || false;

      if (isOrg) {
        // Fetch organization data
        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .select("name, org_clinics")
          .eq("id", authUser.id)
          .single();

        if (orgError) throw orgError;

        setUser({
          id: authUser.id,
          email: profile.email,
          isOrg: true,
          organizationId: authUser.id,
          organizationName: orgData.name,
          isAdmin: true,
          orgClinics: orgData.org_clinics,
        })
      } else {
        // Fetch worker data
        const { data: workerData, error: workerError } = await supabase
          .from("workers")
          .select("first_name, last_name, status, is_full_time, organization_id, worker_clinics, is_admin")
          .eq("id", authUser.id)
          .single();

        if (workerError) throw workerError;

        const { data:orgData, error: orgError } = await supabase
          .from("organizations")
          .select("name, org_clinics")
          .eq("id", workerData?.organization_id)
          .single();

        if (orgError) throw orgError;
        
        setUser({
          id: authUser.id,
          email: profile.email,
          isOrg: false,
          organizationId: workerData?.organization_id,
          organizationName: orgData?.name,
          orgClinics: orgData?.org_clinics,
          isAdmin: workerData?.is_admin,
          firstName: workerData?.first_name,
          lastName: workerData?.last_name,
          status: workerData?.status,
          isFullTime: workerData?.is_full_time,
          workerClinics: workerData?.worker_clinics || [],
        });
      }
    } catch (error: any) {
      console.error("Error fetching user info:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserInfo();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        fetchUserInfo();
      } else if (event === "SIGNED_OUT") {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, refreshUser: fetchUserInfo }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
