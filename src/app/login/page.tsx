
"use client";

import { useState, useEffect } from "react";
import { 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  updatePassword,
  reauthenticateWithEmailAndPassword,
  EmailAuthProvider
} from "firebase/auth";
import { useAuthInstance, useFirestore, useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Mail, Loader2, AlertTriangle, ChevronRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type LoginMode = "LOGIN" | "FIRST_ACCESS";

export default function LoginPage() {
  const [mode, setMode] = useState<LoginMode>("LOGIN");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);
  
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
    setSubmitting(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, emailLower, password);
      
      if (userCredential) {
        const userRef = doc(db, "users", emailLower);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          await updateDoc(userRef, {
            uid: userCredential.user.uid,
            updatedAt: serverTimestamp(),
            ativo: true
          });
          toast({ title: "Bem-vindo!", description: "Acesso autorizado." });
          router.push("/");
        } else if (emailLower === "edisonunb@gmail.com") {
          router.push("/");
        } else {
          toast({ title: "Acesso Restrito", description: "E-mail não provisionado no sistema.", variant: "destructive" });
          await auth.signOut();
        }
      }
    } catch (error: any) {
      console.error("Erro no login:", error);
      toast({ title: "Erro de Acesso", description: "E-mail ou senha incorretos.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFirstAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !auth || !db) return;

    if (newPassword !== confirmPassword) {
      toast({ title: "Erro na Confirmação", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }

    if (newPassword.length < 6) {
      toast({ title: "Senha Fraca", description: "A nova senha deve ter no mínimo 6 caracteres.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const emailLower = email.toLowerCase().trim();

    try {
      // 1. Tenta logar com a senha provisória
      const userCredential = await signInWithEmailAndPassword(auth, emailLower, password);
      
      // 2. Altera a senha
      await updatePassword(userCredential.user, newPassword);
      
      // 3. Atualiza perfil no Firestore
      const userRef = doc(db, "users", emailLower);
      await updateDoc(userRef, {
        uid: userCredential.user.uid,
        updatedAt: serverTimestamp(),
        ativo: true
      });

      toast({ 
        title: "Senha Atualizada!", 
        description: "Seu acesso foi configurado com sucesso.",
        className: "bg-primary text-black font-bold" 
      });
      
      router.push("/");
    } catch (error: any) {
      console.error("Erro no primeiro acesso:", error);
      let msg = "Verifique suas credenciais provisórias.";
      if (error.code === 'auth/requires-recent-login') msg = "Por favor, tente novamente o processo.";
      toast({ title: "Falha na Atualização", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({ 
        title: "E-mail necessário", 
        description: "Preencha o campo de e-mail para receber o link de recuperação.", 
        variant: "destructive" 
      });
      return;
    }

    if (!auth) return;
    setResetting(true);

    try {
      await sendPasswordResetEmail(auth, email.toLowerCase().trim());
      toast({ 
        title: "E-mail enviado!", 
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
        className: "bg-primary text-black font-bold"
      });
    } catch (error: any) {
      toast({ title: "Erro ao enviar", description: "Verifique o e-mail informado.", variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  if (authLoading) return <div className="flex items-center justify-center min-h-screen bg-background"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-md shadow-2xl border-white/5 bg-white/5 backdrop-blur-xl relative overflow-hidden transition-all duration-500">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary glow-primary" />
        
        <CardHeader className="text-center pt-10">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 glow-primary">
              {mode === "LOGIN" ? <KeyRound size={32} className="text-primary" /> : <ShieldCheck size={32} className="text-primary" />}
            </div>
          </div>
          <CardTitle className="text-3xl font-black tracking-tighter text-white uppercase italic">
            Legis<span className="text-primary">Trac</span>
          </CardTitle>
          <CardDescription className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mt-2">
            {mode === "LOGIN" ? "Acesso ao Gabinete" : "Configuração de Primeiro Acesso"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-4 pb-10">
          <form onSubmit={mode === "LOGIN" ? handleLogin : handleFirstAccess} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">E-mail Corporativo</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/40" size={16} />
                <Input 
                  type="email" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="exemplo@camara.gov.br" 
                  className="bg-black/50 border-white/10 text-white h-12 pl-10 focus:border-primary/50 font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {mode === "LOGIN" ? "Senha de Acesso" : "Senha Provisória"}
                </Label>
                {mode === "LOGIN" && (
                  <button 
                    type="button" 
                    onClick={handleForgotPassword}
                    className="text-[9px] font-black uppercase tracking-widest text-primary hover:text-white transition-colors"
                    disabled={resetting}
                  >
                    {resetting ? "Enviando..." : "Esqueceu?"}
                  </button>
                )}
              </div>
              <Input 
                type="password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="bg-black/50 border-white/10 text-white h-12 focus:border-primary/50 font-bold"
              />
            </div>

            {mode === "FIRST_ACCESS" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Definir Nova Senha</Label>
                  <Input 
                    type="password" 
                    required 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    className="bg-black/50 border-primary/20 text-white h-12 focus:border-primary/50 font-bold"
                    placeholder="Mínimo 6 dígitos"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Confirmar Nova Senha</Label>
                  <Input 
                    type="password" 
                    required 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    className="bg-black/50 border-primary/20 text-white h-12 focus:border-primary/50 font-bold"
                  />
                </div>
              </div>
            )}

            <div className="pt-2 space-y-4">
              <Button className="w-full h-14 font-black uppercase text-xs tracking-[0.2em] bg-primary text-black hover:opacity-90 glow-primary transition-all active:scale-95" type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="animate-spin" /> : mode === "LOGIN" ? "Entrar no Sistema" : "Atualizar e Entrar"}
              </Button>

              <button 
                type="button"
                onClick={() => setMode(mode === "LOGIN" ? "FIRST_ACCESS" : "LOGIN")}
                className="w-full text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-2"
              >
                {mode === "LOGIN" ? (
                  <>Primeiro Acesso? Mudar Senha <ChevronRight size={12} /></>
                ) : (
                  <>Voltar para o Login</>
                )}
              </button>
            </div>
          </form>

          {mode === "FIRST_ACCESS" && (
            <Alert className="bg-primary/5 border-primary/20 rounded-2xl">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <AlertTitle className="text-[10px] font-black uppercase tracking-widest text-primary">Segurança Ativada</AlertTitle>
              <AlertDescription className="text-[9px] uppercase font-bold text-muted-foreground leading-relaxed mt-1">
                Use a senha provisória enviada pelo administrador para definir sua senha pessoal definitiva.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        
        <CardFooter className="bg-white/5 p-4 flex justify-center border-t border-white/5">
          <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50">
            v2.2.0-STABLE • GESTÃO DE ACESSO
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
