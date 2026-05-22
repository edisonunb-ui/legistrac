"use client";

import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp, doc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Save, Loader2, Gavel, FileText, Link as LinkIcon } from "lucide-react";
import Link from "next/link";

export default function NewLegislativeActionPage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

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

  const userEmail = user?.email?.toLowerCase().trim();
  const profileRef = useMemoFirebase(() => (userEmail && db) ? doc(db, "users", userEmail) : null, [db, userEmail]);
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
      });

      toast({ title: "Ação Registrada!", description: "O documento foi salvo na base legislativa." });
      router.push("/legislativo");
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro", description: e.message || "Falha ao salvar ação legislativa.", variant: "destructive" });
    } finally {
      setSaving(false);
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
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-1">Elaboração de documentos oficiais do mandato.</p>
        </header>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white/5 border-white/5 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              <CardHeader>
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <FileText size={16} /> Conteúdo do Documento
                </CardTitle>
                <CardDescription className="text-[9px] uppercase font-bold text-muted-foreground">Preencha os detalhes técnicos da peça legislativa.</CardDescription>
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
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Corpo do Texto (Inteiro Teor)</Label>
                  <Textarea required value={formData.conteudo} onChange={e => setFormData(p => ({ ...p, conteudo: e.target.value }))} className="bg-black/50 border-white/10 text-white min-h-[300px] text-xs font-mono leading-relaxed" placeholder="Redija aqui o texto completo da lei, indicação ou requerimento..." />
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
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Link Oficial (Opcional)</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/50" size={14} />
                    <Input value={formData.linkOficial} onChange={e => setFormData(p => ({ ...p, linkOficial: e.target.value }))} className="pl-10 bg-black/50 border-white/10 text-white h-12 text-xs" placeholder="URL da Câmara..." />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-white/5 p-8">
                <Button type="submit" disabled={saving} className="w-full bg-primary text-black font-black uppercase text-[11px] tracking-widest h-14 glow-primary">
                  {saving ? <Loader2 className="animate-spin" /> : <><Save className="mr-2" size={18} /> Salvar Documento</>}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </form>
      </main>
    </div>
  );
}
