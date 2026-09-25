
"use client";

import { useUser, useFirestore, useAuthInstance, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { 
  LogOut, 
  LayoutDashboard, 
  ListTodo, 
  Users, 
  PhoneIncoming, 
  Building2, 
  Gavel, 
  Menu, 
  User, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Play, 
  Plus, 
  Minus, 
  Settings, 
  ShieldCheck, 
  LifeBuoy, 
  Download, 
  Info,
  CalendarDays,
  BarChart3
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  const [currentDate, setCurrentDate] = useState<Date | undefined>(undefined);
  const [viewMonth, setViewMonth] = useState<Date | undefined>(undefined);
  const [minutes, setMinutes] = useState(30);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentDate(now);
      if (!viewMonth) setViewMonth(now);
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
  }, [viewMonth]);

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
        </div>
        <div className="px-2 pb-2">
          {currentDate && (
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
                cell: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
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
  const [isDownloadGuideOpen, setIsDownloadGuideOpen] = useState(false);

  const userEmail = useMemo(() => user?.email?.toLowerCase().trim() || null, [user?.email]);
  const isSuperAdmin = useMemo(() => userEmail === MASTER_EMAIL, [userEmail]);
  
  const userProfileQuery = useMemoFirebase(() => (db && userEmail) ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: profile } = useDoc(userProfileQuery);
  const cabinetId = (profile as any)?.cabinetId;

  const globalConfigRef = useMemoFirebase(() => (db) ? doc(db, "config", "global") : null, [db]);
  const { data: globalConfig } = useDoc<GlobalConfig>(globalConfigRef);

  const demandsQuery = useMemoFirebase(() => {
    if (!db || !cabinetId) return null;
    return query(collection(db, "demandas"), where("cabinetId", "==", cabinetId), where("deleted", "==", false));
  }, [db, cabinetId]);
  const { data: allDemands = [] } = useCollection<Demand>(demandsQuery);

  const demandDates = useMemo(() => {
    return allDemands.filter(d => d.prazo).map(d => {
      const [year, month, day] = d.prazo.split('-').map(Number);
      return new Date(year, month - 1, day);
    });
  }, [allDemands]);

  const navItems = useMemo(() => [
    { label: "Painel", icon: LayoutDashboard, href: "/" },
    { label: "Agenda", icon: CalendarDays, href: "/agenda" },
    { label: "Eleições IA", icon: BarChart3, href: "/analise-eleitoral" },
    { label: "Munícipes", icon: PhoneIncoming, href: "/atendimentos" },
    { label: "Protocolos", icon: ListTodo, href: "/demandas" },
    { label: "Legislativo", icon: Gavel, href: "/legislativo" },
    { label: "Lideranças", icon: Users, href: "/liderancas" },
  ], []);

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push("/login");
  };

  const BrandLogo = () => {
    if (globalConfig?.developerLogoUrl) {
      return (
        <div className="relative h-10 w-10 overflow-hidden rounded-full border border-primary/20">
          <Image src={globalConfig.developerLogoUrl} alt="Logo" fill sizes="40px" className="object-cover" />
        </div>
      );
    }
    return <ShieldCheck className="text-primary" size={24} />;
  };

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-black/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3">
              <BrandLogo />
              <span className="hidden sm:inline font-black tracking-tighter text-white uppercase italic">Legis<span className="text-primary">Trac</span></span>
            </Link>

            <div className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-3 py-2 rounded-md text-[10px] font-black transition-all flex items-center gap-2 uppercase tracking-widest",
                    pathname === item.href ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-white"
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
                <Button variant="ghost" className="relative h-10 w-10 rounded-full border border-white/10 p-0 overflow-hidden">
                  <Avatar className="h-full w-full">
                    <AvatarFallback className="bg-primary/20 text-primary font-black text-xs">{(profile as any)?.nome?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 bg-black border-white/10 shadow-2xl" align="end">
                <DropdownMenuItem onClick={() => router.push("/usuarios")} className="p-3 font-bold uppercase text-[10px] tracking-widest">Equipe</DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/gabinete")} className="p-3 font-bold uppercase text-[10px] tracking-widest">Configurações</DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem onClick={handleLogout} className="p-3 text-destructive font-bold uppercase text-[10px] tracking-widest">Sair</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>
    </>
  );
}
