import type { LucideIcon } from "lucide-react";
import { CloudLightning, CloudRain, CloudFog, CloudSun, Cloud, Sun } from "lucide-react";

// Código do município (IBGE) da propriedade (Lapa, PR) — usado na API pública do INMET.
const CODIGO_IBGE = "4113205";

// Campos opcionais de propósito: a API do INMET já mandou dias/períodos reais
// faltando qualquer um destes campos (não é um erro de parsing nosso, é a
// fonte externa sendo inconsistente) — cada consumidor abaixo trata a
// ausência explicitamente em vez de assumir que sempre vêm preenchidos.
type PeriodoBrutoInmet = {
  resumo?: string;
  temp_max?: number;
  temp_min?: number;
  dia_semana?: string;
};

function numeroValido(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

type NomePeriodo = "Manhã" | "Tarde" | "Noite";

export type PeriodoClima = {
  nome: NomePeriodo;
  resumo: string;
};

export type DiaDetalhado = {
  data: string; // "dd/mm/aaaa"
  temperaturaMinima: number;
  temperaturaMaxima: number;
  periodos: PeriodoClima[];
};

export type DiaResumo = {
  data: string;
  diaSemana: string;
  resumo: string;
  temperaturaMinima: number;
  temperaturaMaxima: number;
};

export type Clima = {
  hoje: DiaDetalhado;
  amanha: DiaDetalhado;
  proximosDias: DiaResumo[];
};

const NOME_PERIODO: Record<"manha" | "tarde" | "noite", NomePeriodo> = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
};

/**
 * Busca a previsão do tempo oficial do INMET (Instituto Nacional de Meteorologia)
 * para o município da propriedade — API pública, sem necessidade de chave.
 * Os dois primeiros dias vêm detalhados por Manhã/Tarde/Noite; os seguintes,
 * como resumo único do dia. Retorna null se a busca falhar — a Home deve
 * exibir um estado vazio amigável nesse caso.
 */
export async function buscarClima(): Promise<Clima | null> {
  try {
    const resposta = await fetch(`https://apiprevmet3.inmet.gov.br/previsao/${CODIGO_IBGE}`, {
      next: { revalidate: 1800 },
    });
    if (!resposta.ok) return null;

    const dados = await resposta.json();
    const bloco = dados[CODIGO_IBGE] as Record<string, Record<string, unknown>> | undefined;
    if (!bloco) return null;

    const datas = Object.keys(bloco);
    const [dataHoje, dataAmanha, ...datasRestantes] = datas;
    if (!dataHoje || !dataAmanha) return null;

    // Retorna null quando o dia não tem dado confiável o bastante pra exibir (em vez de
    // devolver um objeto com campo faltando que quebraria a UI mais adiante) — cada
    // chamador decide o que fazer com um dia inválido (descartar, ou tratar Clima
    // inteiro como indisponível).
    const paraDiaDetalhado = (data: string): DiaDetalhado | null => {
      const bruto = bloco[data] as Record<"manha" | "tarde" | "noite", PeriodoBrutoInmet | undefined>;
      const periodos = (["manha", "tarde", "noite"] as const)
        .filter((chave) => bruto[chave])
        .map((chave) => ({
          nome: NOME_PERIODO[chave],
          resumo: bruto[chave]?.resumo ?? "",
        }));
      const referencia = bruto.tarde ?? bruto.manha ?? bruto.noite;
      if (!referencia || !numeroValido(referencia.temp_min) || !numeroValido(referencia.temp_max)) return null;
      return {
        data,
        temperaturaMinima: referencia.temp_min,
        temperaturaMaxima: referencia.temp_max,
        periodos,
      };
    };

    const paraDiaResumo = (data: string): DiaResumo | null => {
      const p = bloco[data] as unknown as PeriodoBrutoInmet | undefined;
      if (!p || typeof p.dia_semana !== "string" || !numeroValido(p.temp_min) || !numeroValido(p.temp_max)) {
        return null;
      }
      return {
        data,
        diaSemana: p.dia_semana,
        resumo: p.resumo ?? "",
        temperaturaMinima: p.temp_min,
        temperaturaMaxima: p.temp_max,
      };
    };

    const hoje = paraDiaDetalhado(dataHoje);
    const amanha = paraDiaDetalhado(dataAmanha);
    // Hoje/amanhã são obrigatórios no tipo Clima — se algum vier incompleto, é
    // mais seguro mostrar "clima indisponível" (ver PainelClimaVazio) do que
    // inventar um valor. Dias mais distantes (proximosDias) só perdem aquele
    // card específico, sem invalidar a previsão inteira.
    if (!hoje || !amanha) return null;

    return {
      hoje,
      amanha,
      proximosDias: datasRestantes.map(paraDiaResumo).filter((dia): dia is DiaResumo => dia !== null),
    };
  } catch {
    return null;
  }
}

/**
 * Mapeia o texto livre do INMET (ex: "Sol", "Chuvoso", "Nublado com poucas nuvens") para um
 * ícone de condição. A ordem importa: condições mais específicas/severas são checadas antes
 * das genéricas (ex: "trovoada" antes de "chuva", "chuva" antes de "nuvens").
 */
export function iconePorResumo(resumo: string | null | undefined): LucideIcon {
  // resumo vem de uma API externa (INMET) sem garantia de formato — dias/períodos
  // sem esse campo preenchido já derrubaram a Home inteira em produção
  // ("Cannot read properties of undefined (reading 'toLowerCase')").
  const texto = (resumo ?? "").toLowerCase();

  if (texto.includes("trovoada") || texto.includes("tempestade")) return CloudLightning;
  if (texto.includes("chuv")) return CloudRain;
  if (texto.includes("nevoeiro") || texto.includes("neblina") || texto.includes("bruma")) return CloudFog;
  if (texto.includes("sol") && (texto.includes("nuvens") || texto.includes("nublado"))) return CloudSun;
  if (texto.includes("nublado") || texto.includes("encoberto") || texto.includes("nuvens")) return Cloud;
  if (texto.includes("sol")) return Sun;

  return Cloud;
}
