"use client";

import { useAuth } from "@/components/auth-context";
import { Navbar } from "@/components/layout/Navbar";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createDemand } from "@/lib/demand-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Save } from "lucide-react";
import Link from "next/link";
import { DemandPriority } from "@/lib/types";

export default function NewDemandPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    prazo: "",
    prioridade: "MEDIA" as DemandPriority,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const demandId = await createDemand(user.uid, formData);
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <Link href="/demandas" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-4 w-fit">
            <ChevronLeft size={16} />
            Voltar para lista
          </Link>
          <h1 className="text-3xl font-headline font-bold">Nova Demanda</h1>
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
                  placeholder="Descreva aqui todos os detalhes da demanda, solicitações recebidas, etc." 
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