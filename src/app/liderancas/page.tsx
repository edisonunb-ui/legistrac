"use client";

import { useFirestore, useCollection, useUser } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useState, useMemo } from "react";
import { collection, query } from "firebase/firestore";
import { Leader } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, MapPin, Phone, Users, ChevronRight, ChevronLeft, Target } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function LeadersPage() {
  const { user } = useUser();
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState("");

  const leadersQuery = useMemo(() => db ? query(collection(db, "liderancas")) : null, [db]);
  const { data: leaders = [], loading } = useCollection(leadersQuery);

  const filteredLeaders = useMemo(() => {
    return leaders.filter((l: Leader) => 
      l.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.bairro.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => (b.potencialVotos || 0) - (a.potencialVotos || 0));
  }, [leaders, searchTerm]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-2 text-sm font-bold uppercase tracking-widest">
              <ChevronLeft size={16} /> Dashboard
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">Mapa de <span className="text-primary">Lideranças</span></h1>
            <p className="text-muted-foreground">Gerencie sua base eleitoral de forma estratégica.</p>
          </div>
          <Link href="/liderancas/new">
            <Button className="bg-primary text-primary-foreground font-bold h-11 px-6 shadow-lg shadow-primary/20">
              <Plus className="mr-2" size={18} /> Novo Líder
            </Button>
          </Link>
        </header>

        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input 
            placeholder="Buscar por nome ou bairro..." 
            className="pl-10 h-12 bg-card border-primary/10" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-40 bg-card rounded-xl animate-pulse border border-primary/5" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLeaders.map((l: Leader) => (
              <Card key={l.id} className="bg-card border-primary/10 hover:border-primary/30 transition-all cursor-pointer group">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <Badge className={cn(
                      "text-[8px] font-bold tracking-widest uppercase",
                      l.status === "ATIVO" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      {l.status}
                    </Badge>
                    <div className="flex flex-col items-end">
                      <span className="text-primary font-bold text-lg">{l.potencialVotos}</span>
                      <span className="text-[8px] text-muted-foreground font-bold uppercase">Votos</span>
                    </div>
                  </div>
                  <CardTitle className="text-xl font-bold mt-1 group-hover:text-primary transition-colors">{l.nome}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                      <MapPin size={14} className="text-primary" /> {l.bairro}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                      <Phone size={14} className="text-primary" /> {l.contato}
                    </div>
                  </div>
                  <div className="pt-4 border-t border-primary/5 flex items-center justify-between">
                    <Badge variant="outline" className="text-[9px] font-bold uppercase border-primary/20 text-primary">
                      {l.influencia} INFLUÊNCIA
                    </Badge>
                    <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary transition-transform" />
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
