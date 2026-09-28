// Dev-only presentation archive. No consultation records are deleted or rewritten.
(()=>{
 if(!['symphonia-dev-488613.web.app','localhost','127.0.0.1'].includes(location.hostname))return;
 const old=new Set([20,23,24,25,26,27,28]);let expanded=false,scheduled=false;
 const style=document.createElement('style');style.textContent='[data-earlier-example][hidden],#delphi-demo-link{display:none!important}#earlier-surveys-toggle{margin:18px 0;padding:10px 14px;background:var(--background);color:var(--muted-foreground);border:1px solid var(--border);border-radius:10px;font:inherit;font-size:13px;min-height:44px}';document.head.append(style);
 function sync(){
  if(location.pathname!=='/'){document.getElementById('earlier-surveys-toggle')?.remove();return;}
  const main=document.querySelector('main')||document.getElementById('main-content');if(!main)return;
  const rows=[];const ids=new Set();
  for(const link of main.querySelectorAll('a[href*="/admin/form/"]')){
   const id=Number(link.getAttribute('href').match(/\/admin\/form\/(\d+)/)?.[1]);
   if(!old.has(id))continue;
   const row=link.closest('tr')||link.closest('[data-inbox-bound]');if(!row||rows.includes(row))continue;
   ids.add(id);rows.push(row);row.dataset.earlierExample='true';if(row.hidden!==!expanded)row.hidden=!expanded;
  }
  const obsolete=document.getElementById('delphi-demo-link');if(obsolete&&!obsolete.hidden)obsolete.hidden=true;
  if(!rows.length)return;
  let button=document.getElementById('earlier-surveys-toggle');
  if(!button){button=document.createElement('button');button.id='earlier-surveys-toggle';button.type='button';button.onclick=()=>{expanded=!expanded;sync()};main.append(button);}
  const text=expanded?'Hide earlier examples':'Earlier examples ('+ids.size+')';if(button.textContent!==text)button.textContent=text;
  button.setAttribute('aria-expanded',String(expanded));
 }
 new MutationObserver(()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;sync()})}).observe(document.body,{childList:true,subtree:true});
 window.addEventListener('popstate',sync);sync();
})();
