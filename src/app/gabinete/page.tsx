
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
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Building2, Save, Loader2, Image as ImageIcon, CheckCircle2, X, ChevronLeft, ShieldCheck, Award, Sparkles, Maximize, Type } from "lucide-react";
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
  const [scale, setScale] = useState(1);
  const [devName, setDevName] = useState("");

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
    if (isSuperAdmin && globalConfig) {
      setCarimboPreview(globalConfig.developerLogoUrl || null);
      setScale(globalConfig.developerLogoScale || 1);
      setDevName(globalConfig.developerName || "");
    } else if (cabinet) {
      setCarimboPreview(cabinet.carimboUrl || null);
      setScale(cabinet.carimboScale || 1);
    }
  }, [cabinet, isSuperAdmin, globalConfig]);

  const handleSaveDevName = async () => {
    if (!db || !isSuperAdmin) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "config", "global"), {
        developerName: devName,
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast({ title: "Texto Atualizado", description: "Sua marca registrada foi salva." });
    } catch (e) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleScaleChange = async (val: number[]) => {
    const newScale = val[0];
    setScale(newScale);
    
    if (!db) return;
    
    try {
      if (isSuperAdmin) {
        await setDoc(doc(db, "config", "global"), {
          developerLogoScale: newScale,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } else if (cabinetRef) {
        await updateDoc(cabinetRef, {
          carimboScale: newScale,
          updatedAt: serverTimestamp()
        });
      }
    } catch (e) {
      console.error("Erro ao salvar escala:", e);
    }
  };

  const handleCarimboChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && storage && db) {
      const file = e.target.files[0];
      
      const reader = new FileReader();
      reader.onload = (ev) => setCarimboPreview(ev.target?.result as string);
      reader.readAsDataURL(file);

      setSaving(true);
      
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
            await setDoc(doc(db, "config", "global"), {
              developerLogoUrl: downloadUrl,
              updatedAt: serverTimestamp()
            }, { merge: true });
            
            toast({ 
              title: "Logomarca Atualizada", 
              description: "A marca oficial do sistema foi salva.",
              className: "bg-primary text-black font-black"
            });
          } else if (cabinetRef) {
            await updateDoc(cabinetRef, {
              carimboUrl: downloadUrl,
              updatedAt: serverTimestamp()
            });
            toast({ 
              title: "Identidade Configurada", 
              description: "A logomarca do gabinete foi salva.",
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
            Logomarca do <span className="text-primary">Sistema</span>
          </h1>
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-1">
            Esta imagem será usada como a identidade visual (branding) de todo o projeto.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white/5 border-white/5 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              <CardHeader>
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <Sparkles size={16} /> Visualização da Marca
                </CardTitle>
                <CardDescription className="text-[9px] uppercase font-bold text-muted-foreground">
                  Ajuste o zoom para que apenas a parte redonda da sua logo preencha o espaço abaixo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-10 p-10">
                <div className="flex flex-col items-center gap-12">
                  <div className="flex flex-col items-center justify-center border-none rounded-full w-72 h-72 sm:w-80 sm:h-80 mx-auto bg-black/40 relative group overflow-hidden cursor-pointer">
                    {carimboPreview ? (
                      <div className="relative w-full h-full p-0">
                        <div 
                          className="relative w-full h-full transition-transform duration-200"
                          style={{ transform: `scale(${scale})` }}
                        >
                          <Image 
                            src={carimboPreview} 
                            alt="Preview Marca" 
                            fill 
                            className="object-cover" 
                          />
                        </div>
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-20">
                          <p className="text-[10px] font-black uppercase text-white">Trocar Logomarca</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4 text-center p-8">
                        <div className="p-6 bg-white/5 rounded-full text-muted-foreground group-hover:text-primary transition-colors">
                          <ImageIcon size={48} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Clique para enviar</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleCarimboChange} 
                      className="absolute inset-0 opacity-0 cursor-pointer z-30" 
                      disabled={saving} 
                    />
                  </div>

                  {carimboPreview && (
                    <div className="w-full max-w-sm space-y-4 bg-black/30 p-6 rounded-2xl border border-white/5">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                          <Maximize size={14} /> Ajuste de Escala (Zoom)
                        </Label>
                        <span className="text-[10px] font-mono text-white font-bold">{scale.toFixed(1)}x</span>
                      </div>
                      <Slider 
                        value={[scale]} 
                        onValueChange={handleScaleChange} 
                        min={0.5} 
                        max={5} 
                        step={0.1}
                        className="py-4"
                      />
                      <p className="text-[8px] text-muted-foreground uppercase font-bold text-center">Aumente o zoom para esconder as bordas brancas da sua imagem.</p>
                    </div>
                  )}
                </div>

                {saving && (
                  <div className="max-w-xs mx-auto space-y-2">
                    <Progress value={uploadProgress} className="h-1.5 bg-white/5" />
                    <p className="text-[9px] font-black uppercase text-primary text-center">Processando... {Math.round(uploadProgress)}%</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-6">
            {isSuperAdmin && (
              <Card className="bg-white/5 border-white/5 shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                <CardHeader>
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Type size={16} /> Texto da Propaganda
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">O que aparecerá no Dashboard</Label>
                    <Input 
                      value={devName} 
                      onChange={e => setDevName(e.target.value)} 
                      placeholder="Ex: Nunes Informática" 
                      className="bg-black/50 border-white/10 text-white"
                    />
                  </div>
                  <Button 
                    onClick={handleSaveDevName} 
                    disabled={saving}
                    className="w-full bg-primary text-black font-black uppercase text-[10px] tracking-widest h-10 glow-primary"
                  >
                    {saving ? <Loader2 className="animate-spin" /> : <><Save className="mr-2" size={14} /> Atualizar Texto</>}
                  </Button>
                </CardContent>
              </Card>
            )}

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
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
