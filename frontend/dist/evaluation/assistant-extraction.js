/* Read-only saved experiment explorer. No provider or live consultation calls. */
(()=>{
 const $=id=>document.getElementById(id),make=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
 const pct=n=>(100*n).toFixed(1)+'%';let data;
 function render(){
  const p=data.panels.find(p=>p.id===$('assistant-panel').value),relaxed=$('assistant-rule').value==='relaxed';
  const result=$('assistant-panel-result');result.replaceChildren();
  result.append(make('p',`${p.title} · ${p.people.map(q=>q.id).join(' + ')} · ${p.word_count} extracted words`,'small'));
  result.append(make('h3',`${pct(relaxed?p.relaxed_coverage:p.coverage)} coverage · ${pct(relaxed?p.relaxed_faithfulness:p.faithfulness)} faithfulness`));
  result.append(make('p',`${relaxed?8:p.faithful} / ${p.reference_count} focal claims credited; ${relaxed?8:p.faithful} / 8 extractions credited. ${p.partial} partial labels. Omitted focal IDs: ${p.omitted_ids.join(', ')}.`, 'small'));
  if(relaxed)result.append(make('p','Sensitivity view only: this accepts the partial judgments without changing any saved extraction or review label.','notice'));
  const full=make('details');full.append(make('summary','Read both complete original responses'));
  for(const person of p.people){full.append(make('h3',person.id),make('p',person.text,'assistant-source'),make('p',`Archive: ${person.source_call}`,'small'));}
  result.append(full);
  const nodes=[...p.extractions].sort((a,b)=>(a.judgment==='partial'?0:1)-(b.judgment==='partial'?0:1)||a.index-b.index).map(a=>{
   const d=make('details',undefined,'assistant-claim');d.open=a.judgment==='partial';
   const title=make('summary');title.append(make('span',`${a.index}. ${a.text}`),make('span',`${a.reference_id} · ${a.judgment==='partial'?'Partial: '+a.issue:'Provisionally faithful'}`,'assistant-tag '+(a.judgment==='partial'?'partial':'')));d.append(title);
   d.append(make('p',a.rationale));
   const sources=make('details');sources.append(make('summary',`Original source paragraphs: ${a.source_people.join(', ')}`));
   for(const id of a.source_people){const person=p.people.find(q=>q.id===id);sources.append(make('h3',id),make('blockquote',person.text));}
   d.append(sources);return d;
  });$('assistant-decisions').replaceChildren(...nodes);
 }
 fetch('assistant-extraction/results.json').then(r=>{if(!r.ok)throw Error('Saved results unavailable');return r.json()}).then(d=>{
  data=d;const s=d.summary;
  $('assistant-stats').replaceChildren(...[[String(s.panels),'test panels across four scenarios'],[`${s.faithful} / ${s.extracted_claims}`,'strictly faithful extractions; provisional'],[pct(s.pooled_coverage),'pooled focal-claim coverage']].map(([value,label])=>{const n=make('div');n.append(make('strong',value),make('span',label));return n}));
  $('assistant-panel').replaceChildren(...d.panels.map(p=>{const o=make('option',`${p.title} · panel ${p.id.slice(-2)} · ${p.partial} partial labels`);o.value=p.id;return o}));
  $('assistant-panel').value='pilot-001-03';
  $('assistant-methods').replaceChildren(...Object.entries(d.rubric).map(([key,value])=>{const p=make('p');p.append(make('strong',key.charAt(0).toUpperCase()+key.slice(1)+': '),document.createTextNode(value));return p}));
  $('assistant-panel').onchange=render;$('assistant-rule').onchange=render;render();
 }).catch(e=>{$('assistant-panel-result').textContent='Could not load the saved experiment. Please refresh. '+e.message;});
})();
