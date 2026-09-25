/** Present the existing question controls without changing answers, validation or submission. */
export function enhanceParticipantPresentation(main:HTMLElement) {
  const participant=/^\/(?:form\/\d+|public\/session\/)/.test(location.pathname);
  main.classList.toggle('cw-participant',participant);
  if(!participant)return;
  const nav=main.querySelector<HTMLElement>('nav[aria-label="Question sections"]');
  if(nav){
    nav.querySelectorAll<HTMLButtonElement>('button').forEach((button,index)=>{
      const label=button.querySelector('span')?.textContent||button.textContent||'';
      if(button.dataset.step!==String(index+1))button.dataset.step=String(index+1);
      if(button.getAttribute('aria-label')!==label)button.setAttribute('aria-label',label);
      if(button.title!==label)button.title=label;
    });
    main.querySelectorAll<HTMLElement>('section[aria-label]').forEach(section=>{
      const label=section.getAttribute('aria-label');if(!label)return;
      let heading=section.querySelector<HTMLElement>(':scope > .cw-question-heading');
      if(!heading){heading=document.createElement('h2');heading.className='cw-question-heading';section.prepend(heading);}
      if(heading.textContent!==label)heading.textContent=label;
    });
  }
  main.querySelectorAll<HTMLTextAreaElement>('[data-question-key] textarea').forEach(area=>{
    const label=area.closest('[data-question-key]')?.querySelector('label')?.textContent?.replace(/Required|Optional|Not answered yet/g,'').trim();
    if(label&&!area.labels?.length&&area.getAttribute('aria-label')!==label)area.setAttribute('aria-label',label);
  });
}
