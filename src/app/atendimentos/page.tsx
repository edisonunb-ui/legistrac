
"use client";

import { useFirestore, useCollection, useUser, useDoc } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useState, useMemo } from "react";
import { collection, query, orderBy, doc, deleteDoc, where, updateDoc } from "firebase/firestore";
import { CitizenService } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Plus, 
  User, 
  Phone, 
  MapPin, 
  ChevronRight, 
  ChevronLeft, 
  Trash2, 
  Loader2,
  ClipboardList 
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function CitizenServiceListPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const userEmail = user?.email?.toLowerCase().trim();
  const profileRef = useMemo(() => (userEmail && db) ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: profile } = useDoc(profileRef);

  const isMasterAdmin = user?.email === "edisonunb@gmail.com";
  const isAdmin = (profile as any)?.perfil === "ADMIN" || (profile as any)?.perfil === "SUPER_ADMIN" || isMasterAdmin;
  const cabinetId = (profile as any)?.cabinetId;

  const servicesQuery = useMemo(() => {
    if (!db || !user) return null;
    // Filtro básico de não-excluído para todos
    if (isMasterAdmin) return query(collection(db, "atendimentos"), orderBy("dataAtendimento", "desc"));
    if (cabinetId) return query(
      collection(db, "atendimentos"), 
      where("cabinetId", "==", cabinetId),
      orderBy("dataAtendimento", "desc")
    );
    return null;
  }, [db, user, isMasterAdmin, cabinetId]);
  
  const { data: rawServices = [], loading } = useCollection(servicesQuery);

  const services = useMemo(() => {
    // Só mostramos o que não foi "deletado" (exceto talvez para o superadmin, mas para limpar a UI filtramos aqui)
    return rawServices.filter((s: any) => !s.deleted);
  }, [rawServices]);

  const filteredServices = useMemo(() => {
    return services.filter((s: CitizenService) => 
      s.municipeNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.municipeTelefone.includes(searchTerm) ||
      s.municipeEndereco.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [services, searchTerm]);

  const handleDelete = async (id: string) => {
    if (!db) return;
    setDeletingId(id);
    try {
      if (isMasterAdmin) {
        // SuperAdmin apaga de verdade
        await deleteDoc(doc(db, "atendimentos", id));
      } else {
        // Outros apenas marcam como deletado (Lixeira)
        await updateDoc(doc(db, "atendimentos", id), {
          deleted: true,
          deletedAt: new Date().toISOString(),
          deletedBy: user?.uid
        });
      }
      toast({ title: "Registro removido", description: "O atendimento foi enviado para a lixeira de segurança." });
    } catch (e) {
      toast({ title: "Erro ao excluir", description: "Não foi possível remover o registro.", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-2 text-sm font-bold uppercase tracking-widest">
              <ChevronLeft size={16} /> Dashboard
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">Atendimento ao <span className="text-primary">Munícipe</span></h1>
            <p className="text-muted-foreground">Registre e acompanhe as solicitações da população.</p>
          </div>
          <Link href="/atendimentos/new">
            <Button className="bg-primary text-primary-foreground font-bold h-11 px-6 shadow-lg shadow-primary/20">
              <Plus className="mr-2" size={18} /> Novo Atendimento
            </Button>
          </Link>
        </header>

        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input 
            placeholder="Buscar por nome, telefone ou endereço..." 
            className="pl-10 h-12 bg-card border-primary/10" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-40 bg-card rounded-xl animate-pulse border border-primary/5" />)}
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-primary/10">
            <User size={48} className="mx-auto text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-lg font-bold">Nenhum atendimento registrado</h3>
            <p className="text-muted-foreground text-sm">Comece registrando o primeiro munícipe atendido.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((s: CitizenService) => (
              <Card key={s.id} className="bg-card border-primary/10 hover:border-primary/30 transition-all group overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className="text-[9px] font-bold tracking-widest uppercase border-primary/20 text-primary">
                      {s.dataAtendimento?.toDate().toLocaleDateString()}
                    </Badge>
                    <div className="flex gap-2">
                      {s.demandaId && (
                        <Badge className="bg-primary/20 text-primary text-[8px] font-bold uppercase">
                          Demanda Ativa
                        </Badge>
                      )}
                      {isAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive p-0">
                              {deletingId === s.id ? <Loader2 className="animate-spin h-3 w-3" /> : <Trash2 size={14} />}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir Atendimento?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {isMasterAdmin 
                                  ? "Como SuperAdmin, esta ação removerá o registro PERMANENTEMENTE." 
                                  : "Esta ação enviará o registro para a lixeira de segurança. Somente o SuperAdmin poderá apagá-lo definitivamente."}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(s.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Confirmar Exclusão
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-xl font-bold mt-2 group-hover:text-primary transition-colors">{s.municipeNome}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone size={14} className="text-primary" /> {s.municipeTelefone}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground truncate">
                      <MapPin size={14} className="text-primary shrink-0" /> {s.municipeEndereco}
                    </div>
                  </div>
                  
                  <div className="p-3 bg-muted/30 rounded-lg text-xs line-clamp-3 border-l-2 border-primary/30 text-muted-foreground italic leading-relaxed">
                    "{s.descricaoSolicitacao}"
                  </div>

                  <div className="pt-4 border-t border-primary/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
                      <ClipboardList size={12} /> Título: {s.municipeTituloEleitoral || 'N/I'}
                    </div>
                    {s.demandaId ? (
                      <Link href={`/demandas/${s.demandaId}`}>
                        <Button variant="ghost" size="sm" className="h-8 text-primary hover:text-primary hover:bg-primary/10 gap-1 text-[10px] font-bold">
                          Ver Demanda <ChevronRight size={14} />
                        </Button>
                      </Link>
                    ) : (
                      <span className="text-[9px] text-muted-foreground font-bold uppercase">Sem Demanda</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
