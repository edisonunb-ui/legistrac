"use client";

import { useUser, useFirestore, useAuthInstance, useDoc } from "@/firebase";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, ListTodo, Users, Target, PhoneIncoming, Building2, Gavel, Menu, X, User } from "lucide-react";
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
import { useMemo, useState } from "react";
import { doc } from "firebase/firestore";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuthInstance();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const userEmail = user?.email?.toLowerCase().trim();
  const userProfileQuery = useMemo(() => (db && userEmail) ? doc(db, "users", userEmail) : null, [db, userEmail]);
  const { data: profile } = useDoc(userProfileQuery);

  const cabinetId = (profile as any)?.cabinetId;
  const cabinetQuery = useMemo(() => (db && cabinetId) ? doc(db, "gabinetes", cabinetId) : null, [db, cabinetId]);
  const { data: cabinet } = useDoc(cabinetQuery);

  const isSuperAdmin = userEmail === "edisonunb@gmail.com";

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push("/login");
  };

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/" },
    { label: "Atendimentos", icon: PhoneIncoming, href: "/atendimentos" },
    { label: "Demandas", icon: ListTodo, href: "/demandas" },
    { label: "Legislativo", icon: Gavel, href: "/legislativo" },
    { label: "Lideranças", icon: Users, href: "/liderancas" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-2 sm:px-0">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-8">
          {/* Mobile Menu Trigger */}
          <div className="md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-slate-900 h-10 w-10">
                  <Menu size={20} />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] p-0 border-r border-slate-800 bg-slate-950">
                <SheetHeader className="p-6 border-b border-slate-800 text-left bg-slate-900/50">
                  <SheetTitle className="flex items-center gap-3">
                    <div className="p-2 bg-slate-800 rounded-lg border border-slate-700 shadow-inner">
                       <Target className="text-slate-200" size={20} />
                    </div>
                    <div className="flex flex-col leading-none">
                      <span className="font-black tracking-tight text-foreground uppercase">Legis<span className="text-slate-400">Trac</span></span>
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
                          ? "text-primary bg-slate-900 border-l-4 border-primary" 
                          : "text-muted-foreground hover:bg-slate-900/50 hover:text-foreground"
                      )}
                    >
                      <item.icon size={18} className={pathname === item.href ? "text-primary" : ""} />
                      {item.label}
                    </Link>
                  ))}
                  <div className="pt-6 px-6 mt-6 border-t border-slate-900">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Configurações</p>
                    <Link 
                      href="/usuarios" 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-4 py-3 text-sm font-bold text-muted-foreground hover:text-foreground uppercase tracking-widest"
                    >
                      <Users size={18} /> Equipe
                    </Link>
                    <button 
                      onClick={handleLogout}
                      className="flex items-center gap-4 py-3 text-sm font-bold text-destructive hover:text-destructive/80 uppercase tracking-widest mt-2"
                    >
                      <LogOut size={18} /> Sair
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-1.5 bg-slate-800 rounded-md text-slate-200 border border-slate-700 shadow-sm">
              <Target size={18} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-base sm:text-lg font-black tracking-tighter text-foreground uppercase">Legis<span className="text-slate-400">Trac</span></span>
              <span className="text-[8px] sm:text-[9px] text-muted-foreground font-bold uppercase tracking-widest truncate max-w-[100px] sm:max-w-none">
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
                  "px-3 py-2 rounded-md text-[11px] font-black transition-colors flex items-center gap-2 uppercase tracking-widest",
                  pathname === item.href ? "text-primary bg-slate-900" : "text-muted-foreground hover:text-foreground hover:bg-slate-900"
                )}
              >
                <item.icon size={13} />
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full border border-slate-800 p-0 overflow-hidden hover:bg-slate-900 transition-all focus-visible:ring-0">
                <Avatar className="h-full w-full">
                  <AvatarFallback className="bg-slate-900 text-primary font-black text-xs">
                    {(profile as any)?.nome?.[0]?.toUpperCase() || <User size={16} />}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 bg-slate-950 border-slate-800 shadow-2xl" align="end">
              <DropdownMenuLabel className="p-4 bg-slate-900/50">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-black text-foreground truncate uppercase">{(profile as any)?.nome}</p>
                  <p className="text-[9px] text-muted-foreground font-black truncate uppercase tracking-widest">{(profile as any)?.perfil}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-800" />
              <DropdownMenuItem onClick={() => router.push("/usuarios")} className="p-3 hover:bg-slate-900 cursor-pointer font-bold uppercase text-[10px] tracking-widest">
                <Users size={14} className="mr-3 text-primary" /> Equipe do Gabinete
              </DropdownMenuItem>
              {isSuperAdmin && (
                <DropdownMenuItem onClick={() => router.push("/gabinetes")} className="p-3 hover:bg-slate-900 cursor-pointer font-bold uppercase text-[10px] tracking-widest">
                  <Building2 size={14} className="mr-3 text-primary" /> Gabinetes Isolados
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-slate-800" />
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