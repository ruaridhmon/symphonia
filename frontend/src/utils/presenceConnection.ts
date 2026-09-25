import type * as React from 'react';
type Viewer = {email:string; page:string; color:string};
type Options = {formId:number|null;page:string;userEmail:string;onMessage?:(data:Record<string,unknown>)=>void};
/** One connection per consultation. Render callbacks never restart the socket. */
export function createPresenceHook(R:typeof React, url:(path:string)=>string) {
  return function usePresence({formId,page,userEmail,onMessage}:Options) {
    const [viewers,setViewers]=R.useState<Viewer[]>([]);
    const [isConnected,setConnected]=R.useState(false);
    const callback=R.useRef(onMessage); callback.current=onMessage;
    R.useEffect(()=>{
      let disposed=false;
      let socket:WebSocket|null=null;
      let retry:ReturnType<typeof setTimeout>|undefined;
      let heartbeat:ReturnType<typeof setInterval>|undefined;
      let failures=0;
      setViewers([]);setConnected(false);
      if(!formId)return;
      const connect=()=>{
        if(disposed)return;
        const ws=new WebSocket(url('/ws'));socket=ws;
        ws.onopen=()=>{
          if(disposed||socket!==ws){ws.close();return;}
          setConnected(true);
          ws.send(JSON.stringify({type:'presence_join',form_id:formId,page,user_email:userEmail}));
          heartbeat=setInterval(()=>{
            if(ws.readyState===WebSocket.OPEN){
              failures=0; // Only a stable connection resets backoff.
              ws.send(JSON.stringify({type:'presence_heartbeat',form_id:formId}));
            }
          },15000);
        };
        ws.onmessage=event=>{
          if(disposed||socket!==ws)return;
          try{const data=JSON.parse(event.data);if(data.type==='presence_update'&&data.form_id===formId)setViewers(data.viewers||[]);else callback.current?.(data);}catch{/* Ignore malformed events. */}
        };
        ws.onclose=()=>{
          if(disposed||socket!==ws)return;
          socket=null;setConnected(false);clearInterval(heartbeat);
          failures+=1;if(failures>=4)return;
          retry=setTimeout(connect,Math.min(1500*2**(failures-1),15000));
        };
        ws.onerror=()=>ws.close();
      };
      const resume=()=>{if(!socket&&!disposed){clearTimeout(retry);failures=0;connect();}};
      window.addEventListener('online',resume);
      connect();
      return()=>{
        window.removeEventListener('online',resume);
        disposed=true;clearTimeout(retry);clearInterval(heartbeat);
        if(socket){
          socket.onopen=null;socket.onmessage=null;socket.onclose=null;socket.onerror=null;
          if(socket.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:'presence_leave',form_id:formId}));
          socket.close();socket=null;
        }
      };
    },[formId,page,userEmail]);
    return {viewers,isConnected};
  };
}
