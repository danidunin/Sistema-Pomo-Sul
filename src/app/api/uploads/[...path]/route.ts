import { auth } from "@/lib/auth";
import { readFile } from "node:fs/promises";
import path from "node:path";

// Em produção (`next start`), o /public do Next.js só serve arquivos que já
// existiam no diretório no momento em que o servidor subiu — uploads feitos
// com o servidor em execução retornam 404, mesmo existindo em disco. Por isso
// os arquivos enviados pelos usuários são servidos por esta rota (lê do disco
// a cada requisição), em vez de depender do /public estático.
const MIME_POR_EXTENSAO: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  pdf: "application/pdf",
};

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const session = await auth();
  if (!session?.user) return new Response("Não autenticado.", { status: 401 });

  const { path: segmentos } = await params;
  if (segmentos.some((s) => s.includes("..") || s.includes("/") || s.includes("\\"))) {
    return new Response("Caminho inválido.", { status: 400 });
  }

  const caminho = path.join(process.cwd(), "public", "uploads", ...segmentos);

  try {
    const bytes = await readFile(caminho);
    const extensao = segmentos.at(-1)?.split(".").pop()?.toLowerCase() ?? "";
    const tipo = MIME_POR_EXTENSAO[extensao] ?? "application/octet-stream";
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": tipo,
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Arquivo não encontrado.", { status: 404 });
  }
}
