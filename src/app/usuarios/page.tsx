
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
import { Users, Loader2, Trash2, ChevronLeft, Building2, Edit2, ShieldCheck, Mail } from "lucide-react";
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
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-primary text-sm font-bold uppercase tracking-widest">
            <ChevronLeft size={16} /> Dashboard
          </Link>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2"><Users className="text-primary" /> Equipe do <span className="text-primary">Gabinete</span></h1>
              <p className="text-muted-foreground">Gerencie o acesso e as permissões de assessores e estagiários.</p>
            </div>
            {isMasterAdmin && <Link href="/gabinetes" className="w-full sm:w-auto"><Button variant="outline" className="w-full sm:w-auto gap-2 font-bold"><Building2 size={16} /> Gabinetes Isolados</Button></Link>}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="h-fit border-primary/10 bg-card shadow-xl">
            <CardHeader className="bg-primary/5">
              <CardTitle className="text-lg font-bold uppercase tracking-widest">Novo Assessor</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Nome Completo</Label>
                  <Input value={newName} onChange={e => setNewName(e.target.value)} required placeholder="Ex: João Silva" className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">E-mail de Acesso</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                    <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required placeholder="email@exemplo.com" className="pl-9 bg-background" />
                  </div>
                </div>
                {isMasterAdmin && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Gabinete Destino</Label>
                    <Select value={newCabinetId} onValueChange={setNewCabinetId} required>
                      <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione o Gabinete" /></SelectTrigger>
                      <SelectContent>
                        {cabinets.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.vereador}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Perfil / Cargo</Label>
                  <Select value={newRole} onValueChange={(v: UserRole) => handleRoleChange(v)}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ASSESSOR">Assessor</SelectItem>
                      <SelectItem value="ADMIN">Vereador</SelectItem>
                      <SelectItem value="ESTAGIARIO">Estagiário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3 border-t border-primary/10 pt-4">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Permissões Diretas</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                      <div key={key} className="flex items-center space-x-3 p-2 bg-muted/30 rounded-lg">
                        <Checkbox 
                          id={`new-${key}`} 
                          checked={permissions[key as keyof UserPermissions]} 
                          onCheckedChange={(checked) => setPermissions(prev => ({ ...prev, [key]: !!checked }))}
                        />
                        <label htmlFor={`new-${key}`} className="text-[11px] font-bold leading-none cursor-pointer text-foreground/80">{label}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button className="w-full font-bold h-11 shadow-lg shadow-primary/20" type="submit" disabled={isAdding}>
                  {isAdding ? <Loader2 className="animate-spin" /> : "Provisionar Acesso"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-4">
            <Card className="border-primary/10 shadow-xl overflow-hidden">
              <CardHeader className="bg-primary/5 flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <ShieldCheck size={20} className="text-primary" /> Membros Ativos
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-bold uppercase">{allUsers.length} Usuários</Badge>
              </CardHeader>
              <CardContent className="pt-6 space-y-3">
                {usersLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Sincronizando Lista...</p>
                  </div>
                ) : allUsers.length === 0 ? (
                  <div className="text-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed">
                    <Users size={48} className="mx-auto text-muted-foreground opacity-10 mb-4" />
                    <p className="text-muted-foreground font-bold">Nenhum membro cadastrado.</p>
                  </div>
                ) : allUsers.map((u: any) => {
                  const currentEmail = (u.email || u.id || "").toLowerCase().trim();
                  const isThisUserMaster = currentEmail === MASTER_EMAIL || u.perfil === "SUPER_ADMIN";
                  
                  return (
                    <div key={u.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-primary/5 rounded-xl hover:bg-primary/5 transition-all group gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {u.nome?.[0]?.toUpperCase() || "U"}
                        </div>
                        <div>
                          <p className="font-bold text-sm sm:text-base">{u.nome || "Usuário sem nome"}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground font-mono">{currentEmail}</span>
                            <Badge variant="secondary" className={cn(
                              "text-[8px] font-bold uppercase tracking-tighter",
                              u.perfil === "ADMIN" && "bg-primary/20 text-primary border-primary/30",
                              u.perfil === "SUPER_ADMIN" && "bg-purple-500/10 text-purple-500 border-purple-500/30"
                            )}>
                              {u.perfil === "ADMIN" ? "VEREADOR" : u.perfil}
                            </Badge>
                            {isMasterAdmin && (
                              <Badge variant="outline" className="text-[8px] font-bold text-primary border-primary/20 bg-primary/5">
                                {cabinets.find((c:any) => c.id === u.cabinetId)?.vereador || 'Sem Gabinete'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0">
                        <Dialog open={!!editingUser && (editingUser.email === u.email || editingUser.id === u.id)} onOpenChange={(open) => !open && setEditingUser(null)}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-primary hover:bg-primary/10" onClick={() => handleEditOpen(u)}>
                              <Edit2 size={16} />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Editar Perfil do Assessor</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Nome Completo</Label>
                                <Input value={editName} onChange={e => setEditName(e.target.value)} className="bg-background" />
                              </div>
                              {isMasterAdmin && (
                                <div className="space-y-2">
                                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Vincular a Gabinete</Label>
                                  <Select value={editCabinetId} onValueChange={setEditCabinetId}>
                                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {cabinets.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.vereador}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                              <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Cargo / Hierarquia</Label>
                                <Select value={editRole} onValueChange={(v: UserRole) => handleRoleChange(v, true)}>
                                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="ASSESSOR">Assessor</SelectItem>
                                    <SelectItem value="ADMIN">Vereador</SelectItem>
                                    <SelectItem value="ESTAGIARIO">Estagiário</SelectItem>
                                    {isThisUserMaster && <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-3 border-t border-primary/10 pt-4">
                                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Permissões Customizadas</Label>
                                <div className="grid grid-cols-1 gap-2">
                                  {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                                    <div key={key} className="flex items-center space-x-3 p-2 bg-muted/30 rounded-lg">
                                      <Checkbox 
                                        id={`edit-${key}`} 
                                        checked={editPermissions[key as keyof UserPermissions]} 
                                        onCheckedChange={(checked) => setEditPermissions(prev => ({ ...prev, [key]: !!checked }))}
                                      />
                                      <label htmlFor={`edit-${key}`} className="text-sm font-bold leading-none cursor-pointer text-foreground/80">{label}</label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setEditingUser(null)} className="font-bold">Cancelar</Button>
                              <Button onClick={handleUpdateUser} disabled={isUpdating} className="font-bold">
                                {isUpdating ? <Loader2 className="animate-spin" /> : "Salvar Alterações"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        {/* Proteção SuperAdmin: Nunca mostrar lixeira para o próprio master */}
                        {!isThisUserMaster && (isMasterAdmin || (profile?.perfil === "ADMIN" && u.perfil !== "ADMIN")) && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10">
                                {isDeleting === u.id ? <Loader2 className="animate-spin" /> : <Trash2 size={16} />}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover Acesso?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação removerá permanentemente o acesso de <strong>{u.nome}</strong> ao sistema deste gabinete. Os processos criados por este usuário não serão excluídos.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="font-bold">Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteUser(u.email || u.id)} className="bg-destructive text-destructive-foreground font-bold hover:bg-destructive/90">
                                  Confirmar Exclusão
                                </AlertDialogAction>
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
