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
import { CalendarIcon, Scan, Search, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/components/SessionContextProvider";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Importar Tabs

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
  quantity: number;
  opmeDetails?: OpmeItem;
}

const OpmeScanner = () => {
  const { session } = useSession();
  const userId = session?.user?.id;
  const [searchParams, setSearchParams] = useSearchParams();

  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [businessUnit, setBusinessUnit] = useState<string>("47");
  const [cpsRecords, setCpsRecords] = useState<CpsRecord[]>([]);
  const [loadingCps, setLoadingCps] = useState(false);
  const [selectedCps, setSelectedCps] = useState<CpsRecord | null>(null);
  const [opmeInventory, setOpmeInventory] = useState<OpmeItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState<string>("");
  const [linkedOpme, setLinkedOpme] = useState<LinkedOpme[]>([]);
  const [cpsSearchInput, setCpsSearchInput] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("bipar"); // Estado para controlar a aba ativa

  useEffect(() => {
    if (!userId) {
      toast.error("ID do usuário não disponível. Por favor, faça login novamente.");
    }
  }, [userId]);

  const fetchOpmeInventory = useCallback(async () => {
    if (!userId) {
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

  const fetchCpsRecords = useCallback(async (forceApiFetch = false, specificCpsId?: number) => {
    if (!userId) {
      toast.error("ID do usuário não disponível para buscar registros de CPS.");
      return;
    }

    setLoadingCps(true);
    setCpsRecords([]);
    setSelectedCps(null);

    const formattedStartDate = startDate ? format(startDate, "yyyy-MM-dd") : '';
    const formattedEndDate = endDate ? format(endDate, "yyyy-MM-dd") : '';

    try {
      let recordsToProcess: CpsRecord[] = [];

      // 1. Tentar buscar do banco de dados local primeiro
      let query = supabase
        .from('local_cps_records')
        .select('*')
        .eq('user_id', userId);

      if (specificCpsId) {
        query = query.eq('cps_id', specificCpsId);
      } else if (formattedStartDate && formattedEndDate) {
        query = query
          .gte('created_at', `${formattedStartDate}T00:00:00.000Z`)
          .lte('created_at', `${formattedEndDate}T23:59:59.999Z`)
          .eq('business_unit', businessUnit);
      }

      const { data: localData, error: localError } = await query;

      if (localError) {
        console.error("Erro ao buscar registros de CPS locais:", localError);
      }

      if (localData && localData.length > 0 && !forceApiFetch) {
        recordsToProcess = localData.map(record => ({
          CPS: record.cps_id,
          PATIENT: record.patient,
          PROFESSIONAL: record.professional,
          AGREEMENT: record.agreement,
          UNIDADENEGOCIO: record.business_unit,
          CREATED_AT: record.created_at,
          TIPO: '', SITUACAO: '', ATENDANT: '', TREATMENT: null, REGISTRATION: null, A_CID: '', DATA_ALTA: null, DATAENTREGA: null, DATARAT: null, DATA_FECHADO: '', DATA_RECEBIMENTO: null,
        }));
        setCpsRecords(recordsToProcess);
        toast.success(`Foram encontrados ${recordsToProcess.length} registros de CPS locais.`);
      }

      // 2. Se não houver dados locais para o CPS específico ou se for forçado, buscar da API externa
      if (specificCpsId && (!recordsToProcess.find(r => r.CPS === specificCpsId) || forceApiFetch)) {
        // Se estamos buscando um CPS específico, a API externa precisa de um período.
        // Usaremos o dia atual como fallback se as datas não estiverem definidas.
        const apiStartDate = formattedStartDate || format(new Date(), "yyyy-MM-dd");
        const apiEndDate = formattedEndDate || format(new Date(), "yyyy-MM-dd");

        const { data, error } = await supabase.functions.invoke('fetch-cps-records', {
          body: {
            start_date: apiStartDate,
            end_date: apiEndDate,
            business_unit: businessUnit, // A API externa ainda precisa da unidade de negócio
          },
        });

        if (error) {
          throw new Error(error.message);
        }

        if (data && Array.isArray(data)) {
          const foundInApi = data.find((record: CpsRecord) => record.CPS === specificCpsId);
          if (foundInApi) {
            recordsToProcess = [foundInApi]; // Apenas o CPS específico
            setCpsRecords(recordsToProcess);
            toast.success(`CPS ${specificCpsId} encontrado na API externa.`);

            // Salvar/atualizar no banco de dados local
            await supabase
              .from('local_cps_records')
              .upsert({
                user_id: userId,
                cps_id: foundInApi.CPS,
                patient: foundInApi.PATIENT,
                professional: foundInApi.PROFESSIONAL,
                agreement: foundInApi.AGREEMENT,
                business_unit: foundInApi.UNIDADENEGOCIO,
                created_at: foundInApi.CREATED_AT,
              }, { onConflict: 'cps_id, user_id' });
          } else {
            toast.warning(`CPS ${specificCpsId} não encontrado na API externa para o período.`);
          }
        }
      } else if (!specificCpsId && (recordsToProcess.length === 0 || forceApiFetch)) {
        // Busca por período na API externa se não houver dados locais ou for forçado
        if (!formattedStartDate || !formattedEndDate) {
          toast.error("Por favor, selecione a data inicial e final para buscar na API externa.");
          setLoadingCps(false);
          return;
        }
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

          // Salvar/atualizar dados da API externa no banco de dados local
          await supabase
            .from('local_cps_records')
            .upsert(data.map((record: CpsRecord) => ({
              user_id: userId,
              cps_id: record.CPS,
              patient: record.PATIENT,
              professional: record.PROFESSIONAL,
              agreement: record.AGREEMENT,
              business_unit: record.UNIDADENEGOCIO,
              created_at: record.CREATED_AT,
            })), { onConflict: 'cps_id, user_id' });

        } else {
          toast.warning("Nenhum registro de CPS externo encontrado ou formato de dados inesperado.");
        }
      }
    } catch (error: any) {
      console.error("Erro ao buscar registros de CPS:", error.message);
      toast.error(`Falha ao buscar registros de CPS: ${error.message}. Verifique a conexão ou os parâmetros.`);
    } finally {
      setLoadingCps(false);
    }
  }, [startDate, endDate, businessUnit, userId]);

  useEffect(() => {
    fetchOpmeInventory();
  }, [fetchOpmeInventory]);

  useEffect(() => {
    // Auto-fetch CPS records on mount for today's date
    if (userId) {
      const today = new Date();
      setStartDate(today);
      setEndDate(today);
      // fetchCpsRecords will be called by the effect below when startDate/endDate change
    }
  }, [userId]);

  useEffect(() => {
    // Trigger fetchCpsRecords when startDate, endDate, businessUnit change
    if (startDate && endDate && businessUnit && userId) {
      fetchCpsRecords();
    }
  }, [startDate, endDate, businessUnit, userId, fetchCpsRecords]);


  // Handle URL parameter for direct CPS selection
  useEffect(() => {
    const cpsIdFromUrl = searchParams.get('cps_id');
    if (cpsIdFromUrl && userId) {
      setCpsSearchInput(cpsIdFromUrl);
      handleCpsSearch(cpsIdFromUrl); // Tenta buscar e selecionar o CPS da URL
      setSearchParams({}); // Limpa o parâmetro da URL após o uso
    }
  }, [searchParams, userId, setSearchParams]);

  // Fetch linked OPME when selectedCps changes
  useEffect(() => {
    fetchLinkedOpme();
  }, [selectedCps, fetchLinkedOpme]);


  const handleSelectCps = useCallback(async (record: CpsRecord) => {
    setSelectedCps(record);
    setActiveTab("bipar"); // Mudar para a aba de bipagem ao selecionar um CPS
    if (!userId) {
      toast.error("Você precisa estar logado para selecionar um CPS.");
      return;
    }

    // Save or update the selected CPS record in local_cps_records table
    const { data, error } = await supabase
      .from('local_cps_records')
      .upsert({
        user_id: userId,
        cps_id: record.CPS,
        patient: record.PATIENT,
        professional: record.PROFESSIONAL,
        agreement: record.AGREEMENT,
        business_unit: record.UNIDADENEGOCIO,
        created_at: record.CREATED_AT,
      }, { onConflict: 'cps_id, user_id' })
      .select();

    if (error) {
      console.error("Erro ao salvar CPS localmente:", error);
      toast.error("Falha ao salvar detalhes do CPS localmente.");
    } else {
      console.log("CPS salvo/atualizado localmente:", data);
    }
  }, [userId]);

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

    // 1. Verificar se o item já existe para este CPS e usuário
    const { data: existingLinkedItem, error: fetchError } = await supabase
      .from("linked_opme")
      .select("id, quantity")
      .eq("user_id", userId)
      .eq("cps_id", selectedCps.CPS)
      .eq("opme_barcode", barcodeInput)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error("Erro ao verificar OPME existente:", fetchError);
      toast.error(`Falha ao verificar OPME: ${fetchError.message}`);
      return;
    }

    if (existingLinkedItem) {
      // 2. Se existir, incrementar sua quantidade
      const newQuantity = existingLinkedItem.quantity + 1;
      const { error: updateError } = await supabase
        .from("linked_opme")
        .update({ quantity: newQuantity })
        .eq("id", existingLinkedItem.id);

      if (updateError) {
        console.error("Erro ao incrementar quantidade do OPME:", updateError);
        toast.error(`Falha ao incrementar quantidade: ${updateError.message}`);
        return;
      }
      toast.success(`Quantidade do OPME ${barcodeInput} para o paciente ${selectedCps.PATIENT} incrementada para ${newQuantity}.`);
    } else {
      // 3. Se não existir, inserir um novo registro com quantity: 1
      const newLinkedItem = {
        cps_id: selectedCps.CPS,
        opme_barcode: barcodeInput,
        user_id: userId,
        quantity: 1,
      };

      const { error: insertError } = await supabase
        .from("linked_opme")
        .insert(newLinkedItem);

      if (insertError) {
        console.error("Erro ao bipar OPME:", insertError);
        toast.error(`Falha ao bipar OPME: ${insertError.message}`);
        return;
      }
      toast.success(`OPME com código ${barcodeInput} bipado para o paciente ${selectedCps.PATIENT}.`);
    }

    setBarcodeInput("");
    fetchLinkedOpme();
  };

  const handleCpsSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpsSearchInput(e.target.value);
  };

  const handleCpsSearch = useCallback(async (cpsIdToSearch?: string) => {
    const searchId = cpsIdToSearch || cpsSearchInput;
    if (!searchId) {
      toast.warning("Por favor, insira um número de CPS para buscar.");
      return;
    }

    const parsedCpsId = parseInt(searchId, 10);
    if (isNaN(parsedCpsId)) {
      toast.error("Número de CPS inválido.");
      return;
    }

    // Tenta encontrar nos registros já carregados
    const foundCps = cpsRecords.find(record => record.CPS === parsedCpsId);
    if (foundCps) {
      handleSelectCps(foundCps);
      toast.success(`CPS ${foundCps.CPS} encontrado e selecionado.`);
    } else {
      // Se não encontrado, tenta buscar especificamente esse CPS
      await fetchCpsRecords(true, parsedCpsId); // Força busca na API para este CPS
      // Após a busca, verifica novamente se foi encontrado e seleciona
      const updatedCpsRecords = await supabase
        .from('local_cps_records')
        .select('*')
        .eq('user_id', userId)
        .eq('cps_id', parsedCpsId)
        .single();

      if (updatedCpsRecords.data) {
        handleSelectCps({
          CPS: updatedCpsRecords.data.cps_id,
          PATIENT: updatedCpsRecords.data.patient,
          PROFESSIONAL: updatedCpsRecords.data.professional,
          AGREEMENT: updatedCpsRecords.data.agreement,
          UNIDADENEGOCIO: updatedCpsRecords.data.business_unit,
          CREATED_AT: updatedCpsRecords.data.created_at,
          TIPO: '', SITUACAO: '', ATENDANT: '', TREATMENT: null, REGISTRATION: null, A_CID: '', DATA_ALTA: null, DATAENTREGA: null, DATARAT: null, DATA_FECHADO: '', DATA_RECEBIMENTO: null,
        });
        toast.success(`CPS ${parsedCpsId} encontrado e selecionado.`);
      } else {
        toast.error(`CPS ${parsedCpsId} não encontrado. Tente buscar por período.`);
      }
    }
  }, [cpsSearchInput, cpsRecords, fetchCpsRecords, handleSelectCps, userId]);


  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold text-center mb-6">Sistema de Bipagem de OPME</h1>

      {/* Busca Direta de CPS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" /> Buscar CPS por Número
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Digite o número do CPS"
              value={cpsSearchInput}
              onChange={handleCpsSearchInputChange}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleCpsSearch();
                }
              }}
            />
            <Button onClick={() => handleCpsSearch()}>Buscar CPS</Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Use este campo para selecionar um CPS diretamente.
          </p>
        </CardContent>
      </Card>

      {/* CPS Record Search and Selection by Period */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" /> Buscar Paciente (CPS) por Período
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={() => fetchCpsRecords(true)} disabled={loadingCps} variant="secondary">
              {loadingCps ? "Atualizando da API..." : "Atualizar da API Externa"}
            </Button>
            <Button onClick={() => fetchCpsRecords(false)} disabled={loadingCps} className="w-full md:w-auto">
              {loadingCps ? "Buscando..." : "Buscar CPS"}
            </Button>
          </div>

          {loadingCps ? (
            <p className="text-center text-muted-foreground mt-4">Carregando registros de CPS...</p>
          ) : cpsRecords.length > 0 ? (
            <ScrollArea className="h-[200px] w-full rounded-md border mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CPS</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Profissional</TableHead>
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
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSelectCps(record)}
                        >
                          Selecionar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <p className="text-muted-foreground mt-4">Nenhum registro de CPS encontrado para os critérios selecionados.</p>
          )}
        </CardContent>
      </Card>

      {/* OPME Scanning Section with Tabs */}
      {selectedCps && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5" /> Gerenciar OPME para Paciente: {selectedCps.PATIENT} (CPS: {selectedCps.CPS})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="bipar">Bipar OPME</TabsTrigger>
                <TabsTrigger value="itens-bipados">Itens Bipados</TabsTrigger>
              </TabsList>
              <TabsContent value="bipar" className="mt-4 space-y-4">
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
                    autoFocus
                  />
                  <Button onClick={handleBarcodeScan}>Bipar OPME</Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Digite ou escaneie o código de barras do OPME. Se o item já foi bipado, a quantidade será incrementada.
                </p>
              </TabsContent>
              <TabsContent value="itens-bipados" className="mt-4 space-y-4">
                {linkedOpme.length > 0 ? (
                  <ScrollArea className="h-[200px] w-full rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>OPME</TableHead>
                          <TableHead>Lote</TableHead>
                          <TableHead>Validade</TableHead>
                          <TableHead>Cód. Barras</TableHead>
                          <TableHead>Quantidade</TableHead>
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
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{new Date(item.linked_at).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                ) : (
                  <p className="text-muted-foreground">Nenhum OPME bipado para este paciente ainda.</p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OpmeScanner;