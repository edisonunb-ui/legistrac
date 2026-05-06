"use client";

import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useState, useMemo } from "react";
import { collection, query, doc, updateDoc, serverTimestamp, setDoc, orderBy } from "firebase/firestore";
import { UserRole, UserPermissions } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, Shield, Loader2, ShieldCheck, Settings2, Info } from "lucide-react";
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
  const isMasterAdmin = userEmail === "edisonunb@gmail.com" || userEmail === "gabinete.professoraflavia@gmail.com";

  const profileRef = useMemo(() => (userEmail && db) ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: currentUserProfile, loading: profileLoading } = useDoc(profileRef);

  const usersQuery = useMemo(() => (db && user) ? query(collection(db, "users"), orderBy("nome", "asc")) : null, [db, user]);
  const { data: allUsers = [], loading: usersLoading } = useCollection(usersQuery);

  const isAdmin = useMemo(() => {
    if (isMasterAdmin) return true;
    const profile = currentUserProfile as any;
    return profile?.permissoes?.gerenciar_equipe || profile?.perfil === "ADMIN" || profile?.perfil === "SUPER_ADMIN";
  }, [isMasterAdmin, currentUserProfile]);

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
      const newUserRef = doc(db, "users", emailLower);
      
      const userData = {
        id: emailLower,
        email: emailLower,
        nome: newName,
        perfil: newRole,
        permissoes: {
          visualizar_todas: !!permissions.visualizar_todas,
          criar_demandas: !!permissions.criar_demandas,
          finalizar_demandas: !!permissions.finalizar_demandas,
          gerenciar_equipe: !!permissions.gerenciar_equipe,
          reabrir_demandas: !!permissions.reabrir_demandas
        },
        ativo: true,
        updatedAt: serverTimestamp(),
      };

      await setDoc(newUserRef, {
        ...userData,
        createdAt: serverTimestamp(),
      }, { merge: true });

      toast({ title: "Sucesso", description: "Colaborador autorizado no sistema." });
      setNewEmail("");
      setNewName("");
    } catch (error: any) {
      console.error("Erro ao salvar usuário:", error);
      toast({ 
        title: "Falha na Gravação", 
        description: `Erro: ${error.message || "Permissão insuficiente"}. Verifique o console.`, 
        variant: "destructive" 
      });
    } finally {
      setIsAdding(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, "users", userId), { 
        ativo: !currentStatus,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Sucesso", description: "Status do usuário atualizado." });
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao alterar status.", variant: "destructive" });
    }
  };

  if (authLoading || (profileLoading && !isMasterAdmin)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  if (!isAdmin && !isMasterAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md text-center shadow-lg">
          <CardHeader>
            <Shield className="mx-auto text-destructive h-12 w-12 mb-2" />
            <CardTitle>Acesso Restrito</CardTitle>
            <CardDescription>Apenas administradores podem gerenciar a equipe.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = "/"}>Voltar ao Painel</Button>
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
            <p className="text-muted-foreground mt-1">Configure as permissões de cada membro do gabinete.</p>
          </div>
          {isMasterAdmin && (
            <Badge className="bg-amber-500 text-white gap-1 py-1 px-3 shadow-sm">
              <ShieldCheck size={14} /> MODO SUPER ADMIN
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
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nome Completo</Label>
                    <Input placeholder="Nome do colaborador" value={newName} onChange={e => setNewName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">E-mail de Acesso</Label>
                    <Input type="email" placeholder="email@gabinete.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cargo no Gabinete</Label>
                    <Select value={newRole} onValueChange={(v: UserRole) => handleRoleChange(v)}>
                      <SelectTrigger className="bg-muted/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ESTAGIARIO">Estagiário</SelectItem>
                        <SelectItem value="ASSESSOR">Assessor Parlamentar</SelectItem>
                        <SelectItem value="ADMIN">Administrador de Gabinete</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3 pt-6 border-t">
                  <Label className="text-[10px] uppercase text-primary font-bold flex items-center gap-2 tracking-widest mb-3">
                    <Settings2 size={12} /> Quadradinhos de Permissão
                  </Label>
                  <div className="grid gap-3 p-4 bg-muted/20 rounded-xl border border-dashed border-primary/20">
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

                <Button className="w-full font-bold shadow-lg h-11" type="submit" disabled={isAdding}>
                  {isAdding ? <Loader2 className="animate-spin mr-2" /> : "Autorizar e Salvar"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-4">
            <Card className="shadow-xl border-none ring-1 ring-black/5">
              <CardHeader>
                <CardTitle className="text-lg">Equipe Ativa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {usersLoading ? (
                    <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div>
                  ) : allUsers.length === 0 ? (
                    <div className="py-10 text-center border border-dashed rounded-xl">
                      <p className="text-muted-foreground text-sm">Nenhum membro listado.</p>
                    </div>
                  ) : allUsers.map((u: any) => (
                    <div key={u.id} className={cn(
                      "flex items-center justify-between p-4 rounded-xl border transition-all gap-4",
                      u.ativo ? "bg-card" : "bg-muted/50 grayscale opacity-70"
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
                          <p className="font-bold text-sm flex items-center gap-1.5">
                            {u.nome}
                            {u.perfil === "SUPER_ADMIN" && <ShieldCheck size={14} className="text-amber-500" />}
                          </p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                          <div className="flex gap-1.5 mt-1">
                            <Badge variant="outline" className="text-[9px] uppercase font-bold">{u.perfil}</Badge>
                          </div>
                        </div>
                      </div>
                      
                      {u.email !== userEmail && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className={cn(
                            "font-bold text-xs h-8",
                            u.ativo ? "text-destructive" : "text-green-600"
                          )}
                          onClick={() => toggleUserStatus(u.id, u.ativo)}
                        >
                          {u.ativo ? "Bloquear" : "Ativar"}
                        </Button>
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