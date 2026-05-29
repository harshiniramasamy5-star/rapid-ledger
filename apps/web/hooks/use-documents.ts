import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { RapidDocument } from "@rapid-ledger/shared";
import { DocumentStatus, RiskLevel } from "@rapid-ledger/shared";

export const DOCUMENTS_KEY = ["documents"] as const;

interface DocumentFilters {
  status?: DocumentStatus;
  riskLevel?: RiskLevel;
  department?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedDocuments {
  data: RapidDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function useDocuments(filters?: DocumentFilters) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.riskLevel) params.set("riskLevel", filters.riskLevel);
  if (filters?.department) params.set("department", filters.department);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));
  const query = params.toString();

  return useQuery({
    queryKey: [...DOCUMENTS_KEY, filters],
    queryFn: () => api.get<PaginatedDocuments>(`/documents${query ? `?${query}` : ""}`),
  });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: [...DOCUMENTS_KEY, id],
    queryFn: () => api.get<RapidDocument>(`/documents/${id}`),
    enabled: !!id,
  });
}

export function useCreateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<RapidDocument>) =>
      api.post<RapidDocument>("/documents", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: DOCUMENTS_KEY }),
  });
}

export function useSubmitDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/documents/${id}/submit`),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: DOCUMENTS_KEY });
      qc.invalidateQueries({ queryKey: [...DOCUMENTS_KEY, id] });
    },
  });
}

export function useFinalizeDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/documents/${id}/finalize`),
    onSuccess: () => qc.invalidateQueries({ queryKey: DOCUMENTS_KEY }),
  });
}
