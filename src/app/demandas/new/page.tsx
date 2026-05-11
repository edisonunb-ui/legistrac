"use client";

import { useUser, useFirestore, useCollection, useDoc, useStorage, useMemoFirebase } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useState, useMemo, useEffect, useRef } from "react";
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
  const hasInitialized = useRef(false);
  
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

  const userEmail = user?.email?.toLowerCase().trim() || null;
  
  const profileRef = useMemoFirebase(() => (userEmail && db) ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: profile } = useDoc(profileRef);

  const cabinetId = (profile as any)?.cabinetId;

  useEffect(() => {
    if (user?.uid && !hasInitialized.current) {
      setFormData(prev => ({ ...prev, responsavelId: user.uid }));
      hasInitialized.current = true;
    }
  }, [user?.uid]);

  const usersQuery = useMemoFirebase(() => {
    if (!db || !cabinetId) return null;
    return query(collection(db, "users"), where("cabinetId", "==", cabinetId));
  }, [db, cabinetId]);
  
  const { data: allUsers = [] } = useCollection(usersQuery);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

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
    if (!user || !db || !cabinetId) {
      toast({ title: "Erro", description: "Dados do gabinete não carregados.", variant: "destructive" });
      return;
    }
    
    setSaving(true);
    try {
      const attachments = await uploadFiles();
      
      const demandId = await createDemand(db, user.uid, {
        cabinetId,
        ...formData,
        responsavelId: formData.responsavelId || user.uid,
        anexos: attachments
      });
      
      toast({ title: "Sucesso!", description: "Demanda registrada com sucesso." });
      router.push(`/demandas/${demandId}`);
    } catch (error: any) {
      console.error("Submit error:", error);
      toast({
        title: "Falha no Envio",
        description: "Verifique sua conexão e se o arquivo não excede os limites.",
        variant: "destructive",
      });
      setSaving(false);
      setCurrentUploadingFile(null);
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <Link href="/demandas" className="flex items-center gap-2 text-muted-foreground hover:text-primary mb-4 w-fit text-sm font-medium">
            <ChevronLeft size={16} /> Voltar para lista
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Nova Demanda</h1>
        </header>

        <Card className="max-w-3xl border-primary/10 shadow-xl overflow-hidden">
          <form onSubmit={handleSubmit}>
            <CardHeader className="bg-primary/5">
              <CardTitle className="text-lg font-bold">Dados da Solicitação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título</Label>
                <Input id="titulo" required value={formData.titulo} onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))} placeholder="Resumo curto da demanda" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="prazo">Prazo Fatal</Label>
                  <Input id="prazo" type="date" required value={formData.prazo} onChange={(e) => setFormData(prev => ({ ...prev, prazo: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prioridade">Prioridade</Label>
                  <Select value={formData.prioridade} onValueChange={(v: DemandPriority) => setFormData(prev => ({ ...prev, prioridade: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BAIXA">Baixa</SelectItem>
                      <SelectItem value="MEDIA">Média</SelectItem>
                      <SelectItem value="ALTA">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Responsável Atual</Label>
                <Select value={formData.responsavelId} onValueChange={(v) => setFormData(prev => ({ ...prev, responsavelId: v }))}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2"><UserIcon size={14} className="text-primary"/><SelectValue /></div>
                  </SelectTrigger>
                  <SelectContent>
                    {user?.uid && <SelectItem value={user.uid}>Atribuir a mim</SelectItem>}
                    {allUsers.filter((u: any) => (u.uid || u.id) && (u.uid || u.id) !== user?.uid).map((u: any) => (
                      <SelectItem key={u.uid || u.id} value={u.uid || u.id}>{u.nome} ({u.perfil})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição Detalhada</Label>
                <Textarea id="descricao" rows={4} required value={formData.descricao} onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))} placeholder="Explique detalhadamente o que precisa ser feito..." />
              </div>

              <div className="space-y-4 p-4 bg-primary/5 rounded-xl border-2 border-dashed border-primary/20">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-primary font-bold text-xs uppercase">
                    <Paperclip size={14} /> Anexos (Fotos e Documentos)
                  </Label>
                  <span className="text-[10px] text-muted-foreground uppercase">PDF, PNG, JPG até 5MB</span>
                </div>
                <Input 
                  type="file" 
                  multiple 
                  className="bg-background cursor-pointer h-9 text-xs" 
                  onChange={handleFileChange}
                />
                
                {files.length > 0 && (
                  <div className="space-y-2 mt-4">
                    {files.map((file, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between p-2 bg-background rounded-lg border border-primary/10 text-[10px]">
                          <div className="flex items-center gap-2 truncate">
                            <FileText size={12} className="text-primary" />
                            <span className="truncate font-medium">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                          </div>
                          {!saving && (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className="h-5 w-5 p-0 text-destructive hover:bg-destructive/10"
                              onClick={() => removeFile(idx)}
                            >
                              <X size={12} />
                            </Button>
                          )}
                        </div>
                        {saving && uploadProgress[file.name] !== undefined && (
                          <div className="px-1">
                            <Progress value={uploadProgress[file.name]} className="h-1" />
                            <p className="text-[8px] text-right mt-1 font-bold text-primary">{Math.round(uploadProgress[file.name])}%</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-3 bg-muted/20 pt-6">
              <Button type="button" variant="ghost" onClick={() => router.back()} disabled={saving}>Cancelar</Button>
              <Button type="submit" disabled={saving || formData.titulo === ""} className="min-w-[160px] font-bold shadow-lg shadow-primary/10">
                {saving ? (
                  <>
                    <Loader2 className="animate-spin mr-2" />
                    {currentUploadingFile ? `Enviando ${currentUploadingFile.substring(0, 10)}...` : "Salvando..."}
                  </>
                ) : (
                  <>
                    <Save className="mr-2" size={18} /> Registrar Demanda
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {saving && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="max-w-xs w-full">
              <CardContent className="pt-6 text-center space-y-4">
                <Loader2 className="animate-spin h-8 w-8 mx-auto text-primary" />
                <div className="space-y-1">
                  <h3 className="font-bold">Processando Demanda</h3>
                  <p className="text-xs text-muted-foreground">Estamos enviando seus arquivos para a pasta digital do gabinete.</p>
                </div>
                {currentUploadingFile && (
                  <div className="p-3 bg-muted rounded-lg text-left">
                    <p className="text-[10px] font-bold uppercase mb-1">Enviando:</p>
                    <p className="text-xs truncate font-mono">{currentUploadingFile}</p>
                    <Progress value={uploadProgress[currentUploadingFile] || 0} className="h-1 mt-2" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
