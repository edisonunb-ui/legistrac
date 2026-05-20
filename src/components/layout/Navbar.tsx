"use client";

import { useUser, useFirestore, useAuthInstance, useDoc, useCollection } from "@/firebase";
import { Button, buttonVariants } from "@/components/ui/button";
import { LogOut, LayoutDashboard, ListTodo, Users, Target, PhoneIncoming, Building2, Gavel, Menu, User, Clock, ChevronDown } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { Demand } from "@/lib/types";

const MASTER_EMAIL = "edisonunb@gmail.com";
const AUDITOR_EMAIL = "alemao@gmail.com";

/**
 * Componente de Relógio isolado com Calendário de Prazos
 */
function ClockDisplay({ demandDates }: { demandDates: Date[] }) {
  const [time, setTime] = useState<string | null>(null);
  const [fullDate, setFullDate] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMonth, setViewMonth] = useState<Date>(new Date());

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentDate(now);
      setTime(new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      }).format(now));
      setFullDate(new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        weekday: 'long', day: '2-digit', month: 'long',
      }).format(now).toUpperCase());
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
      <PopoverContent className="w-[320px] p-0 bg-black border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95" align="end">
        <div className="p-6 bg-[#0c1120] border-b border-white/5">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{fullDate}</span>
            <Clock size={14} className="text-primary/40" />
          </div>
          <h2 className="text-4xl font-black font-mono tracking-tighter text-white leading-none">{time}</h2>
        </div>
        <div className="p-4 bg-black">
          <Calendar
            mode="single"
            month={viewMonth}
            onMonthChange={setViewMonth}
            selected={currentDate}
            className="rounded-md border-none"
            modifiers={{
              deadline: demandDates
            }}
            modifiersClassNames={{
              deadline: "text-primary font-black relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-primary after:rounded-full"
            }}
            classNames={{
              caption_label: "text-[11px] font-black uppercase tracking-[0.2em] text-primary",
              nav_button: cn(
                buttonVariants({ variant: "outline" }),
                "h-7 w-7 bg-white/5 border-white/10 text-primary hover:bg-primary/20 p-0 opacity-100"
              ),
              day_selected: "bg-primary text-black font-black hover:bg-primary hover:text-black focus:bg-primary focus:text-black",
              day_today: "border border-primary/40 text-primary",
              head_cell: "text-muted-foreground font-black text-[10px] uppercase w-9",
            }}
          />
          {demandDates.length > 0 && (
            <div className="px-4 pb-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full glow-primary" />
                Destaque: Dias com Prazos
              </p>
            </div>
          )}
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

  const userEmail = useMemo(() => user?.email?.toLowerCase().trim(), [user?.email]);
  const isSuperAdmin = useMemo(() => userEmail === MASTER_EMAIL, [userEmail]);
  const isAuditor = useMemo(() => userEmail === AUDITOR_EMAIL, [userEmail]);
  const hasGlobalView = isSuperAdmin || isAuditor;

  const userProfileQuery = useMemo(() => (db && userEmail) ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: profile } = useDoc(userProfileQuery);

  const cabinetId = (profile as any)?.cabinetId;
  const cabinetQuery = useMemo(() => (db && cabinetId) ? doc(db, "gabinetes", cabinetId) : null, [db, cabinetId]);
  const { data: cabinet } = useDoc(cabinetQuery);

  const demandsQuery = useMemo(() => {
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
                    <div className="p-2 bg-primary/20 rounded-lg border border-primary/40">
                       <Target className="text-primary" size={20} />
                    </div>
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

          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-1.5 bg-primary/10 rounded-md text-primary border border-primary/20 glow-primary">
              <Target size={18} />
            </div>
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
