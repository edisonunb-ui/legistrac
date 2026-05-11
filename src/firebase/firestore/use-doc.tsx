'use client';

import { useEffect, useState, useRef } from 'react';
import { 
  DocumentReference, 
  onSnapshot, 
  DocumentSnapshot, 
  DocumentData,
  FirestoreError
} from 'firebase/firestore';

export function useDoc<T = DocumentData>(ref: DocumentReference<T> | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);
  
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    const currentPath = ref?.path || null;

    if (!ref || !currentPath) {
      setData(null);
      setLoading(false);
      return;
    }

    // Se o caminho for o mesmo, não reiniciamos o listener
    if (lastPathRef.current === currentPath) {
      return;
    }

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    lastPathRef.current = currentPath;
    setLoading(true);

    const unsubscribe = onSnapshot(
      ref,
      (snapshot: DocumentSnapshot<T>) => {
        setData(snapshot.exists() ? ({ ...snapshot.data()!, id: snapshot.id } as T & { id: string }) : null);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching document:', err);
        setError(err);
        setLoading(false);
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      lastPathRef.current = null;
    };
  }, [ref]); // Estabilizado apenas pela referência

  return { data, loading, error };
}
