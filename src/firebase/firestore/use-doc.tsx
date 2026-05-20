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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<FirestoreError | null>(null);
  
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!ref) {
      setData(null);
      lastPath.current = null;
      setLoading(false);
      return;
    }

    const currentPath = ref.path;
    if (currentPath === lastPath.current) {
      return;
    }
    
    lastPath.current = currentPath;
    setLoading(true);

    const unsubscribe = onSnapshot(
      ref,
      (snapshot: DocumentSnapshot<T>) => {
        const docData = snapshot.exists() 
          ? ({ ...snapshot.data()!, id: snapshot.id } as T & { id: string }) 
          : null;
        
        setData(docData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        if (err.code !== 'permission-denied') {
          console.error("Firestore Doc Error:", err);
        }
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [ref]);

  return { data, loading, error };
}
