"use server";

import { signIn, signOut } from "@/lib/auth";
import { AuthError } from "next-auth";

export async function login(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      senha: formData.get("senha"),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "E-mail ou senha inválidos.";
    }
    throw error;
  }
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
