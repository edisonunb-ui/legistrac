
'use client';

import { useEffect, useRef } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, doc, updateDoc, orderBy, limit } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Notification as NotificationType } from '@/lib/types';

export function NotificationListener() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const lastNotifId = useRef<string | null>(null);

  const notifQuery = (db && user) 
    ? query(
        collection(db, "notificacoes"), 
        where("userId", "==", user.uid),
        where("lida", "==", false),
        orderBy("data", "desc"),
        limit(1)
      ) 
    : null;

  const { data: notifications } = useCollection<NotificationType>(notifQuery);

  useEffect(() => {
    // Solicitar permissão de notificação no carregamento se ainda não tiver
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  useEffect(() => {
    if (notifications && notifications.length > 0) {
      const notif = notifications[0];

      // Evitar disparar a mesma notificação múltiplas vezes
      if (notif.id === lastNotifId.current) return;
      lastNotifId.current = notif.id;

      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const n = new window.Notification('LegisTrac: Nova Atualização', {
          body: notif.mensagem,
          icon: '/favicon.ico', // Ou um ícone de alerta
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
      }
    }
  }, [notifications, db, router]);

  return null; // Componente invisível
}
