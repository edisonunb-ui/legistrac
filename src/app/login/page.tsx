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

    try {
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, emailLower, password);
      } catch (loginError: any) {
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
      console.error("Login error code:", error.code);
      
      if (error.code === 'auth/operation-not-allowed') {
        toast({
          title: "Provedor Desativado",
          description: "O login por E-mail/Senha não está ativado no Firebase Console. Acesse o console, vá em Authentication > Sign-in method e ative 'E-mail/Password'.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro de Acesso",
          description: error.message || "Erro ao realizar acesso ao LegisTrac.",
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
          <CardDescription>Gestão de Gabinete Parlamentar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail de Acesso</Label>
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
              <div className="space-y-1">
                <p className="text-[10px] font-bold">Instrução Importante:</p>
                <p className="text-[10px]">
                  No primeiro login, sua conta será registrada automaticamente. <br/>
                  <b>SuperAdmin:</b> edisonunb@gmail.com
                </p>
              </div>
            </div>

            <Button 
              className="w-full h-11 text-lg font-semibold" 
              type="submit"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="animate-spin" /> : "Entrar no LegisTrac"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 justify-center border-t bg-muted/30 py-4 text-center">
          <p className="text-[11px] text-muted-foreground italic">
            "Tecnologia e Transparência: Gabinete LegisTrac."
          </p>
          <div className="flex items-center gap-1 text-[9px] text-red-500 font-bold uppercase tracking-wider">
            <AlertTriangle size={10} />
            Certifique-se que o provedor E-mail/Senha está ativo no Firebase
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
