/**
 * Fotos de iPhone costumam vir em HEIC — formato que nenhum navegador (nem Chrome,
 * nem Firefox, nem Safari em <img>) consegue exibir. O upload "funciona" (o arquivo
 * é salvo), mas a foto nunca aparece. Convertemos para JPEG no navegador antes de
 * enviar, para o problema nunca chegar ao servidor.
 *
 * A conversão roda um decodificador HEIC inteiro em WASM no navegador — em uma
 * conexão de campo fraca (baixar o WASM) ou numa variante de HEIC que a biblioteca
 * não suporta, ela pode falhar. Uma versão anterior deste código, nesse caso,
 * enviava o arquivo HEIC original mesmo assim — só que isso faz a foto "subir" só
 * na aparência: ela fica salva, mas nunca aparece em lugar nenhum (é exatamente o
 * bug relatado de foto que "não subiu"). Por isso agora falhamos de forma clara em
 * vez de enviar um arquivo que nunca vai renderizar.
 */
export async function converterSeHeic(file: File): Promise<File> {
  const ehHeic = file.type === "image/heic" || file.type === "image/heif" || /\.hei[cf]$/i.test(file.name);
  if (!ehHeic) return file;

  try {
    const heic2any = (await import("heic2any")).default;
    const resultado = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 });
    const convertido = Array.isArray(resultado) ? resultado[0] : resultado;
    return new File([convertido], file.name.replace(/\.hei[cf]$/i, ".jpg"), { type: "image/jpeg" });
  } catch (erro) {
    console.error("Falha ao converter HEIC:", erro);
    throw new Error(
      "Não foi possível converter esta foto (formato HEIC). Tente novamente, ou mude a câmera do celular para \"Mais compatível\" em Ajustes → Câmera → Formatos, e envie de novo.",
    );
  }
}
