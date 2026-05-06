"use client";

import { useUser, useFirestore, useCollection } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useState, useMemo } from "react";
import { collection, query } from "firebase/firestore";
import { UserRole, UserPermissions } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, Loader2, ShieldCheck, Settings2, AlertCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { provisionarMembro, excluirUsuario } from "@/app/actions/provisionamento";
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
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("ASSESSOR");
  const [permissions, setPermissions] = useState<UserPermissions>({
    visualizar_todas: false,
    criar_demandas: true,
    finalizar_demandas: false,
    gerenciar_equipe: false,
    reabrir_demandas: false
  });
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const userEmailNormalized = user?.email?.toLowerCase().trim();
  const isMasterAdmin = userEmailNormalized === "edisonunb@gmail.com";

  const usersQuery = useMemo(() => (db && user) ? query(collection(db, "users")) : null, [db, user]);
  const { data: allUsersRaw = [], loading: usersLoading } = useCollection(usersQuery);

  const allUsers = useMemo(() => {
    return [...allUsersRaw].sort((a: any, b: any) => (a.nome || "").localeCompare(b.nome || ""));
  }, [allUsersRaw]);

  const handleTogglePermission = (key: keyof UserPermissions) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

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
    if (!newEmail || !newName) return;
    setIsAdding(true);

    try {
      const result = await provisionarMembro({
        email: newEmail,
        nome: newName,
        perfil: newRole,
        permissoes: permissions
      });

      if (result.success) {
        toast({ 
          title: "Membro Provisionado!", 
          description: `A conta para ${newName} foi criada com a senha padrão: Mudar@123` 
        });
        setNewEmail("");
        setNewName("");
      } else {
        toast({ 
          title: "Erro no Provisionamento", 
          description: result.error, 
          variant: "destructive" 
        });
      }
    } catch (error: any) {
      toast({ title: "Erro Inesperado", description: "Falha ao processar solicitação.", variant: "destructive" });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteUser = async (email: string) => {
    setIsDeleting(email);
    try {
      const result = await excluirUsuario(email);
      if (result.success) {
        toast({ title: "Usuário Excluído", description: "O acesso e o perfil foram removidos permanentemente." });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } finally {
      setIsDeleting(null);
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-headline font-bold flex items-center gap-2">
              <Users className="text-primary" />
              Gestão da Equipe
            </h1>
            <p className="text-muted-foreground mt-1">Gerencie os acessos do seu gabinete parlamentar.</p>
          </div>
          {isMasterAdmin && (
            <Badge className="bg-amber-500 text-white gap-1 py-1 px-3 shadow-md">
              <ShieldCheck size={14} /> MODO SUPER ADMIN
            </Badge>
          )}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="h-fit shadow-xl border-none">
            <CardHeader className="bg-primary/5 rounded-t-xl border-b">
              <CardTitle className="text-lg flex items-center gap-2 text-primary font-bold">
                <UserPlus size={18} /> Novo Provisionamento
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleAddUser} className="space-y-5">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Nome Completo</Label>
                    <Input placeholder="Nome do Assessor" value={newName} onChange={e => setNewName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">E-mail de Acesso</Label>
                    <Input type="email" placeholder="email@gabinete.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Perfil de Acesso</Label>
                    <Select value={newRole} onValueChange={(v: UserRole) => handleRoleChange(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ESTAGIARIO">Estagiário</SelectItem>
                        <SelectItem value="ASSESSOR">Assessor</SelectItem>
                        <SelectItem value="ADMIN">Administrador (Gabinete)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <Label className="text-[10px] uppercase text-primary font-extrabold flex items-center gap-2 tracking-widest">
                    <Settings2 size={12} /> Permissões Customizadas
                  </Label>
                  <div className="grid gap-3 p-4 bg-muted/30 rounded-lg border">
                    {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                      <div key={key} className="flex items-center space-x-3">
                        <Checkbox 
                          id={`perm-${key}`} 
                          checked={permissions[key as keyof UserPermissions]} 
                          onCheckedChange={() => handleTogglePermission(key as keyof UserPermissions)}
                        />
                        <label htmlFor={`perm-${key}`} className="text-sm font-medium leading-none cursor-pointer">
                          {label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button className="w-full font-bold h-11 mt-4" type="submit" disabled={isAdding}>
                  {isAdding ? <Loader2 className="animate-spin mr-2" /> : "Gerar Acesso e Provisionar"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-4">
            <Card className="shadow-xl border-none">
              <CardHeader className="border-b">
                <CardTitle className="text-lg font-bold">Equipe do Gabinete</CardTitle>
                <CardDescription>Membros com acesso ao sistema.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {usersLoading ? (
                    <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div>
                  ) : allUsers.length === 0 ? (
                    <div className="py-10 text-center border-2 border-dashed rounded-xl">
                      <AlertCircle className="mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground text-sm">Nenhum membro provisionado ainda.</p>
                    </div>
                  ) : allUsers.map((u: any) => (
                    <div key={u.email} className={cn(
                      "flex items-center justify-between p-4 rounded-xl border transition-all bg-card border-transparent shadow-sm",
                      !u.ativo && "grayscale opacity-60"
                    )}>
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm",
                          u.perfil === "SUPER_ADMIN" ? "bg-amber-500" : 
                          u.perfil === "ADMIN" ? "bg-primary" : "bg-slate-400"
                        )}>
                          {u.nome?.[0]?.toUpperCase() || "U"}
                        </div>
                        <div>
                          <p className="font-bold text-sm">
                            {u.nome}
                            {u.perfil === "SUPER_ADMIN" && <Badge className="ml-2 bg-amber-500 text-[9px]">MASTER</Badge>}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">{u.email}</p>
                        </div>
                      </div>
                      
                      {u.email !== userEmailNormalized && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost"
                              size="sm" 
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-9 w-9 p-0"
                              disabled={isDeleting === u.email}
                            >
                              {isDeleting === u.email ? <Loader2 className="animate-spin h-4 w-4" /> : <Trash2 size={18} />}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir Membro da Equipe?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação removerá permanentemente o acesso de <strong>{u.nome}</strong>. 
                                Ele não poderá mais logar no sistema até que seja provisionado novamente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteUser(u.email)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Confirmar Exclusão
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
