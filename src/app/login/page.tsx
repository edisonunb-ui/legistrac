"use client";

import { useState, useEffect } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth";
import { useAuthInstance, useFirestore, useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LayoutDashboard, Loader2, ShieldAlert, Lock, Mail, AlertTriangle } from "lucide-react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { VEREADORES_AUTORIZADOS } from "@/lib/authorized-emails";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showConfigError, setShowConfigError] = useState(false);
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
    if (submitting || !auth || !db) return;
    
    const emailLower = email.toLowerCase().trim();
    
    if (!VEREADORES_AUTORIZADOS.includes(emailLower)) {
      toast({
        title: "Acesso Negado",
        description: "Este e-mail não possui autorização no gabinete LegisTrac.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    setShowConfigError(false);

    try {
      let userCredential;
      try {
        // Tenta logar primeiro
        userCredential = await signInWithEmailAndPassword(auth, emailLower, password);
      } catch (loginError: any) {
        // Se o usuário não existir, tenta criar (auto-onboarding)
        if (
          loginError.code === 'auth/user-not-found' || 
          loginError.code === 'auth/invalid-credential' ||
          loginError.code === 'auth/invalid-email'
        ) {
          try {
            userCredential = await createUserWithEmailAndPassword(auth, emailLower, password);
          } catch (createError: any) {
            if (createError.code === 'auth/email-already-in-use') {
              throw new Error("Senha incorreta para este usuário.");
            }
            throw createError;
          }
        } else {
          throw loginError;
        }
      }
      
      if (userCredential) {
        const userRef = doc(db, "users", userCredential.user.uid);
        const isMaster = emailLower === "edisonunb@gmail.com";
        
        await setDoc(userRef, {
          uid: userCredential.user.uid,
          nome: emailLower.split('@')[0],
          email: emailLower,
          perfil: isMaster ? "ADMIN" : "ASSESSOR",
          ativo: true,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        }, { merge: true });

        sessionStorage.setItem('gate_auth_email', emailLower);

        toast({
          title: "Bem-vindo!",
          description: isMaster ? "Acesso administrativo liberado." : "Acesso de assessor liberado.",
        });

        router.push("/");
      }
    } catch (error: any) {
      console.error("Erro de Autenticação:", error.code, error.message);
      
      if (error.code === 'auth/operation-not-allowed') {
        setShowConfigError(true);
        toast({
          title: "Configuração Necessária",
          description: "O método de E-mail/Senha está desativado no Console do Firebase.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro de Acesso",
          description: error.message || "Verifique suas credenciais.",
          variant: "destructive",
        });
      }
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
          <CardTitle className="text-3xl font-bold text-primary">LegisTrac</CardTitle>
          <CardDescription>Gestão de Gabinete (Acesso Básico)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {showConfigError && (
            <Alert variant="destructive" className="bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Atenção Administrador</AlertTitle>
              <AlertDescription className="text-xs">
                Vá ao Console do Firebase > Authentication > Sign-in Method e **ATIVE** o provedor "E-mail/Senha".
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email"
                  type="email"
                  placeholder="edisonunb@gmail.com"
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
                  placeholder="Sua senha master"
                  className="pl-10"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <Button 
              className="w-full h-11 text-lg font-semibold" 
              type="submit"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="animate-spin" /> : "Entrar"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 justify-center border-t bg-muted/30 py-4 text-center">
          <p className="text-[11px] text-muted-foreground italic">
            "Tecnologia e Transparência no seu Gabinete."
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
