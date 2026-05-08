
"use client";

import { useFirestore, useCollection, useUser } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useState, useMemo } from "react";
import { collection, addDoc, serverTimestamp, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { Cabinet } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LayoutDashboard, Plus, Trash2, Loader2, Building2, ShieldCheck, Edit2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function GabinetesPage() {
  const { user } = userUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [nome, setNome] = useState("");
  const [vereador, setVereador] = useState("");
  const [adding, setAdding] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Estados para edição
  const [editingCabinet, setEditingCabinet] = useState<any>(null);
  const [editNome, setEditNome] = useState("");
  const [editVereador, setEditVereador] = useState("");

  const isSuperAdmin = user?.email === "edisonunb@gmail.com";

  const cabinetsQuery = useMemo(() => db ? collection(db, "gabinetes") : null, [db]);
  const { data: cabinets = [], loading } = useCollection(cabinetsQuery);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !isSuperAdmin) return;
    setAdding(true);
    try {
      await addDoc(collection(db, "gabinetes"), {
        nome,
        vereador,
        ativo: true,
        createdAt: serverTimestamp()
      });
      toast({ title: "Gabinete Criado", description: `O gabinete de ${vereador} foi isolado com sucesso.` });
      setNome("");
      setVereador("");
    } catch (e) {
      toast({ title: "Erro", description: "Falha ao criar gabinete.", variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const handleEditOpen = (cabinet: any) => {
    setEditingCabinet(cabinet);
    setEditNome(cabinet.nome);
    setEditVereador(cabinet.vereador);
  };

  const handleUpdate = async () => {
    if (!db || !editingCabinet) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, "gabinetes", editingCabinet.id), {
        nome: editNome,
        vereador: editVereador,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Gabinete Atualizado" });
      setEditingCabinet(null);
    } catch (e) {
      toast({ title: "Erro", variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!db) return;
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, "gabinetes", id));
      toast({ title: "Gabinete Removido" });
    } catch (e) {
      toast({ title: "Erro ao remover", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  if (!isSuperAdmin) return <div className="p-20 text-center">Acesso restrito ao Super Administrador.</div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="text-primary" /> Gestão de <span className="text-primary">Gabinetes</span>
          </h1>
          <p className="text-muted-foreground">Crie e gerencie as instâncias isoladas dos vereadores.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Novo Gabinete</CardTitle>
              <CardDescription>Defina o nome da instância e o vereador responsável.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome da Instância</Label>
                  <Input placeholder="Ex: Gabinete 01 - Centro" value={nome} onChange={e => setNome(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Nome do Vereador</Label>
                  <Input placeholder="Ex: Silvinho Brandão" value={vereador} onChange={e => setVereador(e.target.value)} required />
                </div>
                <Button className="w-full font-bold" type="submit" disabled={adding}>
                  {adding ? <Loader2 className="animate-spin" /> : <><Plus className="mr-2" size={18} /> Criar Gabinete</>}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Gabinetes Ativos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? <Loader2 className="animate-spin mx-auto" /> : cabinets.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/10 text-primary rounded-lg">
                        <ShieldCheck size={20} />
                      </div>
                      <div>
                        <p className="font-bold">{c.nome}</p>
                        <p className="text-xs text-muted-foreground">Responsável: {c.vereador}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Dialog open={!!editingCabinet && editingCabinet.id === c.id} onOpenChange={(open) => !open && setEditingCabinet(null)}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-primary" onClick={() => handleEditOpen(c)}>
                            <Edit2 size={18} />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Editar Gabinete</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Nome da Instância</Label>
                              <Input value={editNome} onChange={e => setEditNome(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <Label>Nome do Vereador</Label>
                              <Input value={editVereador} onChange={e => setEditVereador(e.target.value)} />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingCabinet(null)}>Cancelar</Button>
                            <Button onClick={handleUpdate} disabled={updating}>
                              {updating ? <Loader2 className="animate-spin" /> : "Salvar Alterações"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            {deletingId === c.id ? <Loader2 className="animate-spin" /> : <Trash2 size={18} />}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover Gabinete?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Isso removerá a instância. Os dados (demandas/atendimentos) não serão excluídos mas ficarão órfãos de gabinete.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(c.id)} className="bg-destructive">Confirmar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
