
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
import { ChevronLeft, Save, Loader2, User as UserIcon, Paperclip, X, FileText, AlertCircle } from "lucide-react";
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
  
  // Memoização estável para evitar loops de renderização
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
              console.error("Upload error for file", file.name, error);
              reject(new Error(`Erro de CORS ou rede no arquivo ${file.name}. Verifique as instruções de CORS.`));
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
      console.error("Submit error:", error);
      toast({
        title: "Falha no Envio",
        description: error.message || "Erro de conexão. Verifique se o CORS foi liberado.",
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
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Protocolo Interno</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label htmlFor="titulo" className="text-[10px] font-bold uppercase text-muted-foreground">Título</Label>
                <Input id="titulo" required value={formData.titulo} onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))} className="h-11 bg-slate-950 border-slate-900" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="prazo" className="text-[10px] font-bold uppercase text-muted-foreground">Prazo</Label>
                  <Input id="prazo" type="date" required value={formData.prazo} onChange={(e) => setFormData(prev => ({ ...prev, prazo: e.target.value }))} className="h-11 bg-slate-950 border-slate-900" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prioridade" className="text-[10px] font-bold uppercase text-muted-foreground">Prioridade</Label>
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
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Responsável</Label>
                <Select value={formData.responsavelId} onValueChange={(v) => setFormData(prev => ({ ...prev, responsavelId: v }))}>
                  <SelectTrigger className="h-11 bg-slate-950 border-slate-900">
                    <div className="flex items-center gap-2"><UserIcon size={14} className="text-muted-foreground"/><SelectValue /></div>
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border-slate-900">
                    {user?.uid && <SelectItem value={user.uid}>Atribuir a mim</SelectItem>}
                    {allUsers.filter((u: any) => u.uid !== user?.uid).map((u: any) => (
                      <SelectItem key={u.uid} value={u.uid}>{u.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao" className="text-[10px] font-bold uppercase text-muted-foreground">Descrição</Label>
                <Textarea id="descricao" rows={6} required value={formData.descricao} onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))} className="resize-none bg-slate-950 border-slate-900" />
              </div>

              <div className="space-y-4 p-6 bg-slate-950 rounded-lg border border-slate-900 border-dashed">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 font-bold text-[10px] uppercase text-muted-foreground">
                    <Paperclip size={14} /> Documentação em PDF / Imagens
                  </Label>
                </div>
                
                <Input type="file" multiple className="bg-slate-900 cursor-pointer h-10 pt-2 border-slate-800" onChange={handleFileChange} disabled={saving} />
                
                {files.length > 0 && (
                  <div className="space-y-3 mt-4">
                    {files.map((file, idx) => (
                      <div key={idx} className="space-y-1 bg-slate-900 p-3 rounded border border-slate-800">
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-2 truncate">
                            <FileText size={14} className="text-primary" />
                            <span className="truncate">{file.name}</span>
                          </div>
                          {!saving && <Button type="button" variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => removeFile(idx)}><X size={12} /></Button>}
                        </div>
                        {uploadProgress[file.name] !== undefined && (
                          <div className="mt-2">
                            <Progress value={uploadProgress[file.name]} className="h-1 bg-slate-950" />
                            <p className="text-[9px] text-right mt-1 font-mono text-primary">{Math.round(uploadProgress[file.name])}%</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-3 bg-primary/5 rounded border border-primary/20 flex gap-2">
                  <AlertCircle size={14} className="text-primary shrink-0" />
                  <p className="text-[9px] text-primary/80 font-bold uppercase leading-tight">
                    Arquivos grandes (1MB+) requerem o comando CORS no Cloud Shell.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-3 border-t border-slate-900 bg-slate-950/50 py-6">
              <Button type="button" variant="ghost" onClick={() => router.back()} disabled={saving} className="text-[10px] font-bold uppercase">Cancelar</Button>
              <Button type="submit" disabled={saving || formData.titulo === ""} className="min-w-[200px] text-[10px] font-bold uppercase tracking-widest bg-primary text-primary-foreground">
                {saving ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={14} />
                    {currentUploadingFile ? `Subindo ${currentUploadingFile}...` : "Processando..."}
                  </>
                ) : (
                  <>
                    <Save className="mr-2" size={14} /> Finalizar Registro
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
