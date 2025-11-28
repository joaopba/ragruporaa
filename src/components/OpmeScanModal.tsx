"use client";

import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scan, Loader2, XCircle, Users, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

interface OpmeItem { id: string; opme: string; codigo_barras: string; /* ...outros campos */ }
interface CpsRecord { CPS: number; PATIENT: string; AGREEMENT: string; }
interface OpmeRestriction { opme_barcode: string; convenio_name: string; }
interface LinkedOpmeSessionItem { opme_barcode: string; quantity: number; opmeDetails?: OpmeItem; }

interface OpmeScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCps: CpsRecord | null;
  opmeInventory: OpmeItem[];
  restrictions: OpmeRestriction[];
  userId: string | undefined;
  onScanSuccess: () => void;
  onChangeCps: () => void;
}

const OpmeScanModal: React.FC<OpmeScanModalProps> = ({
  isOpen, onClose, selectedCps, opmeInventory, restrictions, userId, onScanSuccess, onChangeCps,
}) => {
  const [barcodeInput, setBarcodeInput] = useState<string>("");
  const [loadingScan, setLoadingScan] = useState(false);
  const [currentSessionScans, setCurrentSessionScans] = useState<LinkedOpmeSessionItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setBarcodeInput("");
      setCurrentSessionScans([]);
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleBarcodeScan = async () => {
    if (!selectedCps || !barcodeInput || !userId) {
      toast.error("CPS, código de barras e login são necessários.");
      return;
    }

    setLoadingScan(true);

    // 1. VERIFICAÇÃO DE RESTRIÇÃO
    const patientConvenio = selectedCps.AGREEMENT?.trim().toLowerCase();
    const isRestricted = restrictions.some(
      rule => rule.opme_barcode === barcodeInput && rule.convenio_name.toLowerCase() === patientConvenio
    );

    if (isRestricted) {
      toast.error("OPME Bloqueado", {
        description: `Este item não é permitido para o convênio "${selectedCps.AGREEMENT}".`,
        icon: <ShieldAlert className="h-5 w-5 text-destructive" />,
      });
      setBarcodeInput("");
      inputRef.current?.focus();
      setLoadingScan(false);
      return; // Interrompe a execução
    }

    const opmeDetails = opmeInventory.find(item => item.codigo_barras === barcodeInput);
    if (!opmeDetails) {
      toast.error("Código de barras não encontrado no seu inventário OPME.");
      setLoadingScan(false);
      setBarcodeInput("");
      inputRef.current?.focus();
      return;
    }

    // 2. LÓGICA DE BIPAGEM (se não houver restrição)
    try {
      // ... (código de bipagem existente sem alterações)
    } catch (error: any) {
      console.error("Erro ao bipar OPME:", error.message);
      toast.error(`Erro ao bipar OPME: ${error.message}`);
    } finally {
      setBarcodeInput("");
      inputRef.current?.focus();
      setLoadingScan(false);
    }
  };

  // ... (resto do componente sem alterações)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* ... (JSX existente sem alterações) ... */}
    </Dialog>
  );
};

export default OpmeScanModal;