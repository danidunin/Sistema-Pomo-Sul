import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

const PASTAS_PERMITIDAS = new Set(["maquinas", "operadores", "visitas", "manutencoes"]);
// Fotos de iPhone costumam vir em HEIC. Antes, a conversão para JPEG rodava no
// navegador (heic2any), mas essa biblioteca depende de Web Worker + Blob URL, e
// isso esbarra numa validação de string mais rígida do WebKit — o motor usado por
// TODO navegador no iOS, não só o Safari — e derruba o envio com
// "SyntaxError: The string did not match the expected pattern". Como o campo
// fotografa com iPhone, isso quebrava o upload quase sempre. A conversão agora
// roda aqui no servidor (Node, sem DOM/Worker/Blob URL), o que elimina essa
// classe inteira de erro.
const TIPOS_HEIC = new Set(["image/heic", "image/heif"]);
const TIPOS_IMAGEM = new Set(["image/jpeg", "image/png", "image/webp"]);
const TIPOS_PERMITIDOS = new Set([...TIPOS_IMAGEM, ...TIPOS_HEIC, "application/pdf"]);
const TAMANHO_MAXIMO = 20 * 1024 * 1024; // 20MB — fotos de celulares modernos podem passar de 8MB

// iOS às vezes entrega o arquivo da câmera/galeria com file.type vazio, mesmo
// sendo HEIC — por isso também checamos a extensão do nome do arquivo.
function ehHeicPeloNome(nomeArquivo: string): boolean {
  return /\.hei[cf]$/i.test(nomeArquivo);
}

// Redimensiona para no máximo 1920px no lado maior — suficiente para consulta e
// impressão, mas bem mais leve para subir numa conexão de campo fraca.
async function redimensionarImagem(bytes: Buffer, formatoSaida: "jpeg" | "png" | "webp"): Promise<Buffer> {
  const imagem = sharp(bytes).rotate().resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true });
  if (formatoSaida === "jpeg") return imagem.jpeg({ quality: 80 }).toBuffer();
  if (formatoSaida === "webp") return imagem.webp({ quality: 80 }).toBuffer();
  return imagem.png({ compressionLevel: 8 }).toBuffer();
}

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

  const ehHeic = TIPOS_HEIC.has(file.type) || ehHeicPeloNome(file.name);
  if (!ehHeic && !TIPOS_PERMITIDOS.has(file.type)) {
    return NextResponse.json({ erro: "Formato de imagem não suportado." }, { status: 400 });
  }
  if (file.size > TAMANHO_MAXIMO) {
    return NextResponse.json({ erro: "Arquivo maior que 20MB." }, { status: 400 });
  }

  let bytes: Buffer<ArrayBufferLike> = Buffer.from(await file.arrayBuffer());
  let extensao: string;

  if (ehHeic) {
    try {
      const heicConvert = (await import("heic-convert")).default;
      const jpegBuffer = await heicConvert({ buffer: bytes, format: "JPEG", quality: 0.85 });
      bytes = await redimensionarImagem(Buffer.from(jpegBuffer), "jpeg");
      extensao = "jpg";
    } catch (erro) {
      console.error("Falha ao converter HEIC no servidor:", erro);
      return NextResponse.json(
        { erro: "Não foi possível converter esta foto (formato HEIC). Tente novamente ou tire a foto de novo." },
        { status: 400 },
      );
    }
  } else if (file.type === "application/pdf") {
    extensao = "pdf";
  } else {
    const formatoSaida = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpeg";
    extensao = formatoSaida === "jpeg" ? "jpg" : formatoSaida;
    bytes = await redimensionarImagem(bytes, formatoSaida);
  }

  const nomeArquivo = `${randomUUID()}.${extensao}`;
  const diretorio = path.join(process.cwd(), "public", "uploads", pasta);
  await mkdir(diretorio, { recursive: true });

  await writeFile(path.join(diretorio, nomeArquivo), bytes);

  return NextResponse.json({ url: `/api/uploads/${pasta}/${nomeArquivo}` });
}
