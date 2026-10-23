export type FotoHero = {
  src: string;
  alt: string;
};

// A ordem aqui é a ordem do ciclo — cada foto fica no ar por HORAS_POR_TROCA
// horas antes de passar pra próxima, voltando pra primeira depois da última.
const FOTOS_HERO: FotoHero[] = [
  { src: "/images/hero-flor-pomar.jpg", alt: "Pomar de pessegueiros em flor no Pomo Sul" },
  { src: "/images/hero-flor-close.jpg", alt: "Flores de pessegueiro em detalhe no pomar Pomo Sul" },
  { src: "/images/hero-pomar.jpg", alt: "Macieiras carregadas de frutos no pomar Pomo Sul" },
  { src: "/images/hero-pessegos.jpg", alt: "Pêssegos maduros colhidos à mão no pomar Pomo Sul" },
];

const HORAS_POR_TROCA = 6;

function fotoHeroPara(epochMillis: number): FotoHero {
  const horasDesdeEpoch = Math.floor(epochMillis / (1000 * 60 * 60));
  const indice = Math.floor(horasDesdeEpoch / HORAS_POR_TROCA) % FOTOS_HERO.length;
  return FOTOS_HERO[indice];
}

/**
 * Foto do hero da Home no momento do request — troca a cada HORAS_POR_TROCA
 * horas, ciclando entre as fotos de FOTOS_HERO. A leitura de `Date.now()`
 * fica isolada aqui (função fora do componente) só por causa da regra de
 * lint que proíbe chamar função impura direto dentro de um componente.
 */
export function fotoHeroAtual(): FotoHero {
  return fotoHeroPara(Date.now());
}
