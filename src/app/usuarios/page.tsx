"use client";

import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useState, useMemo } from "react";
import { collection, query, doc, setDoc, updateDoc, serverTimestamp, orderBy } from "firebase/firestore";
import { UserProfile, UserRole } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, Shield, UserMinus, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function UserManagementPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("ASSESSOR");
  const [isAdding, setIsAdding] = useState(false);

  const profileRef = useMemo(() => user && db ? doc(db, "users", user.uid) : null, [db, user]);
  const { data: currentUserProfile } = useDoc(profileRef);

  const usersQuery = useMemo(() => db ? query(collection(db, "users"), orderBy("email", "asc")) : null, [db]);
  const { data: allUsers = [], loading } = useCollection(usersQuery);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !newEmail || !newName) return;
    setIsAdding(true);

    try {
      // Cria um placeholder do usuário. O UID será preenchido no primeiro login dele.
      const tempId = `temp_${Date.now()}`;
      await setDoc(doc(db, "users", tempId), {
        email: newEmail.toLowerCase().trim(),
        nome: newName,
        perfil: newRole,
        ativo: true,
        createdAt: serverTimestamp(),
      });

      toast({ title: "Sucesso", description: "E-mail autorizado. O usuário já pode criar sua senha." });
      setNewEmail("");
      setNewName("");
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao autorizar e-mail.", variant: "destructive" });
    } finally {
      setIsAdding(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, "users", userId), { ativo: !currentStatus });
      toast({ title: "Atualizado", description: `Usuário ${!currentStatus ? 'ativado' : 'desativado'}.` });
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao alterar status.", variant: "destructive" });
    }
  };

  if ((currentUserProfile as any)?.perfil !== "ADMIN") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <CardHeader>
            <Shield className="mx-auto text-destructive h-12 w-12 mb-2" />
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>Apenas administradores podem gerenciar a equipe.</CardDescription>
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
          <p className="text-muted-foreground">Controle quem tem acesso ao seu gabinete.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulário de Cadastro */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserPlus size={18} /> Autorizar Novo E-mail
              </CardTitle>
              <CardDescription>
                Ao adicionar um e-mail aqui, ele será autorizado a criar uma conta no sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input 
                    placeholder="Ex: João Silva" 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-mail Institucional</Label>
                  <Input 
                    type="email" 
                    placeholder="joao@gabinete.com" 
                    value={newEmail} 
                    onChange={e => setNewEmail(e.target.value)} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Perfil de Acesso</Label>
                  <Select value={newRole} onValueChange={(v: UserRole) => setNewRole(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ASSESSOR">Assessor</SelectItem>
                      <SelectItem value="ADMIN">Administrador (ADMIN)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" type="submit" disabled={isAdding}>
                  {isAdding ? "Adicionando..." : "Autorizar Acesso"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Lista de Usuários */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Usuários Cadastrados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {loading ? (
                    <div className="py-8 text-center"><Loader2 className="animate-spin inline mr-2" /> Carregando equipe...</div>
                  ) : allUsers.map((u: UserProfile) => (
                    <div key={u.id} className="flex items-center justify-between p-4 rounded-xl border bg-card hover:shadow-sm transition-all">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center font-bold text-white",
                          u.perfil === "ADMIN" ? "bg-primary" : "bg-slate-400"
                        )}>
                          {u.nome?.[0] || "?"}
                        </div>
                        <div>
                          <p className="font-semibold text-sm leading-none flex items-center gap-2">
                            {u.nome}
                            {u.email === "edisonunb@gmail.com" && <Badge variant="outline" className="text-[10px]">Master</Badge>}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{u.email}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-[9px] uppercase">{u.perfil}</Badge>
                            {!u.uid && <Badge variant="outline" className="text-[9px] border-orange-200 text-orange-600 bg-orange-50">Aguardando Primeiro Login</Badge>}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {u.email !== "edisonunb@gmail.com" && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className={cn(
                              "gap-2",
                              u.ativo ? "text-destructive hover:text-destructive" : "text-green-600 hover:text-green-600"
                            )}
                            onClick={() => toggleUserStatus(u.id, u.ativo)}
                          >
                            {u.ativo ? <UserMinus size={16} /> : <CheckCircle2 size={16} />}
                            <span className="hidden sm:inline">{u.ativo ? "Desativar" : "Reativar"}</span>
                          </Button>
                        )}
                        {u.ativo ? (
                          <div className="text-green-500 p-2"><CheckCircle2 size={18} /></div>
                        ) : (
                          <div className="text-destructive p-2"><XCircle size={18} /></div>
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