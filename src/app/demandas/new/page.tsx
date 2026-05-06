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
import { ChevronLeft, Save, Loader2, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { DemandPriority, UserProfile } from "@/lib/types";
import { collection, query } from "firebase/firestore";

export default function NewDemandPage() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    prazo: "",
    prioridade: "MEDIA" as DemandPriority,
    responsavelId: "",
  });

  useEffect(() => {
    if (user?.uid && !hasInitialized) {
      setFormData(prev => ({ ...prev, responsavelId: user.uid }));
      setHasInitialized(true);
    }
  }, [user?.uid, hasInitialized]);

  const usersQuery = useMemo(() => (db && user) ? query(collection(db, "users")) : null, [db, user]);
  const { data: allUsers = [] } = useCollection(usersQuery);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db) {
      toast({ title: "Erro", description: "Sessão inválida. Recarregue a página.", variant: "destructive" });
      return;
    }
    
    setSaving(true);
    try {
      const demandId = await createDemand(db, user.uid, {
        ...formData,
        responsavelId: formData.responsavelId || user.uid
      });
      
      toast({ title: "Sucesso!", description: "Demanda criada com sucesso." });
      router.push(`/demandas/${demandId}`);
    } catch (error: any) {
      console.error("Erro detalhado ao salvar:", error);
      toast({
        title: "Erro de Permissão",
        description: "Verifique se as regras do Firestore foram publicadas no console ou se você está logado.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <Link href="/demandas" className="flex items-center gap-2 text-muted-foreground hover:text-primary mb-4 w-fit">
            <ChevronLeft size={16} /> Voltar para lista
          </Link>
          <h1 className="text-3xl font-headline font-bold">Nova Demanda</h1>
        </header>

        <Card className="max-w-2xl border-none shadow-xl">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Dados da Solicitação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título</Label>
                <Input id="titulo" required value={formData.titulo} onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="prazo">Prazo</Label>
                  <Input id="prazo" type="date" required value={formData.prazo} onChange={(e) => setFormData(prev => ({ ...prev, prazo: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prioridade">Prioridade</Label>
                  <Select value={formData.prioridade} onValueChange={(v: DemandPriority) => setFormData(prev => ({ ...prev, prioridade: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BAIXA">Baixa</SelectItem>
                      <SelectItem value="MEDIA">Média</SelectItem>
                      <SelectItem value="ALTA">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Responsável</Label>
                <Select value={formData.responsavelId} onValueChange={(v) => setFormData(prev => ({ ...prev, responsavelId: v }))}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2"><UserIcon size={14} /><SelectValue /></div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={user?.uid || "me"}>Atribuir a mim</SelectItem>
                    {allUsers.filter((u: any) => u.uid && u.uid !== user?.uid).map((u: any) => (
                      <SelectItem key={u.uid} value={u.uid}>{u.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea id="descricao" rows={6} required value={formData.descricao} onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))} />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-3 bg-muted/30 pt-6">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />} Registrar Demanda
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}