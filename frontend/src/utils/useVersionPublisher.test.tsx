import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { applyPublishedVersion, useVersionPublisher } from './useVersionPublisher';
import type { Round, SynthesisVersion } from '../types/summary';

const version: SynthesisVersion = { id: 8, round_id: 4, version: 2, synthesis: 'Saved text', synthesis_json: null, model_used: 'model', strategy: 'grounded', created_at: null, is_active: false };
const options = () => ({ versions: [version], roundId: 4, activate: vi.fn(async () => ({})), onPublished: vi.fn(), onError: vi.fn() });

describe('saved version publishing', () => {
  it('shows pending immediately, blocks duplicate clicks, and completes on the write response', async () => {
    const config = options();
    let resolve!: () => void;
    config.activate.mockImplementation(() => new Promise(r => { resolve = () => r({}); }));
    const { result } = renderHook(() => useVersionPublisher(config));
    let save!: Promise<void>;
    act(() => { save = result.current.publish(8); void result.current.publish(8); });
    expect(result.current.pendingId).toBe(8);
    expect(config.activate).toHaveBeenCalledTimes(1);
    expect(config.onPublished).not.toHaveBeenCalled();
    await act(async () => { resolve(); await save; });
    expect(config.onPublished).toHaveBeenCalledWith(version, true);
    expect(result.current.pendingId).toBeNull();
  });
  it('retains the prior version on failure and permits retry', async () => {
    const config = options();
    config.activate.mockRejectedValueOnce(new Error('Save failed'));
    const { result } = renderHook(() => useVersionPublisher(config));
    await act(async () => { await result.current.publish(8); });
    expect(config.onPublished).not.toHaveBeenCalled();
    expect(config.onError).toHaveBeenCalledWith('Save failed');
    expect(result.current.pendingId).toBeNull();
    await act(async () => { await result.current.publish(8); });
    expect(config.onPublished).toHaveBeenCalledOnce();
  });
  it('does not change the selected history after navigating to another round during publishing', async () => {
    const config = options();
    let resolve!: () => void;
    config.activate.mockImplementation(() => new Promise(r => { resolve = () => r({}); }));
    const { result, rerender } = renderHook(({ roundId }) => useVersionPublisher({ ...config, roundId }), { initialProps: { roundId: 4 } });
    let save!: Promise<void>;
    act(() => { save = result.current.publish(8); });
    rerender({ roundId: 5 });
    await act(async () => { resolve(); await save; });
    expect(config.onPublished).toHaveBeenCalledWith(version, false);
  });
  it('updates only the saved round and retains its questions and settings', () => {
    const round: Round = { id: 4, round_number: 1, synthesis: 'Old', is_active: true, questions: ['Question'], context_settings: { intro_title: 'Context' } };
    expect(applyPublishedVersion(round, version)).toEqual({ ...round, synthesis: 'Saved text', synthesis_json: null });
    const other = { ...round, id: 5 };
    expect(applyPublishedVersion(other, version)).toBe(other);
  });
});
