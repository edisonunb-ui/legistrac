
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
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Gavel className="text-primary" /> Atividade <span className="text-primary">Legislativa</span>
            </h1>
            <p className="text-muted-foreground">Rastreamento de projetos, indicações e requerimentos.</p>
          </div>
          <Link href="/legislativo/new">
            <Button className="bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20">
              <Plus className="mr-2" size={18} /> Nova Ação
            </Button>
          </Link>
        </header>

        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input 
            placeholder="Buscar por título, ementa ou número..." 
            className="pl-10 h-12 bg-card border-primary/10" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-40 bg-card rounded-xl animate-pulse border border-primary/5" />)}
          </div>
        ) : filteredActions.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-primary/10">
            <FileText size={48} className="mx-auto text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-lg font-bold">Nenhuma ação legislativa</h3>
            <p className="text-muted-foreground text-sm">Use a IA nas demandas para redigir novas ações.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredActions.map((a: LegislativeAction) => (
              <Card key={a.id} className="bg-card border-primary/10 hover:border-primary/30 transition-all group overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className="text-[9px] font-bold tracking-widest uppercase border-primary/20 text-primary">
                      {a.tipo.replace("_", " ")} {a.numero ? `№ ${a.numero}` : '(S/N)'} / {a.ano}
                    </Badge>
                    <Badge className={cn(
                      "text-[8px] font-bold uppercase",
                      a.status === "APROVADO" && "bg-green-500",
                      a.status === "REJEITADO" && "bg-destructive",
                      a.status === "PROTOCOLADO" && "bg-blue-500",
                      a.status === "ELABORACAO" && "bg-muted text-muted-foreground"
                    )}>
                      {a.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg font-bold mt-2 group-hover:text-primary transition-colors">{a.titulo}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground line-clamp-2 italic">
                    {a.ementa}
                  </p>
                  
                  <div className="pt-4 border-t border-primary/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
                      <Gavel size={12} /> Data: {a.dataProtocolo?.toDate().toLocaleDateString() || 'Pendente'}
                    </div>
                    <div className="flex gap-2">
                      {a.linkOficial && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" asChild>
                          <a href={a.linkOficial} target="_blank" rel="noopener noreferrer">
                            <ExternalLink size={14} />
                          </a>
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-8 text-primary hover:text-primary hover:bg-primary/10 gap-1 text-[10px] font-bold">
                        Detalhes <ChevronRight size={14} />
                      </Button>
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
