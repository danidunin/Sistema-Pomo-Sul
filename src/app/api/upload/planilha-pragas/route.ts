import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";

const TIPO_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const TAMANHO_MAXIMO = 20 * 1024 * 1024; // 20MB

async function salvarArquivo(bytes: Buffer, nomeArquivo: string): Promise<string> {
  if (process.env.VERCEL) {
    const blob = await put(`monitoramento-pragas/${nomeArquivo}`, bytes, {
      access: "public",
      contentType: TIPO_XLSX,
    });
    return blob.url;
  }

  const diretorio = path.join(process.cwd(), "public", "uploads", "monitoramento-pragas");
  await mkdir(diretorio, { recursive: true });
  await writeFile(path.join(diretorio, nomeArquivo), bytes);
  return `/api/uploads/monitoramento-pragas/${nomeArquivo}`;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ erro: "Arquivo não enviado." }, { status: 400 });
  }

  const ehXlsx = file.type === TIPO_XLSX || file.name.toLowerCase().endsWith(".xlsx");
  if (!ehXlsx) {
    return NextResponse.json({ erro: "Envie um arquivo .xlsx." }, { status: 400 });
  }
  if (file.size > TAMANHO_MAXIMO) {
    return NextResponse.json({ erro: "Arquivo maior que 20MB." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const nomeArquivo = `${randomUUID()}.xlsx`;
  const url = await salvarArquivo(bytes, nomeArquivo);

  await db.planilhaMonitoramento.upsert({
    where: { id: "atual" },
    update: { url, nomeArquivo: file.name, tamanhoBytes: file.size, enviadoPorId: session.user.id },
    create: { id: "atual", url, nomeArquivo: file.name, tamanhoBytes: file.size, enviadoPorId: session.user.id },
  });

  return NextResponse.json({ url });
}
