import {expect,it} from 'vitest';
import {draftError} from './draftError';
it('replaces a hosting error page with a useful message',()=>{expect(draftError(new Error('<!DOCTYPE html><html><style>body{}</style>502</html>'))).not.toMatch(/html|style/);});
it('preserves actionable backend validation details',()=>{expect(draftError(new Error('{"detail":"Responses changed while the draft was generated."}'))).toBe('Responses changed while the draft was generated.');});
