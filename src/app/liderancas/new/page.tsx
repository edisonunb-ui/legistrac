"use client";

import { useUser, useFirestore, useDoc } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp, doc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Save, Loader2, Users } from "lucide-react";
import Link from "next/link";

export default function NewLeaderPage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    nome: "",
    bairro: "",
    contato: "",
    potencialVotos: "",
    influencia: "MEDIA",
    status: "ATIVO"
  });

  const userEmail = user?.email?.toLowerCase().trim();
  const profileRef = useMemo(() => (userEmail && db) ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: profile } = useDoc(profileRef);
  const cabinetId = (profile as any)?.cabinetId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user || !cabinetId) {
      toast({ title: "Erro", description: "Dados de gabinete não identificados.", variant: "destructive" });
      return;
    }
    setSaving(true);

    try {
      await addDoc(collection(db, "liderancas"), {
        ...formData,
        cabinetId: cabinetId,
        potencialVotos: Number(formData.potencialVotos) || 0,
        dataCriacao: serverTimestamp(),
        criadoPor: user.uid
      });
      toast({ title: "Liderança Mapeada!", description: "Dados salvos com sucesso na base estratégica." });
      router.push("/liderancas");
    } catch (e) {
      toast({ title: "Erro", description: "Falha ao salvar liderança.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar />
      <main className="container mx-auto px-4 py-8 sm:py-12">
        <header className="mb-10">
          <Link href="/liderancas" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-all mb-4 text-[10px] font-black uppercase tracking-[0.3em]">
            <ChevronLeft size={16} /> Voltar ao Mapa
          </Link>
          <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter text-white">Novo Líder <span className="text-primary">Estratégico</span></h1>
        </header>

        <Card className="max-w-3xl border-white/5 bg-white/5 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <form onSubmit={handleSubmit}>
            <CardHeader className="border-b border-white/5 bg-white/5 px-8 py-6">
              <CardTitle className="text-[11px] font-black uppercase tracking-[0.4em] flex items-center gap-3 text-primary">
                <Users size={16} /> Perfil da Liderança
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8 p-10">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Nome Completo</Label>
                <Input required value={formData.nome} onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))} className="h-14 bg-black/50 border-white/10 text-white font-bold" placeholder="EX: JOÃO DA SILVA" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Bairro/Região</Label>
                  <Input required value={formData.bairro} onChange={e => setFormData(p => ({ ...p, bairro: e.target.value }))} className="h-14 bg-black/50 border-white/10 text-white font-bold" placeholder="EX: CENTRO" />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Contato (WhatsApp)</Label>
                  <Input required value={formData.contato} onChange={e => setFormData(p => ({ ...p, contato: e.target.value }))} className="h-14 bg-black/50 border-white/10 text-white font-bold" placeholder="(00) 00000-0000" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Potencial de Votos (Estimativa)</Label>
                  <Input 
                    type="number" 
                    required 
                    value={formData.potencialVotos} 
                    onChange={e => setFormData(p => ({ ...p, potencialVotos: e.target.value }))} 
                    className="h-14 bg-black/50 border-white/10 text-white font-bold" 
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Grau de Influência</Label>
                  <Select value={formData.influencia} onValueChange={v => setFormData(p => ({ ...p, influencia: v }))}>
                    <SelectTrigger className="h-14 bg-black/50 border-white/10 text-white font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black border-white/10">
                      <SelectItem value="ALTA">ALTA</SelectItem>
                      <SelectItem value="MEDIA">MÉDIA</SelectItem>
                      <SelectItem value="BAIXA">BAIXA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-white/5 p-10 flex flex-col sm:flex-row justify-end gap-4">
              <Button type="button" variant="ghost" onClick={() => router.back()} disabled={saving} className="h-14 px-8 font-black uppercase text-[11px] tracking-widest text-muted-foreground hover:text-white">Cancelar</Button>
              <Button type="submit" disabled={saving} className="h-14 px-12 bg-primary text-black font-black uppercase text-[11px] tracking-widest glow-primary w-full sm:w-auto">
                {saving ? <Loader2 className="animate-spin" /> : <><Save className="mr-2" size={18} /> Mapear Líder</>}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}