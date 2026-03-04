import { createRequire } from "node:module";

type ConvexHttpClientLike = {
  query: (name: string, args?: Record<string, unknown>) => Promise<unknown>;
  mutation: (name: string, args?: Record<string, unknown>) => Promise<unknown>;
  action: (name: string, args?: Record<string, unknown>) => Promise<unknown>;
};

type ConvexHttpClientCtor = new (url: string) => ConvexHttpClientLike;

let cachedCtor: ConvexHttpClientCtor | null = null;
let cachedClient: ConvexHttpClientLike | null = null;

function getConvexHttpClientClass(): ConvexHttpClientCtor {
  if (cachedCtor) return cachedCtor;

  const require = createRequire(import.meta.url);

  try {
    const mod = require("convex/browser") as { ConvexHttpClient?: ConvexHttpClientCtor };
    const Ctor = mod.ConvexHttpClient;

    if (!Ctor) {
      throw new Error("convex/browser does not export ConvexHttpClient.");
    }

    cachedCtor = Ctor;
    return Ctor;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to load "convex/browser". Ensure the "convex" package is installed. Original error: ${msg}`
    );
  }
}

export function getConvexClient(): ConvexHttpClientLike {
  if (cachedClient) return cachedClient;

  const convexUrl = process.env.CONVEX_URL;
  if (!convexUrl || convexUrl.trim().length === 0) {
    throw new Error(
      "Missing CONVEX_URL. Load your .env.local (e.g. DOTENV_CONFIG_PATH=.env.local) or set CONVEX_URL explicitly."
    );
  }

  const ClientClass = getConvexHttpClientClass();
  cachedClient = new ClientClass(convexUrl);
  return cachedClient;
}

export function getConvexServiceToken(): string {
  const token = process.env.CONVEX_SERVICE_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "Missing CONVEX_SERVICE_TOKEN. Set the same token in Node backend and Convex environment."
    );
  }
  return token;
}
