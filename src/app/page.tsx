
"use client";

import { useFirestore, useCollection, useUser, useDoc } from "@/firebase";
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
  Edit2
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

export default function StrategicDashboard() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [newMetaValue, setNewMetaValue] = useState("");

  const userEmail = user?.email?.toLowerCase().trim();
  const profileRef = useMemo(() => (userEmail && db) ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: profile } = useDoc(profileRef);

  const cabinetId = (profile as any)?.cabinetId;
  const isSuperAdmin = userEmail === "edisonunb@gmail.com";

  const demandsQuery = useMemo(() => {
    if (!db || (!cabinetId && !isSuperAdmin)) return null;
    return isSuperAdmin 
      ? query(collection(db, "demandas"))
      : query(collection(db, "demandas"), where("cabinetId", "==", cabinetId));
  }, [db, cabinetId, isSuperAdmin]);
  const { data: allDemands = [] } = useCollection(demandsQuery);

  const leadersQuery = useMemo(() => {
    if (!db || (!cabinetId && !isSuperAdmin)) return null;
    return isSuperAdmin
      ? query(collection(db, "liderancas"))
      : query(collection(db, "liderancas"), where("cabinetId", "==", cabinetId));
  }, [db, cabinetId, isSuperAdmin]);
  const { data: allLeaders = [] } = useCollection(leadersQuery);

  const configRef = useMemo(() => {
    if (!db) return null;
    // Evita erro de 'indexOf' garantindo que os segmentos do path existam
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
      demandasAtivas: allDemands.filter((d: Demand) => d.status !== "FINALIZADO").length,
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
    if (isNaN(val) || val <= 0) return;

    try {
      await setDoc(configRef, { metaVotos2026: val, cabinetId: cabinetId || "global" }, { merge: true });
      toast({ title: "Meta Atualizada" });
      setIsEditingMeta(false);
    } catch (e) {
      toast({ title: "Erro", variant: "destructive" });
    }
  };

  if (authLoading) return <div className="flex items-center justify-center min-h-screen bg-background"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <header className="mb-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tighter">Blueprint Estratégico <span className="text-primary">2026</span></h1>
              <p className="text-muted-foreground text-lg">Gestão de Gabinete de Alta Performance</p>
            </div>
            <div className="flex gap-2">
              <Link href="/demandas/new"><Button variant="outline" className="border-primary/20">Nova Demanda</Button></Link>
              <Link href="/liderancas/new"><Button className="bg-primary text-primary-foreground font-bold">Cadastrar Líder</Button></Link>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <Card className="bg-card border-primary/10">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Votos Mapeados</p>
                  <h3 className="text-3xl font-bold">{stats.votosMapeados.toLocaleString()}</h3>
                </div>
                <div className="p-2 bg-primary/10 text-primary rounded-lg"><Target size={24} /></div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-[10px] mb-1 font-bold">
                  <span>PROGRESSO META 2026</span>
                  <span>{stats.progressoMeta.toFixed(1)}%</span>
                </div>
                <Progress value={stats.progressoMeta} className="h-1.5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-primary/10">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Total de Líderes</p>
                  <h3 className="text-3xl font-bold">{stats.totalLideres}</h3>
                </div>
                <div className="p-2 bg-primary/10 text-primary rounded-lg"><Users size={24} /></div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-4 font-bold">BASE TERRITORIAL ATIVA</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-primary/10">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Demandas Gabinete</p>
                  <h3 className="text-3xl font-bold">{stats.demandasAtivas}</h3>
                </div>
                <div className="p-2 bg-primary/10 text-primary rounded-lg"><ClipboardList size={24} /></div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-4 font-bold">PROCESSOS EM TRÂMITE</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-primary/10">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Meta Geral 2026</p>
                  <h3 className="text-3xl font-bold">{(stats.metaGeral / 1000).toFixed(0)}K</h3>
                </div>
                <div className="p-2 bg-primary/10 text-primary rounded-lg flex flex-col items-center">
                  <TrendingUp size={24} />
                  <Dialog open={isEditingMeta} onOpenChange={setIsEditingMeta}>
                    <DialogTrigger asChild>
                      <button className="mt-2 text-[10px] flex items-center gap-1 hover:underline text-primary/70">
                        <Edit2 size={10} /> Editar
                      </button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Ajustar Meta Estratégica</DialogTitle></DialogHeader>
                      <div className="py-4 space-y-4">
                        <Label>Objetivo de Votos (Total)</Label>
                        <Input type="number" value={newMetaValue} onChange={e => setNewMetaValue(e.target.value)} />
                      </div>
                      <DialogFooter>
                        <Button onClick={handleUpdateMeta}>Salvar</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-4 font-bold uppercase">Objetivo Estimado</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Users className="text-primary" size={20} /> Lideranças Estratégicas
              </h2>
            </div>
            <div className="grid gap-3">
              {allLeaders.length === 0 ? <p className="text-muted-foreground text-center py-10">Sem líderes cadastrados.</p> : 
                allLeaders.slice(0, 5).map((l: Leader) => (
                  <Card key={l.id} className="border-none shadow-sm hover:bg-primary/5 transition-colors">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary">
                          {l.nome[0].toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm">{l.nome}</h4>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1 font-bold">
                            <span><MapPin size={10} /> {l.bairro}</span>
                            <span className="text-primary">{l.potencialVotos} Votos</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-muted-foreground" />
                    </CardContent>
                  </Card>
                ))
              }
            </div>
          </section>

          <aside className="space-y-6">
            <Card className="bg-primary text-primary-foreground border-none">
              <CardHeader><CardTitle className="text-lg">Foco em 2026</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm opacity-90 font-medium">"Cada atendimento é um voto conquistado."</p>
                <div className="mt-6 p-4 bg-white/10 rounded-lg">
                  <p className="text-[10px] font-bold uppercase mb-2">Capacidade Atual</p>
                  <p className="text-xl font-bold">{stats.votosMapeados.toLocaleString()} / {stats.metaGeral.toLocaleString()}</p>
                  <Progress value={stats.progressoMeta} className="h-1 bg-white/20 mt-2" />
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
