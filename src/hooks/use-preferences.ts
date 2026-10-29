import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { normalizeSettings, rulesFromOverrides, type AppSettings } from "@/core";
import { setPronunciationRules } from "@/lib/lyrics-engine";
import { getStorage } from "@/storage/library";

export const prefKeys = { settings: ["settings"] as const, dictionary: ["dictionary"] as const };

export function useSettings() {
  return useQuery({
    queryKey: prefKeys.settings,
    queryFn: async () => normalizeSettings(await getStorage().getSettings()),
  });
}

export function useSaveSettings() {
  const qc = useQueryClient();
  return async (next: AppSettings) => {
    const value = normalizeSettings(next);
    qc.setQueryData(prefKeys.settings, value);
    await getStorage().putSettings(value);
  };
}

export function useDictionary() {
  return useQuery({
    queryKey: prefKeys.dictionary,
    queryFn: async () =>
      (await getStorage().listPronunciationOverrides()).sort((a, b) =>
        a.romaji.localeCompare(b.romaji),
      ),
  });
}

/** Keeps the conversion engine in sync with the stored personal dictionary. Mount once. */
export function usePronunciationRulesSync() {
  const { data } = useDictionary();
  useEffect(() => {
    if (data) setPronunciationRules(rulesFromOverrides(data));
  }, [data]);
}
