"use client";

import { useUser, useFirestore } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createDemand } from "@/lib/demand-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Save, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { DemandPriority } from "@/lib/types";
import { VEREADORES_AUTORIZADOS } from "@/lib/authorized-emails";

export default function NewDemandPage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [authorizedEmail, setAuthorizedEmail] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    prazo: "",
    prioridade: "MEDIA" as DemandPriority,
  });

  useEffect(() => {
    // Se o email ainda não foi verificado...
    if (!authorizedEmail) {
      // Abre um pop-up pedindo o email do usuário exatamente como no seu exemplo
      const email = prompt("Para iniciar a diligência, por favor, insira seu e-mail de vereador/assessor:");
      
      // Se o email inserido estiver na lista...
      if (email && VEREADORES_AUTORIZADOS.includes(email.toLowerCase())) {
        setAuthorizedEmail(email.toLowerCase());
        alert("E-mail verificado com sucesso! Pode prosseguir.");
      } else if (email) {
        alert("E-mail não autorizado."); // Se não estiver na lista
        router.push("/demandas");
      } else {
        // Se o usuário cancelar o pop-up
        router.push("/demandas");
      }
    }
  }, [authorizedEmail, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db || !authorizedEmail) return;
    setLoading(true);

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
      setLoading(false);
    }
  };

  if (!authorizedEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <ShieldCheck size={48} className="mx-auto text-primary animate-pulse" />
          <p className="text-muted-foreground font-medium">Verificando autorização...</p>
        </div>
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
              <ShieldCheck size={14} /> Autorizado: {authorizedEmail}
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
              <Button type="submit" className="font-semibold gap-2" disabled={loading}>
                <Save size={18} />
                {loading ? "Registrando..." : "Registrar Demanda"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}
