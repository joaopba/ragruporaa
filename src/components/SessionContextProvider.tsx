"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import LoadingSpinner from './LoadingSpinner'; // Importa o novo componente

interface SessionContextType {
  session: Session | null;
  supabase: SupabaseClient;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("SessionContextProvider: Initializing auth listener.");
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("SessionContextProvider: Auth state changed. Event:", event, "Session:", currentSession);
        setSession(currentSession);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("SessionContextProvider: Initial getSession result:", session);
      setSession(session);
      setLoading(false);
    }).catch(error => {
      console.error("SessionContextProvider: Error getting session:", error);
      setLoading(false);
    });

    return () => {
      console.log("SessionContextProvider: Unsubscribing auth listener.");
      authListener.subscription.unsubscribe();
    };
  }, []); // Array de dependências vazio para rodar apenas uma vez

  if (loading) {
    console.log("SessionContextProvider: Rendering loading state.");
    return <LoadingSpinner />; // Exibe o spinner enquanto carrega
  }

  console.log("SessionContextProvider: Rendering children. Current session:", session);
  return (
    <SessionContext.Provider value={{ session, supabase }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionContextProvider');
  }
  return context;
};