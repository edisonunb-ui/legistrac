
"use client";

import { useUser, useFirestore, useDoc, useMemoFirebase, useStorage } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp, doc, Timestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Save, Loader2, Gavel, FileText, Link as LinkIcon, Paperclip, X, CheckCircle2, FileUp, Wand2 } from "lucide-react";
import Link from "next/link";
import { Attachment } from "@/lib/types";

export default function NewLegislativeActionPage() {
  const { user } = useUser();
  const db = useFirestore();
  const storage = useStorage();
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  const [formData, setFormData] = useState({
    tipo: "INDICACAO" as any,
    titulo: "",
    ementa: "",
    conteudo: "",
    numero: "",
    ano: new Date().getFullYear().toString(),
    status: "ELABORACAO" as any,
    linkOficial: "",
  });

  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  const userEmail = user?.email?.toLowerCase().trim();
  const profileRef = useMemoFirebase(() => (userEmail && db) ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: profile } = useDoc(profileRef);
  const cabinetId = (profile as any)?.cabinetId;

  const extractTextFromDocx = async (file: File) => {
    setIsParsing(true);
    try {
      // Importação dinâmica para evitar erro de módulo no Turbopack/Next.js
      const mammoth = await import("mammoth");
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      if (result.value) {
        setFormData(prev => ({
          ...prev,
          conteudo: result.value,
          titulo: prev.titulo || file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ")
        }));
        toast({ 
          title: "Texto Importado", 
          description: "O conteúdo do Word foi extraído para o campo de texto.",
          className: "bg-primary text-black"
        });
      }
    } catch (error) {
      console.error("Erro ao extrair texto do DOCX:", error);
      toast({ title: "Erro na Importação", description: "Não foi possível ler o texto deste arquivo Word.", variant: "destructive" });
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);

      const firstFile = selectedFiles[0];
      if (firstFile.name.toLowerCase().endsWith('.docx')) {
        extractTextFromDocx(firstFile);
      }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user || !cabinetId || saving) {
      toast({ title: "Erro", description: "Verifique os dados e tente novamente.", variant: "destructive" });
      return;
    }
    setSaving(true);

    try {
      const attachments = await uploadFiles();
      
      await addDoc(collection(db, "legislativo"), {
        cabinetId: cabinetId,
        tipo: formData.tipo,
        titulo: formData.titulo,
        ementa: formData.ementa,
        conteudo: formData.conteudo,
        numero: formData.numero || null,
        ano: parseInt(formData.ano),
        status: formData.status,
        linkOficial: formData.linkOficial || null,
        dataCriacao: serverTimestamp(),
        criadoPor: user.uid,
        anexos: attachments
      });

      setIsFinished(true);
      toast({ title: "Ação Registrada!", description: "O documento e modelos foram salvos com sucesso." });
      setTimeout(() => router.push("/legislativo"), 1500);
    } catch (e: any) {
      console.error(e);
      setSaving(false);
      toast({ title: "Erro", description: e.message || "Falha ao salvar ação legislativa.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar />
      <main className="container mx-auto px-4 py-8 sm:py-12">
        <header className="mb-10">
          <Link href="/legislativo" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-all mb-4 text-[10px] font-black uppercase tracking-[0.3em]">
            <ChevronLeft size={16} /> Voltar ao Legislativo
          </Link>
          <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter text-white">
            Nova Ação <span className="text-primary">Legislativa</span>
          </h1>
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-1">Elaboração de documentos oficiais e gestão de modelos Word.</p>
        </header>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white/5 border-white/5 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              <CardHeader>
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <FileText size={16} /> Conteúdo do Documento
                </CardTitle>
                <CardDescription className="text-[9px] uppercase font-bold text-muted-foreground">Preencha os detalhes técnicos ou anexe um modelo pronto abaixo.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Título da Ação</Label>
                  <Input required value={formData.titulo} onChange={e => setFormData(p => ({ ...p, titulo: e.target.value }))} className="bg-black/50 border-white/10 text-white h-12 font-bold" placeholder="Ex: Reforma da Praça Central" />
                </div>

                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Ementa (Resumo)</Label>
                  <Textarea required value={formData.ementa} onChange={e => setFormData(p => ({ ...p, ementa: e.target.value }))} className="bg-black/50 border-white/10 text-white min-h-[100px] text-xs leading-relaxed" placeholder="Breve resumo do que se trata esta ação..." />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Corpo do Texto (Inteiro Teor)</Label>
                    {isParsing && (
                      <span className="flex items-center gap-2 text-[8px] font-black text-primary animate-pulse uppercase">
                        <Loader2 className="animate-spin" size={10} /> Importando do Word...
                      </span>
                    )}
                  </div>
                  <Textarea value={formData.conteudo} onChange={e => setFormData(p => ({ ...p, conteudo: e.target.value }))} className="bg-black/50 border-white/10 text-white min-h-[350px] text-xs font-mono leading-relaxed" placeholder="Redija aqui o texto completo ou descreva que o conteúdo está no anexo..." />
                </div>

                <div className="p-8 bg-black/40 rounded-2xl border border-white/5 border-dashed space-y-6">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
                      <FileUp size={16} /> Enviar Modelo (Word / PDF)
                    </Label>
                    <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">{files.length} MODELO(S)</span>
                  </div>
                  
                  <div className="relative group">
                    <Input type="file" multiple onChange={handleFileChange} disabled={saving || isParsing} className="bg-white/5 border-white/10 h-20 cursor-pointer file:mr-6 file:py-3 file:px-8 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-primary file:text-black hover:file:opacity-90 transition-all" />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-20 group-hover:opacity-100 transition-opacity">
                      <Wand2 size={24} className="text-primary" />
                    </div>
                  </div>

                  <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 flex gap-3">
                    <Wand2 size={16} className="text-primary shrink-0 mt-0.5" />
                    <p className="text-[10px] text-primary font-black uppercase leading-relaxed tracking-wider">
                      Dica: Ao selecionar um arquivo .DOCX, o sistema tentará extrair o texto automaticamente para o campo acima.
                    </p>
                  </div>
                  
                  {files.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                      {files.map((file, idx) => (
                        <div key={idx} className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col gap-3 group/item hover:border-primary/40 transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <Paperclip size={16} className="text-primary shrink-0" />
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
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-white/5 border-white/5 shadow-2xl overflow-hidden">
              <CardHeader className="bg-white/5 border-b border-white/5">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <Gavel size={16} /> Dados Oficiais
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-8 space-y-6">
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Tipo de Documento</Label>
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
                    <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Número</Label>
                    <Input value={formData.numero} onChange={e => setFormData(p => ({ ...p, numero: e.target.value }))} className="bg-black/50 border-white/10 text-white h-12 font-bold" placeholder="000/24" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Ano</Label>
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
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Link Oficiais (Câmara)</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/50" size={14} />
                    <Input value={formData.linkOficial} onChange={e => setFormData(p => ({ ...p, linkOficial: e.target.value }))} className="pl-10 bg-black/50 border-white/10 text-white h-12 text-xs" placeholder="URL da Câmara..." />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-white/5 p-8">
                <Button type="submit" disabled={saving || isFinished || isParsing} className="w-full bg-primary text-black font-black uppercase text-[11px] tracking-widest h-14 glow-primary">
                  {saving ? <Loader2 className="animate-spin" /> : isFinished ? <CheckCircle2 /> : <><Save className="mr-2" size={18} /> Salvar Documento</>}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </form>
      </main>
    </div>
  );
}
