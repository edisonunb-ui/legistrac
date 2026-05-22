
"use client";

import { useUser, useFirestore, useDoc, useCollection } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useState, useMemo } from "react";
import { collection, query, where, doc } from "firebase/firestore";
import { LegislativeAction } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  Search, 
  Plus, 
  ChevronRight, 
  ChevronLeft,
  Gavel, 
  ExternalLink,
  Filter,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function LegislativeListPage() {
  const { user } = useUser();
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState("");

  const userEmail = user?.email?.toLowerCase().trim();
  const profileRef = useMemo(() => (userEmail && db) ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: profile } = useDoc(profileRef);
  const cabinetId = (profile as any)?.cabinetId;

  const actionsQuery = useMemo(() => {
    if (!db || !cabinetId) return null;
    return query(collection(db, "legislativo"), where("cabinetId", "==", cabinetId));
  }, [db, cabinetId]);

  const { data: actions = [], loading } = useCollection(actionsQuery);

  const filteredActions = useMemo(() => {
    return actions.filter((a: LegislativeAction) => 
      a.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.ementa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.numero?.includes(searchTerm)
    ).sort((a, b) => b.ano - a.ano);
  }, [actions, searchTerm]);

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <header className="mb-10 flex flex-col gap-6">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-all w-fit text-[10px] font-black uppercase tracking-[0.3em]">
            <ChevronLeft size={16} /> Dashboard
          </Link>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter text-white">Atividade <span className="text-primary">Legislativa</span></h1>
              <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-1">Rastreamento de projetos, indicações e requerimentos.</p>
            </div>
            <Link href="/legislativo/new">
              <Button className="bg-primary text-black font-black uppercase text-[11px] tracking-widest h-12 px-8 shadow-lg shadow-primary/20 hover:opacity-90 glow-primary">
                <Plus className="mr-2" size={18} /> Nova Ação
              </Button>
            </Link>
          </div>
        </header>

        <div className="mb-8 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input 
            placeholder="Buscar por título, ementa ou número..." 
            className="w-full h-14 bg-white/5 border border-white/5 rounded-2xl pl-12 pr-4 text-sm font-bold text-white focus:outline-none focus:border-primary/50 transition-all" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-40 bg-white/5 rounded-2xl animate-pulse border border-white/5" />)}
          </div>
        ) : filteredActions.length === 0 ? (
          <div className="text-center py-32 bg-white/5 rounded-3xl border-2 border-dashed border-white/5">
            <FileText size={48} className="mx-auto text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-xs font-black uppercase tracking-[0.4em] text-muted-foreground">Nenhuma ação legislativa</h3>
            <p className="text-primary text-[9px] font-black uppercase tracking-widest mt-2">Use a IA nas demandas para redigir novas ações.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filteredActions.map((a: LegislativeAction) => (
              <Card key={a.id} className="bg-white/5 border-white/5 hover:border-primary/40 transition-all group overflow-hidden shadow-2xl relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                <CardHeader className="pb-4 pt-8">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className="text-[9px] font-black tracking-widest uppercase border-primary/20 text-primary px-3 py-1">
                      {a.tipo.replace("_", " ")} {a.numero ? `№ ${a.numero}` : '(S/N)'} / {a.ano}
                    </Badge>
                    <Badge className={cn(
                      "text-[9px] font-black uppercase px-3 py-1 text-white",
                      a.status === "APROVADO" && "bg-green-500",
                      a.status === "REJEITADO" && "bg-destructive",
                      a.status === "PROTOCOLADO" && "bg-blue-500",
                      a.status === "ELABORACAO" && "bg-muted text-muted-foreground"
                    )}>
                      {a.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-black uppercase tracking-tight text-white group-hover:text-primary transition-colors mt-4">{a.titulo}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pb-8">
                  <p className="text-xs text-white/70 line-clamp-3 italic leading-relaxed border-l-2 border-primary/30 pl-4">
                    {a.ementa}
                  </p>
                  
                  <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                      <Gavel size={14} className="text-primary/70" /> {a.dataProtocolo?.toDate().toLocaleDateString() || 'PENDENTE'}
                    </div>
                    <div className="flex gap-3">
                      {a.linkOficial && (
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-primary hover:bg-primary/10" asChild>
                          <a href={a.linkOficial} target="_blank" rel="noopener noreferrer">
                            <ExternalLink size={16} />
                          </a>
                        </Button>
                      )}
                      <Link href={`/legislativo/${a.id}`}>
                        <Button variant="ghost" size="sm" className="h-9 text-primary hover:bg-primary/10 gap-2 text-[10px] font-black uppercase tracking-widest">
                          Detalhes <ChevronRight size={14} />
                        </Button>
                      </Link>
                    </div>
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
