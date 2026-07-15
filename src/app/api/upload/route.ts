import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const PASTAS_PERMITIDAS = new Set(["maquinas", "operadores", "visitas", "manutencoes"]);
// O cliente sempre tenta converter HEIC para JPEG antes de enviar (nenhum navegador
// exibe HEIC numa <img> — ver src/lib/converter-heic.ts), e agora bloqueia o envio com
// um erro claro se a conversão falhar, em vez de mandar o arquivo original. Por isso
// HEIC/HEIF NÃO são aceitos aqui: se algum chegasse mesmo assim (falha de detecção no
// cliente), ficaria salvo para sempre como uma foto que nenhum navegador exibe.
const TIPOS_PERMITIDOS = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
const TAMANHO_MAXIMO = 20 * 1024 * 1024; // 20MB — fotos de celulares modernos podem passar de 8MB

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const pasta = String(formData.get("pasta") ?? "");

  if (!(file instanceof File)) {
    return NextResponse.json({ erro: "Arquivo não enviado." }, { status: 400 });
  }
  if (!PASTAS_PERMITIDAS.has(pasta)) {
    return NextResponse.json({ erro: "Pasta de destino inválida." }, { status: 400 });
  }
  if (!TIPOS_PERMITIDOS.has(file.type)) {
    return NextResponse.json({ erro: "Formato de imagem não suportado." }, { status: 400 });
  }
  if (file.size > TAMANHO_MAXIMO) {
    return NextResponse.json({ erro: "Arquivo maior que 20MB." }, { status: 400 });
  }

  const extensao = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
  const nomeArquivo = `${randomUUID()}.${extensao}`;
  const diretorio = path.join(process.cwd(), "public", "uploads", pasta);
  await mkdir(diretorio, { recursive: true });

  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(diretorio, nomeArquivo), bytes);

  return NextResponse.json({ url: `/api/uploads/${pasta}/${nomeArquivo}` });
}
