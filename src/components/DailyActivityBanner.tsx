"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from './SessionContextProvider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, ListChecks } from 'lucide-react';
import DailySummaryModal from './DailySummaryModal';

interface DailySummaryData { cps_id: number; patient: string; opme_count: number; }

const DailyActivityBanner = () => {
  const { user } = useSession();
  const location = useLocation();
  const [summaryData, setSummaryData] = useState<DailySummaryData[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchDailySummary = useCallback(async () => {
    if (!user?.id) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data, error } = await supabase.rpc('get_daily_opme_summary', {
      user_uuid: user.id,
      since: today.toISOString(),
    });

    if (error) {
      console.error("Erro ao buscar resumo diário:", error);
    } else if (data && data.length > 0) {
      setSummaryData(data);
      const isDismissed = sessionStorage.getItem('dailyBannerDismissed');
      if (!isDismissed) {
        setIsVisible(true);
      }
    }
  }, [user?.id]);

  useEffect(() => {
    fetchDailySummary();
  }, [fetchDailySummary]);

  const handleDismiss = () => {
    sessionStorage.setItem('dailyBannerDismissed', 'true');
    setIsVisible(false);
  };

  // Não mostrar o banner na página de bipagem ou se não houver dados
  if (!isVisible || location.pathname === '/opme-scanner' || summaryData.length === 0) {
    return null;
  }

  return (
    <>
      <Alert className="mb-6 border-primary/50 bg-primary/10 dark:bg-primary/20 relative">
        <ListChecks className="h-5 w-5 text-primary" />
        <AlertTitle className="font-semibold text-primary">Resumo de Atividades do Dia</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>
            Hoje, <strong>{summaryData.length}</strong> {summaryData.length === 1 ? 'paciente teve OPMEs bipados' : 'pacientes tiveram OPMEs bipados'}.
          </span>
          <Button size="sm" onClick={() => setIsModalOpen(true)}>Ver Lista</Button>
        </AlertDescription>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </Alert>
      <DailySummaryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        summaryData={summaryData}
      />
    </>
  );
};

export default DailyActivityBanner;