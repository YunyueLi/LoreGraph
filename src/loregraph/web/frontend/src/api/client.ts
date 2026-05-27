import { useQuery } from "@tanstack/react-query";
import type {
  BookSummary,
  ChunkDetail,
  EntityDetail,
  GraphResponse,
} from "../types";
import {
  DEMO_BOOKS,
  DEMO_GRAPH,
  demoChunkDetail,
  demoEntityDetail,
} from "../demo/fixture";

// Demo mode (GitHub Pages landing page): when VITE_DEMO_MODE=1 the app
// serves the bundled Pride-and-Prejudice fixture instead of hitting a
// backend, so the whole UI is explorable with no server at all.
const DEMO: boolean = import.meta.env.VITE_DEMO_MODE === "1";

// In dev: Vite proxies /api to localhost:8000.
// In production: VITE_API_BASE points at the deployed FastAPI host
// (e.g. "https://loregraph-api.onrender.com"). If unset, calls go to
// the same origin — works for the all-in-one `loregraph view` setup.
const API_BASE: string = import.meta.env.VITE_API_BASE ?? "";

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} on ${path}`);
  }
  return response.json() as Promise<T>;
}

export function useBooks() {
  return useQuery<BookSummary[]>({
    queryKey: ["books"],
    queryFn: DEMO
      ? async () => DEMO_BOOKS
      : () => fetchJson<BookSummary[]>("/api/books"),
  });
}

export function useBookGraph(bookId: number | null) {
  return useQuery<GraphResponse>({
    queryKey: ["book-graph", bookId],
    queryFn: DEMO
      ? async () => DEMO_GRAPH
      : () => fetchJson<GraphResponse>(`/api/books/${bookId}/graph`),
    enabled: bookId !== null,
  });
}

export function useEntityDetail(entityDbId: number | null) {
  return useQuery<EntityDetail>({
    queryKey: ["entity", entityDbId],
    queryFn: DEMO
      ? async () => demoEntityDetail(entityDbId as number)
      : () => fetchJson<EntityDetail>(`/api/entities/${entityDbId}`),
    enabled: entityDbId !== null,
  });
}

export function useChunkDetail(chunkId: number | null) {
  return useQuery<ChunkDetail>({
    queryKey: ["chunk", chunkId],
    queryFn: DEMO
      ? async () => demoChunkDetail(chunkId as number)
      : () => fetchJson<ChunkDetail>(`/api/chunks/${chunkId}`),
    enabled: chunkId !== null,
  });
}
