
"use client";

import { useState, useEffect } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LayoutDashboard, Loader2, ShieldAlert } from "lucide-react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/components/auth-context";
import { VEREADORES_AUTORIZADOS } from "@/lib/authorized-emails";

export default function LoginPage() {
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  const handleGoogleLogin = async () => {
    if (submitting || !auth || !db) return;
    setSubmitting(true);

    const provider = new GoogleAuthProvider();
    
    try {
      const result = await signInWithPopup(auth, provider);
      const loggedUser = result.user;
      const email = loggedUser.email?.toLowerCase() || "";

      // Verifica se o e-mail está na lista autorizada
      const isAuthorized = VEREADORES_AUTORIZADOS.includes(email);
      const isMaster = email === "edisonunb@gmail.com";

      if (!isAuthorized && !isMaster) {
        await auth.signOut();
        toast({
          title: "Acesso Negado",
          description: "Este e-mail não está na lista de vereadores/assessores autorizados.",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      // Salva ou atualiza informações do usuário no Firestore
      const userRef = doc(db, "users", loggedUser.uid);
      await setDoc(userRef, {
        uid: loggedUser.uid,
        nome: loggedUser.displayName || "Usuário",
        email: email,
        photoURL: loggedUser.photoURL,
        perfil: isMaster ? "ADMIN" : "ASSESSOR",
        ativo: true,
        ultimoAcesso: serverTimestamp(),
      }, { merge: true });

      toast({ title: "Bem-vindo!", description: "Acesso autorizado com sucesso." });
      router.push("/");
    } catch (error: any) {
      console.error("Erro no login:", error);
      toast({
        title: "Erro ao acessar",
        description: "Não foi possível completar o login com o Google.",
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
        <CardContent className="space-y-6">
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex gap-3 text-blue-700">
            <ShieldAlert className="shrink-0" size={20} />
            <p className="text-xs">
              Apenas e-mails de vereadores e assessores autorizados pelo ADM Master podem acessar o gabinete.
            </p>
          </div>
          
          <Button 
            className="w-full h-14 text-lg font-semibold gap-3" 
            onClick={handleGoogleLogin} 
            disabled={submitting}
            variant="outline"
          >
            {submitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Entrar com Google
              </>
            )}
          </Button>
        </CardContent>
        <CardFooter className="flex justify-center border-t bg-muted/30 py-4">
          <p className="text-[11px] text-muted-foreground text-center">
            Acesso restrito ao gabinete do vereador.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
