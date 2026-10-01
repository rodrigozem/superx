import bcrypt from "bcryptjs";

const password = process.argv[2];

if (!password) {
  console.error("Uso: npm run hash -- \"SuaSenhaForte\"");
  process.exit(1);
}

const hash = await bcrypt.hash(password, 12);

console.log("\nAdicione ao seu .env.local (note os '$' escapados):\n");
console.log("ADMIN_PASSWORD_HASH=" + hash.replaceAll("$", "\\$") + "\n");
