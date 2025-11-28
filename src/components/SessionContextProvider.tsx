"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import LoadingSpinner from './LoadingSpinner';

interface SessionContextType {
  session: Session | null;
  supabase: SupabaseClient;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true); // Inicia como carregando

  useEffect(() => {
    console.log("SessionContextProvider: Iniciando listener de autenticação.");

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("SessionContextProvider: Auth state change event:", event);
        console.log("SessionContextProvider: Current session from auth state change:", currentSession);
        setSession(currentSession);
        setLoading(false); // Define loading como false após o primeiro evento (INITIAL_SESSION)
      }
    );

    return () => {
      console.log("SessionContextProvider: Desinscrevendo do listener de autenticação.");
      authListener.subscription.unsubscribe();
    };
  }, []); // Array de dependências vazio significa que roda apenas uma vez na montagem

  if (loading) {
    console.log("SessionContextProvider: Renderizando LoadingSpinner.");
    return <LoadingSpinner />;
  }

  console.log("SessionContextProvider: Renderizando children com sessão:", session);
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