export interface ParametrosAlertaWhatsapp {
  paraTelefone: string;
  quantidade: number;
}

export interface WhatsappSender {
  enviarAlerta(params: ParametrosAlertaWhatsapp): Promise<void>;
}

/** Fallback: só loga, não envia nada de verdade. Usado enquanto a Cloud API do WhatsApp não está configurada. */
export class ConsoleWhatsappSender implements WhatsappSender {
  async enviarAlerta({ paraTelefone, quantidade }: ParametrosAlertaWhatsapp): Promise<void> {
    console.log(`[whatsapp:simulado] para=${paraTelefone} quantidade=${quantidade}`);
  }
}

/**
 * Envia de verdade via WhatsApp Cloud API da Meta
 * (https://developers.facebook.com/docs/whatsapp/cloud-api). Meta exige
 * mensagem de TEMPLATE pré-aprovado pra qualquer conversa iniciada pelo
 * negócio (não é possível mandar texto livre sem o cliente ter mandado
 * mensagem primeiro) — por isso o corpo aqui é só a contagem, encaixada na
 * única variável de um template com um parâmetro. O nome/idioma do template
 * são configuráveis porque dependem do que foi de fato aprovado na conta
 * Meta Business de quem for usar isto.
 */
export class MetaWhatsappSender implements WhatsappSender {
  constructor(
    private readonly token: string,
    private readonly phoneNumberId: string,
    private readonly nomeTemplate: string,
    private readonly idiomaTemplate: string,
  ) {}

  async enviarAlerta({ paraTelefone, quantidade }: ParametrosAlertaWhatsapp): Promise<void> {
    const resposta = await fetch(`https://graph.facebook.com/v20.0/${this.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: paraTelefone,
        type: "template",
        template: {
          name: this.nomeTemplate,
          language: { code: this.idiomaTemplate },
          components: [{ type: "body", parameters: [{ type: "text", text: String(quantidade) }] }],
        },
      }),
    });

    if (!resposta.ok) {
      const corpo = await resposta.text();
      throw new Error(`WhatsApp Cloud API respondeu ${resposta.status} ao enviar para ${paraTelefone}: ${corpo}`);
    }
  }
}

/**
 * Escolhe o sender por variável de ambiente — sem WHATSAPP_CLOUD_API_TOKEN/
 * WHATSAPP_PHONE_NUMBER_ID configurados, cai no fallback que só loga, do
 * mesmo jeito que obterEmailSender() faz pro Resend. A rotina diária nunca
 * falha por falta de configuração de WhatsApp.
 */
export function obterWhatsappSender(): WhatsappSender {
  const token = process.env.WHATSAPP_CLOUD_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (token && phoneNumberId) {
    const nomeTemplate = process.env.WHATSAPP_TEMPLATE_NAME || "alerta_prazo";
    const idiomaTemplate = process.env.WHATSAPP_TEMPLATE_IDIOMA || "pt_BR";
    return new MetaWhatsappSender(token, phoneNumberId, nomeTemplate, idiomaTemplate);
  }
  return new ConsoleWhatsappSender();
}
