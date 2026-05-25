import { useQuery } from "@tanstack/react-query";
import type {
  BookSummary,
  ChunkDetail,
  EntityDetail,
  GraphResponse,
} from "../types";

const API_BASE = ""; // same-origin in production; Vite proxy in dev

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
    queryFn: () => fetchJson<BookSummary[]>("/api/books"),
  });
}

export function useBookGraph(bookId: number | null) {
  return useQuery<GraphResponse>({
    queryKey: ["book-graph", bookId],
    queryFn: () => fetchJson<GraphResponse>(`/api/books/${bookId}/graph`),
    enabled: bookId !== null,
  });
}

export function useEntityDetail(entityDbId: number | null) {
  return useQuery<EntityDetail>({
    queryKey: ["entity", entityDbId],
    queryFn: () => fetchJson<EntityDetail>(`/api/entities/${entityDbId}`),
    enabled: entityDbId !== null,
  });
}

export function useChunkDetail(chunkId: number | null) {
  return useQuery<ChunkDetail>({
    queryKey: ["chunk", chunkId],
    queryFn: () => fetchJson<ChunkDetail>(`/api/chunks/${chunkId}`),
    enabled: chunkId !== null,
  });
}
