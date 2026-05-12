
"use client";

import { useFirestore, useCollection, useUser, useDoc, useMemoFirebase } from "@/firebase";
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
  Target
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

export default function StrategicDashboard() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [newMetaValue, setNewMetaValue] = useState("");

  const userEmail = useMemo(() => user?.email?.toLowerCase().trim() || null, [user?.email]);
  const isSuperAdmin = useMemo(() => userEmail === MASTER_EMAIL, [userEmail]);
  
  const profileRef = useMemoFirebase(() => (userEmail && db) ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: profile, loading: loadingProfile } = useDoc(profileRef);

  const cabinetId = (profile as any)?.cabinetId;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Queries globais para SuperAdmin, filtradas para outros
  const demandsQuery = useMemoFirebase(() => {
    if (!db || (!cabinetId && !isSuperAdmin)) return null;
    return isSuperAdmin 
      ? query(collection(db, "demandas"))
      : query(collection(db, "demandas"), where("cabinetId", "==", cabinetId));
  }, [db, cabinetId, isSuperAdmin]);
  const { data: allDemands = [] } = useCollection(demandsQuery);

  const leadersQuery = useMemoFirebase(() => {
    if (!db || (!cabinetId && !isSuperAdmin)) return null;
    return isSuperAdmin
      ? query(collection(db, "liderancas"))
      : query(collection(db, "liderancas"), where("cabinetId", "==", cabinetId));
  }, [db, cabinetId, isSuperAdmin]);
  const { data: allLeaders = [] } = useCollection(leadersQuery);

  const configRef = useMemoFirebase(() => {
    if (!db) return null;
    if (isSuperAdmin) {
      return doc(db, "config", "global");
    } else if (cabinetId) {
      return doc(db, "gabinetes", cabinetId, "config", "global");
    }
    return null;
  }, [db, cabinetId, isSuperAdmin]);
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

  if (authLoading || (loadingProfile && !isSuperAdmin)) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto px-4 py-6 sm:py-10">
        <header className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase leading-tight">Dashboard <span className="text-primary/50">{isSuperAdmin ? "Global" : "Estratégico"}</span></h1>
              <p className="text-muted-foreground text-[10px] sm:text-xs uppercase tracking-[0.2em] font-black mt-2 bg-slate-900/50 w-fit px-2 py-1 rounded">Inteligência Parlamentar</p>
            </div>
            <div className="grid grid-cols-2 sm:flex gap-3">
              <Link href="/demandas/new" className="w-full">
                <Button variant="outline" className="w-full font-black text-[10px] uppercase h-11 px-6 tracking-widest border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all">
                  Nova Demanda
                </Button>
              </Link>
              <Link href="/liderancas/new" className="w-full">
                <Button className="w-full font-black text-[10px] uppercase h-11 px-6 tracking-widest shadow-xl shadow-primary/10">
                  Cadastrar Líder
                </Button>
              </Link>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10">
          <Card className="bg-card border-slate-900 shadow-xl overflow-hidden group">
            <CardContent className="pt-6 relative">
              <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest">Votos Mapeados</p>
              <h3 className="text-4xl font-black tabular-nums">{stats.votosMapeados.toLocaleString()}</h3>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-muted-foreground">Progresso Meta</span>
                  <span className="text-primary">{stats.progressoMeta.toFixed(1)}%</span>
                </div>
                <Progress value={stats.progressoMeta} className="h-1.5 bg-slate-900" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-slate-900 shadow-xl group hover:border-primary/20 transition-all">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest">Lideranças</p>
                  <h3 className="text-4xl font-black tabular-nums">{stats.totalLideres}</h3>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg"><Users className="text-primary" size={20} /></div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-slate-900 shadow-xl">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest">Processos Ativos</p>
                  <h3 className="text-4xl font-black tabular-nums">{stats.demandasAtivas}</h3>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg"><ClipboardList className="text-primary" size={20} /></div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-slate-900 shadow-xl relative overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest">Meta de Votos</p>
                  <h3 className="text-4xl font-black tabular-nums">{(stats.metaGeral / 1000).toFixed(0)}K</h3>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="p-2 bg-slate-900 rounded-lg"><Target className="text-primary" size={20} /></div>
                  {(profile?.perfil === "ADMIN" || isSuperAdmin) && (
                    <Dialog open={isEditingMeta} onOpenChange={setIsEditingMeta}>
                      <DialogTrigger asChild>
                        <button className="text-[9px] hover:text-primary text-muted-foreground font-black uppercase tracking-widest transition-colors">Ajustar</button>
                      </DialogTrigger>
                      <DialogContent className="bg-slate-950 border-slate-900 w-[95vw] sm:max-w-md">
                        <DialogHeader><DialogTitle className="uppercase text-sm font-black tracking-widest">Objetivo 2026</DialogTitle></DialogHeader>
                        <div className="py-6 space-y-4">
                          <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Número de Votos</Label>
                          <Input type="number" className="h-12 border-slate-800 bg-slate-900 font-black text-lg" value={newMetaValue} onChange={e => setNewMetaValue(e.target.value)} />
                        </div>
                        <DialogFooter><Button className="w-full h-12 font-black uppercase text-xs tracking-widest" onClick={handleUpdateMeta}>Salvar Objetivo</Button></DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <MapPin size={14} className="text-primary" /> Mapeamento Territorial
              </h2>
              <Link href="/liderancas" className="text-[9px] font-black text-muted-foreground uppercase hover:text-primary transition-colors tracking-widest">Ver Mapa</Link>
            </div>
            <div className="space-y-3">
              {allLeaders.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-slate-900 rounded-2xl bg-slate-950/30">
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Sem registros estratégicos</p>
                </div>
              ) : 
                allLeaders.slice(0, 5).map((l: Leader) => (
                  <Link key={l.id} href="/liderancas">
                    <Card className="hover:bg-slate-900/40 transition-all border-slate-900 hover:border-primary/20 group cursor-pointer active:scale-[0.98]">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center font-black text-xs text-primary shadow-inner border border-slate-800 uppercase">
                            {l.nome[0]}
                          </div>
                          <div>
                            <h4 className="font-black text-sm uppercase tracking-tight group-hover:text-primary transition-colors">{l.nome}</h4>
                            <div className="flex items-center gap-2 text-[9px] text-muted-foreground font-black uppercase mt-1 tracking-widest">
                              <MapPin size={10} className="text-primary/50" /> {l.bairro} <span className="text-slate-800">•</span> <span className="text-primary/80">{l.potencialVotos} Votos</span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1" />
                      </CardContent>
                    </Card>
                  </Link>
                ))
              }
            </div>
          </section>

          <aside className="space-y-6">
            <Card className="bg-slate-900/20 border-slate-900 shadow-xl">
              <CardHeader className="bg-slate-900/30 border-b border-slate-900">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                  <TrendingUp size={14} /> Atividade Recente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-6">
                <div className="flex justify-between items-center p-4 bg-slate-950/50 rounded-xl border border-slate-900 transition-all hover:border-primary/20">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Demandas Abertas</span>
                  <span className="font-black text-primary bg-primary/10 px-3 py-1 rounded-full text-xs">
                    {allDemands.filter(d => d.status === "ABERTO" && !d.deleted).length}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-slate-950/50 rounded-xl border border-slate-900 transition-all hover:border-primary/20">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Em Trâmite</span>
                  <span className="font-black text-primary bg-primary/10 px-3 py-1 rounded-full text-xs">
                    {allDemands.filter(d => d.status === "EM_ANDAMENTO" && !d.deleted).length}
                  </span>
                </div>
                <Link href="/demandas" className="block mt-4">
                  <Button variant="ghost" className="w-full text-[10px] font-black uppercase tracking-widest h-10 hover:bg-slate-900">
                    Gerenciar Fluxo <ChevronRight size={14} className="ml-2" />
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
