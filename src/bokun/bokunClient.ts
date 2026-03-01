// src/bokun/bokunClient.ts
import crypto from "node:crypto";

export type BokunClientConfig = {
    baseUrl: string; // ex: https://api.bokun.io (ou sandbox https://api.bokuntest.com)
    accessKey: string;
    secretKey: string;
    timeoutMs?: number;
};

function formatBokunDateUTC(d = new Date()): string {
    // "yyyy-MM-dd HH:mm:ss" em UTC, conforme docs
    const pad = (n: number) => String(n).padStart(2, "0");
    return [
        d.getUTCFullYear(),
        "-",
        pad(d.getUTCMonth() + 1),
        "-",
        pad(d.getUTCDate()),
        " ",
        pad(d.getUTCHours()),
        ":",
        pad(d.getUTCMinutes()),
        ":",
        pad(d.getUTCSeconds()),
    ].join("");
}

/**
 * Assinatura:
 * string = date + accessKey + METHOD + pathWithQuery
 * HmacSHA1(secretKey, string) -> base64
 * (docs oficiais)
 */
function makeSignature(args: {
    date: string;
    accessKey: string;
    secretKey: string;
    method: string;
    pathWithQuery: string;
}): string {
    const input = `${args.date}${args.accessKey}${args.method.toUpperCase()}${args.pathWithQuery}`;
    const hmac = crypto.createHmac("sha1", args.secretKey);
    hmac.update(input, "utf8");
    return hmac.digest("base64");
}

export type BokunErrorInfo = {
    status: number;
    url: string;
    contentType: string;
    bodyPreview?: string;
};

export class BokunError extends Error {
    readonly info: BokunErrorInfo;

    constructor(message: string, info: BokunErrorInfo) {
        super(message);
        this.name = "BokunError";
        this.info = info;
    }
}

export class BokunClient {
    private cfg: Required<BokunClientConfig>;

    constructor(cfg: BokunClientConfig) {
        this.cfg = {
            ...cfg,
            timeoutMs: cfg.timeoutMs ?? 15_000,
        };
    }

    async request<T>(args: {
        method: "GET" | "POST";
        pathWithQuery: string; // /activity.json/search?lang=EN&currency=EUR  (somente path+query)
        body?: unknown;
    }): Promise<{ status: number; data: T; headers: Headers }> {
        const date = formatBokunDateUTC(new Date());
        const signature = makeSignature({
            date,
            accessKey: this.cfg.accessKey,
            secretKey: this.cfg.secretKey,
            method: args.method,
            pathWithQuery: args.pathWithQuery,
        });

        // URL final (base + path/query)
        const url = new URL(args.pathWithQuery, this.cfg.baseUrl);

        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), this.cfg.timeoutMs);

        try {
            const res = await fetch(url, {
                method: args.method,
                signal: controller.signal,
                headers: {
                    "X-Bokun-Date": date,
                    "X-Bokun-AccessKey": this.cfg.accessKey,
                    "X-Bokun-Signature": signature,
                    ...(args.body ? { "Content-Type": "application/json" } : {}),
                },
                body: args.body ? JSON.stringify(args.body) : undefined,
            });

            const contentType = res.headers.get("content-type") || "";
            const rawText = await res.text();

            // Tenta parsear JSON somente quando faz sentido
            let data: T = null as unknown as T;

            if (!rawText) {
                data = null as unknown as T;
            } else if (contentType.toLowerCase().includes("application/json")) {
                try {
                    data = JSON.parse(rawText) as T;
                } catch (e) {
                    const preview = rawText.slice(0, 400).replace(/\s+/g, " ").trim();
                    throw new BokunError("Bokun returned invalid JSON.", {
                        status: res.status,
                        url: url.toString(),
                        contentType,
                        bodyPreview: preview,
                    });
                }
            } else {
                // Resposta não-JSON (HTML, texto, etc.) -> diagnóstico explícito
                const preview = rawText.slice(0, 400).replace(/\s+/g, " ").trim();
                throw new BokunError("Bokun response was not JSON.", {
                    status: res.status,
                    url: url.toString(),
                    contentType,
                    bodyPreview: preview,
                });
            }

            // Se vier JSON mas com erro HTTP, ainda vale estourar (pra você ver o payload)
            if (!res.ok) {
                throw new BokunError("Bokun returned a non-2xx status.", {
                    status: res.status,
                    url: url.toString(),
                    contentType,
                    bodyPreview: rawText ? rawText.slice(0, 400).replace(/\s+/g, " ").trim() : "",
                });
            }

            return { status: res.status, data, headers: res.headers };
        } catch (err: any) {
            // Timeout/Abort com mensagem clara
            if (err?.name === "AbortError") {
                throw new BokunError("Bokun request timed out.", {
                    status: 0,
                    url: new URL(args.pathWithQuery, this.cfg.baseUrl).toString(),
                    contentType: "",
                });
            }
            throw err;
        } finally {
            clearTimeout(t);
        }
    }
}
