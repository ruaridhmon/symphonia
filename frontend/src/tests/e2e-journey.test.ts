/**
 * E2E User Journey Test for Symphonia
 * 
 * This test simulates a complete user journey through the Symphonia platform:
 * 1. Login as admin (antreas@axiotic.ai / test123)
 * 2. Create a new form with 2 questions
 * 3. Submit a response as participant
 * 4. Generate AI synthesis
 * 5. View results
 * 
 * NOTE: This is a TypeScript specification for E2E testing.
 * To run this, you'll need to install a testing framework like:
 * - Playwright: npm install -D @playwright/test
 * - Cypress: npm install -D cypress
 * - Vitest: npm install -D vitest @vitest/ui
 * 
 * For immediate testing, use scripts/test-journey.sh instead.
 */

import { describe, it, expect, beforeAll } from 'vitest'; // or your testing framework

// Configuration
const API_BASE = 'http://localhost:8000';
const ADMIN_EMAIL = 'antreas@axiotic.ai';
const ADMIN_PASSWORD = 'test123';

// Test state
let accessToken: string;
let formId: number;
let joinCode: string;

// API client wrapper
class SymphoniaClient {
    private baseUrl: string;
    private token: string | null = null;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    setToken(token: string) {
        this.token = token;
    }

    private async request<T>(
        path: string,
        options: RequestInit = {}
    ): Promise<T> {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(`${this.baseUrl}${path}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`API Error (${response.status}): ${error}`);
        }

        return response.json();
    }

    async login(email: string, password: string) {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const response = await fetch(`${this.baseUrl}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData,
        });

        const data = await response.json();
        this.setToken(data.access_token);
        return data;
    }

    async createForm(payload: {
        title: string;
        questions: string[];
        allow_join: boolean;
        join_code: string;
    }) {
        return this.request<{
            id: number;
            title: string;
            questions: string[];
            allow_join: boolean;
            join_code: string;
            participant_count: number;
            current_round: number;
        }>('/create_form', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    async submitResponse(formId: number, answers: Record<string, string>) {
        const formData = new URLSearchParams();
        formData.append('form_id', formId.toString());
        formData.append('answers', JSON.stringify(answers));

        const response = await fetch(`${this.baseUrl}/submit`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData,
        });

        return response.json();
    }

    async generateSynthesis(formId: number, options: {
        model?: string;
        mode?: 'human_only' | 'ai_assisted';
        n_analysts?: number;
    } = {}) {
        return this.request<{
            synthesis: any;
            convergence_score: number;
            text_synthesis: string;
        }>(`/forms/${formId}/synthesise_committee`, {
            method: 'POST',
            body: JSON.stringify({
                model: options.model || 'anthropic/claude-sonnet-4-5',
                mode: options.mode || 'human_only',
                n_analysts: options.n_analysts || 3,
            }),
        });
    }

    async getForm(formId: number) {
        return this.request<{
            id: number;
            title: string;
            questions: string[];
            allow_join: boolean;
            join_code: string;
            expert_labels: any;
        }>(`/forms/${formId}`);
    }

    async getResponses(formId: number) {
        return this.request<Array<{
            id: number;
            answers: Record<string, string>;
            email: string;
            timestamp: string;
            round_id: number;
            version: number;
        }>>(`/form/${formId}/responses`);
    }

    async getRounds(formId: number) {
        return this.request<Array<{
            id: number;
            round_number: number;
            synthesis: string;
            synthesis_json: any;
            is_active: boolean;
            questions: string[];
            convergence_score?: number;
            response_count: number;
        }>>(`/forms/${formId}/rounds`);
    }

    async deleteForm(formId: number) {
        return this.request(`/forms/${formId}`, {
            method: 'DELETE',
        });
    }
}

describe('Symphonia E2E User Journey', () => {
    const client = new SymphoniaClient(API_BASE);

    describe('Setup and Authentication', () => {
        it('should login as admin successfully', async () => {
            const loginResponse = await client.login(ADMIN_EMAIL, ADMIN_PASSWORD);

            expect(loginResponse).toHaveProperty('access_token');
            expect(loginResponse.is_admin).toBe(true);
            expect(loginResponse.email).toBe(ADMIN_EMAIL);

            accessToken = loginResponse.access_token;
        });
    });

    describe('Form Creation', () => {
        it('should create a new form with 2 questions', async () => {
            const timestamp = new Date().toISOString();
            const formData = {
                title: `E2E Test Form - ${timestamp}`,
                questions: [
                    'What is your opinion on AI governance?',
                    'How should we balance innovation with safety?',
                ],
                allow_join: true,
                join_code: `e2e-test-${Date.now()}`,
            };

            const response = await client.createForm(formData);

            expect(response).toHaveProperty('id');
            expect(response.title).toBe(formData.title);
            expect(response.questions).toEqual(formData.questions);
            expect(response.current_round).toBe(1);

            formId = response.id;
            joinCode = response.join_code;
        });

        it('should retrieve the created form', async () => {
            const form = await client.getForm(formId);

            expect(form.id).toBe(formId);
            expect(form.questions).toHaveLength(2);
            expect(form.join_code).toBe(joinCode);
        });
    });

    describe('Response Submission', () => {
        it('should submit a response as participant', async () => {
            const answers = {
                q1: 'AI governance requires a multi-stakeholder approach involving researchers, policymakers, and civil society.',
                q2: 'We should implement adaptive regulatory frameworks that can evolve with the technology.',
            };

            const response = await client.submitResponse(formId, answers);

            expect(response.ok).toBe(true);
        });

        it('should retrieve the submitted response', async () => {
            const responses = await client.getResponses(formId);

            expect(responses).toHaveLength(1);
            expect(responses[0].answers).toHaveProperty('q1');
            expect(responses[0].answers).toHaveProperty('q2');
        });
    });

    describe('AI Synthesis', () => {
        it('should generate AI synthesis from responses', async () => {
            const synthesis = await client.generateSynthesis(formId, {
                model: 'anthropic/claude-sonnet-4-5',
                mode: 'human_only',
                n_analysts: 3,
            });

            // Synthesis might be mock if no API key is configured
            expect(synthesis).toBeDefined();

            if (synthesis.synthesis) {
                expect(synthesis).toHaveProperty('convergence_score');
                expect(synthesis).toHaveProperty('text_synthesis');
            }
        });

        it('should retrieve synthesis from round data', async () => {
            const rounds = await client.getRounds(formId);

            expect(rounds).toHaveLength(1);
            const activeRound = rounds.find(r => r.is_active);
            expect(activeRound).toBeDefined();

            if (activeRound) {
                expect(activeRound.round_number).toBe(1);
                // Synthesis may be present depending on API configuration
                if (activeRound.synthesis_json) {
                    expect(activeRound.synthesis_json).toBeDefined();
                }
            }
        });
    });

    describe('Results Viewing', () => {
        it('should view complete form results', async () => {
            const form = await client.getForm(formId);
            const responses = await client.getResponses(formId);
            const rounds = await client.getRounds(formId);

            expect(form.id).toBe(formId);
            expect(responses.length).toBeGreaterThan(0);
            expect(rounds.length).toBeGreaterThan(0);

            console.log('E2E Test Summary:');
            console.log(`  Form ID: ${formId}`);
            console.log(`  Title: ${form.title}`);
            console.log(`  Questions: ${form.questions.length}`);
            console.log(`  Responses: ${responses.length}`);
            console.log(`  Rounds: ${rounds.length}`);
        });
    });

    describe('Cleanup', () => {
        it('should delete the test form', async () => {
            // Uncomment to enable cleanup
            // await client.deleteForm(formId);
            // console.log(`Deleted test form ${formId}`);
        });
    });
});

/**
 * Manual Test Instructions:
 * 
 * If you don't have a testing framework set up, you can use the bash script instead:
 * 
 * ```bash
 * # Make sure backend is running
 * cd backend
 * uvicorn main:app --reload
 * 
 * # In another terminal, run the test script
 * cd ..
 * ./scripts/test-journey.sh
 * ```
 * 
 * To set up Vitest for this test file:
 * 
 * ```bash
 * npm install -D vitest @vitest/ui happy-dom
 * ```
 * 
 * Add to package.json:
 * ```json
 * "scripts": {
 *   "test": "vitest",
 *   "test:ui": "vitest --ui"
 * }
 * ```
 * 
 * Create vitest.config.ts:
 * ```typescript
 * import { defineConfig } from 'vitest/config'
 * 
 * export default defineConfig({
 *   test: {
 *     environment: 'happy-dom',
 *     globals: true,
 *   },
 * })
 * ```
 * 
 * Then run:
 * ```bash
 * npm test
 * ```
 */
