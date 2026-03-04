export type LLMErrorCategory =
  | "dns"
  | "timeout"
  | "auth"
  | "rate_limit"
  | "network"
  | "api"
  | "config"
  | "unknown";

export type ClassifiedLLMError = {
  category: LLMErrorCategory;
  retryable: boolean;
  statusCode?: number;
  code?: string;
  message: string;
};

type ErrorLike = {
  message?: string;
  code?: string;
  status?: number;
  statusCode?: number;
  cause?: { code?: string; message?: string };
  error?: { code?: string; message?: string };
};

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

export function classifyLLMError(error: unknown): ClassifiedLLMError {
  const fallbackMessage = error instanceof Error ? error.message : String(error);
  const normalizedMessage = fallbackMessage.toLowerCase();
  const e = (error ?? {}) as ErrorLike;
  const statusCode = e.status ?? e.statusCode;
  const code = e.code ?? e.cause?.code ?? e.error?.code;
  const normalizedCode = code?.toLowerCase();

  if (
    includesAny(normalizedMessage, [
      "argumentvalidationerror",
      "does not match the table name in validator",
      "v.id(\"tenants\")",
      "missing openai_api_key",
      "missing convex_service_token",
      "not configured",
      "api key not set",
    ])
  ) {
    return { category: "config", retryable: false, statusCode, code, message: fallbackMessage };
  }

  if (statusCode === 401 || statusCode === 403) {
    return { category: "auth", retryable: false, statusCode, code, message: fallbackMessage };
  }
  if (statusCode === 429) {
    return { category: "rate_limit", retryable: true, statusCode, code, message: fallbackMessage };
  }
  if (typeof statusCode === "number" && statusCode >= 500) {
    return { category: "api", retryable: true, statusCode, code, message: fallbackMessage };
  }

  if (
    includesAny(normalizedCode ?? "", ["enotfound", "eai_again", "dns"]) ||
    includesAny(normalizedMessage, ["getaddrinfo", "dns"])
  ) {
    return { category: "dns", retryable: true, statusCode, code, message: fallbackMessage };
  }

  if (
    includesAny(normalizedCode ?? "", ["etimedout", "und_err_connect_timeout", "abort"]) ||
    includesAny(normalizedMessage, ["timeout", "timed out"])
  ) {
    return { category: "timeout", retryable: true, statusCode, code, message: fallbackMessage };
  }

  if (
    includesAny(normalizedCode ?? "", [
      "econnreset",
      "econnrefused",
      "enetunreach",
      "ehostunreach",
      "und_err_socket",
    ]) ||
    includesAny(normalizedMessage, ["fetch failed", "network", "socket hang up", "connection"])
  ) {
    return { category: "network", retryable: true, statusCode, code, message: fallbackMessage };
  }

  if (
    includesAny(normalizedMessage, [
      "invalid api key",
      "authentication",
      "unauthorized",
      "forbidden",
      "incorrect api key",
    ])
  ) {
    return { category: "auth", retryable: false, statusCode, code, message: fallbackMessage };
  }

  return { category: "unknown", retryable: false, statusCode, code, message: fallbackMessage };
}
