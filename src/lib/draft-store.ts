// Session-persisted hand-off of the pending import draft between import, review and editor pages.
import { useSyncExternalStore } from "react";
import type { SongDraft } from "@/types";

interface DraftState {
  draft: SongDraft | null;
  /** When set, newly saved songs are added to this collection. */
  targetCollectionId: string | null;
}

const STORAGE_KEY = "otoyomi.pending-draft.v1";
const emptyState: DraftState = { draft: null, targetCollectionId: null };

function readState(): DraftState {
  if (typeof sessionStorage === "undefined") return emptyState;
  try {
    const value = JSON.parse(
      sessionStorage.getItem(STORAGE_KEY) ?? "null",
    ) as Partial<DraftState> | null;
    const draft = value?.draft;
    if (
      draft !== null &&
      draft !== undefined &&
      (typeof draft !== "object" || !Array.isArray(draft.lines))
    )
      return emptyState;
    return {
      draft: (draft ?? null) as SongDraft | null,
      targetCollectionId:
        typeof value?.targetCollectionId === "string" ? value.targetCollectionId : null,
    };
  } catch {
    return emptyState;
  }
}

function persist(value: DraftState) {
  if (typeof sessionStorage === "undefined") return;
  try {
    if (!value.draft && !value.targetCollectionId) sessionStorage.removeItem(STORAGE_KEY);
    else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // A full or disabled session store must not block editing.
  }
}

let state: DraftState = readState();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const update = (next: DraftState) => {
  state = next;
  persist(state);
  emit();
};

export const draftStore = {
  get: () => state,
  setDraft(draft: SongDraft | null) {
    update({ ...state, draft });
  },
  setTargetCollection(targetCollectionId: string | null) {
    update({ ...state, targetCollectionId });
  },
  clear() {
    update(emptyState);
  },
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useDraftState(): DraftState {
  return useSyncExternalStore(subscribe, draftStore.get, () => emptyState);
}
