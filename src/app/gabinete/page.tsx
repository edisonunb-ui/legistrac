
"use client";

import { useUser, useFirestore, useDoc, useStorage, useMemoFirebase } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useState, useEffect, useCallback } from "react";
import { doc, updateDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Building2, Save, Loader2, Image as ImageIcon, CheckCircle2, X, ChevronLeft, ShieldCheck, Award, Sparkles } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { GlobalConfig } from "@/lib/types";

const MASTER_EMAIL = "edisonunb@gmail.com";

export default function CabinetProfilePage() {
  const { user } = useUser();
  const db = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [carimboPreview, setCarimboPreview] = useState<string | null>(null);

  const userEmail = user?.email?.toLowerCase().trim();
  const isSuperAdmin = userEmail === MASTER_EMAIL;

  const profileRef = useMemoFirebase(() => (userEmail && db) ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: profile } = useDoc(profileRef);
  const cabinetId = (profile as any)?.cabinetId;

  const cabinetRef = useMemoFirebase(() => (cabinetId && db) ? doc(db, "gabinetes", cabinetId) : null, [db, cabinetId]);
  const { data: cabinet, loading: loadingCabinet } = useDoc(cabinetRef);

  const globalConfigRef = useMemoFirebase(() => (db) ? doc(db, "config", "global") : null, [db]);
  const { data: globalConfig } = useDoc<GlobalConfig>(globalConfigRef);

  useEffect(() => {
    if (isSuperAdmin && globalConfig?.developerLogoUrl) {
      setCarimboPreview(globalConfig.developerLogoUrl);
    } else if (cabinet?.carimboUrl) {
      setCarimboPreview(cabinet.carimboUrl);
    }
  }, [cabinet, isSuperAdmin, globalConfig]);

  const handleCarimboChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && storage && db) {
      const file = e.target.files[0];
      
      // Preview local imediato
      const reader = new FileReader();
      reader.onload = (ev) => setCarimboPreview(ev.target?.result as string);
      reader.readAsDataURL(file);

      setSaving(true);
      
      // Caminho do Storage: Se for Master, salva na marca global. Se for gabinete, na pasta do gabinete.
      const storagePath = isSuperAdmin 
        ? `developer/branding_signature` 
        : `gabinetes/${cabinetId}/carimbo_oficial`;
        
      const storageRef = ref(storage, storagePath);
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
          
          if (isSuperAdmin) {
            // Atualiza Marca Registrada Global
            await setDoc(doc(db, "config", "global"), {
              developerLogoUrl: downloadUrl,
              developerName: "POWERED BY DEV SIGNATURE",
              updatedAt: serverTimestamp()
            }, { merge: true });
            
            toast({ 
              title: "Assinatura de Marca Registrada", 
              description: "Sua logomarca de desenvolvedor agora é a identidade global do sistema.",
              className: "bg-primary text-black font-black"
            });
          } else if (cabinetRef) {
            // Atualiza Carimbo do Gabinete
            await updateDoc(cabinetRef, {
              carimboUrl: downloadUrl,
              updatedAt: serverTimestamp()
            });
            toast({ 
              title: "Carimbo Configurado", 
              description: "Sua assinatura redonda agora aparecerá nos documentos.",
              className: "bg-primary text-black font-black" 
            });
          }
          
          setSaving(false);
          setUploadProgress(0);
        }
      );
    }
  }, [cabinetId, storage, db, cabinetRef, toast, isSuperAdmin]);

  if (loadingCabinet && !isSuperAdmin) {
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
          <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter text-white">
            {isSuperAdmin ? "Assinatura de " : "Perfil do "} 
            <span className="text-primary">{isSuperAdmin ? "Marca Registrada" : "Gabinete"}</span>
          </h1>
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-1">
            {isSuperAdmin ? "Defina a logomarca que aparecerá em todos os seus sistemas." : "Configure o seu carimbo de assinatura oficial."}
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white/5 border-white/5 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              <CardHeader>
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  {isSuperAdmin ? <Sparkles size={16} /> : <ShieldCheck size={16} />}
                  {isSuperAdmin ? "Logomarca do Desenvolvedor (Branding)" : "Carimbo Oficial (Selo de Assinatura)"}
                </CardTitle>
                <CardDescription className="text-[9px] uppercase font-bold text-muted-foreground">
                  {isSuperAdmin 
                    ? "Sua imagem aparecerá como assinatura de autor (propaganda) em todo o sistema."
                    : "Envie sua imagem redonda aqui. Ela será usada como selo de autenticidade no Inteiro Teor dos projetos."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8 p-10">
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-full w-80 h-80 mx-auto bg-black/40 relative group hover:border-primary/40 transition-all overflow-hidden cursor-pointer">
                  {carimboPreview ? (
                    <div className="relative w-full h-full p-4">
                      <Image 
                        src={carimboPreview} 
                        alt="Preview Carimbo" 
                        fill 
                        className="object-contain" 
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <p className="text-[10px] font-black uppercase text-white">Trocar Imagem</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4 text-center p-8">
                      <div className="p-6 bg-white/5 rounded-full text-muted-foreground group-hover:text-primary transition-colors">
                        {isSuperAdmin ? <Sparkles size={48} /> : <Award size={48} />}
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Clique para enviar seu carimbo redondo</p>
                    </div>
                  )}
                  <Input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleCarimboChange} 
                    className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                    disabled={saving} 
                  />
                </div>

                {saving && (
                  <div className="max-w-xs mx-auto space-y-2">
                    <Progress value={uploadProgress} className="h-1.5 bg-white/5" />
                    <p className="text-[9px] font-black uppercase text-primary text-center">Processando Selo... {Math.round(uploadProgress)}%</p>
                  </div>
                )}

                <div className="p-6 bg-primary/10 rounded-2xl border border-primary/20 flex gap-4">
                  <Award size={20} className="text-primary shrink-0" />
                  <div>
                    <p className="text-[10px] text-primary font-black uppercase leading-relaxed tracking-wider">Instrução Visual</p>
                    <p className="text-[9px] text-white/60 uppercase font-bold mt-1">Para o melhor resultado, envie uma imagem com fundo transparente (PNG). O sistema irá posicionar o carimbo automaticamente no layout e nos ofícios.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-6">
            <Card className="bg-white/5 border-white/5 shadow-2xl overflow-hidden">
              <CardHeader className="bg-white/5 border-b border-white/5">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary">Status do Perfil</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-1">
                  <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Usuário Logado</p>
                  <p className="text-[10px] font-bold uppercase text-white/80">{profile?.nome || "Super Administrador"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Nível de Acesso</p>
                  <Badge className="bg-primary text-black font-black text-[8px] uppercase tracking-tighter">
                    {isSuperAdmin ? "DESENVOLVEDOR MASTER" : (profile?.perfil || "ASSESSOR")}
                  </Badge>
                </div>
                {!isSuperAdmin && (
                  <div className="space-y-1">
                    <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Titular do Gabinete</p>
                    <p className="text-[10px] font-bold uppercase text-white/80">{cabinet?.vereador}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
