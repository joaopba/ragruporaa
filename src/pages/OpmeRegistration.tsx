"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Package, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/components/SessionContextProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

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

const OpmeRegistration = () => {
  const { session } = useSession();
  const userId = session?.user?.id;

  const [opmeInventory, setOpmeInventory] = useState<OpmeItem[]>([]);
  const [isAddOpmeDialogOpen, setIsAddOpmeDialogOpen] = useState(false);

  // Form states for adding new OPME
  const [newOpme, setNewOpme] = useState<Omit<OpmeItem, 'id' | 'user_id' | 'created_at'>>({
    opme: "",
    lote: "",
    validade: "",
    referencia: "",
    anvisa: "",
    tuss: "",
    cod_simpro: "",
    codigo_barras: "",
  });

  useEffect(() => {
    console.log("OpmeRegistration - Current userId:", userId);
    if (!userId) {
      toast.error("ID do usuário não disponível. Por favor, faça login novamente.");
    }
  }, [userId]);

  const fetchOpmeInventory = useCallback(async () => {
    if (!userId) {
      console.warn("fetchOpmeInventory (OpmeRegistration): userId is null, skipping fetch.");
      return;
    }
    const { data, error } = await supabase
      .from("opme_inventory")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("Erro ao buscar inventário OPME:", error);
      toast.error("Falha ao carregar inventário OPME.");
    } else {
      console.log("OpmeRegistration - Inventário OPME carregado:", data);
      setOpmeInventory(data as OpmeItem[]);
    }
  }, [userId]);

  useEffect(() => {
    fetchOpmeInventory();
  }, [fetchOpmeInventory]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast.error("Nenhum arquivo selecionado.");
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        if (results.errors.length) {
          console.error("Erros ao analisar o CSV:", results.errors);
          toast.error("Erro ao analisar o arquivo CSV. Verifique o formato.");
          return;
        }
        const parsedData: Omit<OpmeItem, 'id'>[] = results.data.map((row: any) => ({
          opme: row.OPME || "",
          lote: row.LOTE || "",
          validade: row.VALIDADE || "",
          referencia: row["REFERÊNCIA."] || "",
          anvisa: row.ANVISA || "",
          tuss: row.TUSS || "",
          cod_simpro: row["COD.SIMPRO"] || "",
          codigo_barras: row["código de barras"] || "",
        }));

        const validOpme = parsedData.filter(item => item.codigo_barras);
        if (validOpme.length !== parsedData.length) {
          toast.warning("Alguns itens foram ignorados por não possuírem 'código de barras'.");
        }

        if (validOpme.length === 0) {
          toast.error("Nenhum item OPME válido encontrado no arquivo.");
          return;
        }

        const { data, error } = await supabase
          .from("opme_inventory")
          .insert(validOpme.map(item => ({ ...item, user_id: userId })))
          .select();

        if (error) {
          console.error("Erro ao salvar OPME no banco de dados:", error);
          toast.error("Falha ao salvar inventário OPME no banco de dados.");
        } else {
          toast.success(`Foram carregados ${data.length} itens OPME do arquivo para o banco de dados.`);
          fetchOpmeInventory(); // Refresh inventory
        }
      },
      error: (error: any) => {
        console.error("Erro ao analisar o arquivo:", error);
        toast.error("Erro ao processar o arquivo. Tente novamente.");
      },
    });
  };

  const handleAddOpme = async () => {
    if (!userId) {
      toast.error("Você precisa estar logado para adicionar OPME.");
      return;
    }
    if (!newOpme.opme || !newOpme.codigo_barras) {
      toast.error("OPME e Código de Barras são campos obrigatórios.");
      return;
    }

    const { data, error } = await supabase
      .from("opme_inventory")
      .insert({ ...newOpme, user_id: userId })
      .select();

    if (error) {
      console.error("Erro ao adicionar OPME:", error);
      toast.error(`Falha ao adicionar OPME: ${error.message}`);
    } else {
      toast.success(`OPME "${newOpme.opme}" adicionado com sucesso.`);
      setNewOpme({
        opme: "", lote: "", validade: "", referencia: "", anvisa: "", tuss: "", cod_simpro: "", codigo_barras: "",
      });
      setIsAddOpmeDialogOpen(false);
      fetchOpmeInventory(); // Refresh inventory
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold text-center mb-6">Cadastro e Inventário de OPME</h1>

      {/* OPME Inventory Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" /> Gerenciar Inventário OPME
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Carregue ou adicione manualmente itens OPME ao seu inventário.
          </p>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="opme-file-upload">Carregar via CSV</Label>
              <Input
                id="opme-file-upload"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="max-w-md mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Colunas esperadas: OPME, LOTE, VALIDADE, REFERÊNCIA., ANVISA, TUSS, COD.SIMPRO, código de barras.
              </p>
            </div>
            <div className="flex-1 flex items-end justify-end">
              <Dialog open={isAddOpmeDialogOpen} onOpenChange={setIsAddOpmeDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <PlusCircle className="h-4 w-4" /> Adicionar OPME Manualmente
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Adicionar Novo OPME</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="opme" className="text-right">OPME</Label>
                      <Input id="opme" value={newOpme.opme} onChange={(e) => setNewOpme({ ...newOpme, opme: e.target.value })} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="lote" className="text-right">Lote</Label>
                      <Input id="lote" value={newOpme.lote} onChange={(e) => setNewOpme({ ...newOpme, lote: e.target.value })} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="validade" className="text-right">Validade</Label>
                      <Input id="validade" value={newOpme.validade} onChange={(e) => setNewOpme({ ...newOpme, validade: e.target.value })} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="referencia" className="text-right">Referência</Label>
                      <Input id="referencia" value={newOpme.referencia} onChange={(e) => setNewOpme({ ...newOpme, referencia: e.target.value })} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="anvisa" className="text-right">ANVISA</Label>
                      <Input id="anvisa" value={newOpme.anvisa} onChange={(e) => setNewOpme({ ...newOpme, anvisa: e.target.value })} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="tuss" className="text-right">TUSS</Label>
                      <Input id="tuss" value={newOpme.tuss} onChange={(e) => setNewOpme({ ...newOpme, tuss: e.target.value })} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="cod_simpro" className="text-right">Cód. Simpro</Label>
                      <Input id="cod_simpro" value={newOpme.cod_simpro} onChange={(e) => setNewOpme({ ...newOpme, cod_simpro: e.target.value })} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="codigo_barras" className="text-right">Cód. Barras</Label>
                      <Input id="codigo_barras" value={newOpme.codigo_barras} onChange={(e) => setNewOpme({ ...newOpme, codigo_barras: e.target.value })} className="col-span-3" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" onClick={handleAddOpme}>Adicionar OPME</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          {opmeInventory.length > 0 && (
            <p className="text-sm text-green-600">
              Inventário OPME carregado: {opmeInventory.length} itens.
            </p>
          )}
          <h3 className="text-lg font-semibold mt-6 mb-4">Itens no Inventário</h3>
          {opmeInventory.length > 0 ? (
            <ScrollArea className="h-[300px] w-full rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>OPME</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead>ANVISA</TableHead>
                    <TableHead>TUSS</TableHead>
                    <TableHead>Cód. Simpro</TableHead>
                    <TableHead>Cód. Barras</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {opmeInventory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.opme}</TableCell>
                      <TableCell>{item.lote}</TableCell>
                      <TableCell>{item.validade}</TableCell>
                      <TableCell>{item.referencia}</TableCell>
                      <TableCell>{item.anvisa}</TableCell>
                      <TableCell>{item.tuss}</TableCell>
                      <TableCell>{item.cod_simpro}</TableCell>
                      <TableCell>{item.codigo_barras}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <p className="text-muted-foreground">Nenhum item OPME no inventário ainda. Adicione um manualmente ou carregue via CSV.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OpmeRegistration;