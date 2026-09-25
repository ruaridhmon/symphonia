import * as React from 'react';
import { renderHook, act, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createPresenceHook } from './presenceConnection';
class Socket {
 static OPEN=1;static CONNECTING=0;readyState=0;onopen:any;onmessage:any;onclose:any;onerror:any;
 static all:Socket[]=[];
 constructor(_url:string){Socket.all.push(this);}
 send=vi.fn();close=vi.fn(()=>{this.readyState=3;this.onclose?.();});
}
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.useRealTimers();Socket.all=[];});
it('keeps one connection across callback changes and delivers to the latest callback',()=>{
 vi.stubGlobal('WebSocket',Socket);
 const usePresence=createPresenceHook(React,()=>'/ws');const first=vi.fn(),second=vi.fn();
 const {rerender,unmount}=renderHook(({onMessage})=>usePresence({formId:1,page:'summary',userEmail:'example',onMessage}),{initialProps:{onMessage:first}});
 expect(Socket.all).toHaveLength(1);const socket=Socket.all[0];act(()=>{socket.readyState=1;socket.onopen();});
 rerender({onMessage:second});expect(Socket.all).toHaveLength(1);
 act(()=>socket.onmessage({data:JSON.stringify({type:'synthesis_complete'})}));expect(second).toHaveBeenCalledOnce();expect(first).not.toHaveBeenCalled();
 unmount();expect(socket.close).toHaveBeenCalledOnce();expect(socket.onclose).toBeNull();
});
it('closes a connecting socket on unmount and bounds repeated failures',()=>{
 vi.useFakeTimers();vi.stubGlobal('WebSocket',Socket);
 const usePresence=createPresenceHook(React,()=>'/ws');
 const {unmount}=renderHook(()=>usePresence({formId:1,page:'summary',userEmail:'example'}));
 for(let i=0;i<4;i++)act(()=>{Socket.all.at(-1)!.onclose();vi.advanceTimersByTime(16000);});
 expect(Socket.all).toHaveLength(4);unmount();act(()=>vi.advanceTimersByTime(60000));expect(Socket.all).toHaveLength(4);
 const next=renderHook(()=>usePresence({formId:2,page:'summary',userEmail:'example'}));const connecting=Socket.all.at(-1)!;next.unmount();expect(connecting.close).toHaveBeenCalledOnce();
});
