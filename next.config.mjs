import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
};

// Sem SENTRY_ORG/SENTRY_PROJECT/SENTRY_AUTH_TOKEN nas env vars, o plugin só
// pula a etapa de upload de sourcemap (com um aviso) — não quebra o build.
// Preencher essas três quando a conta em sentry.io existir (Issue #5).
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
  webpack: {
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: false,
  },
});
