
"use client";

import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createDemand } from "@/lib/demand-service";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Send, Loader2, Monitor, Printer, Wifi, ShieldAlert, Cpu, HelpCircle } from "lucide-react";
import Link from "next/link";
import { collection, query, where, doc, limit, getDocs } from "firebase/firestore";
import { cn } from "@/lib/utils";

const HELP_TOPICS = [
  { id: "impressora", label: "Impressora não imprime", icon: Printer },
  { id: "computador_liga", label: "Computador não liga", icon: Monitor },
  { id: "sistema_att", label: "Atualização de sistema", icon: Wifi },
  { id: "travado", label: "Computador travado", icon: Cpu },
  { id: "ativacao", label: "Ativações de Windows e Word", icon: ShieldAlert },
  { id: "outro", label: "Outro problema...", icon: HelpCircle },
];

export default function NewHelpDeskPage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    assunto: "",
    descricao: "",
  });

  const userEmail = user?.email?.toLowerCase().trim();
  const profileRef = useMemoFirebase(() => (userEmail && db) ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: profile } = useDoc(profileRef);
  const cabinetId = (profile as any)?.cabinetId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db || !cabinetId || saving) return;
    
    if (!formData.assunto) {
      toast({ title: "Atenção", description: "Selecione o tipo de problema.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Localizar Gabinete de TI para garantir que existe uma central configurada
      const tiCabinetQuery = query(collection(db, "gabinetes"), where("isTI", "==", true), limit(1));
      const tiSnap = await getDocs(tiCabinetQuery);
      
      if (tiSnap.empty) {
        throw new Error("Gabinete de TI não configurado no sistema. Contate o administrador.");
      }

      const demandId = await createDemand(db, user.uid, {
        cabinetId,
        titulo: `[HELP-DESK] ${formData.assunto}`,
        descricao: formData.descricao || `Chamado aberto para: ${formData.assunto}`,
        prazo: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        prioridade: "MEDIA",
        tipo: "HELPDESK",
        assuntoPredefinido: formData.assunto
      });
      
      toast({ title: "Chamado Aberto!", description: "O setor de TI foi notificado." });
      router.push(`/demandas/${demandId}`);
    } catch (error: any) {
      setSaving(false);
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12">
        <header className="mb-10">
          <Link href="/demandas" className="flex items-center gap-2 text-muted-foreground hover:text-primary mb-4 text-[10px] font-black uppercase tracking-[0.3em]">
            <ChevronLeft size={16} /> Voltar
          </Link>
          <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter text-white">HelpDesk <span className="text-primary">TI</span></h1>
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-1">Suporte técnico direto para o seu gabinete.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <Card className="bg-white/5 border-white/5 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              <form onSubmit={handleSubmit}>
                <CardHeader>
                  <CardTitle className="text-[11px] font-black uppercase tracking-[0.3em] text-primary">Abrir Ordem de Serviço</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Qual o problema identificado?</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {HELP_TOPICS.map((topic) => (
                        <button
                          key={topic.id}
                          type="button"
                          onClick={() => setFormData(p => ({ ...p, assunto: topic.label }))}
                          className={cn(
                            "flex items-center gap-4 p-4 rounded-xl border transition-all text-left group",
                            formData.assunto === topic.label 
                              ? "bg-primary/20 border-primary text-primary" 
                              : "bg-black/40 border-white/5 text-white/60 hover:border-white/20 hover:text-white"
                          )}
                        >
                          <topic.icon size={20} className={cn(formData.assunto === topic.label ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
                          <span className="text-[11px] font-black uppercase tracking-tight">{topic.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Relato Adicional (Opcional)</Label>
                    <div className="bg-black/50 p-1 rounded-xl">
                       <Textarea 
                         value={formData.descricao} 
                         onChange={e => setFormData(p => ({ ...p, descricao: e.target.value }))}
                         placeholder="Descreva detalhes como patrimônio do computador, sala ou urgência específica..."
                         className="min-h-[150px] bg-transparent border-none text-white focus-visible:ring-0"
                       />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-white/5 p-8">
                  <Button type="submit" disabled={saving} className="w-full h-14 bg-primary text-black font-black uppercase text-xs tracking-widest glow-primary">
                    {saving ? <Loader2 className="animate-spin" /> : <><Send className="mr-2" size={18} /> Enviar Chamado ao TI</>}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>

          <aside className="space-y-6">
            <Card className="bg-white/5 border-white/5 overflow-hidden">
              <CardHeader className="bg-white/5 border-b border-white/5">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary">Como funciona?</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <p className="text-[10px] text-muted-foreground uppercase leading-relaxed font-bold">
                  1. O chamado cai diretamente no painel da equipe de TI.<br/><br/>
                  2. Um técnico assumirá o seu protocolo.<br/><br/>
                  3. Você poderá conversar com o técnico através do campo de "Trâmites" na próxima tela.<br/><br/>
                  4. Você receberá uma notificação quando o serviço for concluído.
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
