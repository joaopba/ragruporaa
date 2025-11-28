"use client";

import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from './SessionContextProvider';
import { toast } from 'sonner';
import { Scan } from 'lucide-react';

const RealtimeNotifier = () => {
  const { profile } = useSession();

  useEffect(() => {
    // Só ativa as notificações para o perfil de Recepção
    if (profile?.role !== 'RECEPÇÃO') {
      return;
    }

    const channel = supabase
      .channel('realtime-opme-links')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'linked_opme' },
        async (payload) => {
          const newLink = payload.new as { cps_id: number };
          
          // Busca o nome do paciente para a notificação ficar mais clara
          const { data: cpsRecord, error } = await supabase
            .from('local_cps_records')
            .select('patient')
            .eq('cps_id', newLink.cps_id)
            .single();

          if (error) {
            console.error("Erro ao buscar dados do paciente para notificação:", error);
            // Mostra uma notificação genérica se não encontrar o paciente
            toast.info("Novo OPME bipado para um paciente.", {
              icon: <Scan className="h-5 w-5 text-primary" />,
            });
            return;
          }

          toast.info(`Novo OPME bipado para: ${cpsRecord.patient}`, {
            description: `CPS: ${newLink.cps_id}`,
            icon: <Scan className="h-5 w-5 text-primary" />,
          });
        }
      )
      .subscribe();

    // Limpa a inscrição ao desmontar o componente
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.role]);

  return null; // Este componente não renderiza nada na tela
};

export default RealtimeNotifier;