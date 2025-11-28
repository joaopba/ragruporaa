"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Upload, Package, PlusCircle, Loader2, ShieldX, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/components/SessionContextProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface OpmeItem {
  id: string;
  opme: string;
  lote: string;
  validade: string;
  referencia: string;
  anvisa: string;
  tuss: string;
  cod_simpro: string;
  codigo_barras: string;
}

interface OpmeRestriction {
  id: string;
  opme_barcode: string;
  convenio_name: string;
}

const OpmeRegistration = () => {
  const { session } = useSession();
  const userId = session?.user?.id;

  const [opmeInventory, setOpmeInventory] = useState<OpmeItem[]>([]);
  const [restrictions, setRestrictions] = useState<OpmeRestriction[]>([]);
  const [isAddOpmeDialogOpen, setIsAddOpmeDialogOpen] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [loadingRestrictions, setLoadingRestrictions] = useState(true);
  const [loadingFileUpload, setLoadingFileUpload] = useState(false);
  const [loadingAddManual, setLoadingAddManual] = useState(false);
  const [submittingRestriction, setSubmittingRestriction] = useState(false);

  const [newOpme, setNewOpme] = useState<Omit<OpmeItem, 'id'>>({
    opme: "", lote: "", validade: "", referencia: "", anvisa: "", tuss: "", cod_simpro: "", codigo_barras: "",
  });
  const [newRestriction, setNewRestriction] = useState({ opme_barcode: "", convenio_name: "" });

  const fetchOpmeInventory = useCallback(async () => {
    if (!userId) { setLoadingInventory(false); return; }
    setLoadingInventory(true);
    const { data, error } = await supabase.from("opme_inventory").select("*").eq("user_id", userId).order("opme", { ascending: true });
    if (error) toast.error("Falha ao carregar inventário OPME.");
    else setOpmeInventory(data as OpmeItem[]);
    setLoadingInventory(false);
  }, [userId]);

  const fetchRestrictions = useCallback(async () => {
    if (!userId) { setLoadingRestrictions(false); return; }
    setLoadingRestrictions(true);
    const { data, error } = await supabase.from("opme_restrictions").select("*").eq("user_id", userId);
    if (error) toast.error("Falha ao carregar restrições.");
    else setRestrictions(data as OpmeRestriction[]);
    setLoadingRestrictions(false);
  }, [userId]);

  useEffect(() => {
    fetchOpmeInventory();
    fetchRestrictions();
  }, [fetchOpmeInventory, fetchRestrictions]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    // ... (código existente sem alterações)
  };

  const handleAddOpme = async () => {
    // ... (código existente sem alterações)
  };

  const handleAddRestriction = async () => {
    if (!userId || !newRestriction.opme_barcode || !newRestriction.convenio_name) {
      toast.error("Selecione um OPME e digite o nome do convênio.");
      return;
    }
    setSubmittingRestriction(true);
    const { error } = await supabase.from("opme_restrictions").insert({
      user_id: userId,
      opme_barcode: newRestriction.opme_barcode,
      convenio_name: newRestriction.convenio_name.trim(),
    });
    if (error) {
      if (error.code === '23505') { // unique constraint violation
        toast.error("Esta regra de restrição já existe.");
      } else {
        toast.error(`Falha ao adicionar restrição: ${error.message}`);
      }
    } else {
      toast.success("Restrição adicionada com sucesso.");
      setNewRestriction({ opme_barcode: "", convenio_name: "" });
      fetchRestrictions();
    }
    setSubmittingRestriction(false);
  };

  const handleDeleteRestriction = async (restrictionId: string) => {
    const { error } = await supabase.from("opme_restrictions").delete().eq("id", restrictionId);
    if (error) toast.error(`Falha ao remover restrição: ${error.message}`);
    else {
      toast.success("Restrição removida.");
      fetchRestrictions();
    }
  };

  const getOpmeNameByBarcode = (barcode: string) => {
    return opmeInventory.find(item => item.codigo_barras === barcode)?.opme || "OPME Desconhecido";
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <h1 className="text-4xl font-extrabold text-center text-foreground mb-8">Cadastro e Inventário de OPME</h1>

      {/* Card de Gerenciamento de Inventário (código existente omitido para brevidade) */}
      <Card className="shadow-lg">
        {/* ... Conteúdo do Card de Inventário ... */}
      </Card>

      {/* NOVO Card para Parametrização */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl font-semibold">
            <ShieldX className="h-6 w-6 text-destructive" /> Parametrização de Convênios
          </CardTitle>
          <CardDescription>
            Crie regras para impedir o uso de um OPME específico com um determinado convênio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
            <h3 className="font-semibold text-lg">Adicionar Nova Restrição</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="opme-select">Selecione o OPME</Label>
                <Select value={newRestriction.opme_barcode} onValueChange={(value) => setNewRestriction(prev => ({ ...prev, opme_barcode: value }))}>
                  <SelectTrigger id="opme-select"><SelectValue placeholder="Escolha um OPME..." /></SelectTrigger>
                  <SelectContent><ScrollArea className="h-[200px]">
                    {opmeInventory.map(item => <SelectItem key={item.id} value={item.codigo_barras}>{item.opme}</SelectItem>)}
                  </ScrollArea></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="convenio-name">Nome do Convênio (Exato)</Label>
                <Input id="convenio-name" placeholder="Ex: Unimed, Bradesco Saúde" value={newRestriction.convenio_name} onChange={(e) => setNewRestriction(prev => ({ ...prev, convenio_name: e.target.value }))} />
              </div>
              <Button onClick={handleAddRestriction} disabled={submittingRestriction}>
                {submittingRestriction ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PlusCircle className="h-4 w-4 mr-2" />}
                Adicionar Regra
              </Button>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Regras Ativas</h3>
            {loadingRestrictions ? (
              <div className="flex items-center justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /><span className="ml-2 text-muted-foreground">Carregando regras...</span></div>
            ) : restrictions.length > 0 ? (
              <ScrollArea className="h-[250px] w-full rounded-md border">
                <Table>
                  <TableHeader><TableRow><TableHead>OPME Restrito</TableHead><TableHead>Convênio Bloqueado</TableHead><TableHead className="text-right">Ação</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {restrictions.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">{getOpmeNameByBarcode(rule.opme_barcode)}</TableCell>
                        <TableCell>{rule.convenio_name}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteRestriction(rule.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <p className="text-muted-foreground text-center py-4">Nenhuma regra de restrição foi criada ainda.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OpmeRegistration;