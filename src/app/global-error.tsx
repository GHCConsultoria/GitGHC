"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Só dispara se o erro acontecer no próprio layout raiz — por isso precisa
// ser um documento HTML completo, não um fragmento (substitui tudo).
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <main style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
          <p>Algo deu errado. Já fomos avisados — tenta recarregar a página.</p>
        </main>
      </body>
    </html>
  );
}
