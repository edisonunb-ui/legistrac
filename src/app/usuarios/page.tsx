"use client";

import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useState, useMemo, useEffect } from "react";
import { collection, query, doc, updateDoc, serverTimestamp, orderBy, setDoc } from "firebase/firestore";
import { UserProfile, UserRole, UserPermissions } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, Shield, UserMinus, CheckCircle2, Loader2, ShieldCheck, Settings2, AlertCircle } from "lucide-react";
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

  const profileRef = useMemo(() => (user && db) ? doc(db, "users", user.uid) : null, [db, user]);
  const { data: currentUserProfile, loading: profileLoading } = useDoc(profileRef);

  // Só tenta a query se o banco e o usuário estiverem prontos para evitar erro de permissão inicial
  const usersQuery = useMemo(() => (db && user) ? query(collection(db, "users"), orderBy("createdAt", "desc")) : null, [db, user]);
  const { data: allUsers = [], loading: usersLoading, error: usersError } = useCollection(usersQuery);

  const isSuperAdmin = user?.email === "edisonunb@gmail.com" || user?.email === "gabinete.professoraflavia@gmail.com";

  const isAdmin = useMemo(() => {
    if (isSuperAdmin) return true;
    const profile = currentUserProfile as any;
    return profile?.permissoes?.gerenciar_equipe || 
           profile?.perfil === "SUPER_ADMIN" || 
           profile?.perfil === "ADMIN";
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

      const newUserRef = doc(collection(db, "users"));
      await setDoc(newUserRef, {
        id: newUserRef.id,
        email: emailLower,
        nome: newName,
        perfil: newRole,
        permissoes: permissions,
        ativo: true,
        createdAt: serverTimestamp(),
      });

      toast({ title: "Sucesso", description: "Usuário autorizado no sistema." });
      setNewEmail("");
      setNewName("");
    } catch (error: any) {
      console.error("Erro ao adicionar usuário:", error);
      toast({ 
        title: "Erro", 
        description: error.message || "Falha ao salvar usuário.", 
        variant: "destructive" 
      });
    } finally {
      setIsAdding(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, "users", userId), { ativo: !currentStatus });
      toast({ title: "Atualizado", description: `Status alterado com sucesso.` });
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

  if (!isAdmin && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md text-center shadow-lg border-destructive/20">
          <CardHeader>
            <Shield className="mx-auto text-destructive h-12 w-12 mb-2" />
            <CardTitle>Acesso Restrito</CardTitle>
            <CardDescription>Apenas administradores podem gerenciar a equipe do gabinete.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = "/"}>Voltar ao Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-headline font-bold flex items-center gap-2">
            <Users className="text-primary" />
            Gestão da Equipe
          </h1>
          <p className="text-muted-foreground">Controle quem acessa o LegisTrac e quais são suas permissões.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="h-fit shadow-lg border-none">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserPlus size={18} /> Autorizar Novo Membro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddUser} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome Completo</Label>
                    <Input placeholder="Nome do colaborador" value={newName} onChange={e => setNewName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail Institucional</Label>
                    <Input type="email" placeholder="email@gabinete.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Cargo / Função</Label>
                    <Select value={newRole} onValueChange={(v: UserRole) => handleRoleChange(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ESTAGIARIO">Estagiário</SelectItem>
                        <SelectItem value="ASSESSOR">Assessor</SelectItem>
                        <SelectItem value="ADMIN">Administrador</SelectItem>
                        <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <Label className="text-[10px] uppercase text-muted-foreground font-bold flex items-center gap-2 tracking-widest mb-2">
                    <Settings2 size={12} /> Configurações de Acesso
                  </Label>
                  <div className="grid gap-3">
                    {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`perm-${key}`} 
                          checked={permissions[key as keyof UserPermissions]} 
                          onCheckedChange={() => handleTogglePermission(key as keyof UserPermissions)}
                        />
                        <label htmlFor={`perm-${key}`} className="text-sm leading-none cursor-pointer hover:text-primary transition-colors">
                          {label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button className="w-full font-bold shadow-md" type="submit" disabled={isAdding}>
                  {isAdding ? <Loader2 className="animate-spin mr-2" /> : "Salvar Colaborador"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-4">
            <Card className="shadow-lg border-none">
              <CardHeader>
                <CardTitle className="text-lg">Membros Ativos</CardTitle>
                <CardDescription>Equipe com acesso autorizado ao gabinete.</CardDescription>
              </CardHeader>
              <CardContent>
                {usersError && (
                  <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2 text-sm mb-4">
                    <AlertCircle size={18} />
                    Erro de permissão ou conexão. Verifique as regras do Firestore.
                  </div>
                )}
                
                <div className="space-y-3">
                  {usersLoading ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <Loader2 className="animate-spin inline mr-2" /> Sincronizando equipe...
                    </div>
                  ) : allUsers.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">
                      Nenhum outro membro cadastrado.
                    </div>
                  ) : allUsers.map((u: UserProfile) => (
                    <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/30 transition-all gap-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-inner",
                          u.perfil === "SUPER_ADMIN" ? "bg-amber-500" : 
                          u.perfil === "ADMIN" ? "bg-primary" : 
                          "bg-slate-400"
                        )}>
                          {u.nome?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="font-bold text-sm flex items-center gap-2">
                            {u.nome}
                            {(u.perfil === "SUPER_ADMIN" || u.email === "edisonunb@gmail.com") && <ShieldCheck size={14} className="text-amber-500" />}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{u.email}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <Badge variant="outline" className="text-[8px] uppercase font-bold">{u.perfil}</Badge>
                            {!u.ativo && <Badge variant="destructive" className="text-[8px] uppercase">Bloqueado</Badge>}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 max-w-[200px] justify-end">
                        {u.permissoes && Object.entries(u.permissoes)
                          .filter(([_, val]) => val)
                          .map(([key]) => (
                            <div key={key} className="w-2 h-2 rounded-full bg-green-500" title={PERMISSION_LABELS[key as keyof UserPermissions]} />
                          ))
                        }
                      </div>

                      <div className="flex items-center gap-2">
                        {u.email !== "edisonunb@gmail.com" && u.email !== user?.email && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className={u.ativo ? "text-destructive" : "text-green-600"}
                            onClick={() => toggleUserStatus(u.id, u.ativo)}
                          >
                            {u.ativo ? <UserMinus size={18} /> : <CheckCircle2 size={18} />}
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