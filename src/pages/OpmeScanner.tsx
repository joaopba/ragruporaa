"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Upload, Scan, Package, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Papa from "papaparse";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/components/SessionContextProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

interface CpsRecord {
  CREATED_AT: string;
  TIPO: string;
  SITUACAO: string;
  ATENDANT: string;
  CPS: number;
  PATIENT: string;
  TREATMENT: string | null;
  UNIDADENEGOCIO: string;
  REGISTRATION: string | null;
  PROFESSIONAL: string;
  AGREEMENT: string;
  A_CID: string;
  DATA_ALTA: string | null;
  DATAENTREGA: string | null;
  DATARAT: string | null;
  DATA_FECHADO: string;
  DATA_RECEBIMENTO: string | null;
}

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

interface LinkedOpme {
  id: string;
  cps_id: number;
  opme_barcode: string;
  linked_at: string;
  opmeDetails?: OpmeItem;
}

const OpmeScanner = () => {
  const { session } = useSession();
  const userId = session?.user?.id;

  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [businessUnit, setBusinessUnit] = useState<string>("47");
  const [cpsRecords, setCpsRecords] = useState<CpsRecord[]>([]);
  const [loadingCps, setLoadingCps] = useState(false);
  const [selectedCps, setSelectedCps] = useState<CpsRecord | null>(null);
  const [opmeInventory, setOpmeInventory] = useState<OpmeItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState<string>("");
  const [linkedOpme, setLinkedOpme] = useState<LinkedOpme[]>([]);
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

  const fetchOpmeInventory = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("opme_inventory")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("Erro ao buscar inventário OPME:", error);
      toast.error("Falha ao carregar inventário OPME.");
    } else {
      setOpmeInventory(data as OpmeItem[]);
    }
  }, [userId]);

  const fetchLinkedOpme = useCallback(async () => {
    if (!userId || !selectedCps) {
      setLinkedOpme([]);
      return;
    }

    const { data, error } = await supabase
      .from("linked_opme")
      .select("*")
      .eq("user_id", userId)
      .eq("cps_id", selectedCps.CPS);

    if (error) {
      console.error("Erro ao buscar OPME bipado:", error);
      toast.error("Falha ao carregar OPME bipado para este paciente.");
    } else {
      const enrichedLinkedOpme = data.map((link) => ({
        ...link,
        opmeDetails: opmeInventory.find(
          (opme) => opme.codigo_barras === link.opme_barcode
        ),
      }));
      setLinkedOpme(enrichedLinkedOpme as LinkedOpme[]);
    }
  }, [userId, selectedCps, opmeInventory]);

  useEffect(() => {
    fetchOpmeInventory();
  }, [fetchOpmeInventory]);

  useEffect(() => {
    fetchLinkedOpme();
  }, [fetchLinkedOpme]);

  const fetchCpsRecords = async () => {
    if (!startDate || !endDate || !businessUnit) {
      toast.error("Por favor, selecione a data inicial, final e a unidade de negócio.");
      return;
    }

    setLoadingCps(true);
    setCpsRecords([]);
    setSelectedCps(null);

    const formattedStartDate = format(startDate, "yyyy-MM-dd");
    const formattedEndDate = format(endDate, "yyyy-MM-dd");

    try {
      const { data, error } = await supabase.functions.invoke('fetch-cps-records', {
        body: {
          start_date: formattedStartDate,
          end_date: formattedEndDate,
          business_unit: businessUnit,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data && Array.isArray(data)) {
        setCpsRecords(data);
        toast.success(`Foram encontrados ${data.length} registros de CPS.`);
      } else {
        toast.warning("Nenhum registro de CPS encontrado ou formato de dados inesperado.");
      }
    } catch (error: any) {
      console.error("Erro ao buscar registros de CPS:", error.message);
      toast.error(`Falha ao buscar registros de CPS: ${error.message}. Verifique a conexão ou os parâmetros.`);
    } finally {
      setLoadingCps(false);
    }
  };

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

  const handleBarcodeScan = async () => {
    if (!selectedCps) {
      toast.error("Por favor, selecione um paciente (CPS) primeiro.");
      return;
    }
    if (!barcodeInput) {
      toast.error("Por favor, insira um código de barras.");
      return;
    }
    if (!userId) {
      toast.error("Você precisa estar logado para bipar OPME.");
      return;
    }

    const opmeExists = opmeInventory.some(
      (item) => item.codigo_barras === barcodeInput
    );

    if (!opmeExists) {
      toast.error("Código de barras não encontrado no inventário OPME.");
      return;
    }

    const newLinkedItem = {
      cps_id: selectedCps.CPS,
      opme_barcode: barcodeInput,
      user_id: userId,
    };

    const { error } = await supabase
      .from("linked_opme")
      .insert(newLinkedItem);

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        toast.warning("Este OPME já foi bipado para este paciente.");
      } else {
        console.error("Erro ao bipar OPME:", error);
        toast.error(`Falha ao bipar OPME: ${error.message}`);
      }
    } else {
      toast.success(`OPME com código ${barcodeInput} bipado para o paciente ${selectedCps.PATIENT}.`);
      fetchLinkedOpme(); // Refresh linked OPME
    }
    setBarcodeInput("");
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold text-center mb-6">Sistema de Bipagem de OPME</h1>

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
        </CardContent>
      </Card>

      {/* CPS Record Fetch */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" /> Buscar Registros de Cirurgia/Procedimento (CPS)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start-date">Data Inicial</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : <span>Selecione a data</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date">Data Final</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : <span>Selecione a data</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="business-unit">Unidade de Negócio</Label>
            <Select value={businessUnit} onValueChange={setBusinessUnit}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione a unidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="47">Unidade 47</SelectItem>
                <SelectItem value="48">Unidade 48</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-3 flex justify-end">
            <Button onClick={fetchCpsRecords} disabled={loadingCps}>
              {loadingCps ? "Buscando..." : "Buscar CPS"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Display CPS Records */}
      {cpsRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Registros de CPS Encontrados</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] w-full rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CPS</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Convênio</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cpsRecords.map((record) => (
                    <TableRow
                      key={record.CPS}
                      className={selectedCps?.CPS === record.CPS ? "bg-accent" : ""}
                    >
                      <TableCell>{record.CPS}</TableCell>
                      <TableCell>{record.PATIENT}</TableCell>
                      <TableCell>{record.PROFESSIONAL}</TableCell>
                      <TableCell>{record.AGREEMENT}</TableCell>
                      <TableCell>{record.UNIDADENEGOCIO}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedCps(record)}
                        >
                          Selecionar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* OPME Scanning Section */}
      {selectedCps && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5" /> Bipar OPME para Paciente: {selectedCps.PATIENT} (CPS: {selectedCps.CPS})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Código de Barras do OPME"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleBarcodeScan();
                  }
                }}
              />
              <Button onClick={handleBarcodeScan}>Bipar OPME</Button>
            </div>

            {linkedOpme.length > 0 ? (
              <ScrollArea className="h-[200px] w-full rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>OPME</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead>Cód. Barras</TableHead>
                      <TableHead>Bipado Em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linkedOpme.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.opmeDetails?.opme || "N/A"}</TableCell>
                        <TableCell>{item.opmeDetails?.lote || "N/A"}</TableCell>
                        <TableCell>{item.opmeDetails?.validade || "N/A"}</TableCell>
                        <TableCell>{item.opme_barcode}</TableCell>
                        <TableCell>{new Date(item.linked_at).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <p className="text-muted-foreground">Nenhum OPME bipado para este paciente ainda.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OpmeScanner;