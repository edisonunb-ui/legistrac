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
import { LayoutDashboard, Loader2, Lock, Mail, AlertTriangle } from "lucide-react";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
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
        description: "E-mail não autorizado neste gabinete.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    setShowConfigError(false);

    try {
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, emailLower, password);
      } catch (loginError: any) {
        if (loginError.code === 'auth/user-not-found' || loginError.code === 'auth/invalid-credential') {
          try {
            userCredential = await createUserWithEmailAndPassword(auth, emailLower, password);
          } catch (createError: any) {
            if (createError.code === 'auth/email-already-in-use') {
              throw new Error("Senha incorreta.");
            }
            if (createError.code === 'auth/operation-not-allowed') {
              setShowConfigError(true);
              return;
            }
            throw createError;
          }
        } else if (loginError.code === 'auth/operation-not-allowed') {
          setShowConfigError(true);
          return;
        } else {
          throw loginError;
        }
      }
      
      if (userCredential) {
        const userRef = doc(db, "users", emailLower);
        const userSnap = await getDoc(userRef);
        const isMaster = emailLower === "edisonunb@gmail.com";
        
        const existingData = userSnap.exists() ? userSnap.data() : {};
        
        await setDoc(userRef, {
          ...existingData,
          uid: userCredential.user.uid,
          nome: existingData.nome || emailLower.split('@')[0],
          email: emailLower,
          perfil: isMaster ? "SUPER_ADMIN" : (existingData.perfil || "ASSESSOR"),
          ativo: true,
          permissoes: isMaster ? {
            visualizar_todas: true,
            criar_demandas: true,
            finalizar_demandas: true,
            gerenciar_equipe: true,
            reabrir_demandas: true
          } : (existingData.permissoes || {
            visualizar_todas: false,
            criar_demandas: true,
            finalizar_demandas: false,
            gerenciar_equipe: false,
            reabrir_demandas: false
          }),
          updatedAt: serverTimestamp(),
          createdAt: existingData.createdAt || serverTimestamp(),
        }, { merge: true });

        toast({ title: "Bem-vindo!", description: "Acesso autorizado." });
        router.push("/");
      }
    } catch (error: any) {
      if (error.code === 'auth/operation-not-allowed') {
        setShowConfigError(true);
      } else {
        toast({
          title: "Erro no Login",
          description: error.message || "Credenciais inválidas.",
          variant: "destructive",
        });
      }
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
          {showConfigError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Atenção Administrador</AlertTitle>
              <AlertDescription className="text-xs">
                Vá ao Console do Firebase &gt; Authentication &gt; Sign-in Method e ative o provedor "E-mail/Senha".
              </AlertDescription>
            </Alert>
          )}

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
                <Input id="password" type="password" placeholder="Sua senha master" className="pl-10" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>
            <Button className="w-full h-11" type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : "Acessar Sistema"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}