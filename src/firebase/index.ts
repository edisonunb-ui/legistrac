
"use client";

import { useEffect, useState } from "react";
import { 
  getFirestore, 
  doc, 
  onSnapshot, 
  collection, 
  Query, 
  DocumentReference,
  DocumentData,
  QuerySnapshot,
  DocumentSnapshot
} from "firebase/firestore";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { app } from "@/lib/firebase";

export const db = getFirestore(app);
export const auth = getAuth(app);

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { user, loading };
}

export function useFirestore() {
  return db;
}

export function useAuthInstance() {
  return auth;
}

export function useDoc<T = DocumentData>(ref: DocumentReference<T> | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!ref) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(ref, 
      (docSnap: DocumentSnapshot<T>) => {
        setData(docSnap.exists() ? { ...docSnap.data() as T, id: docSnap.id } : null);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [ref]);

  return { data, loading, error };
}

export function useCollection<T = DocumentData>(q: Query<T> | null) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!q) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(q, 
      (querySnapshot: QuerySnapshot<T>) => {
        const docs: T[] = [];
        querySnapshot.forEach((doc) => {
          docs.push({ ...doc.data() as T, id: doc.id });
        });
        setData(docs);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [q]);

  return { data, loading, error };
}
