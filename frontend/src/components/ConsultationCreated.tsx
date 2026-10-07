import {useState} from 'react';
export default function ConsultationCreated({title,joinCode,allowJoin,publicResponses,onContinue,onEdit}:{title:string;joinCode:string;allowJoin:boolean;publicResponses:boolean;onContinue:()=>void;onEdit:()=>void}){
 const [copied,setCopied]=useState('');
 const [error,setError]=useState('');
 const link=new URL(`/share/${encodeURIComponent(joinCode)}`,window.location.origin).toString();
 const canShare=!!joinCode&&(allowJoin||publicResponses);
 async function copy(value:string,kind:string){try{await navigator.clipboard.writeText(value);setCopied(kind);setError('');}catch{setError('Could not copy. Select the link or code and copy it manually.');}}
 return <main className="form-canvas fc-composer"><header className="fc-toolbar"><button onClick={onContinue}>Open consultation</button><span role="status">Consultation created</span></header><div className="fc-paper fc-created">
  <p className="fc-eyebrow">Ready for your panel</p><h1>{title}</h1>
  {canShare?<><p className="fc-created-intro">Invite your participants to share their views.</p><label className="fc-setting-field">Participant link<div className="fc-copy-row"><input aria-label="Participant link" readOnly value={link} onFocus={e=>e.target.select()}/><button onClick={()=>copy(link,'link')}>{copied==='link'?'Copied':'Copy link'}</button></div></label>
  {allowJoin?<label className="fc-setting-field">Invitation code<div className="fc-copy-row"><input aria-label="Invitation code" readOnly value={joinCode} onFocus={e=>e.target.select()}/><button onClick={()=>copy(joinCode,'code')}>{copied==='code'?'Copied':'Copy code'}</button></div></label>:null}
  <p className="fc-created-access">{publicResponses?'Participants can enter their name and respond without an account.':'Participants will sign in before responding.'}</p>
  <a className="fc-participant-link" href={link} target="_blank" rel="noopener noreferrer">Open participant view</a></>:<><p>Participant access is turned off. Enable invitation codes or a public share link in Settings when you’re ready.</p><button onClick={onEdit}>Edit access settings</button></>}
  {error?<p role="alert" className="fc-error">{error}</p>:null}<p className="sr-only" role="status">{copied?`${copied==='link'?'Participant link':'Invitation code'} copied`:''}</p>
  <div className="fc-created-footer"><button onClick={onEdit}>Edit consultation</button><button className="cw-primary" onClick={onContinue}>Open consultation</button></div>
 </div></main>;
}
