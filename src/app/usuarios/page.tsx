"use client";

import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useState, useMemo } from "react";
import { collection, query, where, doc, updateDoc } from "firebase/firestore";
import { UserRole, UserPermissions, UserProfile } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Users, Loader2, Trash2, ChevronLeft, Building2, Edit2, ShieldCheck, Mail, Key, ShieldAlert } from "lucide-react";
import { provisionarMembro, excluirUsuario } from "@/app/actions/provisionamento";
import Link from "next/link";
import { cn } from "@/lib/utils";
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
  DialogDescription as DialogDesc
} from "@/components/ui/dialog";

const PERMISSION_LABELS: Record<keyof UserPermissions, string> = {
  visualizar_todas: "Ver Todas as Demandas",
  criar_demandas: "Criar Demandas",
  finalizar_demandas: "Finalizar Demandas",
  gerenciar_equipe: "Gerenciar Equipe",
  reabrir_demandas: "Reabrir Demandas"
};

const MASTER_EMAIL = "edisonunb@gmail.com";
const AUDITOR_EMAIL = "alemao@gmail.com";

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
  const isMasterAdmin = userEmail === MASTER_EMAIL;
  const isAuditor = userEmail === AUDITOR_EMAIL;
  const hasGlobalView = isMasterAdmin || isAuditor;
  
  const profileRef = useMemo(() => (userEmail && db) ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: profile } = useDoc(profileRef);

  const cabinetId = (profile as any)?.cabinetId;

  const cabinetsQuery = useMemo(() => db ? collection(db, "gabinetes") : null, [db]);
  const { data: cabinets = [] } = useCollection(cabinetsQuery);

  const usersQuery = useMemo(() => {
    if (!db || !user) return null;
    if (hasGlobalView) return query(collection(db, "users"));
    if (cabinetId) return query(collection(db, "users"), where("cabinetId", "==", cabinetId));
    return null;
  }, [db, user, hasGlobalView, cabinetId]);

  const { data: rawUsers = [], loading: usersLoading } = useCollection(usersQuery);

  const activeUsers = useMemo(() => {
    return rawUsers.filter((u: any) => !u.deleted || hasGlobalView);
  }, [rawUsers, hasGlobalView]);

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
    const targetCabinet = hasGlobalView ? newCabinetId : cabinetId;
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
        if (hasGlobalView) setNewCabinetId("");
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
    if (isAuditor) {
      toast({ title: "Acesso Negado", description: "Auditores não podem excluir registros.", variant: "destructive" });
      return;
    }
    setIsDeleting(email);
    try {
      const result = await excluirUsuario(email, user?.email || "");
      if (result.success) {
        toast({ 
          title: "Acesso Removido", 
          description: "O usuário foi desativado e suas demandas foram transferidas para o Vereador do gabinete." 
        });
      }
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
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-primary text-[10px] font-black uppercase tracking-[0.3em] transition-all">
            <ChevronLeft size={16} /> Dashboard
          </Link>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter text-white">Equipe do <span className="text-primary">Gabinete</span></h1>
              <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-1">Gestão de acesso, cargos e níveis de poder.</p>
            </div>
            {hasGlobalView && <Link href="/gabinetes" className="w-full sm:w-auto"><Button variant="outline" className="w-full sm:w-auto gap-2 font-black uppercase text-[10px] tracking-widest border-white/10 text-white"><Building2 size={16} /> Instâncias Isoladas</Button></Link>}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <Card className="h-fit bg-white/5 border-white/5 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            <CardHeader className="bg-white/5 border-b border-white/5">
              <CardTitle className="text-[11px] font-black uppercase tracking-[0.3em] text-primary">Provisionar Membro</CardTitle>
              <CardDescription className="text-[9px] uppercase font-bold text-muted-foreground">Cadastre novos assessores para o fluxo de trabalho.</CardDescription>
            </CardHeader>
            <CardContent className="pt-8 space-y-6">
              <form onSubmit={handleAddUser} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Nome Completo</Label>
                  <Input value={newName} onChange={e => setNewName(e.target.value)} required placeholder="Ex: João Silva" className="bg-black/50 border-white/10 text-white h-12 font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">E-mail de Acesso</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/50" size={16} />
                    <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required placeholder="email@exemplo.com" className="pl-10 bg-black/50 border-white/10 text-white h-12 font-bold" />
                  </div>
                </div>
                {hasGlobalView && (
                  <div className="space-y-2">
                    <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Gabinete Destino</Label>
                    <Select value={newCabinetId} onValueChange={setNewCabinetId} required>
                      <SelectTrigger className="bg-black/50 border-white/10 text-white h-12 font-bold"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent className="bg-black border-white/10">
                        {cabinets.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.vereador}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Cargo / Hierarquia</Label>
                  <Select value={newRole} onValueChange={(v: UserRole) => handleRoleChange(v)}>
                    <SelectTrigger className="bg-black/50 border-white/10 text-white h-12 font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-black border-white/10">
                      <SelectItem value="ASSESSOR">Assessor Técnico</SelectItem>
                      <SelectItem value="ADMIN">Vereador(a)</SelectItem>
                      <SelectItem value="ESTAGIARIO">Estagiário(a)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4 border-t border-white/5 pt-6">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-primary flex items-center gap-2"><Key size={14} /> Atribuições de Poder</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                      <div key={key} className="flex items-center space-x-3 p-3 bg-black/40 rounded-xl border border-white/5 transition-all hover:bg-black/60">
                        <Checkbox 
                          id={`new-${key}`} 
                          checked={permissions[key as keyof UserPermissions]} 
                          onCheckedChange={(checked) => setPermissions(prev => ({ ...prev, [key]: !!checked }))}
                          className="data-[state=checked]:bg-primary"
                        />
                        <label htmlFor={`new-${key}`} className="text-[10px] font-black uppercase leading-none cursor-pointer text-white/80">{label}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button className="w-full font-black uppercase text-[11px] tracking-widest h-14 bg-primary text-black glow-primary mt-4" type="submit" disabled={isAdding}>
                  {isAdding ? <Loader2 className="animate-spin" /> : "Finalizar Cadastro"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white/5 border-white/5 shadow-2xl overflow-hidden">
              <CardHeader className="bg-white/5 border-b border-white/5 flex flex-row items-center justify-between py-6">
                <CardTitle className="text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-3 text-primary">
                  <ShieldCheck size={18} /> Membros Ativos
                </CardTitle>
                <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 text-primary">{activeUsers.length} Agentes</Badge>
              </CardHeader>
              <CardContent className="pt-8 space-y-4">
                {usersLoading ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <Loader2 className="animate-spin text-primary" size={32} />
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.3em] animate-pulse">Sincronizando Lista...</p>
                  </div>
                ) : activeUsers.length === 0 ? (
                  <div className="text-center py-24 bg-black/20 rounded-3xl border-2 border-dashed border-white/5">
                    <Users size={48} className="mx-auto text-muted-foreground opacity-10 mb-4" />
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Nenhum assessor registrado no momento.</p>
                  </div>
                ) : activeUsers.map((u: any) => {
                  const currentEmail = (u.email || u.id || "").toLowerCase().trim();
                  const isThisUserMaster = currentEmail === MASTER_EMAIL;
                  const isThisUserAuditor = currentEmail === AUDITOR_EMAIL;
                  
                  return (
                    <div key={u.id} className={cn(
                      "flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-black/40 border rounded-2xl transition-all group gap-6",
                      u.deleted ? "border-dashed opacity-50 bg-transparent" : "border-white/5 hover:border-primary/40"
                    )}>
                      <div className="flex items-center gap-5">
                        <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary font-black text-xl shadow-inner uppercase group-hover:bg-primary/10 transition-colors">
                          {u.nome?.[0]?.toUpperCase() || "U"}
                        </div>
                        <div>
                          <p className="font-black text-lg uppercase tracking-tight text-white flex items-center gap-3 group-hover:text-primary transition-colors">
                            {u.nome || "Usuário sem nome"}
                            {u.deleted && <Badge variant="destructive" className="text-[8px] font-black uppercase px-2 py-0.5">Acesso Revogado</Badge>}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 mt-1.5">
                            <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">{currentEmail}</span>
                            <Badge className={cn(
                              "text-[8px] font-black uppercase tracking-tighter px-2 py-0.5 text-black",
                              u.perfil === "ADMIN" ? "bg-primary glow-primary" : "bg-secondary text-white"
                            )}>
                              {isThisUserAuditor ? "AUDITOR GLOBAL" : (u.perfil === "ADMIN" ? "VEREADOR" : u.perfil)}
                            </Badge>
                            {hasGlobalView && (
                              <Badge variant="outline" className="text-[8px] font-black uppercase border-primary/20 text-primary px-2 py-0.5">
                                Instância: {cabinets.find((c:any) => c.id === u.cabinetId)?.vereador || 'Central'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto justify-end pt-4 sm:pt-0 border-t sm:border-t-0 border-white/5">
                        {!u.deleted && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-11 px-4 bg-white/5 hover:bg-primary/20 text-primary gap-2 font-black uppercase text-[10px] tracking-widest border border-white/5 hover:border-primary/40 transition-all"
                            onClick={() => handleEditOpen(u)}
                          >
                            <Edit2 size={14} /> Editar Poderes
                          </Button>
                        )}

                        {isMasterAdmin && !isThisUserMaster && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-11 w-11 text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-white/5">
                                {isDeleting === (u.email || u.id) ? <Loader2 className="animate-spin h-4 w-4" /> : <Trash2 size={16} />}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-black border-white/10 text-white">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="font-black uppercase tracking-widest text-destructive text-xl">Revogar Acesso?</AlertDialogTitle>
                                <AlertDialogDescription className="text-[10px] uppercase font-bold text-muted-foreground mt-2 leading-relaxed">
                                  {u.deleted 
                                    ? "Você está prestes a apagar este registro permanentemente dos arquivos do sistema." 
                                    : "O assessor perderá acesso imediato. Todas as demandas dele serão transferidas para o Vereador titular."}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="mt-8">
                                <AlertDialogCancel className="bg-white/5 border-white/10 font-black uppercase text-[10px] h-12">Manter Acesso</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteUser(u.email || u.id)} className="bg-destructive text-white font-black uppercase text-[10px] h-12">
                                  Confirmar Revogação
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

        {/* MODAL DE EDIÇÃO DE USUÁRIO */}
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent className="max-w-2xl w-[95vw] bg-black border-white/10 text-white shadow-2xl">
            <DialogHeader>
              <DialogTitle className="font-black uppercase tracking-widest text-primary text-xl flex items-center gap-3">
                <Edit2 size={20} /> Ajustar Nível de Poder
              </DialogTitle>
              <DialogDesc className="text-[10px] uppercase font-bold text-muted-foreground mt-2">
                Modifique as permissões de {editingUser?.nome} no sistema.
              </DialogDesc>
            </DialogHeader>
            <div className="space-y-8 py-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Nome de Exibição</Label>
                  <Input value={editName} onChange={e => setEditName(e.target.value)} className="bg-white/5 border-white/10 text-white h-12 font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Cargo / Hierarquia</Label>
                  <Select value={editRole} onValueChange={(v: UserRole) => handleRoleChange(v, true)}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-12 font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-black border-white/10">
                      <SelectItem value="ASSESSOR">Assessor Técnico</SelectItem>
                      <SelectItem value="ADMIN">Vereador(a)</SelectItem>
                      <SelectItem value="ESTAGIARIO">Estagiário(a)</SelectItem>
                      {isMasterAdmin && <SelectItem value="SUPER_ADMIN">Desenvolvedor Master</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isMasterAdmin && (
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Vincular a Outra Instância</Label>
                  <Select value={editCabinetId} onValueChange={setEditCabinetId}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-12 font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-black border-white/10">
                      {cabinets.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.vereador}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-4 pt-6 border-t border-white/5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><ShieldAlert size={14} /> Permissões Individuais</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                    <div key={key} className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                      <Checkbox 
                        id={`edit-${key}`} 
                        checked={editPermissions[key as keyof UserPermissions]} 
                        onCheckedChange={(checked) => setEditPermissions(prev => ({ ...prev, [key]: !!checked }))}
                        className="data-[state=checked]:bg-primary"
                      />
                      <label htmlFor={`edit-${key}`} className="text-[10px] font-black uppercase leading-none cursor-pointer text-white/80">{label}</label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-4">
              <Button variant="outline" onClick={() => setEditingUser(null)} className="w-full h-14 font-black uppercase text-[11px] tracking-widest border-white/10 text-white">Cancelar</Button>
              <Button onClick={handleUpdateUser} disabled={isUpdating} className="w-full h-14 bg-primary text-black font-black uppercase text-[11px] tracking-widest glow-primary">
                {isUpdating ? <Loader2 className="animate-spin" /> : "Confirmar Alterações"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}