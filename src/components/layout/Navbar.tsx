
"use client";

import { useUser, useFirestore, useAuthInstance, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, ListTodo, Users, Target, PhoneIncoming, Building2, Gavel, Menu, User, Clock, ChevronDown, ChevronUp, Play, Plus, Minus, Settings, Award, ShieldCheck } from "lucide-react";
import { signOut } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useMemo, useState, useEffect } from "react";
import { doc, collection, query, where } from "firebase/firestore";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Demand, GlobalConfig } from "@/lib/types";

const MASTER_EMAIL = "edisonunb@gmail.com";
const AUDITOR_EMAIL = "alemao@gmail.com";

function ClockDisplay({ demandDates }: { demandDates: Date[] }) {
  const [time, setTime] = useState<string | null>(null);
  const [fullDate, setFullDate] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMonth, setViewMonth] = useState<Date>(new Date());
  const [minutes, setMinutes] = useState(30);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentDate(now);
      setTime(new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      }).format(now));
      
      const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(now);
      const day = now.getDate();
      const month = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(now);
      setFullDate(`${weekday}, ${day} de ${month}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!time) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-all active:scale-95 group">
          <Clock size={12} className="text-primary group-hover:glow-primary transition-all" />
          <span className="font-mono text-white">{time.substring(0, 5)}</span>
          <ChevronDown size={10} className="opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0 bg-[#1a1a1a] border-none shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95" align="end">
        <div className="p-5 flex items-center justify-between">
          <span className="text-sm font-medium text-white/90">{fullDate}</span>
          <div className="bg-white/10 p-1 rounded-md text-white/40">
            <ChevronDown size={14} />
          </div>
        </div>

        <div className="px-2 pb-2">
          <Calendar
            mode="single"
            month={viewMonth}
            onMonthChange={setViewMonth}
            selected={currentDate}
            showOutsideDays={true}
            className="p-3"
            modifiers={{
              deadline: demandDates
            }}
            modifiersClassNames={{
              deadline: "after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-primary after:rounded-full"
            }}
            classNames={{
              months: "space-y-4",
              month: "space-y-4",
              caption: "flex justify-between items-center px-2 pb-4 relative",
              caption_label: "text-sm font-bold text-white lowercase",
              nav: "flex items-center gap-2",
              nav_button: cn(
                "h-6 w-6 bg-transparent p-0 text-white/40 hover:text-white transition-colors"
              ),
              table: "w-full border-collapse space-y-1",
              head_row: "flex justify-between mb-2",
              head_cell: "text-white/40 font-bold text-[11px] w-9 text-center uppercase",
              row: "flex w-full justify-between mt-1",
              cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
              day: cn(
                "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-white/5 rounded-full transition-all"
              ),
              day_selected: "bg-[#4cc9f0] text-black hover:bg-[#4cc9f0] font-bold rounded-full",
              day_today: "text-[#4cc9f0] font-bold",
              day_outside: "text-white/10",
            }}
            components={{
              IconLeft: () => <ChevronUp size={16} className="rotate-[-45deg]" />,
              IconRight: () => <ChevronDown size={16} className="rotate-[-45deg]" />,
            }}
          />
        </div>

        <div className="p-4 bg-black/20 flex items-center justify-between border-t border-white/5">
          <div className="flex items-center gap-3 bg-white/5 rounded-lg p-1">
            <button 
              onClick={() => setMinutes(m => Math.max(5, m - 5))}
              className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white"
            >
              <Minus size={14} />
            </button>
            <span className="text-sm font-bold text-white min-w-[70px] text-center">
              {minutes} <span className="text-white/40 font-normal">minutos</span>
            </span >
            <button 
              onClick={() => setMinutes(m => m + 5)}
              className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white"
            >
              <Plus size={14} />
            </button>
          </div>
          <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all">
            <Play size={14} fill="currentColor" />
            Foco
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function Navbar() {
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuthInstance();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const userEmail = useMemo(() => user?.email?.toLowerCase().trim() || null, [user?.email]);
  const isSuperAdmin = useMemo(() => userEmail === MASTER_EMAIL, [userEmail]);
  const isAuditor = useMemo(() => userEmail === AUDITOR_EMAIL, [userEmail]);
  const hasGlobalView = isSuperAdmin || isAuditor;

  const userProfileQuery = useMemoFirebase(() => (db && userEmail) ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: profile } = useDoc(userProfileQuery);

  const cabinetId = (profile as any)?.cabinetId;
  const cabinetQuery = useMemoFirebase(() => (db && cabinetId) ? doc(db, "gabinetes", cabinetId) : null, [db, cabinetId]);
  const { data: cabinet } = useDoc(cabinetQuery);

  const globalConfigRef = useMemoFirebase(() => (db) ? doc(db, "config", "global") : null, [db]);
  const { data: globalConfig } = useDoc<GlobalConfig>(globalConfigRef);

  const demandsQuery = useMemoFirebase(() => {
    if (!db || (!cabinetId && !hasGlobalView)) return null;
    if (hasGlobalView) return query(collection(db, "demandas"), where("deleted", "==", false));
    return query(
      collection(db, "demandas"), 
      where("cabinetId", "==", cabinetId),
      where("deleted", "==", false)
    );
  }, [db, cabinetId, hasGlobalView]);

  const { data: allDemands = [] } = useCollection<Demand>(demandsQuery);

  const demandDates = useMemo(() => {
    return allDemands
      .filter(d => d.prazo && d.status !== 'FINALIZADO')
      .map(d => {
        const [year, month, day] = d.prazo.split('-').map(Number);
        return new Date(year, month - 1, day);
      });
  }, [allDemands]);

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push("/login");
  };

  const navItems = useMemo(() => [
    { label: "Dashboard", icon: LayoutDashboard, href: "/" },
    { label: "Atendimentos", icon: PhoneIncoming, href: "/atendimentos" },
    { label: "Demandas", icon: ListTodo, href: "/demandas" },
    { label: "Legislativo", icon: Gavel, href: "/legislativo" },
    { label: "Lideranças", icon: Users, href: "/liderancas" },
  ], []);

  const BrandLogo = () => {
    // PRIORIDADE: Marca do Desenvolvedor (Assinatura de Marca)
    if (globalConfig?.developerLogoUrl) {
      return (
        <div className="relative h-10 w-10 overflow-hidden rounded-full border border-primary shadow-lg glow-primary">
          <Image src={globalConfig.developerLogoUrl} alt="Dev Signature" fill className="object-cover" />
        </div>
      );
    }
    // FALLBACK: Carimbo do Gabinete ou Ícone Padrão
    const carimboUrl = (cabinet as any)?.carimboUrl;
    if (carimboUrl) {
      return (
        <div className="relative h-10 w-10 overflow-hidden rounded-full border border-primary/30 shadow-lg shadow-primary/10">
          <Image src={carimboUrl} alt="Selo Oficial" fill className="object-cover" />
        </div>
      );
    }
    return (
      <div className="p-1.5 bg-primary/10 rounded-md text-primary border border-primary/20 glow-primary">
        <ShieldCheck size={18} />
      </div>
    );
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-black/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-white/5 h-10 w-10">
                  <Menu size={20} />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] p-0 border-r border-white/5 bg-black">
                <SheetHeader className="p-6 border-b border-white/5 text-left bg-white/5">
                  <SheetTitle className="flex items-center gap-3">
                    <BrandLogo />
                    <div className="flex flex-col leading-none">
                      <span className="font-black tracking-tight text-white uppercase">Legis<span className="text-primary">Trac</span></span>
                      <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Gabinete Mobile</span>
                    </div>
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col py-6 space-y-1">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-4 px-6 py-4 text-sm font-black transition-all uppercase tracking-widest",
                        pathname === item.href 
                          ? "text-primary bg-primary/10 border-l-4 border-primary" 
                          : "text-muted-foreground hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <item.icon size={18} className={pathname === item.href ? "text-primary" : ""} />
                      {item.label}
                    </Link>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <Link href="/" className="flex items-center gap-3 group">
            <BrandLogo />
            <div className="flex flex-col leading-none">
              <span className="text-lg font-black tracking-tighter text-white uppercase">Legis<span className="text-primary">Trac</span></span>
              <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest truncate max-w-[150px]">
                {isSuperAdmin ? "Central SuperAdmin" : (cabinet as any)?.vereador || "Gabinete"}
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-2 rounded-md text-[11px] font-black transition-all flex items-center gap-2 uppercase tracking-widest",
                  pathname === item.href ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon size={13} />
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ClockDisplay demandDates={demandDates} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full border border-white/10 p-0 overflow-hidden hover:bg-white/5 transition-all">
                <Avatar className="h-full w-full">
                  <AvatarFallback className="bg-primary/20 text-primary font-black text-xs border border-primary/30">
                    {(profile as any)?.nome?.[0]?.toUpperCase() || (isSuperAdmin ? "SA" : <User size={16} />)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 bg-black border-white/10 shadow-2xl" align="end">
              <DropdownMenuLabel className="p-4 bg-white/5">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-black text-white truncate uppercase">{(profile as any)?.nome || (isSuperAdmin ? "Super Admin" : "Usuário")}</p>
                  <p className="text-[9px] text-primary font-black truncate uppercase tracking-widest">{(profile as any)?.perfil || (isSuperAdmin ? "SUPER_ADMIN" : "")}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/5" />
              <DropdownMenuItem onClick={() => router.push("/usuarios")} className="p-3 hover:bg-white/5 cursor-pointer font-bold uppercase text-[10px] tracking-widest text-white/80 hover:text-primary">
                <Users size={14} className="mr-3 text-primary" /> Equipe do Gabinete
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/gabinete")} className="p-3 hover:bg-white/5 cursor-pointer font-bold uppercase text-[10px] tracking-widest text-white/80 hover:text-primary">
                <Settings size={14} className="mr-3 text-primary" /> Perfil do Gabinete
              </DropdownMenuItem>
              {isSuperAdmin && (
                <DropdownMenuItem onClick={() => router.push("/gabinetes")} className="p-3 hover:bg-white/5 cursor-pointer font-bold uppercase text-[10px] tracking-widest text-white/80 hover:text-primary">
                  <Building2 size={14} className="mr-3 text-primary" /> Gabinetes Isolados
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-white/5" />
              <DropdownMenuItem onClick={handleLogout} className="p-3 text-destructive hover:bg-destructive/10 cursor-pointer font-bold uppercase text-[10px] tracking-widest">
                <LogOut size={14} className="mr-3" /> Encerrar Sessão
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
