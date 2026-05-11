
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
  const [loading, setLoading] = useState(!!ref);
  const [error, setError] = useState<FirestoreError | null>(null);
  
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    const currentPath = ref?.path || null;

    if (!ref || !currentPath) {
      setData(prev => prev === null ? prev : null);
      setLoading(prev => !prev ? prev : false);
      lastPathRef.current = null;
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
    setLoading(prev => prev ? prev : true);

    const unsubscribe = onSnapshot(
      ref,
      (snapshot: DocumentSnapshot<T>) => {
        const docData = snapshot.exists() 
          ? ({ ...snapshot.data()!, id: snapshot.id } as T & { id: string }) 
          : null;
        
        setData(docData);
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
    };
  }, [ref]);

  return { data, loading, error };
}
