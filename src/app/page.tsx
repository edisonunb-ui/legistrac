"use client";

import { useFirestore, useCollection } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/components/auth-context";
import { useEffect, useMemo, useState } from "react";
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
  RefreshCcw,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { VEREADORES_AUTORIZADOS } from "@/lib/authorized-emails";

export default function Dashboard() {
  const { user, profile, loading } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [fixing, setFixing] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Tentativa de reparo automático se o usuário estiver logado mas sem perfil
  useEffect(() => {
    if (user && !profile && !loading && !fixing) {
      const emailLower = user.email?.toLowerCase() || "";
      if (VEREADORES_AUTORIZADOS.includes(emailLower)) {
        console.log("Tentando reparo automático de perfil...");
        handleFixProfile();
      }
    }
  }, [user, profile, loading]);

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
    if (!user || !db || fixing) return;
    setFixing(true);
    try {
      const emailLower = user.email?.toLowerCase() || "";
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        nome: emailLower.split('@')[0],
        email: emailLower,
        perfil: emailLower === "edisonunb@gmail.com" ? "ADMIN" : "ASSESSOR",
        ativo: true,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      }, { merge: true });
      
      toast({ 
        title: "Perfil Sincronizado", 
        description: "Seu acesso foi configurado com sucesso.",
      });
      
      // Pequeno delay para garantir que o Firestore processe antes do reload
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (e) {
      console.error("Erro ao fixar perfil:", e);
      setFixing(false);
      toast({ title: "Erro", description: "Não foi possível vincular o perfil automaticamente.", variant: "destructive" });
    }
  };

  if (loading || (user && !profile && fixing)) {
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
            <Button onClick={handleFixProfile} disabled={fixing} className="gap-2 font-bold py-6">
              {fixing ? <Loader2 className="animate-spin" /> : <RefreshCcw size={20} />}
              {fixing ? "Vinculando..." : "Vincular Perfil Agora"}
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
            <div className="flex items-center gap-2 mt-1">
              <p className="text-muted-foreground">Bem-vindo(a), {profile?.nome || 'Usuário'}.</p>
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