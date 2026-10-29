import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getStorage } from "@/storage/library";

export const libraryKeys = {
  songs: ["songs"] as const,
  song: (id: string) => ["song", id] as const,
  collections: ["collections"] as const,
  collection: (id: string) => ["collection", id] as const,
};

export function useSongs() {
  return useQuery({ queryKey: libraryKeys.songs, queryFn: () => getStorage().listSongs() });
}

export function useSong(id: string | undefined) {
  return useQuery({
    queryKey: libraryKeys.song(id ?? ""),
    queryFn: async () => (await getStorage().getSong(id ?? "")) ?? null,
    enabled: !!id,
  });
}

export function useCollections() {
  return useQuery({
    queryKey: libraryKeys.collections,
    queryFn: async () =>
      (await getStorage().listCollections()).sort((a, b) => b.updatedAt - a.updatedAt),
  });
}

export function useCollection(id: string) {
  return useQuery({
    queryKey: libraryKeys.collection(id),
    queryFn: async () => (await getStorage().getCollection(id)) ?? null,
  });
}

export function useInvalidateLibrary() {
  const qc = useQueryClient();
  return () =>
    qc.invalidateQueries({
      predicate: (q) =>
        ["songs", "song", "collections", "collection"].includes(String(q.queryKey[0])),
    });
}

/** Resolve an asset Blob to an ObjectURL; revoked when the id changes or the component unmounts. */
export function useAssetUrl(assetId: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!assetId) {
      setUrl(null);
      return;
    }
    let objectUrl: string | null = null;
    let cancelled = false;
    void getStorage()
      .getAsset(assetId)
      .then((asset) => {
        if (cancelled || !asset) return;
        objectUrl = URL.createObjectURL(asset.blob);
        setUrl(objectUrl);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl(null);
    };
  }, [assetId]);
  return url;
}
