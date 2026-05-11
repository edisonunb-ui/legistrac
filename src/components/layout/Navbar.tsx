"use client";

import { useUser, useFirestore, useAuthInstance, useDoc } from "@/firebase";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, ListTodo, Users, Target, PhoneIncoming, Building2, Gavel, Menu, X } from "lucide-react";
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
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4 md:gap-8">
          {/* Mobile Menu Trigger */}
          <div className="md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                  <Menu size={24} />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0 border-r border-accent/20">
                <SheetHeader className="p-6 border-b text-left">
                  <SheetTitle className="flex items-center gap-2">
                    <div className="p-1 bg-firebase-gradient rounded">
                       <Target className="text-white" size={20} />
                    </div>
                    <span className="font-bold tracking-tight">GESTOR<span className="text-accent">2026</span></span>
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col py-4">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-6 py-4 text-sm font-bold transition-colors",
                        pathname === item.href 
                          ? "text-accent bg-accent/10 border-r-4 border-accent" 
                          : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <item.icon size={18} className={pathname === item.href ? "text-accent" : ""} />
                      {item.label}
                    </Link>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-1.5 bg-firebase-gradient rounded text-white shadow-lg shadow-accent/20 group-hover:scale-105 transition-transform">
              <Target size={20} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-lg font-black tracking-tighter">GESTOR<span className="text-accent">2026</span></span>
              <span className="text-[9px] text-accent/70 font-bold uppercase tracking-widest truncate max-w-[120px] sm:max-w-none">
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
                  "px-3 py-2 rounded-md text-sm font-bold transition-colors flex items-center gap-2",
                  pathname === item.href ? "text-accent bg-accent/10" : "text-muted-foreground hover:text-accent hover:bg-accent/5"
                )}
              >
                <item.icon size={16} className={cn(pathname === item.href ? "text-accent" : "text-muted-foreground")} />
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full border-2 border-accent/50 p-0 overflow-hidden hover:border-accent transition-colors">
                <Avatar className="h-full w-full">
                  <AvatarFallback className="bg-accent text-accent-foreground font-black">
                    {(profile as any)?.nome?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-card border-accent/20" align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-bold truncate">{(profile as any)?.nome}</p>
                  <p className="text-[10px] text-accent font-bold truncate uppercase">{(profile as any)?.perfil}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-accent/10" />
              <DropdownMenuItem onClick={() => router.push("/usuarios")} className="hover:bg-accent/10 focus:bg-accent/10">
                <Users size={14} className="mr-2 text-accent" /> Equipe do Gabinete
              </DropdownMenuItem>
              {isSuperAdmin && (
                <DropdownMenuItem onClick={() => router.push("/gabinetes")} className="text-accent font-bold hover:bg-accent/10 focus:bg-accent/10">
                  <Building2 size={14} className="mr-2" /> Gabinetes Isolados
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-accent/10" />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive hover:bg-destructive/10 focus:bg-destructive/10">
                <LogOut size={14} className="mr-2" /> Sair do Sistema
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}