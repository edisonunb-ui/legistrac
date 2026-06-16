
"use client";

import { useFirestore, useCollection, useUser, useDoc, useMemoFirebase } from "@/firebase";
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
  ClipboardList,
  AlertCircle,
  Mail
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

const MASTER_EMAIL = "edisonunb@gmail.com";
const AUDITOR_EMAIL = "alemao@gmail.com";

export default function CitizenServiceListPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const userEmail = useMemo(() => user?.email?.toLowerCase().trim() || null, [user?.email]);
  const isMasterAdmin = userEmail === MASTER_EMAIL;
  const isAuditor = userEmail === AUDITOR_EMAIL;
  const hasGlobalView = isMasterAdmin || isAuditor;

  const profileRef = useMemoFirebase(() => (userEmail && db) ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: profile } = useDoc(profileRef);

  const cabinetId = (profile as any)?.cabinetId;

  const servicesQuery = useMemoFirebase(() => {
    if (!db || (!cabinetId && !hasGlobalView)) return null;
    
    if (hasGlobalView) {
      return query(collection(db, "atendimentos"), orderBy("dataAtendimento", "desc"));
    }
    
    return query(
      collection(db, "atendimentos"), 
      where("cabinetId", "==", cabinetId),
      orderBy("dataAtendimento", "desc")
    );
  }, [db, hasGlobalView, cabinetId]);
  
  const { data: rawServices = [], loading } = useCollection(servicesQuery);

  const filteredServices = useMemo(() => {
    const services = rawServices.filter((s: any) => !s.deleted);
    if (!searchTerm) return services;
    
    const term = searchTerm.toLowerCase();
    return services.filter((s: CitizenService) => 
      s.municipeNome.toLowerCase().includes(term) ||
      s.municipeTelefone.includes(term) ||
      s.municipeEndereco.toLowerCase().includes(term) ||
      (s as any).municipeEmail?.toLowerCase().includes(term)
    );
  }, [rawServices, searchTerm]);

  const handleDelete = async (id: string) => {
    if (!db || isAuditor) return;
    setDeletingId(id);
    try {
      if (isMasterAdmin) {
        await deleteDoc(doc(db, "atendimentos", id));
      } else {
        await updateDoc(doc(db, "atendimentos", id), {
          deleted: true,
          deletedAt: new Date().toISOString(),
          deletedBy: user?.uid
        });
      }
      toast({ title: "Registro removido", description: "O atendimento foi removido com sucesso." });
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
        <header className="mb-10">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-all mb-4 text-[10px] font-black uppercase tracking-[0.3em]">
            <ChevronLeft size={16} /> Dashboard
          </Link>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-black tracking-tighter uppercase text-white">Atendimento ao <span className="text-primary">Munícipe</span></h1>
              <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-1">Gestão de solicitações e base de contatos.</p>
            </div>
            <Link href="/atendimentos/new">
              <Button className="bg-primary text-black font-black uppercase text-[11px] tracking-widest h-12 px-8 shadow-lg shadow-primary/20 hover:opacity-90 glow-primary">
                <Plus className="mr-2" size={18} /> Novo Atendimento
              </Button>
            </Link>
          </div>
        </header>

        <div className="mb-8 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input 
            placeholder="Buscar por nome, e-mail, telefone ou endereço..." 
            className="w-full h-14 bg-white/5 border border-white/5 rounded-2xl pl-12 pr-4 text-sm font-bold text-white focus:outline-none focus:border-primary/50 transition-all" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-56 bg-white/5 rounded-2xl animate-pulse border border-white/5" />
            ))}
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-32 bg-white/5 rounded-3xl border-2 border-dashed border-white/5">
            <AlertCircle size={48} className="mx-auto text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-xs font-black uppercase tracking-[0.4em] text-muted-foreground">Nenhum atendimento encontrado</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredServices.map((s: CitizenService) => (
              <Card key={s.id} className="bg-white/5 border-white/5 hover:border-primary/40 transition-all group overflow-hidden shadow-2xl relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                <CardHeader className="pb-4 pt-8">
                  <div className="flex justify-between items-start mb-4">
                    <Badge variant="outline" className="text-[9px] font-black tracking-widest uppercase border-primary/20 text-primary px-3 py-1">
                      {s.dataAtendimento?.toDate().toLocaleDateString()}
                    </Badge>
                    {!isAuditor && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                            {deletingId === s.id ? <Loader2 className="animate-spin h-3 w-3" /> : <Trash2 size={16} />}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-black border-white/10">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-white font-black uppercase tracking-tight">Excluir Registro?</AlertDialogTitle>
                            <AlertDialogDescription className="text-muted-foreground text-xs uppercase font-bold">
                              Esta ação removerá o atendimento do sistema.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-white/5 border-white/10 text-white font-bold">Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(s.id)} className="bg-destructive text-white font-bold">Confirmar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                  <CardTitle className="text-xl font-black uppercase tracking-tight text-white group-hover:text-primary transition-colors">{s.municipeNome}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pb-8">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      <Phone size={14} className="text-primary/70" /> {s.municipeTelefone}
                    </div>
                    {s.municipeEmail && (
                      <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        <Mail size={14} className="text-primary/70" /> {s.municipeEmail}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground truncate">
                      <MapPin size={14} className="text-primary/70 shrink-0" /> {s.municipeEndereco}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-black/40 rounded-2xl text-xs line-clamp-3 border-l-2 border-primary/30 text-white/70 italic leading-relaxed">
                    "{s.descricaoSolicitacao}"
                  </div>

                  <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                      <ClipboardList size={12} className="text-primary/50" /> {s.municipeTituloEleitoral || 'S/ TÍTULO'}
                    </div>
                    {s.demandaId ? (
                      <Link href={`/demandas/${s.demandaId}`}>
                        <Button variant="ghost" size="sm" className="h-9 text-primary hover:bg-primary/10 gap-2 text-[10px] font-black uppercase tracking-widest">
                          Ver Demanda <ChevronRight size={14} />
                        </Button>
                      </Link>
                    ) : (
                      <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest opacity-20">Sem Demanda</span>
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
