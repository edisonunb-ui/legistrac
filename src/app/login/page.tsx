"use client";

import { useState, useEffect } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth";
import { useAuthInstance, useFirestore } from "@/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LayoutDashboard, Loader2, ShieldAlert, Lock, Mail } from "lucide-react";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { useAuth } from "@/components/auth-context";
import { VEREADORES_AUTORIZADOS } from "@/lib/authorized-emails";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const auth = useAuthInstance();
  const db = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  const ensureUserProfile = async (uid: string, userEmail: string) => {
    if (!db) return;
    const emailLower = userEmail.toLowerCase();
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: uid,
        nome: emailLower.split('@')[0],
        email: emailLower,
        perfil: emailLower === "edisonunb@gmail.com" ? "ADMIN" : "ASSESSOR",
        ativo: true,
        createdAt: serverTimestamp(),
      }, { merge: true });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !auth || !db) return;
    
    const emailLower = email.toLowerCase().trim();
    
    // Verificação rigorosa contra a lista de autorizados
    if (!VEREADORES_AUTORIZADOS.includes(emailLower)) {
      toast({
        title: "Acesso Negado",
        description: "Este e-mail não está na lista de vereadores autorizados.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      try {
        // Tenta o login normal
        const userCredential = await signInWithEmailAndPassword(auth, emailLower, password);
        await ensureUserProfile(userCredential.user.uid, emailLower);
      } catch (loginError: any) {
        // Se o usuário não existir (primeiro acesso), cria ele na hora com a senha digitada
        if (loginError.code === 'auth/user-not-found' || loginError.code === 'auth/invalid-credential') {
          const userCredential = await createUserWithEmailAndPassword(auth, emailLower, password);
          await ensureUserProfile(userCredential.user.uid, emailLower);
          toast({ title: "Bem-vindo!", description: "Primeiro acesso realizado com sucesso." });
        } else {
          throw loginError;
        }
      }
      router.push("/");
    } catch (error: any) {
      console.error("Erro no login:", error);
      let message = "Não foi possível completar o acesso.";
      if (error.code === 'auth/wrong-password') message = "Senha incorreta.";
      
      toast({
        title: "Erro de Acesso",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl border-t-4 border-primary">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4 text-primary">
            <LayoutDashboard size={40} />
          </div>
          <CardTitle className="text-3xl font-bold">LegisTrac</CardTitle>
          <CardDescription>Gestão de Gabinete Parlamentar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail Institucional</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  className="pl-10"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex gap-3 text-blue-700">
              <ShieldAlert className="shrink-0" size={18} />
              <p className="text-[10px]">
                Apenas e-mails autorizados podem logar. Use o e-mail e defina sua senha no primeiro acesso.
              </p>
            </div>

            <Button 
              className="w-full h-11 text-lg font-semibold" 
              type="submit"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="animate-spin" /> : "Acessar Gabinete"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t bg-muted/30 py-4">
          <p className="text-[11px] text-muted-foreground text-center">
            Acesso restrito a vereadores autorizados.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
