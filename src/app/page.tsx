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
        <Loader2 className="animate-spin text-slate-400 h-10 w-10" />
      </div>
    );
  }

  if (!user) return null;

  if (loadingProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
        <Loader2 className="animate-spin text-slate-400 h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto px-4 py-6 md:py-10">
        <header className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase">Legis<span className="text-slate-500">Trac</span></h1>
              <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">Gestão Interna de Gabinete</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link href="/demandas/new" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full h-10 font-bold border-slate-800 text-xs uppercase tracking-wider">Nova Demanda</Button>
              </Link>
              <Link href="/liderancas/new" className="w-full sm:w-auto">
                <Button className="w-full bg-slate-100 text-slate-900 border-none font-bold h-10 text-xs uppercase tracking-wider hover:bg-slate-200">
                  Cadastrar Líder
                </Button>
              </Link>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
          <Card className="bg-card border-slate-900 shadow-sm overflow-hidden">
            <CardContent className="pt-6">
              <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1 tracking-widest">Votos Mapeados</p>
              <h3 className="text-3xl font-black">{stats.votosMapeados.toLocaleString()}</h3>
              <div className="mt-4">
                <div className="flex justify-between text-[10px] mb-1 font-bold">
                  <span className="text-muted-foreground uppercase">Meta 2026</span>
                  <span className="text-foreground">{stats.progressoMeta.toFixed(1)}%</span>
                </div>
                <Progress value={stats.progressoMeta} className="h-1 bg-slate-900" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-slate-900 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1 tracking-widest">Base de Líderes</p>
                  <h3 className="text-3xl font-black">{stats.totalLideres}</h3>
                </div>
                <div className="p-2 bg-slate-900 text-slate-400 rounded-lg">
                  <Users size={20} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-slate-900 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1 tracking-widest">Processos Ativos</p>
                  <h3 className="text-3xl font-black">{stats.demandasAtivas}</h3>
                </div>
                <div className="p-2 bg-slate-900 text-slate-400 rounded-lg">
                  <ClipboardList size={20} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-slate-900 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1 tracking-widest">Meta Estratégica</p>
                  <h3 className="text-3xl font-black">{(stats.metaGeral / 1000).toFixed(0)}K</h3>
                </div>
                <div className="flex flex-col items-center">
                  <TrendingUp size={20} className="text-slate-400" />
                  {(profile?.perfil === "ADMIN" || isSuperAdmin) && (
                    <Dialog open={isEditingMeta} onOpenChange={setIsEditingMeta}>
                      <DialogTrigger asChild>
                        <button className="mt-2 text-[9px] hover:underline text-muted-foreground font-bold uppercase tracking-tight">
                          Ajustar
                        </button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md bg-slate-950 border-slate-900">
                        <DialogHeader><DialogTitle className="text-foreground font-bold uppercase text-sm">Meta Eleitoral</DialogTitle></DialogHeader>
                        <div className="py-4 space-y-4">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Objetivo de Votos</Label>
                          <Input 
                            type="number" 
                            className="h-10 border-slate-800 bg-slate-950"
                            value={newMetaValue} 
                            onChange={e => setNewMetaValue(e.target.value)} 
                          />
                        </div>
                        <DialogFooter>
                          <Button className="w-full h-10 font-bold text-xs uppercase" onClick={handleUpdateMeta}>Salvar Meta</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest">
                Lideranças Recentes
              </h2>
              <Link href="/liderancas" className="text-[9px] font-bold text-muted-foreground hover:text-foreground tracking-widest uppercase">Ver Mapa</Link>
            </div>
            <div className="space-y-2">
              {allLeaders.length === 0 ? (
                <div className="text-center py-16 bg-slate-950 rounded-lg border border-slate-900 border-dashed">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">Nenhum líder mapeado</p>
                </div>
              ) : 
                allLeaders.slice(0, 5).map((l: Leader) => (
                  <Link key={l.id} href="/liderancas">
                    <Card className="border-slate-900 bg-card hover:bg-slate-900/50 transition-colors shadow-none">
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 bg-slate-800 rounded flex items-center justify-center font-bold text-slate-300 text-xs border border-slate-700">
                            {l.nome[0].toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm">{l.nome}</h4>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5 font-bold uppercase tracking-tighter">
                              <MapPin size={10} /> {l.bairro} • <span className="text-slate-400">{l.potencialVotos} Votos</span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-slate-600" />
                      </CardContent>
                    </Card>
                  </Link>
                ))
              }
            </div>
          </section>

          <aside className="space-y-6">
            <Card className="bg-slate-900/30 border-slate-900 shadow-none">
              <CardHeader><CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Estratégico</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-slate-950 rounded-lg border border-slate-900">
                  <p className="text-[9px] font-bold uppercase mb-2 tracking-widest text-muted-foreground">Capacidade Territorial</p>
                  <p className="text-2xl font-black">{stats.votosMapeados.toLocaleString()}</p>
                  <Progress value={stats.progressoMeta} className="h-1 bg-slate-900 mt-2" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-slate-900 shadow-none">
              <CardHeader><CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Fluxo Interno</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between p-2 text-xs">
                  <span className="text-muted-foreground font-bold uppercase">Abertas</span>
                  <span className="font-mono font-bold">{allDemands.filter(d => d.status === "ABERTO" && !d.deleted).length}</span>
                </div>
                <div className="flex items-center justify-between p-2 text-xs">
                  <span className="text-muted-foreground font-bold uppercase">Em Trâmite</span>
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