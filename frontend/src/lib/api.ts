import { AuthToken } from "./auth"; // We will create this in Phase 1

const BASE_URL = "/api"; // Using the proxy

// Define a custom error class for API errors
export class ApiError extends Error {
  public status: number;
  public details: any;

  constructor(status: number, details: any, message?: string) {
    super(message || "An API error occurred");
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

// This function will be our single point of contact for all API calls
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = AuthToken.get(); // We'll implement this in Phase 1
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetails;
    try {
      errorDetails = await response.json();
    } catch (e) {
      errorDetails = { error: "Failed to parse error response." };
    }
    throw new ApiError(response.status, errorDetails, errorDetails.error);
  }

  // Handle cases with no response body (e.g., HTTP 204 No Content)
  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}

// We wrap the generic fetch in a client object for clean, typed usage
export const apiClient = {
  get: <T>(endpoint: string) => apiFetch<T>(endpoint, { method: "GET" }),

  post: <T, U>(endpoint:string, body: U) =>
    apiFetch<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  put: <T, U>(endpoint: string, body: U) =>
    apiFetch<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  delete: <T>(endpoint: string) => apiFetch<T>(endpoint, { method: "DELETE" }),
};