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
import { ChevronLeft, Save, Loader2, Paperclip, X, CheckCircle2, FileText, Sparkles } from "lucide-react";
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
  const [isFinished, setIsFinished] = useState(false);

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
      
      setIsFinished(true);
      toast({ title: "Protocolado!", description: "Demanda e arquivos salvos com sucesso." });
      setTimeout(() => router.push(`/demandas/${demandId}`), 1500);
    } catch (error: any) {
      setSaving(false);
      toast({ 
        title: "Erro no Protocolo", 
        description: "Falha na transmissão dos dados.", 
        variant: "destructive" 
      });
    }
  };

  if (authLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto px-4 py-8 sm:py-12">
        <header className="mb-10">
          <Link href="/demandas" className="flex items-center gap-2 text-muted-foreground hover:text-primary mb-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all">
            <ChevronLeft size={16} /> Voltar à Central
          </Link>
          <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter text-white">Novo <span className="text-primary">Protocolo</span></h1>
        </header>

        <Card className="max-w-4xl border-white/5 bg-white/5 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-8 pt-10 text-white">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2"><Sparkles size={14} /> Título da Demanda</Label>
                <Input required value={formData.titulo} onChange={(e) => setFormData(p => ({ ...p, titulo: e.target.value }))} className="h-14 bg-white/5 border-white/10 focus:border-primary/50 text-base font-bold text-white" placeholder="Ex: Solicitação de Reparo - Bairro Industrial" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Prazo Limite</Label>
                  <Input type="date" required value={formData.prazo} onChange={(e) => setFormData(p => ({ ...p, prazo: e.target.value }))} className="h-14 bg-white/5 border-white/10 text-white font-bold" />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Prioridade</Label>
                  <Select value={formData.prioridade} onValueChange={(v: DemandPriority) => setFormData(p => ({ ...p, prioridade: v }))}>
                    <SelectTrigger className="h-14 bg-white/5 border-white/10 text-white font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-black border-white/10">
                      <SelectItem value="BAIXA">BAIXA</SelectItem>
                      <SelectItem value="MEDIA">MÉDIA</SelectItem>
                      <SelectItem value="ALTA">ALTA URGÊNCIA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Responsável</Label>
                  <Select value={formData.responsavelId} onValueChange={(v) => setFormData(p => ({ ...p, responsavelId: v }))}>
                    <SelectTrigger className="h-14 bg-white/5 border-white/10 text-white font-bold"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent className="bg-black border-white/10">
                      <SelectItem value={user?.uid || ""}>MANTER COMIGO</SelectItem>
                      {allUsers.filter((u: any) => (u.uid || u.id) !== user?.uid).map((u: any) => (
                        <SelectItem key={u.uid || u.id} value={u.uid || u.id}>{u.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Descrição Técnica</Label>
                <Textarea required rows={8} value={formData.descricao} onChange={(e) => setFormData(p => ({ ...p, descricao: e.target.value }))} className="bg-white/5 border-white/10 focus:border-primary/50 resize-none text-white leading-relaxed" placeholder="Descreva minuciosamente a solicitação..." />
              </div>

              <div className="p-8 bg-black/40 rounded-2xl border border-white/5 border-dashed space-y-6">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
                    <Paperclip size={16} /> Anexar Evidências
                  </Label>
                  <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">{files.length} DOCUMENTO(S)</span>
                </div>
                
                <div className="relative group">
                  <Input type="file" multiple onChange={handleFileChange} disabled={saving} className="bg-white/5 border-white/10 h-16 cursor-pointer file:mr-6 file:py-2 file:px-6 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-primary file:text-black hover:file:opacity-90 transition-all" />
                </div>
                
                {files.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                    {files.map((file, idx) => (
                      <div key={idx} className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col gap-3 group/item hover:border-primary/30 transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <FileText size={16} className="text-primary shrink-0" />
                            <span className="text-[10px] font-black truncate uppercase text-white/80">{file.name}</span>
                          </div>
                          {!saving && <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-destructive/20 hover:text-destructive" onClick={() => removeFile(idx)}><X size={16} /></Button>}
                        </div>
                        {uploadProgress[file.name] !== undefined && (
                          <div className="space-y-2">
                            <Progress value={uploadProgress[file.name]} className="h-1.5 bg-white/5" />
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-black text-primary uppercase">{Math.round(uploadProgress[file.name])}%</span>
                              {uploadProgress[file.name] === 100 && <CheckCircle2 size={12} className="text-green-500" />}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="bg-white/5 border-t border-white/5 p-10 flex flex-col sm:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-4">
                {saving && !isFinished && (
                  <div className="flex items-center gap-3 text-primary animate-pulse">
                    <Loader2 className="animate-spin" size={20} />
                    <span className="text-[11px] font-black uppercase tracking-[0.3em]">Criptografando e Enviando...</span>
                  </div>
                )}
                {isFinished && (
                  <div className="flex items-center gap-3 text-green-500">
                    <CheckCircle2 size={22} />
                    <span className="text-[11px] font-black uppercase tracking-[0.3em]">Protocolo Confirmado!</span>
                  </div>
                )}
              </div>
              <Button type="submit" disabled={saving || isFinished} className="bg-primary text-black font-black uppercase text-[12px] tracking-widest px-14 h-16 shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 glow-primary w-full sm:w-auto">
                {saving ? "TRANSMITINDO..." : <><Save className="mr-2" size={20} /> Abrir Protocolo</>}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}
