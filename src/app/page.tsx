"use client";

import { useFirestore, useCollection } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/components/auth-context";
import { useEffect, useMemo } from "react";
import { collection, query, orderBy, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Demand } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  ClipboardList, 
  Clock, 
  ShieldAlert, 
  TrendingUp,
  PlusCircle,
  Loader2,
  RefreshCcw
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { user, profile, loading } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const demandsQuery = useMemo(() => db ? query(collection(db, "demandas"), orderBy("dataCriacao", "desc")) : null, [db]);
  const { data: demands = [] } = useCollection(demandsQuery);

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

  const handleFixProfile = async () => {
    if (!user || !db) return;
    try {
      const emailLower = user.email?.toLowerCase() || "";
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        nome: emailLower.split('@')[0],
        email: emailLower,
        perfil: emailLower === "edisonunb@gmail.com" ? "ADMIN" : "ASSESSOR",
        ativo: true,
        createdAt: serverTimestamp(),
      }, { merge: true });
      toast({ title: "Perfil Criado", description: "Sincronizando dados..." });
      // Forçar atualização do contexto
      setTimeout(() => window.location.reload(), 1000);
    } catch (e) {
      toast({ title: "Erro", description: "Não foi possível criar o perfil.", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-primary">
        <Loader2 className="h-10 w-10 animate-spin mb-4" />
        <p className="font-medium animate-pulse">Carregando gabinete...</p>
      </div>
    );
  }

  if (!user) return null;

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full border-primary shadow-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2 text-primary">
              <ShieldAlert size={48} />
            </div>
            <CardTitle>Finalizando Acesso</CardTitle>
            <CardDescription className="pt-2">
              Estamos vinculando sua conta de e-mail ao sistema de gestão de gabinete.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button onClick={handleFixProfile} className="gap-2 font-bold py-6">
              <RefreshCcw size={20} />
              Vincular Perfil Agora
            </Button>
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
      </main>
    </div>
  );
}
