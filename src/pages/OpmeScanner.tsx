"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Scan, Search, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/components/SessionContextProvider";
import { useSearchParams } from "react-router-dom";
import OpmeScanModal from "@/components/OpmeScanModal";
import CpsSelectionModal from "@/components/CpsSelectionModal";

interface CpsRecord { CPS: number; PATIENT: string; PROFESSIONAL: string; AGREEMENT: string; UNIDADENEGOCIO: string; CREATED_AT: string; }
interface OpmeItem { id: string; opme: string; lote: string; validade: string; referencia: string; anvisa: string; tuss: string; cod_simpro: string; codigo_barras: string; }
interface LinkedOpme { id: string; cps_id: number; opme_barcode: string; linked_at: string; quantity: number; opmeDetails?: OpmeItem; }
interface OpmeRestriction { id: string; opme_barcode: string; convenio_name: string; }

const OpmeScanner = () => {
  const { user } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedCps, setSelectedCps] = useState<CpsRecord | null>(null);
  const [opmeInventory, setOpmeInventory] = useState<OpmeItem[]>([]);
  const [restrictions, setRestrictions] = useState<OpmeRestriction[]>([]);
  const [linkedOpme, setLinkedOpme] = useState<LinkedOpme[]>([]);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isCpsSelectionModalOpen, setIsCpsSelectionModalOpen] = useState(false);
  const [initialLoadHandled, setInitialLoadHandled] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    // Fetch inventory and restrictions in parallel
    const [inventoryRes, restrictionsRes] = await Promise.all([
      supabase.from("opme_inventory").select("*").eq("user_id", user.id),
      supabase.from("opme_restrictions").select("*").eq("user_id", user.id)
    ]);
    
    if (inventoryRes.error) toast.error("Falha ao carregar inventário OPME.");
    else setOpmeInventory(inventoryRes.data as OpmeItem[]);

    if (restrictionsRes.error) toast.error("Falha ao carregar restrições de convênio.");
    else setRestrictions(restrictionsRes.data as OpmeRestriction[]);
  }, [user?.id]);

  const fetchLinkedOpme = useCallback(async () => {
    // ... (código existente sem alterações)
  }, [user?.id, selectedCps, opmeInventory]);

  const handleCpsSelected = useCallback(async (record: CpsRecord) => {
    // ... (código existente sem alterações)
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    // ... (código existente sem alterações)
  }, [user?.id, searchParams, initialLoadHandled]);

  useEffect(() => {
    fetchLinkedOpme();
  }, [selectedCps, fetchLinkedOpme]);

  const handleChangeCps = () => {
    setIsScanModalOpen(false);
    setSelectedCps(null);
    setIsCpsSelectionModalOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* ... (JSX existente sem alterações) ... */}
      {selectedCps && <OpmeScanModal key={selectedCps.CPS} isOpen={isScanModalOpen} onClose={() => setIsScanModalOpen(false)} selectedCps={selectedCps} opmeInventory={opmeInventory} restrictions={restrictions} userId={user?.id} onScanSuccess={fetchLinkedOpme} onChangeCps={handleChangeCps} />}
    </div>
  );
};

export default OpmeScanner;