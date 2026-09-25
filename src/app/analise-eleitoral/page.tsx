
"use client";

import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useState } from "react";
import { collection, query, where, addDoc, serverTimestamp, doc } from "firebase/firestore";
import { ElectionResult, Leader } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  ChevronLeft, 
  Plus, 
  Sparkles, 
  Loader2,
  MapPin
} from "lucide-react";
import Link from "next/link";
import { analyzeElectionPerformance, TSEAnalysisOutput } from "@/ai/flows/tse-analysis-flow";
import { cn } from "@/lib/utils";

export default function ElectionAnalysisPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiResult, setAiResult] = useState<TSEAnalysisOutput | null>(null);
  const [addingData, setAddingData] = useState(false);

  const [formData, setFormData] = useState({
    regiao: "",
    votosGanhos: "",
    ano: "2024"
  });

  const userEmail = user?.email?.toLowerCase().trim();
  const profileRef = useMemoFirebase(() => (userEmail && db) ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: profile } = useDoc(profileRef);
  const cabinetId = (profile as any)?.cabinetId;

  const resultsQuery = useMemoFirebase(() => (db && cabinetId) ? query(collection(db, "eleicoes"), where("cabinetId", "==", cabinetId)) : null, [db, cabinetId]);
  const { data: results = [] } = useCollection<ElectionResult>(resultsQuery);

  const leadersQuery = useMemoFirebase(() => (db && cabinetId) ? query(collection(db, "liderancas"), where("cabinetId", "==", cabinetId)) : null, [db, cabinetId]);
  const { data: leaders = [] } = useCollection<Leader>(leadersQuery);

  const handleAddData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !cabinetId) return;
    setAddingData(true);
    try {
      await addDoc(collection(db, "eleicoes"), {
        ...formData,
        votosGanhos: Number(formData.votosGanhos),
        ano: Number(formData.ano),
        cabinetId,
        createdAt: serverTimestamp()
      });
      toast({ title: "Dados Inseridos" });
      setFormData({ regiao: "", votosGanhos: "", ano: "2024" });
    } catch (e) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setAddingData(false);
    }
  };

  const handleRunAI = async (result: ElectionResult) => {
    const regionLeaders = leaders.filter(l => l.bairro.toLowerCase().includes(result.regiao.toLowerCase()));
    const potential = regionLeaders.reduce((acc, curr) => acc + (curr.potencialVotos || 0), 0);
    
    setLoadingAI(true);
    try {
      const analysis = await analyzeElectionPerformance({
        region: result.regiao,
        actualVotes: result.votosGanhos,
        expectedVotes: potential,
        leaderNames: regionLeaders.map(l => l.nome)
      });
      setAiResult(analysis);
    } catch (e) {
      toast({ title: "Erro na IA", variant: "destructive" });
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <header className="mb-10">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-primary mb-4 text-[10px] font-black uppercase tracking-[0.3em]">
            <ChevronLeft size={16} /> Dashboard
          </Link>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-white">Gabinete <span className="text-primary">Estatístico</span></h1>
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-1">Cruzamento de dados TSE vs Realidade de Campo.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-white/5 border-white/5 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
               <CardHeader>
                  <CardTitle className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Plus size={16} /> Alimentar Votos (TSE)
                  </CardTitle>
               </CardHeader>
               <CardContent>
                  <form onSubmit={handleAddData} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Região / Bairro</Label>
                      <Input value={formData.regiao} onChange={e => setFormData(p => ({ ...p, regiao: e.target.value }))} required className="bg-black border-white/10" placeholder="Ex: Bairro Santa Luzia" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Votos Reais Obtidos</Label>
                      <Input type="number" value={formData.votosGanhos} onChange={e => setFormData(p => ({ ...p, votosGanhos: e.target.value }))} required className="bg-black border-white/10" />
                    </div>
                    <Button className="w-full bg-primary text-black font-black uppercase text-[10px]" type="submit" disabled={addingData}>
                       {addingData ? <Loader2 className="animate-spin" /> : "Gravar Dados"}
                    </Button>
                  </form>
               </CardContent>
            </Card>

            <div className="p-6 bg-primary/10 rounded-2xl border border-primary/20 space-y-4">
               <div className="p-3 bg-primary text-black w-fit rounded-xl"><Sparkles size={20} /></div>
               <h4 className="text-sm font-black uppercase tracking-widest text-primary">Inteligência Estratégica</h4>
               <p className="text-[10px] text-primary/70 font-bold uppercase leading-relaxed">Clique no ícone de IA ao lado de cada região para descobrir onde você está perdendo influência e como reverter o cenário para 2026.</p>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white/5 border-white/5 shadow-2xl overflow-hidden">
               <CardHeader className="border-b border-white/5">
                  <CardTitle className="text-[11px] font-black uppercase tracking-widest text-primary">Histórico de Votação Regionalizada</CardTitle>
               </CardHeader>
               <CardContent className="p-0">
                  {results.length === 0 ? (
                    <div className="p-20 text-center text-muted-foreground text-[10px] font-black uppercase tracking-widest">Sem dados cadastrados.</div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {results.map((r) => (
                        <div key={r.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors">
                          <div className="flex items-center gap-6">
                            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center text-primary border border-white/5"><MapPin size={20} /></div>
                            <div>
                               <h4 className="font-black uppercase text-sm tracking-tight text-white">{r.regiao}</h4>
                               <p className="text-[10px] font-bold text-muted-foreground uppercase">{r.votosGanhos} Votos em {r.ano}</p>
                            </div>
                          </div>
                          <Button onClick={() => handleRunAI(r)} variant="ghost" className="h-12 w-12 rounded-xl text-primary hover:bg-primary/20 border border-primary/20">
                            {loadingAI ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
               </CardContent>
            </Card>

            {aiResult && (
              <Card className="bg-primary/5 border-primary/20 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                 <CardHeader className="bg-primary/10 border-b border-primary/10 flex flex-row justify-between items-center">
                    <CardTitle className="text-[11px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
                       <Sparkles size={16} /> Diagnóstico do Especialista IA
                    </CardTitle>
                    <Badge className={cn(
                      "font-black text-[9px] uppercase",
                      aiResult.efficiencyLevel === 'CRITICO' ? "bg-red-500" : "bg-green-500"
                    )}>{aiResult.efficiencyLevel.replace("_", " ")}</Badge>
                 </CardHeader>
                 <CardContent className="p-8 space-y-6">
                    <div className="space-y-2">
                       <Label className="text-[9px] font-black uppercase text-primary tracking-widest">Análise de Campo:</Label>
                       <p className="text-sm leading-relaxed text-white/90 italic font-medium">"{aiResult.diagnosis}"</p>
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[9px] font-black uppercase text-primary tracking-widest">Plano de Reconquista:</Label>
                       <div className="bg-black/40 p-4 rounded-xl border border-primary/10 text-xs leading-relaxed text-white/80 whitespace-pre-wrap">
                          {aiResult.actionPlan}
                       </div>
                    </div>
                 </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
