
"use client";

import { useUser, useFirestore, useDoc, useMemoFirebase, useStorage } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useState, use, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { doc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  ChevronLeft, 
  Save, 
  Loader2, 
  Gavel, 
  FileText, 
  Link as LinkIcon, 
  Paperclip, 
  X, 
  CheckCircle2, 
  FileUp, 
  Download,
  ExternalLink,
  AlertCircle,
  ShieldAlert
} from "lucide-react";
import Link from "next/link";
import { Attachment, LegislativeAction } from "@/lib/types";

const MASTER_EMAIL = "edisonunb@gmail.com";

export default function LegislativeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useUser();
  const db = useFirestore();
  const storage = useStorage();
  const router = useRouter();
  const { toast } = useToast();
  
  const [saving, setSaving] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  // Referência do documento com ID garantido
  const actionRef = useMemoFirebase(() => (id && db) ? doc(db, "legislativo", id) : null, [db, id]);
  const { data: action, loading: loadingAction, error: actionError } = useDoc<LegislativeAction>(actionRef);

  // Perfil do usuário para validação de gabinete
  const userEmail = user?.email?.toLowerCase().trim();
  const profileRef = useMemoFirebase(() => (userEmail && db) ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: profile } = useDoc(profileRef);

  const [formData, setFormData] = useState({
    tipo: "INDICACAO" as any,
    titulo: "",
    ementa: "",
    conteudo: "",
    numero: "",
    ano: "",
    status: "ELABORACAO" as any,
    linkOficial: "",
  });

  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  // Sincroniza dados do banco com o formulário local
  useEffect(() => {
    if (action) {
      setFormData({
        tipo: action.tipo || "INDICACAO",
        titulo: action.titulo || "",
        ementa: action.ementa || "",
        conteudo: action.conteudo || "",
        numero: action.numero || "",
        ano: action.ano?.toString() || new Date().getFullYear().toString(),
        status: action.status || "ELABORACAO",
        linkOficial: action.linkOficial || "",
      });
    }
  }, [action]);

  // Validação de acesso por gabinete
  const hasAccess = useMemo(() => {
    if (!action || !profile || userEmail === MASTER_EMAIL) return true;
    return action.cabinetId === (profile as any).cabinetId;
  }, [action, profile, userEmail]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
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
      const storageRef = ref(storage, `legislativo/${Date.now()}_${sanitizedName}`);
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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !actionRef || saving) return;
    setSaving(true);

    try {
      const newAttachments = await uploadFiles();
      const allAttachments = [...(action?.anexos || []), ...newAttachments];

      await updateDoc(actionRef, {
        ...formData,
        ano: parseInt(formData.ano) || new Date().getFullYear(),
        anexos: allAttachments,
        updatedAt: serverTimestamp()
      });

      toast({ 
        title: "Protocolo Atualizado", 
        description: "As alterações no teor e metadados foram salvas.",
        className: "bg-primary text-black"
      });
      setFiles([]);
      setUploadProgress({});
    } catch (e: any) {
      toast({ title: "Erro no Salvamento", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loadingAction) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-primary" size={40} />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground animate-pulse">Acessando Arquivos...</p>
      </div>
    );
  }

  if (actionError || !action || !hasAccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert size={64} className="text-destructive mb-6 glow-destructive" />
        <h1 className="text-2xl font-black uppercase tracking-tighter text-white mb-2">Protocolo Inacessível</h1>
        <p className="text-muted-foreground text-[10px] uppercase tracking-widest max-w-md">O documento solicitado não existe ou você não possui permissões de visualização para este gabinete.</p>
        <Link href="/legislativo" className="mt-8">
          <Button variant="outline" className="font-black uppercase text-[11px] h-12 border-white/10">Voltar à Atividade</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar />
      <main className="container mx-auto px-4 py-8 sm:py-12">
        <header className="mb-10 flex flex-col gap-6">
          <Link href="/legislativo" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-all mb-4 text-[10px] font-black uppercase tracking-[0.3em]">
            <ChevronLeft size={16} /> Voltar à Lista
          </Link>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="outline" className="text-[10px] font-black uppercase border-primary/20 text-primary">#{id.substring(0, 8)}</Badge>
                <Badge className={cn(
                  "font-black uppercase text-[10px] px-3 py-1 text-black",
                  formData.status === "APROVADO" ? "bg-green-500" : "bg-primary"
                )}>{formData.status.replace("_", " ")}</Badge>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter text-white">
                Gestão do Inteiro Teor
              </h1>
            </div>
            {formData.linkOficial && (
              <Button asChild variant="outline" className="border-primary/20 text-primary hover:bg-primary/10 h-12 font-black uppercase text-[10px] tracking-widest">
                <a href={formData.linkOficial} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2" size={14} /> Ver na Câmara
                </a>
              </Button>
            )}
          </div>
        </header>

        <form onSubmit={handleUpdate} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white/5 border-white/5 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              <CardHeader>
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <FileText size={16} /> Edição de Minuta
                </CardTitle>
                <CardDescription className="text-[9px] uppercase font-bold text-muted-foreground">O texto abaixo pode ser editado ou ditado agora.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Título do Protocolo</Label>
                  <Input required value={formData.titulo} onChange={e => setFormData(p => ({ ...p, titulo: e.target.value }))} className="bg-black/50 border-white/10 text-white h-12 font-bold" />
                </div>

                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Ementa Oficial</Label>
                  <Textarea required value={formData.ementa} onChange={e => setFormData(p => ({ ...p, ementa: e.target.value }))} className="bg-black/50 border-white/10 text-white min-h-[100px] text-xs leading-relaxed" />
                </div>

                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Conteúdo para Protocolo (Inteiro Teor)</Label>
                  <Textarea required value={formData.conteudo} onChange={e => setFormData(p => ({ ...p, conteudo: e.target.value }))} className="bg-black/50 border-white/10 text-white min-h-[450px] text-xs font-mono leading-relaxed" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/5 shadow-2xl overflow-hidden">
              <CardHeader className="bg-white/5 border-b border-white/5">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <Paperclip size={16} /> Pasta Digital (Anexos)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {action.anexos && action.anexos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {action.anexos.map((a, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/5 group hover:border-primary/20 transition-all">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <FileText size={14} className="text-primary shrink-0" />
                          <span className="text-[10px] font-bold truncate uppercase text-white/80">{a.nome}</span>
                        </div>
                        <a href={a.url} target="_blank" rel="noopener noreferrer" className="p-2 text-primary hover:bg-primary/10 rounded-lg">
                          <Download size={16} />
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-6 text-[10px] font-black uppercase text-muted-foreground border border-dashed border-white/5 rounded-xl">Nenhum arquivo anexado.</p>
                )}

                <div className="pt-6 border-t border-white/5 space-y-4">
                  <Label className="text-[10px] font-black uppercase text-primary flex items-center gap-2"><FileUp size={14} /> Adicionar Novos Documentos</Label>
                  <Input type="file" multiple onChange={handleFileChange} disabled={saving} className="bg-white/5 border-white/10 h-14 file:bg-primary file:text-black file:font-black file:uppercase file:text-[9px] file:h-full file:mr-4 file:px-4 file:border-none" />
                  
                  {files.length > 0 && (
                    <div className="grid grid-cols-1 gap-2">
                      {files.map((file, idx) => (
                        <div key={idx} className="bg-white/5 p-3 rounded-lg border border-white/10 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold truncate uppercase text-white/70">{file.name}</span>
                            <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-destructive/20 hover:text-destructive" onClick={() => removeFile(idx)}><X size={14} /></Button>
                          </div>
                          {uploadProgress[file.name] !== undefined && <Progress value={uploadProgress[file.name]} className="h-1 bg-white/5 shadow-primary/20" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-white/5 border-white/5 shadow-2xl overflow-hidden sticky top-24">
              <CardHeader className="bg-white/5 border-b border-white/5">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <Gavel size={16} /> Metadados da Ação
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-8 space-y-6">
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Classificação</Label>
                  <Select value={formData.tipo} onValueChange={v => setFormData(p => ({ ...p, tipo: v }))}>
                    <SelectTrigger className="bg-black/50 border-white/10 text-white h-12 font-bold uppercase text-[10px] tracking-widest">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black border-white/10">
                      <SelectItem value="INDICACAO">INDICAÇÃO</SelectItem>
                      <SelectItem value="PROJETO_LEI">PROJETO DE LEI</SelectItem>
                      <SelectItem value="REQUERIMENTO">REQUERIMENTO</SelectItem>
                      <SelectItem value="MOCAO">MOÇÃO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Nº Protocolo</Label>
                    <Input value={formData.numero} onChange={e => setFormData(p => ({ ...p, numero: e.target.value }))} className="bg-black/50 border-white/10 text-white h-12 font-bold" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Ano Legislativo</Label>
                    <Input type="number" value={formData.ano} onChange={e => setFormData(p => ({ ...p, ano: e.target.value }))} className="bg-black/50 border-white/10 text-white h-12 font-bold" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Status Atual</Label>
                  <Select value={formData.status} onValueChange={v => setFormData(p => ({ ...p, status: v }))}>
                    <SelectTrigger className="bg-black/50 border-white/10 text-white h-12 font-bold uppercase text-[10px] tracking-widest">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black border-white/10">
                      <SelectItem value="ELABORACAO">EM ELABORAÇÃO</SelectItem>
                      <SelectItem value="PROTOCOLADO">PROTOCOLADO</SelectItem>
                      <SelectItem value="APROVADO">APROVADO</SelectItem>
                      <SelectItem value="REJEITADO">REJEITADO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Link no Site da Câmara</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/50" size={14} />
                    <Input value={formData.linkOficial} onChange={e => setFormData(p => ({ ...p, linkOficial: e.target.value }))} className="pl-10 bg-black/50 border-white/10 text-white h-12 text-xs" placeholder="URL do sistema legislativo..." />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-white/5 p-8">
                <Button type="submit" disabled={saving} className="w-full bg-primary text-black font-black uppercase text-[11px] tracking-widest h-14 glow-primary">
                  {saving ? <Loader2 className="animate-spin" /> : <><Save className="mr-2" size={18} /> Salvar Alterações</>}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </form>
      </main>
    </div>
  );
}
