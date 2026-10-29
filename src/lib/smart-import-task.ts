import { useSyncExternalStore } from "react";

export type SmartImportStatus = "idle" | "loading" | "success" | "error";

export interface SmartImportTaskState {
  status: SmartImportStatus;
  error: string | null;
}

const idleState: SmartImportTaskState = { status: "idle", error: null };
let state = idleState;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());
const setState = (next: SmartImportTaskState) => {
  state = next;
  emit();
};

export const smartImportTask = {
  get: () => state,
  begin() {
    if (state.status === "loading") return false;
    setState({ status: "loading", error: null });
    return true;
  },
  succeed() {
    setState({ status: "success", error: null });
  },
  fail(error: string) {
    setState({ status: "error", error });
  },
  reset() {
    if (state.status !== "loading") setState(idleState);
  },
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useSmartImportTask(): SmartImportTaskState {
  return useSyncExternalStore(subscribe, smartImportTask.get, () => idleState);
}
