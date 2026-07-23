import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { createUser, getUserByEmail, validateInvite, markInviteUsed, createInvite } from './queries';
import type { User } from '../types';

const SESSION_KEY = 'clarity_session';
const INVITE_SECRET = 'clarity-invite-secret-v1';

export async function signLocalJWT(payload: object): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const b64Header = btoa(JSON.stringify(header));
  const b64Payload = btoa(JSON.stringify(payload));
  const signatureInput = `${b64Header}.${b64Payload}`;
  const key = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, INVITE_SECRET);
  const signature = btoa(key.slice(0, 32));
  return `${b64Header}.${b64Payload}.${signature}`;
}

export async function verifyLocalJWT(token: string): Promise<Record<string, unknown> | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && Date.now() > payload.exp * 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function generateInviteCode(email: string | null = null): Promise<string> {
  const prefix = 'CLARITY';
  const random = Array.from({ length: 4 }, () => Math.random().toString(36).substring(2, 6).toUpperCase()).join('-');
  const code = `${prefix}-${random}`;
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await createInvite(code, email, expiresAt);
  return code;
}

export async function registerWithInvite(code: string, email: string): Promise<{ token: string; user: User } | null> {
  const invite = await validateInvite(code);
  if (!invite) return null;

  const existingUser = await getUserByEmail(email);
  if (existingUser) return null;

  const existingUsers = await (await import('./queries')).getAllUsers();
  const role = existingUsers.length === 0 ? 'admin' : 'member';

  const user = await createUser(email, role, code);
  await markInviteUsed(code, user.id);

  const token = await signLocalJWT({ sub: user.id, email: user.email, role: user.role });
  return { token, user };
}

export async function loginWithEmail(email: string): Promise<{ token: string; user: User } | null> {
  const user = await getUserByEmail(email);
  if (!user) return null;
  const token = await signLocalJWT({ sub: user.id, email: user.email, role: user.role });
  return { token, user };
}

export async function saveSession(token: string, user: User): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({ token, user }));
}

export async function getSession(): Promise<{ token: string; user: User } | null> {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const payload = await verifyLocalJWT(parsed.token);
    if (!payload) {
      await SecureStore.deleteItemAsync(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}