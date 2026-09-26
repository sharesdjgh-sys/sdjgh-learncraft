"use client";

import { useCallback, useEffect, useState } from "react";

/* 주제 카드·수업 화면·활동지에 넣은 AI 그림을 이 브라우저(IndexedDB)에 주제마다 한 장씩 저장합니다.
   그림은 한 장에 수 MB라 localStorage 대신 IndexedDB를 씁니다. 과목마다 데이터베이스를 따로 둡니다(profiles.ts의 storage.imageDatabase). */

const storeName = "topicImages";
type StoredImage = { topicId: string; image: string; updatedAt: number };

const databases = new Map<string, Promise<IDBDatabase>>();
function openDatabase(databaseName: string) {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("IndexedDB is unavailable"));
  if (!databases.has(databaseName)) databases.set(databaseName, new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.addEventListener("upgradeneeded", () => {
      if (!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName, { keyPath: "topicId" });
    });
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => { databases.delete(databaseName); reject(request.error ?? new Error("IndexedDB open failed")); }, { once: true });
  }));
  return databases.get(databaseName)!;
}
async function run<T>(databaseName: string, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await openDatabase(databaseName);
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const request = action(transaction.objectStore(storeName));
    transaction.addEventListener("complete", () => resolve(request.result), { once: true });
    transaction.addEventListener("abort", () => reject(transaction.error ?? new Error("IndexedDB transaction aborted")), { once: true });
    transaction.addEventListener("error", () => reject(transaction.error ?? new Error("IndexedDB transaction failed")), { once: true });
  });
}

export function useTopicImages(databaseName: string) {
  const [images, setImages] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    run(databaseName, "readonly", store => store.getAll() as IDBRequest<StoredImage[]>)
      .then(list => { if (alive) setImages(Object.fromEntries(list.filter(item => typeof item.image === "string").map(item => [item.topicId, item.image]))); })
      .catch(() => { /* 저장소를 쓸 수 없으면 이번 화면에서만 그림을 보여 줍니다. */ });
    return () => { alive = false; };
  }, [databaseName]);
  /** image가 null이면 그 주제의 그림을 뺍니다. */
  const save = useCallback(async (topicId: string, image: string | null) => {
    setImages(current => {
      const next = { ...current };
      if (image) next[topicId] = image;
      else delete next[topicId];
      return next;
    });
    try {
      if (image) await run(databaseName, "readwrite", store => store.put({ topicId, image, updatedAt: Date.now() } satisfies StoredImage));
      else await run(databaseName, "readwrite", store => store.delete(topicId));
      setError("");
    } catch {
      setError("브라우저에 그림을 저장하지 못했어요. 저장 공간을 확인해 주세요. 이번 화면에서는 계속 보여요.");
    }
  }, [databaseName]);
  return { images, save, error };
}
