"use server";

import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function criarUsuario(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const senha = String(formData.get("senha") ?? "");

  if (!nome || !email || senha.length < 6) {
    return "Preencha nome, e-mail e uma senha com pelo menos 6 caracteres.";
  }

  const existente = await db.usuario.findUnique({ where: { email } });
  if (existente) {
    return "Já existe um usuário com este e-mail.";
  }

  await db.usuario.create({
    data: {
      nome,
      email,
      senhaHash: await bcrypt.hash(senha, 10),
    },
  });

  revalidatePath("/usuarios");
}
