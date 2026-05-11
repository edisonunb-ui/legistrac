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
  
  const lastSerializedData = useRef<string>('');
  const activePathRef = useRef<string | null>(null);

  useEffect(() => {
    const currentPath = ref?.path || null;

    if (!ref || !currentPath) {
      if (data !== null) setData(null);
      return;
    }

    if (currentPath === activePathRef.current) return;
    activePathRef.current = currentPath;
    
    setLoading(true);

    const unsubscribe = onSnapshot(
      ref,
      (snapshot: DocumentSnapshot<T>) => {
        const docData = snapshot.exists() 
          ? ({ ...snapshot.data()!, id: snapshot.id } as T & { id: string }) 
          : null;
        
        const serialized = JSON.stringify(docData);
        if (serialized !== lastSerializedData.current) {
          lastSerializedData.current = serialized;
          setData(docData);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Firestore useDoc error:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [ref]);

  return { data, loading, error };
}
