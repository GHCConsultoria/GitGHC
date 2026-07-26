export interface ParametrosEmail {
  para: string;
  assunto: string;
  corpo: string;
}

export interface EmailSender {
  enviar(params: ParametrosEmail): Promise<void>;
}

/** Fallback de desenvolvimento: só loga, não envia nada de verdade. Usado enquanto RESEND_API_KEY não está configurado. */
export class ConsoleEmailSender implements EmailSender {
  async enviar({ para, assunto, corpo }: ParametrosEmail): Promise<void> {
    console.log(`[email:dev] para=${para} assunto="${assunto}"\n${corpo}`);
  }
}

/** Envia de verdade via API do Resend (https://resend.com/docs/api-reference/emails/send-email). */
export class ResendEmailSender implements EmailSender {
  constructor(
    private readonly apiKey: string,
    private readonly remetente: string,
  ) {}

  async enviar({ para, assunto, corpo }: ParametrosEmail): Promise<void> {
    const resposta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: this.remetente, to: para, subject: assunto, text: corpo }),
    });
    if (!resposta.ok) {
      throw new Error(`Resend respondeu ${resposta.status} ao enviar e-mail para ${para}`);
    }
  }
}

/**
 * Escolhe o sender por variável de ambiente. Sem RESEND_API_KEY/RESEND_FROM_EMAIL
 * configurados (o caso deste ambiente de desenvolvimento), cai no fallback que
 * só loga — a rotina diária nunca falha por falta de configuração de e-mail.
 */
export function obterEmailSender(): EmailSender {
  const apiKey = process.env.RESEND_API_KEY;
  const remetente = process.env.RESEND_FROM_EMAIL;
  if (apiKey && remetente) {
    return new ResendEmailSender(apiKey, remetente);
  }
  return new ConsoleEmailSender();
}
