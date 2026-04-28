
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
import { LayoutDashboard, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";

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
    
    if (!auth || !db) {
      toast({ title: "Erro de Sistema", description: "O Firebase não foi carregado corretamente.", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    try {
      // Tenta login
      try {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: "Sucesso", description: "Bem-vindo de volta!" });
      } catch (loginError: any) {
        const error = loginError as AuthError;
        
        // Se o erro for chave inválida, o problema está na config do Firebase Console
        if (error.code === "auth/invalid-api-key") {
          throw new Error("A Chave de API do Firebase é inválida. Verifique se o projeto 'projetojaque-3c3b8' está ativo no Google Cloud.");
        }

        // Se o usuário não existir, tenta criar (Fluxo de Primeiro Acesso)
        if (error.code === "auth/user-not-found" || error.code === "auth/invalid-credential") {
          // Nota: invalid-credential pode ser senha errada OU usuário não encontrado (proteção do Firebase)
          // Vamos tentar criar a conta. Se a senha estiver errada para uma conta existente, o createUser falhará.
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const newUser = userCredential.user;

            const isAdmin = email.toLowerCase().trim() === "edisonunb@gmail.com";

            await setDoc(doc(db, "users", newUser.uid), {
              uid: newUser.uid,
              nome: email.split("@")[0],
              email: email.toLowerCase().trim(),
              perfil: isAdmin ? "ADMIN" : "ASSESSOR",
              ativo: true,
              createdAt: serverTimestamp(),
            });

            toast({ 
              title: isAdmin ? "Administrador Criado" : "Conta Criada", 
              description: `Acesso configurado para ${email}.` 
            });
          } catch (createError: any) {
            const cError = createError as AuthError;
            if (cError.code === "auth/email-already-in-use") {
              throw new Error("Senha incorreta para este usuário.");
            } else if (cError.code === "auth/weak-password") {
              throw new Error("A senha deve ter pelo menos 6 caracteres.");
            } else if (cError.code === "auth/operation-not-allowed") {
              throw new Error("O login por e-mail/senha não está ativado no console do Firebase.");
            } else {
              throw createError;
            }
          }
        } else {
          throw loginError;
        }
      }
    } catch (error: any) {
      console.error("Erro de Autenticação:", error);
      toast({
        title: "Falha no Acesso",
        description: error.message || "Verifique sua conexão e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl border-t-4 border-t-primary">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <div className="p-3 bg-primary/10 rounded-full text-primary">
              <LayoutDashboard size={32} />
            </div>
          </div>
          <CardTitle className="text-3xl font-headline font-bold text-primary">LegisTrac</CardTitle>
          <CardDescription className="text-muted-foreground">
            Gestão Interna de Gabinete
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="edisonunb@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Sua senha definitiva"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={submitting}
              />
              {email.toLowerCase().trim() === "edisonunb@gmail.com" && (
                <div className="bg-green-50 p-3 rounded-lg flex gap-2 items-start mt-4 border border-green-100">
                  <ShieldCheck size={16} className="text-green-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-green-700 leading-tight">
                    E-mail administrativo detectado. A primeira senha digitada será a definitiva.
                  </p>
                </div>
              )}
              <div className="bg-muted/50 p-3 rounded-lg flex gap-2 items-start mt-4 border">
                <AlertCircle size={16} className="text-primary shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Mínimo de 6 caracteres. Se for seu primeiro acesso, a conta será criada automaticamente.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full font-semibold h-12" type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando Credenciais...
                </>
              ) : (
                "Entrar ou Criar Gabinete"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
