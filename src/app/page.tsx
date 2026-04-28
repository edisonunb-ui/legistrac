
"use client";

import { useUser, useFirestore, useCollection } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useEffect, useMemo, useState } from "react";
import { collection, query, orderBy, doc, onSnapshot } from "firebase/firestore";
import { Demand, UserProfile } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  ClipboardList, 
  Clock, 
  ShieldAlert, 
  ChevronRight,
  TrendingUp,
  PlusCircle,
  FileCheck,
  Loader2,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push("/login");
      return;
    }

    if (!db) return;

    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        setProfile(snap.data() as UserProfile);
      } else {
        setProfile(null);
      }
      setProfileLoading(false);
    }, (error) => {
      console.error("Erro ao carregar perfil:", error);
      setProfileLoading(false);
    });

    return () => unsubscribe();
  }, [user, db, authLoading, router]);

  const demandsQuery = useMemo(() => db ? query(collection(db, "demandas"), orderBy("dataCriacao", "desc")) : null, [db]);
  const { data: demands = [], loading: demandsLoading } = useCollection(demandsQuery);

  const stats = useMemo(() => {
    if (!demands || !user) return { totalAbertas: 0, atrasadas: 0, minhas: 0, aguardandoAdmin: 0 };
    const now = new Date();
    return {
      totalAbertas: demands.filter((d: Demand) => d.status !== "FINALIZADO").length,
      atrasadas: demands.filter((d: Demand) => d.status !== "FINALIZADO" && d.prazo && new Date(d.prazo) < now).length,
      minhas: demands.filter((d: Demand) => d.responsavelAtual === user.uid && d.status !== "FINALIZADO").length,
      aguardandoAdmin: demands.filter((d: Demand) => d.status === "AGUARDANDO_VEREADORA").length,
    };
  }, [demands, user]);

  if (authLoading || (user && profileLoading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-primary">
        <Loader2 className="h-10 w-10 animate-spin mb-4" />
        <p className="font-medium animate-pulse">Carregando gabinete...</p>
      </div>
    );
  }

  if (!user) return null;

  // Se o usuário está logado mas o perfil ainda não existe (delay do Firestore ou erro)
  if (!profile && !profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-destructive">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2 text-destructive">
              <AlertTriangle size={48} />
            </div>
            <CardTitle>Perfil Não Encontrado</CardTitle>
            <CardDescription>
              Sua conta foi criada, mas o perfil de dados ainda não está pronto. Tente atualizar a página.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => window.location.reload()}>Recarregar Sistema</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statCards = [
    { title: "Total em Aberto", value: stats.totalAbertas, icon: ClipboardList, color: "text-blue-600", bg: "bg-blue-100" },
    { title: "Minhas Demandas", value: stats.minhas, icon: Clock, color: "text-purple-600", bg: "bg-purple-100" },
    { title: "Aguardando ADMIN", value: stats.aguardandoAdmin, icon: ShieldAlert, color: "text-orange-600", bg: "bg-orange-100" },
    { title: "Atrasadas", value: stats.atrasadas, icon: TrendingUp, color: "text-red-600", bg: "bg-red-100" },
  ];

  const recentDemands = demands.slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-headline font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Bem-vindo(a), {profile?.nome || 'Usuário'}. Veja o resumo do gabinete.</p>
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
                    <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-xl font-headline font-bold">Demandas Recentes</CardTitle>
                  <CardDescription>As últimas atualizações do sistema.</CardDescription>
                </div>
                <Link href="/demandas">
                  <Button variant="ghost" size="sm" className="text-primary gap-1">
                    Ver todas <ChevronRight size={16} />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {demandsLoading ? (
                  <div className="space-y-4 py-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}
                  </div>
                ) : recentDemands.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="inline-block p-4 bg-muted rounded-full mb-4">
                      <FileCheck className="text-muted-foreground" size={32} />
                    </div>
                    <p className="text-muted-foreground">Nenhuma demanda encontrada.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentDemands.map((demand: Demand) => (
                      <Link key={demand.id} href={`/demandas/${demand.id}`}>
                        <div className="flex items-center justify-between p-4 rounded-xl border hover:border-primary/50 hover:bg-primary/5 transition-all group">
                          <div className="flex-1 min-w-0 pr-4">
                            <h4 className="font-semibold truncate text-foreground group-hover:text-primary">{demand.titulo}</h4>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-muted-foreground">Responsável: {demand.responsavelAtual === user.uid ? "Você" : "Equipe"}</span>
                              <Badge variant={demand.prioridade === "ALTA" ? "destructive" : demand.prioridade === "MEDIA" ? "secondary" : "outline"} className="text-[10px] h-4">
                                {demand.prioridade}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className={cn(
                              "text-[10px]",
                              demand.status === "ABERTO" && "bg-blue-500",
                              demand.status === "EM_ANDAMENTO" && "bg-purple-500",
                              demand.status === "AGUARDANDO_VEREADORA" && "bg-orange-500",
                              demand.status === "FINALIZADO" && "bg-green-500"
                            )}>
                              {demand.status.replace("_", " ")}
                            </Badge>
                            <p className="text-[10px] text-muted-foreground mt-1">Prazo: {demand.prazo ? new Date(demand.prazo).toLocaleDateString() : "S/P"}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-none shadow-sm bg-primary text-primary-foreground">
              <CardHeader>
                <CardTitle className="text-lg">Meu Perfil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold">
                    {profile?.nome?.[0] || "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{profile?.nome || "Carregando..."}</p>
                    <p className="text-xs opacity-80 truncate">{profile?.email || user.email}</p>
                  </div>
                </div>
                <div className="pt-2">
                  <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 uppercase text-[10px]">
                    {profile?.perfil || "USUÁRIO"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
