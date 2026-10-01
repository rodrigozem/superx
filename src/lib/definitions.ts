import * as z from "zod";

export const loginSchema = z.object({
  email: z.email({ error: "Informe um e-mail válido." }).trim(),
  password: z.string().min(1, { error: "Informe sua senha." }),
});

export type LoginState = {
  error?: string;
};

export const roleSchema = z.enum(["admin", "user"], {
  error: "Selecione um perfil válido.",
});

function isStrongPassword(value: string) {
  return (
    value.length >= 8 &&
    /[a-zA-Z]/.test(value) &&
    /[0-9]/.test(value) &&
    /[^a-zA-Z0-9]/.test(value)
  );
}

export const createUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "Informe ao menos 2 caracteres." }),
  email: z.email({ error: "Informe um e-mail válido." }).trim(),
  role: roleSchema,
  password: z
    .string()
    .min(8, { error: "A senha deve ter ao menos 8 caracteres." })
    .regex(/[a-zA-Z]/, { error: "A senha deve conter ao menos uma letra." })
    .regex(/[0-9]/, { error: "A senha deve conter ao menos um número." })
    .regex(/[^a-zA-Z0-9]/, {
      error: "A senha deve conter ao menos um caractere especial.",
    }),
});

export const updateUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "Informe ao menos 2 caracteres." }),
  email: z.email({ error: "Informe um e-mail válido." }).trim(),
  role: roleSchema,
  password: z
    .string()
    .trim()
    .refine((value) => value === "" || isStrongPassword(value), {
      error:
        "A senha deve ter 8+ caracteres, com letra, número e caractere especial.",
    }),
});

export type UserFormState = {
  message?: string;
  errors?: Record<string, string[] | undefined>;
};
