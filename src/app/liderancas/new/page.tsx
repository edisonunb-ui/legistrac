
"use client";

import { useUser, useFirestore } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
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
    potencialVotos: 0,
    influencia: "MEDIA",
    status: "ATIVO"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user) return;
    setSaving(true);

    try {
      await addDoc(collection(db, "liderancas"), {
        ...formData,
        potencialVotos: Number(formData.potencialVotos),
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
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <Link href="/liderancas" className="flex items-center gap-2 text-muted-foreground hover:text-primary mb-4 w-fit text-sm font-bold uppercase tracking-widest">
            <ChevronLeft size={16} /> Voltar ao Mapa
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Novo Líder <span className="text-primary">Estratégico</span></h1>
        </header>

        <Card className="max-w-2xl bg-card border-primary/10 shadow-xl">
          <form onSubmit={handleSubmit}>
            <CardHeader className="border-b border-primary/5">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Users className="text-primary" size={20} /> Perfil da Liderança
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Nome Completo</Label>
                <Input required value={formData.nome} onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))} className="bg-background border-primary/10" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Bairro/Região</Label>
                  <Input required value={formData.bairro} onChange={e => setFormData(p => ({ ...p, bairro: e.target.value }))} className="bg-background border-primary/10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Contato (WhatsApp)</Label>
                  <Input required value={formData.contato} onChange={e => setFormData(p => ({ ...p, contato: e.target.value }))} className="bg-background border-primary/10" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Potencial de Votos (Estimativa)</Label>
                  <Input type="number" required value={formData.potencialVotos} onChange={e => setFormData(p => ({ ...p, potencialVotos: parseInt(e.target.value) }))} className="bg-background border-primary/10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Grau de Influência</Label>
                  <Select value={formData.influencia} onValueChange={v => setFormData(p => ({ ...p, influencia: v }))}>
                    <SelectTrigger className="bg-background border-primary/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALTA">Alta</SelectItem>
                      <SelectItem value="MEDIA">Média</SelectItem>
                      <SelectItem value="BAIXA">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-3 bg-muted/20 pt-6">
              <Button type="button" variant="ghost" onClick={() => router.back()} disabled={saving}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground font-bold min-w-[150px]">
                {saving ? <Loader2 className="animate-spin" /> : <><Save className="mr-2" size={18} /> Mapear Líder</>}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}
