const URL_RADAR = "https://lb01.simepar.br/riak/pgw-radar/product1.jpeg";

/**
 * Painel de campo: última imagem do radar meteorológico do SIMEPAR (mosaico do
 * Paraná), no lugar da previsão de temperatura. Mostra de forma visual se há
 * chuva se formando ou se aproximando da região. Fundo sempre escuro de
 * propósito (mostrador de instrumento), como o antigo painel de clima.
 *
 * Busca a imagem no servidor (em vez de um <img src> direto) e a embute como
 * data URL: assim cada render pega a imagem mais recente do SIMEPAR
 * (`cache: "no-store"`) sem depender de um parâmetro de cache-busting não
 * determinístico (ex: Date.now()) dentro da renderização.
 */
export async function PainelRadar() {
  const dataUrl = await buscarImagemRadar();

  return (
    <a
      href="https://www.simepar.br/simepar/radar_msc"
      target="_blank"
      rel="noopener noreferrer"
      className="col-span-2 flex flex-col gap-2 overflow-hidden rounded-xl bg-[#1c2321] p-4 text-[#f2efe7] md:col-span-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#8fa398]">
          Radar de chuva · SIMEPAR
        </p>
        <p className="text-[11px] text-[#8fa398]">Paraná</p>
      </div>

      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- já embutida como data URL; não há o que o otimizador do Next faria aqui
        <img
          src={dataUrl}
          alt="Última imagem do radar meteorológico do SIMEPAR mostrando chuva no Paraná"
          className="w-full rounded-lg bg-black object-cover"
        />
      ) : (
        <p className="py-6 text-center text-sm text-[#8fa398]">Radar indisponível no momento.</p>
      )}
    </a>
  );
}

async function buscarImagemRadar(): Promise<string | null> {
  try {
    const resposta = await fetch(URL_RADAR, { cache: "no-store" });
    if (!resposta.ok) return null;

    const buffer = await resposta.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return `data:image/jpeg;base64,${base64}`;
  } catch {
    return null;
  }
}
