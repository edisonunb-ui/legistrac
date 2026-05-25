
"use client";

import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useState, useMemo } from "react";
import { collection, query, doc, where, orderBy } from "firebase/firestore";
import { Demand } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Search, 
  ChevronRight, 
  Calendar, 
  ChevronLeft,
  AlertCircle,
  Plus,
  LifeBuoy
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MASTER_EMAIL = "edisonunb@gmail.com";

export default function DemandListPage() {
  const { user } = useUser();
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"TODAS" | "MINHAS" | "HELPDESK">("MINHAS");
  const [statusFilter, setStatusFilter] = useState("TODOS");

  const userEmail = useMemo(() => user?.email?.toLowerCase().trim() || null, [user?.email]);
  const profileRef = useMemoFirebase(() => (userEmail && db) ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: profile } = useDoc(profileRef);

  const isMasterAdmin = userEmail === MASTER_EMAIL;
  const cabinetId = (profile as any)?.cabinetId;
  const isVereador = (profile as any)?.perfil === "ADMIN";

  const cabinetsQuery = useMemo(() => db ? collection(db, "gabinetes") : null, [db]);
  const { data: cabinets = [] } = useCollection(cabinetsQuery);
  const myCabinet = cabinets.find((c: any) => c.id === cabinetId);
  const isTIUser = myCabinet?.isTI === true;

  const demandsQuery = useMemoFirebase(() => {
    if (!db || (!cabinetId && !isMasterAdmin)) return null;
    
    // Se for usuário de TI e estiver na aba HelpDesk, ele pode ver todos os chamados
    if (isTIUser && filterType === 'HELPDESK') {
      return query(collection(db, "demandas"), where("tipo", "==", "HELPDESK"), orderBy("dataAtualizacao", "desc"));
    }

    if (isMasterAdmin) return query(collection(db, "demandas"), orderBy("dataAtualizacao", "desc"));
    
    return query(
      collection(db, "demandas"), 
      where("cabinetId", "==", cabinetId),
      orderBy("dataAtualizacao", "desc")
    );
  }, [db, cabinetId, isMasterAdmin, isTIUser, filterType]);
  
  const { data: allDemandsRaw = [], loading } = useCollection(demandsQuery);

  const filteredDemands = useMemo(() => {
    let result = allDemandsRaw.filter((d: any) => !d.deleted);

    if (filterType === "MINHAS" && user && !isMasterAdmin) {
      result = result.filter((d: Demand) => d.responsavelAtual === user.uid || (d.tipo === 'HELPDESK' && d.cabinetId === cabinetId));
    }

    if (filterType === "HELPDESK" && !isTIUser) {
      result = result.filter((d: Demand) => d.tipo === "HELPDESK");
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((d: Demand) => 
        d.titulo.toLowerCase().includes(term) || 
        d.id.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== "TODOS") {
      result = result.filter((d: Demand) => d.status === statusFilter);
    }

    return result;
  }, [allDemandsRaw, filterType, searchTerm, statusFilter, user?.uid, isMasterAdmin, isTIUser, cabinetId]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto px-4 py-6 sm:py-10">
        <header className="mb-10 space-y-6">
          <div className="flex flex-col gap-2">
            <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-all w-fit text-[10px] font-black uppercase tracking-[0.3em]">
              <ChevronLeft size={16} /> Dashboard
            </Link>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mt-4">
              <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter leading-none text-white">
                {isTIUser && filterType === 'HELPDESK' ? "Chamados de " : "Gestão de "}
                <span className="text-primary">{isTIUser && filterType === 'HELPDESK' ? "Suporte TI" : "Demandas"}</span>
              </h1>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/helpdesk/new" className="w-full sm:w-auto">
                  <Button variant="outline" className="w-full sm:w-auto font-black uppercase text-[10px] tracking-widest h-14 px-8 border-secondary text-secondary hover:bg-secondary/10">
                    <LifeBuoy className="mr-2" size={16} /> Abrir Chamado TI
                  </Button>
                </Link>
                <Link href="/demandas/new" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto font-black uppercase text-[11px] tracking-widest h-14 px-10 shadow-lg shadow-primary/20 bg-primary text-black hover:opacity-90 transition-all glow-primary">
                    <Plus className="mr-2" size={18} /> Nova Demanda
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 p-5 bg-white/5 rounded-2xl border border-white/5 shadow-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input 
                placeholder="Buscar protocolo ou título..." 
                className="pl-12 h-14 bg-white/5 border-white/10 focus:border-primary/50 text-sm font-bold text-white" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
            
            <div className="grid grid-cols-2 lg:flex items-center gap-3">
              <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                <SelectTrigger className="h-14 bg-white/5 border-white/10 font-black text-[10px] uppercase tracking-widest text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-black border-white/10">
                  <SelectItem value="MINHAS">Minhas</SelectItem>
                  {(isVereador || isMasterAdmin) && <SelectItem value="TODAS">Gabinete</SelectItem>}
                  {isTIUser && <SelectItem value="HELPDESK">Chamados TI</SelectItem>}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-14 bg-white/5 border-white/10 font-black text-[10px] uppercase tracking-widest text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-black border-white/10">
                  <SelectItem value="TODOS">Todos Status</SelectItem>
                  <SelectItem value="ABERTO">Aberto</SelectItem>
                  <SelectItem value="EM_ANDAMENTO">Em Trâmite</SelectItem>
                  <SelectItem value="AGUARDANDO_VEREADORA">Aguardando</SelectItem>
                  <SelectItem value="FINALIZADO">Finalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-56 bg-white/5 animate-pulse rounded-2xl border border-white/5" />)}
          </div>
        ) : filteredDemands.length === 0 ? (
          <div className="text-center py-32 bg-white/5 rounded-2xl border-2 border-dashed border-white/5">
            <AlertCircle size={48} className="mx-auto text-muted-foreground opacity-20 mb-4" />
            <h3 className="text-xs font-black uppercase tracking-[0.4em] text-muted-foreground">Sem registros no momento</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredDemands.map((demand: Demand) => (
              <Link key={demand.id} href={`/demandas/${demand.id}`}>
                <Card className="h-full border-white/5 bg-white/5 hover:border-primary/40 transition-all flex flex-col group active:scale-[0.98] shadow-2xl relative overflow-hidden">
                  <div className={cn(
                    "absolute top-0 left-0 w-1 h-full",
                    demand.tipo === 'HELPDESK' ? "bg-secondary" : (demand.prioridade === "ALTA" ? "bg-red-500" : "bg-primary")
                  )} />
                  <CardHeader className="pb-4 pt-8">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex gap-2">
                        <Badge variant={demand.prioridade === "ALTA" ? "destructive" : "secondary"} className="text-[9px] font-black uppercase tracking-widest px-3 py-1">
                          {demand.prioridade}
                        </Badge>
                        {demand.tipo === 'HELPDESK' && <Badge className="bg-secondary text-white text-[9px] font-black uppercase px-3 py-1">TI</Badge>}
                      </div>
                      <span className="text-[9px] font-mono font-black text-muted-foreground bg-white/5 px-2 py-1 rounded border border-white/5">
                        #{demand.id.substring(0, 8)}
                      </span>
                    </div>
                    <CardTitle className="text-lg font-black leading-tight group-hover:text-primary transition-colors uppercase tracking-tight text-white">
                      {demand.titulo}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-6 pt-2 pb-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                        <Calendar size={14} className="text-primary/70" /> {new Date(demand.prazo).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                         {isTIUser && demand.tipo === 'HELPDESK' && (
                           <span className="text-[8px] text-primary font-black uppercase">Origem: {cabinets.find(c => c.id === demand.cabinetId)?.vereador}</span>
                         )}
                      </div>
                    </div>
                    
                    <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                      <Badge className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-4 py-1.5 text-black",
                        demand.status === "ABERTO" && "bg-primary glow-primary",
                        demand.status === "EM_ANDAMENTO" && "bg-secondary text-white",
                        demand.status === "AGUARDANDO_VEREADORA" && "bg-yellow-500",
                        demand.status === "FINALIZADO" && "bg-green-500"
                      )}>
                        {demand.status.replace("_", " ")}
                      </Badge>
                      <div className="flex items-center text-primary group-hover:translate-x-1 transition-transform">
                        <span className="text-[9px] font-black uppercase mr-2 opacity-0 group-hover:opacity-100 transition-all tracking-widest">ABRIR</span>
                        <ChevronRight size={20} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
