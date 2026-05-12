"use client";

import { useFirestore, useCollection, useUser } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useState, useMemo, useEffect } from "react";
import { collection, addDoc, serverTimestamp, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { Cabinet } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LayoutDashboard, Plus, Trash2, Loader2, Building2, ShieldCheck, Edit2 } from "lucide-react";
import { useRouter } from "next/navigation";
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

const MASTER_EMAIL = "edisonunb@gmail.com";

export default function GabinetesPage() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [nome, setNome] = useState("");
  const [vereador, setVereador] = useState("");
  const [adding, setAdding] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [editingCabinet, setEditingCabinet] = useState<any>(null);
  const [editNome, setEditNome] = useState("");
  const [editVereador, setEditVereador] = useState("");

  const isSuperAdmin = user?.email === MASTER_EMAIL;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const cabinetsQuery = useMemo(() => db ? collection(db, "gabinetes") : null, [db]);
  const { data: cabinets = [], loading: loadingCabinets } = useCollection(cabinetsQuery);

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

  if (authLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin" /></div>;
  if (!isSuperAdmin) return <div className="p-20 text-center uppercase font-black tracking-widest text-muted-foreground">Acesso restrito ao Super Administrador.</div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-2">
            <Building2 className="text-primary" /> Gestão de <span className="text-primary">Gabinetes</span>
          </h1>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-2">Crie e gerencie as instâncias isoladas dos vereadores.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="h-fit bg-card border-slate-900 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest">Novo Gabinete</CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold">Defina o nome da instância e o vereador responsável.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nome da Instância</Label>
                  <Input placeholder="Ex: Gabinete 01 - Centro" value={nome} onChange={e => setNome(e.target.value)} required className="h-11 bg-slate-900 border-slate-800" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nome do Vereador</Label>
                  <Input placeholder="Ex: Silvinho Brandão" value={vereador} onChange={e => setVereador(e.target.value)} required className="h-11 bg-slate-900 border-slate-800" />
                </div>
                <Button className="w-full font-black uppercase text-xs tracking-widest h-11 shadow-lg shadow-primary/10" type="submit" disabled={adding}>
                  {adding ? <Loader2 className="animate-spin" /> : <><Plus className="mr-2" size={18} /> Criar Gabinete</>}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-4">
            <Card className="bg-card border-slate-900 shadow-2xl overflow-hidden">
              <CardHeader className="bg-slate-900/30 border-b border-slate-900">
                <CardTitle className="text-sm font-black uppercase tracking-widest">Gabinetes Ativos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-6">
                {loadingCabinets ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="animate-spin text-primary" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Sincronizando Instâncias...</p>
                  </div>
                ) : cabinets.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nenhum gabinete cadastrado.</p>
                  </div>
                ) : cabinets.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-4 bg-slate-950/50 border border-slate-900 rounded-xl hover:bg-slate-900/50 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-slate-900 border border-slate-800 text-primary rounded-lg shadow-inner">
                        <ShieldCheck size={20} />
                      </div>
                      <div>
                        <p className="font-black uppercase text-sm tracking-tight group-hover:text-primary transition-colors">{c.nome}</p>
                        <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Responsável: {c.vereador}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Dialog open={!!editingCabinet && editingCabinet.id === c.id} onOpenChange={(open) => !open && setEditingCabinet(null)}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10" onClick={() => handleEditOpen(c)}>
                            <Edit2 size={18} />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-950 border-slate-900">
                          <DialogHeader>
                            <DialogTitle className="uppercase font-black text-sm tracking-widest">Editar Gabinete</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest">Nome da Instância</Label>
                              <Input value={editNome} onChange={e => setEditNome(e.target.value)} className="bg-slate-900 border-slate-800" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest">Nome do Vereador</Label>
                              <Input value={editVereador} onChange={e => setEditVereador(e.target.value)} className="bg-slate-900 border-slate-800" />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingCabinet(null)} className="font-black uppercase text-[10px]">Cancelar</Button>
                            <Button onClick={handleUpdate} disabled={updating} className="font-black uppercase text-[10px]">
                              {updating ? <Loader2 className="animate-spin" /> : "Salvar Alterações"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                            {deletingId === c.id ? <Loader2 className="animate-spin" /> : <Trash2 size={18} />}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-slate-950 border-slate-900">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="uppercase font-black text-sm tracking-widest">Remover Gabinete?</AlertDialogTitle>
                            <AlertDialogDescription className="text-xs uppercase font-bold">
                              Isso removerá a instância. Os dados (demandas/atendimentos) não serão excluídos mas ficarão órfãos de gabinete.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="font-black uppercase text-[10px]">Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(c.id)} className="bg-destructive text-white font-black uppercase text-[10px]">Confirmar</AlertDialogAction>
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
