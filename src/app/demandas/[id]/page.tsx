
"use client";

import { useUser, useFirestore, useDoc, useCollection, useStorage } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useEffect, useState, useMemo, use } from "react";
import { doc, collection, query, where, Timestamp } from "firebase/firestore";
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
  X
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

  const hasPermission = (perm: keyof UserPermissions) => {
    if (!profile && user?.email !== 'edisonunb@gmail.com') return false;
    return (profile as any)?.permissoes?.[perm] || user?.email === 'edisonunb@gmail.com';
  };

  const allAttachments = useMemo(() => {
    if (!demand) return [];
    const fromDemand = demand.anexos || [];
    const fromTramites = tramites.flatMap(t => t.anexos || []);
    const combined = [...fromDemand, ...fromTramites];
    // Remove duplicados por URL
    return Array.from(new Map(combined.map(item => [item.url, item])).values());
  }, [demand, tramites]);

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
      } catch (err: any) {
        console.error(`Erro ao subir arquivo ${file.name}:`, err);
        throw new Error(`Falha no upload: ${file.name}`);
      }
    }

    return attachments;
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

  const handleReopen = async () => {
    if (!demand || !user || !db) return;
    setProcessing(true);
    try {
      await reopenDemand(db, demand.id, user.uid, demand.responsavelAtual, obs || "Demanda reaberta.");
      toast({ title: "Sucesso", description: "Demanda reaberta." });
      setObs("");
    } catch (e) {
      toast({ title: "Erro", description: "Falha ao reabrir.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  if (loadingDemand) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-10 w-10 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando informações do processo...</p>
        </div>
      </div>
    );
  }

  if (!demand) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-bold mb-2">Demanda não encontrada</h2>
          <p className="text-muted-foreground mb-6">O protocolo #{id.substring(0,8)} não existe no sistema.</p>
          <Link href="/demandas">
            <Button>Voltar para Lista</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isResponsible = demand.responsavelAtual === user?.uid;
  const filteredCollaborators = allUsers.filter(u => u.email?.toLowerCase() !== user?.email?.toLowerCase());

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <Link href="/demandas" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-2 w-fit text-sm">
              <ChevronLeft size={16} />
              Voltar para Lista
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
            <p className="text-sm text-muted-foreground font-mono">ID: #{demand.id.substring(0, 8)}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {isResponsible && !demand.finalizada && (
              <>
                <Dialog open={sendModalOpen} onOpenChange={setSendModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2 shadow-sm"><Send size={18} /> Tramitar</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Mover Demanda</DialogTitle>
                      <DialogDescription>
                        Envie este protocolo para outro colaborador e anexe documentos se necessário.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Destinatário</Label>
                        <Select onValueChange={setSelectedUser} value={selectedUser}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um colaborador" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredCollaborators.length > 0 ? (
                              filteredCollaborators.map((u: any) => (
                                <SelectItem key={u.email} value={u.uid || u.email}>
                                  {u.nome} ({u.perfil})
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-2 text-xs text-center text-muted-foreground">
                                Nenhum outro colaborador encontrado.
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Observação</Label>
                        <Textarea 
                          placeholder="Instruções para o próximo responsável..." 
                          value={obs} 
                          onChange={e => setObs(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                          <Paperclip size={14} /> Adicionar Documentos ao Despacho
                        </Label>
                        <Input 
                          type="file" 
                          multiple 
                          className="h-9 text-xs" 
                          onChange={(e) => e.target.files && setTramiteFiles(Array.from(e.target.files))}
                        />
                        {tramiteFiles.length > 0 && (
                          <div className="text-[10px] text-primary font-medium mt-1">
                            {tramiteFiles.length} arquivo(s) selecionado(s)
                          </div>
                        )}
                      </div>
                    </div>
                    <DialogFooter className="gap-2">
                      <Button variant="outline" onClick={handleReturn} disabled={processing} className="gap-2">
                        <RotateCcw size={16} /> Devolver
                      </Button>
                      <Button onClick={handleSend} disabled={processing || !selectedUser} className="gap-2 min-w-[120px]">
                        {processing ? (
                          <>
                            <Loader2 className="animate-spin h-4 w-4" />
                            {uploadStatus ? `Subindo ${uploadStatus.current}/${uploadStatus.total}` : "Tramitando..."}
                          </>
                        ) : (
                          <>
                            <Send size={16} /> Enviar Despacho
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {hasPermission('finalizar_demandas') && (
                  <Button variant="outline" className="text-green-600 hover:text-green-700 hover:bg-green-50 gap-2" onClick={handleFinalize} disabled={processing}>
                    <CheckCircle size={18} /> Finalizar
                  </Button>
                )}
              </>
            )}

            {hasPermission('reabrir_demandas') && demand.finalizada && (
              <Button variant="outline" className="gap-2" onClick={handleReopen} disabled={processing}>
                <RotateCcw size={18} /> Reabrir para Ajustes
              </Button>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-headline font-bold flex items-center gap-2">
                  <span className="p-1.5 bg-primary/10 rounded-lg"><Info size={20} className="text-primary" /></span>
                  Descrição da Demanda
                </CardTitle>
                <Button variant="outline" size="sm" className="gap-2 text-primary border-primary/20 hover:bg-primary/5" onClick={handleGenerateSummary} disabled={summarizing}>
                  <Sparkles size={16} />
                  {summarizing ? "Processando..." : "Resumo IA"}
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {summary && (
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl relative animate-in fade-in slide-in-from-top-2">
                    <div className="absolute top-2 right-2 flex items-center gap-1 text-[9px] text-primary font-bold uppercase tracking-widest">
                      <Sparkles size={10} /> Inteligência Artificial
                    </div>
                    <p className="text-sm leading-relaxed text-primary/80 italic pr-12">"{summary}"</p>
                  </div>
                )}
                <div className="prose prose-slate max-w-none whitespace-pre-wrap text-foreground/80 leading-relaxed font-body">
                  {demand.descricao}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30">
                <CardTitle className="text-lg font-headline font-bold flex items-center gap-2">
                  <span className="p-1.5 bg-primary/10 rounded-lg"><History size={18} className="text-primary" /></span>
                  Linha do Tempo (Despachos)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {tramites.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-4">Nenhuma movimentação registrada.</p>
                  ) : (
                    tramites.map((t: Tramite, idx: number) => {
                      const deUser = allUsers.find((u: any) => u.uid === t.de || u.email === t.de)?.nome || "Sistema";
                      const paraUser = allUsers.find((u: any) => u.uid === t.para || u.email === t.para)?.nome || "Sistema";
                      
                      return (
                        <div key={t.id} className="relative flex gap-4 animate-in fade-in slide-in-from-left-2">
                          {idx !== tramites.length - 1 && (
                            <div className="absolute left-[1.1rem] top-8 bottom-0 w-0.5 bg-muted" />
                          )}
                          <div className={cn(
                            "w-9 h-9 rounded-full flex items-center justify-center shrink-0 z-10 shadow-sm",
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
                                {t.acao} <span className="text-muted-foreground font-normal">por {deUser}</span>
                              </h4>
                              <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{t.data?.toDate().toLocaleString()}</span>
                            </div>
                            {t.acao === "ENVIO" && deUser !== paraUser && (
                              <p className="text-[10px] text-muted-foreground mb-2 italic">Destinado para: {paraUser}</p>
                            )}
                            {t.observacao && (
                              <div className="p-3 bg-muted/40 rounded-lg text-xs border-l-2 border-primary/20 mb-2">
                                {t.observacao}
                              </div>
                            )}
                            
                            {t.anexos && t.anexos.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {t.anexos.map((anexo, aidx) => (
                                  <a 
                                    key={aidx} 
                                    href={anexo.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-2 bg-primary/5 rounded border border-primary/10 hover:bg-primary/10 transition-colors text-[10px] font-medium text-primary"
                                  >
                                    <FileText size={12} />
                                    <span className="max-w-[150px] truncate">{anexo.nome}</span>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-3 border-b mb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="text-primary" size={20} />
                  Pasta Digital
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {allAttachments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground space-y-2">
                    <Paperclip className="mx-auto opacity-20" size={32} />
                    <p className="text-xs">Nenhum documento anexado a este processo.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {allAttachments.map((anexo, idx) => (
                      <div key={idx} className="group p-3 rounded-lg border bg-card hover:border-primary transition-all flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 bg-muted rounded group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            <FileText size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate pr-4">{anexo.nome}</p>
                            <p className="text-[9px] text-muted-foreground uppercase font-medium tracking-tight">
                              {(anexo.tamanho / 1024).toFixed(1)} KB • {anexo.data?.toDate().toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" asChild>
                            <a href={anexo.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink size={14} />
                            </a>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Informações Gerais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg text-primary shadow-sm"><Calendar size={18} /></div>
                  <div>
                    <p className="text-[9px] uppercase text-muted-foreground font-bold tracking-wider">Prazo Fatal</p>
                    <p className="font-bold text-sm">{demand.prazo ? new Date(demand.prazo).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg text-primary shadow-sm"><UserIcon size={18} /></div>
                  <div>
                    <p className="text-[9px] uppercase text-muted-foreground font-bold tracking-wider">Responsável Atual</p>
                    <p className="font-bold text-sm">
                      {allUsers.find((u: any) => u.uid === demand.responsavelAtual || u.email === demand.responsavelAtual)?.nome || "Não Atribuído"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg text-primary shadow-sm"><MessageSquare size={18} /></div>
                  <div>
                    <p className="text-[9px] uppercase text-muted-foreground font-bold tracking-wider">Prioridade</p>
                    <Badge variant={demand.prioridade === "ALTA" ? "destructive" : demand.prioridade === "MEDIA" ? "secondary" : "outline"} className="mt-1 text-[10px] shadow-sm uppercase">
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
