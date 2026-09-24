
"use client";

import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection, useStorage } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useMemo, useState, useEffect, useCallback } from "react";
import { collection, query, doc, setDoc, where, updateDoc, serverTimestamp } from "firebase/firestore";
import { Demand, Leader, GlobalConfig } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Award,
  Sparkles,
  ShieldCheck,
  ImageIcon,
  UserPlus,
  Gavel
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
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
const AUDITOR_EMAIL = "alemao@gmail.com";

function DashboardHeader({ isGlobal, cabinet, globalConfig, onUploadLogo }: { isGlobal: boolean, cabinet?: any, globalConfig?: GlobalConfig, onUploadLogo?: () => void }) {
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

  const BrandIcon = () => {
    if (globalConfig?.developerLogoUrl) {
      return (
        <div className="relative w-28 h-28 rounded-full overflow-hidden cursor-pointer group" onClick={onUploadLogo}>
          <div 
            className="relative w-full h-full transition-transform"
            style={{ transform: `scale(${globalConfig.developerLogoScale || 1.2})` }}
          >
            <Image 
              src={globalConfig.developerLogoUrl} 
              alt="Dev Signature" 
              fill 
              sizes="112px"
              className="object-cover" 
            />
          </div>
          {isGlobal && (
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Sparkles size={16} className="text-white" />
            </div>
          )}
        </div>
      );
    }
    return (
      <div className="w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center text-primary glow-primary cursor-pointer" onClick={onUploadLogo}>
        <ShieldCheck size={40} />
      </div>
    );
  };

  return (
    <header className="mb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <BrandIcon />
          <div className="flex-1">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tighter uppercase leading-tight text-white">
              Dashboard <span className="text-primary">{isGlobal ? "Global" : "Estratégico"}</span>
            </h1>
            <div className="flex flex-wrap items-center gap-4 mt-4">
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
        </div>
        <div className="grid grid-cols-1 sm:flex gap-4">
          <Link href="/atendimentos/new" className="w-full">
            <Button variant="outline" className="w-full font-black text-[11px] uppercase h-12 px-8 tracking-widest border-white/10 bg-white/5 hover:bg-white/10 text-white">
              Novo Atendimento
            </Button>
          </Link>
          <Link href="/demandas/new" className="w-full">
            <Button className="w-full font-black text-[11px] uppercase h-12 px-8 tracking-widest shadow-lg shadow-primary/20 bg-primary text-black hover:opacity-90 glow-primary">
              Nova Demanda
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
  const storage = useStorage();
  const router = useRouter();
  const { toast } = useToast();

  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [newMetaValue, setNewMetaValue] = useState("");
  
  const [isDevBrandingOpen, setIsDevBrandingOpen] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoProgress, setLogoProgress] = useState(0);

  const userEmail = useMemo(() => user?.email?.toLowerCase().trim() || null, [user?.email]);
  const isSuperAdmin = useMemo(() => userEmail === MASTER_EMAIL, [userEmail]);
  const isAuditor = useMemo(() => userEmail === AUDITOR_EMAIL, [userEmail]);
  const hasGlobalView = isSuperAdmin || isAuditor;
  
  const profileRef = useMemoFirebase(() => (userEmail && db) ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: profile, loading: loadingProfile } = useDoc(profileRef);

  const cabinetId = (profile as any)?.cabinetId;
  const cabinetRef = useMemoFirebase(() => (cabinetId && db) ? doc(db, "gabinetes", cabinetId) : null, [db, cabinetId]);
  const { data: cabinet } = useDoc(cabinetRef);

  const globalConfigRef = useMemoFirebase(() => (db) ? doc(db, "config", "global") : null, [db]);
  const { data: globalConfig } = useDoc<GlobalConfig>(globalConfigRef);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const demandsQuery = useMemoFirebase(() => {
    if (!db || (!cabinetId && !hasGlobalView)) return null;
    return hasGlobalView 
      ? query(collection(db, "demandas"), where("deleted", "==", false))
      : query(collection(db, "demandas"), where("cabinetId", "==", cabinetId), where("deleted", "==", false));
  }, [db, cabinetId, hasGlobalView]);
  const { data: allDemands = [] } = useCollection(demandsQuery);

  const leadersQuery = useMemoFirebase(() => {
    if (!db || (!cabinetId && !hasGlobalView)) return null;
    return hasGlobalView
      ? query(collection(db, "liderancas"))
      : query(collection(db, "liderancas"), where("cabinetId", "==", cabinetId));
  }, [db, cabinetId, hasGlobalView]);
  const { data: allLeaders = [] } = useCollection(leadersQuery);

  const legislativeQuery = useMemoFirebase(() => {
    if (!db || (!cabinetId && !hasGlobalView)) return null;
    return hasGlobalView
      ? query(collection(db, "legislativo"))
      : query(collection(db, "legislativo"), where("cabinetId", "==", cabinetId));
  }, [db, cabinetId, hasGlobalView]);
  const { data: allLegislative = [] } = useCollection(legislativeQuery);

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
      demandasAtivas: allDemands.filter((d: Demand) => d.status !== "FINALIZADO").length,
      legislativoAtivo: allLegislative.length,
      progressoMeta: Math.min(progresso, 100),
      metaGeral
    };
  }, [allDemands, allLeaders, allLegislative, config]);

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

  const handleUploadDevLogo = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && storage && isSuperAdmin) {
      const file = e.target.files[0];
      setUploadingLogo(true);
      
      const storageRef = ref(storage, `developer/branding_signature`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          setLogoProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        },
        (error) => {
          toast({ title: "Erro no Branding", description: error.message, variant: "destructive" });
          setUploadingLogo(false);
        },
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          if (db) {
            await setDoc(doc(db, "config", "global"), {
              developerLogoUrl: downloadUrl,
              updatedAt: serverTimestamp()
            }, { merge: true });
            
            toast({ 
              title: "Logomarca Atualizada", 
              description: "Sua identidade visual foi salva com sucesso.",
              className: "bg-primary text-black font-black"
            });
          }
          setUploadingLogo(false);
          setLogoProgress(0);
          setIsDevBrandingOpen(false);
        }
      );
    }
  }, [storage, db, isSuperAdmin, toast]);

  if (authLoading || (loadingProfile && !hasGlobalView)) {
    return <div className="flex items-center justify-center min-h-screen bg-black"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto px-4 py-6 sm:py-10">
        <DashboardHeader 
          isGlobal={hasGlobalView} 
          cabinet={cabinet} 
          globalConfig={globalConfig} 
          onUploadLogo={isSuperAdmin ? () => setIsDevBrandingOpen(true) : undefined}
        />

        {isSuperAdmin && (
          <Dialog open={isDevBrandingOpen} onOpenChange={setIsDevBrandingOpen}>
            <DialogContent className="bg-black border-white/10 w-[95vw] sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="uppercase text-sm font-black tracking-widest text-primary flex items-center gap-2">
                  <Sparkles size={16} /> Identidade do Desenvolvedor
                </DialogTitle>
                <DialogDescription className="text-[10px] uppercase font-bold text-muted-foreground mt-2">
                  Sua logomarca aparecerá em todos os sistemas como sua marca registrada.
                </DialogDescription>
              </DialogHeader>
              <div className="py-8 space-y-6">
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-full w-40 h-40 mx-auto bg-white/5 relative group hover:border-primary/40 transition-all cursor-pointer">
                  {globalConfig?.developerLogoUrl ? (
                    <Image 
                      src={globalConfig.developerLogoUrl} 
                      alt="Dev Logo" 
                      fill 
                      sizes="160px"
                      className="object-cover rounded-full" 
                    />
                  ) : (
                    <ImageIcon size={32} className="text-muted-foreground" />
                  )}
                  <input type="file" accept="image/*" onChange={handleUploadDevLogo} className="absolute inset-0 opacity-0 cursor-pointer" disabled={uploadingLogo} />
                </div>
                {uploadingLogo && (
                  <div className="space-y-2">
                    <Progress value={logoProgress} className="h-1 bg-white/5" />
                    <p className="text-[9px] font-black uppercase text-primary text-center">Registrando Marca... {Math.round(logoProgress)}%</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* INDICADORES PREMIUM (Inspirado em GabGestão) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="bg-white/5 border-white/5 shadow-2xl overflow-hidden relative group hover:border-primary/40 transition-all">
             <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            <CardContent className="pt-8">
              <div className="flex justify-between items-start mb-4">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Potencial Eleitoral</p>
                <TrendingUp size={16} className="text-primary" />
              </div>
              <h3 className="text-5xl font-black tabular-nums text-white">{stats.votosMapeados.toLocaleString()}</h3>
              <div className="mt-6 space-y-3">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-muted-foreground">Progresso Meta 2026</span>
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
                  <p className="text-[10px] font-black uppercase text-muted-foreground mb-2 tracking-[0.2em]">Lideranças Ativas</p>
                  <h3 className="text-5xl font-black tabular-nums text-white">{stats.totalLideres}</h3>
                </div>
                <div className="p-3 bg-secondary/20 rounded-xl text-secondary border border-secondary/30"><Users size={24} /></div>
              </div>
              <Link href="/liderancas" className="mt-6 text-[9px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                Gerenciar Mapa <ChevronRight size={12} />
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/5 shadow-2xl group hover:border-primary/30 transition-all">
            <CardContent className="pt-8">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase text-muted-foreground mb-2 tracking-[0.2em]">Fluxo de Demandas</p>
                  <h3 className="text-5xl font-black tabular-nums text-white">{stats.demandasAtivas}</h3>
                </div>
                <div className="p-3 bg-primary/10 rounded-xl text-primary border border-primary/20"><ClipboardList size={24} /></div>
              </div>
              <Link href="/demandas" className="mt-6 text-[9px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                Ver Protocolos <ChevronRight size={12} />
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/5 shadow-2xl relative overflow-hidden group hover:border-primary/30 transition-all">
            <CardContent className="pt-8">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase text-muted-foreground mb-2 tracking-[0.2em]">Atividade Legislativa</p>
                  <h3 className="text-5xl font-black tabular-nums text-white">{stats.legislativoAtivo}</h3>
                </div>
                <div className="p-3 bg-yellow-500/10 rounded-xl text-yellow-500 border border-yellow-500/20"><Gavel size={24} /></div>
              </div>
              <Link href="/legislativo" className="mt-6 text-[9px] font-black text-yellow-500 uppercase tracking-[0.2em] flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                Acompanhar Projetos <ChevronRight size={12} />
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* ESTRUTURA HÍBRIDA (Mapeamento + Memória) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <section className="lg:col-span-2 space-y-8">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-[11px] font-black uppercase tracking-[0.4em] flex items-center gap-3 text-primary">
                <MapPin size={16} /> Mapeamento Territorial Estratégico
              </h2>
              <Link href="/liderancas" className="text-[10px] font-black text-muted-foreground uppercase hover:text-primary transition-all tracking-widest border-b border-transparent hover:border-primary">Ver Tudo</Link>
            </div>
            <div className="space-y-4">
              {allLeaders.length === 0 ? (
                <div className="text-center py-24 border border-dashed border-white/10 rounded-2xl bg-white/5">
                  <p className="text-[11px] text-muted-foreground font-black uppercase tracking-[0.3em]">Sem registros territoriais</p>
                </div>
              ) : 
                allLeaders.slice(0, 6).map((l: Leader) => (
                  <Link key={l.id} href="/liderancas">
                    <Card className="bg-white/5 hover:bg-white/10 transition-all border-white/5 hover:border-primary/20 group cursor-pointer active:scale-[0.99] shadow-xl relative overflow-hidden">
                      <div className={cn(
                        "absolute top-0 left-0 w-1 h-full",
                        l.influencia === 'ALTA' ? "bg-red-500" : "bg-primary/50"
                      )} />
                      <CardContent className="p-5 flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center font-black text-lg text-primary border border-white/5 uppercase shadow-inner">
                            {l.nome[0]}
                          </div>
                          <div>
                            <h4 className="font-black text-base uppercase tracking-tight group-hover:text-primary transition-colors text-white">{l.nome}</h4>
                            <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-black uppercase mt-1.5 tracking-widest">
                              <span className="flex items-center gap-1.5"><MapPin size={12} className="text-primary/50" /> {l.bairro}</span>
                              <span className="text-white/10">|</span>
                              <span className="text-primary font-bold">{l.potencialVotos} Potencial</span>
                              <Badge variant="outline" className="text-[8px] border-primary/20 text-primary py-0 h-4">{l.influencia}</Badge>
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
                  <Target size={16} /> Metas e Objetivos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-8">
                <div className="p-5 bg-black/40 rounded-2xl border border-white/5 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Meta de Votos</span>
                    <button 
                      onClick={() => setIsEditingMeta(true)}
                      className="text-[9px] font-black text-primary uppercase border-b border-primary/20 hover:border-primary transition-all"
                    >
                      Ajustar
                    </button>
                  </div>
                  <h4 className="text-3xl font-black text-white">{(stats.metaGeral / 1000).toFixed(0)}K <span className="text-xs text-muted-foreground font-bold">VOTOS</span></h4>
                  <Progress value={stats.progressoMeta} className="h-1.5 bg-white/5" />
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] px-1">Atalhos de Gestão</h3>
                  <Link href="/atendimentos" className="block group">
                    <div className="flex justify-between items-center p-5 bg-white/5 rounded-2xl border border-white/5 transition-all group-hover:bg-primary/10 group-hover:border-primary/20">
                      <div className="flex items-center gap-3">
                        <Users size={16} className="text-primary" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Base de Munícipes</span>
                      </div>
                      <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                  
                  <Link href="/usuarios" className="block group">
                    <div className="flex justify-between items-center p-5 bg-white/5 rounded-2xl border border-white/5 transition-all group-hover:bg-secondary/10 group-hover:border-secondary/20">
                      <div className="flex items-center gap-3">
                        <Award size={16} className="text-secondary" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Equipe e Poderes</span>
                      </div>
                      <ChevronRight size={16} className="text-muted-foreground group-hover:text-secondary group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <div className="p-8 bg-primary/10 rounded-3xl border border-primary/20 flex flex-col items-center text-center gap-4">
               <div className="p-4 bg-primary text-black rounded-2xl glow-primary">
                  <Sparkles size={24} />
               </div>
               <h4 className="text-sm font-black uppercase text-primary tracking-widest leading-tight">Inteligência Legislativa Ativada</h4>
               <p className="text-[10px] text-primary/70 font-bold uppercase leading-relaxed">Use o botão de trâmite nas demandas para redigir projetos automaticamente.</p>
            </div>
          </aside>
        </div>
      </main>

      {/* MODAL DE AJUSTE DE META (Inspirado em GabGestão) */}
      <Dialog open={isEditingMeta} onOpenChange={setIsEditingMeta}>
        <DialogContent className="bg-black border-white/10 w-[95vw] sm:max-w-md text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="uppercase text-sm font-black tracking-widest text-primary flex items-center gap-2">
              <Target size={16} /> Objetivo Estratégico 2026
            </DialogTitle>
            <DialogDescription className="text-[10px] uppercase font-bold text-muted-foreground mt-2">
              Defina a meta de votos mapeados para este gabinete.
            </DialogDescription>
          </DialogHeader>
          <div className="py-10 space-y-6">
            <div className="space-y-3">
              <Label className="text-[11px] uppercase font-black tracking-widest text-muted-foreground ml-1">Quantidade de Votos</Label>
              <Input 
                type="number" 
                className="h-16 border-white/10 bg-white/5 font-black text-4xl text-white text-center tracking-tighter" 
                value={newMetaValue} 
                onChange={e => setNewMetaValue(e.target.value)} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full h-14 font-black uppercase text-xs tracking-widest bg-primary text-black glow-primary" onClick={handleUpdateMeta}>
              Salvar Novo Objetivo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
