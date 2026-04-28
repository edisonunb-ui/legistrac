"use client";

import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, AuthError } from "firebase/auth";
import { useUser, useAuthInstance, useFirestore } from "@/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LayoutDashboard, Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { doc, setDoc, serverTimestamp, getDocs, collection, query, where, updateDoc } from "firebase/firestore";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const auth = useAuthInstance();
  const db = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    
    const cleanEmail = email.toLowerCase().trim();
    const isMaster = cleanEmail === "edisonunb@gmail.com";

    try {
      if (!auth || !db) throw new Error("Erro de conexão.");

      try {
        // 1. Tenta login direto
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      } catch (loginError: any) {
        // 2. Se falhar, verifica se é um novo usuário autorizado
        const q = query(collection(db, "users"), where("email", "==", cleanEmail));
        const querySnapshot = await getDocs(q);
        
        let authorizedUser = null;
        if (!querySnapshot.empty) {
          authorizedUser = querySnapshot.docs[0].data();
        }

        // Bloqueia se não for você e não estiver pré-cadastrado
        if (!isMaster && !authorizedUser) {
          throw new Error("Este e-mail não tem permissão para acessar o sistema. Entre em contato com o administrador.");
        }

        if (authorizedUser && authorizedUser.ativo === false) {
          throw new Error("Seu acesso foi desativado pelo administrador.");
        }

        // 3. Se autorizado ou for você, cria a conta no Auth
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          const newUser = userCredential.user;

          // Se já existia um placeholder criado pelo ADM, atualiza ele com o UID real
          if (authorizedUser && querySnapshot.docs[0].id) {
            await updateDoc(doc(db, "users", querySnapshot.docs[0].id), {
              uid: newUser.uid,
              ativo: true,
              dataVinculo: serverTimestamp()
            });
          } else {
            // Se for o mestre ou novo, cria o documento
            await setDoc(doc(db, "users", newUser.uid), {
              uid: newUser.uid,
              nome: cleanEmail.split("@")[0],
              email: cleanEmail,
              perfil: isMaster ? "ADMIN" : "ASSESSOR",
              ativo: true,
              createdAt: serverTimestamp(),
            });
          }

          toast({ title: "Bem-vindo!", description: "Sua conta foi vinculada e ativada." });
        } catch (createError: any) {
          if (createError.code === "auth/email-already-in-use") {
            throw new Error("Senha incorreta para este e-mail.");
          }
          throw createError;
        }
      }
    } catch (error: any) {
      toast({
        title: "Acesso Negado",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return <div className="flex items-center justify-center min-h-screen bg-background"><Loader2 className="animate-spin text-primary" size={40} /></div>;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl border-t-4 border-primary">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4 text-primary">
            <LayoutDashboard size={40} />
          </div>
          <CardTitle className="text-3xl font-bold">LegisTrac</CardTitle>
          <CardDescription>Gestão de Gabinete Restrita</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail Autorizado</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu-email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="p-3 bg-muted rounded-lg text-[11px] flex items-start gap-2 text-muted-foreground leading-tight">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              Apenas e-mails pré-cadastrados pelo administrador podem realizar o primeiro acesso.
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full h-12 text-base font-semibold" type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin mr-2" /> : "Acessar Sistema"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}