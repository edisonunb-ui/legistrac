
"use client";

import { useUser, useFirestore, useDoc, useCollection, useStorage } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useEffect, useState, useMemo, use, useCallback } from "react";
import { doc, collection, query, where, Timestamp, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Tramite, Attachment, UserPermissions } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  Send, 
  CheckCircle, 
  History, 
  Info,
  Calendar,
  User as UserIcon,
  Sparkles,
  Loader2,
  FileText,
  Download,
  Paperclip,
  Gavel,
  Lock,
  X,
  CheckCircle2,
  RefreshCcw,
  MessageSquare,
  LifeBuoy
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
import { useToast } from "@/hooks/use-toast";
import { 
  sendDemand, 
  returnDemand, 
  finalizeDemand,
  reopenDemand
} from "@/lib/demand-service";
import { generateDemandSummary } from "@/ai/flows/demand-summary-generation";
import { draftLegislativeAction } from "@/ai/flows/legislative-draft-flow";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";

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
  
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

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
  const isTIUser = (profile as any)?.cabinetId === (demand as any)?.targetCabinetId;

  const isAccessDenied = useMemo(() => {
    if (loadingDemand || !demand || isMasterAdmin) return false;
    if (demand.tipo === 'HELPDESK' && isTIUser) return false;
    if (!cabinetId) return true;
    return (demand as any).cabinetId !== cabinetId;
  }, [demand, cabinetId, isMasterAdmin, loadingDemand, isTIUser]);

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

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    const newProgress = { ...uploadProgress };
    delete newProgress[files[index]?.name];
    setUploadProgress(newProgress);
  }, [files, uploadProgress]);

  const uploadFiles = async (): Promise<Attachment[]> => {
    const attachments: Attachment[] = [];
    if (files.length === 0 || !storage) return [];

    for (const file of files) {
      const sanitizedName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
      const storageRef = ref(storage, `tramites/${Date.now()}_${sanitizedName}`);
      
      const uploadTask = uploadBytesResumable(storageRef, file);

      try {
        const downloadUrl = await new Promise<string>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
            },
            (error: any) => reject(new Error(error.code)),
            async () => {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(url);
            }
          );
        });
        
        attachments.push({
          id: Math.random().toString(36).substring(7),
          nome: file.name,
          url: downloadUrl,
          tipo: file.type,
          tamanho: file.size,
          data: Timestamp.now(),
          enviadoPor: user?.uid || "anonimo"
        });
      } catch (err: any) {
        throw err;
      }
    }
    return attachments;
  };

  const handleComment = async () => {
    if (!obs || !db || !user || !demand) return;
    setProcessing(true);
    try {
      const newAttachments = await uploadFiles();
      await addDoc(collection(db, "tramites"), {
        demandaId: demand.id,
        cabinetId: cabinetId || demand.cabinetId,
        de: user.uid,
        para: demand.responsavelAtual,
        acao: "COMENTARIO",
        observacao: obs,
        data: serverTimestamp(),
        anexos: newAttachments
      });

      await updateDoc(demandRef!, {
        dataAtualizacao: serverTimestamp()
      });

      toast({ title: "Comentário enviado" });
      setObs("");
      setFiles([]);
    } catch (e) {
      toast({ title: "Erro ao comentar", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

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
    try {
      const targetUser = allUsers.find((u: any) => u.uid === selectedUser || u.email === selectedUser);
      if (!targetUser) {
        throw new Error("Usuário destino não encontrado.");
      }

      const newAttachments = await uploadFiles();
      await sendDemand(db, demand.id, user.uid, targetUser.uid || targetUser.email, obs, targetUser.perfil, newAttachments);
      
      toast({ title: "Sucesso", description: "Demanda tramitada com sucesso." });
      setSendModalOpen(false);
      setObs("");
      setSelectedUser("");
      setFiles([]);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message || "Falha ao tramitar.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleReturn = async () => {
    if (!demand || !user || !db) return;
    setProcessing(true);
    try {
      const newAttachments = await uploadFiles();
      await returnDemand(db, demand.id, user.uid, demand.criadoPor, obs || "Devolvida para revisão.", newAttachments);
      toast({ title: "Sucesso", description: "Demanda devolvida." });
      setSendModalOpen(false);
      setObs("");
      setFiles([]);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message || "Falha ao devolver.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleFinalize = async () => {
    if (!demand || !user || !db) return;
    setProcessing(true);
    try {
      await finalizeDemand(db, demand.id, user.uid, demand.criadoPor, obs || "Finalizada com sucesso.");
      toast({ title: "Sucesso", description: "Demanda finalizada." });
      setObs("");
    } catch (e) {
      toast({ title: "Erro", description: "Falha ao finalizar.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleReopen = async () => {
    if (!demand || !user || !db) return;
    setProcessing(true);
    try {
      await reopenDemand(db, demand.id, user.uid, user.uid, "Demanda reaberta para continuidade dos trabalhos.");
      toast({ title: "Demanda Reaberta", description: "O protocolo retornou para o status Em Trâmite." });
    } catch (e) {
      toast({ title: "Erro ao reabrir", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  if (loadingDemand) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  if (isAccessDenied) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="p-6 bg-primary/10 rounded-full mb-6 text-primary glow-primary"><Lock size={48} /></div>
        <h1 className="text-2xl font-black uppercase tracking-tighter mb-2 text-white">Acesso Negado</h1>
        <p className="text-muted-foreground text-[10px] uppercase tracking-widest mb-10">Esta demanda pertence a outro gabinete.</p>
        <Button onClick={() => router.push("/demandas")} className="bg-primary text-black font-black uppercase text-[11px] tracking-widest px-12 h-12 glow-primary">Voltar Agora</Button>
      </div>
    );
  }

  if (!demand) return <div className="p-20 text-center font-black uppercase text-muted-foreground bg-background min-h-screen">Protocolo não encontrado.</div>;

  const isResponsible = demand.responsavelAtual === user?.uid;
  const isVereador = (profile as any)?.perfil === "ADMIN";
  const canTramitar = isResponsible || isMasterAdmin || isVereador || isTIUser;
  const filteredCollaborators = allUsers.filter(u => u.uid !== user?.uid && u.email?.toLowerCase() !== user?.email?.toLowerCase());

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 sm:py-12">
        <header className="mb-12 flex flex-col gap-6">
          <Link href="/demandas" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-all w-fit text-[10px] font-black uppercase tracking-[0.3em]">
            <ChevronLeft size={16} /> Voltar ao Painel
          </Link>
          
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-8">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                {demand.tipo === 'HELPDESK' && <div className="p-2 bg-secondary/20 text-secondary rounded-lg"><LifeBuoy size={24} /></div>}
                <h1 className="text-3xl sm:text-4xl font-black uppercase leading-tight tracking-tighter text-white">{demand.titulo}</h1>
                <Badge className={cn(
                  "uppercase text-[10px] font-black tracking-widest px-4 py-1.5 text-black",
                  demand.status === "ABERTO" && "bg-primary glow-primary",
                  demand.status === "EM_ANDAMENTO" && "bg-secondary text-white",
                  demand.status === "AGUARDANDO_VEREADORA" && "bg-yellow-500",
                  demand.status === "FINALIZADO" && "bg-green-500"
                )}>
                  {demand.status.replace("_", " ")}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-[10px] text-primary font-black uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">Protocolo: #{demand.id.substring(0, 8)}</p>
                <Badge variant={demand.prioridade === "ALTA" ? "destructive" : "secondary"} className="text-[9px] font-black uppercase tracking-widest">
                  {demand.prioridade} PRIORIDADE
                </Badge>
                {demand.tipo === 'HELPDESK' && <Badge className="bg-secondary text-white text-[9px] font-black uppercase tracking-widest">HELP-DESK TI</Badge>}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              {demand.tipo !== 'HELPDESK' && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2 font-black uppercase text-[11px] tracking-widest h-14 sm:h-12 w-full sm:w-auto border-white/10 text-white hover:bg-white/5"><Sparkles size={16} className="text-primary" /> Redigir IA</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl w-[95vw] bg-black border-white/10 shadow-2xl">
                    <DialogHeader>
                      <DialogTitle className="font-black uppercase tracking-widest text-primary text-xl">Assistente Legislativo IA</DialogTitle>
                      <DialogDescription className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-2">Transformação inteligente de demanda em documento oficial.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-6">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Button variant="outline" size="sm" className="font-black uppercase text-[10px] h-12" onClick={() => handleDraftLegislative('INDICACAO')} disabled={drafting}>Indicação</Button>
                        <Button variant="outline" size="sm" className="font-black uppercase text-[10px] h-12" onClick={() => handleDraftLegislative('REQUERIMENTO')} disabled={drafting}>Requerimento</Button>
                        <Button variant="outline" size="sm" className="font-black uppercase text-[10px] h-12" onClick={() => handleDraftLegislative('PROJETO_LEI')} disabled={drafting}>Projeto de Lei</Button>
                      </div>
                      {drafting && <div className="text-center py-12"><Loader2 className="animate-spin mx-auto mb-4 text-primary" /><p className="text-[11px] text-muted-foreground font-black uppercase tracking-widest">Processando Inteligência...</p></div>}
                      {aiDraft && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-4">
                          <Label className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Minuta Gerada:</Label>
                          <Textarea value={aiDraft.content} readOnly className="h-[300px] text-xs font-mono bg-white/5 border-white/10 text-white/90 leading-relaxed" />
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      {aiDraft && <Button className="font-black uppercase text-[11px] tracking-widest w-full bg-primary text-black h-14 glow-primary" onClick={handleSaveDraft} disabled={processing}>Salvar na Atividade Legislativa</Button>}
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              {canTramitar && !demand.finalizada && (
                <Dialog open={sendModalOpen} onOpenChange={setSendModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2 font-black uppercase text-[11px] tracking-widest h-14 sm:h-12 w-full sm:w-auto bg-primary text-black glow-primary"><Send size={16} /> Tramitar</Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] sm:max-w-2xl bg-black border-white/10 shadow-2xl overflow-y-auto max-h-[90vh]">
                    <DialogHeader><DialogTitle className="font-black uppercase tracking-widest text-primary">Despacho de Demanda</DialogTitle></DialogHeader>
                    <div className="space-y-6 py-6">
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Destinatário</Label>
                        <Select onValueChange={setSelectedUser} value={selectedUser}>
                          <SelectTrigger className="h-14 bg-white/5 border-white/10 text-white font-bold"><SelectValue placeholder="Selecione o assessor" /></SelectTrigger>
                          <SelectContent className="bg-black border-white/10">
                            {filteredCollaborators.map((u: any) => (
                              <SelectItem key={u.uid || u.id} value={u.uid || u.id}>{u.nome} ({u.perfil})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Observações Técnicas / Relato Parcial</Label>
                        <Textarea placeholder="Descreva o que foi feito até agora e o motivo do encaminhamento..." value={obs} onChange={e => setObs(e.target.value)} className="bg-white/5 border-white/10 min-h-[120px] text-white" />
                      </div>

                      <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                            <Paperclip size={14} /> Anexar Novos Documentos
                          </Label>
                          <span className="text-[9px] text-muted-foreground font-black uppercase">{files.length} selecionado(s)</span>
                        </div>
                        <Input type="file" multiple onChange={handleFileChange} disabled={processing} className="bg-black/50 border-white/10 h-12 file:bg-primary file:text-black file:font-black file:uppercase file:text-[9px] file:px-4 file:h-full file:mr-4 file:border-none" />
                        
                        {files.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                            {files.map((file, idx) => (
                              <div key={idx} className="bg-black/60 p-3 rounded-xl border border-white/5 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-black truncate uppercase text-white/70 w-full pr-2">{file.name}</span>
                                  <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-destructive/20 hover:text-destructive" onClick={() => removeFile(idx)}><X size={14} /></Button>
                                </div>
                                {uploadProgress[file.name] !== undefined && (
                                  <Progress value={uploadProgress[file.name]} className="h-1 bg-white/5" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-white/5">
                      <Button variant="outline" className="w-full font-black uppercase text-[11px] h-14" onClick={handleReturn} disabled={processing}>Devolver Origem</Button>
                      <Button className="w-full font-black uppercase text-[11px] bg-primary text-black h-14 glow-primary" onClick={handleSend} disabled={processing || !selectedUser || !obs}>
                        {processing ? <Loader2 className="animate-spin" /> : "Confirmar Envio"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              
              {hasPermission('finalizar_demandas') && !demand.finalizada && (
                <Button variant="outline" className="text-green-500 border-green-500/20 hover:bg-green-500/10 gap-2 font-black uppercase text-[11px] tracking-widest h-14 sm:h-12 w-full sm:w-auto" onClick={handleFinalize} disabled={processing}>
                  <CheckCircle size={16} /> Finalizar
                </Button>
              )}

              {hasPermission('reabrir_demandas') && demand.finalizada && (
                <Button variant="outline" className="text-primary border-primary/20 hover:bg-primary/10 gap-2 font-black uppercase text-[11px] tracking-widest h-14 sm:h-12 w-full sm:w-auto" onClick={handleReopen} disabled={processing}>
                  <RefreshCcw size={16} /> Reabrir Demanda
                </Button>
              )}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
            <Card className="border-white/5 bg-white/5 shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 bg-white/5 px-8 py-6">
                <CardTitle className="text-[11px] font-black uppercase tracking-[0.4em] flex items-center gap-3 text-primary">
                  <Info size={16} /> Descritivo do Protocolo
                </CardTitle>
                {demand.tipo !== 'HELPDESK' && (
                  <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10 h-10 w-10 p-0" onClick={handleGenerateSummary} disabled={summarizing}>
                    {summarizing ? <Loader2 className="animate-spin h-5 w-5" /> : <Sparkles size={18} />}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-8 p-8">
                {summary && (
                  <div className="p-6 bg-primary/10 border border-primary/20 rounded-2xl animate-in slide-in-from-top-4">
                    <p className="text-sm sm:text-base leading-relaxed text-primary italic font-black">"{summary}"</p>
                  </div>
                )}
                {demand.assuntoPredefinido && (
                  <div className="p-4 bg-secondary/10 border border-secondary/20 rounded-xl mb-6">
                    <p className="text-[10px] font-black uppercase text-secondary tracking-widest mb-1">Assunto Pré-cadastrado:</p>
                    <p className="text-white font-black text-lg uppercase tracking-tight">{demand.assuntoPredefinido}</p>
                  </div>
                )}
                <div className="whitespace-pre-wrap text-white/90 text-base sm:text-lg leading-relaxed font-medium">
                  {demand.descricao}
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/5 bg-white/5 shadow-2xl overflow-hidden">
              <CardHeader className="bg-white/5 border-b border-white/5 px-8 py-6 flex flex-row items-center justify-between">
                <CardTitle className="text-[11px] font-black uppercase tracking-[0.4em] flex items-center gap-3 text-primary">
                  <History size={16} /> Histórico / Chat de Atendimento
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-10">
                {!demand.finalizada && (
                  <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><MessageSquare size={14} /> Adicionar Mensagem / Comentário</Label>
                    <Textarea 
                      placeholder="Escreva sua mensagem para o técnico ou assessor..." 
                      value={obs} 
                      onChange={e => setObs(e.target.value)} 
                      className="bg-black/50 border-white/10 text-white min-h-[100px]"
                    />
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between pt-2">
                       <div className="w-full sm:w-auto">
                          <Input type="file" multiple onChange={handleFileChange} className="bg-transparent border-none text-[10px] file:bg-white/10 file:text-white file:border-none file:rounded-lg" />
                       </div>
                       <Button onClick={handleComment} disabled={processing || !obs} className="bg-primary text-black font-black uppercase text-[10px] px-8 h-10 glow-primary w-full sm:w-auto">
                          {processing ? <Loader2 className="animate-spin" /> : "Enviar Comentário"}
                       </Button>
                    </div>
                    {files.length > 0 && (
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                          {files.map((f, i) => (
                             <div key={i} className="text-[9px] font-black uppercase bg-black/40 p-2 rounded-lg border border-white/5 flex justify-between items-center">
                                <span className="truncate pr-2">{f.name}</span>
                                <button onClick={() => removeFile(i)} className="text-destructive"><X size={12}/></button>
                             </div>
                          ))}
                       </div>
                    )}
                  </div>
                )}

                <div className="space-y-10">
                  {tramites.map((t: Tramite, idx: number) => (
                    <div key={t.id} className="relative flex gap-8">
                      {idx !== tramites.length - 1 && <div className="absolute left-[0.9rem] top-10 bottom-0 w-px bg-white/5" />}
                      <div className="w-8 h-8 rounded-xl bg-black border border-white/10 flex items-center justify-center shrink-0 z-10 shadow-2xl group">
                        <div className={cn(
                          "w-2.5 h-2.5 rounded-full glow-primary",
                          t.acao === "COMENTARIO" ? "bg-secondary" : "bg-primary"
                        )} />
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                          <h4 className={cn(
                            "font-black text-[11px] uppercase tracking-widest",
                            t.acao === "COMENTARIO" ? "text-secondary" : "text-primary"
                          )}>{t.acao}</h4>
                          <span className="text-[10px] font-black text-muted-foreground uppercase">{t.data?.toDate().toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-white/70 mt-3 bg-black/40 p-4 rounded-2xl border border-white/5 italic leading-relaxed">
                          {t.observacao}
                        </p>
                        {t.anexos && t.anexos.length > 0 && (
                          <div className="flex flex-wrap gap-3 mt-4">
                            {t.anexos.map((a, i) => (
                              <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-[10px] font-black uppercase bg-white/5 px-4 py-2 rounded-xl border border-white/10 hover:border-primary/40 transition-all text-white/80">
                                <Paperclip size={12} className="text-primary" /> {a.nome}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="border-white/5 bg-white/5 shadow-2xl overflow-hidden">
              <CardHeader className="bg-white/5 border-b border-white/5 px-6 py-5">
                <CardTitle className="text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-3 text-primary"><Gavel size={16} /> Pasta Digital</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                {allAttachments.map((a, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5 group hover:border-primary/40 transition-all">
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className="p-3 bg-white/5 rounded-xl group-hover:bg-primary/10 transition-colors shadow-inner">
                        <FileText size={16} className="text-primary" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-tight truncate pr-4 text-white group-hover:text-primary transition-colors">{a.nome}</span>
                    </div>
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:bg-primary/20 p-2.5 rounded-xl transition-all shrink-0 border border-transparent hover:border-primary/20">
                      <Download size={18} />
                    </a>
                  </div>
                ))}
                {allAttachments.length === 0 && <p className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground py-8 border border-dashed border-white/5 rounded-2xl">Sem documentos anexados.</p>}
              </CardContent>
            </Card>

            <Card className="border-white/5 bg-white/5 shadow-2xl overflow-hidden">
              <CardHeader className="bg-white/5 border-b border-white/5 px-6 py-5">
                <CardTitle className="text-[11px] font-black uppercase tracking-[0.3em] text-primary">Indicadores Estratégicos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8 p-8">
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Prazo Estimado</p>
                  <div className="flex items-center gap-3 text-lg font-black uppercase tracking-tight text-white">
                    <Calendar size={18} className="text-primary" /> {new Date(demand.prazo).toLocaleDateString()}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Agente Responsável</p>
                  <div className="flex items-center gap-3 text-lg font-black uppercase tracking-tight text-white">
                    <UserIcon size={18} className="text-primary" /> {allUsers.find(u => u.uid === demand.responsavelAtual || u.id === demand.responsavelAtual)?.nome || (demand.tipo === 'HELPDESK' ? 'Equipe TI' : 'Pendente')}
                  </div>
                </div>
                <div className="pt-4 border-t border-white/5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Nível de Prioridade</span>
                    <Badge variant={demand.prioridade === "ALTA" ? "destructive" : "secondary"} className="text-[10px] font-black uppercase tracking-widest px-4 py-1.5 shadow-lg">
                      {demand.prioridade}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
