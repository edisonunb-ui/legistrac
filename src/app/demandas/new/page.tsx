"use client";

import { useUser, useFirestore, useCollection, useDoc, useStorage, useMemoFirebase } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createDemand } from "@/lib/demand-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Save, Loader2, User as UserIcon, Paperclip, X, FileText, CheckCircle2, AlertCircle } from "lucide-react";
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
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[files[index]?.name];
      return newProgress;
    });
  }, [files]);

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
              console.error("Upload task error:", error);
              reject(error);
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
        throw new Error(`Erro ao subir arquivo ${file.name}: ${err.message}`);
      }
    }

    return attachments;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db || !cabinetId || saving) return;
    
    setSaving(true);
    try {
      const attachments = await uploadFiles();
      
      const demandId = await createDemand(db, user.uid, {
        cabinetId,
        ...formData,
        responsavelId: formData.responsavelId || user.uid,
        anexos: attachments
      });
      
      toast({ title: "Sucesso", description: "Demanda registrada com sucesso." });
      router.push(`/demandas/${demandId}`);
    } catch (error: any) {
      console.error("Submit error details:", error);
      toast({
        title: "Erro no Processamento",
        description: error.message || "Verifique sua conexão e se o CORS está liberado no Google Cloud.",
        variant: "destructive",
      });
      setSaving(false);
      setCurrentUploadingFile(null);
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <Link href="/demandas" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 w-fit text-xs font-bold uppercase tracking-wider">
            <ChevronLeft size={14} /> Lista de Demandas
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Registro de Demanda</h1>
        </header>

        <Card className="max-w-3xl border-slate-900 bg-card shadow-none">
          <form onSubmit={handleSubmit}>
            <CardHeader className="border-b border-slate-900">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Formulário Oficial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label htmlFor="titulo" className="text-[10px] font-bold uppercase text-muted-foreground">Título da Solicitação</Label>
                <Input id="titulo" required value={formData.titulo} onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))} placeholder="Ex: Manutenção de iluminação pública" className="h-11 bg-slate-950 border-slate-900" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="prazo" className="text-[10px] font-bold uppercase text-muted-foreground">Prazo Limite</Label>
                  <Input id="prazo" type="date" required value={formData.prazo} onChange={(e) => setFormData(prev => ({ ...prev, prazo: e.target.value }))} className="h-11 bg-slate-950 border-slate-900" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prioridade" className="text-[10px] font-bold uppercase text-muted-foreground">Nível de Prioridade</Label>
                  <Select value={formData.prioridade} onValueChange={(v: DemandPriority) => setFormData(prev => ({ ...prev, prioridade: v }))}>
                    <SelectTrigger className="h-11 bg-slate-950 border-slate-900"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-950 border-slate-900">
                      <SelectItem value="BAIXA">Baixa</SelectItem>
                      <SelectItem value="MEDIA">Média</SelectItem>
                      <SelectItem value="ALTA">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Responsável Designado</Label>
                <Select value={formData.responsavelId} onValueChange={(v) => setFormData(prev => ({ ...prev, responsavelId: v }))}>
                  <SelectTrigger className="h-11 bg-slate-950 border-slate-900">
                    <div className="flex items-center gap-2"><UserIcon size={14} className="text-muted-foreground"/><SelectValue /></div>
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border-slate-900">
                    {user?.uid && <SelectItem value={user.uid}>Atribuir a mim</SelectItem>}
                    {allUsers.filter((u: any) => u.uid !== user?.uid).map((u: any) => (
                      <SelectItem key={u.uid} value={u.uid}>{u.nome} ({u.perfil})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao" className="text-[10px] font-bold uppercase text-muted-foreground">Detalhamento Técnico</Label>
                <Textarea id="descricao" rows={6} required value={formData.descricao} onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))} placeholder="Descreva os detalhes da demanda, locais e contatos..." className="resize-none bg-slate-950 border-slate-900" />
              </div>

              <div className="space-y-4 p-6 bg-slate-950 rounded-lg border border-slate-900 border-dashed">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 font-bold text-[10px] uppercase text-muted-foreground">
                    <Paperclip size={14} /> Anexar Documentação (PDF, Imagens)
                  </Label>
                </div>
                
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-md flex gap-3 mb-4">
                   <AlertCircle size={16} className="text-primary shrink-0" />
                   <p className="text-[10px] text-primary/80 leading-tight">
                     O upload suporta arquivos maiores de 1MB se o CORS estiver configurado. Verifique o status do envio abaixo.
                   </p>
                </div>

                <Input type="file" multiple className="bg-slate-900 cursor-pointer h-10 pt-2 border-slate-800" onChange={handleFileChange} disabled={saving} />
                
                {files.length > 0 && (
                  <div className="space-y-2 mt-4">
                    {files.map((file, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between p-3 bg-slate-900 rounded border border-slate-800 text-[11px]">
                          <div className="flex items-center gap-3 truncate">
                            <FileText size={14} className="text-muted-foreground" />
                            <span className="truncate">{file.name}</span>
                          </div>
                          {!saving && (
                            <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 hover:text-destructive" onClick={() => removeFile(idx)}>
                              <X size={14} />
                            </Button>
                          )}
                        </div>
                        {uploadProgress[file.name] !== undefined && (
                          <div className="px-1">
                            <Progress value={uploadProgress[file.name]} className="h-1 bg-slate-800" />
                            <p className="text-[9px] text-right mt-1 font-bold text-primary">{Math.round(uploadProgress[file.name])}%</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-3 border-t border-slate-900 bg-slate-950/50 py-6">
              <Button type="button" variant="ghost" onClick={() => router.back()} disabled={saving} className="text-[10px] font-bold uppercase">Descartar</Button>
              <Button type="submit" disabled={saving || formData.titulo === ""} className="min-w-[200px] text-[10px] font-bold uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90">
                {saving ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={14} />
                    {currentUploadingFile ? `Enviando ${currentUploadingFile}...` : "Processando..."}
                  </>
                ) : (
                  <>
                    <Save className="mr-2" size={14} /> Salvar Demanda
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
