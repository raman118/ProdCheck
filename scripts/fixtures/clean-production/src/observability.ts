import pino from "pino";
import * as Sentry from "@sentry/nextjs";

export const logger = pino();
Sentry.init({ dsn: process.env.SENTRY_DSN });
