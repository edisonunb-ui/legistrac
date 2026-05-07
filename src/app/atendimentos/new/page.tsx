
"use client";

import { useUser, useFirestore } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp, doc, runTransaction, query } from "firebase/firestore";
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
import { useCollection } from "@/firebase";
import { DemandPriority } from "@/lib/types";

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

  const usersQuery = useMemo(() => (db && user) ? query(collection(db, "users")) : null, [db, user]);
  const { data: allUsers = [] } = useCollection(usersQuery);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user) return;
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
            atendimentoId: atendimentoRef.id
          };

          transaction.set(demandaRef, demandData);

          // Trâmite inicial da demanda
          const tramiteRef = doc(collection(db, "tramites"));
          transaction.set(tramiteRef, {
            demandaId: demandaId,
            de: user.uid,
            para: formData.responsavelDemanda || user.uid,
            acao: "ENVIO",
            observacao: "Demanda gerada automaticamente a partir de um atendimento ao munícipe.",
            data: serverTimestamp(),
          });
        }

        transaction.set(atendimentoRef, {
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

      toast({ title: "Atendimento Registrado!", description: "Os dados do munícipe e a demanda foram salvos." });
      router.push("/atendimentos");
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro", description: e.message || "Falha ao registrar atendimento.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <Link href="/atendimentos" className="flex items-center gap-2 text-muted-foreground hover:text-primary mb-4 w-fit text-sm font-bold uppercase tracking-widest">
            <ChevronLeft size={16} /> Voltar aos Atendimentos
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Novo Atendimento ao <span className="text-primary">Munícipe</span></h1>
        </header>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-card border-primary/10 shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <User className="text-primary" size={20} /> Dados do Munícipe
                </CardTitle>
                <CardDescription>Informações básicas para contato e controle eleitoral.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Nome Completo</Label>
                  <Input required value={formData.municipeNome} onChange={e => setFormData(p => ({ ...p, municipeNome: e.target.value }))} className="bg-background border-primary/10" placeholder="Ex: João da Silva" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Telefone / WhatsApp</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                      <Input required value={formData.municipeTelefone} onChange={e => setFormData(p => ({ ...p, municipeTelefone: e.target.value }))} className="pl-9 bg-background border-primary/10" placeholder="(00) 00000-0000" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Título de Eleitor (Opcional)</Label>
                    <div className="relative">
                      <ClipboardList className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                      <Input value={formData.municipeTituloEleitoral} onChange={e => setFormData(p => ({ ...p, municipeTituloEleitoral: e.target.value }))} className="pl-9 bg-background border-primary/10" placeholder="0000 0000 0000" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Endereço Completo</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-muted-foreground" size={14} />
                    <Textarea required value={formData.municipeEndereco} onChange={e => setFormData(p => ({ ...p, municipeEndereco: e.target.value }))} className="pl-9 bg-background border-primary/10 min-h-[80px]" placeholder="Rua, Número, Bairro, CEP..." />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Descrição da Solicitação / Problema</Label>
                  <Textarea required value={formData.descricaoSolicitacao} onChange={e => setFormData(p => ({ ...p, descricaoSolicitacao: e.target.value }))} className="bg-background border-primary/10 min-h-[120px]" placeholder="Relate detalhadamente o que o munícipe solicitou..." />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-card border-primary/10 shadow-xl">
              <CardHeader className="bg-primary/5 rounded-t-xl border-b border-primary/10">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Send size={16} className="text-primary" /> Demanda Interna
                  </CardTitle>
                  <Switch checked={createInternalDemand} onCheckedChange={setCreateInternalDemand} />
                </div>
                <CardDescription className="text-[10px] mt-2">Se ativado, cria automaticamente um processo no sistema de demandas.</CardDescription>
              </CardHeader>
              <CardContent className={cn("pt-6 space-y-4", !createInternalDemand && "opacity-40 pointer-events-none")}>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Prioridade</Label>
                  <Select value={formData.prioridadeDemanda} onValueChange={v => setFormData(p => ({ ...p, prioridadeDemanda: v as DemandPriority }))}>
                    <SelectTrigger className="bg-background border-primary/10 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALTA">Alta</SelectItem>
                      <SelectItem value="MEDIA">Média</SelectItem>
                      <SelectItem value="BAIXA">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Responsável</Label>
                  <Select value={formData.responsavelDemanda} onValueChange={v => setFormData(p => ({ ...p, responsavelDemanda: v }))}>
                    <SelectTrigger className="bg-background border-primary/10 h-9">
                      <SelectValue placeholder="Selecione um assessor" />
                    </SelectTrigger>
                    <SelectContent>
                      {allUsers.map((u: any) => (
                        <SelectItem key={u.uid} value={u.uid || u.id}>{u.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Prazo Estimado</Label>
                  <Input type="date" value={formData.prazoDemanda} onChange={e => setFormData(p => ({ ...p, prazoDemanda: e.target.value }))} className="bg-background border-primary/10 h-9" />
                </div>

                <div className="p-3 bg-primary/5 rounded-lg border border-primary/10 flex gap-2">
                  <AlertCircle size={14} className="text-primary shrink-0 mt-0.5" />
                  <p className="text-[9px] text-primary/80 leading-relaxed font-medium">
                    A demanda será criada com o título e descrição baseados nos dados do munícipe.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/20 pt-6">
                <Button type="submit" disabled={saving} className="w-full bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20">
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
