"use client";

import { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useAuthInstance, useFirestore, useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LayoutDashboard, Loader2, Lock, Mail, AlertTriangle } from "lucide-react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { VEREADORES_AUTORIZADOS } from "@/lib/authorized-emails";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
    
    // Verificação Básica de Autorização (Fonte de Verdade)
    if (!VEREADORES_AUTORIZADOS.includes(emailLower)) {
      toast({
        title: "Acesso Negado",
        description: "Este e-mail não possui cadastro no sistema.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      // 1. Tenta o login normal
      const userCredential = await signInWithEmailAndPassword(auth, emailLower, password);
      
      if (userCredential) {
        // 2. Verifica se o perfil existe no Firestore
        const userRef = doc(db, "users", emailLower);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          // Atualiza o UID se necessário (primeiro acesso)
          await updateDoc(userRef, {
            uid: userCredential.user.uid,
            updatedAt: serverTimestamp(),
            ativo: true
          });
          
          toast({ title: "Bem-vindo!", description: "Acesso autorizado." });
          router.push("/");
        } else {
          // Caso raro: tem Auth mas não tem Firestore Profile
          throw new Error("Perfil não encontrado no banco de dados.");
        }
      }
    } catch (error: any) {
      let errorMessage = "Credenciais inválidas.";
      
      if (error.code === 'auth/operation-not-allowed') {
        errorMessage = "O provedor de login está desativado no Firebase Console.";
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        errorMessage = "E-mail ou senha incorretos.";
      }

      toast({
        title: "Erro no Login",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-primary" size={40} /></div>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-primary">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2 text-primary"><LayoutDashboard size={32} /></div>
          <CardTitle className="text-2xl font-bold text-primary">LegisTrac</CardTitle>
          <CardDescription>Gabinete Parlamentar Profissional</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="seu@email.com" className="pl-10" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="password" type="password" placeholder="Sua senha de acesso" className="pl-10" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>
            <Button className="w-full h-11 font-bold" type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : "Acessar Sistema"}
            </Button>
          </form>

          <Alert className="mt-4 bg-muted/50 border-none">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-xs font-bold">Nota do Sistema</AlertTitle>
            <AlertDescription className="text-[10px] leading-relaxed">
              Caso ainda não tenha uma conta, entre em contato com o administrador do gabinete para o seu provisionamento.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}