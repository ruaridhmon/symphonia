/** Follow a reasoning connection in place; supporting evidence opens only on the claim itself. */
export function focusClaim(target:HTMLElement|null){
 if(!target)return;
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 target.scrollIntoView?.({block:'nearest',behavior:reduced?'auto':'smooth'});
 target.focus({preventScroll:true});
 const row=target.closest<HTMLElement>('.rf-claim-row,.di-claim')||target;
 row.classList.remove('claim-reference-highlight');
 void row.offsetWidth;
 row.classList.add('claim-reference-highlight');
 row.addEventListener('animationend',()=>row.classList.remove('claim-reference-highlight'),{once:true});
}
