"use client";

import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { collection, serverTimestamp, doc, runTransaction, query, where } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Save, Loader2, User, Phone, MapPin, ClipboardList, Send, AlertCircle } from "lucide-react";
import Link from "next/link";
import { DemandPriority } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function NewCitizenServicePage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [createInternalDemand, setCreateInternalDemand] = useState(true);

  const [formData, setFormData] = useState({
    municipeNome: "",
    municipeEndereco: "",
    municipeTituloEleitoral: "",
    municipeTelefone: "",
    descricaoSolicitacao: "",
    prioridadeDemanda: "MEDIA" as DemandPriority,
    responsavelDemanda: "",
    prazoDemanda: ""
  });

  const userEmail = user?.email?.toLowerCase().trim();
  const profileRef = useMemo(() => (userEmail && db) ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: profile } = useDoc(profileRef);
  const cabinetId = (profile as any)?.cabinetId;

  const usersQuery = useMemo(() => {
    if (!db || !cabinetId) return null;
    return query(collection(db, "users"), where("cabinetId", "==", cabinetId));
  }, [db, cabinetId]);
  const { data: allUsers = [] } = useCollection(usersQuery);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user || !cabinetId) {
      toast({ title: "Erro", description: "Dados de gabinete não identificados.", variant: "destructive" });
      return;
    }
    setSaving(true);

    try {
      await runTransaction(db, async (transaction) => {
        const atendimentoRef = doc(collection(db, "atendimentos"));
        let demandaId = "";

        if (createInternalDemand) {
          const demandaRef = doc(collection(db, "demandas"));
          demandaId = demandaRef.id;

          const demandData = {
            id: demandaId,
            cabinetId: cabinetId,
            titulo: `[ATENDIMENTO] ${formData.municipeNome}`,
            descricao: `SOLICITAÇÃO DO MUNÍCIPE: ${formData.municipeNome}\nTEL: ${formData.municipeTelefone}\nEND: ${formData.municipeEndereco}\n\nDESCRIÇÃO:\n${formData.descricaoSolicitacao}`,
            prazo: formData.prazoDemanda || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            prioridade: formData.prioridadeDemanda,
            criadoPor: user.uid,
            responsavelAtual: formData.responsavelDemanda || user.uid,
            status: (formData.responsavelDemanda === user.uid || !formData.responsavelDemanda) ? "ABERTO" : "EM_ANDAMENTO",
            dataCriacao: serverTimestamp(),
            dataAtualizacao: serverTimestamp(),
            finalizada: false,
            atendimentoId: atendimentoRef.id,
            anexos: []
          };

          transaction.set(demandaRef, demandData);

          const tramiteRef = doc(collection(db, "tramites"));
          transaction.set(tramiteRef, {
            demandaId: demandaId,
            cabinetId: cabinetId,
            de: user.uid,
            para: formData.responsavelDemanda || user.uid,
            acao: "ENVIO",
            observacao: "Demanda gerada automaticamente a partir de um atendimento ao munícipe.",
            data: serverTimestamp(),
            anexos: []
          });
        }

        transaction.set(atendimentoRef, {
          cabinetId: cabinetId,
          municipeNome: formData.municipeNome,
          municipeEndereco: formData.municipeEndereco,
          municipeTituloEleitoral: formData.municipeTituloEleitoral,
          municipeTelefone: formData.municipeTelefone,
          descricaoSolicitacao: formData.descricaoSolicitacao,
          dataAtendimento: serverTimestamp(),
          atendidoPor: user.uid,
          demandaId: demandaId || null
        });
      });

      toast({ title: "Registro Completo!", description: "Os dados do munícipe foram salvos com sucesso." });
      router.push("/atendimentos");
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro", description: e.message || "Falha ao registrar atendimento.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <header className="mb-10">
          <Link href="/atendimentos" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-all mb-4 text-[10px] font-black uppercase tracking-[0.3em]">
            <ChevronLeft size={16} /> Voltar aos Atendimentos
          </Link>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-white">Novo Atendimento ao <span className="text-primary">Munícipe</span></h1>
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-1">Gestão de solicitações e base de contatos.</p>
        </header>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white/5 border-white/5 shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              <CardHeader>
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <User size={16} /> Perfil do Cidadão
                </CardTitle>
                <CardDescription className="text-[9px] uppercase font-bold text-muted-foreground">Preencha os dados básicos para o banco de dados do gabinete.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Nome Completo</Label>
                  <Input required value={formData.municipeNome} onChange={e => setFormData(p => ({ ...p, municipeNome: e.target.value }))} className="bg-black/50 border-white/10 text-white h-12" placeholder="Ex: João da Silva" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">WhatsApp / Telefone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/50" size={16} />
                      <Input required value={formData.municipeTelefone} onChange={e => setFormData(p => ({ ...p, municipeTelefone: e.target.value }))} className="pl-10 bg-black/50 border-white/10 text-white h-12" placeholder="(00) 00000-0000" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Título de Eleitor</Label>
                    <div className="relative">
                      <ClipboardList className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/50" size={16} />
                      <Input value={formData.municipeTituloEleitoral} onChange={e => setFormData(p => ({ ...p, municipeTituloEleitoral: e.target.value }))} className="pl-10 bg-black/50 border-white/10 text-white h-12" placeholder="Opcional" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Endereço Residencial</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-primary/50" size={16} />
                    <Textarea required value={formData.municipeEndereco} onChange={e => setFormData(p => ({ ...p, municipeEndereco: e.target.value }))} className="pl-10 bg-black/50 border-white/10 text-white min-h-[100px]" placeholder="Rua, Bairro, Ponto de referência..." />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">O que o Munícipe solicita?</Label>
                  <Textarea required value={formData.descricaoSolicitacao} onChange={e => setFormData(p => ({ ...p, descricaoSolicitacao: e.target.value }))} className="bg-black/50 border-white/10 text-white min-h-[150px]" placeholder="Descreva aqui o pedido ou problema relatado..." />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-white/5 border-white/5 shadow-2xl overflow-hidden">
              <CardHeader className="bg-white/5 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Send size={16} /> Gerar Demanda
                  </CardTitle>
                  <Switch checked={createInternalDemand} onCheckedChange={setCreateInternalDemand} className="data-[state=checked]:bg-primary" />
                </div>
              </CardHeader>
              <CardContent className={cn("pt-8 space-y-6 transition-opacity", !createInternalDemand && "opacity-20 pointer-events-none")}>
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Prioridade</Label>
                  <Select value={formData.prioridadeDemanda} onValueChange={v => setFormData(p => ({ ...p, prioridadeDemanda: v as DemandPriority }))}>
                    <SelectTrigger className="bg-black/50 border-white/10 text-white h-12 font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black border-white/10">
                      <SelectItem value="ALTA">ALTA URGÊNCIA</SelectItem>
                      <SelectItem value="MEDIA">NORMAL</SelectItem>
                      <SelectItem value="BAIXA">BAIXA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Atribuir ao Assessor</Label>
                  <Select value={formData.responsavelDemanda} onValueChange={v => setFormData(p => ({ ...p, responsavelDemanda: v }))}>
                    <SelectTrigger className="bg-black/50 border-white/10 text-white h-12 font-bold">
                      <SelectValue placeholder="SELECIONE..." />
                    </SelectTrigger>
                    <SelectContent className="bg-black border-white/10">
                      {allUsers.map((u: any) => (
                        <SelectItem key={u.uid} value={u.uid || u.id}>{u.nome} ({u.perfil})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Prazo de Resolução</Label>
                  <Input type="date" value={formData.prazoDemanda} onChange={e => setFormData(p => ({ ...p, prazoDemanda: e.target.value }))} className="bg-black/50 border-white/10 text-white h-12 font-bold" />
                </div>

                <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 flex gap-3">
                  <AlertCircle size={16} className="text-primary shrink-0 mt-0.5" />
                  <p className="text-[10px] text-primary font-black uppercase leading-relaxed tracking-wider">
                    A demanda herdará os dados de contato e a descrição acima para facilitar o trabalho.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="bg-white/5 p-8">
                <Button type="submit" disabled={saving} className="w-full bg-primary text-black font-black uppercase text-[11px] tracking-widest h-14 glow-primary">
                  {saving ? <Loader2 className="animate-spin" /> : <><Save className="mr-2" size={18} /> Salvar Atendimento</>}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </form>
      </main>
    </div>
  );
}