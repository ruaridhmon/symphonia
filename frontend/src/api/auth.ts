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
  csrf_token?: string;
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

/** Log in (returns token + user info, sets httpOnly auth cookie) */
export function login(email: string, password: string) {
  return api.postForm<LoginResponse>('/login', { username: email, password });
}

/** Log out (clears httpOnly auth + CSRF cookies) */
export function logout() {
  return api.post<{ message: string }>('/logout');
}

/** Request a password reset email */
export function forgotPassword(email: string) {
  return api.postForm<{ message: string }>('/forgot-password', { email });
}

/** Reset password using a valid token */
export function resetPassword(token: string, newPassword: string) {
  return api.postForm<{ message: string }>('/reset-password', { token, new_password: newPassword });
}
