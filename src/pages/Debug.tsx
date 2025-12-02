"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface DebugInfo {
  user_role: string;
  total_opmes_in_inventory: number;
  visible_opmes_for_user: number;
}

const DebugPage = () => {
  const { user } = useSession();
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDebugInfo = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('debug_user_permissions', {
        p_user_id: user.id,
      });

      if (rpcError) throw rpcError;
      
      if (data && data.length > 0) {
        setDebugInfo(data[0]);
      } else {
        throw new Error("A função de diagnóstico não retornou dados.");
      }
    } catch (err: any) {
      setError(err.message);
      toast.error(`Erro ao buscar diagnóstico: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebugInfo();
  }, [user]);

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Página de Diagnóstico</CardTitle>
          <CardDescription>
            Use esta página para verificar suas permissões e a visibilidade dos dados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Carregando diagnóstico...</span>
            </div>
          ) : error ? (
            <div className="text-destructive flex items-center gap-3 p-4 bg-destructive/10 rounded-md">
              <AlertTriangle className="h-6 w-6" />
              <div>
                <p className="font-semibold">Ocorreu um erro:</p>
                <p>{error}</p>
              </div>
            </div>
          ) : debugInfo ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Diagnóstico de Permissões</h3>
              <div className="p-4 border rounded-md bg-muted/50 space-y-2">
                <p><strong>Sua Permissão (Role):</strong> <span className="font-mono p-1 bg-muted rounded">{debugInfo.user_role || 'Não definida'}</span></p>
                <p><strong>Total de OPMEs no Inventário:</strong> <span className="font-mono p-1 bg-muted rounded">{debugInfo.total_opmes_in_inventory}</span></p>
                <p><strong>OPMEs Visíveis para Você:</strong> <span className="font-mono p-1 bg-muted rounded">{debugInfo.visible_opmes_for_user}</span></p>
              </div>
              <div className="pt-4">
                <h4 className="font-semibold">Análise:</h4>
                {debugInfo.visible_opmes_for_user === 0 && debugInfo.total_opmes_in_inventory > 0 && (
                   <p className="text-destructive">
                     <strong>Atenção:</strong> Existem {debugInfo.total_opmes_in_inventory} OPMEs no sistema, mas nenhum está visível para você. Isso ocorre porque sua permissão não é 'GESTOR' e os itens existentes não foram cadastrados por você.
                   </p>
                )}
                 {debugInfo.visible_opmes_for_user > 0 && (
                   <p className="text-green-600">
                     Tudo parece correto. Você consegue ver {debugInfo.visible_opmes_for_user} OPMEs. Se ainda estiver com problemas, pode ser um erro na interface.
                   </p>
                )}
                 {debugInfo.total_opmes_in_inventory === 0 && (
                    <p className="text-muted-foreground">
                        O inventário de OPMEs está vazio. Você precisa cadastrar novos itens.
                    </p>
                 )}
              </div>
            </div>
          ) : (
            <p>Nenhuma informação de diagnóstico foi encontrada.</p>
          )}
          <div className="mt-6">
            <Button onClick={fetchDebugInfo} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Rodar Diagnóstico Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DebugPage;