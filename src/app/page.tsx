
"use client";

import { useFirestore, useCollection, useUser, useDoc } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useMemo, useState, useEffect } from "react";
import { collection, query, doc, setDoc } from "firebase/firestore";
import { Demand, Leader, GlobalConfig } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  Target, 
  MapPin, 
  TrendingUp,
  PlusCircle,
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

  const demandsQuery = useMemo(() => db ? query(collection(db, "demandas")) : null, [db]);
  const { data: allDemands = [] } = useCollection(demandsQuery);

  const leadersQuery = useMemo(() => db ? query(collection(db, "liderancas")) : null, [db]);
  const { data: allLeaders = [] } = useCollection(leadersQuery);

  const configRef = useMemo(() => db ? doc(db, "config", "global") : null, [db]);
  const { data: config, loading: configLoading } = useDoc<GlobalConfig>(configRef);

  const userEmail = user?.email?.toLowerCase().trim();
  const profileRef = useMemo(() => (userEmail && db) ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: profile } = useDoc(profileRef);

  const isAdmin = (profile as any)?.perfil === "ADMIN" || (profile as any)?.perfil === "SUPER_ADMIN" || user?.email === "edisonunb@gmail.com";

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
    if (isNaN(val) || val <= 0) {
      toast({ title: "Valor inválido", description: "Insira um número válido para a meta.", variant: "destructive" });
      return;
    }

    try {
      await setDoc(configRef, { metaVotos2026: val }, { merge: true });
      toast({ title: "Meta Atualizada", description: `A meta geral foi alterada para ${val.toLocaleString()} votos.` });
      setIsEditingMeta(false);
    } catch (e) {
      toast({ title: "Erro", description: "Falha ao atualizar a meta estratégica.", variant: "destructive" });
    }
  };

  if (authLoading || configLoading) return <div className="flex items-center justify-center min-h-screen bg-background"><Loader2 className="animate-spin text-primary" /></div>;

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
              <Link href="/demandas/new"><Button variant="outline" className="border-primary/20 hover:bg-primary/10">Nova Demanda</Button></Link>
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

          <Card className="bg-card border-primary/10 relative group">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Meta Geral 2026</p>
                  <h3 className="text-3xl font-bold">{(stats.metaGeral / 1000).toFixed(0)}K</h3>
                </div>
                <div className="p-2 bg-primary/10 text-primary rounded-lg flex flex-col items-center">
                  <TrendingUp size={24} />
                  {isAdmin && (
                    <Dialog open={isEditingMeta} onOpenChange={setIsEditingMeta}>
                      <DialogTrigger asChild>
                        <button className="mt-2 text-[10px] flex items-center gap-1 hover:underline text-primary/70">
                          <Edit2 size={10} /> Editar
                        </button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Ajustar Meta Estratégica</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                          <div className="space-y-2">
                            <Label>Objetivo de Votos (Total)</Label>
                            <Input 
                              type="number" 
                              value={newMetaValue} 
                              onChange={e => setNewMetaValue(e.target.value)}
                              placeholder="Ex: 50000"
                            />
                            <p className="text-[10px] text-muted-foreground">Esta meta define o progresso de todas as barras de crescimento do dashboard.</p>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="ghost" onClick={() => setIsEditingMeta(false)}>Cancelar</Button>
                          <Button onClick={handleUpdateMeta}>Salvar Novo Objetivo</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-4 font-bold uppercase">Objetivo de Votos Estimado</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Users className="text-primary" size={20} />
                Lideranças Estratégicas
              </h2>
              <Link href="/liderancas" className="text-xs text-primary hover:underline font-bold">VER MAPA COMPLETO</Link>
            </div>
            <div className="grid gap-3">
              {allLeaders.length === 0 ? (
                <div className="p-10 border border-dashed rounded-xl text-center text-muted-foreground">Nenhum líder mapeado.</div>
              ) : (
                allLeaders.slice(0, 5).map((l: Leader) => (
                  <Card key={l.id} className="border-none shadow-sm hover:bg-primary/5 transition-colors cursor-pointer group">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary">
                          {l.nome[0].toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm">{l.nome}</h4>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1 font-bold">
                            <span className="flex items-center gap-1"><MapPin size={10} /> {l.bairro}</span>
                            <span className="text-primary">{l.potencialVotos} Votos</span>
                            <Badge variant="outline" className="text-[8px] h-3.5 uppercase">{l.influencia} INFLUÊNCIA</Badge>
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary transition-transform" />
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </section>

          <aside className="space-y-6">
            <Card className="bg-primary text-primary-foreground border-none shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Target size={20} /> Objetivo 2026
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm opacity-90 leading-relaxed font-medium">
                  "O sucesso eleitoral é construído na rotina do gabinete. Cada demanda atendida é um tijolo na base de confiança do eleitor."
                </p>
                <div className="mt-6 p-4 bg-white/10 rounded-lg">
                  <p className="text-[10px] font-bold uppercase mb-2 tracking-widest">Capacidade Atual</p>
                  <p className="text-xl font-bold">{stats.votosMapeados.toLocaleString()} / {stats.metaGeral.toLocaleString()}</p>
                  <Progress value={stats.progressoMeta} className="h-1 bg-white/20 mt-2" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-primary/10">
              <CardHeader>
                <CardTitle className="text-md font-bold">Territórios em Foco</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-muted-foreground">Centro</span>
                  <span className="font-bold text-primary">85% Meta</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-muted-foreground">Zona Norte</span>
                  <span className="font-bold text-primary">42% Meta</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-muted-foreground">Periferia Sul</span>
                  <span className="font-bold text-primary">12% Meta</span>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
