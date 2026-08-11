import * as Sentry from "@sentry/nextjs";

// DSN do Sentry não é segredo (só permite enviar evento, não ler dados) —
// por isso reaproveita a mesma env var pública usada no cliente.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,
});
