"use client";

import { useUser, useFirestore, useCollection, useStorage } from "@/firebase";
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
import { ChevronLeft, Save, Loader2, User as UserIcon, Paperclip, X, FileText } from "lucide-react";
import Link from "next/link";
import { DemandPriority, Attachment } from "@/lib/types";
import { collection, query, Timestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

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
  const [uploadStatus, setUploadStatus] = useState<{ current: number, total: number } | null>(null);

  useEffect(() => {
    if (user?.uid && !hasInitialized.current) {
      setFormData(prev => ({ ...prev, responsavelId: user.uid }));
      hasInitialized.current = true;
    }
  }, [user]);

  const usersQuery = useMemo(() => (db && user) ? query(collection(db, "users")) : null, [db, user]);
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
    if (files.length === 0) return [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadStatus({ current: i + 1, total: files.length });
      
      const storagePath = `demandas/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      
      console.log(`Iniciando upload de: ${file.name}`);

      try {
        const uploadTask = uploadBytesResumable(storageRef, file);
        
        const url = await new Promise<string>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            null,
            (error) => {
              console.error("Erro no upload task:", error);
              reject(error);
            },
            async () => {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadUrl);
            }
          );
        });
        
        attachments.push({
          id: Math.random().toString(36).substring(7),
          nome: file.name,
          url: url,
          tipo: file.type,
          tamanho: file.size,
          data: Timestamp.now(),
          enviadoPor: user?.uid || "anonimo"
        });
        console.log(`Upload concluído: ${file.name}`);
      } catch (err: any) {
        console.error(`Falha fatal no arquivo ${file.name}:`, err);
        throw new Error(`O Storage do Firebase pode estar desativado ou sem permissão. Erro: ${err.message}`);
      }
    }

    return attachments;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db) return;
    
    setSaving(true);
    try {
      const attachments = await uploadFiles();
      
      const demandId = await createDemand(db, user.uid, {
        ...formData,
        responsavelId: formData.responsavelId || user.uid,
        anexos: attachments
      });
      
      toast({ title: "Sucesso!", description: "Demanda e anexos registrados." });
      router.push(`/demandas/${demandId}`);
    } catch (error: any) {
      console.error("Erro completo ao salvar:", error);
      toast({
        title: "Falha no Envio",
        description: error.message || "Verifique se o Storage está ativo no Firebase Console.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setUploadStatus(null);
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <Link href="/demandas" className="flex items-center gap-2 text-muted-foreground hover:text-primary mb-4 w-fit text-sm font-medium">
            <ChevronLeft size={16} /> Voltar para lista
          </Link>
          <h1 className="text-3xl font-headline font-bold">Nova Demanda</h1>
        </header>

        <Card className="max-w-3xl border-none shadow-xl">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Dados da Solicitação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título</Label>
                <Input id="titulo" required value={formData.titulo} onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))} />
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
                    <div className="flex items-center gap-2"><UserIcon size={14} /><SelectValue /></div>
                  </SelectTrigger>
                  <SelectContent>
                    {user?.uid && <SelectItem value={user.uid}>Atribuir a mim</SelectItem>}
                    {allUsers.filter((u: any) => u.uid && u.uid !== user?.uid).map((u: any) => (
                      <SelectItem key={u.uid} value={u.uid}>{u.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição Detalhada</Label>
                <Textarea id="descricao" rows={4} required value={formData.descricao} onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))} />
              </div>

              <div className="space-y-3 p-4 bg-muted/20 rounded-xl border-2 border-dashed border-muted">
                <Label className="flex items-center gap-2 text-primary font-bold">
                  <Paperclip size={16} /> Anexos (Fotos e Documentos)
                </Label>
                <Input 
                  type="file" 
                  multiple 
                  className="bg-background cursor-pointer" 
                  onChange={handleFileChange}
                />
                
                {files.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                    {files.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-background rounded-lg border text-xs animate-in fade-in zoom-in-95">
                        <div className="flex items-center gap-2 truncate">
                          <FileText size={14} className="text-muted-foreground" />
                          <span className="truncate font-medium">{file.name}</span>
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                          onClick={() => removeFile(idx)}
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-3 bg-muted/30 pt-6">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="min-w-[140px]">
                {saving ? (
                  <>
                    <Loader2 className="animate-spin mr-2" />
                    {uploadStatus 
                      ? `Enviando ${uploadStatus.current} de ${uploadStatus.total}...` 
                      : "Salvando..."}
                  </>
                ) : (
                  <>
                    <Save className="mr-2" /> Registrar Demanda
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
