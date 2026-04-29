"use client";

import { useUser, useFirestore, useAuthInstance } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createDemand } from "@/lib/demand-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Save, ShieldCheck, Loader2 } from "lucide-react";
import Link from "next/link";
import { DemandPriority } from "@/lib/types";
import { VEREADORES_AUTORIZADOS } from "@/lib/authorized-emails";
import { signOut } from "firebase/auth";

export default function NewDemandPage() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const auth = useAuthInstance();
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [autorizadoEmail, setAutorizadoEmail] = useState<string | null>(null);
  const promptShown = useRef(false);
  
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    prazo: "",
    prioridade: "MEDIA" as DemandPriority,
  });

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push("/login");
      return;
    }

    const savedEmail = sessionStorage.getItem('gate_auth_email');

    if (savedEmail && VEREADORES_AUTORIZADOS.includes(savedEmail)) {
      setAutorizadoEmail(savedEmail);
    } else if (!promptShown.current) {
      promptShown.current = true;
      const email = prompt("Para iniciar a diligência, por favor, insira seu e-mail de vereador:");

      if (email && VEREADORES_AUTORIZADOS.includes(email.trim().toLowerCase())) {
        const emailClean = email.trim().toLowerCase();
        sessionStorage.setItem('gate_auth_email', emailClean);
        setAutorizadoEmail(emailClean);
      } else {
        alert("Erro: E-mail não autorizado ou operação cancelada.");
        if (auth) {
          signOut(auth).then(() => router.push("/login"));
        } else {
          router.push("/demandas");
        }
      }
    }
  }, [user, authLoading, router, auth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db || !autorizadoEmail) return;
    setSaving(true);

    try {
      const demandId = await createDemand(db, user.uid, formData);
      toast({
        title: "Sucesso!",
        description: "Demanda criada e protocolo gerado.",
      });
      router.push(`/demandas/${demandId}`);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar a demanda.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!autorizadoEmail || authLoading || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-primary">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p className="font-medium">Aguardando autorização de diligência...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <Link href="/demandas" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-4 w-fit">
            <ChevronLeft size={16} />
            Voltar para lista
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-headline font-bold">Nova Demanda</h1>
            <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
              <ShieldCheck size={14} /> Autorizado: {autorizadoEmail}
            </div>
          </div>
          <p className="text-muted-foreground">Preencha os dados abaixo para registrar uma nova solicitação.</p>
        </header>

        <Card className="max-w-2xl border-none shadow-xl">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle className="text-lg">Dados Básicos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título da Demanda</Label>
                <Input 
                  id="titulo" 
                  placeholder="Ex: Reforma da Praça Central" 
                  required 
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="prazo">Prazo Estimado</Label>
                  <Input 
                    id="prazo" 
                    type="date" 
                    required 
                    value={formData.prazo}
                    onChange={(e) => setFormData({ ...formData, prazo: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prioridade">Prioridade</Label>
                  <Select 
                    value={formData.prioridade} 
                    onValueChange={(v: any) => setFormData({ ...formData, prioridade: v })}
                  >
                    <SelectTrigger id="prioridade">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BAIXA">Baixa</SelectItem>
                      <SelectItem value="MEDIA">Média</SelectItem>
                      <SelectItem value="ALTA">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição Detalhada</Label>
                <Textarea 
                  id="descricao" 
                  placeholder="Descreva aqui todos os detalhes da demanda..." 
                  rows={8} 
                  required
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-3 border-t pt-6 bg-muted/30">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
              <Button type="submit" className="font-semibold gap-2" disabled={saving}>
                <Save size={18} />
                {saving ? "Registrando..." : "Registrar Demanda"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}
