
"use client";

import { useFirestore, useCollection, useUser, useDoc } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useMemo } from "react";
import { collection, query, orderBy, doc, limit } from "firebase/firestore";
import { Demand } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ClipboardList, 
  Clock, 
  ShieldAlert, 
  TrendingUp,
  PlusCircle,
  Loader2,
  CheckCircle2,
  ChevronRight,
  Calendar
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { user, loading } = useUser();
  const db = useFirestore();

  const userEmail = user?.email?.toLowerCase().trim();
  const profileRef = useMemo(() => userEmail && db ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: profile } = useDoc(profileRef);

  // Consulta para estatísticas (todas as demandas)
  const statsQuery = useMemo(() => db ? query(collection(db, "demandas"), orderBy("dataCriacao", "desc")) : null, [db]);
  const { data: allDemands = [] } = useCollection(statsQuery);

  // Consulta para a lista de demandas recentes da Ana (ou do usuário logado)
  const recentDemandsQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "demandas"), 
      orderBy("dataAtualizacao", "desc"),
      limit(5)
    );
  }, [db, user]);
  const { data: recentDemands = [], loading: loadingDemands } = useCollection(recentDemandsQuery);

  const stats = useMemo(() => {
    if (!allDemands) return { totalAbertas: 0, atrasadas: 0, minhas: 0, aguardandoAdmin: 0 };
    const now = new Date();
    return {
      totalAbertas: allDemands.filter((d: Demand) => d.status !== "FINALIZADO").length,
      atrasadas: allDemands.filter((d: Demand) => d.status !== "FINALIZADO" && d.prazo && new Date(d.prazo) < now).length,
      minhas: allDemands.filter((d: Demand) => user && d.responsavelAtual === user.uid && d.status !== "FINALIZADO").length,
      aguardandoAdmin: allDemands.filter((d: Demand) => d.status === "AGUARDANDO_VEREADORA").length,
    };
  }, [allDemands, user]);

  if (loading || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-primary">
        <Loader2 className="h-10 w-10 animate-spin mb-4" />
        <p className="font-medium text-center">Iniciando LegisTrac...</p>
      </div>
    );
  }

  const statCards = [
    { title: "Total em Aberto", value: stats.totalAbertas, icon: ClipboardList, color: "text-blue-600", bg: "bg-blue-100" },
    { title: "Minhas Demandas", value: stats.minhas, icon: Clock, color: "text-purple-600", bg: "bg-purple-100" },
    { title: "Aguardando ADMIN", value: stats.aguardandoAdmin, icon: ShieldAlert, color: "text-orange-600", bg: "bg-orange-100" },
    { title: "Atrasadas", value: stats.atrasadas, icon: TrendingUp, color: "text-red-600", bg: "bg-red-100" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-headline font-bold text-foreground">Dashboard LegisTrac</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-muted-foreground text-sm">Usuário: {user.email}</p>
              {(profile as any)?.perfil === 'SUPER_ADMIN' || user.email === 'edisonunb@gmail.com' ? (
                <Badge className="bg-amber-500 text-white text-[10px]">SUPER ADMIN</Badge>
              ) : null}
              <CheckCircle2 size={14} className="text-green-500" />
            </div>
          </div>
          <Link href="/demandas/new">
            <Button className="font-semibold gap-2 shadow-lg">
              <PlusCircle size={20} />
              Nova Demanda
            </Button>
          </Link>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {statCards.map((card, i) => (
            <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{card.title}</p>
                    <h3 className="text-3xl font-bold mt-1">{card.value}</h3>
                  </div>
                  <div className={`p-3 rounded-xl ${card.bg} ${card.color}`}>
                    <card.icon size={24} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-headline">Demandas Recentes</h2>
            <Link href="/demandas">
              <Button variant="ghost" className="text-primary text-sm">Ver todas</Button>
            </Link>
          </div>

          <div className="grid gap-4">
            {loadingDemands ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" /></div>
            ) : recentDemands.length === 0 ? (
              <div className="text-center py-10 bg-card rounded-xl border border-dashed text-muted-foreground">
                Nenhuma demanda registrada ainda.
              </div>
            ) : (
              recentDemands.map((demand: Demand) => (
                <Link key={demand.id} href={`/demandas/${demand.id}`}>
                  <Card className="hover:shadow-md transition-all border-none shadow-sm group">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-2 h-10 rounded-full",
                          demand.prioridade === "ALTA" ? "bg-red-500" : demand.prioridade === "MEDIA" ? "bg-amber-500" : "bg-blue-500"
                        )} />
                        <div>
                          <h4 className="font-bold text-sm group-hover:text-primary transition-colors">{demand.titulo}</h4>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] font-mono text-muted-foreground">#{demand.id.substring(0, 8)}</span>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Calendar size={10} />
                              {new Date(demand.prazo).toLocaleDateString()}
                            </div>
                            <Badge variant="outline" className="text-[9px] h-4 uppercase">
                              {demand.status.replace("_", " ")}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
