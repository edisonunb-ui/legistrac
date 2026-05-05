"use client";

import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useState, useMemo, useEffect } from "react";
import { collection, query, doc, updateDoc, serverTimestamp, setDoc, orderBy } from "firebase/firestore";
import { UserProfile, UserRole, UserPermissions } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, Shield, UserMinus, CheckCircle2, Loader2, ShieldCheck, Settings2, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

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

  const userEmail = user?.email?.toLowerCase().trim();
  const isSuperAdmin = userEmail === "edisonunb@gmail.com" || userEmail === "gabinete.professoraflavia@gmail.com";

  // Perfil baseado no e-mail logado
  const profileRef = useMemo(() => (userEmail && db) ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: currentUserProfile, loading: profileLoading } = useDoc(profileRef);

  // Lista de usuários - ordenada por nome
  const usersQuery = useMemo(() => (db && user) ? query(collection(db, "users"), orderBy("nome", "asc")) : null, [db, user]);
  const { data: allUsers = [], loading: usersLoading, error: usersError } = useCollection(usersQuery);

  const isAdmin = useMemo(() => {
    if (isSuperAdmin) return true;
    const profile = currentUserProfile as any;
    return profile?.permissoes?.gerenciar_equipe || profile?.perfil === "ADMIN" || profile?.perfil === "SUPER_ADMIN";
  }, [isSuperAdmin, currentUserProfile]);

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
    if (!db || !newEmail || !newName) return;
    setIsAdding(true);

    try {
      const emailLower = newEmail.toLowerCase().trim();
      const exists = allUsers.find(u => u.email === emailLower);
      if (exists) throw new Error("Este e-mail já está cadastrado.");

      const newUserRef = doc(db, "users", emailLower);
      await setDoc(newUserRef, {
        id: emailLower,
        email: emailLower,
        nome: newName,
        perfil: newRole,
        permissoes: permissions,
        ativo: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({ title: "Sucesso", description: "Membro da equipe autorizado." });
      setNewEmail("");
      setNewName("");
    } catch (error: any) {
      console.error("Erro ao adicionar usuário:", error);
      toast({ 
        title: "Falha na Gravação", 
        description: "Erro de permissão ou conexão. Tente novamente.", 
        variant: "destructive" 
      });
    } finally {
      setIsAdding(false);
    }
  };

  const toggleUserStatus = async (userEmailKey: string, currentStatus: boolean) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, "users", userEmailKey), { ativo: !currentStatus });
      toast({ title: "Sucesso", description: "Status do usuário atualizado." });
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao alterar status.", variant: "destructive" });
    }
  };

  if (authLoading || (profileLoading && !isSuperAdmin)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  // Se não for admin nem super admin, e não estiver mais carregando
  if (!authLoading && !profileLoading && !isAdmin && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md text-center shadow-lg border-destructive/20">
          <CardHeader>
            <Shield className="mx-auto text-destructive h-12 w-12 mb-2" />
            <CardTitle>Acesso Restrito</CardTitle>
            <CardDescription>Apenas o administrador do gabinete pode gerenciar a equipe.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = "/"}>Voltar ao Início</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <p className="text-muted-foreground mt-1">Configure os cargos e permissões dos membros do seu gabinete.</p>
          </div>
          {isSuperAdmin && (
            <Badge className="bg-amber-500 text-white gap-1 py-1 px-3 shadow-sm border-none">
              <ShieldCheck size={14} /> MODO SUPER ADMIN ATIVO
            </Badge>
          )}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="h-fit shadow-xl border-none ring-1 ring-black/5">
            <CardHeader className="bg-primary/5 rounded-t-xl">
              <CardTitle className="text-lg flex items-center gap-2 text-primary">
                <UserPlus size={18} /> Cadastrar Membro
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleAddUser} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome do Colaborador</Label>
                    <Input placeholder="Ex: João Silva" value={newName} onChange={e => setNewName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">E-mail de Acesso</Label>
                    <Input type="email" placeholder="email@gabinete.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cargo Principal</Label>
                    <Select value={newRole} onValueChange={(v: UserRole) => handleRoleChange(v)}>
                      <SelectTrigger className="bg-muted/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ESTAGIARIO">Estagiário</SelectItem>
                        <SelectItem value="ASSESSOR">Assessor</SelectItem>
                        <SelectItem value="ADMIN">Administrador de Gabinete</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3 pt-6 border-t">
                  <Label className="text-[10px] uppercase text-primary font-bold flex items-center gap-2 tracking-widest mb-3">
                    <Settings2 size={12} /> Quadradinhos de Permissão
                  </Label>
                  <div className="grid gap-3 p-3 bg-muted/20 rounded-lg border border-dashed border-primary/20">
                    {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                      <div key={key} className="flex items-center space-x-3 group">
                        <Checkbox 
                          id={`perm-${key}`} 
                          checked={permissions[key as keyof UserPermissions]} 
                          onCheckedChange={() => handleTogglePermission(key as keyof UserPermissions)}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <label htmlFor={`perm-${key}`} className="text-sm font-medium leading-none cursor-pointer group-hover:text-primary transition-colors">
                          {label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button className="w-full font-bold shadow-lg h-11" type="submit" disabled={isAdding}>
                  {isAdding ? <Loader2 className="animate-spin mr-2" /> : "Autorizar e Salvar"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-4">
            <Card className="shadow-xl border-none ring-1 ring-black/5">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Equipe Autorizada</CardTitle>
                  <CardDescription>Visualize e gerencie quem tem acesso ao sistema.</CardDescription>
                </div>
                {usersError && (
                  <Badge variant="destructive" className="animate-pulse">Erro de Sincronização</Badge>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {usersLoading ? (
                    <div className="py-20 text-center text-muted-foreground flex flex-col items-center gap-2">
                      <Loader2 className="animate-spin text-primary" size={32} />
                      <p className="text-sm font-medium">Carregando membros da equipe...</p>
                    </div>
                  ) : allUsers.length === 0 ? (
                    <div className="py-20 text-center border-2 border-dashed rounded-xl">
                      <Info className="mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">Nenhum membro cadastrado além de você.</p>
                    </div>
                  ) : allUsers.map((u: any) => (
                    <div key={u.id} className={cn(
                      "flex items-center justify-between p-4 rounded-xl border transition-all gap-4 group",
                      u.ativo ? "bg-card hover:border-primary/50" : "bg-muted/50 grayscale"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-sm",
                          u.perfil === "SUPER_ADMIN" ? "bg-amber-500" : 
                          u.perfil === "ADMIN" ? "bg-primary" : "bg-slate-400"
                        )}>
                          {u.nome?.[0]?.toUpperCase() || "U"}
                        </div>
                        <div>
                          <p className="font-bold text-sm flex items-center gap-1">
                            {u.nome}
                            {(u.email === "edisonunb@gmail.com" || u.perfil === "SUPER_ADMIN") && <ShieldCheck size={14} className="text-amber-500" />}
                          </p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                          <div className="flex gap-1.5 mt-1.5">
                            <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-tight">{u.perfil}</Badge>
                            {!u.ativo && <Badge variant="destructive" className="text-[9px] uppercase font-bold">Bloqueado</Badge>}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {u.email !== "edisonunb@gmail.com" && u.email !== user?.email && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className={cn(
                              "font-bold text-xs h-8",
                              u.ativo ? "text-destructive hover:bg-destructive/10" : "text-green-600 hover:bg-green-50"
                            )}
                            onClick={() => toggleUserStatus(u.id, u.ativo)}
                          >
                            {u.ativo ? "Bloquear" : "Ativar Acesso"}
                          </Button>
                        )}
                      </div>
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