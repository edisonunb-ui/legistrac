
"use client";

import { useFirestore, useCollection, useUser, useDoc, useAuthInstance } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useMemo, useState, useEffect } from "react";
import { collection, query, doc, setDoc, where } from "firebase/firestore";
import { Demand, Leader, GlobalConfig } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  Target, 
  MapPin, 
  TrendingUp,
  Loader2,
  ChevronRight,
  ClipboardList,
  Edit2,
  AlertCircle,
  LogOut
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

const MASTER_EMAIL = "edisonunb@gmail.com";

export default function StrategicDashboard() {
  const { user, loading: authLoading } = useUser();
  const auth = useAuthInstance();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [newMetaValue, setNewMetaValue] = useState("");

  const userEmail = user?.email?.toLowerCase().trim();
  const profileRef = useMemo(() => (userEmail && db) ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: profile, loading: loadingProfile } = useDoc(profileRef);

  const cabinetId = (profile as any)?.cabinetId;
  const isSuperAdmin = userEmail === MASTER_EMAIL;

  // Redirecionamento se não estiver logado
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const demandsQuery = useMemo(() => {
    if (!db || (!cabinetId && !isSuperAdmin)) return null;
    return isSuperAdmin 
      ? query(collection(db, "demandas"))
      : query(collection(db, "demandas"), where("cabinetId", "==", cabinetId));
  }, [db, cabinetId, isSuperAdmin]);
  const { data: allDemands = [], loading: loadingDemands } = useCollection(demandsQuery);

  const leadersQuery = useMemo(() => {
    if (!db || (!cabinetId && !isSuperAdmin)) return null;
    return isSuperAdmin
      ? query(collection(db, "liderancas"))
      : query(collection(db, "liderancas"), where("cabinetId", "==", cabinetId));
  }, [db, cabinetId, isSuperAdmin]);
  const { data: allLeaders = [], loading: loadingLeaders } = useCollection(leadersQuery);

  const configRef = useMemo(() => {
    if (!db || (!profile && !isSuperAdmin)) return null;
    if (isSuperAdmin) {
      return doc(db, "config", "global");
    } else if (cabinetId) {
      return doc(db, "gabinetes", cabinetId, "config", "global");
    }
    return null;
  }, [db, profile, cabinetId, isSuperAdmin]);
  const { data: config } = useDoc<GlobalConfig>(configRef);

  const stats = useMemo(() => {
    const totalVotosMapeados = allLeaders.reduce((acc, curr) => acc + (curr.potencialVotos || 0), 0);
    const metaGeral = config?.metaVotos2026 || 50000;
    const progresso = (totalVotosMapeados / metaGeral) * 100;

    return {
      votosMapeados: totalVotosMapeados,
      totalLideres: allLeaders.length,
      demandasAtivas: allDemands.filter((d: Demand) => d.status !== "FINALIZADO" && !d.deleted).length,
      progressoMeta: Math.min(progresso, 100),
      metaGeral
    };
  }, [allDemands, allLeaders, config]);

  useEffect(() => {
    if (config?.metaVotos2026) {
      setNewMetaValue(config.metaVotos2026.toString());
    }
  }, [config]);

  const handleUpdateMeta = async () => {
    if (!db || !configRef) return;
    const val = parseInt(newMetaValue);
    if (isNaN(val) || val <= 0) {
      toast({ title: "Valor Inválido", variant: "destructive" });
      return;
    }

    try {
      await setDoc(configRef, { 
        metaVotos2026: val, 
        cabinetId: cabinetId || "global",
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast({ title: "Meta Atualizada", description: "O objetivo estratégico foi salvo." });
      setIsEditingMeta(false);
    } catch (e) {
      toast({ title: "Erro", description: "Não foi possível salvar a nova meta.", variant: "destructive" });
    }
  };

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      router.push("/login");
    }
  };

  // Carregamento inicial: espera Auth
  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
        <Loader2 className="animate-spin text-primary h-10 w-10" />
        <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest animate-pulse">Sincronizando Gabinete...</p>
      </div>
    );
  }

  // Se não estiver logado, não renderiza nada (o useEffect cuida do redirect)
  if (!user) return null;

  // Se estiver logado, espera o perfil carregar para decidir se bloqueia ou mostra o dashboard
  if (loadingProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
        <Loader2 className="animate-spin text-primary h-10 w-10" />
        <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest animate-pulse">Validando Acesso...</p>
      </div>
    );
  }

  // Se não tem perfil e NÃO é o SuperAdmin, bloqueia.
  if (!profile && !isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full border-destructive/20 bg-card shadow-2xl">
          <CardContent className="pt-8 text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertCircle size={32} className="text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Acesso não provisionado</h2>
              <p className="text-sm text-muted-foreground">Seu e-mail <b>{userEmail}</b> não foi encontrado na base de usuários autorizados. Entre em contato com o administrador do sistema.</p>
            </div>
            <Button variant="outline" onClick={handleLogout} className="w-full gap-2">
              <LogOut size={16} /> Sair do Sistema
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto px-4 py-6 md:py-10">
        <header className="mb-8 md:mb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tighter">Blueprint Estratégico <span className="text-primary">2026</span></h1>
              <p className="text-muted-foreground text-base md:text-xl mt-1">Gestão de Gabinete de Alta Performance</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link href="/demandas/new" className="w-full sm:w-auto"><Button variant="outline" className="w-full border-primary/20 h-11">Nova Demanda</Button></Link>
              <Link href="/liderancas/new" className="w-full sm:w-auto"><Button className="w-full bg-primary text-primary-foreground font-bold h-11">Cadastrar Líder</Button></Link>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
          <Card className="bg-card border-primary/10 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1 tracking-widest">Votos Mapeados</p>
                  <h3 className="text-3xl font-bold">{stats.votosMapeados.toLocaleString()}</h3>
                </div>
                <div className="p-2 bg-primary/10 text-primary rounded-lg"><Target size={24} /></div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-[10px] mb-1 font-bold">
                  <span className="text-muted-foreground">PROGRESSO META 2026</span>
                  <span className="text-primary">{stats.progressoMeta.toFixed(1)}%</span>
                </div>
                <Progress value={stats.progressoMeta} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-primary/10 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1 tracking-widest">Base de Líderes</p>
                  <h3 className="text-3xl font-bold">{stats.totalLideres}</h3>
                </div>
                <div className="p-2 bg-primary/10 text-primary rounded-lg"><Users size={24} /></div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-4 font-bold uppercase tracking-widest flex items-center gap-1">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse" /> Territorial Ativa
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-primary/10 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1 tracking-widest">Processos Ativos</p>
                  <h3 className="text-3xl font-bold">{stats.demandasAtivas}</h3>
                </div>
                <div className="p-2 bg-primary/10 text-primary rounded-lg"><ClipboardList size={24} /></div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-4 font-bold uppercase tracking-widest">Em trâmite interno</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-primary/10 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1 tracking-widest">Meta Estratégica</p>
                  <h3 className="text-3xl font-bold">{(stats.metaGeral / 1000).toFixed(0)}K</h3>
                </div>
                <div className="p-2 bg-primary/10 text-primary rounded-lg flex flex-col items-center">
                  <TrendingUp size={24} />
                  {(profile?.perfil === "ADMIN" || isSuperAdmin) && (
                    <Dialog open={isEditingMeta} onOpenChange={setIsEditingMeta}>
                      <DialogTrigger asChild>
                        <button className="mt-2 text-[10px] flex items-center gap-1 hover:underline text-primary/70 font-bold uppercase tracking-tighter">
                          <Edit2 size={10} /> Ajustar
                        </button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader><DialogTitle>Meta Eleitoral 2026</DialogTitle></DialogHeader>
                        <div className="py-6 space-y-4">
                          <Label className="text-xs uppercase font-bold text-muted-foreground">Objetivo de Votos (Total)</Label>
                          <Input 
                            type="number" 
                            className="h-12 text-lg font-bold"
                            value={newMetaValue} 
                            onChange={e => setNewMetaValue(e.target.value)} 
                          />
                          <p className="text-[10px] text-muted-foreground">Esta meta será compartilhada com toda a equipe do gabinete para acompanhamento do progresso.</p>
                        </div>
                        <DialogFooter>
                          <Button className="w-full h-11 font-bold" onClick={handleUpdateMeta}>Salvar Objetivo</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-4 font-bold uppercase tracking-widest">Projeção 2026</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Users className="text-primary" size={20} /> Lideranças Recentes
              </h2>
              <Link href="/liderancas" className="text-xs font-bold text-primary hover:underline">VER MAPA COMPLETO</Link>
            </div>
            <div className="space-y-3">
              {allLeaders.length === 0 ? (
                <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-primary/10">
                  <Users size={40} className="mx-auto text-muted-foreground opacity-10 mb-4" />
                  <p className="text-sm text-muted-foreground">Sua base territorial ainda não possui líderes mapeados.</p>
                </div>
              ) : 
                allLeaders.slice(0, 5).map((l: Leader) => (
                  <Link key={l.id} href="/liderancas">
                    <Card className="border-none shadow-sm hover:bg-primary/5 transition-colors mb-3 group">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary text-sm">
                            {l.nome[0].toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm group-hover:text-primary transition-colors">{l.nome}</h4>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground mt-1 font-bold uppercase">
                              <span className="flex items-center gap-1"><MapPin size={10} /> {l.bairro}</span>
                              <span className="text-primary">{l.potencialVotos} Votos</span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary transition-transform" />
                      </CardContent>
                    </Card>
                  </Link>
                ))
              }
            </div>
          </section>

          <aside className="space-y-6">
            <Card className="bg-primary text-primary-foreground border-none shadow-xl shadow-primary/10 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10"><Target size={120} /></div>
              <CardHeader className="relative z-10"><CardTitle className="text-lg">Foco Estratégico</CardTitle></CardHeader>
              <CardContent className="relative z-10">
                <p className="text-sm opacity-90 font-medium italic">"Cada atendimento registrado é uma semente plantada para a vitória em 2026."</p>
                <div className="mt-8 p-5 bg-black/10 rounded-xl border border-white/10">
                  <p className="text-[10px] font-bold uppercase mb-2 tracking-widest opacity-70">Capacidade da Base</p>
                  <p className="text-2xl font-bold">{stats.votosMapeados.toLocaleString()} <span className="text-xs font-normal opacity-60">/ {stats.metaGeral.toLocaleString()}</span></p>
                  <Progress value={stats.progressoMeta} className="h-1.5 bg-white/20 mt-3" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-primary/10 shadow-lg">
              <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-widest">Resumo do Gabinete</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span className="text-xs font-bold">Abertas</span>
                  </div>
                  <span className="text-xs font-mono">{allDemands.filter(d => d.status === "ABERTO" && !d.deleted).length}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full" />
                    <span className="text-xs font-bold">Em Trâmite</span>
                  </div>
                  <span className="text-xs font-mono">{allDemands.filter(d => d.status === "EM_ANDAMENTO" && !d.deleted).length}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-xs font-bold">Finalizadas</span>
                  </div>
                  <span className="text-xs font-mono">{allDemands.filter(d => d.status === "FINALIZADO" && !d.deleted).length}</span>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
