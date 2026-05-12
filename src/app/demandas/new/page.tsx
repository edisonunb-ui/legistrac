"use client";

import { useUser, useFirestore, useCollection, useDoc, useStorage, useMemoFirebase } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createDemand } from "@/lib/demand-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Save, Loader2, Paperclip, X, CheckCircle2, ShieldAlert, ExternalLink } from "lucide-react";
import Link from "next/link";
import { DemandPriority, Attachment } from "@/lib/types";
import { collection, query, Timestamp, doc, where } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function NewDemandPage() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const storage = useStorage();
  const router = useRouter();
  const { toast } = useToast();
  
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    prazo: "",
    prioridade: "MEDIA" as DemandPriority,
    responsavelId: "",
  });

  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isFinished, setIsFinished] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const userEmail = useMemo(() => user?.email?.toLowerCase().trim() || null, [user?.email]);
  const profileRef = useMemoFirebase(() => (userEmail && db) ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: profile } = useDoc(profileRef);
  const cabinetId = (profile as any)?.cabinetId;

  const usersQuery = useMemoFirebase(() => {
    if (!db || !cabinetId) return null;
    return query(collection(db, "users"), where("cabinetId", "==", cabinetId), where("deleted", "==", false));
  }, [db, cabinetId]);
  
  const { data: allUsers = [] } = useCollection(usersQuery);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
      setLastError(null);
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
      const storageRef = ref(storage, `demandas/${Date.now()}_${sanitizedName}`);
      
      const uploadTask = uploadBytesResumable(storageRef, file);

      try {
        const downloadUrl = await new Promise<string>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
            },
            (error: any) => {
              reject(new Error(error.code));
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
    if (!user || !db || !cabinetId || saving) return;
    
    setSaving(true);
    setLastError(null);
    try {
      const attachments = await uploadFiles();
      const demandId = await createDemand(db, user.uid, {
        cabinetId,
        ...formData,
        responsavelId: formData.responsavelId || user.uid,
        anexos: attachments
      });
      
      setIsFinished(true);
      toast({ title: "Protocolado!", description: "Demanda e arquivos salvos com sucesso." });
      setTimeout(() => router.push(`/demandas/${demandId}`), 1500);
    } catch (error: any) {
      setSaving(false);
      setLastError(error.message || "Erro desconhecido");
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <Link href="/demandas" className="flex items-center gap-2 text-muted-foreground hover:text-primary mb-2 text-xs font-bold uppercase tracking-widest transition-colors">
            <ChevronLeft size={16} /> Voltar à lista
          </Link>
          <h1 className="text-3xl font-black uppercase tracking-tighter">Nova <span className="text-primary">Demanda</span></h1>
        </header>

        {lastError && (
          <Alert variant="destructive" className="mb-6 bg-destructive/10 border-destructive">
            <ShieldAlert className="h-5 w-5" />
            <AlertTitle className="font-bold uppercase text-xs">Atenção Necessária</AlertTitle>
            <AlertDescription className="text-[11px] mt-2 space-y-2">
              <p>O upload falhou. Certifique-se de que clicou em PUBLICAR nas Rules do Storage no Firebase.</p>
              <div className="p-3 bg-black/20 rounded font-mono break-all text-[10px]">
                Erro: {lastError}
              </div>
              <Button size="sm" variant="outline" className="h-7 text-[9px] font-bold mt-2" asChild>
                <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer">
                  Abrir Console do Firebase
                </a>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Card className="max-w-4xl border-primary/10 bg-card shadow-2xl overflow-hidden">
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6 pt-8 text-foreground">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Título do Protocolo</Label>
                <Input required value={formData.titulo} onChange={(e) => setFormData(p => ({ ...p, titulo: e.target.value }))} className="h-12 bg-background border-primary/10 focus:border-primary/50" placeholder="Ex: Solicitação de Pavimentação - Bairro Centro" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Prazo Limite</Label>
                  <Input type="date" required value={formData.prazo} onChange={(e) => setFormData(p => ({ ...p, prazo: e.target.value }))} className="h-12 bg-background border-primary/10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Prioridade</Label>
                  <Select value={formData.prioridade} onValueChange={(v: DemandPriority) => setFormData(p => ({ ...p, prioridade: v }))}>
                    <SelectTrigger className="h-12 bg-background border-primary/10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BAIXA">Baixa</SelectItem>
                      <SelectItem value="MEDIA">Média</SelectItem>
                      <SelectItem value="ALTA">Alta Urgência</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Responsável</Label>
                  <Select value={formData.responsavelId} onValueChange={(v) => setFormData(p => ({ ...p, responsavelId: v }))}>
                    <SelectTrigger className="h-12 bg-background border-primary/10"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={user?.uid || ""}>Manter comigo</SelectItem>
                      {allUsers.filter((u: any) => u.uid !== user?.uid).map((u: any) => (
                        <SelectItem key={u.uid} value={u.uid}>{u.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Descrição Detalhada</Label>
                <Textarea required rows={6} value={formData.descricao} onChange={(e) => setFormData(p => ({ ...p, descricao: e.target.value }))} className="bg-background border-primary/10 focus:border-primary/50 resize-none" placeholder="Descreva os detalhes da demanda..." />
              </div>

              <div className="p-6 bg-primary/5 rounded-xl border border-primary/10 border-dashed space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                    <Paperclip size={14} /> Documentos Anexos
                  </Label>
                  <span className="text-[9px] text-muted-foreground uppercase font-bold">{files.length} arquivo(s) selecionado(s)</span>
                </div>
                
                <div className="relative group">
                  <Input type="file" multiple onChange={handleFileChange} disabled={saving} className="bg-background border-primary/10 h-14 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90" />
                </div>
                
                {files.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    {files.map((file, idx) => (
                      <div key={idx} className="bg-background p-3 rounded-lg border border-primary/10 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold truncate max-w-[150px] uppercase text-muted-foreground">{file.name}</span>
                          {!saving && <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive" onClick={() => removeFile(idx)}><X size={14} /></Button>}
                        </div>
                        {uploadProgress[file.name] !== undefined && (
                          <div className="space-y-1">
                            <Progress value={uploadProgress[file.name]} className="h-1" />
                            <div className="flex justify-between items-center">
                              <span className="text-[8px] font-black text-primary uppercase">{Math.round(uploadProgress[file.name])}%</span>
                              {uploadProgress[file.name] === 100 && <CheckCircle2 size={10} className="text-green-500" />}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t border-primary/10 p-8 flex justify-end items-center gap-6">
              {saving && !isFinished && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Loader2 className="animate-spin" size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Transmitindo dados...</span>
                </div>
              )}
              {isFinished && (
                <div className="flex items-center gap-2 text-green-500">
                  <CheckCircle2 size={18} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Protocolo Concluído!</span>
                </div>
              )}
              <Button type="submit" disabled={saving || isFinished} className="bg-primary text-primary-foreground font-black uppercase text-[11px] tracking-widest px-12 h-12 shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                {saving ? "Processando..." : <><Save className="mr-2" size={18} /> Protocolar Agora</>}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}
