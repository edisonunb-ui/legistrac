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
  LogOut,
  Sparkles
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

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
        <Loader2 className="animate-spin text-accent h-10 w-10" />
        <p className="text-accent text-sm font-bold uppercase tracking-widest animate-pulse">Sincronizando Gabinete...</p>
      </div>
    );
  }

  if (!user) return null;

  if (loadingProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
        <Loader2 className="animate-spin text-accent h-10 w-10" />
        <p className="text-accent text-sm font-bold uppercase tracking-widest animate-pulse">Validando Acesso...</p>
      </div>
    );
  }

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
              <p className="text-sm text-muted-foreground">Seu e-mail <b>{userEmail}</b> não foi encontrado na base de usuários autorizados.</p>
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
              <h1 className="text-3xl md:text-5xl font-black tracking-tighter">Blueprint <span className="text-firebase-gradient">2026</span></h1>
              <p className="text-muted-foreground text-base md:text-xl mt-1 font-medium">Gestão de Gabinete de Alta Performance</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link href="/demandas/new" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full border-accent/20 h-11 hover:bg-accent/10 hover:text-accent font-bold">Nova Demanda</Button>
              </Link>
              <Link href="/liderancas/new" className="w-full sm:w-auto">
                <Button className="w-full bg-firebase-gradient text-white border-none font-black h-11 shadow-lg shadow-accent/20 hover:scale-105 transition-transform">
                  Cadastrar Líder
                </Button>
              </Link>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
          <Card className="bg-card border-accent/10 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-20 transition-opacity">
               <Target size={60} className="text-accent" />
            </div>
            <CardContent className="pt-6">
              <p className="text-[10px] font-bold uppercase text-accent mb-1 tracking-widest">Votos Mapeados</p>
              <h3 className="text-4xl font-black">{stats.votosMapeados.toLocaleString()}</h3>
              <div className="mt-4">
                <div className="flex justify-between text-[10px] mb-1 font-black">
                  <span className="text-muted-foreground">PROGRESSO META 2026</span>
                  <span className="text-accent">{stats.progressoMeta.toFixed(1)}%</span>
                </div>
                <Progress value={stats.progressoMeta} className="h-2 bg-accent/10" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-accent/10 shadow-lg group">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold uppercase text-accent mb-1 tracking-widest">Base de Líderes</p>
                  <h3 className="text-4xl font-black">{stats.totalLideres}</h3>
                </div>
                <div className="p-2 bg-accent/10 text-accent rounded-lg group-hover:bg-accent group-hover:text-black transition-colors">
                  <Users size={24} />
                </div>
              </div>
              <p className="text-[10px] text-accent/80 mt-4 font-bold uppercase tracking-widest flex items-center gap-1">
                <span className="w-2 h-2 bg-accent rounded-full animate-pulse" /> Territorial Ativa
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-accent/10 shadow-lg group">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold uppercase text-accent mb-1 tracking-widest">Processos Ativos</p>
                  <h3 className="text-4xl font-black">{stats.demandasAtivas}</h3>
                </div>
                <div className="p-2 bg-accent/10 text-accent rounded-lg group-hover:bg-accent group-hover:text-black transition-colors">
                  <ClipboardList size={24} />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-4 font-bold uppercase tracking-widest">Em trâmite interno</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-accent/10 shadow-lg group">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold uppercase text-accent mb-1 tracking-widest">Meta Estratégica</p>
                  <h3 className="text-4xl font-black">{(stats.metaGeral / 1000).toFixed(0)}K</h3>
                </div>
                <div className="p-2 bg-accent/10 text-accent rounded-lg flex flex-col items-center">
                  <TrendingUp size={24} />
                  {(profile?.perfil === "ADMIN" || isSuperAdmin) && (
                    <Dialog open={isEditingMeta} onOpenChange={setIsEditingMeta}>
                      <DialogTrigger asChild>
                        <button className="mt-2 text-[10px] flex items-center gap-1 hover:underline text-accent font-bold uppercase tracking-tighter">
                          <Edit2 size={10} /> Ajustar
                        </button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md bg-card border-accent/20">
                        <DialogHeader><DialogTitle className="text-accent font-black">Meta Eleitoral 2026</DialogTitle></DialogHeader>
                        <div className="py-6 space-y-4">
                          <Label className="text-xs uppercase font-bold text-muted-foreground">Objetivo de Votos (Total)</Label>
                          <Input 
                            type="number" 
                            className="h-12 text-lg font-bold border-accent/20 focus:border-accent"
                            value={newMetaValue} 
                            onChange={e => setNewMetaValue(e.target.value)} 
                          />
                        </div>
                        <DialogFooter>
                          <Button className="w-full h-11 font-black bg-firebase-gradient text-white border-none" onClick={handleUpdateMeta}>Salvar Objetivo</Button>
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
              <h2 className="text-xl font-black flex items-center gap-2">
                <Sparkles className="text-accent" size={20} /> Lideranças Recentes
              </h2>
              <Link href="/liderancas" className="text-[10px] font-black text-accent hover:underline tracking-widest">VER MAPA COMPLETO</Link>
            </div>
            <div className="space-y-3">
              {allLeaders.length === 0 ? (
                <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-accent/10">
                  <Users size={40} className="mx-auto text-accent opacity-10 mb-4" />
                  <p className="text-sm text-muted-foreground font-bold">Mapeamento inicial pendente.</p>
                </div>
              ) : 
                allLeaders.slice(0, 5).map((l: Leader) => (
                  <Link key={l.id} href="/liderancas">
                    <Card className="border-none shadow-sm hover:bg-accent/5 transition-colors mb-3 group">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-firebase-gradient rounded-full flex items-center justify-center font-black text-white text-sm shadow-md">
                            {l.nome[0].toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm group-hover:text-accent transition-colors">{l.nome}</h4>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground mt-1 font-bold uppercase">
                              <span className="flex items-center gap-1"><MapPin size={10} className="text-accent" /> {l.bairro}</span>
                              <span className="text-accent">{l.potencialVotos} Votos</span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight size={18} className="text-muted-foreground group-hover:text-accent transition-transform" />
                      </CardContent>
                    </Card>
                  </Link>
                ))
              }
            </div>
          </section>

          <aside className="space-y-6">
            <Card className="bg-firebase-gradient text-white border-none shadow-xl shadow-accent/10 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10"><Target size={120} /></div>
              <CardHeader className="relative z-10"><CardTitle className="text-lg font-black uppercase tracking-widest">Foco Estratégico</CardTitle></CardHeader>
              <CardContent className="relative z-10">
                <p className="text-sm opacity-90 font-bold italic leading-relaxed">"Cada atendimento registrado é uma semente plantada para 2026."</p>
                <div className="mt-8 p-5 bg-black/20 rounded-xl border border-white/10">
                  <p className="text-[10px] font-black uppercase mb-2 tracking-widest opacity-70">Capacidade da Base</p>
                  <p className="text-3xl font-black">{stats.votosMapeados.toLocaleString()} <span className="text-xs font-normal opacity-60">/ {stats.metaGeral.toLocaleString()}</span></p>
                  <Progress value={stats.progressoMeta} className="h-1.5 bg-white/20 mt-3" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-accent/10 shadow-lg">
              <CardHeader><CardTitle className="text-[10px] font-black uppercase tracking-widest text-accent">Resumo do Gabinete</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-accent/5 rounded-lg border border-accent/10">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                    <span className="text-xs font-black uppercase">Abertas</span>
                  </div>
                  <span className="text-xs font-mono font-bold">{allDemands.filter(d => d.status === "ABERTO" && !d.deleted).length}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-accent/5 rounded-lg border border-accent/10">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-firebase-gradient rounded-full" />
                    <span className="text-xs font-black uppercase">Em Trâmite</span>
                  </div>
                  <span className="text-xs font-mono font-bold">{allDemands.filter(d => d.status === "EM_ANDAMENTO" && !d.deleted).length}</span>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}