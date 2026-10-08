import { useRef, useState } from 'react';
import type { Round, SynthesisVersion } from '../types/summary';

type Options = {
  versions: SynthesisVersion[];
  roundId: number | null;
  activate: (id: number) => Promise<unknown>;
  onPublished: (version: SynthesisVersion, isCurrentRound: boolean) => void;
  onError: (message: string) => void;
};

/** Acknowledge the committed version without reloading the consultation. */
export function useVersionPublisher(options: Options) {
  const latest = useRef(options);
  latest.current = options;
  const inFlight = useRef(false);
  const [pendingId, setPendingId] = useState<number | null>(null);

  async function publish(id: number) {
    if (inFlight.current) return;
    const version = options.versions.find(v => v.id === id && v.round_id === options.roundId);
    if (!version || version.is_active) return;
    inFlight.current = true;
    setPendingId(id);
    try {
      await options.activate(id);
      latest.current.onPublished(version, latest.current.roundId === version.round_id);
    } catch (error) {
      latest.current.onError((error as Error).message || 'Failed to publish version');
    } finally {
      inFlight.current = false;
      setPendingId(null);
    }
  }
  return { pendingId, publish };
}

export function applyPublishedVersion<T extends Round>(round: T, version: SynthesisVersion): T {
  return round.id === version.round_id
    ? { ...round, synthesis: version.synthesis || '', synthesis_json: version.synthesis_json }
    : round;
}
