"use client";

import { useAuth } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import { Bell, LogOut, User, Menu, Home, ListTodo, PlusCircle, PieChart } from "lucide-react";
import { auth, db } from "@/lib/firebase";
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
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, updateDoc, doc, orderBy } from "firebase/firestore";
import { Notification } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { profile, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadCount = notifications.filter((n) => !n.lida).length;

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "notificacoes"),
      where("userId", "==", user.uid),
      orderBy("data", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notes = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Notification));
      setNotifications(notes);
    });
    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const markAsRead = async (note: Notification) => {
    if (!note.lida) {
      await updateDoc(doc(db, "notificacoes", note.id), { lida: true });
    }
    router.push(`/demandas/${note.demandaId}`);
  };

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
                  notifications.map((note) => (
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
              <Button variant="outline" className="flex items-center gap-2 px-3">
                <User size={18} />
                <span className="hidden sm:inline-block max-w-[100px] truncate">{profile?.nome || "Usuário"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <p className="font-semibold">{profile?.nome}</p>
                <p className="text-xs text-muted-foreground font-normal">{profile?.email}</p>
                <Badge variant="secondary" className="mt-2 text-[10px]">{profile?.perfil}</Badge>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
                <LogOut size={16} className="mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}