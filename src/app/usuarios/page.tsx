"use client";

import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useState, useMemo } from "react";
import { collection, query, doc, updateDoc, serverTimestamp, orderBy, addDoc } from "firebase/firestore";
import { UserProfile, UserRole, UserPermissions } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, Shield, UserMinus, CheckCircle2, Loader2, ShieldCheck, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [permissions, setPermissions] = useState<UserPermissions>({
    visualizar_todas: false,
    criar_demandas: true,
    finalizar_demandas: false,
    gerenciar_equipe: false,
    reabrir_demandas: false
  });
  const [isAdding, setIsAdding] = useState(false);

  const profileRef = useMemo(() => user && db ? doc(db, "users", user.uid) : null, [db, user]);
  const { data: currentUserProfile } = useDoc(profileRef);

  const usersQuery = useMemo(() => db ? query(collection(db, "users"), orderBy("email", "asc")) : null, [db]);
  const { data: allUsers = [], loading } = useCollection(usersQuery);

  const isAdmin = (currentUserProfile as any)?.permissoes?.gerenciar_equipe || user?.email === "edisonunb@gmail.com";

  const handleTogglePermission = (key: keyof UserPermissions) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleRoleChange = (role: UserRole) => {
    setNewRole(role);
    // Sugestão de permissões padrão baseada no cargo
    if (role === "ADMIN") {
      setPermissions({
        visualizar_todas: true,
        criar_demandas: true,
        finalizar_demandas: true,
        gerenciar_equipe: true,
        reabrir_demandas: true
      });
    } else if (role === "ASSESSOR") {
      setPermissions({
        visualizar_todas: false,
        criar_demandas: true,
        finalizar_demandas: false,
        gerenciar_equipe: false,
        reabrir_demandas: false
      });
    } else if (role === "ESTAGIARIO") {
      setPermissions({
        visualizar_todas: false,
        criar_demandas: true,
        finalizar_demandas: false,
        gerenciar_equipe: false,
        reabrir_demandas: false
      });
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !newEmail || !newName) return;
    setIsAdding(true);

    try {
      const emailLower = newEmail.toLowerCase().trim();
      const exists = allUsers.find(u => u.email === emailLower);
      if (exists) throw new Error("Este e-mail já está cadastrado.");

      await addDoc(collection(db, "users"), {
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
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsAdding(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, "users", userId), { ativo: !currentStatus });
      toast({ title: "Atualizado", description: `Status alterado.` });
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao alterar status.", variant: "destructive" });
    }
  };

  if (!isAdmin && !loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <CardHeader>
            <Shield className="mx-auto text-destructive h-12 w-12 mb-2" />
            <CardTitle>Acesso Restrito</CardTitle>
            <CardDescription>Você não tem permissão para gerenciar a equipe.</CardDescription>
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
        <header className="mb-8">
          <h1 className="text-3xl font-headline font-bold flex items-center gap-2">
            <Users className="text-primary" />
            Gestão da Equipe
          </h1>
          <p className="text-muted-foreground">Configure os cargos e permissões de acesso do gabinete.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="h-fit shadow-lg border-none">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserPlus size={18} /> Novo Usuário
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddUser} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input placeholder="Nome do colaborador" value={newName} onChange={e => setNewName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input type="email" placeholder="email@gabinete.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Cargo</Label>
                    <Select value={newRole} onValueChange={(v: UserRole) => handleRoleChange(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ESTAGIARIO">Estagiário</SelectItem>
                        <SelectItem value="ASSESSOR">Assessor</SelectItem>
                        <SelectItem value="ADMIN">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <Label className="text-xs uppercase text-muted-foreground font-bold flex items-center gap-2">
                    <Settings2 size={14} /> Permissões (Quadradinhos)
                  </Label>
                  <div className="grid gap-3">
                    {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`perm-${key}`} 
                          checked={permissions[key as keyof UserPermissions]} 
                          onCheckedChange={() => handleTogglePermission(key as keyof UserPermissions)}
                        />
                        <label htmlFor={`perm-${key}`} className="text-sm leading-none cursor-pointer">
                          {label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button className="w-full font-bold" type="submit" disabled={isAdding}>
                  {isAdding ? <Loader2 className="animate-spin mr-2" /> : "Autorizar e Salvar"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-4">
            <Card className="shadow-lg border-none">
              <CardHeader>
                <CardTitle className="text-lg">Equipe Cadastrada</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {loading ? (
                    <div className="py-8 text-center"><Loader2 className="animate-spin inline mr-2" /> Carregando...</div>
                  ) : allUsers.map((u: UserProfile) => (
                    <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/30 transition-all gap-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-inner",
                          u.perfil === "SUPER_ADMIN" ? "bg-amber-500" : 
                          u.perfil === "ADMIN" ? "bg-primary" : 
                          "bg-slate-400"
                        )}>
                          {u.nome?.[0] || "?"}
                        </div>
                        <div>
                          <p className="font-bold text-sm flex items-center gap-2">
                            {u.nome}
                            {u.perfil === "SUPER_ADMIN" && <ShieldCheck size={14} className="text-amber-500" />}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{u.email}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <Badge variant="outline" className="text-[8px] uppercase">{u.perfil}</Badge>
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
                        {u.email !== "edisonunb@gmail.com" && (
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
