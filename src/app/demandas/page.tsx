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
  AlertCircle,
  Plus
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
    <div className="min-h-screen bg-gray-50/50">
      <Navbar />
      <main className="container mx-auto px-4 py-6 sm:py-8">
        <header className="mb-8 space-y-6">
          <div className="flex flex-col gap-2">
            <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors w-fit text-[10px] font-black uppercase tracking-[0.2em]">
              <ChevronLeft size={16} /> Dashboard
            </Link>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
              <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter leading-none text-gray-900">Gestão de <span className="text-primary">Demandas</span></h1>
              <Link href="/demandas/new" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto font-black uppercase text-[10px] tracking-widest h-12 px-8 shadow-lg shadow-primary/20 bg-primary text-white">
                  <Plus className="mr-2" size={16} /> Nova Demanda
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input 
                placeholder="Buscar protocolo ou título..." 
                className="pl-12 h-12 bg-gray-50 border-gray-100 focus:border-primary/50 text-sm font-bold" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
            
            <div className="grid grid-cols-2 lg:flex items-center gap-3">
              <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                <SelectTrigger className="h-12 bg-gray-50 border-gray-100 font-black text-[10px] uppercase tracking-widest"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white border-gray-100">
                  <SelectItem value="MINHAS">Minhas</SelectItem>
                  {(isVereador || isMasterAdmin) && <SelectItem value="TODAS">Gabinete</SelectItem>}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-12 bg-gray-50 border-gray-100 font-black text-[10px] uppercase tracking-widest"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white border-gray-100">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-48 bg-white animate-pulse rounded-2xl border border-gray-100" />)}
          </div>
        ) : filteredDemands.length === 0 ? (
          <div className="text-center py-32 bg-white rounded-2xl border-2 border-dashed border-gray-100">
            <AlertCircle size={48} className="mx-auto text-muted-foreground opacity-10 mb-4" />
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">Sem registros encontrados</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredDemands.map((demand: Demand) => (
              <Link key={demand.id} href={`/demandas/${demand.id}`}>
                <Card className="h-full border-gray-100 bg-white hover:border-primary/30 transition-all flex flex-col group active:scale-[0.98] shadow-sm hover:shadow-md">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <Badge variant={demand.prioridade === "ALTA" ? "destructive" : "secondary"} className="text-[9px] font-black uppercase tracking-[0.1em] px-2 py-0.5">
                        {demand.prioridade}
                      </Badge>
                      <span className="text-[9px] font-mono font-black text-muted-foreground bg-gray-50 px-2 py-1 rounded border border-gray-100">
                        #{demand.id.substring(0, 8)}
                      </span>
                    </div>
                    <CardTitle className="text-base font-black leading-tight group-hover:text-primary transition-colors uppercase tracking-tight text-gray-800">
                      {demand.titulo}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                        <Calendar size={14} className="text-primary/70" /> {new Date(demand.prazo).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        {demand.anexos && demand.anexos.length > 0 && <Badge variant="outline" className="text-[8px] font-black uppercase h-5 text-primary border-primary/20">PDF</Badge>}
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                      <Badge className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-3 py-1 text-white",
                        demand.status === "ABERTO" && "bg-blue-600",
                        demand.status === "EM_ANDAMENTO" && "bg-purple-600",
                        demand.status === "AGUARDANDO_VEREADORA" && "bg-orange-600",
                        demand.status === "FINALIZADO" && "bg-green-600"
                      )}>
                        {demand.status.replace("_", " ")}
                      </Badge>
                      <div className="flex items-center text-primary group-hover:translate-x-1 transition-transform">
                        <span className="text-[9px] font-black uppercase mr-1 opacity-0 group-hover:opacity-100 transition-opacity tracking-widest">Ver Detalhes</span>
                        <ChevronRight size={18} />
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
