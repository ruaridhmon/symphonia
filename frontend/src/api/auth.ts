import { api } from './client';

/* ── Types ── */

export interface MeResponse {
  email: string;
  is_admin?: boolean;
}

export interface LoginResponse {
  access_token: string;
  is_admin: boolean;
  email: string;
}

/* ── API calls ── */

/** Get the current authenticated user */
export function getMe() {
  return api.get<MeResponse>('/me');
}

/** Register a new account */
export function register(email: string, password: string) {
  return api.postForm<{ message: string }>('/register', { email, password });
}

/** Log in (returns token + user info) */
export function login(email: string, password: string) {
  return api.postForm<LoginResponse>('/login', { username: email, password });
}
