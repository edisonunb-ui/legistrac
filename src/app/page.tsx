"use client";

import { useFirestore, useCollection, useUser, useDoc, useAuthInstance, useMemoFirebase } from "@/firebase";
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
  MapPin
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
  const profileRef = useMemoFirebase(() => (userEmail && db) ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: profile, loading: loadingProfile } = useDoc(profileRef);

  const cabinetId = (profile as any)?.cabinetId;
  const isSuperAdmin = userEmail === MASTER_EMAIL;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

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
      toast({ title: "Meta Atualizada" });
      setIsEditingMeta(false);
    } catch (e) {
      toast({ title: "Erro", variant: "destructive" });
    }
  };

  if (authLoading || loadingProfile) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto px-4 py-10">
        <header className="mb-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-black tracking-tighter uppercase">Dashboard <span className="text-muted-foreground">Estratégico</span></h1>
              <p className="text-muted-foreground text-xs uppercase tracking-widest font-bold mt-1">Gestão de Inteligência Parlamentar</p>
            </div>
            <div className="flex gap-2">
              <Link href="/demandas/new"><Button variant="outline" className="font-bold text-xs uppercase h-11 px-6">Nova Demanda</Button></Link>
              <Link href="/liderancas/new"><Button className="font-bold text-xs uppercase h-11 px-6">Cadastrar Líder</Button></Link>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="bg-card border-slate-900 shadow-xl">
            <CardContent className="pt-6">
              <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1 tracking-widest">Votos Mapeados</p>
              <h3 className="text-4xl font-black">{stats.votosMapeados.toLocaleString()}</h3>
              <div className="mt-4 space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-muted-foreground uppercase">Meta 2026</span>
                  <span>{stats.progressoMeta.toFixed(1)}%</span>
                </div>
                <Progress value={stats.progressoMeta} className="h-1" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-slate-900 shadow-xl">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1 tracking-widest">Lideranças</p>
                  <h3 className="text-4xl font-black">{stats.totalLideres}</h3>
                </div>
                <Users className="text-muted-foreground" size={20} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-slate-900 shadow-xl">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1 tracking-widest">Processos Ativos</p>
                  <h3 className="text-4xl font-black">{stats.demandasAtivas}</h3>
                </div>
                <ClipboardList className="text-muted-foreground" size={20} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-slate-900 shadow-xl">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1 tracking-widest">Meta de Votos</p>
                  <h3 className="text-4xl font-black">{(stats.metaGeral / 1000).toFixed(0)}K</h3>
                </div>
                <div className="flex flex-col items-center">
                  <TrendingUp className="text-muted-foreground" size={20} />
                  {(profile?.perfil === "ADMIN" || isSuperAdmin) && (
                    <Dialog open={isEditingMeta} onOpenChange={setIsEditingMeta}>
                      <DialogTrigger asChild>
                        <button className="mt-2 text-[9px] hover:underline text-muted-foreground font-bold uppercase tracking-tight">Editar Meta</button>
                      </DialogTrigger>
                      <DialogContent className="bg-slate-950 border-slate-900">
                        <DialogHeader><DialogTitle className="uppercase text-sm">Objetivo 2026</DialogTitle></DialogHeader>
                        <div className="py-6 space-y-4">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Número de Votos</Label>
                          <Input type="number" className="h-12 border-slate-800" value={newMetaValue} onChange={e => setNewMetaValue(e.target.value)} />
                        </div>
                        <DialogFooter><Button className="w-full h-12 font-bold uppercase text-xs" onClick={handleUpdateMeta}>Salvar Objetivo</Button></DialogFooter>
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
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">Mapeamento Territorial</h2>
              <Link href="/liderancas" className="text-[9px] font-bold text-muted-foreground uppercase hover:text-foreground">Ver Mapa Completo</Link>
            </div>
            <div className="space-y-3">
              {allLeaders.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-slate-800 rounded-xl">
                  <p className="text-xs text-muted-foreground font-bold uppercase">Sem registros recentes</p>
                </div>
              ) : 
                allLeaders.slice(0, 5).map((l: Leader) => (
                  <Link key={l.id} href="/liderancas">
                    <Card className="hover:bg-slate-900/40 transition-colors cursor-pointer border-slate-900">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-900 rounded flex items-center justify-center font-bold text-xs">{l.nome[0]}</div>
                          <div>
                            <h4 className="font-bold text-sm">{l.nome}</h4>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase mt-0.5">
                              <MapPin size={10} /> {l.bairro} • <span className="text-primary/70">{l.potencialVotos} Votos</span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-muted-foreground" />
                      </CardContent>
                    </Card>
                  </Link>
                ))
              }
            </div>
          </section>

          <aside className="space-y-6">
            <Card className="bg-slate-900/20 border-slate-900">
              <CardHeader><CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Resumo de Atividades</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg border border-slate-900">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Demandas Abertas</span>
                  <span className="font-mono font-bold">{allDemands.filter(d => d.status === "ABERTO" && !d.deleted).length}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg border border-slate-900">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Em Execução</span>
                  <span className="font-mono font-bold">{allDemands.filter(d => d.status === "EM_ANDAMENTO" && !d.deleted).length}</span>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
