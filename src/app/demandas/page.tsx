
"use client";

import { useUser, useFirestore, useDoc, useCollection } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useState, useMemo } from "react";
import { collection, query, doc, where } from "firebase/firestore";
import { Demand } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Search, 
  Filter, 
  ChevronRight, 
  Calendar, 
  AlertCircle,
  Clock,
  ChevronLeft
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
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const MASTER_EMAIL = "edisonunb@gmail.com";

export default function DemandListPage() {
  const { user } = useUser();
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"TODAS" | "MINHAS">("MINHAS");
  const [statusFilter, setStatusFilter] = useState("TODOS");

  const userEmail = user?.email?.toLowerCase().trim();
  const profileRef = useMemo(() => userEmail && db ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: profile } = useDoc(profileRef);

  const isMasterAdmin = userEmail === MASTER_EMAIL;
  const cabinetId = (profile as any)?.cabinetId;
  const isVereador = (profile as any)?.perfil === "ADMIN";

  const demandsQuery = useMemo(() => {
    if (!db || !user) return null;
    if (isMasterAdmin) return query(collection(db, "demandas"));
    if (cabinetId) return query(collection(db, "demandas"), where("cabinetId", "==", cabinetId));
    return null;
  }, [db, user, isMasterAdmin, cabinetId]);
  
  const { data: allDemandsRaw = [], loading } = useCollection(demandsQuery);

  const filteredDemands = useMemo(() => {
    let result = [...allDemandsRaw]
      .filter((d: any) => !d.deleted) // FILTRO DE SOFT DELETE
      .sort((a: any, b: any) => {
        const dateA = a.dataAtualizacao?.toMillis() || 0;
        const dateB = b.dataAtualizacao?.toMillis() || 0;
        return dateB - dateA;
      });

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
  }, [allDemandsRaw, filterType, searchTerm, statusFilter, user, isMasterAdmin]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8 space-y-4">
          <div className="flex flex-col gap-2">
            <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors w-fit text-sm font-medium">
              <ChevronLeft size={16} />
              Voltar ao Dashboard
            </Link>
            <div className="flex items-center justify-between mt-2">
              <h1 className="text-3xl font-bold tracking-tight">Demandas</h1>
              <Link href="/demandas/new">
                <Button size="sm" className="shadow-lg shadow-primary/10">Nova Demanda</Button>
              </Link>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 p-4 bg-card rounded-xl border border-primary/10 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input 
                placeholder="Buscar por título ou protocolo..." 
                className="pl-10" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-muted-foreground" />
                <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Visualização" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MINHAS">Minhas Demandas</SelectItem>
                    {(isVereador || isMasterAdmin) && <SelectItem value="TODAS">Todas (Gabinete)</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos Status</SelectItem>
                  <SelectItem value="ABERTO">Aberto</SelectItem>
                  <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                  <SelectItem value="AGUARDANDO_VEREADORA">Aguardando ADMIN</SelectItem>
                  <SelectItem value="FINALIZADO">Finalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : filteredDemands.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-primary/10 shadow-sm">
            <div className="inline-block p-6 bg-muted rounded-full mb-4">
              <AlertCircle size={48} className="text-muted-foreground opacity-20" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Nenhuma demanda encontrada</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">Não encontramos registros com os filtros aplicados neste gabinete.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDemands.map((demand: Demand) => {
              const diffMs = Date.now() - (demand.dataAtualizacao?.toMillis() || 0);
              const diffHours = Math.floor(diffMs / 3600000);
              
              return (
                <Link key={demand.id} href={`/demandas/${demand.id}`}>
                  <Card className="h-full border border-primary/10 hover:border-primary/40 hover:shadow-lg transition-all flex flex-col group overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant={demand.prioridade === "ALTA" ? "destructive" : demand.prioridade === "MEDIA" ? "secondary" : "outline"} className="text-[10px] uppercase">
                          {demand.prioridade}
                        </Badge>
                        <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          #{demand.id.substring(0, 8)}
                        </span>
                      </div>
                      <CardTitle className="text-lg font-bold leading-tight mt-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {demand.titulo}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar size={14} className="text-primary" />
                        <span>Prazo: {new Date(demand.prazo).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock size={14} className="text-primary" />
                        <span>Atualizado há {diffHours}h</span>
                      </div>
                      
                      <div className="pt-4 border-t border-primary/5 flex items-center justify-between">
                        <Badge className={cn(
                          "text-[10px] font-medium uppercase",
                          demand.status === "ABERTO" && "bg-blue-100 text-blue-700 border-blue-200",
                          demand.status === "EM_ANDAMENTO" && "bg-purple-100 text-purple-700 border-purple-200",
                          demand.status === "AGUARDANDO_VEREADORA" && "bg-orange-100 text-orange-700 border-orange-200",
                          demand.status === "FINALIZADO" && "bg-green-100 text-green-700 border-green-200"
                        )} variant="outline">
                          {demand.status.replace("_", " ")}
                        </Badge>
                        <div className="text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          <ChevronRight size={18} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
