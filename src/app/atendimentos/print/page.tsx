
"use client";

import { useFirestore, useCollection, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { useEffect, useMemo, useState } from "react";
import { collection, query, orderBy, doc, where } from "firebase/firestore";
import { CitizenService } from "@/lib/types";
import { Loader2, Phone, MapPin, ClipboardList, User, Mail, FileText, LayoutGrid, List, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const MASTER_EMAIL = "edisonunb@gmail.com";

type PrintMode = "STICKER" | "REPORT";

export default function MalaDiretaPrintPage() {
  const { user } = useUser();
  const db = useFirestore();

  const [printMode, setPrintMode] = useState<PrintMode>("STICKER");
  const [showPhone, setShowPhone] = useState(true);
  const [showVoterId, setShowVoterId] = useState(true);
  const [showEmail, setShowEmail] = useState(false);

  const userEmail = useMemo(() => user?.email?.toLowerCase().trim() || null, [user?.email]);
  const isMasterAdmin = userEmail === MASTER_EMAIL;

  const profileRef = useMemoFirebase(() => (userEmail && db) ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: profile, loading: loadingProfile } = useDoc(profileRef);
  const cabinetId = (profile as any)?.cabinetId;

  const servicesQuery = useMemoFirebase(() => {
    // Só monta a query se os dados do perfil já tiverem carregado (para saber o cabinetId) ou se for Master
    if (!db || (!cabinetId && !isMasterAdmin)) return null;
    
    if (isMasterAdmin) {
      return query(collection(db, "atendimentos"), orderBy("municipeNome", "asc"));
    }
    
    return query(
      collection(db, "atendimentos"), 
      where("cabinetId", "==", cabinetId),
      orderBy("municipeNome", "asc")
    );
  }, [db, isMasterAdmin, cabinetId]);
  
  const { data: services = [], loading: loadingServices } = useCollection<CitizenService>(servicesQuery);

  const activeServices = useMemo(() => services.filter(s => !s.deleted), [services]);

  const isLoading = loadingProfile || loadingServices;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 text-black">
        <Loader2 className="animate-spin text-primary" size={32} />
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Sincronizando Base de Dados...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8 text-black font-sans">
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 1cm;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* PAINEL DE CONFIGURAÇÃO (APENAS TELA) */}
      <div className="no-print mb-12 p-6 bg-gray-50 border border-gray-200 rounded-2xl shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-1">
            <h1 className="font-black text-xl uppercase tracking-tighter">Configurador de Impressão</h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{activeServices.length} munícipes na fila.</p>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div className="space-y-2">
              <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Layout de Saída</p>
              <div className="flex bg-gray-200 p-1 rounded-xl gap-1">
                <button 
                  onClick={() => setPrintMode("STICKER")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all",
                    printMode === "STICKER" ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  <LayoutGrid size={14} /> Etiqueta Adesiva
                </button>
                <button 
                  onClick={() => setPrintMode("REPORT")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all",
                    printMode === "REPORT" ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  <List size={14} /> Relatório Completo
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Campos Adicionais</p>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={showPhone} onChange={e => setShowPhone(e.target.checked)} className="rounded border-gray-300 text-black focus:ring-0 h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase group-hover:text-black text-gray-600">WhatsApp</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={showVoterId} onChange={e => setShowVoterId(e.target.checked)} className="rounded border-gray-300 text-black focus:ring-0 h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase group-hover:text-black text-gray-600">Título</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={showEmail} onChange={e => setShowEmail(e.target.checked)} className="rounded border-gray-300 text-black focus:ring-0 h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase group-hover:text-black text-gray-600">E-mail</span>
                </label>
              </div>
            </div>

            <button 
              onClick={() => window.print()}
              className="bg-black text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg"
            >
              Imprimir Agora
            </button>
          </div>
        </div>
      </div>

      {/* ÁREA DE IMPRESSÃO */}
      <div className={cn(
        "w-full",
        printMode === "STICKER" ? "grid grid-cols-2 gap-6" : "space-y-4"
      )}>
        {activeServices.map((s) => (
          <div key={s.id} className={cn(
            "border border-gray-200 p-6 rounded-lg flex flex-col gap-3 break-inside-avoid transition-all",
            printMode === "STICKER" ? "min-h-[180px] justify-between" : "min-h-0 bg-white"
          )}>
            <div className="space-y-1">
              <div className="flex items-start gap-3">
                <User size={16} className="shrink-0 mt-0.5 text-gray-400" />
                <h3 className="font-black text-sm uppercase leading-tight">{s.municipeNome}</h3>
              </div>
              
              <div className="flex items-start gap-3 text-[11px] text-gray-700">
                <MapPin size={14} className="shrink-0 mt-0.5 text-gray-400" />
                <p className="uppercase leading-relaxed">{s.municipeEndereco}</p>
              </div>
            </div>

            {(showPhone || showEmail || showVoterId) && (
              <div className={cn(
                "pt-3 border-t border-gray-100 flex flex-wrap gap-4",
                printMode === "STICKER" ? "justify-between" : "justify-start"
              )}>
                {showPhone && (
                  <div className="flex items-center gap-2 text-[10px] font-bold">
                    <Phone size={12} className="text-gray-400" />
                    <span>{s.municipeTelefone}</span>
                  </div>
                )}

                {showEmail && s.municipeEmail && (
                  <div className="flex items-center gap-2 text-[10px] font-bold">
                    <Mail size={12} className="text-gray-400" />
                    <span className="lowercase">{s.municipeEmail}</span>
                  </div>
                )}

                {showVoterId && (
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-500">
                    <ClipboardList size={12} className="text-gray-400" />
                    <span>TÍTULO: {s.municipeTituloEleitoral || '---'}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {activeServices.length === 0 && (
        <div className="text-center py-40 border-2 border-dashed border-gray-100 rounded-3xl">
          <FileText size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-sm font-black uppercase tracking-widest text-gray-300">Nenhum registro selecionado para impressão.</p>
        </div>
      )}
    </div>
  );
}
