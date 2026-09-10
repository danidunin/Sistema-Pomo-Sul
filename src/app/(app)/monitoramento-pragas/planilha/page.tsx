import ExcelJS from "exceljs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { formatarData } from "@/lib/format";
import { parsearWorkbook } from "@/lib/planilha-pragas-parser";
import { PlanilhaUploadForm } from "@/components/pragas/planilha-upload-form";
import { PlanilhaTabela } from "@/components/pragas/planilha-tabela";
import { VoltarLink } from "@/components/nav/voltar-link";

export default async function PlanilhaPragasPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  const { aba: abaSelecionada } = await searchParams;
  const planilha = await db.planilhaMonitoramento.findUnique({ where: { id: "atual" } });

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink href="/monitoramento-pragas" label="Voltar" />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Planilha</h1>
          {planilha && (
            <p className="text-xs text-neutral-500">
              {planilha.nomeArquivo} · enviada em {formatarData(planilha.updatedAt)}
            </p>
          )}
        </div>
        <PlanilhaUploadForm />
      </div>

      {!planilha ? (
        <p className="text-sm text-neutral-500">Nenhuma planilha enviada ainda.</p>
      ) : (
        <PlanilhaConteudo url={planilha.url} abaSelecionada={abaSelecionada} />
      )}
    </div>
  );
}

/**
 * `planilha.url` é `/api/uploads/monitoramento-pragas/<arquivo>` em ambiente local (rota
 * autenticada, ver `src/app/api/uploads/[...path]/route.ts`) ou uma URL absoluta do Vercel
 * Blob em produção. Um `fetch` de Server Component não tem como resolver um caminho relativo
 * (`Failed to parse URL from /api/...`) nem repassar o cookie de sessão do navegador — então,
 * pra URL local, lê o arquivo direto do disco (mesmo diretório que a rota de upload usa) em vez
 * de dar loopback por HTTP; a autenticação já foi checada no proxy que protege este grupo de
 * rotas (`src/proxy.ts`). URLs absolutas (produção) continuam indo por `fetch` normal.
 */
async function carregarArquivoPlanilha(url: string): Promise<ArrayBuffer | null> {
  if (url.startsWith("/api/uploads/")) {
    const segmentos = url.slice("/api/uploads/".length);
    const caminho = path.join(process.cwd(), "public", "uploads", ...segmentos.split("/"));
    try {
      const bytes = await readFile(caminho);
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    } catch {
      return null;
    }
  }

  const resposta = await fetch(url, { cache: "no-store" });
  return resposta.ok ? await resposta.arrayBuffer() : null;
}

async function PlanilhaConteudo({ url, abaSelecionada }: { url: string; abaSelecionada?: string }) {
  const buffer = await carregarArquivoPlanilha(url);
  if (!buffer) {
    return <p className="text-sm text-red-600">Não foi possível carregar a planilha enviada. Tente enviar de novo.</p>;
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const abas = parsearWorkbook(workbook);

  if (abas.length === 0) {
    return <p className="text-sm text-neutral-500">A planilha enviada não tem nenhuma aba com dado reconhecível.</p>;
  }

  const aba = abas.find((a) => a.nome === abaSelecionada) ?? abas[0];

  return (
    <div className="flex flex-col gap-3">
      {abas.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {abas.map((a) => (
            <a
              key={a.nome}
              href={`?aba=${encodeURIComponent(a.nome)}`}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                a.nome === aba.nome
                  ? "border-green-700 bg-green-50 text-green-800"
                  : "border-neutral-300 text-neutral-700"
              }`}
            >
              {a.nome}
            </a>
          ))}
        </div>
      )}
      <PlanilhaTabela aba={aba} />
    </div>
  );
}
