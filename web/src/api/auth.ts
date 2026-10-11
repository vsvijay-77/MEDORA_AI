/**
 * DEMO AUTHENTICATION — accounts live in this browser's localStorage only.
 * The MedChronicle backend does not (yet) expose email/password accounts, so sign-up/sign-in here gates the UI,
 * stores the user's profile locally, and nothing is sent to a server. Swap this module for Supabase/Auth0/etc.
 * (same function signatures) when real accounts are needed.
 */
import type { Gender, LangCode, UserProfile } from "@/types";

const USERS_KEY = "mc_users";
const SESSION_KEY = "mc_session";

interface StoredUser extends UserProfile { salt: string; hash: string }

async function sha256(text: string): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const buf = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  let h = 5381; // very small fallback for non-secure contexts
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return `fallback-${h >>> 0}`;
}

const readUsers = (): StoredUser[] => { try { return JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]"); } catch { return []; } };
const writeUsers = (u: StoredUser[]) => localStorage.setItem(USERS_KEY, JSON.stringify(u));
const strip = ({ salt: _s, hash: _h, ...profile }: StoredUser): UserProfile => profile;
const uid = () => (globalThis.crypto?.randomUUID?.() ?? `u_${Date.now()}_${Math.random().toString(16).slice(2)}`);

export class AuthError extends Error {}

export async function signUp(input: { name: string; email: string; password: string }): Promise<UserProfile> {
  const users = readUsers();
  const email = input.email.trim().toLowerCase();
  if (users.some((u) => u.email === email)) throw new AuthError("An account with this email already exists. Try signing in.");
  const salt = uid();
  const user: StoredUser = {
    id: uid(), name: input.name.trim(), email, language: "en-IN", onboarded: false, createdAt: new Date().toISOString(),
    salt, hash: await sha256(salt + input.password),
  };
  writeUsers([...users, user]);
  return strip(user);
}

export async function signIn(input: { email: string; password: string }): Promise<UserProfile> {
  const email = input.email.trim().toLowerCase();
  const user = readUsers().find((u) => u.email === email);
  if (!user || (await sha256(user.salt + input.password)) !== user.hash) throw new AuthError("Incorrect email or password.");
  return strip(user);
}

export function saveSession(userId: string, remember: boolean) {
  clearSession();
  (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, userId);
}
export function clearSession() { localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY); }
export function currentSessionUser(): UserProfile | null {
  const id = sessionStorage.getItem(SESSION_KEY) ?? localStorage.getItem(SESSION_KEY);
  const user = id ? readUsers().find((u) => u.id === id) : undefined;
  return user ? strip(user) : null;
}

export function updateUser(id: string, patch: Partial<Pick<UserProfile, "name" | "dob" | "gender" | "language" | "abha" | "onboarded">>): UserProfile {
  const users = readUsers();
  const i = users.findIndex((u) => u.id === id);
  if (i < 0) throw new AuthError("Account not found.");
  users[i] = { ...users[i], ...patch };
  writeUsers(users);
  return strip(users[i]);
}

export const generateDemoAbha = () => `ABHA-DEMO-${Math.floor(100000 + Math.random() * 900000)}`;
export type { Gender, LangCode };
