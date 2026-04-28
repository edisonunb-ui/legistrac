
"use client";

import { useState, useEffect } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  deleteUser
} from "firebase/auth";
import { useAuthInstance, useFirestore } from "@/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LayoutDashboard, Loader2, AlertCircle, KeyRound } from "lucide-react";
import { doc, setDoc, serverTimestamp, getDocs, collection, query, where, updateDoc } from "firebase/firestore";
import { useAuth } from "@/components/auth-context";

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !auth || !db) return;
    setSubmitting(true);
    
    const cleanEmail = email.toLowerCase().trim();
    const isMaster = cleanEmail === "edisonunb@gmail.com";

    try {
      // 1. Tenta login normal primeiro
      try {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
        toast({ title: "Bem-vindo de volta!" });
      } catch (loginError: any) {
        // 2. Se falhar (usuário não encontrado ou credencial inválida), verifica se é primeiro acesso
        if (loginError.code === "auth/user-not-found" || loginError.code === "auth/invalid-credential" || loginError.code === "auth/invalid-login-credentials") {
          
          // Verifica se o e-mail está pré-autorizado no Firestore
          const q = query(collection(db, "users"), where("email", "==", cleanEmail));
          const querySnapshot = await getDocs(q);
          
          let authorizedDoc = null;
          if (!querySnapshot.empty) {
            authorizedDoc = querySnapshot.docs[0];
          }

          if (isMaster || (authorizedDoc && !authorizedDoc.data().uid)) {
            // É o mestre ou um e-mail pré-autorizado que ainda não tem UID (Primeiro Acesso)
            const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
            const newUser = userCredential.user;

            if (isMaster) {
              // Cria perfil do mestre se não existir
              await setDoc(doc(db, "users", newUser.uid), {
                uid: newUser.uid,
                nome: "Edison (Master)",
                email: cleanEmail,
                perfil: "ADMIN",
                ativo: true,
                createdAt: serverTimestamp(),
              });
            } else if (authorizedDoc) {
              // Vincula o UID ao documento pré-autorizado
              await updateDoc(doc(db, "users", authorizedDoc.id), {
                uid: newUser.uid,
                ativo: true,
                dataVinculo: serverTimestamp()
              });
              
              // Move os dados para o documento correto usando o UID como ID (padrão do sistema)
              const data = authorizedDoc.data();
              await setDoc(doc(db, "users", newUser.uid), {
                ...data,
                uid: newUser.uid,
                ativo: true,
              });
            }

            toast({ 
              title: "Primeiro Acesso!", 
              description: "Sua senha foi cadastrada com sucesso." 
            });
          } else if (authorizedDoc && authorizedDoc.data().uid) {
            // Usuário já existe mas errou a senha
            throw new Error("Senha incorreta para este e-mail.");
          } else {
            // E-mail não consta na lista
            throw new Error("Este e-mail não está autorizado no sistema. Fale com o administrador.");
          }
        } else {
          throw loginError;
        }
      }
    } catch (error: any) {
      let message = "Erro ao acessar.";
      if (error.message) message = error.message;
      if (error.code === "auth/wrong-password") message = "Senha incorreta.";
      if (error.code === "auth/weak-password") message = "A senha deve ter pelo menos 6 caracteres.";
      
      toast({
        title: "Acesso Negado",
        description: message,
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
          <CardDescription>Gestão de Gabinete Parlamentar</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail Institucional</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu-email@exemplo.com"
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
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="p-3 bg-primary/5 rounded-lg text-[11px] flex items-start gap-2 text-primary leading-tight border border-primary/20">
              <KeyRound size={14} className="shrink-0 mt-0.5" />
              <div>
                <strong>Atenção:</strong> Se for seu primeiro acesso, o e-mail deve estar autorizado. 
                A senha que você digitar agora será a sua senha definitiva.
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full h-12 text-base font-semibold" type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin mr-2" /> : "Acessar Sistema"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
