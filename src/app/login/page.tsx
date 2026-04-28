
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
      toast({ title: "Erro de Configuração", description: "O serviço Firebase não foi inicializado corretamente.", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    try {
      // Tenta login normal
      try {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: "Bem-vindo", description: "Acesso autorizado ao gabinete." });
      } catch (loginError: any) {
        const error = loginError as AuthError;
        
        // Se o usuário não existe, tenta criar para o admin ou assessor
        if (error.code === "auth/invalid-credential" || error.code === "auth/user-not-found" || error.code === "auth/configuration-not-found") {
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const newUser = userCredential.user;

            // Define ADMIN se for o seu e-mail
            const isAdmin = email.toLowerCase().trim() === "edisonunb@gmail.com";

            await setDoc(doc(db, "users", newUser.uid), {
              uid: newUser.uid,
              nome: email.split("@")[0],
              email: email.toLowerCase().trim(),
              perfil: isAdmin ? "ADMIN" : "ASSESSOR",
              ativo: true,
              createdAt: serverTimestamp(),
            });

            toast({ title: "Conta Criada", description: isAdmin ? "Você foi registrado como Administrador." : "Acesso liberado." });
          } catch (createError: any) {
            const cError = createError as AuthError;
            if (cError.code === "auth/email-already-in-use") {
              throw new Error("Senha incorreta para este e-mail.");
            } else if (cError.code === "auth/configuration-not-found") {
              throw new Error("A autenticação por e-mail/senha não está ativada no console do Firebase.");
            } else {
              throw createError;
            }
          }
        } else {
          throw loginError;
        }
      }
    } catch (error: any) {
      toast({
        title: "Erro de Acesso",
        description: error.message || "Falha na autenticação. Verifique seu console do Firebase.",
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
          <CardDescription>Gestão de Gabinete Político</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="Ex: edisonunb@gmail.com"
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
              {email.toLowerCase().trim() === "edisonunb@gmail.com" && (
                <div className="mt-4 p-3 bg-blue-50 text-blue-700 text-[11px] rounded-lg border border-blue-100 flex gap-2">
                  <ShieldCheck size={16} className="shrink-0" />
                  E-mail ADMIN detectado. A primeira senha digitada será a sua definitiva.
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full h-12 text-base font-semibold" type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin mr-2" /> : "Acessar Gabinete"}
            </Button>
            
            <div className="p-3 bg-muted/50 rounded-lg flex items-start gap-2 text-[10px] text-muted-foreground">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>Se o erro "configuration-not-found" persistir, verifique se o provedor "E-mail/Password" está ATIVADO no Firebase Console do projeto projetojaque-3c3b8.</span>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
