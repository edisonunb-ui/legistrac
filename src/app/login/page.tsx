
"use client";

import { useState, useEffect } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
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
    
    // Verificação de autorização antes de qualquer coisa
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
      // Tenta fazer login
      try {
        await signInWithEmailAndPassword(auth, emailLower, password);
      } catch (loginError: any) {
        // Se o erro for 'user-not-found', tentamos o "Primeiro Acesso" (cadastro automático)
        if (loginError.code === 'auth/user-not-found' || loginError.code === 'auth/invalid-credential') {
          // Verifica se o usuário já existe no Auth mas a senha está errada
          // O Firebase não permite saber isso facilmente por segurança, 
          // então tentamos criar a conta se o login falhar.
          await createUserWithEmailAndPassword(auth, emailLower, password);
          
          // Se criou com sucesso, salva no Firestore
          const userRef = doc(db, "users", auth.currentUser!.uid);
          await setDoc(userRef, {
            uid: auth.currentUser!.uid,
            nome: emailLower.split('@')[0],
            email: emailLower,
            perfil: emailLower === "edisonunb@gmail.com" ? "ADMIN" : "ASSESSOR",
            ativo: true,
            createdAt: serverTimestamp(),
          }, { merge: true });

          toast({ title: "Bem-vindo!", description: "Conta criada e acesso autorizado." });
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
                Primeiro acesso? Use seu e-mail autorizado e a senha que deseja cadastrar.
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
            Acesso restrito a vereadores e assessores autorizados.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
