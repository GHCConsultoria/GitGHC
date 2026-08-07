export interface ParametrosAlertaWhatsapp {
  paraTelefone: string;
  cliente: string;
  numeroCnj: string;
  tipoAto: string;
  dataFatal: string;
  acaoSugerida: string;
  /** Sufixo dinâmico do botão "Marcar como visto" — ver token-visto.ts. */
  tokenMarcarVisto: string;
}

export interface WhatsappSender {
  enviarAlerta(params: ParametrosAlertaWhatsapp): Promise<void>;
}

/** Fallback: só loga, não envia nada de verdade. Usado enquanto a Cloud API do WhatsApp não está configurada. */
export class ConsoleWhatsappSender implements WhatsappSender {
  async enviarAlerta(params: ParametrosAlertaWhatsapp): Promise<void> {
    console.log(
      `[whatsapp:simulado] para=${params.paraTelefone} cliente=${params.cliente} processo=${params.numeroCnj} ` +
        `tipoAto=${params.tipoAto} dataFatal=${params.dataFatal} acao="${params.acaoSugerida}"`,
    );
  }
}

/**
 * Envia de verdade via WhatsApp Cloud API da Meta
 * (https://developers.facebook.com/docs/whatsapp/cloud-api). Meta exige
 * mensagem de TEMPLATE pré-aprovado pra qualquer conversa iniciada pelo
 * negócio — o template referenciado por WHATSAPP_TEMPLATE_NAME precisa ser
 * cadastrado e aprovado no Meta Business Manager com:
 *   - corpo com 5 variáveis, nesta ordem: cliente, número do processo, tipo
 *     de ato, data fatal, ação sugerida;
 *   - botão 1 (índice 0), URL estática apontando para APP_URL — "Abrir
 *     sistema";
 *   - botão 2 (índice 1), URL dinâmica cuja base é
 *     "{APP_URL}/api/prazos/marcar-visto/" com uma variável de sufixo —
 *     "Marcar como visto".
 * Sem essa configuração feita manualmente na conta Meta (fora do alcance
 * desta API), o envio falha com um erro claro da própria Cloud API.
 */
export class MetaWhatsappSender implements WhatsappSender {
  constructor(
    private readonly token: string,
    private readonly phoneNumberId: string,
    private readonly nomeTemplate: string,
    private readonly idiomaTemplate: string,
  ) {}

  async enviarAlerta(params: ParametrosAlertaWhatsapp): Promise<void> {
    const resposta = await fetch(`https://graph.facebook.com/v20.0/${this.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: params.paraTelefone,
        type: "template",
        template: {
          name: this.nomeTemplate,
          language: { code: this.idiomaTemplate },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: params.cliente },
                { type: "text", text: params.numeroCnj },
                { type: "text", text: params.tipoAto },
                { type: "text", text: params.dataFatal },
                { type: "text", text: params.acaoSugerida },
              ],
            },
            {
              type: "button",
              sub_type: "url",
              index: "1",
              parameters: [{ type: "text", text: params.tokenMarcarVisto }],
            },
          ],
        },
      }),
    });

    if (!resposta.ok) {
      const corpo = await resposta.text();
      throw new Error(`WhatsApp Cloud API respondeu ${resposta.status} ao enviar para ${params.paraTelefone}: ${corpo}`);
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
    const nomeTemplate = process.env.WHATSAPP_TEMPLATE_NAME || "alerta_prazo_detalhado";
    const idiomaTemplate = process.env.WHATSAPP_TEMPLATE_IDIOMA || "pt_BR";
    return new MetaWhatsappSender(token, phoneNumberId, nomeTemplate, idiomaTemplate);
  }
  return new ConsoleWhatsappSender();
}
