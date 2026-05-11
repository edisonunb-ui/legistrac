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
import { ChevronLeft, Save, Loader2, Paperclip, X, AlertCircle } from "lucide-react";
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
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const uploadFiles = async (): Promise<Attachment[]> => {
    const attachments: Attachment[] = [];
    if (files.length === 0 || !storage) return [];

    for (const file of files) {
      const sanitizedName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
      const storageRef = ref(storage, `demandas/${Date.now()}_${sanitizedName}`);
      
      const uploadTask = uploadBytesResumable(storageRef, file);

      const downloadUrl = await new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
          },
          (error) => {
            console.error("Upload Error:", error);
            reject(new Error(`Erro ao enviar ${file.name}. Verifique se as Regras de Storage foram publicadas.`));
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
      
      toast({ title: "Sucesso!", description: "Demanda registrada com sucesso." });
      router.push(`/demandas/${demandId}`);
    } catch (error: any) {
      setSaving(false);
      toast({
        title: "Erro no Processamento",
        description: error.message || "Verifique sua conexão e se as regras de Storage foram publicadas.",
        variant: "destructive",
      });
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <Link href="/demandas" className="flex items-center gap-2 text-muted-foreground hover:text-primary mb-2 text-xs font-bold uppercase tracking-widest">
            <ChevronLeft size={16} /> Voltar
          </Link>
          <h1 className="text-3xl font-black uppercase tracking-tighter">Protocolo de <span className="text-primary">Demanda</span></h1>
        </header>

        <Card className="max-w-4xl border-slate-900 bg-card shadow-2xl">
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6 pt-8">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Título</Label>
                <Input required value={formData.titulo} onChange={(e) => setFormData(p => ({ ...p, titulo: e.target.value }))} className="h-12 bg-slate-950 border-slate-900" placeholder="Título da solicitação" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Prazo</Label>
                  <Input type="date" required value={formData.prazo} onChange={(e) => setFormData(p => ({ ...p, prazo: e.target.value }))} className="h-12 bg-slate-950 border-slate-900" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Prioridade</Label>
                  <Select value={formData.prioridade} onValueChange={(v: DemandPriority) => setFormData(p => ({ ...p, prioridade: v }))}>
                    <SelectTrigger className="h-12 bg-slate-950 border-slate-900"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BAIXA">Baixa</SelectItem>
                      <SelectItem value="MEDIA">Média</SelectItem>
                      <SelectItem value="ALTA">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Atribuir Responsável</Label>
                  <Select value={formData.responsavelId} onValueChange={(v) => setFormData(p => ({ ...p, responsavelId: v }))}>
                    <SelectTrigger className="h-12 bg-slate-950 border-slate-900"><SelectValue placeholder="Selecione..." /></SelectTrigger>
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
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Descrição</Label>
                <Textarea required rows={5} value={formData.descricao} onChange={(e) => setFormData(p => ({ ...p, descricao: e.target.value }))} className="bg-slate-950 border-slate-900" />
              </div>

              <div className="p-6 bg-slate-950/50 rounded-xl border border-slate-900 border-dashed space-y-4">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <Paperclip size={14} /> Anexar PDF ou Imagens
                </Label>
                <Input type="file" multiple onChange={handleFileChange} disabled={saving} className="bg-slate-900 border-slate-800" />
                
                {files.length > 0 && (
                  <div className="space-y-2">
                    {files.map((file, idx) => (
                      <div key={idx} className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs truncate">{file.name}</span>
                          {!saving && <Button type="button" variant="ghost" size="sm" onClick={() => removeFile(idx)}><X size={14} /></Button>}
                        </div>
                        {uploadProgress[file.name] !== undefined && (
                          <div className="space-y-1">
                            <Progress value={uploadProgress[file.name]} className="h-1" />
                            <p className="text-[9px] font-bold text-primary">{Math.round(uploadProgress[file.name])}% Enviado</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex items-start gap-2 p-3 bg-primary/5 rounded border border-primary/10">
                  <AlertCircle size={14} className="text-primary mt-0.5" />
                  <p className="text-[9px] text-muted-foreground uppercase leading-relaxed">
                    Se o upload falhar, vá ao Console do Firebase {' > '} Storage {' > '} Rules e clique em "Publish".
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-900/30 border-t border-slate-900 p-8 flex justify-end gap-4">
              <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest px-10 h-12 shadow-xl shadow-primary/10">
                {saving ? <><Loader2 className="animate-spin mr-2" /> Enviando...</> : <><Save className="mr-2" /> Salvar Protocolo</>}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}