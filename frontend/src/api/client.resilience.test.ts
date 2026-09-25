import {afterEach,expect,it,vi} from 'vitest';
import {api,ApiError} from './client';
afterEach(()=>{vi.unstubAllGlobals();localStorage.clear();});
it('retains login state after a network interruption',async()=>{
 localStorage.setItem('access_token','synthetic-test-token');
 vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
 await expect(api.get('/forms')).rejects.toMatchObject({status:0,message:expect.stringContaining('Connection interrupted')});
 expect(localStorage.getItem('access_token')).toBe('synthetic-test-token');
});
it('reports proxy HTML as a server failure rather than deleting the session',async()=>{
 localStorage.setItem('access_token','synthetic-test-token');
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('<html>Temporarily unavailable</html>',{headers:{'content-type':'text/html'}})));
 await expect(api.get('/forms')).rejects.toMatchObject({status:502});expect(localStorage.getItem('access_token')).toBe('synthetic-test-token');
});
