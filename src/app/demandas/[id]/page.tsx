"use client";

import { useAuth } from "@/components/auth-context";
import { Navbar } from "@/components/layout/Navbar";
import { useEffect, useState, use } from "react";
import { doc, onSnapshot, collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Demand, Tramite, UserProfile } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  Send, 
  RotateCcw, 
  CheckCircle, 
  History, 
  Info,
  Calendar,
  User as UserIcon,
  Sparkles,
  MessageSquare
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  sendDemand, 
  returnDemand, 
  finalizeDemand, 
  reopenDemand 
} from "@/lib/demand-service";
import { generateDemandSummary } from "@/ai/flows/demand-summary-generation";

export default function DemandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, profile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [demand, setDemand] = useState<Demand | null>(null);
  const [tramites, setTramites] = useState<Tramite[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  // Modal states
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [obs, setObs] = useState("");
  const [selectedUser, setSelectedUser] = useState("");

  useEffect(() => {
    if (!id) return;

    const unsubscribeDemand = onSnapshot(doc(db, "demandas", id), (snap) => {
      if (snap.exists()) {
        setDemand({ id: snap.id, ...snap.data() } as Demand);
      } else {
        router.push("/demandas");
      }
      setLoading(false);
    });

    const qTramites = query(
      collection(db, "tramites"), 
      where("demandaId", "==", id), 
      orderBy("data", "desc")
    );
    const unsubscribeTramites = onSnapshot(qTramites, (snap) => {
      setTramites(snap.docs.map(d => ({ id: d.id, ...d.data() } as Tramite)));
    });

    const fetchUsers = async () => {
      const uSnap = await getDocs(collection(db, "users"));
      setUsers(uSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
    };
    fetchUsers();

    return () => {
      unsubscribeDemand();
      unsubscribeTramites();
    };
  }, [id, router]);

  const handleGenerateSummary = async () => {
    if (!demand?.descricao) return;
    setSummarizing(true);
    try {
      const result = await generateDemandSummary({ description: demand.descricao });
      setSummary(result.summary);
    } catch (e) {
      toast({ title: "Erro", description: "Falha ao gerar resumo.", variant: "destructive" });
    } finally {
      setSummarizing(false);
    }
  };

  const handleSend = async () => {
    if (!demand || !user || !selectedUser) return;
    const targetUser = users.find(u => u.uid === selectedUser);
    if (!targetUser) return;

    try {
      await sendDemand(demand.id, user.uid, selectedUser, obs, targetUser.perfil);
      toast({ title: "Sucesso", description: "Demanda enviada." });
      setSendModalOpen(false);
      setObs("");
    } catch (e) {
      toast({ title: "Erro", description: "Falha ao enviar.", variant: "destructive" });
    }
  };

  const handleReturn = async () => {
    if (!demand || !user || !selectedUser) return;
    try {
      await returnDemand(demand.id, user.uid, selectedUser, obs);
      toast({ title: "Sucesso", description: "Demanda devolvida." });
      setSendModalOpen(false);
      setObs("");
    } catch (e) {
      toast({ title: "Erro", description: "Falha ao devolver.", variant: "destructive" });
    }
  };

  const handleFinalize = async () => {
    if (!demand || !user) return;
    try {
      await finalizeDemand(demand.id, user.uid, demand.criadoPor, obs || "Demanda finalizada pelo ADMIN.");
      toast({ title: "Sucesso", description: "Demanda finalizada." });
      setObs("");
    } catch (e) {
      toast({ title: "Erro", description: "Falha ao finalizar.", variant: "destructive" });
    }
  };

  const handleReopen = async () => {
    if (!demand || !user) return;
    try {
      await reopenDemand(demand.id, user.uid, demand.responsavelAtual, obs || "Demanda reaberta pelo ADMIN.");
      toast({ title: "Sucesso", description: "Demanda reaberta." });
      setObs("");
    } catch (e) {
      toast({ title: "Erro", description: "Falha ao reabrir.", variant: "destructive" });
    }
  };

  if (loading) return null;
  if (!demand) return <div className="p-8 text-center">Demanda não encontrada.</div>;

  const isResponsible = demand.responsavelAtual === user?.uid;
  const isAdmin = profile?.perfil === "ADMIN";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <Link href="/demandas" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-2 w-fit">
              <ChevronLeft size={16} />
              Lista de Demandas
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-headline font-bold">{demand.titulo}</h1>
              <Badge className={cn(
                "uppercase text-[10px]",
                demand.status === "ABERTO" && "bg-blue-500",
                demand.status === "EM_ANDAMENTO" && "bg-purple-500",
                demand.status === "AGUARDANDO_VEREADORA" && "bg-orange-500",
                demand.status === "FINALIZADO" && "bg-green-500"
              )}>
                {demand.status.replace("_", " ")}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground font-mono">Protocolo: #{demand.id}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {isResponsible && !demand.finalizada && (
              <>
                <Dialog open={sendModalOpen} onOpenChange={setSendModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2"><Send size={18} /> Tramitar</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Enviar ou Devolver Demanda</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Destinatário</Label>
                        <Select onValueChange={setSelectedUser}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um assessor ou admin" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.map(u => (
                              <SelectItem key={u.uid} value={u.uid}>{u.nome} ({u.perfil})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Observação</Label>
                        <Textarea 
                          placeholder="Motivo do envio ou devolução..." 
                          value={obs} 
                          onChange={e => setObs(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter className="gap-2">
                      <Button variant="outline" onClick={() => handleReturn()} className="gap-2"><RotateCcw size={16} /> Devolver</Button>
                      <Button onClick={() => handleSend()} className="gap-2"><Send size={16} /> Enviar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {isAdmin && (
                  <Button variant="outline" className="text-green-600 hover:text-green-700 hover:bg-green-50 gap-2" onClick={handleFinalize}>
                    <CheckCircle size={18} /> Finalizar
                  </Button>
                )}
              </>
            )}

            {isAdmin && demand.finalizada && (
              <Button variant="outline" className="gap-2" onClick={handleReopen}>
                <RotateCcw size={18} /> Reabrir Demanda
              </Button>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-headline font-bold flex items-center gap-2">
                  <Info size={20} className="text-primary" />
                  Descrição
                </CardTitle>
                <Button variant="outline" size="sm" className="gap-2 text-primary" onClick={handleGenerateSummary} disabled={summarizing}>
                  <Sparkles size={16} />
                  {summarizing ? "Gerando..." : "Resumir com IA"}
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {summary && (
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl relative group">
                    <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] text-primary font-bold uppercase tracking-wider">
                      <Sparkles size={12} /> Resumo IA
                    </div>
                    <p className="text-sm leading-relaxed text-primary/80 italic">"{summary}"</p>
                  </div>
                )}
                <div className="prose prose-slate max-w-none whitespace-pre-wrap text-foreground leading-relaxed">
                  {demand.descricao}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-headline font-bold flex items-center gap-2">
                  <History size={20} className="text-primary" />
                  Histórico de Trâmites
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {tramites.map((t, idx) => {
                    const deUser = users.find(u => u.uid === t.de)?.nome || "Sistema";
                    const paraUser = users.find(u => u.uid === t.para)?.nome || "Sistema";
                    
                    return (
                      <div key={t.id} className="relative flex gap-4">
                        {idx !== tramites.length - 1 && (
                          <div className="absolute left-[1.1rem] top-8 bottom-0 w-0.5 bg-muted" />
                        )}
                        <div className={cn(
                          "w-9 h-9 rounded-full flex items-center justify-center shrink-0 z-10",
                          t.acao === "ENVIO" && "bg-blue-100 text-blue-600",
                          t.acao === "DEVOLUCAO" && "bg-orange-100 text-orange-600",
                          t.acao === "FINALIZACAO" && "bg-green-100 text-green-600",
                          t.acao === "REABERTURA" && "bg-purple-100 text-purple-600"
                        )}>
                          {t.acao === "ENVIO" && <Send size={16} />}
                          {t.acao === "DEVOLUCAO" && <RotateCcw size={16} />}
                          {t.acao === "FINALIZACAO" && <CheckCircle size={16} />}
                          {t.acao === "REABERTURA" && <RotateCcw size={16} />}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                            <h4 className="font-bold text-sm">
                              {t.acao.replace("_", " ")} - <span className="text-muted-foreground font-normal">de {deUser} para {paraUser}</span>
                            </h4>
                            <span className="text-[10px] text-muted-foreground">{t.data?.toDate().toLocaleString()}</span>
                          </div>
                          {t.observacao && (
                            <div className="p-3 bg-muted/50 rounded-lg text-sm border-l-2 border-primary/20">
                              {t.observacao}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Informações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg text-primary"><Calendar size={18} /></div>
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground font-bold">Prazo</p>
                      <p className="font-semibold">{new Date(demand.prazo).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg text-primary"><UserIcon size={18} /></div>
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground font-bold">Responsável Atual</p>
                      <p className="font-semibold">
                        {users.find(u => u.uid === demand.responsavelAtual)?.nome || "Desconhecido"}
                        {isResponsible && " (Você)"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg text-primary"><MessageSquare size={18} /></div>
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground font-bold">Prioridade</p>
                      <Badge variant={demand.prioridade === "ALTA" ? "destructive" : demand.prioridade === "MEDIA" ? "secondary" : "outline"} className="mt-1 uppercase">
                        {demand.prioridade}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-primary text-primary-foreground pb-4">
                <CardTitle className="text-sm uppercase tracking-wider font-bold opacity-80">Criado Por</CardTitle>
                <div className="flex items-center gap-3 pt-2">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">
                    {users.find(u => u.uid === demand.criadoPor)?.nome[0]}
                  </div>
                  <div>
                    <p className="font-semibold">{users.find(u => u.uid === demand.criadoPor)?.nome}</p>
                    <p className="text-[10px] opacity-80">{demand.dataCriacao?.toDate().toLocaleDateString()}</p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}