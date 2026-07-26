const TIME_ZONE = "America/Sao_Paulo";

/**
 * Resolve um INSTANTE (timestamp com hora real, ex.: vindo de uma API que
 * registra o momento exato de um evento) para a data-calendário correspondente
 * em America/Sao_Paulo, devolvida como meia-noite UTC desse dia. Use isto uma
 * única vez, na borda do sistema, ao transformar um timestamp bruto de uma
 * fonte externa em "dia calendário" — nunca dentro do motor de cálculo (ver
 * `paraDataCalendario` abaixo), porque reaplicar a conversão de fuso a uma
 * data que já é meia-noite UTC representando um dia (a convenção usada em
 * todo o resto deste schema: FeriadoForense.data, recesso etc.) desloca o dia
 * incorretamente (meia-noite UTC cai às 21h do dia anterior em São Paulo).
 */
export function paraDataCalendarioSaoPaulo(instante: Date): Date {
  if (Number.isNaN(instante.getTime())) {
    return new Date(NaN);
  }
  const formatador = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const partes = formatador.formatToParts(instante);
  const ano = Number(partes.find((parte) => parte.type === "year")?.value);
  const mes = Number(partes.find((parte) => parte.type === "month")?.value);
  const dia = Number(partes.find((parte) => parte.type === "day")?.value);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

/**
 * Normaliza uma Date para meia-noite UTC do mesmo dia UTC, sem nenhuma
 * conversão de fuso horário. É a operação certa para uma Date que já
 * representa um dia-calendário (a convenção deste projeto: feriados, recesso
 * e dataDisponibilizacao já resolvida na ingestão) — só descarta hora/minuto
 * residual, sem deslocar o dia.
 */
function paraDataCalendario(instante: Date): Date {
  return new Date(Date.UTC(instante.getUTCFullYear(), instante.getUTCMonth(), instante.getUTCDate()));
}

function paraChaveData(data: Date): string {
  const ano = data.getUTCFullYear();
  const mes = String(data.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(data.getUTCDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function somarDias(data: Date, quantidade: number): Date {
  const resultado = new Date(data.getTime());
  resultado.setUTCDate(resultado.getUTCDate() + quantidade);
  return resultado;
}

export interface CalcularPrazoInput {
  /** Instante em que a informação foi disponibilizada no Diário de Justiça Eletrônico. */
  dataDisponibilizacao: Date;
  diasPrazo: number;
  contagemDiasUteis: boolean;
  uf: string;
  tribunal: string;
  /**
   * Dias sem expediente forense já resolvidos pelo chamador: feriados
   * nacionais, estaduais, suspensões (pontos facultativos com adesão do
   * tribunal) e o recesso (art. 220, CPC). Esta função não sabe de onde
   * vieram nem valida se a lista está completa para o período — quem chama
   * (`calcularPrazoParaProcesso`) é responsável por isso, exigindo a revisão
   * do calendário da UF antes de invocar o motor.
   */
  feriados: Date[];
}

export interface PassoCalculoPrazo {
  descricao: string;
  data: string;
}

export type ResultadoCalculoPrazo =
  | {
      sucesso: true;
      dataPublicacaoConsiderada: Date;
      dataInicioContagem: Date;
      dataFatal: Date;
      passos: PassoCalculoPrazo[];
    }
  | { sucesso: false; motivo: string; passos: PassoCalculoPrazo[] };

/**
 * Motor determinístico de cálculo de prazo processual. Função pura — mesmo
 * input sempre produz o mesmo output, sem I/O e sem ler o relógio. Nunca
 * decide um prazo sozinho: só aplica a regra; a confirmação humana continua
 * obrigatória (ver princípios em CLAUDE.md). Se faltar uma condição segura
 * para calcular, retorna `sucesso: false` com o motivo em vez de chutar uma
 * data.
 */
export function calcularPrazo(input: CalcularPrazoInput): ResultadoCalculoPrazo {
  const passos: PassoCalculoPrazo[] = [];

  if (!Number.isInteger(input.diasPrazo) || input.diasPrazo <= 0) {
    return {
      sucesso: false,
      motivo: `diasPrazo invalido (deve ser um inteiro positivo): ${input.diasPrazo}`,
      passos,
    };
  }

  const dataDisponibilizacao = paraDataCalendario(input.dataDisponibilizacao);
  if (Number.isNaN(dataDisponibilizacao.getTime())) {
    return { sucesso: false, motivo: "dataDisponibilizacao invalida", passos };
  }
  passos.push({ descricao: "Data de disponibilização", data: paraChaveData(dataDisponibilizacao) });

  const feriadosChaves = new Set(input.feriados.map((data) => paraChaveData(paraDataCalendario(data))));

  function ehDiaUtil(data: Date): boolean {
    const diaDaSemana = data.getUTCDay();
    if (diaDaSemana === 0 || diaDaSemana === 6) return false;
    return !feriadosChaves.has(paraChaveData(data));
  }

  function proximoDiaUtilApos(data: Date): Date {
    let candidato = somarDias(data, 1);
    while (!ehDiaUtil(candidato)) {
      candidato = somarDias(candidato, 1);
    }
    return candidato;
  }

  function protrairParaDiaUtil(data: Date): Date {
    let candidato = data;
    while (!ehDiaUtil(candidato)) {
      candidato = somarDias(candidato, 1);
    }
    return candidato;
  }

  // Passo 1 (art. 224, §2º, CPC): considera-se publicado no primeiro dia
  // útil seguinte ao da disponibilização. Sempre avança pelo menos um dia,
  // mesmo que a própria disponibilização já tenha caído em dia útil.
  const dataPublicacaoConsiderada = proximoDiaUtilApos(dataDisponibilizacao);
  passos.push({
    descricao: "Data de publicação considerada (art. 224, §2º, CPC: 1º dia útil após a disponibilização)",
    data: paraChaveData(dataPublicacaoConsiderada),
  });

  // Passo 2 (art. 224, §3º, CPC): a contagem do prazo começa no primeiro dia
  // útil seguinte ao da publicação.
  const dataInicioContagem = proximoDiaUtilApos(dataPublicacaoConsiderada);
  passos.push({
    descricao: "Início da contagem do prazo (art. 224, §3º, CPC: 1º dia útil após a publicação)",
    data: paraChaveData(dataInicioContagem),
  });

  // Passo 3: contagem dos dias do prazo. dataInicioContagem já é, por
  // construção, o 1º dia contado.
  let dataFatal: Date;
  if (input.contagemDiasUteis) {
    // Art. 219, CPC: conta-se só dia útil.
    dataFatal = dataInicioContagem;
    let diasContados = 1;
    passos.push({ descricao: `Dia útil ${diasContados}/${input.diasPrazo}`, data: paraChaveData(dataFatal) });
    while (diasContados < input.diasPrazo) {
      dataFatal = somarDias(dataFatal, 1);
      if (ehDiaUtil(dataFatal)) {
        diasContados += 1;
        passos.push({ descricao: `Dia útil ${diasContados}/${input.diasPrazo}`, data: paraChaveData(dataFatal) });
      }
    }
  } else {
    // Dias corridos: soma direta a partir do início da contagem — os dias
    // intermediários não pulam fim de semana/feriado, só o vencimento
    // (próximo passo) é protraído.
    dataFatal = somarDias(dataInicioContagem, input.diasPrazo - 1);
    passos.push({
      descricao: `Contagem em dias corridos (${input.diasPrazo} dias)`,
      data: paraChaveData(dataFatal),
    });
  }

  // Passo 4 (art. 224, caput, CPC): o dia do vencimento é protraído para o
  // primeiro dia útil seguinte, se cair em dia sem expediente forense. No
  // modo dias úteis isto nunca dispara (dataFatal já é dia útil por
  // construção) — o if cobre só o modo dias corridos.
  if (!ehDiaUtil(dataFatal)) {
    const antesDaProtracao = paraChaveData(dataFatal);
    dataFatal = protrairParaDiaUtil(dataFatal);
    passos.push({
      descricao: `Vencimento protraído (${antesDaProtracao} sem expediente forense)`,
      data: paraChaveData(dataFatal),
    });
  }

  passos.push({ descricao: "Data fatal", data: paraChaveData(dataFatal) });

  return { sucesso: true, dataPublicacaoConsiderada, dataInicioContagem, dataFatal, passos };
}
