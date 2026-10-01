import type { EditOperation } from "./types";
import { MAX_HISTORY } from "./types";

export interface EditHistory {
  past: EditOperation[][];
  present: EditOperation[];
  future: EditOperation[][];
}

export function createHistory(initial: EditOperation[] = []): EditHistory {
  return { past: [], present: [...initial], future: [] };
}

export function pushHistory(
  history: EditHistory,
  operations: EditOperation[]
): EditHistory {
  const past = [...history.past, history.present].slice(-MAX_HISTORY);
  return {
    past,
    present: [...operations],
    future: [],
  };
}

export function undoHistory(history: EditHistory): EditHistory | null {
  if (history.past.length === 0) return null;
  const previous = history.past[history.past.length - 1];
  const past = history.past.slice(0, -1);
  return {
    past,
    present: [...previous],
    future: [history.present, ...history.future].slice(0, MAX_HISTORY),
  };
}

export function redoHistory(history: EditHistory): EditHistory | null {
  if (history.future.length === 0) return null;
  const next = history.future[0];
  const future = history.future.slice(1);
  return {
    past: [...history.past, history.present].slice(-MAX_HISTORY),
    present: [...next],
    future,
  };
}

export function resetHistory(): EditHistory {
  return createHistory([]);
}
