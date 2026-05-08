"use client";

import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useState, useMemo } from "react";
import { collection, query, where, doc, updateDoc } from "firebase/firestore";
import { UserRole, UserPermissions } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Users, Loader2, Trash2, ChevronLeft, Building2, Edit2 } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

const PERMISSION_LABELS: Record<keyof UserPermissions, string> = {
  visualizar_todas: "Ver Todas as Demandas",
  criar_demandas: "Criar Demandas",
  finalizar_demandas: "Finalizar Demandas",
  gerenciar_equipe: "Gerenciar Equipe",
  reabrir_demandas: "Reabrir Demandas"
};

const MASTER_EMAIL = "edisonunb@gmail.com";

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
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Estados para edição
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("ASSESSOR");
  const [editCabinetId, setEditCabinetId] = useState("");
  const [editPermissions, setEditPermissions] = useState<UserPermissions>({
    visualizar_todas: false,
    criar_demandas: true,
    finalizar_demandas: false,
    gerenciar_equipe: false,
    reabrir_demandas: false
  });

  const userEmail = user?.email?.toLowerCase().trim();
  const profileRef = useMemo(() => (userEmail && db) ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: profile } = useDoc(profileRef);

  const isMasterAdmin = userEmail === MASTER_EMAIL;
  const cabinetId = (profile as any)?.cabinetId;

  const cabinetsQuery = useMemo(() => db ? collection(db, "gabinetes") : null, [db]);
  const { data: cabinets = [] } = useCollection(cabinetsQuery);

  const usersQuery = useMemo(() => {
    if (!db || !user) return null;
    if (isMasterAdmin) return query(collection(db, "users"));
    if (cabinetId) return query(collection(db, "users"), where("cabinetId", "==", cabinetId));
    return null;
  }, [db, user, isMasterAdmin, cabinetId]);

  const { data: allUsers = [], loading: usersLoading } = useCollection(usersQuery);

  const handleRoleChange = (role: UserRole, isEdit = false) => {
    const isAdminRole = role === "ADMIN" || role === "SUPER_ADMIN";
    const perms = {
      visualizar_todas: isAdminRole,
      criar_demandas: true,
      finalizar_demandas: isAdminRole,
      gerenciar_equipe: isAdminRole,
      reabrir_demandas: isAdminRole
    };

    if (isEdit) {
      setEditRole(role);
      setEditPermissions(perms);
    } else {
      setNewRole(role);
      setPermissions(perms);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetCabinet = isMasterAdmin ? newCabinetId : cabinetId;
    if (!newEmail || !newName || !targetCabinet) {
      toast({ title: "Erro", description: "Preencha todos os campos obrigatórios.", variant: "destructive" });
      return;
    }
    setIsAdding(true);

    try {
      const result = await provisionarMembro({
        email: newEmail,
        nome: newName,
        perfil: newRole,
        cabinetId: targetCabinet,
        permissoes: permissions
      });

      if (result.success) {
        toast({ title: "Membro Provisionado!", description: `Senha padrão: Mudar@123` });
        setNewEmail("");
        setNewName("");
        if (isMasterAdmin) setNewCabinetId("");
      } else {
        toast({ title: "Erro", description: result.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Erro Inesperado", variant: "destructive" });
    } finally {
      setIsAdding(false);
    }
  };

  const handleEditOpen = (u: any) => {
    setEditingUser(u);
    setEditName(u.nome || "");
    setEditRole(u.perfil || "ASSESSOR");
    setEditCabinetId(u.cabinetId || "");
    setEditPermissions(u.permissoes || {
      visualizar_todas: false,
      criar_demandas: true,
      finalizar_demandas: false,
      gerenciar_equipe: false,
      reabrir_demandas: false
    });
  };

  const handleUpdateUser = async () => {
    if (!db || !editingUser) return;
    setIsUpdating(true);
    try {
      const emailToUse = (editingUser.email || editingUser.id || "").toLowerCase().trim();
      const userDocRef = doc(db, "users", emailToUse);
      await updateDoc(userDocRef, {
        nome: editName,
        perfil: editRole,
        cabinetId: editCabinetId,
        permissoes: editPermissions,
        updatedAt: new Date().toISOString()
      });
      toast({ title: "Perfil Atualizado", description: "As mudanças foram salvas com sucesso." });
      setEditingUser(null);
    } catch (e: any) {
      toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" });
    } finally {
      setIsUpdating(false);
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
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8 flex flex-col gap-4">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-primary text-sm font-medium">
            <ChevronLeft size={16} /> Voltar ao Dashboard
          </Link>
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2"><Users className="text-primary" /> Gestão da Equipe</h1>
              <p className="text-muted-foreground">Gerencie o acesso e as permissões dos membros do gabinete.</p>
            </div>
            {isMasterAdmin && <Link href="/gabinetes"><Button variant="outline" className="gap-2"><Building2 size={16} /> Gerenciar Gabinetes</Button></Link>}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="h-fit border-primary/10 bg-card">
            <CardHeader className="bg-primary/5">
              <CardTitle className="text-lg font-bold">Novo Assessor</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input value={newName} onChange={e => setNewName(e.target.value)} required placeholder="Nome do colaborador" />
                </div>
                <div className="space-y-2">
                  <Label>E-mail de Acesso</Label>
                  <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required placeholder="email@exemplo.com" />
                </div>
                {isMasterAdmin && (
                  <div className="space-y-2">
                    <Label>Gabinete Destino</Label>
                    <Select value={newCabinetId} onValueChange={setNewCabinetId} required>
                      <SelectTrigger><SelectValue placeholder="Selecione o Gabinete" /></SelectTrigger>
                      <SelectContent>
                        {cabinets.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.vereador}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Perfil</Label>
                  <Select value={newRole} onValueChange={(v: UserRole) => handleRoleChange(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ASSESSOR">Assessor</SelectItem>
                      <SelectItem value="ADMIN">Vereador</SelectItem>
                      <SelectItem value="ESTAGIARIO">Estagiário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3 border-t border-primary/10 pt-4">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Permissões Iniciais</Label>
                  {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`new-${key}`} 
                        checked={permissions[key as keyof UserPermissions]} 
                        onCheckedChange={(checked) => setPermissions(prev => ({ ...prev, [key]: !!checked }))}
                      />
                      <label htmlFor={`new-${key}`} className="text-xs font-medium leading-none cursor-pointer">{label}</label>
                    </div>
                  ))}
                </div>

                <Button className="w-full font-bold shadow-lg shadow-primary/10" type="submit" disabled={isAdding}>
                  {isAdding ? <Loader2 className="animate-spin" /> : "Provisionar Acesso"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-4">
            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle className="text-lg">Membros da Equipe</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {usersLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
                ) : allUsers.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">Nenhum membro cadastrado neste gabinete.</div>
                ) : allUsers.map((u: any) => {
                  const currentEmail = (u.email || u.id || "").toLowerCase().trim();
                  const isThisUserMaster = currentEmail === MASTER_EMAIL || u.perfil === "SUPER_ADMIN";
                  
                  return (
                    <div key={u.id} className="flex items-center justify-between p-4 border border-primary/5 rounded-xl hover:bg-muted/30 transition-colors">
                      <div>
                        <p className="font-bold">{u.nome || "Usuário sem nome"}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">{currentEmail}</span>
                          <Badge variant="secondary" className="text-[8px] font-bold uppercase">
                            {u.perfil === "ADMIN" ? "VEREADOR" : u.perfil}
                          </Badge>
                          {isMasterAdmin && (
                            <span className="text-[10px] text-primary font-bold">
                              {cabinets.find((c:any) => c.id === u.cabinetId)?.vereador || 'Sem Gabinete'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Dialog open={!!editingUser && (editingUser.email === u.email || editingUser.id === u.id)} onOpenChange={(open) => !open && setEditingUser(null)}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10" onClick={() => handleEditOpen(u)}>
                              <Edit2 size={18} />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Editar Perfil</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label>Nome Completo</Label>
                                <Input value={editName} onChange={e => setEditName(e.target.value)} />
                              </div>
                              {isMasterAdmin && (
                                <div className="space-y-2">
                                  <Label>Gabinete</Label>
                                  <Select value={editCabinetId} onValueChange={setEditCabinetId}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {cabinets.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.vereador}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                              <div className="space-y-2">
                                <Label>Perfil/Cargo</Label>
                                <Select value={editRole} onValueChange={(v: UserRole) => handleRoleChange(v, true)}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="ASSESSOR">Assessor</SelectItem>
                                    <SelectItem value="ADMIN">Vereador</SelectItem>
                                    <SelectItem value="ESTAGIARIO">Estagiário</SelectItem>
                                    {isThisUserMaster && <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-3 border-t border-primary/10 pt-4">
                                <Label className="text-xs font-bold uppercase text-muted-foreground">Permissões Específicas</Label>
                                {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                                  <div key={key} className="flex items-center space-x-2">
                                    <Checkbox 
                                      id={`edit-${key}`} 
                                      checked={editPermissions[key as keyof UserPermissions]} 
                                      onCheckedChange={(checked) => setEditPermissions(prev => ({ ...prev, [key]: !!checked }))}
                                    />
                                    <label htmlFor={`edit-${key}`} className="text-sm font-medium leading-none cursor-pointer">{label}</label>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setEditingUser(null)}>Cancelar</Button>
                              <Button onClick={handleUpdateUser} disabled={isUpdating}>
                                {isUpdating ? <Loader2 className="animate-spin" /> : "Salvar Alterações"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        {isMasterAdmin && !isThisUserMaster && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                                {isDeleting === u.id ? <Loader2 className="animate-spin" /> : <Trash2 size={18} />}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Usuário?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Isso removerá o acesso de <strong>{u.nome}</strong> permanentemente do sistema.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteUser(u.email || u.id)} className="bg-destructive text-destructive-foreground">Confirmar</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}