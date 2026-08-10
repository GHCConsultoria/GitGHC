export const CHAVE_TEMA = "gitghc-theme";

/**
 * Roda antes da hidratação (inline <script>, primeiro filho do <body>) pra
 * aplicar o tema antes do primeiro paint — sem isso, a tela pisca no tema
 * errado por um frame. Diferente do NoSheipe (que segue a preferência do
 * sistema por padrão): aqui o padrão é sempre "light", mesmo se o sistema
 * operacional estiver em modo escuro — só muda se a pessoa alternar
 * manualmente (aí fica salvo e persiste nas próximas visitas).
 */
export function scriptSemFlashDeTema(): string {
  return `(function(){try{var t=localStorage.getItem("${CHAVE_TEMA}");if(t!=="light"&&t!=="dark"){t="light";}document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;
}
