
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
import { LayoutDashboard, Loader2, AlertCircle } from "lucide-react";
import { doc, setDoc, serverTimestamp, getDocs, collection, query, where, updateDoc, deleteField } from "firebase/firestore";
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
    if (submitting) return;
    setSubmitting(true);
    
    const cleanEmail = email.toLowerCase().trim();
    const isMaster = cleanEmail === "edisonunb@gmail.com";

    try {
      if (!auth || !db) throw new Error("Erro de conexão com o banco.");

      // 1. Tenta login normal
      try {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      } catch (loginError: any) {
        // 2. Se falhar (usuário não encontrado), tenta criar conta (Primeiro Acesso)
        if (loginError.code === "auth/user-not-found" || loginError.code === "auth/invalid-credential") {
          
          const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          const newUser = userCredential.user;

          // Agora que está autenticado, podemos ler o Firestore para verificar se é convidado
          const q = query(collection(db, "users"), where("email", "==", cleanEmail));
          const querySnapshot = await getDocs(q);
          
          let authorizedDoc = null;
          if (!querySnapshot.empty) {
            authorizedDoc = querySnapshot.docs[0];
          }

          if (isMaster || authorizedDoc) {
            // Cria ou atualiza o perfil no Firestore
            if (authorizedDoc) {
              await updateDoc(doc(db, "users", authorizedDoc.id), {
                uid: newUser.uid,
                ativo: true,
                dataVinculo: serverTimestamp()
              });
            } else {
              await setDoc(doc(db, "users", newUser.uid), {
                uid: newUser.uid,
                nome: cleanEmail.split("@")[0],
                email: cleanEmail,
                perfil: "ADMIN", // Edison é mestre
                ativo: true,
                createdAt: serverTimestamp(),
              });
            }
            toast({ title: "Bem-vindo!", description: "Seu acesso foi configurado com sucesso." });
          } else {
            // Se não é mestre nem convidado, remove o usuário do Auth e desloga
            await deleteUser(newUser);
            await signOut(auth);
            throw new Error("Seu e-mail não foi pré-autorizado pelo administrador.");
          }
        } else {
          throw loginError;
        }
      }
    } catch (error: any) {
      toast({
        title: "Falha no Acesso",
        description: error.message,
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
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu-email@institucional.com"
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
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="p-3 bg-muted rounded-lg text-[11px] flex items-start gap-2 text-muted-foreground leading-tight">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              Se for seu primeiro acesso, use o e-mail autorizado e defina sua senha agora.
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
