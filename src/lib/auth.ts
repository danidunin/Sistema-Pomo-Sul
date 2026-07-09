import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) token.id = user.id;
      return token;
    },
    session: ({ session, token }) => {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        senha: { label: "Senha", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const senha = credentials?.senha as string | undefined;
        if (!email || !senha) return null;

        const usuario = await db.usuario.findUnique({ where: { email } });
        if (!usuario) return null;

        const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
        if (!senhaValida) return null;

        return { id: usuario.id, name: usuario.nome, email: usuario.email };
      },
    }),
  ],
});
