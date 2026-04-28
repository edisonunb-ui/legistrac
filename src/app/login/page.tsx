
"use client";

import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { useUser, useAuthInstance, useFirestore } from "@/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LayoutDashboard, Loader2, Sparkles } from "lucide-react";
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
    setSubmitting(true);
    
    if (!auth || !db) {
      toast({ title: "Erro", description: "Serviços não inicializados.", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    try {
      // Tenta logar
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (loginError: any) {
        // Se o erro for usuário não encontrado, tenta registrar (comportamento de primeiro acesso)
        if (loginError.code === "auth/user-not-found" || loginError.code === "auth/invalid-credential") {
          toast({ title: "Primeiro Acesso", description: "Criando sua conta com as credenciais informadas..." });
          
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const newUser = userCredential.user;

          // Define se é ADMIN com base no e-mail fornecido
          const isAdmin = email.toLowerCase() === "edisonunb@gmail.com";

          await setDoc(doc(db, "users", newUser.uid), {
            uid: newUser.uid,
            nome: email.split("@")[0],
            email: email,
            perfil: isAdmin ? "ADMIN" : "ASSESSOR",
            ativo: true,
            createdAt: serverTimestamp(),
          });

          toast({ title: "Sucesso", description: `Bem-vindo, ${isAdmin ? "Administrador" : "Assessor"}!` });
        } else {
          throw loginError;
        }
      }
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro no Acesso",
        description: "Verifique suas credenciais. Se for seu primeiro acesso, use uma senha forte.",
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
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                <Sparkles size={10} /> No primeiro acesso, a senha digitada será a sua definitiva.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full font-semibold" type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                "Entrar / Criar Conta"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
