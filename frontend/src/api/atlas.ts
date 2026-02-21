import { api } from './client';

/** Seed the Atlas with test data */
export function seedAtlas() {
  return api.post<{ ok: boolean }>('/atlas/seed');
}
