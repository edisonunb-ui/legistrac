
"use client";

import { useUser, useFirestore, useCollection } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useState, useMemo } from "react";
import { collection, query, where } from "firebase/firestore";
import { UserRole, UserPermissions } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, Loader2, ShieldCheck, Settings2, AlertCircle, Trash2, ChevronLeft, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { provisionarMembro, excluirUsuario } from "@/app/actions/provisionamento";
import Link from "next/link";
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

const PERMISSION_LABELS: Record<keyof UserPermissions, string> = {
  visualizar_todas: "Ver Todas as Demandas",
  criar_demandas: "Criar Demandas",
  finalizar_demandas: "Finalizar Demandas",
  gerenciar_equipe: "Gerenciar Equipe",
  reabrir_demandas: "Reabrir Demandas"
};

export default function UserManagementPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("ASSESSOR");
  const [newCabinetId, setNewCabinetId] = useState("");
  const [permissions, setPermissions] = useState<UserPermissions>({
    visualizar_todas: false,
    criar_demandas: true,
    finalizar_demandas: false,
    gerenciar_equipe: false,
    reabrir_demandas: false
  });
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const isMasterAdmin = user?.email === "edisonunb@gmail.com";

  const cabinetsQuery = useMemo(() => db ? collection(db, "gabinetes") : null, [db]);
  const { data: cabinets = [] } = useCollection(cabinetsQuery);

  const usersQuery = useMemo(() => (db && user) ? query(collection(db, "users")) : null, [db, user]);
  const { data: allUsers = [], loading: usersLoading } = useCollection(usersQuery);

  const handleRoleChange = (role: UserRole) => {
    setNewRole(role);
    const isAdminRole = role === "ADMIN" || role === "SUPER_ADMIN";
    setPermissions({
      visualizar_todas: isAdminRole,
      criar_demandas: true,
      finalizar_demandas: isAdminRole,
      gerenciar_equipe: isAdminRole,
      reabrir_demandas: isAdminRole
    });
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newName || (!newCabinetId && !isMasterAdmin)) return;
    setIsAdding(true);

    try {
      const result = await provisionarMembro({
        email: newEmail,
        nome: newName,
        perfil: newRole,
        cabinetId: newCabinetId,
        permissoes: permissions
      });

      if (result.success) {
        toast({ title: "Membro Provisionado!", description: `Senha padrão: Mudar@123` });
        setNewEmail("");
        setNewName("");
        setNewCabinetId("");
      } else {
        toast({ title: "Erro", description: result.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Erro Inesperado", variant: "destructive" });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteUser = async (email: string) => {
    setIsDeleting(email);
    try {
      const result = await excluirUsuario(email);
      if (result.success) toast({ title: "Usuário Excluído" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8 flex flex-col gap-4">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-primary text-sm font-medium">
            <ChevronLeft size={16} /> Voltar ao Dashboard
          </Link>
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2"><Users className="text-primary" /> Gestão da Equipe</h1>
              <p className="text-muted-foreground">Provisione assessores para gabinetes específicos.</p>
            </div>
            {isMasterAdmin && <Link href="/gabinetes"><Button variant="outline" className="gap-2"><Building2 size={16} /> Gerenciar Gabinetes</Button></Link>}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="h-fit">
            <CardHeader className="bg-primary/5">
              <CardTitle className="text-lg">Novo Assessor</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input value={newName} onChange={e => setNewName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>E-mail de Acesso</Label>
                  <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Gabinete Destino</Label>
                  <Select value={newCabinetId} onValueChange={setNewCabinetId} required>
                    <SelectTrigger><SelectValue placeholder="Selecione o Gabinete" /></SelectTrigger>
                    <SelectContent>
                      {cabinets.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.vereador}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Perfil</Label>
                  <Select value={newRole} onValueChange={(v: UserRole) => handleRoleChange(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ASSESSOR">Assessor</SelectItem>
                      <SelectItem value="ADMIN">Administrador</SelectItem>
                      <SelectItem value="ESTAGIARIO">Estagiário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full font-bold" type="submit" disabled={isAdding}>
                  {isAdding ? <Loader2 className="animate-spin" /> : "Provisionar Acesso"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Membros Ativos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {usersLoading ? <Loader2 className="animate-spin mx-auto" /> : allUsers.map((u: any) => (
                  <div key={u.email} className="flex items-center justify-between p-4 border rounded-xl">
                    <div>
                      <p className="font-bold">{u.nome}</p>
                      <p className="text-xs text-muted-foreground">{u.email} • <span className="text-primary font-bold">{cabinets.find((c:any) => c.id === u.cabinetId)?.vereador || 'Sem Gabinete'}</span></p>
                    </div>
                    {isMasterAdmin && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive"><Trash2 size={18} /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Excluir Usuário?</AlertDialogTitle></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteUser(u.email)} className="bg-destructive">Confirmar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
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
