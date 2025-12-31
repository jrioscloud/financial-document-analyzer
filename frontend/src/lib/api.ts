/**
 * Financial Document Analyzer - API Client
 */

import { createClient } from "@/lib/supabase/client";

// In production, use relative paths (same origin) for Vercel serverless API
// In development, use NEXT_PUBLIC_API_URL to point to the separate FastAPI server
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

/**
 * Get auth headers with Supabase JWT token
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = createClient();

  // Try getSession first, then getUser as fallback
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.access_token) {
    return {
      "Authorization": `Bearer ${session.access_token}`,
    };
  }

  // If session is null, try to get a fresh session
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    console.error("Auth error:", error?.message || "No user found");
    throw new Error("Not authenticated - please log in again");
  }

  // Get session again after getUser (might have refreshed)
  const { data: { session: refreshedSession } } = await supabase.auth.getSession();

  if (!refreshedSession?.access_token) {
    throw new Error("Session expired - please log in again");
  }

  return {
    "Authorization": `Bearer ${refreshedSession.access_token}`,
  };
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  tools_used?: string[];
  created_at?: string;
}

export interface ChatResponse {
  answer: string;
  session_id: string;
  tools_used: string[];
}

export interface UploadResponse {
  transactions_count: number;
  status: string;
  filename: string;
}

export interface HealthResponse {
  status: string;
  version: string;
  environment: string;
}

export interface FileInfo {
  filename: string;
  count: number;
  date_range: {
    start: string;
    end: string;
  };
  source: string;
}

export interface StatsResponse {
  total_transactions: number;
  date_range: {
    start: string;
    end: string;
  } | null;
  categories: { name: string; count: number }[];
  sources: { name: string; count: number }[];
  files: FileInfo[];
  recent_transactions?: {
    date: string;
    description: string;
    amount: number;
    currency: string;
    category: string;
  }[];
  has_data: boolean;
}

export interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  amount_original?: number;
  currency: string;
  category?: string;
  type: string;
  source_bank: string;
  source_file?: string;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface TransactionFilters {
  search?: string;
  category?: string;
  source?: string;
  date_from?: string;
  date_to?: string;
}

/**
 * Send a message to the chat API
 */
export async function sendMessage(
  message: string,
  sessionId?: string
): Promise<ChatResponse> {
  const authHeaders = await getAuthHeaders();

  const response = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({
      message,
      session_id: sessionId,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to send message");
  }

  return response.json();
}

/**
 * Upload a CSV file
 */
export async function uploadFile(file: File): Promise<UploadResponse> {
  const authHeaders = await getAuthHeaders();

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/api/upload`, {
    method: "POST",
    headers: authHeaders,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to upload file");
  }

  return response.json();
}

/**
 * Get chat history for a session
 */
export async function getHistory(
  sessionId: string
): Promise<{ messages: ChatMessage[]; session_id: string }> {
  const response = await fetch(`${API_BASE}/api/history/${sessionId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to get history");
  }

  return response.json();
}

/**
 * Check API health
 */
export async function checkHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE}/api/health`);

  if (!response.ok) {
    throw new Error("API is not healthy");
  }

  return response.json();
}

/**
 * Get statistics about available data
 */
export async function getStats(): Promise<StatsResponse> {
  const authHeaders = await getAuthHeaders();

  const response = await fetch(`${API_BASE}/api/stats`, {
    headers: authHeaders,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to get stats");
  }

  return response.json();
}

/**
 * Get paginated list of transactions with optional filtering
 */
export async function getTransactions(
  page: number = 1,
  limit: number = 50,
  filters: TransactionFilters = {}
): Promise<TransactionsResponse> {
  const authHeaders = await getAuthHeaders();

  const params = new URLSearchParams();
  params.set("page", page.toString());
  params.set("limit", limit.toString());

  if (filters.search) params.set("search", filters.search);
  if (filters.category) params.set("category", filters.category);
  if (filters.source) params.set("source", filters.source);
  if (filters.date_from) params.set("date_from", filters.date_from);
  if (filters.date_to) params.set("date_to", filters.date_to);

  const response = await fetch(`${API_BASE}/api/transactions?${params}`, {
    headers: authHeaders,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to get transactions");
  }

  return response.json();
}
