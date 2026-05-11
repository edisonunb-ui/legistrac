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
  
  const lastSerializedRef = useRef<string | null>(null);
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    const currentPath = ref?.path || null;

    if (!ref || !currentPath) {
      if (lastPathRef.current !== null) {
        setData(null);
        setLoading(false);
        setError(null);
        lastPathRef.current = null;
        lastSerializedRef.current = null;
      }
      return;
    }

    const unsubscribe = onSnapshot(
      ref,
      (snapshot: DocumentSnapshot<T>) => {
        const docData = snapshot.exists() 
          ? ({ ...snapshot.data()!, id: snapshot.id } as T & { id: string }) 
          : null;
        
        const serialized = JSON.stringify(docData);
        if (serialized !== lastSerializedRef.current || currentPath !== lastPathRef.current) {
          setData(docData);
          lastSerializedRef.current = serialized;
          lastPathRef.current = currentPath;
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Firestore useDoc error:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [ref]);

  return { data, loading, error };
}
