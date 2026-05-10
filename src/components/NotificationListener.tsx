'use client';

import { useEffect, useRef } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Notification as NotificationType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

export function NotificationListener() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const alertedIds = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const notifQuery = (db && user) 
    ? query(
        collection(db, "notificacoes"), 
        where("userId", "==", user.uid),
        where("lida", "==", false)
      ) 
    : null;

  const { data: notifications } = useCollection<NotificationType>(notifQuery);

  useEffect(() => {
    // Som de alerta tipo "Notificação de Sistema"
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
    audioRef.current.volume = 0.7;

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  useEffect(() => {
    if (notifications && notifications.length > 0) {
      notifications.forEach((notif) => {
        if (!notif.id || alertedIds.current.has(notif.id)) return;
        alertedIds.current.add(notif.id);

        if (audioRef.current) {
          audioRef.current.play().catch(e => console.warn("Áudio pendente de interação"));
        }

        // ALERTA VISUAL ESTABILIZADO (SEM PISCAR) E TAMANHO REDUZIDO
        toast({
          title: "🔔 NOVA ATUALIZAÇÃO",
          description: (
            <div className="flex flex-col gap-1 mt-1">
              <p className="text-sm font-bold leading-tight text-primary-foreground">
                {notif.mensagem}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-widest opacity-70">
                Toque para abrir a demanda
              </p>
            </div>
          ),
          className: "bg-primary border-primary-foreground/20 text-primary-foreground shadow-2xl transition-all",
          duration: 10000, 
          action: (
            <ToastAction 
              altText="Abrir Demanda"
              className="bg-black text-white hover:bg-black/80 font-bold border-none px-4 h-9"
              onClick={async () => {
                if (db && notif.id) {
                  await updateDoc(doc(db, "notificacoes", notif.id), { lida: true });
                }
                if (notif.demandaId) {
                  router.push(`/demandas/${notif.demandaId}`);
                }
              }}
            >
              ABRIR
            </ToastAction>
          ),
        });

        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            const n = new window.Notification('LegisTrac: Gabinete', {
              body: notif.mensagem,
              icon: '/favicon.ico',
            });
            n.onclick = async () => {
              window.focus();
              if (db && notif.id) {
                await updateDoc(doc(db, "notificacoes", notif.id), { lida: true });
              }
              if (notif.demandaId) {
                router.push(`/demandas/${notif.demandaId}`);
              }
            };
          } catch (e) {
            console.error(e);
          }
        }
      });
    }
  }, [notifications, db, router, toast]);

  return null;
}