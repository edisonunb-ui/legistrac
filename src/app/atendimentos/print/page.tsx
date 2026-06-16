
"use client";

import { useFirestore, useCollection, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { useEffect, useMemo } from "react";
import { collection, query, orderBy, doc, where } from "firebase/firestore";
import { CitizenService } from "@/lib/types";
import { Loader2, Phone, MapPin, ClipboardList, User } from "lucide-react";

const MASTER_EMAIL = "edisonunb@gmail.com";

export default function MalaDiretaPrintPage() {
  const { user } = useUser();
  const db = useFirestore();

  const userEmail = useMemo(() => user?.email?.toLowerCase().trim() || null, [user?.email]);
  const isMasterAdmin = userEmail === MASTER_EMAIL;

  const profileRef = useMemoFirebase(() => (userEmail && db) ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: profile } = useDoc(profileRef);
  const cabinetId = (profile as any)?.cabinetId;

  const servicesQuery = useMemoFirebase(() => {
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
  
  const { data: services = [], loading } = useCollection<CitizenService>(servicesQuery);

  const activeServices = useMemo(() => services.filter(s => !s.deleted), [services]);

  useEffect(() => {
    if (!loading && activeServices.length > 0) {
      // Pequeno delay para garantir que o render terminou antes de abrir a caixa de impressão
      setTimeout(() => {
        window.print();
      }, 1000);
    }
  }, [loading, activeServices]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 text-black">
        <Loader2 className="animate-spin" size={32} />
        <p className="text-xs font-bold uppercase tracking-widest">Preparando Mala Direta...</p>
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

      <div className="no-print mb-8 p-4 bg-gray-100 rounded-lg flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg uppercase">Visualização de Mala Direta</h1>
          <p className="text-xs text-gray-500">{activeServices.length} etiquetas prontas para impressão.</p>
        </div>
        <button 
          onClick={() => window.print()}
          className="bg-black text-white px-6 py-2 rounded-md font-bold text-xs uppercase"
        >
          Imprimir Agora
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {activeServices.map((s) => (
          <div key={s.id} className="border border-gray-300 p-6 rounded-md flex flex-col gap-3 min-h-[160px] break-inside-avoid">
            <div className="flex items-start gap-3">
              <User size={16} className="shrink-0 mt-1" />
              <h3 className="font-bold text-sm uppercase leading-tight">{s.municipeNome}</h3>
            </div>
            
            <div className="flex items-start gap-3 text-[11px]">
              <MapPin size={14} className="shrink-0 mt-0.5" />
              <p className="uppercase leading-relaxed">{s.municipeEndereco}</p>
            </div>

            <div className="flex items-center gap-3 text-[11px]">
              <Phone size={14} className="shrink-0" />
              <p className="font-bold">{s.municipeTelefone}</p>
            </div>

            <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between text-[9px] font-bold text-gray-600 uppercase">
              <div className="flex items-center gap-1.5">
                <ClipboardList size={12} />
                TÍTULO: {s.municipeTituloEleitoral || 'NÃO INFORMADO'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {activeServices.length === 0 && (
        <div className="text-center py-20">
          <p className="text-sm font-bold uppercase text-gray-400">Nenhum registro para imprimir.</p>
        </div>
      )}
    </div>
  );
}
