/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as alerts from "../alerts.js";
import type * as auth from "../auth.js";
import type * as batteries from "../batteries.js";
import type * as capture from "../capture.js";
import type * as config from "../config.js";
import type * as events from "../events.js";
import type * as http from "../http.js";
import type * as matches from "../matches.js";
import type * as robots from "../robots.js";
import type * as sessions from "../sessions.js";
import type * as subsystems from "../subsystems.js";
import type * as tba from "../tba.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  alerts: typeof alerts;
  auth: typeof auth;
  batteries: typeof batteries;
  capture: typeof capture;
  config: typeof config;
  events: typeof events;
  http: typeof http;
  matches: typeof matches;
  robots: typeof robots;
  sessions: typeof sessions;
  subsystems: typeof subsystems;
  tba: typeof tba;
  users: typeof users;
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
