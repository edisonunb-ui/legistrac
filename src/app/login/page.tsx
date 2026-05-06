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
          toast({ title: "Acesso Restrito", description: "E-mail não provisionado.", variant: "destructive" });
          await auth.signOut();
        }
      }
    } catch (error: any) {
      toast({ title: "Erro", description: "E-mail ou senha incorretos.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-primary">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2 text-primary"><LayoutDashboard size={32} /></div>
          <CardTitle className="text-2xl font-bold text-primary">LegisTrac</CardTitle>
          <CardDescription>Gabinete Parlamentar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button className="w-full h-11 font-bold" type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : "Acessar Sistema"}
            </Button>
          </form>
          <Alert className="mt-4 bg-muted/50 border-none">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-xs font-bold">Nota do Sistema</AlertTitle>
            <AlertDescription className="text-[10px]">
              O acesso é restrito a membros cadastrados.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}