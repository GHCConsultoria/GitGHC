import * as Sentry from "@sentry/nextjs";

// Sem NEXT_PUBLIC_SENTRY_DSN, o SDK simplesmente não manda nada — fica
// pronto pra ligar assim que a conta em sentry.io existir (ver Issue #5).
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
