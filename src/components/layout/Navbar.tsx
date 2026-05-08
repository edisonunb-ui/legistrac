
"use client";

import { useUser, useFirestore, useAuthInstance, useDoc, useCollection } from "@/firebase";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, ListTodo, Users, Target, PhoneIncoming, Building2, ShieldCheck } from "lucide-react";
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
import { useMemo } from "react";
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
    { label: "Lideranças", icon: Users, href: "/liderancas" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="p-1.5 bg-primary rounded text-primary-foreground">
              <Target size={20} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-lg font-bold tracking-tight">GESTOR<span className="text-primary">2026</span></span>
              <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">
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
                  "px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
                  pathname === item.href ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                )}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full border border-primary/20">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {(profile as any)?.nome?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{(profile as any)?.nome}</p>
                  <p className="text-xs text-muted-foreground">{(profile as any)?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/usuarios")}>
                Equipe do Gabinete
              </DropdownMenuItem>
              {isSuperAdmin && (
                <DropdownMenuItem onClick={() => router.push("/gabinetes")} className="text-primary font-bold">
                  <Building2 size={14} className="mr-2" /> Gabinetes Isolados
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut size={14} className="mr-2" /> Sair do Sistema
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
