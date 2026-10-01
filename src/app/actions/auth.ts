"use server";

import { redirect } from "next/navigation";

import { createSession, deleteSession } from "@/lib/dal";
import { loginSchema, type LoginState } from "@/lib/definitions";
import { verifyCredentials } from "@/lib/users";

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Preencha e-mail e senha corretamente." };
  }

  const user = await verifyCredentials(parsed.data.email, parsed.data.password);

  if (!user) {
    return { error: "E-mail ou senha incorretos." };
  }

  await createSession(user);

  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
