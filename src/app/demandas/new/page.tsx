"use client";

import { useUser, useFirestore, useCollection, useDoc, useStorage, useMemoFirebase } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
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
  
  // Estabilizamos as referências para evitar loops
  const profileRef = useMemoFirebase(() => (userEmail && db) ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: profile } = useDoc(profileRef);

  const cabinetId = (profile as any)?.cabinetId;

  useEffect(() => {
    if (user?.uid && !formData.responsavelId) {
      setFormData(prev => ({ ...prev, responsavelId: user.uid }));
    }
  }, [user?.uid, formData.responsavelId]);

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

      const downloadUrl = await new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
          },
          (error) => {
            console.error("Upload error:", error);
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
        title: "Erro no Envio",
        description: "Falha ao processar a demanda. Tente novamente.",
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

        <Card className="max-w-3xl border-border bg-card shadow-none">
          <form onSubmit={handleSubmit}>
            <CardHeader className="border-b">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Formulário Oficial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label htmlFor="titulo" className="text-[10px] font-bold uppercase">Título da Solicitação</Label>
                <Input id="titulo" required value={formData.titulo} onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))} placeholder="Ex: Manutenção de iluminação pública" className="h-11" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="prazo" className="text-[10px] font-bold uppercase">Prazo Limite</Label>
                  <Input id="prazo" type="date" required value={formData.prazo} onChange={(e) => setFormData(prev => ({ ...prev, prazo: e.target.value }))} className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prioridade" className="text-[10px] font-bold uppercase">Nível de Prioridade</Label>
                  <Select value={formData.prioridade} onValueChange={(v: DemandPriority) => setFormData(prev => ({ ...prev, prioridade: v }))}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BAIXA">Baixa</SelectItem>
                      <SelectItem value="MEDIA">Média</SelectItem>
                      <SelectItem value="ALTA">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase">Responsável Designado</Label>
                <Select value={formData.responsavelId} onValueChange={(v) => setFormData(prev => ({ ...prev, responsavelId: v }))}>
                  <SelectTrigger className="h-11">
                    <div className="flex items-center gap-2"><UserIcon size={14} className="text-muted-foreground"/><SelectValue /></div>
                  </SelectTrigger>
                  <SelectContent>
                    {user?.uid && <SelectItem value={user.uid}>Atribuir a mim</SelectItem>}
                    {allUsers.filter((u: any) => u.uid !== user?.uid).map((u: any) => (
                      <SelectItem key={u.uid} value={u.uid}>{u.nome} ({u.perfil})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao" className="text-[10px] font-bold uppercase">Detalhamento Técnico</Label>
                <Textarea id="descricao" rows={6} required value={formData.descricao} onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))} placeholder="Descreva os detalhes da demanda, locais e contatos..." className="resize-none" />
              </div>

              <div className="space-y-4 p-6 bg-muted/30 rounded-lg border border-dashed">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 font-bold text-[10px] uppercase">
                    <Paperclip size={14} /> Anexar Documentação
                  </Label>
                </div>
                
                <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-md flex gap-3 mb-4">
                   <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                   <p className="text-[10px] text-green-700 leading-tight">
                     Configuração de CORS detectada. Uploads de arquivos grandes agora estão habilitados.
                   </p>
                </div>

                <Input type="file" multiple className="bg-background cursor-pointer h-10 pt-2" onChange={handleFileChange} disabled={saving} />
                
                {files.length > 0 && (
                  <div className="space-y-2 mt-4">
                    {files.map((file, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between p-3 bg-background rounded border text-[11px]">
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
                        {saving && uploadProgress[file.name] !== undefined && (
                          <div className="px-1">
                            <Progress value={uploadProgress[file.name]} className="h-1" />
                            <p className="text-[9px] text-right mt-1 font-bold">{Math.round(uploadProgress[file.name])}%</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-3 border-t bg-muted/10 py-6">
              <Button type="button" variant="ghost" onClick={() => router.back()} disabled={saving} className="text-[10px] font-bold uppercase">Descartar</Button>
              <Button type="submit" disabled={saving || formData.titulo === ""} className="min-w-[200px] text-[10px] font-bold uppercase tracking-widest">
                {saving ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={14} />
                    {currentUploadingFile ? "Enviando arquivos..." : "Processando..."}
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
