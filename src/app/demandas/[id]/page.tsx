
"use client";

import { useUser, useFirestore, useDoc, useCollection, useStorage } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useEffect, useState, useMemo, use } from "react";
import { doc, collection, query, where, Timestamp, addDoc } from "firebase/firestore";
import { Tramite, Attachment, UserPermissions } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  MessageSquare,
  Loader2,
  FileText,
  Download,
  ExternalLink,
  Paperclip,
  X,
  Gavel,
  Lock
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  sendDemand, 
  returnDemand, 
  finalizeDemand, 
  reopenDemand 
} from "@/lib/demand-service";
import { generateDemandSummary } from "@/ai/flows/demand-summary-generation";
import { draftLegislativeAction } from "@/ai/flows/legislative-draft-flow";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const MASTER_EMAIL = "edisonunb@gmail.com";

export default function DemandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useUser();
  const db = useFirestore();
  const storage = useStorage();
  const router = useRouter();
  const { toast } = useToast();
  
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [aiDraft, setAiDraft] = useState<{ title: string, content: string } | null>(null);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [obs, setObs] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [tramiteFiles, setTramiteFiles] = useState<File[]>([]);

  const userEmail = user?.email?.toLowerCase().trim();
  const isMasterAdmin = userEmail === MASTER_EMAIL;

  const demandRef = useMemo(() => (id && db) ? doc(db, "demandas", id) : null, [db, id]);
  const { data: demand, loading: loadingDemand } = useDoc(demandRef);

  const tramitesQuery = useMemo(() => (id && db && user) ? query(
    collection(db, "tramites"), 
    where("demandaId", "==", id)
  ) : null, [db, id, user]);
  
  const { data: tramitesRaw = [] } = useCollection(tramitesQuery);

  const tramites = useMemo(() => {
    return [...tramitesRaw].sort((a: any, b: any) => {
      const dateA = a.data?.toMillis() || 0;
      const dateB = b.data?.toMillis() || 0;
      return dateB - dateA;
    });
  }, [tramitesRaw]);

  const profileRef = useMemo(() => (userEmail && db) ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: profile } = useDoc(profileRef);

  const cabinetId = (profile as any)?.cabinetId;

  // VERIFICAÇÃO DE ISOLAMENTO DE SEGURANÇA (SÊNIOR)
  const isAccessDenied = useMemo(() => {
    if (loadingDemand || !demand || isMasterAdmin) return false;
    if (!cabinetId) return true; // Se não tem gabinete e não é master, nega.
    return (demand as any).cabinetId !== cabinetId;
  }, [demand, cabinetId, isMasterAdmin, loadingDemand]);

  const usersQuery = useMemo(() => {
    if (!db || !user) return null;
    const targetCabinetId = cabinetId || (demand as any)?.cabinetId;
    if (!targetCabinetId) return null;
    
    return query(
      collection(db, "users"), 
      where("cabinetId", "==", targetCabinetId),
      where("deleted", "==", false)
    );
  }, [db, user, cabinetId, demand]);

  const { data: allUsersRaw = [] } = useCollection(usersQuery);

  const allUsers = useMemo(() => {
    return [...allUsersRaw].sort((a: any, b: any) => (a.nome || "").localeCompare(b.nome || ""));
  }, [allUsersRaw]);

  const cabinetQuery = useMemo(() => (db && (cabinetId || (demand as any)?.cabinetId)) ? doc(db, "gabinetes", cabinetId || (demand as any)?.cabinetId) : null, [db, cabinetId, demand]);
  const { data: cabinet } = useDoc(cabinetQuery);

  const hasPermission = (perm: keyof UserPermissions) => {
    if (isMasterAdmin) return true;
    if (!profile) return false;
    return (profile as any)?.permissoes?.[perm];
  };

  const allAttachments = useMemo(() => {
    if (!demand) return [];
    const fromDemand = demand.anexos || [];
    const fromTramites = tramites.flatMap(t => t.anexos || []);
    const combined = [...fromDemand, ...fromTramites];
    return Array.from(new Map(combined.map(item => [item.url, item])).values());
  }, [demand, tramites]);

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

  const handleDraftLegislative = async (type: 'INDICACAO' | 'PROJETO_LEI' | 'REQUERIMENTO') => {
    if (!demand || !cabinet) return;
    setDrafting(true);
    try {
      const result = await draftLegislativeAction({
        demandTitle: demand.titulo,
        demandDescription: demand.descricao,
        type,
        vereadorName: (cabinet as any)?.vereador || "Vereador"
      });
      setAiDraft({ title: result.title, content: `${result.content}\n\n**JUSTIFICATIVA:**\n${result.justification}` });
    } catch (e) {
      toast({ title: "Erro na IA", description: "Falha ao redigir documento.", variant: "destructive" });
    } finally {
      setDrafting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!aiDraft || !db || (!cabinetId && !isMasterAdmin)) return;
    setProcessing(true);
    try {
      await addDoc(collection(db, "legislativo"), {
        cabinetId: cabinetId || (demand as any).cabinetId,
        tipo: "INDICACAO",
        titulo: aiDraft.title,
        ementa: aiDraft.content.substring(0, 200) + "...",
        conteudo: aiDraft.content,
        status: "ELABORACAO",
        ano: new Date().getFullYear(),
        demandaOrigemId: demand?.id,
        dataCriacao: Timestamp.now()
      });
      toast({ title: "Sucesso", description: "Documento salvo na Atividade Legislativa." });
      setAiDraft(null);
    } catch (e) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleSend = async () => {
    if (!demand || !user || !selectedUser || !db) {
      toast({ title: "Atenção", description: "Selecione um destinatário.", variant: "destructive" });
      return;
    }
    setProcessing(true);
    const targetUser = allUsers.find((u: any) => u.uid === selectedUser || u.email === selectedUser);
    if (!targetUser) {
      setProcessing(false);
      toast({ title: "Erro", description: "Usuário destino não encontrado neste gabinete.", variant: "destructive" });
      return;
    }
    try {
      await sendDemand(db, demand.id, user.uid, targetUser.uid || targetUser.email, obs, targetUser.perfil, []);
      toast({ title: "Sucesso", description: "Demanda tramitada com sucesso." });
      setSendModalOpen(false);
      setObs("");
      setSelectedUser("");
    } catch (e: any) {
      toast({ title: "Erro", description: e.message || "Falha ao tramitar demanda.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleReturn = async () => {
    if (!demand || !user || !db) return;
    setProcessing(true);
    try {
      await returnDemand(db, demand.id, user.uid, demand.criadoPor, obs || "Demanda devolvida para revisão.", []);
      toast({ title: "Sucesso", description: "Demanda devolvida." });
      setSendModalOpen(false);
      setObs("");
    } catch (e: any) {
      toast({ title: "Erro", description: e.message || "Falha ao devolver demanda.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleFinalize = async () => {
    if (!demand || !user || !db) return;
    setProcessing(true);
    try {
      await finalizeDemand(db, demand.id, user.uid, demand.criadoPor, obs || "Demanda finalizada com sucesso.");
      toast({ title: "Sucesso", description: "Demanda finalizada." });
      setObs("");
    } catch (e) {
      toast({ title: "Erro", description: "Falha ao finalizar.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  if (loadingDemand) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
      </div>
    );
  }

  if (isAccessDenied) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 bg-destructive/10 rounded-full mb-4 text-destructive">
          <Lock size={48} />
        </div>
        <h1 className="text-xl font-black uppercase tracking-tighter mb-2">Acesso Negado</h1>
        <p className="text-muted-foreground text-xs uppercase tracking-widest mb-6">Esta demanda pertence a outro gabinete isolado.</p>
        <Button onClick={() => router.push("/demandas")} className="font-black uppercase text-[10px] tracking-widest">Voltar ao meu Gabinete</Button>
      </div>
    );
  }

  if (!demand) return <div className="p-20 text-center font-black uppercase tracking-widest text-muted-foreground">Demanda não encontrada.</div>;

  const isResponsible = demand.responsavelAtual === user?.uid;
  const filteredCollaborators = allUsers.filter(u => u.email?.toLowerCase() !== user?.email?.toLowerCase());

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6 sm:py-8">
        <header className="mb-8 flex flex-col gap-4">
          <Link href="/demandas" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors w-fit text-[10px] font-black uppercase tracking-widest">
            <ChevronLeft size={16} /> Voltar para Lista
          </Link>
          
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-black uppercase leading-tight tracking-tighter">{demand.titulo}</h1>
                <Badge className={cn(
                  "uppercase text-[9px] font-black tracking-widest px-3 py-1",
                  demand.status === "ABERTO" && "bg-blue-600",
                  demand.status === "EM_ANDAMENTO" && "bg-purple-600",
                  demand.status === "AGUARDANDO_VEREADORA" && "bg-orange-600",
                  demand.status === "FINALIZADO" && "bg-green-600"
                )}>
                  {demand.status.replace("_", " ")}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest bg-slate-900/50 w-fit px-2 py-1 rounded">Protocolo: #{demand.id.substring(0, 8)}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="secondary" className="gap-2 font-black uppercase text-[10px] tracking-widest h-12 sm:h-10 w-full sm:w-auto"><Sparkles size={16} /> Redigir IA</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl w-[95vw]">
                  <DialogHeader>
                    <DialogTitle className="font-black uppercase tracking-widest">Assistente Legislativo IA</DialogTitle>
                    <DialogDescription className="text-xs uppercase tracking-widest">A IA redigirá um documento oficial com base nesta demanda.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Button variant="outline" size="sm" className="font-black uppercase text-[10px]" onClick={() => handleDraftLegislative('INDICACAO')} disabled={drafting}>Indicação</Button>
                      <Button variant="outline" size="sm" className="font-black uppercase text-[10px]" onClick={() => handleDraftLegislative('REQUERIMENTO')} disabled={drafting}>Requerimento</Button>
                      <Button variant="outline" size="sm" className="font-black uppercase text-[10px]" onClick={() => handleDraftLegislative('PROJETO_LEI')} disabled={drafting}>Projeto de Lei</Button>
                    </div>
                    {drafting && <div className="text-center py-10"><Loader2 className="animate-spin mx-auto mb-2 text-primary" /><p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">A IA está redigindo o documento formal...</p></div>}
                    {aiDraft && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <Label className="text-[10px] font-black text-primary uppercase tracking-widest">DRAFT GERADO:</Label>
                        <Textarea value={aiDraft.content} readOnly className="h-[250px] sm:h-[300px] text-xs font-mono bg-slate-900 border-slate-800" />
                      </div>
                    )}
                  </div>
                  <DialogFooter className="flex flex-col sm:flex-row gap-2">
                    {aiDraft && <Button className="font-black uppercase text-[10px] tracking-widest w-full" onClick={handleSaveDraft} disabled={processing}>Salvar Atividade Legislativa</Button>}
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {isResponsible && !demand.finalizada && (
                <Dialog open={sendModalOpen} onOpenChange={setSendModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2 font-black uppercase text-[10px] tracking-widest h-12 sm:h-10 w-full sm:w-auto"><Send size={16} /> Tramitar</Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] sm:max-w-md">
                    <DialogHeader><DialogTitle className="font-black uppercase tracking-widest">Mover Demanda</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest">Destinatário</Label>
                        <Select onValueChange={setSelectedUser} value={selectedUser}>
                          <SelectTrigger className="h-12 bg-slate-900 border-slate-800"><SelectValue placeholder="Selecione um colaborador" /></SelectTrigger>
                          <SelectContent>
                            {filteredCollaborators.map((u: any) => (
                              <SelectItem key={u.email} value={u.uid || u.email}>{u.nome} ({u.perfil})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest">Observação</Label>
                        <Textarea placeholder="Instruções de despacho..." value={obs} onChange={e => setObs(e.target.value)} className="bg-slate-900 border-slate-800 min-h-[100px]" />
                      </div>
                    </div>
                    <DialogFooter className="flex flex-col sm:flex-row gap-2">
                      <Button variant="outline" className="w-full font-black uppercase text-[10px]" onClick={handleReturn} disabled={processing}>Devolver</Button>
                      <Button className="w-full font-black uppercase text-[10px]" onClick={handleSend} disabled={processing || !selectedUser}>
                        {processing ? <Loader2 className="animate-spin" /> : "Enviar Despacho"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              
              {hasPermission('finalizar_demandas') && !demand.finalizada && (
                <Button variant="outline" className="text-green-500 border-green-500/20 hover:bg-green-500/10 gap-2 font-black uppercase text-[10px] tracking-widest h-12 sm:h-10 w-full sm:w-auto" onClick={handleFinalize} disabled={processing}>
                  <CheckCircle size={16} /> Finalizar
                </Button>
              )}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-slate-900 bg-card shadow-xl overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-900/50 bg-slate-900/30">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <Info size={16} className="text-primary" /> Detalhes da Solicitação
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10 h-8 w-8 p-0" onClick={handleGenerateSummary} disabled={summarizing}>
                  {summarizing ? <Loader2 className="animate-spin h-4 w-4" /> : <Sparkles size={16} />}
                </Button>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {summary && (
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl animate-in slide-in-from-top-2">
                    <p className="text-xs sm:text-sm leading-relaxed text-primary/80 italic font-medium">"{summary}"</p>
                  </div>
                )}
                <div className="whitespace-pre-wrap text-foreground/80 text-sm sm:text-base leading-relaxed font-body">
                  {demand.descricao}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-900 bg-card shadow-xl overflow-hidden">
              <CardHeader className="bg-slate-900/30 border-b border-slate-900/50">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <History size={16} className="text-primary" /> Histórico de Trâmite
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-8 pt-8 px-6 sm:px-8">
                {tramites.map((t: Tramite, idx: number) => (
                  <div key={t.id} className="relative flex gap-6">
                    {idx !== tramites.length - 1 && <div className="absolute left-[0.9rem] top-8 bottom-0 w-px bg-slate-800" />}
                    <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 z-10 shadow-inner">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                        <h4 className="font-black text-[10px] uppercase tracking-widest text-primary">{t.acao}</h4>
                        <span className="text-[9px] font-black text-muted-foreground uppercase">{t.data?.toDate().toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 bg-slate-900/30 p-3 rounded-lg border border-slate-900/50 italic leading-relaxed">
                        {t.observacao}
                      </p>
                      {t.anexos && t.anexos.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {t.anexos.map((a, i) => (
                            <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[9px] font-black uppercase bg-slate-900 px-2 py-1.5 rounded border border-slate-800 hover:border-primary/30 transition-colors">
                              <Paperclip size={10} className="text-primary" /> {a.nome}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-slate-900 bg-card shadow-xl overflow-hidden">
              <CardHeader className="bg-slate-900/30 border-b border-slate-900/50">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Gavel size={16} className="text-primary" /> Pasta Digital</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-6">
                {allAttachments.map((a, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800 group hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 bg-slate-900 rounded-lg group-hover:bg-primary/10 transition-colors">
                        <FileText size={14} className="text-primary/70" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-tight truncate pr-2 text-muted-foreground group-hover:text-foreground transition-colors">{a.nome}</span>
                    </div>
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:bg-primary/10 p-2 rounded-lg transition-all shrink-0">
                      <Download size={16} />
                    </a>
                  </div>
                ))}
                {allAttachments.length === 0 && <p className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground py-4">Sem documentos anexados.</p>}
              </CardContent>
            </Card>

            <Card className="border-slate-900 bg-card shadow-xl overflow-hidden">
              <CardHeader className="bg-slate-900/30 border-b border-slate-900/50">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">Metadados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Prazo Limite</p>
                  <div className="flex items-center gap-2 text-sm font-black uppercase tracking-tight">
                    <Calendar size={14} className="text-primary" /> {new Date(demand.prazo).toLocaleDateString()}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Assessor Responsável</p>
                  <div className="flex items-center gap-2 text-sm font-black uppercase tracking-tight">
                    <UserIcon size={14} className="text-primary" /> {allUsers.find(u => u.uid === demand.responsavelAtual)?.nome || 'Não Atribuído'}
                  </div>
                </div>
                <div className="pt-2">
                  <Badge variant={demand.prioridade === "ALTA" ? "destructive" : "secondary"} className="text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1">
                    {demand.prioridade} PRIORIDADE
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
