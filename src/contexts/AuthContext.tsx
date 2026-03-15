import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Database } from "@/integrations/supabase/types";

export interface AppAdmin {
  id: string;
  auth_id: string;
  name: string;
  email: string;
  role: "admin" | "super_admin";
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  session: Session | null;
  currentUser: AppAdmin | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  currentUser: null,
  loading: true,
  signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

async function fetchUserProfile(authId: string): Promise<AppAdmin | null> {
  // @ts-ignore: admins table will be added after user runs SQL migration
  const { data } = await supabase
    .from("admins")
    .select("*")
    .eq("auth_id", authId)
    .maybeSingle();
  return data as unknown as AppAdmin | null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<AppAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let initialized = false;

    // Safety timeout - never stay loading forever
    const timeout = setTimeout(() => {
      if (mounted && !initialized) {
        console.warn("Auth initialization timed out, proceeding without session");
        setLoading(false);
        initialized = true;
      }
    }, 5000);

    // 1. Set up listener FIRST (Supabase v2 recommended pattern)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        setSession(session);
        if (session?.user) {
          // Use setTimeout to avoid Supabase deadlock with simultaneous calls
          setTimeout(async () => {
            try {
              const user = await fetchUserProfile(session.user.id);
              if (mounted) setCurrentUser(user);
            } catch (e) {
              console.error("Failed to fetch user profile:", e);
            }
            if (mounted && !initialized) {
              initialized = true;
              setLoading(false);
            }
          }, 0);
        } else {
          setCurrentUser(null);
          if (mounted && !initialized) {
            initialized = true;
            setLoading(false);
          }
        }
      }
    );

    // 2. Get initial session to trigger the listener
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      // If no session and listener hasn't fired yet, stop loading
      if (!session && !initialized) {
        initialized = true;
        setLoading(false);
      }
    }).catch((e) => {
      console.error("Failed to get session:", e);
      if (mounted && !initialized) {
        initialized = true;
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ session, currentUser, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
