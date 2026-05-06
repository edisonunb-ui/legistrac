"use client";

import { useUser, useFirestore, useCollection } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createDemand } from "@/lib/demand-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Save, ShieldCheck, Loader2, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { DemandPriority } from "@/lib/types";
import { collection, query, orderBy } from "firebase/firestore";

export default function NewDemandPage() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    prazo: "",
    prioridade: "MEDIA" as DemandPriority,
    responsavelId: "",
  });

  // Inicializa o responsável de forma estável para evitar loops de renderização
  useEffect(() => {
    if (user?.uid && !formData.responsavelId) {
      setFormData(prev => {
        if (prev.responsavelId === user.uid) return prev;
        return { ...prev, responsavelId: user.uid };
      });
    }
  }, [user?.uid, formData.responsavelId]);

  const usersQuery = useMemo(() => db ? query(collection(db, "users"), orderBy("nome", "asc")) : null, [db]);
  const { data: allUsers = [] } = useCollection(usersQuery);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db) return;
    setSaving(true);

    try {
      const demandId = await createDemand(db, user.uid, {
        ...formData,
        responsavelId: formData.responsavelId || user.uid
      });
      
      toast({
        title: "Sucesso!",
        description: "Demanda criada com sucesso.",
      });
      router.push(`/demandas/${demandId}`);
    } catch (error: any) {
      toast({
        title: "Erro ao criar demanda",
        description: error.message || "Verifique as permissões do sistema.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-primary">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p className="font-medium">Carregando ambiente...</p>
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
              <ShieldCheck size={14} /> Atendimento Iniciado
            </div>
          </div>
        </header>

        <Card className="max-w-2xl border-none shadow-xl">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Dados da Solicitação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título da Demanda</Label>
                <Input 
                  id="titulo" 
                  placeholder="Ex: Reforma da Praça" 
                  required 
                  value={formData.titulo}
                  onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, prazo: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prioridade">Prioridade</Label>
                  <Select 
                    value={formData.prioridade} 
                    onValueChange={(v: DemandPriority) => setFormData(prev => ({ ...prev, prioridade: v }))}
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
                <Label htmlFor="responsavel">Atribuir Responsável</Label>
                <Select 
                  value={formData.responsavelId || user?.uid || ""} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, responsavelId: v }))}
                >
                  <SelectTrigger id="responsavel">
                    <div className="flex items-center gap-2">
                      <UserIcon size={14} className="text-muted-foreground" />
                      <SelectValue placeholder="Selecione o responsável" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={user?.uid || "me"}>Eu mesmo</SelectItem>
                    {allUsers.filter(u => u.uid !== user?.uid).map((u: any) => (
                      <SelectItem key={u.uid || u.email} value={u.uid || u.email}>
                        {u.nome} ({u.perfil})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição Detalhada</Label>
                <Textarea 
                  id="descricao" 
                  placeholder="Descreva aqui o que precisa ser feito..." 
                  rows={6} 
                  required
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-3 border-t pt-6 bg-muted/30">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                Registrar Demanda
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}
