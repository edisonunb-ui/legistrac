
"use client";

import { useUser, useFirestore, useDoc, useStorage, useMemoFirebase } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useState, useEffect, useCallback } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Building2, Save, Loader2, Image as ImageIcon, CheckCircle2, X, ChevronLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function CabinetProfilePage() {
  const { user } = useUser();
  const db = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [carimboPreview, setCarimboPreview] = useState<string | null>(null);

  const userEmail = user?.email?.toLowerCase().trim();
  const profileRef = useMemoFirebase(() => (userEmail && db) ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: profile } = useDoc(profileRef);
  const cabinetId = (profile as any)?.cabinetId;

  const cabinetRef = useMemoFirebase(() => (cabinetId && db) ? doc(db, "gabinetes", cabinetId) : null, [db, cabinetId]);
  const { data: cabinet, loading: loadingCabinet } = useDoc(cabinetRef);

  useEffect(() => {
    if (cabinet?.carimboUrl) {
      setCarimboPreview(cabinet.carimboUrl);
    }
  }, [cabinet]);

  const handleCarimboChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && storage && cabinetId) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (e) => setCarimboPreview(e.target?.result as string);
      reader.readAsDataURL(file);

      setSaving(true);
      const storageRef = ref(storage, `gabinetes/${cabinetId}/carimbo_${Date.now()}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          toast({ title: "Erro no Upload", description: error.message, variant: "destructive" });
          setSaving(false);
        },
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          if (db && cabinetRef) {
            await updateDoc(cabinetRef, {
              carimboUrl: downloadUrl,
              updatedAt: serverTimestamp()
            });
            toast({ title: "Carimbo Atualizado", className: "bg-primary text-black font-black" });
          }
          setSaving(false);
          setUploadProgress(0);
        }
      );
    }
  }, [cabinetId, storage, db, cabinetRef, toast]);

  if (loadingCabinet) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar />
      <main className="container mx-auto px-4 py-8 sm:py-12">
        <header className="mb-10">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-all mb-4 text-[10px] font-black uppercase tracking-[0.3em]">
            <ChevronLeft size={16} /> Dashboard
          </Link>
          <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter text-white">Perfil do <span className="text-primary">Gabinete</span></h1>
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-1">Identidade visual e carimbos oficiais para documentos.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white/5 border-white/5 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              <CardHeader>
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <Building2 size={16} /> Dados da Instância
                </CardTitle>
                <CardDescription className="text-[9px] uppercase font-bold text-muted-foreground">Informações básicas do gabinete parlamentar.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Nome do Gabinete</Label>
                    <div className="h-12 bg-black/50 border border-white/10 rounded-md flex items-center px-4 font-black uppercase text-xs text-white/50">
                      {cabinet?.nome}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Vereador Responsável</Label>
                    <div className="h-12 bg-black/50 border border-white/10 rounded-md flex items-center px-4 font-black uppercase text-xs text-white/50">
                      {cabinet?.vereador}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/5 shadow-2xl overflow-hidden">
              <CardHeader>
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <ShieldCheck size={16} /> Carimbo e Assinatura Digital
                </CardTitle>
                <CardDescription className="text-[9px] uppercase font-bold text-muted-foreground">Esta imagem aparecerá automaticamente no final de todos os seus projetos legislativos.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8 p-10">
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-3xl p-12 bg-black/40 relative group hover:border-primary/40 transition-all">
                  {carimboPreview ? (
                    <div className="relative w-64 h-64">
                      <Image src={carimboPreview} alt="Carimbo" fill className="object-contain" />
                      <button onClick={() => setCarimboPreview(null)} className="absolute -top-4 -right-4 p-2 bg-destructive text-white rounded-full shadow-lg hover:scale-110 transition-all"><X size={16} /></button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4 text-center">
                      <div className="p-6 bg-white/5 rounded-full text-muted-foreground group-hover:text-primary transition-colors">
                        <ImageIcon size={48} />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Arraste seu carimbo ou clique para enviar</p>
                    </div>
                  )}
                  <Input type="file" accept="image/*" onChange={handleCarimboChange} className="absolute inset-0 opacity-0 cursor-pointer" disabled={saving} />
                </div>

                {saving && (
                  <div className="space-y-2">
                    <Progress value={uploadProgress} className="h-1.5 bg-white/5" />
                    <p className="text-[9px] font-black uppercase text-primary text-center">Processando Carimbo... {Math.round(uploadProgress)}%</p>
                  </div>
                )}

                <div className="p-6 bg-primary/10 rounded-2xl border border-primary/20 flex gap-4">
                  <ImageIcon size={20} className="text-primary shrink-0" />
                  <div>
                    <p className="text-[10px] text-primary font-black uppercase leading-relaxed tracking-wider">Dica Estratégica</p>
                    <p className="text-[9px] text-white/60 uppercase font-bold mt-1">Use imagens com fundo transparente (PNG) para um acabamento profissional nos documentos impressos.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-6">
            <Card className="bg-white/5 border-white/5 shadow-2xl overflow-hidden">
              <CardHeader className="bg-white/5 border-b border-white/5">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary">Informações do Sistema</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-1">
                  <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">ID do Gabinete</p>
                  <p className="text-[10px] font-mono text-white/80">{cabinetId}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Data de Ativação</p>
                  <p className="text-[10px] text-white/80">{cabinet?.createdAt?.toDate().toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
