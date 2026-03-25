import { assertBokunEndpointAllowed } from "./allowlist.ts";
import { createHmac } from "node:crypto";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type SignatureAuthConfig = {
  accessKey: string;
  secretKey: string;
};

export type BokunRequestOptions = {
  method: HttpMethod | string;
  baseUrl: string;
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
};

function normalizeRequestPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed.startsWith("/")) {
    return `/${trimmed}`;
  }
  return trimmed;
}

function hasJsonContentType(headers: Record<string, string>): boolean {
  return Object.entries(headers).some(
    ([key, value]) => key.toLowerCase() === "content-type" && value.toLowerCase().includes("application/json")
  );
}

function hasAuthorizationHeader(headers: Record<string, string>): boolean {
  return Object.keys(headers).some((key) => key.toLowerCase() === "authorization");
}

function getHeaderValue(headers: Record<string, string>, name: string): string | undefined {
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) {
      return value;
    }
  }
  return undefined;
}

function deleteHeader(headers: Record<string, string>, name: string): void {
  const target = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === target) {
      delete headers[key];
    }
  }
}

function formatBokunDateUTC(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return [
    date.getUTCFullYear(),
    "-",
    pad(date.getUTCMonth() + 1),
    "-",
    pad(date.getUTCDate()),
    " ",
    pad(date.getUTCHours()),
    ":",
    pad(date.getUTCMinutes()),
    ":",
    pad(date.getUTCSeconds()),
  ].join("");
}

function makeBokunSignature(args: {
  date: string;
  accessKey: string;
  secretKey: string;
  method: string;
  pathWithQuery: string;
}): string {
  const input = `${args.date}${args.accessKey}${args.method.toUpperCase()}${args.pathWithQuery}`;
  const hmac = createHmac("sha1", args.secretKey);
  hmac.update(input, "utf8");
  return hmac.digest("base64");
}

function resolveSignatureAuthFromHeaders(headers: Record<string, string>): SignatureAuthConfig | null {
  const accessKey = getHeaderValue(headers, "x-bokun-accesskey")?.trim();
  const secretKey = getHeaderValue(headers, "x-bokun-secretkey")?.trim();
  if (!accessKey || !secretKey) {
    return null;
  }
  return { accessKey, secretKey };
}

function resolveSignatureAuthFromEnv(): SignatureAuthConfig | null {
  const accessKey = process.env.BOKUN_ACCESS_KEY?.trim();
  const secretKey = process.env.BOKUN_SECRET_KEY?.trim();
  if (!accessKey || !secretKey) {
    return null;
  }
  return { accessKey, secretKey };
}

function applySignatureAuth(args: {
  headers: Record<string, string>;
  auth: SignatureAuthConfig;
  method: string;
  pathWithQuery: string;
}): Record<string, string> {
  const signed = { ...args.headers };
  // Normalize Bokun auth headers to a single canonical set.
  // This avoids duplicate case-variant headers (e.g., x-bokun-accesskey + X-Bokun-AccessKey)
  // that can be combined by HTTP clients and break auth.
  deleteHeader(signed, "x-bokun-date");
  deleteHeader(signed, "x-bokun-signature");
  deleteHeader(signed, "x-bokun-accesskey");
  const date = formatBokunDateUTC(new Date());
  const signature = makeBokunSignature({
    date,
    accessKey: args.auth.accessKey,
    secretKey: args.auth.secretKey,
    method: args.method,
    pathWithQuery: args.pathWithQuery,
  });

  deleteHeader(signed, "x-bokun-secretkey");
  signed["X-Bokun-Date"] = date;
  signed["X-Bokun-AccessKey"] = args.auth.accessKey;
  signed["X-Bokun-Signature"] = signature;
  return signed;
}

// Central Bokun HTTP client. This should be the single recommended path to call Bokun APIs.
export async function bokunRequest<T = unknown>({
  method,
  baseUrl,
  path,
  headers = {},
  body,
}: BokunRequestOptions): Promise<T> {
  const normalizedMethod = method.toUpperCase();
  const normalizedPath = normalizeRequestPath(path);

  assertBokunEndpointAllowed(normalizedMethod, normalizedPath);

  const url = new URL(normalizedPath, baseUrl);
  const baseHeaders = { ...headers };

  let payload: string | undefined;
  if (body !== undefined) {
    if (typeof body === "string") {
      payload = body;
    } else if (body instanceof URLSearchParams) {
      payload = body.toString();
      if (!getHeaderValue(baseHeaders, "content-type")) {
        baseHeaders["Content-Type"] = "application/x-www-form-urlencoded; charset=utf-8";
      }
    } else {
      if (!hasJsonContentType(baseHeaders)) {
        baseHeaders["Content-Type"] = "application/json";
      }
      payload = JSON.stringify(body);
    }
  }

  const headerSignatureAuth = resolveSignatureAuthFromHeaders(baseHeaders);
  const envSignatureAuth = resolveSignatureAuthFromEnv();

  let requestHeaders = { ...baseHeaders };
  if (headerSignatureAuth) {
    requestHeaders = applySignatureAuth({
      headers: requestHeaders,
      auth: headerSignatureAuth,
      method: normalizedMethod,
      pathWithQuery: `${url.pathname}${url.search}`,
    });
  } else if (!hasAuthorizationHeader(requestHeaders) && envSignatureAuth) {
    requestHeaders = applySignatureAuth({
      headers: requestHeaders,
      auth: envSignatureAuth,
      method: normalizedMethod,
      pathWithQuery: `${url.pathname}${url.search}`,
    });
  }

  let response = await fetch(url.toString(), {
    method: normalizedMethod,
    headers: requestHeaders,
    body: payload,
  });

  // Retry once with env signature auth if token-based auth fails.
  if (
    (response.status === 401 || response.status === 403) &&
    !headerSignatureAuth &&
    envSignatureAuth
  ) {
    console.warn(
      `[bokun-client] Auth fallback triggered: ${normalizedMethod} ${normalizedPath} returned ${response.status}. ` +
      `Retrying with HMAC signature auth. This may indicate an incorrect OAuth token header format.`
    );
    const fallbackHeaders = { ...baseHeaders };
    deleteHeader(fallbackHeaders, "authorization");
    const signedFallbackHeaders = applySignatureAuth({
      headers: fallbackHeaders,
      auth: envSignatureAuth,
      method: normalizedMethod,
      pathWithQuery: `${url.pathname}${url.search}`,
    });
    response = await fetch(url.toString(), {
      method: normalizedMethod,
      headers: signedFallbackHeaders,
      body: payload,
    });
  }

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Bokun request failed (${response.status} ${response.statusText}) for ${normalizedMethod} ${normalizedPath}: ${responseText}`
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}
