import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const TIPOS_ATIVIDADE = [
  "Roçar",
  "Triturar galhos",
  "Colher",
  "Podar",
  "Ralear",
  "Arquear galhos",
  "Cortar cavalos",
  "Plantio",
  "Replantio",
  "Chuva",
  "Outros",
];

async function main() {
  for (const nome of TIPOS_ATIVIDADE) {
    await db.tipoAtividade.upsert({
      where: { nome },
      update: {},
      create: { nome },
    });
  }

  const emailAdmin = process.env.SEED_ADMIN_EMAIL ?? "admin@pomosul.com.br";
  const senhaAdmin = process.env.SEED_ADMIN_SENHA ?? "pomosul123";

  await db.usuario.upsert({
    where: { email: emailAdmin },
    update: {},
    create: {
      nome: "Administrador",
      email: emailAdmin,
      senhaHash: await bcrypt.hash(senhaAdmin, 10),
    },
  });

  console.log(`Seed concluído. Usuário inicial: ${emailAdmin} / ${senhaAdmin}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
