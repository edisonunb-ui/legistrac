
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
import { LayoutDashboard, Loader2, AlertCircle } from "lucide-react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

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
      toast({ title: "Erro Crítico", description: "Serviços do Firebase não inicializados corretamente.", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    try {
      try {
        // Tenta logar primeiro
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: "Sucesso", description: "Login realizado com sucesso!" });
      } catch (loginError: any) {
        const error = loginError as AuthError;
        
        // Se o erro for chave inválida, o problema é na config do projeto
        if (error.code === "auth/invalid-api-key") {
          throw new Error("A chave de API do Firebase está inválida. Verifique o console do Firebase.");
        }

        // Fluxo de criação de conta (Primeiro Acesso)
        if (error.code === "auth/invalid-credential" || error.code === "auth/user-not-found") {
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const newUser = userCredential.user;

            // Define se é ADMIN (edisonunb@gmail.com)
            const isAdmin = email.toLowerCase().trim() === "edisonunb@gmail.com";

            await setDoc(doc(db, "users", newUser.uid), {
              uid: newUser.uid,
              nome: email.split("@")[0],
              email: email.toLowerCase().trim(),
              perfil: isAdmin ? "ADMIN" : "ASSESSOR",
              ativo: true,
              createdAt: serverTimestamp(),
            });

            toast({ title: "Conta Criada", description: `Bem-vindo, ${isAdmin ? "Administrador" : "Assessor"}!` });
          } catch (createError: any) {
            const cError = createError as AuthError;
            if (cError.code === "auth/email-already-in-use") {
              throw new Error("Senha incorreta para este e-mail.");
            } else if (cError.code === "auth/weak-password") {
              throw new Error("A senha deve ter pelo menos 6 caracteres.");
            } else {
              throw createError;
            }
          }
        } else {
          throw loginError;
        }
      }
    } catch (error: any) {
      console.error("Erro no login:", error);
      toast({
        title: "Falha no Acesso",
        description: error.message || "Ocorreu um erro inesperado.",
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
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
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
                placeholder="seu@email.com"
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
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={submitting}
              />
              <div className="bg-muted/50 p-3 rounded-lg flex gap-2 items-start mt-4 border">
                <AlertCircle size={16} className="text-primary shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Se for seu primeiro acesso, use sua senha definitiva (mínimo 6 caracteres).
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full font-semibold h-12" type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                "Entrar ou Criar Conta"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
