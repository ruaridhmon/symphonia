// host:react
import { r as React } from "/assets/vendor-react-D3EY6NCv.js";
var { useState, useEffect, useMemo, useRef, useCallback, useId, createElement, Fragment } = React;

// src/utils/useVersionPublisher.ts
function useVersionPublisher(options) {
  const latest = useRef(options);
  latest.current = options;
  const inFlight = useRef(false);
  const [pendingId, setPendingId] = useState(null);
  async function publish(id) {
    if (inFlight.current) return;
    const version = options.versions.find((v) => v.id === id && v.round_id === options.roundId);
    if (!version || version.is_active) return;
    inFlight.current = true;
    setPendingId(id);
    try {
      await options.activate(id);
      latest.current.onPublished(version, latest.current.roundId === version.round_id);
    } catch (error) {
      latest.current.onError(error.message || "Failed to publish version");
    } finally {
      inFlight.current = false;
      setPendingId(null);
    }
  }
  return { pendingId, publish };
}
function applyPublishedVersion(round, version) {
  return round.id === version.round_id ? { ...round, synthesis: version.synthesis || "", synthesis_json: version.synthesis_json } : round;
}
export {
  applyPublishedVersion,
  useVersionPublisher
};
