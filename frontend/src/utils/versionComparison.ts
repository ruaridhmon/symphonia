import type { SynthesisVersion } from '../types/summary';

export function versionComparisonDefaults(versions: Pick<SynthesisVersion, 'id' | 'version'>[], currentVersionId: number | null) {
  const sorted=[...versions].sort((a,b)=>a.version-b.version);
  const selected=sorted.findIndex(version=>version.id===currentVersionId);
  const index=selected>=0?selected:sorted.length-1;
  const rightId=sorted[index]?.id??null;
  const leftId=sorted[index-1]?.id??sorted[index+1]?.id??rightId;
  return {leftId,rightId};
}
