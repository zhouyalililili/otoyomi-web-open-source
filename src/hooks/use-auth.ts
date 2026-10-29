import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useSyncExternalStore } from "react";
import { authAdapter, quotaAdapter } from "@/config/services";
import type { AiQuota, AppSession } from "@/extensions/types";

export function useSession() {
  const [state, setState] = useState<{ session: AppSession | null; ready: boolean }>({
    session: null,
    ready: false,
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;
    const unsubscribe = authAdapter.subscribe((session) => {
      if (!active) return;
      setState({ session, ready: true });
      void queryClient.invalidateQueries({ queryKey: ["ai-quota"] });
    });
    void authAdapter
      .getSession()
      .then((session) => active && setState({ session, ready: true }))
      .catch(() => active && setState({ session: null, ready: true }));
    return () => {
      active = false;
      unsubscribe();
    };
  }, [queryClient]);

  return state;
}

export function useAiQuota(enabled: boolean) {
  return useQuery({
    queryKey: ["ai-quota"],
    enabled: enabled && quotaAdapter.configured,
    queryFn: (): Promise<AiQuota> => quotaAdapter.getQuota(),
  });
}

let loginOpen = false;
const listeners = new Set<() => void>();
export const loginDialog = {
  open() {
    loginOpen = true;
    listeners.forEach((listener) => listener());
  },
  set(value: boolean) {
    loginOpen = value;
    listeners.forEach((listener) => listener());
  },
};

export function useLoginDialogOpen() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => loginOpen,
    () => false,
  );
}
