
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

  // Consulta simplificada para evitar erros de índice composto no Firestore
  const notifQuery = (db && user) 
    ? query(
        collection(db, "notificacoes"), 
        where("userId", "==", user.uid),
        where("lida", "==", false)
      ) 
    : null;

  const { data: notifications } = useCollection<NotificationType>(notifQuery);

  useEffect(() => {
    // Solicitar permissão de notificação no carregamento
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  useEffect(() => {
    if (notifications && notifications.length > 0) {
      notifications.forEach((notif) => {
        // Evitar disparar o alerta mais de uma vez para o mesmo ID na mesma sessão
        if (!notif.id || alertedIds.current.has(notif.id)) return;
        alertedIds.current.add(notif.id);

        // 1. ALERTA INTERNO (Toast) - Aparece sempre que o sistema estiver aberto
        toast({
          title: "Nova Atualização",
          description: notif.mensagem,
          action: (
            <ToastAction 
              altText="Ver agora"
              onClick={async () => {
                if (db && notif.id) {
                  await updateDoc(doc(db, "notificacoes", notif.id), { lida: true });
                }
                if (notif.demandaId) {
                  router.push(`/demandas/${notif.demandaId}`);
                }
              }}
            >
              VER
            </ToastAction>
          ),
        });

        // 2. ALERTA NATIVO (Navegador) - Aparece mesmo com a aba em segundo plano
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            const n = new window.Notification('LegisTrac: Gabinete', {
              body: notif.mensagem,
              silent: false,
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
            console.error("Erro ao disparar notificação nativa", e);
          }
        }
      });
    }
  }, [notifications, db, router, toast]);

  return null;
}
