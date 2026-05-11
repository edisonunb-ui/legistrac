"use client";

import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useState, useMemo } from "react";
import { collection, query, doc, where, orderBy } from "firebase/firestore";
import { Demand } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Search, 
  Filter, 
  ChevronRight, 
  Calendar, 
  Clock,
  ChevronLeft,
  AlertCircle
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
  const [filterType, setFilterType] = useState<"TODAS" | "MINHAS">("MINHAS");
  const [statusFilter, setStatusFilter] = useState("TODOS");

  const userEmail = useMemo(() => user?.email?.toLowerCase().trim() || null, [user?.email]);
  const profileRef = useMemoFirebase(() => (userEmail && db) ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: profile } = useDoc(profileRef);

  const isMasterAdmin = userEmail === MASTER_EMAIL;
  const cabinetId = (profile as any)?.cabinetId;
  const isVereador = (profile as any)?.perfil === "ADMIN";

  const demandsQuery = useMemoFirebase(() => {
    if (!db || (!cabinetId && !isMasterAdmin)) return null;
    if (isMasterAdmin) return query(collection(db, "demandas"), orderBy("dataAtualizacao", "desc"));
    return query(
      collection(db, "demandas"), 
      where("cabinetId", "==", cabinetId),
      orderBy("dataAtualizacao", "desc")
    );
  }, [db, cabinetId, isMasterAdmin]);
  
  const { data: allDemandsRaw = [], loading } = useCollection(demandsQuery);

  const filteredDemands = useMemo(() => {
    let result = allDemandsRaw.filter((d: any) => !d.deleted);

    if (filterType === "MINHAS" && user && !isMasterAdmin) {
      result = result.filter((d: Demand) => d.responsavelAtual === user.uid);
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
  }, [allDemandsRaw, filterType, searchTerm, statusFilter, user?.uid, isMasterAdmin]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8 space-y-4">
          <div className="flex flex-col gap-2">
            <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors w-fit text-sm font-bold uppercase tracking-widest">
              <ChevronLeft size={16} /> Dashboard
            </Link>
            <div className="flex items-center justify-between mt-2">
              <h1 className="text-3xl font-black uppercase tracking-tighter">Gestão de <span className="text-primary">Demandas</span></h1>
              <Link href="/demandas/new"><Button className="font-bold uppercase text-xs h-11 px-8 shadow-xl shadow-primary/10">Nova Demanda</Button></Link>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 p-4 bg-card rounded-xl border border-slate-900 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input placeholder="Buscar protocolo ou título..." className="pl-10 h-12 bg-slate-950 border-slate-800" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                <SelectTrigger className="w-[160px] h-12 bg-slate-950 border-slate-800 font-bold text-xs uppercase"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MINHAS">Minhas Demandas</SelectItem>
                  {(isVereador || isMasterAdmin) && <SelectItem value="TODAS">Todas do Gabinete</SelectItem>}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px] h-12 bg-slate-950 border-slate-800 font-bold text-xs uppercase"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos Status</SelectItem>
                  <SelectItem value="ABERTO">Aberto</SelectItem>
                  <SelectItem value="EM_ANDAMENTO">Em Trâmite</SelectItem>
                  <SelectItem value="AGUARDANDO_VEREADORA">Pendente ADMIN</SelectItem>
                  <SelectItem value="FINALIZADO">Finalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-48 bg-slate-900 animate-pulse rounded-xl" />)}
          </div>
        ) : filteredDemands.length === 0 ? (
          <div className="text-center py-32 bg-slate-950/50 rounded-2xl border-2 border-dashed border-slate-900">
            <AlertCircle size={48} className="mx-auto text-muted-foreground opacity-20 mb-4" />
            <h3 className="text-xl font-bold uppercase tracking-widest text-muted-foreground">Vazio</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDemands.map((demand: Demand) => (
              <Link key={demand.id} href={`/demandas/${demand.id}`}>
                <Card className="h-full border-slate-900 bg-card hover:bg-slate-900/50 hover:border-primary/20 transition-all flex flex-col group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant={demand.prioridade === "ALTA" ? "destructive" : "secondary"} className="text-[10px] font-black uppercase tracking-widest px-2">
                        {demand.prioridade}
                      </Badge>
                      <span className="text-[10px] font-mono font-bold text-muted-foreground bg-slate-950 px-2 py-0.5 rounded border border-slate-900">
                        #{demand.id.substring(0, 8)}
                      </span>
                    </div>
                    <CardTitle className="text-base font-bold leading-tight mt-3 line-clamp-2 group-hover:text-primary transition-colors uppercase">
                      {demand.titulo}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-bold uppercase tracking-widest">
                      <Calendar size={14} className="text-primary" /> {new Date(demand.prazo).toLocaleDateString()}
                    </div>
                    
                    <div className="pt-4 border-t border-slate-900 flex items-center justify-between">
                      <Badge className={cn(
                        "text-[9px] font-black uppercase tracking-widest",
                        demand.status === "ABERTO" && "bg-blue-500",
                        demand.status === "EM_ANDAMENTO" && "bg-purple-500",
                        demand.status === "AGUARDANDO_VEREADORA" && "bg-orange-500",
                        demand.status === "FINALIZADO" && "bg-green-500"
                      )}>
                        {demand.status.replace("_", " ")}
                      </Badge>
                      <ChevronRight size={18} className="text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
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
