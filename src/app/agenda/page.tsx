
"use client";

import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { useState } from "react";
import { collection, query, where, addDoc, serverTimestamp, orderBy, doc } from "firebase/firestore";
import { Appointment } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, MapPin, Loader2, ChevronLeft, Briefcase, Users, Home } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const APPOINTMENT_TYPES = [
  { id: "REUNIAO", label: "Reunião Interna", icon: Briefcase, color: "bg-blue-500" },
  { id: "EVENTO", label: "Evento Externo", icon: Users, color: "bg-purple-500" },
  { id: "SESSAO", label: "Sessão Plenária", icon: Home, color: "bg-red-500" },
  { id: "VISITA", label: "Visita Técnica", icon: MapPin, color: "bg-green-500" },
];

export default function AgendaPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    data: "",
    hora: "",
    local: "",
    tipo: "REUNIAO" as any
  });

  const userEmail = user?.email?.toLowerCase().trim();
  const profileRef = useMemoFirebase(() => (userEmail && db) ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: profile } = useDoc(profileRef);
  const cabinetId = (profile as any)?.cabinetId;

  const agendaQuery = useMemoFirebase(() => (db && cabinetId) ? query(
    collection(db, "agenda"), 
    where("cabinetId", "==", cabinetId),
    orderBy("data", "asc"),
    orderBy("hora", "asc")
  ) : null, [db, cabinetId]);

  const { data: appointments = [], loading } = useCollection<Appointment>(agendaQuery);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !cabinetId) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "agenda"), {
        ...formData,
        cabinetId,
        status: "PENDENTE",
        createdAt: serverTimestamp()
      });
      toast({ title: "Compromisso Agendado" });
      setFormData({ titulo: "", descricao: "", data: "", hora: "", local: "", tipo: "REUNIAO" });
    } catch (e) {
      toast({ title: "Erro ao agendar", variant: "destructive" });
    } finally {
      setSaving(false);
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
          <h1 className="text-4xl font-black uppercase tracking-tighter text-white">Agenda do <span className="text-primary">Gabinete</span></h1>
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-1">Gestão de Sessões, Visitas e Atos Públicos.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-1">
            <Card className="bg-white/5 border-white/5 shadow-2xl relative overflow-hidden sticky top-24">
               <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
               <CardHeader>
                  <CardTitle className="text-[11px] font-black uppercase tracking-widest text-primary">Novo Compromisso</CardTitle>
               </CardHeader>
               <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Título do Evento</Label>
                      <Input value={formData.titulo} onChange={e => setFormData(p => ({ ...p, titulo: e.target.value }))} required className="bg-black border-white/10" placeholder="Ex: Audiência Pública - Saúde" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Data</Label>
                        <Input type="date" value={formData.data} onChange={e => setFormData(p => ({ ...p, data: e.target.value }))} required className="bg-black border-white/10" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Hora</Label>
                        <Input type="time" value={formData.hora} onChange={e => setFormData(p => ({ ...p, hora: e.target.value }))} required className="bg-black border-white/10" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Local</Label>
                      <Input value={formData.local} onChange={e => setFormData(p => ({ ...p, local: e.target.value }))} required className="bg-black border-white/10" placeholder="Ex: Câmara Municipal - Plenário" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Tipo</Label>
                      <Select value={formData.tipo} onValueChange={v => setFormData(p => ({ ...p, tipo: v }))}>
                        <SelectTrigger className="bg-black border-white/10"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-black border-white/10">
                          {APPOINTMENT_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full bg-primary text-black font-black uppercase text-[10px] h-12" type="submit" disabled={saving}>
                       {saving ? <Loader2 className="animate-spin" /> : "Agendar Agora"}
                    </Button>
                  </form>
               </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {loading ? (
              <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div>
            ) : appointments.length === 0 ? (
              <div className="p-20 text-center bg-white/5 rounded-3xl border-2 border-dashed border-white/5">
                <Calendar size={48} className="mx-auto text-muted-foreground opacity-10 mb-4" />
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Sem compromissos marcados.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((a) => {
                  const type = APPOINTMENT_TYPES.find(t => t.id === a.tipo) || APPOINTMENT_TYPES[0];
                  return (
                    <Card key={a.id} className="bg-white/5 border-white/5 hover:border-primary/40 transition-all group overflow-hidden">
                       <div className="p-6 flex items-center justify-between">
                          <div className="flex items-center gap-6">
                             <div className={cn("w-14 h-14 rounded-2xl flex flex-col items-center justify-center text-white font-black", type.color)}>
                                <span className="text-[9px] uppercase">{new Date(a.data + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short' })}</span>
                                <span className="text-xl leading-none">{a.data.split('-')[2]}</span>
                             </div>
                             <div>
                                <Badge variant="outline" className="text-[8px] font-black uppercase border-primary/20 text-primary mb-2">
                                  <type.icon size={10} className="mr-1" /> {type.label}
                                </Badge>
                                <h4 className="text-lg font-black uppercase tracking-tight text-white group-hover:text-primary transition-colors">{a.titulo}</h4>
                                <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                                   <span className="flex items-center gap-1.5"><Clock size={12} className="text-primary" /> {a.hora}</span>
                                   <span className="flex items-center gap-1.5"><MapPin size={12} className="text-primary" /> {a.local}</span>
                                </div>
                             </div>
                          </div>
                          <div className="flex items-center gap-2">
                             <Button variant="ghost" size="sm" className="text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-white">Concluir</Button>
                          </div>
                       </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
