"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSession, requireUser } from "@/lib/dal";
import {
  createUserSchema,
  updateUserSchema,
  type UserFormState,
} from "@/lib/definitions";
import {
  countAdmins,
  createUser,
  deleteUser,
  getUserByEmail,
  getUserById,
  updateUser,
} from "@/lib/users";

const USERS_PATH = "/dashboard/users";

export async function createUserAction(
  _prevState: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const session = await requireUser();
  if (session.role !== "admin") {
    return { message: "Você não tem permissão para esta ação." };
  }

  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      message: "Verifique os campos destacados.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  if (getUserByEmail(parsed.data.email)) {
    return {
      message: "Já existe um usuário com este e-mail.",
      errors: { email: ["Já existe um usuário com este e-mail."] },
    };
  }

  await createUser(parsed.data);

  revalidatePath(USERS_PATH);
  redirect(USERS_PATH);
}

export async function updateUserAction(
  id: string,
  _prevState: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const session = await requireUser();
  if (session.role !== "admin") {
    return { message: "Você não tem permissão para esta ação." };
  }

  const existing = getUserById(id);
  if (!existing) {
    return { message: "Usuário não encontrado." };
  }

  const parsed = updateUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    password: formData.get("password") ?? "",
  });

  if (!parsed.success) {
    return {
      message: "Verifique os campos destacados.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const emailOwner = getUserByEmail(parsed.data.email);
  if (emailOwner && emailOwner.id !== id) {
    return {
      message: "Já existe um usuário com este e-mail.",
      errors: { email: ["Já existe um usuário com este e-mail."] },
    };
  }

  if (existing.role === "admin" && parsed.data.role !== "admin") {
    if (countAdmins() <= 1) {
      return { message: "Não é possível remover o último administrador." };
    }
  }

  const updated = await updateUser(id, {
    name: parsed.data.name,
    email: parsed.data.email,
    role: parsed.data.role,
    password: parsed.data.password || undefined,
  });

  if (!updated) {
    return { message: "Não foi possível atualizar o usuário." };
  }

  if (id === session.userId) {
    await createSession({
      userId: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
    });
  }

  revalidatePath(USERS_PATH);
  redirect(USERS_PATH);
}

export async function deleteUserAction(formData: FormData) {
  const session = await requireUser();
  if (session.role !== "admin") redirect("/dashboard");

  const id = String(formData.get("id") ?? "");
  if (!id) redirect(USERS_PATH);

  if (id === session.userId) redirect(`${USERS_PATH}?error=self`);

  const target = getUserById(id);
  if (!target) redirect(USERS_PATH);

  if (target.role === "admin" && countAdmins() <= 1) {
    redirect(`${USERS_PATH}?error=last-admin`);
  }

  deleteUser(id);

  revalidatePath(USERS_PATH);
  redirect(USERS_PATH);
}
