/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminBootstrap from "../adminBootstrap.js";
import type * as auditLog from "../auditLog.js";
import type * as auth from "../auth.js";
import type * as authMaintenance from "../authMaintenance.js";
import type * as bokunInstallations from "../bokunInstallations.js";
import type * as bookingDrafts from "../bookingDrafts.js";
import type * as bookings from "../bookings.js";
import type * as chatMessages from "../chatMessages.js";
import type * as cleanup from "../cleanup.js";
import type * as conversations from "../conversations.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as dashboardStats from "../dashboardStats.js";
import type * as dedup from "../dedup.js";
import type * as failedWebhooks from "../failedWebhooks.js";
import type * as http from "../http.js";
import type * as oauthStates from "../oauthStates.js";
import type * as operatorInbox from "../operatorInbox.js";
import type * as ping from "../ping.js";
import type * as providerInstallations from "../providerInstallations.js";
import type * as serviceAuth from "../serviceAuth.js";
import type * as stripeDedup from "../stripeDedup.js";
import type * as subscriptions from "../subscriptions.js";
import type * as telegramActions from "../telegramActions.js";
import type * as telegramChannels from "../telegramChannels.js";
import type * as tenants from "../tenants.js";
import type * as userTenants from "../userTenants.js";
import type * as whatsappChannels from "../whatsappChannels.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminBootstrap: typeof adminBootstrap;
  auditLog: typeof auditLog;
  auth: typeof auth;
  authMaintenance: typeof authMaintenance;
  bokunInstallations: typeof bokunInstallations;
  bookingDrafts: typeof bookingDrafts;
  bookings: typeof bookings;
  chatMessages: typeof chatMessages;
  cleanup: typeof cleanup;
  conversations: typeof conversations;
  crons: typeof crons;
  dashboard: typeof dashboard;
  dashboardStats: typeof dashboardStats;
  dedup: typeof dedup;
  failedWebhooks: typeof failedWebhooks;
  http: typeof http;
  oauthStates: typeof oauthStates;
  operatorInbox: typeof operatorInbox;
  ping: typeof ping;
  providerInstallations: typeof providerInstallations;
  serviceAuth: typeof serviceAuth;
  stripeDedup: typeof stripeDedup;
  subscriptions: typeof subscriptions;
  telegramActions: typeof telegramActions;
  telegramChannels: typeof telegramChannels;
  tenants: typeof tenants;
  userTenants: typeof userTenants;
  whatsappChannels: typeof whatsappChannels;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
