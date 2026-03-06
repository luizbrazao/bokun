type AllowedEndpoint = {
  method: string;
  pathPattern: string;
};

const BOKUN_ALLOWED_ENDPOINTS: AllowedEndpoint[] = [
  // Activity discovery
  { method: "POST", pathPattern: "/activity.json/search" },
  { method: "GET", pathPattern: "/activity.json/{id}" },
  { method: "GET", pathPattern: "/activity.json/{id}/availabilities" },
  { method: "GET", pathPattern: "/activity.json/{id}/pickup-places" },
  // Shopping cart
  { method: "POST", pathPattern: "/shopping-cart.json/session/{sessionId}/activity" },
  { method: "GET", pathPattern: "/shopping-cart.json/session/{sessionId}" },
  // Booking questions
  { method: "GET", pathPattern: "/question.json/shopping-cart/{sessionId}" },
  { method: "POST", pathPattern: "/question.json/shopping-cart/{sessionId}" },
  { method: "GET", pathPattern: "/question.json/booking/{bookingId}" },
  { method: "GET", pathPattern: "/question.json/activity-booking/{activityBookingId}" },
  // Booking reserve & confirm
  { method: "POST", pathPattern: "/booking.json/guest/{sessionId}/reserve" },
  { method: "POST", pathPattern: "/booking.json/{confirmationCode}/confirm" },
  { method: "GET", pathPattern: "/booking.json/{confirmationCode}/abort-reserved" },
  { method: "GET", pathPattern: "/booking.json/booking/{confirmationCode}" },
  // Cancel booking
  { method: "POST", pathPattern: "/booking.json/cancel-booking/{confirmationCode}" },
];

function normalizeMethod(method: string): string {
  return method.trim().toUpperCase();
}

function normalizePath(inputPath: string): string {
  const raw = inputPath.trim();

  let pathname = raw;
  if (/^https?:\/\//i.test(raw)) {
    pathname = new URL(raw).pathname;
  } else {
    pathname = raw.split("?")[0].split("#")[0];
  }

  if (!pathname.startsWith("/")) {
    pathname = `/${pathname}`;
  }

  if (pathname.length > 1) {
    pathname = pathname.replace(/\/+$/, "");
  }

  return pathname;
}

function pathPatternToRegex(pathPattern: string): RegExp {
  const normalizedPattern = normalizePath(pathPattern);
  const segments = normalizedPattern.split("/").filter(Boolean);

  if (segments.length === 0) {
    return /^\/$/;
  }

  const regexSegments = segments.map((segment) => {
    if (/^\{[A-Za-z0-9_]+\}$/.test(segment)) {
      return "[^/]+";
    }

    return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  });

  return new RegExp(`^/${regexSegments.join("/")}$`);
}

export function assertBokunEndpointAllowed(method: string, path: string): void {
  const normalizedMethod = normalizeMethod(method);
  const normalizedPath = normalizePath(path);

  const allowed = BOKUN_ALLOWED_ENDPOINTS.some((entry) => {
    if (normalizeMethod(entry.method) !== normalizedMethod) {
      return false;
    }

    return pathPatternToRegex(entry.pathPattern).test(normalizedPath);
  });

  if (!allowed) {
    const allowedPatterns = BOKUN_ALLOWED_ENDPOINTS.map(
      (entry) => `${normalizeMethod(entry.method)} ${normalizePath(entry.pathPattern)}`
    ).join(", ");

    throw new Error(
      `Bokun endpoint not allowed. Requested: ${normalizedMethod} ${normalizedPath}. Allowed patterns: ${allowedPatterns}`
    );
  }
}

export { BOKUN_ALLOWED_ENDPOINTS };
