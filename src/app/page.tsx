
"use client";

import { useFirestore, useCollection, useUser, useAuthInstance } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useEffect, useMemo, useState } from "react";
import { collection, query, orderBy } from "firebase/firestore";
import { Demand } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ClipboardList, 
  Clock, 
  ShieldAlert, 
  TrendingUp,
  PlusCircle,
  Loader2,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { VEREADORES_AUTORIZADOS } from "@/lib/authorized-emails";
import { signOut } from "firebase/auth";

export default function Dashboard() {
  const { user, loading } = useUser();
  const db = useFirestore();
  const auth = useAuthInstance();
  const router = useRouter();
  
  const [autorizadoEmail, setAutorizadoEmail] = useState('');

  useEffect(() => {
    if (loading) return;
    
    // Se não há usuário logado no Firebase, vai para o login
    if (!user) {
      router.push("/login");
      return;
    }

    // Lógica do Portão de Acesso (Gate)
    if (!autorizadoEmail) {
      const email = prompt("Para acessar o gabinete, por favor, insira seu e-mail de acesso:");
      
      if (email && VEREADORES_AUTORIZADOS.includes(email.toLowerCase().trim())) {
        setAutorizadoEmail(email.toLowerCase().trim());
        alert("Acesso autorizado.");
      } else {
        alert("Erro: E-mail não possui permissão de acesso ou operação cancelada.");
        // Em vez de apenas redirecionar (causando loop), fazemos logout para limpar a sessão
        if (auth) {
          signOut(auth).then(() => router.push("/login"));
        } else {
          router.push("/login");
        }
      }
    }
  }, [user, loading, autorizadoEmail, router, auth]);

  const demandsQuery = useMemo(() => db ? query(collection(db, "demandas"), orderBy("dataCriacao", "desc")) : null, [db]);
  const { data: demands = [] } = useCollection(demandsQuery);

  const stats = useMemo(() => {
    if (!demands) return { totalAbertas: 0, atrasadas: 0, minhas: 0, aguardandoAdmin: 0 };
    const now = new Date();
    return {
      totalAbertas: demands.filter((d: Demand) => d.status !== "FINALIZADO").length,
      atrasadas: demands.filter((d: Demand) => d.status !== "FINALIZADO" && d.prazo && new Date(d.prazo) < now).length,
      minhas: demands.filter((d: Demand) => user && d.responsavelAtual === user.uid && d.status !== "FINALIZADO").length,
      aguardandoAdmin: demands.filter((d: Demand) => d.status === "AGUARDANDO_VEREADORA").length,
    };
  }, [demands, user]);

  if (loading || !autorizadoEmail || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-primary">
        <Loader2 className="h-10 w-10 animate-spin mb-4" />
        <p className="font-medium">Aguardando verificação de permissão...</p>
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
              <p className="text-muted-foreground">Bem-vindo, {autorizadoEmail}.</p>
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
