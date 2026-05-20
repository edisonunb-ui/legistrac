"use client";

import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useMemo, useState, useEffect } from "react";
import { collection, query, doc, setDoc, where } from "firebase/firestore";
import { Demand, Leader, GlobalConfig } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  TrendingUp,
  Loader2,
  ChevronRight,
  ClipboardList,
  MapPin,
  Target,
  Clock as ClockIcon,
  Calendar as CalendarIcon
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";

const MASTER_EMAIL = "edisonunb@gmail.com";
const AUDITOR_EMAIL = "alemao@gmail.com";

/**
 * Sub-componente de cabeçalho para otimizar re-renders do relógio
 */
function DashboardHeader({ isGlobal }: { isGlobal: boolean }) {
  const [dateTime, setDateTime] = useState<{ date: string, time: string } | null>(null);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setDateTime({
        date: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(now),
        time: new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now)
      });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="mb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="flex-1">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter uppercase leading-tight text-white">
            Dashboard <span className="text-primary">{isGlobal ? "Global" : "Estratégico"}</span>
          </h1>
          <div className="flex flex-wrap items-center gap-4 mt-4">
            <p className="text-primary text-[10px] sm:text-xs uppercase tracking-[0.3em] font-black bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full glow-primary">Inteligência Parlamentar</p>
            {dateTime && (
              <div className="flex items-center gap-3 text-[10px] sm:text-xs font-black uppercase tracking-widest text-muted-foreground">
                <CalendarIcon size={14} className="text-primary/60" />
                <span className="text-white/80">{dateTime.date}</span>
                <span className="mx-1 text-white/10">|</span>
                <ClockIcon size={14} className="text-primary/60" />
                <span className="font-mono text-white/80">{dateTime.time}</span>
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:flex gap-4">
          <Link href="/demandas/new" className="w-full">
            <Button variant="outline" className="w-full font-black text-[11px] uppercase h-12 px-8 tracking-widest border-white/10 bg-white/5 hover:bg-white/10 text-white">
              Nova Demanda
            </Button>
          </Link>
          <Link href="/liderancas/new" className="w-full">
            <Button className="w-full font-black text-[11px] uppercase h-12 px-8 tracking-widest shadow-lg shadow-primary/20 bg-primary text-black hover:opacity-90 glow-primary">
              Cadastrar Líder
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function StrategicDashboard() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [newMetaValue, setNewMetaValue] = useState("");

  const userEmail = useMemo(() => user?.email?.toLowerCase().trim() || null, [user?.email]);
  const isSuperAdmin = useMemo(() => userEmail === MASTER_EMAIL, [userEmail]);
  const isAuditor = useMemo(() => userEmail === AUDITOR_EMAIL, [userEmail]);
  const hasGlobalView = isSuperAdmin || isAuditor;
  
  const profileRef = useMemoFirebase(() => (userEmail && db) ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: profile, loading: loadingProfile } = useDoc(profileRef);

  const cabinetId = (profile as any)?.cabinetId;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const demandsQuery = useMemoFirebase(() => {
    if (!db || (!cabinetId && !hasGlobalView)) return null;
    return hasGlobalView 
      ? query(collection(db, "demandas"))
      : query(collection(db, "demandas"), where("cabinetId", "==", cabinetId));
  }, [db, cabinetId, hasGlobalView]);
  const { data: allDemands = [] } = useCollection(demandsQuery);

  const leadersQuery = useMemoFirebase(() => {
    if (!db || (!cabinetId && !hasGlobalView)) return null;
    return hasGlobalView
      ? query(collection(db, "liderancas"))
      : query(collection(db, "liderancas"), where("cabinetId", "==", cabinetId));
  }, [db, cabinetId, hasGlobalView]);
  const { data: allLeaders = [] } = useCollection(leadersQuery);

  const configRef = useMemoFirebase(() => {
    if (!db) return null;
    if (hasGlobalView) return doc(db, "config", "global");
    if (cabinetId) return doc(db, "gabinetes", cabinetId, "config", "global");
    return null;
  }, [db, cabinetId, hasGlobalView]);
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
      toast({ title: "Meta Atualizada" });
      setIsEditingMeta(false);
    } catch (e) {
      toast({ title: "Erro", variant: "destructive" });
    }
  };

  if (authLoading || (loadingProfile && !hasGlobalView)) {
    return <div className="flex items-center justify-center min-h-screen bg-black"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto px-4 py-6 sm:py-10">
        <DashboardHeader isGlobal={hasGlobalView} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="bg-white/5 border-white/5 shadow-2xl overflow-hidden relative">
             <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            <CardContent className="pt-8">
              <p className="text-[10px] font-black uppercase text-muted-foreground mb-2 tracking-[0.2em]">Votos Mapeados</p>
              <h3 className="text-5xl font-black tabular-nums text-white">{stats.votosMapeados.toLocaleString()}</h3>
              <div className="mt-6 space-y-3">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-muted-foreground">Progresso Meta</span>
                  <span className="text-primary">{stats.progressoMeta.toFixed(1)}%</span>
                </div>
                <Progress value={stats.progressoMeta} className="h-1.5 bg-white/5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/5 shadow-2xl group hover:border-primary/30 transition-all">
            <CardContent className="pt-8">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase text-muted-foreground mb-2 tracking-[0.2em]">Lideranças</p>
                  <h3 className="text-5xl font-black tabular-nums text-white">{stats.totalLideres}</h3>
                </div>
                <div className="p-3 bg-secondary/20 rounded-xl text-secondary border border-secondary/30"><Users size={24} /></div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/5 shadow-2xl group hover:border-primary/30 transition-all">
            <CardContent className="pt-8">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase text-muted-foreground mb-2 tracking-[0.2em]">Processos Ativos</p>
                  <h3 className="text-5xl font-black tabular-nums text-white">{stats.demandasAtivas}</h3>
                </div>
                <div className="p-3 bg-primary/10 rounded-xl text-primary border border-primary/20"><ClipboardList size={24} /></div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/5 shadow-2xl relative overflow-hidden group hover:border-primary/30 transition-all">
            <CardContent className="pt-8">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase text-muted-foreground mb-2 tracking-[0.2em]">Meta de Votos</p>
                  <h3 className="text-5xl font-black tabular-nums text-white">{(stats.metaGeral / 1000).toFixed(0)}K</h3>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-xl text-primary border border-primary/20"><Target size={24} /></div>
                  {(profile?.perfil === "ADMIN" || hasGlobalView) && (
                    <Dialog open={isEditingMeta} onOpenChange={setIsEditingMeta}>
                      <DialogTrigger asChild>
                        <button className="text-[10px] hover:text-primary text-muted-foreground font-black uppercase tracking-widest transition-colors border-b border-transparent hover:border-primary">Ajustar</button>
                      </DialogTrigger>
                      <DialogContent className="bg-black border-white/10 w-[95vw] sm:max-w-md">
                        <DialogHeader><DialogTitle className="uppercase text-sm font-black tracking-widest text-primary">Objetivo 2026</DialogTitle></DialogHeader>
                        <div className="py-8 space-y-6">
                          <Label className="text-[11px] uppercase font-black tracking-widest text-muted-foreground">Número de Votos</Label>
                          <Input type="number" className="h-14 border-white/10 bg-white/5 font-black text-2xl text-white text-center" value={newMetaValue} onChange={e => setNewMetaValue(e.target.value)} />
                        </div>
                        <DialogFooter><Button className="w-full h-14 font-black uppercase text-xs tracking-widest bg-primary text-black" onClick={handleUpdateMeta}>Salvar Objetivo</Button></DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <section className="lg:col-span-2 space-y-8">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-[11px] font-black uppercase tracking-[0.4em] flex items-center gap-3 text-primary">
                <MapPin size={16} /> Mapeamento Territorial
              </h2>
              <Link href="/liderancas" className="text-[10px] font-black text-muted-foreground uppercase hover:text-primary transition-all tracking-widest border-b border-transparent hover:border-primary">Ver Mapa</Link>
            </div>
            <div className="space-y-4">
              {allLeaders.length === 0 ? (
                <div className="text-center py-24 border border-dashed border-white/10 rounded-2xl bg-white/5">
                  <p className="text-[11px] text-muted-foreground font-black uppercase tracking-[0.3em]">Sem registros estratégicos</p>
                </div>
              ) : 
                allLeaders.slice(0, 5).map((l: Leader) => (
                  <Link key={l.id} href="/liderancas">
                    <Card className="bg-white/5 hover:bg-white/10 transition-all border-white/5 hover:border-primary/20 group cursor-pointer active:scale-[0.99] shadow-xl">
                      <CardContent className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center font-black text-lg text-primary border border-primary/20 uppercase">
                            {l.nome[0]}
                          </div>
                          <div>
                            <h4 className="font-black text-base uppercase tracking-tight group-hover:text-primary transition-colors text-white">{l.nome}</h4>
                            <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-black uppercase mt-2 tracking-widest">
                              <span className="flex items-center gap-1.5"><MapPin size={12} className="text-primary/50" /> {l.bairro}</span>
                              <span className="text-white/10">|</span>
                              <span className="text-primary font-bold">{l.potencialVotos} Votos</span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight size={20} className="text-muted-foreground group-hover:text-primary transition-all" />
                      </CardContent>
                    </Card>
                  </Link>
                ))
              }
            </div>
          </section>

          <aside className="space-y-8">
            <Card className="bg-white/5 border-white/5 shadow-2xl overflow-hidden">
              <CardHeader className="bg-white/5 border-b border-white/5">
                <CardTitle className="text-[11px] font-black uppercase tracking-[0.4em] text-primary flex items-center gap-3">
                  <TrendingUp size={16} /> Atividade Recente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-8">
                <div className="flex justify-between items-center p-5 bg-black/40 rounded-2xl border border-white/5 transition-all hover:border-primary/30">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Demandas Abertas</span>
                  <span className="font-black text-primary bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-full text-xs">
                    {allDemands.filter(d => d.status === "ABERTO" && !d.deleted).length}
                  </span>
                </div>
                <div className="flex justify-between items-center p-5 bg-black/40 rounded-2xl border border-white/5 transition-all hover:border-primary/30">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Em Trâmite</span>
                  <span className="font-black text-secondary bg-secondary/10 border border-secondary/20 px-4 py-1.5 rounded-full text-xs">
                    {allDemands.filter(d => d.status === "EM_ANDAMENTO" && !d.deleted).length}
                  </span>
                </div>
                <Link href="/demandas" className="block mt-6">
                  <Button variant="ghost" className="w-full text-[11px] font-black uppercase tracking-widest h-12 hover:bg-primary/10 hover:text-primary">
                    Gerenciar Fluxo <ChevronRight size={16} className="ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
