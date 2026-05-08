
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
  Gavel
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
  const [uploadStatus, setUploadStatus] = useState<{ current: number, total: number } | null>(null);

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

  const usersQuery = useMemo(() => (db && user) ? query(collection(db, "users")) : null, [db, user]);
  const { data: allUsersRaw = [] } = useCollection(usersQuery);

  const allUsers = useMemo(() => {
    return [...allUsersRaw].sort((a: any, b: any) => (a.nome || "").localeCompare(b.nome || ""));
  }, [allUsersRaw]);

  const userEmail = user?.email?.toLowerCase().trim();
  const profileRef = useMemo(() => (userEmail && db) ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: profile } = useDoc(profileRef);

  const cabinetId = (profile as any)?.cabinetId;
  const cabinetQuery = useMemo(() => (db && cabinetId) ? doc(db, "gabinetes", cabinetId) : null, [db, cabinetId]);
  const { data: cabinet } = useDoc(cabinetQuery);

  const hasPermission = (perm: keyof UserPermissions) => {
    if (!profile && user?.email !== 'edisonunb@gmail.com') return false;
    return (profile as any)?.permissoes?.[perm] || user?.email === 'edisonunb@gmail.com';
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
    if (!aiDraft || !db || !cabinetId) return;
    setProcessing(true);
    try {
      await addDoc(collection(db, "legislativo"), {
        cabinetId,
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

  const uploadTramiteFiles = async (): Promise<Attachment[]> => {
    const attachments: Attachment[] = [];
    if (tramiteFiles.length === 0) return [];
    for (let i = 0; i < tramiteFiles.length; i++) {
      const file = tramiteFiles[i];
      setUploadStatus({ current: i + 1, total: tramiteFiles.length });
      const sanitizedName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
      const storageRef = ref(storage, `demandas/tramites/${Date.now()}_${sanitizedName}`);
      try {
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        attachments.push({
          id: Math.random().toString(36).substring(7),
          nome: file.name,
          url: url,
          tipo: file.type,
          tamanho: file.size,
          data: Timestamp.now(),
          enviadoPor: user?.uid || "anonimo"
        });
      } catch (err: any) { throw new Error(`Falha no upload: ${file.name}`); }
    }
    return attachments;
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
      toast({ title: "Erro", description: "Usuário destino não encontrado.", variant: "destructive" });
      return;
    }
    try {
      const newAttachments = await uploadTramiteFiles();
      await sendDemand(db, demand.id, user.uid, targetUser.uid || targetUser.email, obs, targetUser.perfil, newAttachments);
      toast({ title: "Sucesso", description: "Demanda tramitada com sucesso." });
      setSendModalOpen(false);
      setObs("");
      setSelectedUser("");
      setTramiteFiles([]);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message || "Falha ao tramitar demanda.", variant: "destructive" });
    } finally {
      setProcessing(false);
      setUploadStatus(null);
    }
  };

  const handleReturn = async () => {
    if (!demand || !user || !db) return;
    setProcessing(true);
    try {
      const newAttachments = await uploadTramiteFiles();
      await returnDemand(db, demand.id, user.uid, demand.criadoPor, obs || "Demanda devolvida para revisão.", newAttachments);
      toast({ title: "Sucesso", description: "Demanda devolvida." });
      setSendModalOpen(false);
      setObs("");
      setTramiteFiles([]);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message || "Falha ao devolver demanda.", variant: "destructive" });
    } finally {
      setProcessing(false);
      setUploadStatus(null);
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

  if (!demand) return <div className="p-20 text-center">Demanda não encontrada.</div>;

  const isResponsible = demand.responsavelAtual === user?.uid;
  const filteredCollaborators = allUsers.filter(u => u.email?.toLowerCase() !== user?.email?.toLowerCase());

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <Link href="/demandas" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-2 w-fit text-sm">
              <ChevronLeft size={16} /> Voltar para Lista
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{demand.titulo}</h1>
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
            <p className="text-sm text-muted-foreground font-mono">Protocolo: #{demand.id.substring(0, 8)}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary" className="gap-2"><Sparkles size={18} /> Gerar Ação Legislativa</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Assistente Legislativo IA</DialogTitle>
                  <DialogDescription>A IA redigirá um documento oficial com base nesta demanda.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-3 gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleDraftLegislative('INDICACAO')} disabled={drafting}>Indicação</Button>
                    <Button variant="outline" size="sm" onClick={() => handleDraftLegislative('REQUERIMENTO')} disabled={drafting}>Requerimento</Button>
                    <Button variant="outline" size="sm" onClick={() => handleDraftLegislative('PROJETO_LEI')} disabled={drafting}>Projeto de Lei</Button>
                  </div>
                  {drafting && <div className="text-center py-10"><Loader2 className="animate-spin mx-auto mb-2" /><p className="text-xs text-muted-foreground">A IA está redigindo o documento formal...</p></div>}
                  {aiDraft && (
                    <div className="space-y-2 animate-in fade-in">
                      <Label className="text-xs font-bold text-primary">DRAFT GERADO:</Label>
                      <Textarea value={aiDraft.content} readOnly className="h-[300px] text-xs font-mono" />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  {aiDraft && <Button onClick={handleSaveDraft} disabled={processing}>Salvar na Atividade Legislativa</Button>}
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {isResponsible && !demand.finalizada && (
              <Dialog open={sendModalOpen} onOpenChange={setSendModalOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Send size={18} /> Tramitar</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Mover Demanda</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Destinatário</Label>
                      <Select onValueChange={setSelectedUser} value={selectedUser}>
                        <SelectTrigger><SelectValue placeholder="Selecione um colaborador" /></SelectTrigger>
                        <SelectContent>
                          {filteredCollaborators.map((u: any) => (
                            <SelectItem key={u.email} value={u.uid || u.email}>{u.nome} ({u.perfil})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Observação</Label>
                      <Textarea placeholder="Instruções..." value={obs} onChange={e => setObs(e.target.value)} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={handleReturn} disabled={processing}>Devolver</Button>
                    <Button onClick={handleSend} disabled={processing || !selectedUser}>
                      {processing ? <Loader2 className="animate-spin" /> : "Enviar Despacho"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            
            {hasPermission('finalizar_demandas') && !demand.finalizada && (
              <Button variant="outline" className="text-green-500 border-green-500/20 hover:bg-green-500/10" onClick={handleFinalize} disabled={processing}>
                <CheckCircle size={18} /> Finalizar
              </Button>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Info size={20} className="text-primary" /> Descrição
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-primary" onClick={handleGenerateSummary} disabled={summarizing}>
                  {summarizing ? <Loader2 className="animate-spin h-4 w-4" /> : <Sparkles size={16} />}
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {summary && (
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl animate-in slide-in-from-top-2">
                    <p className="text-sm leading-relaxed text-primary/80 italic">"{summary}"</p>
                  </div>
                )}
                <div className="whitespace-pre-wrap text-foreground/80 leading-relaxed font-body">
                  {demand.descricao}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader><CardTitle className="text-lg font-bold flex items-center gap-2"><History size={18} className="text-primary" /> Histórico</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                {tramites.map((t: Tramite, idx: number) => (
                  <div key={t.id} className="relative flex gap-4">
                    {idx !== tramites.length - 1 && <div className="absolute left-[1.1rem] top-8 bottom-0 w-0.5 bg-muted" />}
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 z-10">
                      <FileText size={16} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-sm">{t.acao}</h4>
                        <span className="text-[10px] text-muted-foreground">{t.data?.toDate().toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{t.observacao}</p>
                      {t.anexos && t.anexos.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {t.anexos.map((a, i) => (
                            <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[9px] bg-primary/5 p-1 rounded border border-primary/10">
                              <Paperclip size={10} /> {a.nome}
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
            <Card className="border-none shadow-sm bg-primary/5">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Gavel size={18} /> Pasta Digital</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {allAttachments.map((a, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-background rounded border text-xs">
                    <span className="truncate pr-2">{a.nome}</span>
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline"><Download size={14} /></a>
                  </div>
                ))}
                {allAttachments.length === 0 && <p className="text-center text-xs text-muted-foreground">Sem documentos.</p>}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader><CardTitle className="text-lg">Info</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm"><Calendar size={14} className="text-primary" /> <b>Prazo:</b> {new Date(demand.prazo).toLocaleDateString()}</div>
                <div className="flex items-center gap-2 text-sm"><UserIcon size={14} className="text-primary" /> <b>Responsável:</b> {allUsers.find(u => u.uid === demand.responsavelAtual)?.nome || 'N/I'}</div>
                <Badge variant={demand.prioridade === "ALTA" ? "destructive" : "secondary"}>{demand.prioridade} PRIORIDADE</Badge>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
