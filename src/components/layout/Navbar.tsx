
"use client";

import { useUser, useFirestore, useAuthInstance } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Bell, LogOut, User, Home, ListTodo, PlusCircle, PieChart, Users } from "lucide-react";
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
import { useEffect, useState, useMemo } from "react";
import { collection, query, where, updateDoc, doc, orderBy } from "firebase/firestore";
import { Notification, UserProfile } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useCollection, useDoc } from "@/firebase";

export function Navbar() {
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuthInstance();
  const router = useRouter();
  const pathname = usePathname();

  const userProfileQuery = useMemo(() => {
    if (!db || !user) return null;
    return doc(db, "users", user.uid);
  }, [db, user]);
  const { data: profile } = useDoc(userProfileQuery);

  const notificationsQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "notificacoes"),
      where("userId", "==", user.uid),
      orderBy("data", "desc")
    );
  }, [db, user]);
  const { data: notifications = [] } = useCollection(notificationsQuery);

  const unreadCount = notifications.filter((n: Notification) => !n.lida).length;

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push("/login");
  };

  const markAsRead = async (note: Notification) => {
    if (!db) return;
    if (!note.lida) {
      await updateDoc(doc(db, "notificacoes", note.id), { lida: true });
    }
    router.push(`/demandas/${note.demandaId}`);
  };

  const isAdmin = (profile as any)?.perfil === "ADMIN";

  const navItems = [
    { label: "Início", icon: Home, href: "/" },
    { label: "Demandas", icon: ListTodo, href: "/demandas" },
    { label: "Nova Demanda", icon: PlusCircle, href: "/demandas/new" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-1.5 bg-primary rounded-lg text-primary-foreground">
              <PieChart size={20} />
            </div>
            <span className="text-xl font-headline font-bold text-primary">LegisTrac</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 hover:bg-accent/10 hover:text-accent",
                  pathname === item.href ? "text-primary bg-primary/5" : "text-muted-foreground"
                )}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/usuarios"
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 hover:bg-accent/10 hover:text-accent",
                  pathname === "/usuarios" ? "text-primary bg-primary/5" : "text-muted-foreground"
                )}
              >
                <Users size={16} />
                Equipe
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell size={20} />
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 px-1 min-w-[1.2rem] h-5 flex items-center justify-center text-[10px]">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden">
              <div className="p-3 border-b bg-muted/30">
                <h3 className="font-semibold text-sm">Notificações</h3>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    Nenhuma notificação por aqui.
                  </div>
                ) : (
                  notifications.map((note: Notification) => (
                    <div
                      key={note.id}
                      onClick={() => markAsRead(note)}
                      className={cn(
                        "p-4 border-b cursor-pointer transition-colors hover:bg-muted/50",
                        !note.lida && "bg-primary/5 border-l-2 border-l-primary"
                      )}
                    >
                      <p className={cn("text-sm", !note.lida && "font-medium")}>{note.mensagem}</p>
                      <span className="text-[10px] text-muted-foreground mt-1 block">
                        {note.data?.toDate().toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={(profile as any)?.photoURL || ""} alt={(profile as any)?.nome || ""} />
                  <AvatarFallback>{(profile as any)?.nome?.[0] || <User />}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{(profile as any)?.nome}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {(profile as any)?.email}
                  </p>
                  <Badge variant="secondary" className="mt-2 text-[10px] w-fit">{(profile as any)?.perfil}</Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isAdmin && (
                <DropdownMenuItem onClick={() => router.push("/usuarios")}>
                  <Users className="mr-2 h-4 w-4" />
                  <span>Gerenciar Equipe</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
