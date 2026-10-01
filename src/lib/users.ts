import "server-only";

import bcrypt from "bcryptjs";

import { getDb } from "@/lib/db";
import type { SessionPayload, UserRole } from "@/lib/session";

export type AuthUser = Pick<SessionPayload, "userId" | "email" | "name" | "role">;

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password_hash: string;
  created_at: string;
  updated_at: string;
};

const BCRYPT_COST = 12;

function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listUsers(): PublicUser[] {
  const rows = getDb()
    .prepare("SELECT * FROM users ORDER BY name COLLATE NOCASE ASC")
    .all() as UserRow[];

  return rows.map(toPublicUser);
}

export function getUserById(id: string): PublicUser | null {
  const row = getDb()
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(id) as UserRow | undefined;

  return row ? toPublicUser(row) : null;
}

export function getUserByEmail(email: string): PublicUser | null {
  const row = getDb()
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email.trim().toLowerCase()) as UserRow | undefined;

  return row ? toPublicUser(row) : null;
}

export function countAdmins(): number {
  const { count } = getDb()
    .prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'")
    .get() as { count: number };

  return count;
}

export async function createUser(input: {
  name: string;
  email: string;
  role: UserRole;
  password: string;
}): Promise<PublicUser> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);

  getDb()
    .prepare(
      `INSERT INTO users (id, name, email, role, password_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.name,
      input.email.trim().toLowerCase(),
      input.role,
      passwordHash,
      now,
      now,
    );

  return getUserById(id)!;
}

export async function updateUser(
  id: string,
  input: {
    name: string;
    email: string;
    role: UserRole;
    password?: string;
  },
): Promise<PublicUser | null> {
  const now = new Date().toISOString();
  const email = input.email.trim().toLowerCase();

  if (input.password) {
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
    getDb()
      .prepare(
        `UPDATE users
         SET name = ?, email = ?, role = ?, password_hash = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(input.name, email, input.role, passwordHash, now, id);
  } else {
    getDb()
      .prepare(
        `UPDATE users
         SET name = ?, email = ?, role = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(input.name, email, input.role, now, id);
  }

  return getUserById(id);
}

export function deleteUser(id: string): void {
  getDb().prepare("DELETE FROM users WHERE id = ?").run(id);
}

export async function verifyCredentials(
  email: string,
  password: string,
): Promise<AuthUser | null> {
  const row = getDb()
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email.trim().toLowerCase()) as UserRow | undefined;

  if (!row) return null;

  const passwordMatches = await bcrypt.compare(password, row.password_hash);
  if (!passwordMatches) return null;

  return {
    userId: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
  };
}
