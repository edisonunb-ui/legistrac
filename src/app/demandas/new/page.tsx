"use client";

import { useUser, useFirestore, useCollection, useDoc, useStorage, useMemoFirebase } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createDemand } from "@/lib/demand-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Save, Loader2, User as UserIcon, Paperclip, X, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { DemandPriority, Attachment } from "@/lib/types";
import { collection, query, Timestamp, doc, where } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Progress } from "@/components/ui/progress";

export default function NewDemandPage() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const storage = useStorage();
  const router = useRouter();
  const { toast } = useToast();
  
  const [saving, setSaving] = useState(false);
  const isSubmitting = useRef(false);
  
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    prazo: "",
    prioridade: "MEDIA" as DemandPriority,
    responsavelId: "",
  });

  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [currentUploadingFile, setCurrentUploadingFile] = useState<string | null>(null);

  const userEmail = useMemo(() => user?.email?.toLowerCase().trim() || null, [user?.email]);
  
  const profileRef = useMemoFirebase(() => (userEmail && db) ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: profile } = useDoc(profileRef);
  const cabinetId = (profile as any)?.cabinetId;

  const usersQuery = useMemoFirebase(() => {
    if (!db || !cabinetId) return null;
    return query(collection(db, "users"), where("cabinetId", "==", cabinetId));
  }, [db, cabinetId]);
  
  const { data: allUsers = [] } = useCollection(usersQuery);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const uploadFiles = async (): Promise<Attachment[]> => {
    const attachments: Attachment[] = [];
    if (files.length === 0 || !storage) return [];

    for (const file of files) {
      setCurrentUploadingFile(file.name);
      
      const sanitizedName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
      const storagePath = `demandas/${Date.now()}_${sanitizedName}`;
      const storageRef = ref(storage, storagePath);
      
      const uploadTask = uploadBytesResumable(storageRef, file);

      try {
        const downloadUrl = await new Promise<string>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
            },
            (error) => {
              console.error("Upload failed for:", file.name, error);
              reject(new Error(`Erro de rede ou CORS. Certifique-se de ter rodado o comando gsutil no Cloud Shell.`));
            },
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db || !cabinetId || isSubmitting.current) return;
    
    isSubmitting.current = true;
    setSaving(true);
    
    try {
      const attachments = await uploadFiles();
      
      const demandId = await createDemand(db, user.uid, {
        cabinetId,
        ...formData,
        responsavelId: formData.responsavelId || user.uid,
        anexos: attachments
      });
      
      toast({ title: "Sucesso!", description: "Demanda e arquivos registrados." });
      router.push(`/demandas/${demandId}`);
    } catch (error: any) {
      console.error("Submit error:", error);
      toast({
        title: "Erro no Processamento",
        description: error.message || "Verifique sua conexão e a configuração de CORS.",
        variant: "destructive",
      });
      setSaving(false);
      isSubmitting.current = false;
      setCurrentUploadingFile(null);
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <Link href="/demandas" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 w-fit text-[10px] font-bold uppercase tracking-widest">
              <ChevronLeft size={14} /> Voltar para Lista
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">Registro de <span className="text-primary">Demanda</span></h1>
          </div>
          <div className="flex items-center gap-2 p-2 bg-slate-900/50 rounded-lg border border-slate-800">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
             <span className="text-[9px] font-bold uppercase tracking-tighter text-muted-foreground">Servidores Estáveis</span>
          </div>
        </header>

        <Card className="max-w-4xl border-slate-900 bg-card shadow-2xl">
          <form onSubmit={handleSubmit}>
            <CardHeader className="border-b border-slate-900 bg-slate-950/30">
              <CardTitle className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Ficha de Protocolo Digital</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8 pt-8">
              <div className="space-y-3">
                <Label htmlFor="titulo" className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Título da Solicitação</Label>
                <Input id="titulo" required value={formData.titulo} onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))} className="h-12 bg-slate-950 border-slate-900 focus:border-primary/50" placeholder="Ex: Manutenção de Iluminação na Praça Central" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="prazo" className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Prazo Limite</Label>
                  <Input id="prazo" type="date" required value={formData.prazo} onChange={(e) => setFormData(prev => ({ ...prev, prazo: e.target.value }))} className="h-12 bg-slate-950 border-slate-900" />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="prioridade" className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Prioridade</Label>
                  <Select value={formData.prioridade} onValueChange={(v: DemandPriority) => setFormData(prev => ({ ...prev, prioridade: v }))}>
                    <SelectTrigger className="h-12 bg-slate-950 border-slate-900"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-950 border-slate-900">
                      <SelectItem value="BAIXA">Baixa</SelectItem>
                      <SelectItem value="MEDIA">Média</SelectItem>
                      <SelectItem value="ALTA">Alta Urgência</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Responsável Atual</Label>
                  <Select value={formData.responsavelId} onValueChange={(v) => setFormData(prev => ({ ...prev, responsavelId: v }))}>
                    <SelectTrigger className="h-12 bg-slate-950 border-slate-900">
                      <div className="flex items-center gap-2"><UserIcon size={14} className="text-primary"/><SelectValue placeholder="Selecione..." /></div>
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 border-slate-900">
                      {user?.uid && <SelectItem value={user.uid}>Atribuir a mim</SelectItem>}
                      {allUsers.filter((u: any) => u.uid !== user?.uid).map((u: any) => (
                        <SelectItem key={u.uid} value={u.uid}>{u.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="descricao" className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Detalhamento da Demanda</Label>
                <Textarea id="descricao" rows={8} required value={formData.descricao} onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))} className="resize-none bg-slate-950 border-slate-900 focus:border-primary/50 leading-relaxed" placeholder="Descreva aqui todos os detalhes necessários para a execução..." />
              </div>

              <div className="space-y-6 p-8 bg-slate-950/50 rounded-xl border border-slate-900 border-dashed">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] text-primary">
                    <Paperclip size={14} /> Anexos e Documentação (PDF/IMG)
                  </Label>
                </div>
                
                <div className="relative group">
                  <Input type="file" multiple className="bg-slate-900 cursor-pointer h-14 pt-4 border-slate-800 hover:border-primary/30 transition-colors" onChange={handleFileChange} disabled={saving} />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
                    <FileText size={20} />
                  </div>
                </div>
                
                {files.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    {files.map((file, idx) => (
                      <div key={idx} className="space-y-2 bg-slate-900 p-4 rounded-lg border border-slate-800 shadow-inner">
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-3 truncate">
                            <div className="p-2 bg-slate-950 rounded">
                              <FileText size={16} className="text-primary" />
                            </div>
                            <span className="truncate font-bold text-foreground/80">{file.name}</span>
                          </div>
                          {!saving && <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 hover:text-destructive" onClick={() => removeFile(idx)}><X size={14} /></Button>}
                        </div>
                        {uploadProgress[file.name] !== undefined && (
                          <div className="space-y-1">
                            <Progress value={uploadProgress[file.name]} className="h-1 bg-slate-950" />
                            <div className="flex justify-between items-center text-[9px] font-bold font-mono">
                              <span className={uploadProgress[file.name] === 100 ? "text-green-500" : "text-primary"}>
                                {uploadProgress[file.name] === 100 ? "UPLOAD COMPLETO" : "ENVIANDO..."}
                              </span>
                              <span>{Math.round(uploadProgress[file.name])}%</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg border border-primary/10">
                  <AlertCircle size={16} className="text-primary shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-[10px] text-primary/90 font-bold uppercase tracking-tight">Status de CORS Verificado</p>
                    <p className="text-[9px] text-muted-foreground leading-relaxed">
                      Se o upload de arquivos de 1MB travar, verifique se o comando <b>gsutil cors get</b> retorna as origens permitidas no Cloud Shell.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-4 border-t border-slate-900 bg-slate-950/20 py-8 px-8">
              <Button type="button" variant="ghost" onClick={() => router.back()} disabled={saving} className="text-[11px] font-bold uppercase tracking-widest h-12">Cancelar</Button>
              <Button type="submit" disabled={saving || formData.titulo === ""} className="min-w-[240px] h-12 text-[11px] font-black uppercase tracking-[0.2em] bg-primary text-primary-foreground shadow-xl shadow-primary/10">
                {saving ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={16} />
                    {currentUploadingFile ? "ENVIANDO ARQUIVO..." : "PROCESSANDO..."}
                  </>
                ) : (
                  <>
                    <Save className="mr-2" size={16} /> Finalizar Protocolo
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}
