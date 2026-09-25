
"use client";

import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection, useStorage } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useMemo, useState, useEffect, useCallback } from "react";
import { collection, query, doc, setDoc, where, serverTimestamp } from "firebase/firestore";
import { Demand, Leader, GlobalConfig, Appointment } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  TrendingUp,
  Loader2,
  ChevronRight,
  ClipboardList,
  MapPin,
  Target,
  Clock as ClockIcon,
  Calendar as CalendarIcon,
  Sparkles,
  ShieldCheck,
  ImageIcon,
  Gavel,
  BarChart3,
  CalendarDays,
  AlertTriangle
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

const MASTER_EMAIL = "edisonunb@gmail.com";

export default function StrategicDashboard() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userEmail = useMemo(() => user?.email?.toLowerCase().trim() || null, [user?.email]);
  const isSuperAdmin = useMemo(() => userEmail === MASTER_EMAIL, [userEmail]);
  
  const profileRef = useMemoFirebase(() => (userEmail && db) ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: profile } = useDoc(profileRef);
  const cabinetId = (profile as any)?.cabinetId;

  const globalConfigRef = useMemoFirebase(() => (db) ? doc(db, "config", "global") : null, [db]);
  const { data: globalConfig } = useDoc<GlobalConfig>(globalConfigRef);

  const demandsQuery = useMemoFirebase(() => (db && cabinetId) ? query(collection(db, "demandas"), where("cabinetId", "==", cabinetId), where("deleted", "==", false)) : null, [db, cabinetId]);
  const { data: allDemands = [] } = useCollection<Demand>(demandsQuery);

  const leadersQuery = useMemoFirebase(() => (db && cabinetId) ? query(collection(db, "liderancas"), where("cabinetId", "==", cabinetId)) : null, [db, cabinetId]);
  const { data: allLeaders = [] } = useCollection<Leader>(leadersQuery);

  const agendaQuery = useMemoFirebase(() => (db && cabinetId) ? query(collection(db, "agenda"), where("cabinetId", "==", cabinetId), where("status", "==", "PENDENTE")) : null, [db, cabinetId]);
  const { data: agenda = [] } = useCollection<Appointment>(agendaQuery);

  const electionQuery = useMemoFirebase(() => (db && cabinetId) ? query(collection(db, "eleicoes"), where("cabinetId", "==", cabinetId)) : null, [db, cabinetId]);
  const { data: electionData = [] } = useCollection(electionQuery);

  const stats = useMemo(() => {
    const mappedVotes = allLeaders.reduce((acc, curr) => acc + (curr.potencialVotos || 0), 0);
    const actualVotes = electionData.reduce((acc: any, curr: any) => acc + (curr.votosGanhos || 0), 0);
    const criticalDemands = allDemands.filter(d => d.prioridade === 'ALTA' && d.status !== 'FINALIZADO').length;

    return {
      mappedVotes,
      actualVotes,
      totalLeaders: allLeaders.length,
      activeDemands: allDemands.filter(d => d.status !== 'FINALIZADO').length,
      criticalDemands,
      upcomingAppointments: agenda.length
    };
  }, [allDemands, allLeaders, agenda, electionData]);

  if (authLoading) return <div className="flex items-center justify-center min-h-screen bg-black"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto px-4 py-10">
        <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
           <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary glow-primary border border-primary/20">
                 <ShieldCheck size={32} />
              </div>
              <div>
                 <h1 className="text-4xl font-black uppercase tracking-tighter text-white">Central de <span className="text-primary">Comando</span></h1>
                 <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-1">Gabinete Estratégico LegisTrac • 2026 Ready</p>
              </div>
           </div>
           <div className="flex gap-4 w-full md:w-auto">
              <Link href="/demandas/new" className="flex-1 md:flex-none">
                 <Button className="w-full bg-primary text-black font-black uppercase text-[11px] h-12 px-8 glow-primary">Nova Demanda</Button>
              </Link>
           </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="bg-white/5 border-white/5 relative overflow-hidden group hover:border-primary/40 transition-all">
             <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
             <CardContent className="pt-8">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2">Potencial Estratégico</p>
                <h3 className="text-4xl font-black text-white">{stats.mappedVotes.toLocaleString()} <span className="text-xs text-primary">VOTOS</span></h3>
                <Link href="/analise-eleitoral" className="flex items-center gap-2 mt-4 text-[9px] font-black text-primary uppercase">
                   Analisar TSE IA <ChevronRight size={12} />
                </Link>
             </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/5 relative overflow-hidden group hover:border-secondary/40 transition-all">
             <div className="absolute top-0 left-0 w-1 h-full bg-secondary" />
             <CardContent className="pt-8">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2">Demandas Ativas</p>
                <h3 className="text-4xl font-black text-white">{stats.activeDemands} <span className="text-xs text-secondary">PROTOCOLOS</span></h3>
                {stats.criticalDemands > 0 && (
                   <div className="flex items-center gap-2 mt-4 text-[9px] font-black text-red-500 uppercase">
                      <AlertTriangle size={12} /> {stats.criticalDemands} Emergências
                   </div>
                )}
             </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/5 relative overflow-hidden group hover:border-yellow-500/40 transition-all">
             <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500" />
             <CardContent className="pt-8">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2">Agenda de Hoje</p>
                <h3 className="text-4xl font-black text-white">{stats.upcomingAppointments} <span className="text-xs text-yellow-500">ATOS</span></h3>
                <Link href="/agenda" className="flex items-center gap-2 mt-4 text-[9px] font-black text-yellow-500 uppercase">
                   Abrir Agenda <ChevronRight size={12} />
                </Link>
             </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/5 relative overflow-hidden group hover:border-green-500/40 transition-all">
             <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
             <CardContent className="pt-8">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2">Lideranças</p>
                <h3 className="text-4xl font-black text-white">{stats.totalLeaders} <span className="text-xs text-green-500">AGENTES</span></h3>
                <div className="mt-4 flex gap-1">
                   {[1,2,3,4,5].map(i => <div key={i} className="h-1 flex-1 bg-green-500/20 rounded-full" />)}
                </div>
             </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <section className="lg:col-span-2 space-y-8">
             <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h2 className="text-[12px] font-black uppercase tracking-[0.4em] flex items-center gap-3 text-primary">
                   <CalendarDays size={18} /> Próximos Atos do Vereador
                </h2>
                <Link href="/agenda" className="text-[10px] font-black text-muted-foreground uppercase border-b border-primary/20">Ver Agenda Completa</Link>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agenda.length === 0 ? (
                  <div className="col-span-2 p-12 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">Vazio.</div>
                ) : (
                  agenda.slice(0, 4).map(a => (
                    <Card key={a.id} className="bg-white/5 border-white/5 hover:border-primary/20 transition-all p-5">
                       <Badge className="bg-primary/20 text-primary border-primary/20 text-[8px] font-black uppercase mb-3">{a.tipo}</Badge>
                       <h4 className="font-black uppercase text-sm text-white mb-2">{a.titulo}</h4>
                       <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase">
                          <Clock size={12} className="text-primary" /> {a.hora}
                          <MapPin size={12} className="text-primary" /> {a.local}
                       </div>
                    </Card>
                  ))
                )}
             </div>
          </section>

          <aside className="space-y-8">
             <div className="p-8 bg-primary/10 rounded-3xl border border-primary/20 flex flex-col items-center text-center gap-4">
                <div className="p-4 bg-primary text-black rounded-2xl glow-primary shadow-xl">
                   <BarChart3 size={24} />
                </div>
                <h4 className="text-sm font-black uppercase text-primary tracking-widest leading-tight">Painel de Votos TSE</h4>
                <p className="text-[10px] text-primary/70 font-bold uppercase leading-relaxed">
                   Você conquistou {stats.actualVotes.toLocaleString()} votos reais na última eleição. Sua meta é dobrar este número em 2026.
                </p>
                <Link href="/analise-eleitoral" className="w-full">
                   <Button className="w-full bg-primary text-black font-black uppercase text-[10px] h-12">Abrir Painel IA</Button>
                </Link>
             </div>

             <Card className="bg-white/5 border-white/5 shadow-2xl overflow-hidden">
                <CardHeader className="bg-white/5 border-b border-white/5">
                   <CardTitle className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                      <Users size={16} /> Últimos Munícipes Atendidos
                   </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                   <Link href="/atendimentos" className="block p-6 hover:bg-white/5 transition-all text-center">
                      <span className="text-[10px] font-black uppercase text-muted-foreground border-b border-white/10">Acessar CRM de Munícipes</span>
                   </Link>
                </CardContent>
             </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
