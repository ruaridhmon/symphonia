import{j as e}from"./vendor-markdown-8e9c571a.js";import{r as m,u as Ie,b as ms,f as gs}from"./vendor-react-cff1603b.js";import{E as ps,u as xs,S as hs,U as vs,P as fs}from"./vendor-tiptap-8421aa62.js";import{F as te,P as ae,T as Ce,a as bs,b as ys}from"./vendor-docx-5da7a7ad.js";import{u as js}from"./useDocumentTitle-dacbf0e5.js";import{a as W,A as ks,b as Ns,u as ws,g as _s}from"./index-bd745655.js";import{a as Cs}from"./forms-25d3653b.js";import{f as Ss,u as $s,a as Es,g as zs,b as As,n as Ts,c as Ds}from"./usePresence-ebbdd05e.js";import{L,e as Q}from"./questions-f5b3c7b5.js";import{C as Rs,M as J,P as Fs,S as Le,R as Ms,a as Is,b as Ls}from"./PasswordInput-ce4b36b7.js";import{i as qs,j as Se,k as qe,l as Ps,m as Hs,n as ne,f as Pe,B as Bs,h as He,U as Be,o as Us,p as Gs,I as Os,Z as Ue,q as Qs,r as Ws,T as le,s as Ks,t as ce,e as ge,G as Vs,X as pe,u as $e,v as Ee,w as me,x as Ge,y as ze,z as Js,A as Xs,D as Ys,F as Zs,E as et,H as st,J as tt,N as nt,O as rt}from"./vendor-icons-fba89f86.js";import{b as U,a as se}from"./Skeleton-7cb61f3f.js";function ot(s,t){return W.get(`/forms/${s}/rounds/${t}/synthesis_versions`)}function at(s){return W.put(`/synthesis_versions/${s}/activate`,{})}function it(s,t,n){return W.post(`/forms/${s}/rounds/${t}/generate_synthesis`,n)}function lt(s,t){return W.post(`/forms/${s}/push_summary`,{summary:t})}async function ct(s,t){const n={}.VITE_API_BASE_URL??"",o=localStorage.getItem("access_token");function r(i){const a=document.cookie.match(new RegExp(`(?:^|; )${i}=([^;]*)`));return a?decodeURIComponent(a[1]):null}const l=r("csrf_token"),d=await fetch(`${n}/forms/${s}/export_synthesis?format=${t}`,{method:"GET",credentials:"include",headers:{...l?{"X-CSRF-Token":l}:{},...o?{Authorization:`Bearer ${o}`}:{}}});if(!d.ok)throw new Error(`Export failed: ${d.statusText}`);const p=await d.blob(),u=(d.headers.get("Content-Disposition")||"").match(/filename="?([^";\n]+)"?/),v=(u==null?void 0:u[1])||`synthesis-export.${t==="json"?"json":t==="pdf"?"pdf":"md"}`;return{blob:p,filename:v}}function dt(s,t){return W.post(`/forms/${s}/rounds/${t}/devil_advocate`)}function ut(s,t,n,o){return W.post(`/forms/${s}/rounds/${t}/translate`,{audience:n,synthesis_text:o})}function mt(s,t,n){return W.post(`/forms/${s}/rounds/${t}/voice_mirror`,{responses:n})}function gt(s,t){return t[s]||`Expert ${s}`}function ie(s,t){return s.map(n=>gt(n,t)).join(", ")}function pt(s){switch(s==null?void 0:s.toLowerCase()){case"high":return"[HIGH]";case"medium":return"[MED]";case"low":return"[LOW]";default:return"[—]"}}function xt(s,t,n,o){var d,p,g,u,v,i;const r=[],l=new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});r.push(`# ${s}`),r.push(""),r.push(`**Exported:** ${l}  `),r.push(`**Rounds:** ${t.length}`),r.push(""),r.push("---"),r.push("");for(const a of t)r.push(`## Round ${a.round_number}`),r.push(""),a.convergence_score!=null&&(r.push(`**Convergence Score:** ${(a.convergence_score*100).toFixed(0)}%`),r.push("")),a.response_count!=null&&(r.push(`**Responses:** ${a.response_count}`),r.push("")),a.questions.length>0&&(r.push("### Questions"),r.push(""),a.questions.forEach((c,f)=>{r.push(`${f+1}. ${c}`)}),r.push("")),a.synthesis&&(r.push("### Narrative Synthesis"),r.push(""),r.push(a.synthesis),r.push("")),r.push("---"),r.push("");if(n){if(r.push("## Structured Analysis"),r.push(""),n.narrative&&(r.push("### Narrative"),r.push(""),r.push(n.narrative),r.push("")),(d=n.agreements)!=null&&d.length){r.push("### Agreements"),r.push("");for(const a of n.agreements){const c=(a.confidence*100).toFixed(0);if(r.push(`- **${a.claim}** (${c}% confidence)`),r.push(`  - Supporting experts: ${ie(a.supporting_experts,o)}`),a.evidence_summary&&r.push(`  - Evidence: ${a.evidence_summary}`),(p=a.evidence_excerpts)!=null&&p.length){r.push("  - **Supporting Excerpts:**");for(const f of a.evidence_excerpts){const k=o[f.expert_id]||f.expert_label||`Expert ${f.expert_id}`;r.push(`    - _${k}_: "${f.quote}"`)}}}r.push("")}if((g=n.disagreements)!=null&&g.length){r.push("### Disagreements"),r.push("");for(const a of n.disagreements){r.push(`- **${a.topic}** ${pt(a.severity)} Severity: ${a.severity}`);for(const c of a.positions)r.push(`  - *${c.position}*`),r.push(`    - Experts: ${ie(c.experts,o)}`),c.evidence&&r.push(`    - Evidence: ${c.evidence}`)}r.push("")}if((u=n.nuances)!=null&&u.length){r.push("### Nuances"),r.push("");for(const a of n.nuances)r.push(`- **${a.claim}**`),r.push(`  - Context: ${a.context}`),r.push(`  - Relevant experts: ${ie(a.relevant_experts,o)}`);r.push("")}if((v=n.follow_up_probes)!=null&&v.length){r.push("### Follow-up Probes"),r.push("");for(const a of n.follow_up_probes)r.push(`- **${a.question}**`),r.push(`  - Target experts: ${ie(a.target_experts,o)}`),a.rationale&&r.push(`  - Rationale: ${a.rationale}`);r.push("")}if(Object.keys(o).length>0){r.push("### Expert Dimensions"),r.push("");for(const[a,c]of Object.entries(o))r.push(`- Expert ${a}: **${c}**`);r.push("")}if((i=n.emergent_insights)!=null&&i.length){r.push("### Emergent Insights"),r.push("");for(const a of n.emergent_insights)typeof a=="string"?r.push(`- ${a}`):a.title||a.description?(r.push(`- **${a.title||"Insight"}**: ${a.description||""}`),a.supporting_evidence&&r.push(`  - Evidence: ${a.supporting_evidence}`)):r.push(`- ${JSON.stringify(a)}`);r.push("")}if(n.confidence_map&&Object.keys(n.confidence_map).length>0){r.push("### Confidence Map"),r.push("");for(const[a,c]of Object.entries(n.confidence_map))r.push(`- ${a}: ${(c*100).toFixed(0)}%`);r.push("")}n.meta_synthesis_reasoning&&(r.push("### Meta-Synthesis Reasoning"),r.push(""),r.push(n.meta_synthesis_reasoning),r.push(""))}return r.push("---"),r.push("*Generated by Symphonia*"),r.join(`
`)}function ht(s,t,n,o){const r=Oe(s,t,n,o),l=r.replace("</body>","<script>window.addEventListener('load', function() { setTimeout(function() { window.print(); }, 600); });<\/script></body>"),d=window.open("","_blank");if(d)d.document.write(l),d.document.close();else{const p=new Blob([r],{type:"text/html;charset=utf-8"}),g=`${s.replace(/[^a-zA-Z0-9]+/g,"-").toLowerCase()}-report.html`;te.saveAs(p,g)}}function Oe(s,t,n,o){var k,z,$,F,w;const r=new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}),l=t.reduce((x,j)=>x+(j.response_count??0),0),d=Object.keys(o).length,p=t.filter(x=>x.convergence_score!=null).map(x=>x.convergence_score).pop();let g="";(k=n==null?void 0:n.agreements)!=null&&k.length&&(g=n.agreements.map(x=>{var N;const j=(x.confidence*100).toFixed(0),C=x.supporting_experts.map(b=>o[b]||`Expert ${b}`).join(", ");let A="";return(N=x.evidence_excerpts)!=null&&N.length&&(A='<div class="evidence-box"><p class="evidence-title">Supporting Evidence</p>'+x.evidence_excerpts.map(b=>{const S=o[b.expert_id]||b.expert_label||`Expert ${b.expert_id}`;return`<blockquote>&ldquo;${E(b.quote)}&rdquo;<br/><cite>&mdash; ${E(S)}</cite></blockquote>`}).join("")+"</div>"),`<div class="finding-card agreement">
        <div class="finding-header"><span class="finding-type">Area of Agreement</span><span class="confidence-badge">${j}% confidence</span></div>
        <h4>${E(x.claim)}</h4>
        <p class="experts-line">Supported by: ${E(C)}</p>
        ${x.evidence_summary?`<p>${E(x.evidence_summary)}</p>`:""}
        ${A}
      </div>`}).join(`
`));let u="";(z=n==null?void 0:n.disagreements)!=null&&z.length&&(u=n.disagreements.map(x=>{var A;const j=((A=x.severity)==null?void 0:A.toLowerCase())||"medium",C=x.positions.map(N=>{const b=N.experts.map(S=>o[S]||`Expert ${S}`).join(", ");return`<div class="position-block">
          <p class="position-text">${E(N.position)}</p>
          <p class="experts-line">Held by: ${E(b)}</p>
          ${N.evidence?`<p class="evidence-text">${E(N.evidence)}</p>`:""}
        </div>`}).join("");return`<div class="finding-card disagreement severity-${j}">
        <div class="finding-header"><span class="finding-type">Area of Disagreement</span><span class="severity-badge severity-${j}">${j.toUpperCase()}</span></div>
        <h4>${E(x.topic)}</h4>
        ${C}
      </div>`}).join(`
`));let v="";($=n==null?void 0:n.nuances)!=null&&$.length&&(v=n.nuances.map(x=>{const j=x.relevant_experts.map(C=>o[C]||`Expert ${C}`).join(", ");return`<div class="finding-card nuance">
        <div class="finding-header"><span class="finding-type">Nuance</span></div>
        <h4>${E(x.claim)}</h4>
        <p>${E(x.context)}</p>
        <p class="experts-line">Relevant experts: ${E(j)}</p>
      </div>`}).join(`
`));let i="";(F=n==null?void 0:n.follow_up_probes)!=null&&F.length&&(i='<ol class="probes-list">'+n.follow_up_probes.map(x=>{const j=x.target_experts.map(C=>o[C]||`Expert ${C}`).join(", ");return`<li>
        <strong>${E(x.question)}</strong>
        <br/><span class="experts-line">Target: ${E(j)}</span>
        ${x.rationale?`<br/><span class="rationale">${E(x.rationale)}</span>`:""}
      </li>`}).join("")+"</ol>");const a=t.map(x=>{const j=x.convergence_score!=null?`${(x.convergence_score*100).toFixed(0)}%`:"—";return`<tr><td>Round ${x.round_number}</td><td>${x.response_count??"—"}</td><td>${j}</td><td>${x.questions.length}</td></tr>`}).join("");let c="";(w=n==null?void 0:n.emergent_insights)!=null&&w.length&&(c=n.emergent_insights.map(x=>typeof x=="string"?`<li>${E(x)}</li>`:`<li><strong>${E(x.title||"Insight")}:</strong> ${E(x.description||"")}${x.supporting_evidence?`<br/><em>Evidence: ${E(x.supporting_evidence)}</em>`:""}</li>`).join(""),c=`<ul class="insights-list">${c}</ul>`);let f="";return n!=null&&n.confidence_map&&Object.keys(n.confidence_map).length>0&&(f=Object.entries(n.confidence_map).map(([x,j])=>{const C=(j*100).toFixed(0);return`<div class="confidence-bar-row">
        <span class="confidence-topic">${E(x)}</span>
        <div class="confidence-bar-track"><div class="confidence-bar-fill" style="width:${C}%"></div></div>
        <span class="confidence-pct">${C}%</span>
      </div>`}).join("")),`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${E(s)} — Expert Consultation Report</title>
<style>
  /* GOV.UK-inspired design system */
  :root {
    --govuk-black: #0b0c0c;
    --govuk-blue: #1d70b8;
    --govuk-dark-blue: #003078;
    --govuk-green: #00703c;
    --govuk-red: #d4351c;
    --govuk-yellow: #ffdd00;
    --govuk-light-grey: #f3f2f1;
    --govuk-mid-grey: #b1b4b6;
    --govuk-dark-grey: #505a5f;
    --govuk-white: #ffffff;
    --govuk-border: #b1b4b6;
    --govuk-link: #1d70b8;
    --govuk-focus: #ffdd00;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: "GDS Transport", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 19px;
    line-height: 1.47368;
    color: var(--govuk-black);
    background: var(--govuk-white);
    -webkit-font-smoothing: antialiased;
  }

  /* Header bar */
  .govuk-header {
    background: var(--govuk-black);
    border-bottom: 10px solid var(--govuk-blue);
    padding: 10px 0;
  }
  .govuk-header__container {
    max-width: 960px;
    margin: 0 auto;
    padding: 0 30px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .govuk-header__title {
    color: var(--govuk-white);
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  .govuk-header__badge {
    color: var(--govuk-white);
    font-size: 14px;
    opacity: 0.8;
  }

  /* Phase banner */
  .govuk-phase-banner {
    max-width: 960px;
    margin: 0 auto;
    padding: 10px 30px;
    border-bottom: 1px solid var(--govuk-border);
  }
  .govuk-phase-banner__tag {
    display: inline-block;
    background: var(--govuk-blue);
    color: var(--govuk-white);
    font-size: 14px;
    font-weight: 700;
    padding: 2px 8px;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-right: 8px;
  }
  .govuk-phase-banner__text {
    font-size: 16px;
    color: var(--govuk-dark-grey);
  }

  /* Main content */
  .govuk-width-container {
    max-width: 960px;
    margin: 0 auto;
    padding: 0 30px;
  }
  .govuk-main-wrapper {
    padding: 40px 0 80px;
  }

  /* Typography */
  .govuk-heading-xl {
    font-size: 48px;
    line-height: 1.04167;
    font-weight: 700;
    margin-bottom: 30px;
    color: var(--govuk-black);
  }
  .govuk-heading-l {
    font-size: 36px;
    line-height: 1.11111;
    font-weight: 700;
    margin-top: 50px;
    margin-bottom: 20px;
    color: var(--govuk-black);
  }
  .govuk-heading-m {
    font-size: 24px;
    line-height: 1.25;
    font-weight: 700;
    margin-top: 30px;
    margin-bottom: 15px;
    color: var(--govuk-black);
  }
  .govuk-heading-s {
    font-size: 19px;
    line-height: 1.31579;
    font-weight: 700;
    margin-top: 20px;
    margin-bottom: 10px;
  }
  .govuk-body { margin-bottom: 20px; }
  .govuk-body-s { font-size: 16px; color: var(--govuk-dark-grey); }
  .govuk-body-l { font-size: 24px; line-height: 1.25; }

  /* Section break */
  .govuk-section-break {
    border: 0;
    border-bottom: 1px solid var(--govuk-border);
    margin: 30px 0;
  }
  .govuk-section-break--xl { margin: 50px 0; border-bottom-width: 4px; }
  .govuk-section-break--visible { border-color: var(--govuk-border); }

  /* Summary list (metadata) */
  .govuk-summary-list {
    margin-bottom: 30px;
  }
  .govuk-summary-list__row {
    display: flex;
    border-bottom: 1px solid var(--govuk-border);
    padding: 10px 0;
  }
  .govuk-summary-list__key {
    flex: 0 0 200px;
    font-weight: 700;
    padding-right: 20px;
  }
  .govuk-summary-list__value {
    flex: 1;
  }

  /* Tags */
  .govuk-tag {
    display: inline-block;
    padding: 2px 8px;
    font-size: 14px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--govuk-white);
    background: var(--govuk-blue);
  }
  .govuk-tag--green { background: var(--govuk-green); }
  .govuk-tag--red { background: var(--govuk-red); }
  .govuk-tag--yellow { background: #594d00; color: var(--govuk-yellow); }

  /* Table */
  .govuk-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
  .govuk-table__header, .govuk-table__cell {
    padding: 10px 20px 10px 0;
    border-bottom: 1px solid var(--govuk-border);
    text-align: left;
    vertical-align: top;
  }
  .govuk-table__header { font-weight: 700; }

  /* Inset text (for quotes/evidence) */
  .govuk-inset-text {
    border-left: 10px solid var(--govuk-mid-grey);
    padding: 15px;
    margin: 20px 0;
    clear: both;
  }

  /* Panel (summary box) */
  .govuk-panel {
    background: var(--govuk-green);
    color: var(--govuk-white);
    padding: 35px;
    text-align: center;
    margin-bottom: 30px;
  }
  .govuk-panel__title {
    font-size: 48px;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 15px;
  }
  .govuk-panel__body {
    font-size: 36px;
    line-height: 1.25;
  }

  /* Warning text */
  .govuk-warning-text {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 15px 0;
    margin-bottom: 20px;
  }
  .govuk-warning-text__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 35px;
    height: 35px;
    border-radius: 50%;
    background: var(--govuk-black);
    color: var(--govuk-white);
    font-weight: 700;
    font-size: 24px;
    flex-shrink: 0;
  }
  .govuk-warning-text__text { font-weight: 700; }

  /* Custom findings cards */
  .finding-card {
    border: 1px solid var(--govuk-border);
    border-left: 5px solid var(--govuk-blue);
    padding: 20px;
    margin-bottom: 20px;
    background: var(--govuk-white);
  }
  .finding-card.agreement { border-left-color: var(--govuk-green); }
  .finding-card.disagreement { border-left-color: var(--govuk-red); }
  .finding-card.nuance { border-left-color: #f47738; }
  .finding-card.severity-high { border-left-color: var(--govuk-red); }
  .finding-card.severity-medium { border-left-color: #f47738; }
  .finding-card.severity-low { border-left-color: var(--govuk-blue); }

  .finding-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  .finding-type { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: var(--govuk-dark-grey); font-weight: 700; }
  .finding-card h4 { font-size: 19px; margin-bottom: 10px; }
  .experts-line { font-size: 16px; color: var(--govuk-dark-grey); margin-bottom: 8px; }
  .evidence-text { font-size: 16px; color: var(--govuk-dark-grey); font-style: italic; }

  .confidence-badge {
    display: inline-block;
    padding: 2px 8px;
    font-size: 14px;
    font-weight: 700;
    background: var(--govuk-light-grey);
    border: 1px solid var(--govuk-border);
  }
  .severity-badge {
    display: inline-block;
    padding: 2px 8px;
    font-size: 14px;
    font-weight: 700;
    color: var(--govuk-white);
  }
  .severity-badge.severity-high { background: var(--govuk-red); }
  .severity-badge.severity-medium { background: #f47738; }
  .severity-badge.severity-low { background: var(--govuk-blue); }

  .evidence-box {
    background: var(--govuk-light-grey);
    padding: 15px;
    margin-top: 10px;
  }
  .evidence-box .evidence-title { font-weight: 700; font-size: 16px; margin-bottom: 10px; }
  .evidence-box blockquote {
    border-left: 4px solid var(--govuk-mid-grey);
    padding: 8px 15px;
    margin: 8px 0;
    font-style: italic;
    font-size: 16px;
  }
  .evidence-box cite { font-style: normal; font-size: 14px; color: var(--govuk-dark-grey); }

  .position-block {
    border-left: 3px solid var(--govuk-mid-grey);
    padding-left: 15px;
    margin: 10px 0;
  }
  .position-text { font-weight: 700; margin-bottom: 5px; }

  /* Confidence bars */
  .confidence-bar-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }
  .confidence-topic { flex: 0 0 200px; font-size: 16px; }
  .confidence-bar-track {
    flex: 1;
    height: 20px;
    background: var(--govuk-light-grey);
    border: 1px solid var(--govuk-border);
  }
  .confidence-bar-fill {
    height: 100%;
    background: var(--govuk-blue);
    transition: width 0.3s;
  }
  .confidence-pct { flex: 0 0 40px; text-align: right; font-size: 16px; font-weight: 700; }

  /* Probes */
  .probes-list li { margin-bottom: 15px; }
  .rationale { font-size: 16px; color: var(--govuk-dark-grey); font-style: italic; }

  /* Insights */
  .insights-list li { margin-bottom: 10px; }

  /* Footer */
  .govuk-footer {
    border-top: 1px solid var(--govuk-border);
    background: var(--govuk-light-grey);
    padding: 30px 0;
    margin-top: 60px;
  }
  .govuk-footer__meta {
    max-width: 960px;
    margin: 0 auto;
    padding: 0 30px;
    font-size: 16px;
    color: var(--govuk-dark-grey);
  }

  /* Print styles */
  @media print {
    body { font-size: 12pt; }
    .govuk-header { border-bottom-width: 4px; }
    .govuk-heading-xl { font-size: 28pt; }
    .govuk-heading-l { font-size: 20pt; }
    .govuk-heading-m { font-size: 16pt; }
    .govuk-panel { background: var(--govuk-white) !important; color: var(--govuk-black) !important; border: 3px solid var(--govuk-black); }
    .govuk-panel__title, .govuk-panel__body { color: var(--govuk-black) !important; }
    .finding-card { break-inside: avoid; }
    .govuk-heading-l, .govuk-heading-m { break-after: avoid; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>

<!-- Header -->
<header class="govuk-header" role="banner">
  <div class="govuk-header__container">
    <span class="govuk-header__title">Symphonia</span>
    <span class="govuk-header__badge">Expert Consultation Report</span>
  </div>
</header>

<!-- Phase banner -->
<div class="govuk-phase-banner">
  <span class="govuk-phase-banner__tag">Report</span>
  <span class="govuk-phase-banner__text">This report was generated from a structured Delphi consultation on ${E(r)}.</span>
</div>

<div class="govuk-width-container">
<main class="govuk-main-wrapper" role="main">

  <h1 class="govuk-heading-xl">${E(s)}</h1>

  <!-- Document metadata -->
  <div class="govuk-summary-list">
    <div class="govuk-summary-list__row">
      <dt class="govuk-summary-list__key">Date</dt>
      <dd class="govuk-summary-list__value">${E(r)}</dd>
    </div>
    <div class="govuk-summary-list__row">
      <dt class="govuk-summary-list__key">Rounds completed</dt>
      <dd class="govuk-summary-list__value">${t.length}</dd>
    </div>
    <div class="govuk-summary-list__row">
      <dt class="govuk-summary-list__key">Total responses</dt>
      <dd class="govuk-summary-list__value">${l}</dd>
    </div>
    <div class="govuk-summary-list__row">
      <dt class="govuk-summary-list__key">Experts consulted</dt>
      <dd class="govuk-summary-list__value">${d}</dd>
    </div>
    ${p!=null?`<div class="govuk-summary-list__row">
      <dt class="govuk-summary-list__key">Final convergence</dt>
      <dd class="govuk-summary-list__value">${(p*100).toFixed(0)}%</dd>
    </div>`:""}
  </div>

  <hr class="govuk-section-break govuk-section-break--xl govuk-section-break--visible" />

  <!-- Executive Summary -->
  <h2 class="govuk-heading-l">1. Executive Summary</h2>
  ${n!=null&&n.narrative?`<p class="govuk-body govuk-body-l">${E(n.narrative)}</p>`:'<p class="govuk-body">No structured synthesis narrative available. See individual round summaries below.</p>'}

  ${n!=null&&n.meta_synthesis_reasoning?`
  <div class="govuk-inset-text">
    <p class="govuk-body-s"><strong>Methodology note:</strong> ${E(n.meta_synthesis_reasoning)}</p>
  </div>`:""}

  <hr class="govuk-section-break govuk-section-break--xl govuk-section-break--visible" />

  <!-- Consultation Rounds -->
  <h2 class="govuk-heading-l">2. Consultation Rounds</h2>

  <table class="govuk-table">
    <thead>
      <tr>
        <th class="govuk-table__header">Round</th>
        <th class="govuk-table__header">Responses</th>
        <th class="govuk-table__header">Convergence</th>
        <th class="govuk-table__header">Questions</th>
      </tr>
    </thead>
    <tbody>${a}</tbody>
  </table>

  ${t.map(x=>`
  <h3 class="govuk-heading-m">Round ${x.round_number}</h3>
  ${x.questions.length>0?`
  <h4 class="govuk-heading-s">Questions posed</h4>
  <ol class="govuk-body">${x.questions.map(j=>`<li style="margin-bottom:8px">${E(j)}</li>`).join("")}</ol>`:""}
  ${x.synthesis?`
  <h4 class="govuk-heading-s">Round synthesis</h4>
  <div class="govuk-inset-text"><p class="govuk-body">${E(x.synthesis)}</p></div>`:""}
  `).join(`
`)}

  ${g||u||v?`
  <hr class="govuk-section-break govuk-section-break--xl govuk-section-break--visible" />

  <!-- Findings -->
  <h2 class="govuk-heading-l">3. Key Findings</h2>

  ${g?`
  <h3 class="govuk-heading-m">3.1 Areas of Agreement</h3>
  ${g}`:""}

  ${u?`
  <h3 class="govuk-heading-m">3.2 Areas of Disagreement</h3>
  <div class="govuk-warning-text">
    <span class="govuk-warning-text__icon" aria-hidden="true">!</span>
    <strong class="govuk-warning-text__text">The following areas show divergent expert opinion. These may require further consultation rounds or policy consideration of multiple approaches.</strong>
  </div>
  ${u}`:""}

  ${v?`
  <h3 class="govuk-heading-m">3.3 Nuances and Qualifications</h3>
  ${v}`:""}
  `:""}

  ${f?`
  <hr class="govuk-section-break govuk-section-break--xl govuk-section-break--visible" />
  <h2 class="govuk-heading-l">4. Confidence Assessment</h2>
  <p class="govuk-body">Confidence levels across key topics, based on expert agreement and evidence quality:</p>
  ${f}`:""}

  ${c?`
  <hr class="govuk-section-break govuk-section-break--xl govuk-section-break--visible" />
  <h2 class="govuk-heading-l">${f?"5":"4"}. Emergent Insights</h2>
  <p class="govuk-body">Cross-cutting themes and unexpected findings that emerged from the consultation:</p>
  ${c}`:""}

  ${i?`
  <hr class="govuk-section-break govuk-section-break--xl govuk-section-break--visible" />
  <h2 class="govuk-heading-l">Annex A: Recommended Follow-up Questions</h2>
  <p class="govuk-body">The following questions are recommended for subsequent consultation rounds:</p>
  ${i}`:""}

  ${d>0?`
  <hr class="govuk-section-break govuk-section-break--xl govuk-section-break--visible" />
  <h2 class="govuk-heading-l">Annex B: Expert Panel</h2>
  <table class="govuk-table">
    <thead><tr><th class="govuk-table__header">ID</th><th class="govuk-table__header">Expertise Dimension</th></tr></thead>
    <tbody>${Object.entries(o).map(([x,j])=>`<tr><td class="govuk-table__cell">Expert ${E(x)}</td><td class="govuk-table__cell">${E(j)}</td></tr>`).join("")}</tbody>
  </table>`:""}

</main>
</div>

<footer class="govuk-footer" role="contentinfo">
  <div class="govuk-footer__meta">
    <p>This report was generated by <strong>Symphonia</strong> &mdash; a structured expert consultation platform using the Delphi method.</p>
    <p>Report generated: ${E(r)}. All expert contributions are anonymised.</p>
  </div>
</footer>

</body>
</html>`}function E(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function vt(s,t,n,o){const r=Oe(s,t,n,o),l=new Blob([r],{type:"text/html;charset=utf-8"}),d=`${s.replace(/[^a-zA-Z0-9]+/g,"-").toLowerCase()}-govuk-report.html`;te.saveAs(l,d)}function ft({formTitle:s,formId:t,rounds:n,structuredSynthesisData:o,expertLabels:r}){const[l,d]=m.useState(!1),[p,g]=m.useState(!1),[u,v]=m.useState(!1),[i,a]=m.useState(!1),[c,f]=m.useState(!1),[k,z]=m.useState(!1),$=()=>{d(!0);try{const j=xt(s,n,o,r),C=new Blob([j],{type:"text/markdown;charset=utf-8"}),A=`${s.replace(/[^a-zA-Z0-9]+/g,"-").toLowerCase()}-synthesis.md`;te.saveAs(C,A)}finally{setTimeout(()=>d(!1),500)}},F=()=>{g(!0);try{ht(s,n,o,r)}finally{setTimeout(()=>g(!1),800)}},w=()=>{v(!0);try{vt(s,n,o,r)}finally{setTimeout(()=>v(!1),800)}},x=async(j,C)=>{C(!0);try{const{blob:A,filename:N}=await ct(t,j);te.saveAs(A,N)}catch(A){console.error("Backend export failed:",A)}finally{C(!1)}};return e.jsxs(e.Fragment,{children:[e.jsx("p",{className:"text-xs font-semibold uppercase tracking-wider mt-2 mb-1",style:{color:"var(--muted-foreground)"},children:"Export Synthesis"}),e.jsx(L,{variant:"secondary",size:"md",onClick:()=>x("markdown",a),loading:i,loadingText:"Downloading…",className:"w-full text-left justify-start",children:"Download as Markdown"}),e.jsx(L,{variant:"secondary",size:"md",onClick:()=>x("json",f),loading:c,loadingText:"Downloading…",className:"w-full text-left justify-start",children:"Download as JSON"}),e.jsx(L,{variant:"secondary",size:"md",onClick:()=>x("pdf",z),loading:k,loadingText:"Downloading…",className:"w-full text-left justify-start",children:"Download as PDF"}),e.jsx("p",{className:"text-xs font-semibold uppercase tracking-wider mt-3 mb-1",style:{color:"var(--muted-foreground)"},children:"Client Reports"}),e.jsx(L,{variant:"secondary",size:"md",onClick:$,loading:l,loadingText:"Exporting…",className:"w-full text-left justify-start",children:"Export as Markdown"}),e.jsx(L,{variant:"secondary",size:"md",onClick:F,loading:p,loadingText:"Preparing PDF…",className:"w-full text-left justify-start",children:"Export as PDF"}),e.jsx(L,{variant:"secondary",size:"md",onClick:w,loading:u,loadingText:"Generating…",className:"w-full text-left justify-start",children:"Export GOV.UK Report"})]})}const bt={preparing:{label:"Preparing responses…",icon:e.jsx(qs,{size:16,style:{color:"var(--accent)"}})},mock_init:{label:"Initialising…",icon:e.jsx(Se,{size:16,style:{color:"var(--accent)"}})},synthesising:{label:"Synthesising insights…",icon:e.jsx(qe,{size:16,style:{color:"var(--accent)"}})},analyzing:{label:"Analysing responses…",icon:e.jsx(Ps,{size:16,style:{color:"var(--accent)"}})},mapping_results:{label:"Mapping results…",icon:e.jsx(Hs,{size:16,style:{color:"var(--accent)"}})},formatting:{label:"Formatting output…",icon:e.jsx(ne,{size:16,style:{color:"var(--accent)"}})},mock_complete:{label:"Wrapping up…",icon:e.jsx(Se,{size:16,style:{color:"var(--accent)"}})},complete:{label:"Complete!",icon:e.jsx(Pe,{size:16,style:{color:"var(--success)"}})},generating:{label:"Generating synthesis…",icon:e.jsx(Bs,{size:16,style:{color:"var(--accent)"}})}},yt={label:"",icon:e.jsx(He,{size:16,style:{color:"var(--muted-foreground)"}})};function jt({stage:s,step:t,totalSteps:n,visible:o}){if(!o)return null;const r=bt[s]||{...yt,label:s},l=n>0?Math.round(t/n*100):0,d=s==="complete"||s==="mock_complete";return e.jsxs("div",{className:`synthesis-progress ${d?"complete":""}`,"aria-live":"polite","aria-atomic":"true",children:[e.jsxs("div",{className:"synthesis-progress-header",children:[e.jsx("span",{className:"synthesis-progress-emoji","aria-hidden":"true",children:r.icon}),e.jsx("span",{className:"synthesis-progress-label",children:r.label}),e.jsxs("span",{className:"synthesis-progress-pct",children:[l,"%"]})]}),e.jsx("div",{className:"synthesis-progress-track",role:"progressbar","aria-valuenow":l,"aria-valuemin":0,"aria-valuemax":100,"aria-label":`Synthesis progress: ${r.label}`,children:e.jsx("div",{className:"synthesis-progress-fill",style:{width:`${l}%`}})}),!d&&e.jsxs("div",{className:"synthesis-progress-steps",children:["Step ",t," of ",n]})]})}function kt(s){if(s==null)return"var(--muted-foreground)";const t=Math.round(s*100);return t>=80?"var(--success)":t>=60?"var(--warning)":"var(--destructive)"}function Nt(s){return s==null?"—":`${Math.round(s*100)}%`}function wt({rounds:s,activeRoundId:t,selectedRoundId:n,onSelectRound:o}){const[r,l]=m.useState(null),d=m.useRef([]),p=m.useRef([]),g=m.useCallback((i,a)=>{var f;let c=-1;i.key==="ArrowRight"||i.key==="ArrowDown"?(i.preventDefault(),c=(a+1)%s.length):i.key==="ArrowLeft"||i.key==="ArrowUp"?(i.preventDefault(),c=(a-1+s.length)%s.length):i.key==="Home"?(i.preventDefault(),c=0):i.key==="End"&&(i.preventDefault(),c=s.length-1),c>=0&&((f=d.current[c])==null||f.focus(),o(s[c]))},[s,o]),u=m.useCallback((i,a)=>{var f;let c=-1;i.key==="ArrowDown"?(i.preventDefault(),c=(a+1)%s.length):i.key==="ArrowUp"?(i.preventDefault(),c=(a-1+s.length)%s.length):i.key==="Home"?(i.preventDefault(),c=0):i.key==="End"&&(i.preventDefault(),c=s.length-1),c>=0&&((f=p.current[c])==null||f.focus(),o(s[c]))},[s,o]);if(s.length===0)return null;const v=s.findIndex(i=>i.id===n);return e.jsxs("div",{className:"round-timeline-v2",children:[e.jsxs("div",{className:"round-timeline-v2-header",children:[e.jsx("h3",{className:"round-timeline-v2-title",children:"Round Navigation"}),e.jsxs("span",{className:"round-timeline-v2-count",children:[s.length," round",s.length!==1?"s":""]})]}),e.jsx("div",{className:"round-timeline-v2-stepper",role:"tablist","aria-label":"Round stepper",children:s.map((i,a)=>{const c=i.is_active,f=i.id===n,k=!!(i.synthesis&&i.synthesis.trim()),z=a===s.length-1;return e.jsxs("div",{className:"round-timeline-v2-step",children:[!z&&e.jsx("div",{className:`round-timeline-v2-connector ${k?"completed":""}`}),e.jsx("button",{ref:$=>{d.current[a]=$},className:["round-timeline-v2-node",c?"active":"",f?"selected":"",k?"has-synthesis":""].filter(Boolean).join(" "),role:"tab","aria-selected":f,tabIndex:f||v===-1&&a===0?0:-1,onClick:()=>o(i),onKeyDown:$=>g($,a),onMouseEnter:()=>l(i.id),onMouseLeave:()=>l(null),"aria-label":`Round ${i.round_number}${c?" (active)":""}${k?" (synthesised)":""}`,children:k?e.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"3",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:e.jsx("polyline",{points:"20 6 9 17 4 12"})}):e.jsx("span",{className:"round-timeline-v2-node-number",children:i.round_number})}),e.jsxs("span",{className:`round-timeline-v2-step-label ${f?"selected":""} ${c?"active":""}`,"aria-hidden":"true",children:["R",i.round_number]})]},i.id)})}),e.jsx("div",{className:"round-timeline-v2-cards",role:"listbox","aria-label":"Round cards",children:s.map((i,a)=>{var z;const c=i.is_active,f=i.id===n,k=!!(i.synthesis&&i.synthesis.trim());return e.jsxs("button",{ref:$=>{p.current[a]=$},className:["round-card-v2",f?"selected":"",c?"current":""].filter(Boolean).join(" "),role:"option","aria-selected":f,tabIndex:f||v===-1&&a===0?0:-1,onClick:()=>o(i),onKeyDown:$=>u($,a),children:[e.jsx("div",{className:"round-card-v2-header",children:e.jsxs("div",{className:"round-card-v2-title-row",children:[e.jsxs("span",{className:"round-card-v2-title",children:["Round ",i.round_number]}),e.jsxs("div",{className:"round-card-v2-badges",children:[c&&e.jsxs("span",{className:"round-card-v2-badge round-card-v2-badge-active",children:[e.jsx("span",{className:"round-card-v2-badge-dot active"}),"Live"]}),k&&!c&&e.jsxs("span",{className:"round-card-v2-badge round-card-v2-badge-complete",children:[e.jsx(Pe,{size:12,style:{color:"var(--success)",display:"inline",verticalAlign:"text-bottom",marginRight:"3px"}}),"Synthesised"]}),!k&&!c&&e.jsx("span",{className:"round-card-v2-badge round-card-v2-badge-pending",children:"Pending"})]})]})}),e.jsxs("div",{className:"round-card-v2-stats",children:[e.jsxs("div",{className:"round-card-v2-stat",children:[e.jsx("span",{className:"round-card-v2-stat-icon",children:e.jsx(Be,{size:14,style:{color:"var(--muted-foreground)"}})}),e.jsx("span",{className:"round-card-v2-stat-value",children:i.response_count??0}),e.jsx("span",{className:"round-card-v2-stat-label",children:"responses"})]}),e.jsxs("div",{className:"round-card-v2-stat",children:[e.jsx("span",{className:"round-card-v2-stat-icon",children:e.jsx(Us,{size:14,style:{color:"var(--accent)"}})}),e.jsx("span",{className:"round-card-v2-stat-value",style:{color:kt(i.convergence_score)},children:Nt(i.convergence_score)}),e.jsx("span",{className:"round-card-v2-stat-label",children:"convergence"})]}),e.jsxs("div",{className:"round-card-v2-stat",children:[e.jsx("span",{className:"round-card-v2-stat-icon",children:e.jsx(Gs,{size:14,style:{color:"var(--muted-foreground)"}})}),e.jsx("span",{className:"round-card-v2-stat-value",children:((z=i.questions)==null?void 0:z.length)??0}),e.jsx("span",{className:"round-card-v2-stat-label",children:"questions"})]})]}),f&&e.jsx("div",{className:"round-card-v2-selected-indicator"})]},i.id)})})]})}function _t(s){if(!s)return"";const t=s.toLowerCase();return t.includes("past")||t.includes("urðr")||t.includes("urd")?"dimension-past":t.includes("present")||t.includes("verðandi")||t.includes("verdandi")?"dimension-present":t.includes("future")||t.includes("skuld")?"dimension-future":t.includes("quantitative")?"dimension-quantitative":t.includes("qualitative")?"dimension-qualitative":t.includes("mixed")?"dimension-mixed":t.includes("industry")?"dimension-industry":t.includes("academia")?"dimension-academia":t.includes("policy")?"dimension-policy":""}function Ct(s){switch(s){case"cross-pollination":return"Cross-pollination";case"synthesis":return"Synthesis";case"implicit":return"Implicit";default:return s}}function St(s){switch(s){case"cross-pollination":return"emergence-type-cross-pollination";case"synthesis":return"emergence-type-synthesis";case"implicit":return"emergence-type-implicit";default:return""}}function $t({insights:s,expertLabels:t,formId:n,roundId:o,token:r,currentUserEmail:l}){const d=!!(n&&o&&r),[p,g]=m.useState(!0);return!s||s.length===0?null:e.jsxs("div",{className:"emergence-section fade-in",children:[e.jsxs("button",{className:"structured-section-header",onClick:()=>g(!p),children:[e.jsxs("div",{className:"structured-section-left",children:[e.jsx("span",{className:"structured-section-emoji",children:e.jsx(ne,{size:16,style:{color:"var(--accent)"}})}),e.jsx("span",{className:"structured-section-title",children:"Emergent Insights"}),e.jsx("span",{className:"structured-section-badge",style:{backgroundColor:"var(--accent)"},children:s.length})]}),e.jsx("span",{className:`structured-section-chevron ${p?"expanded":""}`,children:"▸"})]}),p&&e.jsx("div",{className:"structured-section-body slide-down",children:s.map((u,v)=>e.jsxs("div",{className:"emergence-card",children:[e.jsxs("div",{className:"emergence-card-top",children:[e.jsx("p",{className:"emergence-card-insight",children:u.insight}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"8px",flexShrink:0},children:[e.jsx("span",{className:`emergence-type-badge ${St(u.emergence_type)}`,children:Ct(u.emergence_type)}),d&&e.jsx(Rs,{formId:n,roundId:o,sectionType:"emergence",sectionIndex:v,token:r,currentUserEmail:l})]})]}),u.contributing_experts.length>0&&e.jsx("div",{className:"structured-card-experts",children:u.contributing_experts.map(i=>e.jsx("span",{className:`expert-chip ${_t(t==null?void 0:t[i])}`,title:`Expert ${i}`,children:(t==null?void 0:t[i])||`E${i}`},i))}),e.jsx("p",{className:"emergence-explanation",children:u.explanation})]},v))})]})}const V=[{id:"simple",name:"Simple",description:"Quick one-shot summary",detail:"A single AI pass that reads all expert responses and generates a unified summary. Fast and cost-effective, but may miss nuanced disagreements or minority positions.",icon:e.jsx(Ue,{size:16,style:{color:"var(--warning)"}}),speed:"Fast",bestFor:"Quick overviews, early rounds, small panels (< 8 experts)"},{id:"committee",name:"Committee",description:"Multi-analyst structured synthesis",detail:"Multiple independent AI analysts each read all responses and identify agreements, disagreements, nuances, and probes. A meta-synthesiser then combines their analyses into a structured output with provenance tracking.",icon:e.jsx(Be,{size:16,style:{color:"var(--accent)"}}),speed:"Moderate",bestFor:"Final rounds, policy-critical topics, panels with strong disagreement"},{id:"ttd",name:"TTD",description:"Iterative diffusion refinement",detail:"Think-Through-Diffusion: an iterative process where the synthesis is refined across multiple passes, with each pass deepening the analysis. Produces the most thorough output but takes longer.",icon:e.jsx(qe,{size:16,style:{color:"var(--accent)"}}),speed:"Thorough",bestFor:"Complex multi-dimensional topics, high-stakes decisions, large panels"}];function Et({mode:s,onModeChange:t}){const[n,o]=m.useState(null),r=m.useCallback(l=>{var g;const d=V.findIndex(u=>u.id===s);let p=d;if(l.key==="ArrowDown"||l.key==="ArrowRight"?(l.preventDefault(),p=(d+1)%V.length):(l.key==="ArrowUp"||l.key==="ArrowLeft")&&(l.preventDefault(),p=(d-1+V.length)%V.length),p!==d){t(V[p].id);const u=l.target.closest('[role="radiogroup"]'),v=u==null?void 0:u.querySelectorAll('[role="radio"]');(g=v==null?void 0:v[p])==null||g.focus()}},[s,t]);return e.jsx("div",{className:"synthesis-mode-selector",role:"radiogroup","aria-label":"Synthesis mode",children:V.map(l=>e.jsxs("div",{style:{position:"relative"},children:[e.jsxs("button",{className:`synthesis-mode-option ${s===l.id?"selected":""}`,onClick:()=>t(l.id),role:"radio","aria-checked":s===l.id,"aria-label":`${l.name} synthesis mode: ${l.description}`,tabIndex:s===l.id?0:-1,onKeyDown:r,children:[e.jsx("span",{className:"synthesis-mode-emoji",children:l.icon}),e.jsxs("div",{className:"synthesis-mode-text",children:[e.jsx("span",{className:"synthesis-mode-name",children:l.name}),e.jsx("span",{className:"synthesis-mode-desc",children:l.description})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"0.375rem"},children:[e.jsx("span",{className:"synthesis-mode-speed",children:l.speed}),e.jsx("button",{type:"button",onClick:d=>{d.stopPropagation(),o(n===l.id?null:l.id)},"aria-label":`More info about ${l.name} mode`,style:{background:"none",border:"none",cursor:"pointer",padding:"2px",display:"flex",alignItems:"center",color:"var(--muted-foreground)",opacity:.7,transition:"opacity 0.15s"},onMouseEnter:d=>{d.target.style.opacity="1"},onMouseLeave:d=>{d.target.style.opacity="0.7"},children:e.jsx(Os,{size:13})})]})]}),n===l.id&&e.jsxs("div",{className:"fade-in",style:{marginTop:"0.25rem",padding:"0.75rem 1rem",borderRadius:"var(--radius)",backgroundColor:"var(--muted)",border:"1px solid var(--border)",fontSize:"0.8125rem",lineHeight:"1.5",color:"var(--muted-foreground)"},children:[e.jsx("p",{style:{marginBottom:"0.5rem"},children:l.detail}),e.jsxs("p",{style:{fontSize:"0.75rem",fontWeight:600,color:"var(--foreground)"},children:["Best for: ",e.jsx("span",{style:{fontWeight:400,color:"var(--muted-foreground)"},children:l.bestFor})]})]})]},l.id))})}function Qe({response:s,questions:t,onUpdated:n}){const[o,r]=m.useState(!1),[l,d]=m.useState({}),[p,g]=m.useState(!1),[u,v]=m.useState(null),[i,a]=m.useState(null),[c,f]=m.useState(s.version),[k,z]=m.useState(s.answers),$=m.useRef({});m.useEffect(()=>{f(s.version),z(s.answers)},[s.version,s.answers]);const F=m.useCallback(()=>{const N={};for(const[b,S]of Object.entries(k))N[b]=String(S??"");d(N),r(!0),v(null),a(null)},[k]),w=m.useCallback(()=>{r(!1),d({}),v(null),a(null)},[]),x=m.useCallback((N,b)=>{d(S=>({...S,[N]:b}))},[]),j=m.useCallback(async(N=!1)=>{g(!0),v(null);try{const S=await(N?Ss:$s)(s.id,l,c);f(S.version),z(S.answers),r(!1),d({}),a(null),n==null||n({...s,answers:S.answers,version:S.version})}catch(b){if(b instanceof ks&&b.status===409){const S=parseInt(b.headers.get("X-Current-Version")||"0",10);a({serverVersion:S||c+1,localAnswers:{...l}});return}v(b instanceof Error?b.message:"Network error")}finally{g(!1)}},[l,c,s.id,n]),C=m.useCallback(()=>j(!0),[j]);m.useEffect(()=>{if(!i)return;const N=b=>{b.key==="Escape"&&(b.preventDefault(),a(null))};return document.addEventListener("keydown",N),()=>document.removeEventListener("keydown",N)},[i]);const A=m.useCallback(N=>{N&&(N.style.height="auto",N.style.height=`${N.scrollHeight}px`)},[]);return o?e.jsxs("div",{className:"rounded-lg p-4",style:{backgroundColor:"var(--card)",border:"2px solid var(--accent)",boxShadow:"0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent)"},children:[e.jsxs("div",{className:"flex items-center justify-between mb-3",children:[e.jsxs("span",{className:"text-xs font-medium",style:{color:"var(--muted-foreground)"},children:["Editing: ",s.email||"Anonymous"]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx("button",{onClick:w,disabled:p,className:"text-xs px-3 py-1 rounded",style:{backgroundColor:"var(--muted)",color:"var(--muted-foreground)"},children:"Cancel"}),e.jsx("button",{onClick:()=>j(!1),disabled:p,className:"text-xs px-3 py-1 rounded font-medium",style:{backgroundColor:"var(--accent)",color:"var(--accent-foreground)",opacity:p?.6:1},children:p?"Saving…":e.jsxs(e.Fragment,{children:[e.jsx(Ws,{size:12,className:"inline mr-1"})," Save"]})})]})]}),t.map((N,b)=>{const S=`q${b+1}`;return e.jsxs("div",{className:"mb-3 last:mb-0",children:[e.jsx("label",{className:"text-xs font-semibold mb-1 block",style:{color:"var(--foreground)"},children:Q(N)}),e.jsx("textarea",{ref:q=>{$.current[S]=q,A(q)},value:l[S]??"",onChange:q=>{x(S,q.target.value),A(q.target)},disabled:p,rows:2,className:"w-full rounded-md px-3 py-2 text-sm resize-none",style:{backgroundColor:"var(--background)",color:"var(--foreground)",border:"1px solid var(--input)"}})]},S)}),u&&e.jsxs("div",{className:"mt-3 p-3 rounded-md text-sm",style:{backgroundColor:"color-mix(in srgb, var(--destructive) 10%, transparent)",color:"var(--destructive)",border:"1px solid var(--destructive)"},children:[e.jsx(le,{size:14,className:"inline mr-1"})," ",u]}),i&&e.jsx("div",{className:"fixed inset-0 z-[60] flex items-center justify-center p-4",style:{backgroundColor:"rgba(0,0,0,0.6)"},onClick:N=>{N.target===N.currentTarget&&a(null)},children:e.jsxs("div",{className:"rounded-xl p-6 max-w-lg w-full space-y-4",style:{backgroundColor:"var(--card)",border:"1px solid var(--border)",boxShadow:"0 25px 50px -12px rgba(0,0,0,0.25)"},children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(le,{size:24,style:{color:"var(--destructive)"}}),e.jsx("h3",{className:"text-lg font-bold",style:{color:"var(--foreground)"},children:"Edit Conflict"})]}),e.jsxs("p",{className:"text-sm",style:{color:"var(--muted-foreground)"},children:["This response was modified by another admin since you started editing. Your version: ",e.jsxs("strong",{children:["v",c]}),", server version: ",e.jsxs("strong",{children:["v",i.serverVersion]}),"."]}),e.jsxs("div",{className:"rounded-md p-3 text-xs space-y-2",style:{backgroundColor:"var(--muted)",border:"1px solid var(--border)"},children:[e.jsx("div",{className:"font-semibold",style:{color:"var(--foreground)"},children:"Your pending changes:"}),t.map((N,b)=>{const S=`q${b+1}`,q=i.localAnswers[S]??"",H=String(k[S]??"");return q===H?null:e.jsxs("div",{children:[e.jsx("div",{style:{color:"var(--muted-foreground)"},children:Q(N)}),e.jsxs("div",{className:"mt-0.5",style:{color:"var(--destructive)"},children:["− ",H||"(empty)"]}),e.jsxs("div",{className:"mt-0.5",style:{color:"var(--success, #22c55e)"},children:["+ ",q||"(empty)"]})]},S)})]}),e.jsxs("div",{className:"flex gap-3 justify-end pt-2",children:[e.jsx("button",{onClick:()=>{a(null),w()},className:"px-4 py-2 rounded-lg text-sm",style:{backgroundColor:"var(--muted)",color:"var(--foreground)"},children:"Discard My Changes"}),e.jsx("button",{onClick:C,disabled:p,className:"px-4 py-2 rounded-lg text-sm font-medium",style:{backgroundColor:"var(--destructive)",color:"var(--destructive-foreground)",opacity:p?.6:1},children:p?"Saving…":"Force Save My Version"})]})]})})]}):e.jsxs("div",{className:"group relative rounded-lg p-4 transition-colors",style:{backgroundColor:"var(--card)",border:"1px solid var(--border)"},children:[e.jsxs("div",{className:"flex items-center justify-between mb-2",children:[e.jsx("span",{className:"text-xs font-medium",style:{color:"var(--muted-foreground)"},children:s.email||"Anonymous"}),e.jsxs("button",{onClick:F,className:"opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-1 rounded",style:{backgroundColor:"var(--accent)",color:"var(--accent-foreground)"},title:"Edit response",children:[e.jsx(Qs,{size:12,className:"inline mr-1"})," Edit"]})]}),t.map((N,b)=>{const S=`q${b+1}`,q=k[S];return q?e.jsxs("div",{className:"mb-3 last:mb-0",children:[e.jsx("div",{className:"text-xs font-semibold mb-1",style:{color:"var(--foreground)"},children:Q(N)}),e.jsx("div",{className:"text-sm leading-relaxed",style:{color:"var(--foreground)"},children:String(q)})]},S):null})]})}const Ae={strong:{bg:"color-mix(in srgb, var(--destructive) 12%, transparent)",text:"var(--destructive)",label:"Strong"},moderate:{bg:"color-mix(in srgb, var(--warning) 12%, transparent)",text:"var(--warning)",label:"Moderate"},weak:{bg:"color-mix(in srgb, var(--success) 12%, transparent)",text:"var(--success)",label:"Weak"}};function zt({strength:s}){const t=Ae[s]||Ae.moderate;return e.jsx("span",{className:"text-xs font-medium px-2 py-0.5 rounded-full",style:{backgroundColor:t.bg,color:t.text},children:t.label})}function At({formId:s,roundId:t}){const[n,o]=m.useState([]),[r,l]=m.useState(!1),[d,p]=m.useState(null),[g,u]=m.useState(!0),[v,i]=m.useState(!1);async function a(){l(!0),p(null);try{const c=await dt(s,t);o(c.counterarguments),i(!0),u(!0)}catch(c){p(c.message||"Failed to generate counterarguments")}finally{l(!1)}}return e.jsxs("div",{className:"card p-4 sm:p-6",children:[e.jsxs("div",{className:"flex items-center justify-between mb-3",children:[e.jsxs("button",{onClick:()=>v&&u(c=>!c),className:"flex items-center gap-2 text-left",style:{background:"none",border:"none",cursor:v?"pointer":"default",padding:0},children:[e.jsx(Ks,{size:20,style:{color:"var(--warning)"}}),e.jsx("h2",{className:"text-lg font-semibold text-foreground",children:"🤖 AI Counterpoints"}),v&&e.jsx(ce,{size:16,className:"transition-transform",style:{color:"var(--muted-foreground)",transform:g?"rotate(0deg)":"rotate(-90deg)"}})]}),e.jsx("button",{onClick:a,disabled:r,className:"text-sm font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5",style:{backgroundColor:r?"var(--muted)":"rgba(249,115,22,0.12)",color:r?"var(--muted-foreground)":"var(--warning)",border:"none",cursor:r?"not-allowed":"pointer"},children:r?e.jsxs(e.Fragment,{children:[e.jsx(ge,{size:14,className:"animate-spin"}),"Generating…"]}):v?"Regenerate":"Generate"})]}),e.jsxs("div",{className:"flex items-start gap-2 text-xs rounded-lg px-3 py-2 mb-3",style:{backgroundColor:"rgba(249,115,22,0.06)",color:"var(--muted-foreground)"},children:[e.jsx(le,{size:14,className:"flex-shrink-0 mt-0.5",style:{color:"var(--warning)"}}),e.jsxs("span",{children:["These counterarguments are ",e.jsx("strong",{children:"AI-generated"})," and do not represent expert views. They highlight potential blind spots for consideration."]})]}),d&&e.jsx("div",{className:"text-sm rounded-lg px-3 py-2 mb-3",style:{backgroundColor:"rgba(239,68,68,0.08)",color:"var(--destructive)"},children:d}),v&&g&&n.length>0&&e.jsx("div",{className:"space-y-3",children:n.map((c,f)=>e.jsxs("div",{className:"rounded-lg p-3 sm:p-4",style:{backgroundColor:"var(--muted)",border:"1px solid var(--border)"},children:[e.jsxs("div",{className:"flex items-start justify-between gap-3 mb-2",children:[e.jsx("p",{className:"text-sm font-medium text-foreground",children:c.argument}),e.jsx(zt,{strength:c.strength})]}),e.jsx("p",{className:"text-sm",style:{color:"var(--muted-foreground)"},children:c.rationale})]},f))}),!v&&!r&&e.jsxs("p",{className:"text-sm text-center py-4",style:{color:"var(--muted-foreground)"},children:["Click ",e.jsx("strong",{children:"Generate"})," to have AI identify counterarguments and blind spots in the current synthesis."]})]})}const Tt=[{value:"policy_maker",label:"Policy Maker",icon:"🏛️"},{value:"technical",label:"Technical",icon:"🔬"},{value:"general_public",label:"General Public",icon:"👥"},{value:"executive",label:"Executive",icon:"💼"},{value:"academic",label:"Academic",icon:"🎓"}];function Dt({formId:s,roundId:t,synthesisText:n}){const[o,r]=m.useState(""),[l,d]=m.useState(null),[p,g]=m.useState(""),[u,v]=m.useState(!1),[i,a]=m.useState(null);async function c(k){if(r(k),a(null),!k){d(null),g("");return}v(!0);try{const z=await ut(s,t,k,n);d(z.translated_text),g(z.audience_label)}catch(z){a(z.message||"Failed to translate synthesis"),d(null)}finally{v(!1)}}function f(){r(""),d(null),g(""),a(null)}return e.jsxs("div",{className:"space-y-3",children:[e.jsxs("div",{className:"flex items-center gap-2 flex-wrap",children:[e.jsx(Vs,{size:16,style:{color:"var(--accent)",flexShrink:0}}),e.jsx("span",{className:"text-sm font-medium",style:{color:"var(--muted-foreground)"},children:"Reading as:"}),e.jsxs("select",{value:o,onChange:k=>c(k.target.value),disabled:u,className:"text-sm rounded-lg px-3 py-1.5 transition-colors",style:{backgroundColor:"var(--muted)",color:"var(--foreground)",border:"1px solid var(--border)",cursor:u?"wait":"pointer",minWidth:"180px"},children:[e.jsx("option",{value:"",children:"Select audience…"}),Tt.map(k=>e.jsxs("option",{value:k.value,children:[k.icon," ",k.label]},k.value))]}),o&&!u&&e.jsx("button",{onClick:f,className:"p-1 rounded transition-colors",style:{background:"none",border:"none",color:"var(--muted-foreground)",cursor:"pointer"},title:"Clear translation",children:e.jsx(pe,{size:14})}),u&&e.jsx(ge,{size:16,className:"animate-spin",style:{color:"var(--accent)"}})]}),i&&e.jsx("div",{className:"text-sm rounded-lg px-3 py-2",style:{backgroundColor:"rgba(239,68,68,0.08)",color:"var(--destructive)"},children:i}),l&&e.jsxs("div",{className:"rounded-lg p-4 sm:p-5 space-y-2",style:{backgroundColor:"rgba(99,102,241,0.04)",border:"1px solid rgba(99,102,241,0.15)"},children:[e.jsxs("div",{className:"flex items-center gap-2 mb-2",children:[e.jsxs("span",{className:"text-xs font-medium px-2 py-0.5 rounded-full",style:{backgroundColor:"rgba(99,102,241,0.12)",color:"rgb(99,102,241)"},children:[p," Lens"]}),e.jsx("span",{className:"text-xs",style:{color:"var(--muted-foreground)"},children:"AI-translated version"})]}),e.jsx(J,{content:l})]})]})}function Rt({formId:s,roundId:t,responses:n,questions:o}){const[r,l]=m.useState({}),[d,p]=m.useState(new Set),[g,u]=m.useState(!1),[v,i]=m.useState(null),[a,c]=m.useState(!1),f=`${s}-${t}`,k=m.useCallback(async()=>{if(r[f]){c(!0);return}u(!0),i(null);try{const w=[];for(const j of n)for(let C=0;C<o.length;C++){const A=`q${C+1}`,N=j.answers[A];N&&w.push({expert:j.email||`Expert ${j.id}`,question:Q(o[C]),answer:String(N)})}if(w.length===0){i("No responses to clarify");return}const x=await mt(s,t,w);l(j=>({...j,[f]:x.clarified_responses})),c(!0)}catch(w){i(w instanceof Error?w.message:"Failed to generate clarifications")}finally{u(!1)}},[s,t,n,o,f,r]),z=m.useCallback(w=>{p(x=>{const j=new Set(x);return j.has(w)?j.delete(w):j.add(w),j})},[]),$=m.useCallback(()=>{d.size===n.length?p(new Set):p(new Set(n.map(w=>w.id)))},[d,n]),F=(w,x)=>{const j=r[f];if(!j)return null;const C=w||"",A=Q(o[x]),N=j.find(b=>(b.expert===C||b.expert.includes(C))&&b.question===A);return(N==null?void 0:N.clarified)||null};return n.length===0?null:e.jsxs("div",{className:"rounded-lg overflow-hidden",style:{border:"1px solid var(--border)",backgroundColor:"var(--card)"},children:[e.jsxs("div",{className:"p-4 flex items-center justify-between",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(ne,{size:16,style:{color:"var(--accent)"}}),e.jsx("h3",{className:"text-sm font-semibold",style:{color:"var(--foreground)"},children:"Voice Mirroring"}),e.jsx("span",{className:"text-xs px-2 py-0.5 rounded-full",style:{backgroundColor:"color-mix(in srgb, var(--accent) 12%, transparent)",color:"var(--accent)"},children:"AI"})]}),a?e.jsx("button",{onClick:$,className:"text-xs font-medium px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5",style:{backgroundColor:"color-mix(in srgb, var(--accent) 10%, transparent)",color:"var(--accent)",cursor:"pointer"},children:d.size===n.length?e.jsxs(e.Fragment,{children:[e.jsx($e,{size:14}),"Show All Originals"]}):e.jsxs(e.Fragment,{children:[e.jsx(Ee,{size:14}),"Show All Clarified"]})}):e.jsx("button",{onClick:k,disabled:g,className:"text-xs font-medium px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5",style:{backgroundColor:"var(--accent)",color:"var(--accent-foreground)",opacity:g?.7:1,cursor:g?"not-allowed":"pointer"},children:g?e.jsxs(e.Fragment,{children:[e.jsx(ge,{size:12,className:"animate-spin"}),"Clarifying…"]}):e.jsxs(e.Fragment,{children:[e.jsx(ne,{size:12}),"Generate Clarifications"]})})]}),a&&e.jsx("div",{className:"mx-4 mb-3 px-3 py-2 rounded-md text-xs",style:{backgroundColor:"color-mix(in srgb, var(--accent) 6%, transparent)",color:"var(--muted-foreground)",border:"1px solid color-mix(in srgb, var(--accent) 15%, transparent)"},children:"🔍 AI-clarified versions preserve the expert's original meaning while improving readability. Toggle per response to compare."}),v&&e.jsxs("div",{className:"mx-4 mb-3 p-3 rounded-md text-sm flex items-center gap-2",style:{backgroundColor:"color-mix(in srgb, var(--destructive) 10%, transparent)",color:"var(--destructive)",border:"1px solid var(--destructive)"},children:[e.jsx(le,{size:14}),v]}),a&&e.jsx("div",{className:"px-4 pb-4 space-y-3",children:n.map(w=>{const x=d.has(w.id);return e.jsxs("div",{className:"rounded-lg p-3 transition-all",style:{backgroundColor:x?"color-mix(in srgb, var(--accent) 5%, var(--background))":"var(--background)",border:`1px solid ${x?"color-mix(in srgb, var(--accent) 25%, transparent)":"var(--border)"}`},children:[e.jsxs("div",{className:"flex items-center justify-between mb-2",children:[e.jsx("span",{className:"text-xs font-medium",style:{color:"var(--muted-foreground)"},children:w.email||"Anonymous"}),e.jsx("button",{onClick:()=>z(w.id),className:"flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors",style:{backgroundColor:x?"color-mix(in srgb, var(--accent) 15%, transparent)":"var(--muted)",color:x?"var(--accent)":"var(--muted-foreground)",cursor:"pointer",border:"none"},children:x?e.jsxs(e.Fragment,{children:[e.jsx($e,{size:12}),"Clarified"]}):e.jsxs(e.Fragment,{children:[e.jsx(Ee,{size:12}),"Original"]})})]}),o.map((j,C)=>{const A=`q${C+1}`,N=w.answers[A];if(!N)return null;const b=F(w.email,C),S=x&&b?b:String(N);return e.jsxs("div",{className:"mb-2 last:mb-0",children:[e.jsx("div",{className:"text-xs font-semibold mb-1",style:{color:"var(--foreground)"},children:Q(j)}),e.jsx("div",{className:"text-sm leading-relaxed transition-all",style:{color:"var(--foreground)",fontStyle:"normal"},children:S}),x&&b&&e.jsxs("div",{className:"text-xs mt-1",style:{color:"var(--muted-foreground)",fontStyle:"italic"},children:["Original: ",String(N)]})]},A)})]},w.id)})})]})}function Ft({email:s,viewers:t,onLogout:n}){const o=Ie();return e.jsx("header",{className:"border-b sticky top-0 z-40",style:{backgroundColor:"var(--card)",borderColor:"var(--border)",boxShadow:"0 1px 3px 0 rgba(0,0,0,0.04)",backdropFilter:"blur(8px)"},children:e.jsxs("div",{className:"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center",children:[e.jsxs("div",{className:"flex items-center gap-2 sm:gap-4 min-w-0",children:[e.jsxs("div",{className:"flex items-center gap-2 sm:gap-3 min-w-0 cursor-pointer",onClick:()=>o("/"),children:[e.jsx("img",{src:"/logo-mark.png",alt:"Symphonia",className:"h-7 w-auto flex-shrink-0"}),e.jsxs("div",{className:"min-w-0",children:[e.jsx("h1",{className:"text-base sm:text-lg font-bold tracking-tight text-foreground leading-tight",children:"Admin Workspace"}),e.jsx("p",{className:"text-xs text-muted-foreground leading-tight truncate",children:s})]})]}),e.jsx(Fs,{viewers:t,currentUserEmail:s})]}),e.jsx("button",{onClick:n,className:"text-sm px-3 py-1.5 rounded-lg transition-colors flex-shrink-0",style:{color:"var(--muted-foreground)",backgroundColor:"transparent",border:"none",cursor:"pointer"},onMouseEnter:r=>{r.currentTarget.style.backgroundColor="var(--muted)",r.currentTarget.style.color="var(--destructive)"},onMouseLeave:r=>{r.currentTarget.style.backgroundColor="transparent",r.currentTarget.style.color="var(--muted-foreground)"},children:"Log out"})]})})}function Mt({activeRound:s,synthesisViewMode:t,onSetViewMode:n,editor:o}){return e.jsxs("div",{className:"card p-4 sm:p-6 min-h-[200px] lg:min-h-[300px]",style:{borderTop:"3px solid var(--accent)"},children:[e.jsxs("div",{className:"flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3",children:[e.jsxs("h2",{className:"text-lg font-semibold text-foreground flex items-center gap-2",style:{margin:0},children:[e.jsx("span",{children:"📝"})," Synthesis for Round ",(s==null?void 0:s.round_number)||""]}),e.jsxs("div",{style:{display:"inline-flex",borderRadius:"0.5rem",overflow:"hidden",border:"1px solid var(--border)",fontSize:"0.8125rem",alignSelf:"flex-start"},children:[e.jsx("button",{onClick:()=>n("view"),style:{padding:"0.375rem 0.75rem",cursor:"pointer",border:"none",fontWeight:t==="view"?600:400,backgroundColor:t==="view"?"var(--accent)":"var(--card)",color:t==="view"?"white":"var(--muted-foreground)",transition:"all 0.15s ease"},children:"View"}),e.jsx("button",{onClick:()=>n("edit"),style:{padding:"0.375rem 0.75rem",cursor:"pointer",border:"none",borderLeft:"1px solid var(--border)",fontWeight:t==="edit"?600:400,backgroundColor:t==="edit"?"var(--accent)":"var(--card)",color:t==="edit"?"white":"var(--muted-foreground)",transition:"all 0.15s ease"},children:"Edit"})]})]}),t==="edit"?e.jsx("div",{className:"prose max-w-none",children:e.jsx(ps,{editor:o})}):e.jsx("div",{children:s!=null&&s.synthesis?e.jsx(J,{content:s.synthesis}):e.jsxs("div",{className:"rounded-lg p-6 text-center",style:{backgroundColor:"var(--muted)",border:"1px dashed var(--border)"},children:[e.jsx("div",{className:"text-3xl mb-3",children:"🤖"}),e.jsx("p",{className:"text-sm font-medium",style:{color:"var(--foreground)"},children:"No synthesis yet"}),e.jsx("p",{className:"text-sm mt-1",style:{color:"var(--muted-foreground)"},children:"Generate one using the AI panel on the right, or switch to Edit mode to write manually."})]})})]})}function It({synthesisMode:s,onModeChange:t,selectedModel:n,onModelChange:o,models:r,isGenerating:l,onGenerate:d}){return e.jsxs("div",{className:"card p-4",style:{background:"linear-gradient(180deg, color-mix(in srgb, var(--accent) 4%, var(--card)), var(--card))",borderColor:"color-mix(in srgb, var(--accent) 20%, var(--border))"},children:[e.jsx("h3",{className:"text-xs font-semibold uppercase tracking-wider mb-3",style:{color:"var(--accent)"},children:"🤖 AI-Powered Synthesis"}),e.jsxs("div",{className:"space-y-3",children:[e.jsx(Et,{mode:s,onModeChange:t}),e.jsxs("div",{children:[e.jsx("label",{htmlFor:"model-select",className:"block text-sm font-medium text-muted-foreground mb-1.5",children:"Choose a model"}),e.jsx("select",{id:"model-select",className:"w-full rounded-lg px-3 py-2 text-sm",value:n,onChange:p=>o(p.target.value),children:r.map(p=>e.jsx("option",{value:p,children:p},p))})]}),e.jsx(L,{variant:"purple",size:"md",loading:l,loadingText:"Generating…",onClick:d,className:"w-full font-semibold",children:"Generate Summary"})]})]})}function Te(s){return s?new Date(s).toLocaleString(void 0,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):""}function Lt({displayRound:s,synthesisVersions:t,selectedVersionId:n,onSelectVersion:o,selectedVersion:r,onActivateVersion:l,showCompare:d,onToggleCompare:p}){return s?e.jsxs("div",{className:"card p-4",children:[e.jsxs("h3",{className:"text-xs font-semibold uppercase tracking-wider mb-3",style:{color:"var(--muted-foreground)"},children:["Synthesis Versions",e.jsxs("span",{className:"ml-2 font-normal normal-case tracking-normal",children:["· Round ",s.round_number]})]}),t.length===0?e.jsxs("p",{className:"text-sm",style:{color:"var(--muted-foreground)"},children:["No versions yet. Use ",e.jsx("strong",{children:"Generate Summary"})," above to create one."]}):e.jsxs("div",{className:"space-y-3",children:[e.jsx("div",{className:"flex flex-wrap gap-2",children:t.map(g=>{const u=g.id===n;return e.jsxs("button",{type:"button",onClick:()=>o(g.id),className:"relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",style:{backgroundColor:u?"color-mix(in srgb, var(--accent) 15%, var(--card))":"var(--muted)",color:u?"var(--accent)":"var(--muted-foreground)",border:u?"1.5px solid var(--accent)":"1.5px solid transparent",cursor:"pointer"},title:`v${g.version}${g.is_active?" (published)":""} — ${Te(g.created_at)}`,children:["v",g.version,g.is_active&&e.jsx(me,{size:12,style:{color:"var(--success)"}})]},g.id)})}),r&&e.jsxs("div",{className:"text-xs space-y-1.5 p-3 rounded-lg",style:{background:"var(--muted)",color:"var(--muted-foreground)"},children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("span",{className:"font-semibold",style:{color:"var(--foreground)"},children:["v",r.version]}),r.is_active?e.jsxs("span",{className:"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",style:{backgroundColor:"color-mix(in srgb, var(--success) 12%, transparent)",color:"var(--success)"},children:[e.jsx(me,{size:10})," Published"]}):e.jsx("span",{className:"inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium",style:{backgroundColor:"var(--card)",color:"var(--muted-foreground)"},children:"Draft"})]}),r.created_at&&e.jsx("div",{children:Te(r.created_at)}),e.jsxs("div",{children:[e.jsx("strong",{children:"Model:"})," ",r.model_used||"N/A"]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Strategy:"})," ",r.strategy||"N/A"]})]}),r&&!r.is_active&&e.jsxs(L,{variant:"success",size:"sm",onClick:()=>l(r.id),className:"w-full",children:["Publish v",r.version]}),t.length>=2&&p&&e.jsxs("button",{onClick:p,className:"w-full flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-colors",style:{backgroundColor:d?"color-mix(in srgb, var(--accent) 15%, var(--card))":"var(--card)",color:d?"var(--accent)":"var(--muted-foreground)",border:d?"1.5px solid var(--accent)":"1.5px solid var(--border)",cursor:"pointer"},children:[e.jsx(Ge,{size:14}),d?"Hide Comparison":"Compare Versions"]})]})]}):null}function qt({selectedVersion:s,displayRound:t,resolvedExpertLabels:n,formId:o,token:r,currentUserEmail:l}){return s?e.jsxs(e.Fragment,{children:[s.synthesis&&e.jsxs("div",{className:"card p-4 sm:p-6",children:[e.jsxs("div",{className:"flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-3",children:[e.jsxs("h2",{className:"text-lg font-semibold text-foreground",children:["Synthesis v",s.version,s.is_active&&e.jsx("span",{className:"ml-2 text-xs font-normal px-2 py-0.5 rounded-full bg-success/10 text-success",children:"active"})]}),e.jsxs("span",{className:"text-xs text-muted-foreground",children:[s.model_used||""," · ",s.strategy||"",s.created_at&&` · ${new Date(s.created_at).toLocaleString()}`]})]}),e.jsx(J,{content:s.synthesis})]}),s.synthesis_json&&e.jsxs("div",{className:"card p-4 sm:p-6",children:[e.jsxs("h2",{className:"text-lg font-semibold mb-3 text-foreground",children:["Structured Analysis (v",s.version,")"]}),e.jsx(Le,{data:s.synthesis_json,convergenceScore:(t==null?void 0:t.convergence_score)??void 0,expertLabels:n,formId:o,roundId:t==null?void 0:t.id,token:r,currentUserEmail:l})]})]}):null}function Pt({questions:s,onUpdateQuestion:t,onAddQuestion:n,onRemoveQuestion:o}){return e.jsxs("div",{className:"card p-4 sm:p-6",children:[e.jsxs("h2",{className:"text-lg font-semibold text-foreground flex items-center gap-2",children:[e.jsx("span",{children:"❓"})," Next Round Questions"]}),e.jsx("div",{className:"space-y-2 mt-3",children:s.map((r,l)=>e.jsxs("div",{className:"flex gap-2 items-center group",children:[e.jsx("span",{className:"text-xs font-medium shrink-0 w-6 h-6 flex items-center justify-center rounded-full",style:{backgroundColor:"var(--muted)",color:"var(--muted-foreground)"},children:l+1}),e.jsx("input",{type:"text",className:"flex-1 rounded-lg px-3 py-2 text-sm min-w-0",value:r,onChange:d=>t(l,d.target.value),placeholder:`Question ${l+1}`}),e.jsx(L,{variant:"secondary",size:"sm",onClick:()=>o(l),style:{opacity:.4,transition:"opacity 0.15s ease"},className:"group-hover:!opacity-100",children:"✕"})]},l))}),e.jsx(L,{variant:"secondary",size:"sm",onClick:n,className:"mt-3",children:"+ Add Question"})]})}function Ht({form:s,activeRound:t}){return e.jsxs("div",{className:"card p-4",children:[e.jsx("h3",{className:"text-xs font-semibold uppercase tracking-wider mb-3",style:{color:"var(--muted-foreground)"},children:"Form Info"}),e.jsxs("div",{className:"text-sm space-y-2",children:[e.jsx("div",{className:"text-foreground font-medium",children:s.title}),e.jsx("div",{className:"flex items-center gap-2 text-sm",style:{color:"var(--muted-foreground)"},children:e.jsxs("span",{className:"inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",style:{backgroundColor:t?"color-mix(in srgb, var(--accent) 12%, transparent)":"var(--muted)",color:t?"var(--accent)":"var(--muted-foreground)"},children:[t&&e.jsx("span",{className:"w-1.5 h-1.5 rounded-full",style:{backgroundColor:"var(--accent)"}}),t?`Round ${t.round_number} active`:"No active round"]})})]})]})}function Bt({responsesOpen:s,onToggleResponses:t,onDownloadResponses:n,onSaveSynthesis:o,onStartNextRound:r,loading:l,formTitle:d,formId:p,rounds:g,structuredSynthesisData:u,expertLabels:v}){const[i,a]=m.useState(!1),[c,f]=m.useState(!1),k=m.useCallback(async()=>{a(!0);try{await o()}finally{a(!1)}},[o]),z=m.useCallback(async()=>{f(!0);try{await n()}finally{f(!1)}},[n]);return e.jsxs("div",{className:"card p-4",children:[e.jsx("h3",{className:"text-xs font-semibold uppercase tracking-wider mb-3",style:{color:"var(--muted-foreground)"},children:"Actions"}),e.jsxs("div",{className:"flex flex-col space-y-2",children:[e.jsx(L,{variant:"accent",size:"md",onClick:t,className:"w-full text-left justify-start",children:s?"Hide Responses":"View All Responses"}),e.jsx(L,{variant:"secondary",size:"md",onClick:z,loading:c,loadingText:"Downloading…",className:"w-full text-left justify-start",children:"Download Responses"}),e.jsx(L,{variant:"success",size:"md",onClick:k,loading:i,loadingText:"Saving…",className:"w-full text-left justify-start",children:"Save Synthesis"}),e.jsx(ft,{formTitle:d,formId:p,rounds:g,structuredSynthesisData:u,expertLabels:v}),e.jsx("div",{className:"pt-2",children:e.jsx(L,{variant:"accent",size:"md",onClick:r,loading:l,loadingText:"Starting…",className:"w-full font-semibold",style:{backgroundColor:"var(--accent-hover)"},children:"Start Next Round"})})]})]})}const De='a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';function Ut({active:s,onEscape:t}){const n=m.useRef(null),o=m.useRef(null),r=m.useCallback(l=>{if(l.key==="Escape"){l.preventDefault(),t==null||t();return}if(l.key!=="Tab")return;const d=n.current;if(!d)return;const p=Array.from(d.querySelectorAll(De));if(p.length===0)return;const g=p[0],u=p[p.length-1];l.shiftKey?document.activeElement===g&&(l.preventDefault(),u.focus()):document.activeElement===u&&(l.preventDefault(),g.focus())},[t]);return m.useEffect(()=>{if(!s)return;o.current=document.activeElement;const l=setTimeout(()=>{const d=n.current;if(d){const p=d.querySelector(De);p==null||p.focus()}},50);return document.addEventListener("keydown",r),()=>{var d;clearTimeout(l),document.removeEventListener("keydown",r),(d=o.current)==null||d.focus()}},[s,r]),n}function Gt({open:s,onClose:t,structuredRounds:n,rounds:o,formQuestions:r,token:l,onResponseUpdated:d}){const p=Ut({active:s,onEscape:t});return s?ms.createPortal(e.jsx("div",{className:"fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4",style:{backgroundColor:"rgba(0,0,0,0.65)"},onClick:g=>{g.target===g.currentTarget&&t()},role:"dialog","aria-modal":"true","aria-label":"All Responses",children:e.jsxs("div",{ref:p,className:"card max-w-full sm:max-w-3xl w-full max-h-screen sm:max-h-[90vh] rounded-none sm:rounded-lg overflow-y-auto p-4 sm:p-6 text-left",style:{boxShadow:"0 25px 50px -12px rgba(0,0,0,0.25)"},children:[e.jsxs("div",{className:"flex items-center justify-between mb-4",children:[e.jsx("h3",{className:"text-xl font-semibold text-foreground",children:"All Responses"}),e.jsx("button",{onClick:t,className:"text-lg w-8 h-8 flex items-center justify-center rounded-lg transition-colors",style:{color:"var(--muted-foreground)",backgroundColor:"transparent",border:"none",cursor:"pointer"},onMouseEnter:g=>g.currentTarget.style.backgroundColor="var(--muted)",onMouseLeave:g=>g.currentTarget.style.backgroundColor="transparent","aria-label":"Close responses modal",children:"✕"})]}),n.length===0?e.jsx("p",{style:{color:"var(--muted-foreground)"},children:"No responses yet for this form."}):n.map(g=>{var v;const u=((v=o.find(i=>i.id===g.id))==null?void 0:v.questions)||r||[];return e.jsxs("div",{className:"mb-6 p-3 sm:p-4 rounded-lg",style:{backgroundColor:"var(--muted)",border:"1px solid var(--border)"},children:[e.jsxs("h4",{className:"text-lg font-semibold mb-3 text-foreground",children:["Round ",g.round_number]}),g.responses.length===0?e.jsx("p",{style:{color:"var(--muted-foreground)"},children:"No responses for this round."}):e.jsx("div",{className:"space-y-3",children:g.responses.map(i=>e.jsx(Qe,{response:i,questions:u,token:l,onUpdated:a=>d(g.id,a)},i.id))})]},g.id)}),e.jsx(L,{variant:"secondary",size:"md",onClick:t,className:"mt-6",children:"Close"})]})}),document.body):null}function Ot({structuredRounds:s,rounds:t,formQuestions:n,formId:o,token:r,onResponseUpdated:l}){const[d,p]=m.useState(new Set);function g(a){p(c=>{const f=new Set(c);return f.has(a)?f.delete(a):f.add(a),f})}function u(){p(new Set(s.map(a=>a.id)))}function v(){p(new Set)}if(s.length===0)return e.jsxs("div",{className:"card p-4 sm:p-6",children:[e.jsxs("h2",{className:"text-lg font-semibold mb-3 text-foreground flex items-center gap-2",children:[e.jsx(ze,{size:18}),"Expert Responses"]}),e.jsx("p",{style:{color:"var(--muted-foreground)"},children:"No responses yet for this form."})]});const i=d.size===s.length;return e.jsxs("div",{className:"card p-4 sm:p-6",children:[e.jsxs("div",{className:"flex items-center justify-between mb-4",children:[e.jsxs("h2",{className:"text-lg font-semibold text-foreground flex items-center gap-2",children:[e.jsx(ze,{size:18}),"Expert Responses"]}),e.jsx("button",{onClick:i?v:u,className:"text-xs font-medium px-3 py-1.5 rounded-md transition-colors",style:{color:"var(--accent)",backgroundColor:"color-mix(in srgb, var(--accent) 10%, transparent)",border:"none",cursor:"pointer"},children:i?"Collapse All":"Expand All"})]}),e.jsx("div",{className:"space-y-2",children:s.map(a=>{var z;const c=d.has(a.id),f=((z=t.find($=>$.id===a.id))==null?void 0:z.questions)||n||[],k=a.responses.length;return e.jsxs("div",{className:"rounded-lg overflow-hidden transition-all",style:{border:"1px solid var(--border)",backgroundColor:c?"var(--card)":"var(--muted)"},children:[e.jsxs("button",{onClick:()=>g(a.id),className:"w-full flex items-center justify-between p-3 sm:p-4 text-left transition-colors",style:{background:"none",border:"none",cursor:"pointer",fontFamily:"var(--font-family)"},children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("span",{className:"flex items-center justify-center w-6 h-6 rounded-md transition-transform",style:{backgroundColor:"color-mix(in srgb, var(--accent) 12%, transparent)",color:"var(--accent)"},children:c?e.jsx(ce,{size:14}):e.jsx(Js,{size:14})}),e.jsxs("span",{className:"font-semibold text-sm",style:{color:"var(--foreground)"},children:["Round ",a.round_number]})]}),e.jsx("div",{className:"flex items-center gap-2",children:e.jsxs("span",{className:"flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",style:{backgroundColor:k>0?"color-mix(in srgb, var(--accent) 10%, transparent)":"var(--muted)",color:k>0?"var(--accent)":"var(--muted-foreground)"},children:[e.jsx(Xs,{size:11}),k," response",k!==1?"s":""]})})]}),c&&e.jsxs("div",{className:"px-3 sm:px-4 pb-3 sm:pb-4 space-y-3 slide-down",style:{borderTop:"1px solid var(--border)"},children:[f.length>0&&e.jsxs("div",{className:"pt-3 pb-1",children:[e.jsx("h4",{className:"text-xs font-semibold uppercase tracking-wider mb-2",style:{color:"var(--muted-foreground)"},children:"Questions"}),e.jsx("ol",{className:"list-decimal list-inside space-y-1",children:f.map(($,F)=>e.jsx("li",{className:"text-sm",style:{color:"var(--foreground)"},children:Q($)},F))})]}),k===0?e.jsx("p",{className:"text-sm py-2",style:{color:"var(--muted-foreground)"},children:"No responses for this round yet."}):e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"space-y-3 pt-2",children:a.responses.map($=>e.jsx(Qe,{response:$,questions:f,token:r,onUpdated:F=>l(a.id,F)},$.id))}),e.jsx("div",{className:"pt-3",children:e.jsx(Rt,{formId:o,roundId:a.id,responses:a.responses.map($=>({id:$.id,email:$.email,answers:$.answers})),questions:f})})]})]})]},a.id)})})]})}function Qt({rounds:s,selectedRoundId:t,onSelectRound:n}){return s.length===0?null:e.jsxs("div",{className:"card p-4",children:[e.jsx("h3",{className:"text-xs font-semibold uppercase tracking-wider mb-3",style:{color:"var(--muted-foreground)"},children:"Round History"}),e.jsx("ul",{className:"text-sm space-y-1",children:s.map(o=>e.jsxs("li",{className:`flex justify-between items-center border-b border-border last:border-b-0 py-1.5 cursor-pointer hover:bg-muted/50 rounded px-1 ${t===o.id?"bg-accent/10":""}`,onClick:()=>n(o),children:[e.jsxs("span",{className:"text-foreground",children:["Round ",o.round_number," ",o.is_active&&e.jsx("span",{className:"text-success font-semibold",children:"(active)"})]}),e.jsx("span",{className:`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${o.synthesis?"bg-success/10 text-success":"bg-muted text-muted-foreground"}`,children:o.synthesis?"Synthesis":"No Synthesis"})]},o.id))})]})}function Wt(){return e.jsxs("div",{className:"min-h-screen bg-background text-foreground font-sans flex flex-col",children:[e.jsx("header",{className:"border-b sticky top-0 z-40",style:{backgroundColor:"var(--card)",borderColor:"var(--border)",boxShadow:"0 1px 3px 0 rgba(0,0,0,0.04)"},children:e.jsxs("div",{className:"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx(U,{variant:"avatar",width:"2rem",height:"2rem"}),e.jsxs("div",{children:[e.jsx(U,{variant:"text",width:"10rem",height:"1.25rem"}),e.jsx(U,{variant:"text",width:"8rem",height:"0.875rem",style:{marginTop:"0.25rem"}})]})]}),e.jsx(U,{variant:"button",width:"5rem",height:"2rem"})]})}),e.jsxs("main",{className:"flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6",children:[e.jsx(U,{variant:"text",width:"10rem",style:{marginBottom:"1.5rem"}}),e.jsxs("div",{className:"mb-6 flex gap-4",children:[e.jsx(U,{variant:"avatar",width:"3rem",height:"3rem"}),e.jsx(U,{variant:"avatar",width:"3rem",height:"3rem"}),e.jsx(U,{variant:"avatar",width:"3rem",height:"3rem"})]}),e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-3 gap-6",children:[e.jsxs("div",{className:"lg:col-span-2 space-y-6",children:[e.jsx(se,{}),e.jsx(se,{})]}),e.jsxs("div",{className:"lg:col-span-1 space-y-6",children:[e.jsx(se,{}),e.jsx(se,{}),e.jsx(se,{})]})]})]})]})}function Kt(s){return s?new Date(s).toLocaleString(void 0,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):""}function Vt({versions:s,currentVersionId:t,onClose:n}){var a;const o=m.useMemo(()=>[...s].sort((c,f)=>c.version-f.version),[s]),r=o.length>=2?o[o.length-2].id:((a=o[0])==null?void 0:a.id)??null,l=t??(o.length>=1?o[o.length-1].id:null),[d,p]=m.useState(r),[g,u]=m.useState(l),v=s.find(c=>c.id===d)??null,i=s.find(c=>c.id===g)??null;return s.length<2?null:e.jsxs("div",{className:"card p-4 sm:p-6",children:[e.jsxs("div",{className:"flex items-center justify-between mb-4",children:[e.jsxs("h2",{className:"text-lg font-semibold text-foreground flex items-center gap-2",children:[e.jsx(Ge,{size:20,style:{color:"var(--accent)"}}),"Compare Versions"]}),e.jsx("button",{onClick:n,className:"p-1.5 rounded-lg transition-colors",style:{background:"none",border:"none",color:"var(--muted-foreground)",cursor:"pointer"},title:"Close comparison",children:e.jsx(pe,{size:18})})]}),e.jsxs("div",{className:"flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4",children:[e.jsx(Re,{label:"Left",versions:o,value:d,onChange:p,excludeId:g}),e.jsx("span",{className:"hidden sm:flex items-center justify-center text-xs font-bold px-2",style:{color:"var(--muted-foreground)"},children:"vs"}),e.jsx(Re,{label:"Right",versions:o,value:g,onChange:u,excludeId:d})]}),v&&i&&e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-2 gap-4",children:[e.jsx(Fe,{version:v}),e.jsx(Fe,{version:i})]}),(v==null?void 0:v.synthesis_json)&&(i==null?void 0:i.synthesis_json)&&e.jsx("div",{className:"mt-4",children:e.jsx(Jt,{left:v.synthesis_json,right:i.synthesis_json,leftVersion:v.version,rightVersion:i.version})})]})}function Re({label:s,versions:t,value:n,onChange:o,excludeId:r}){return e.jsxs("div",{className:"flex-1",children:[e.jsx("label",{className:"text-xs font-medium mb-1 block",style:{color:"var(--muted-foreground)"},children:s}),e.jsxs("div",{className:"relative",children:[e.jsx("select",{value:n??"",onChange:l=>o(Number(l.target.value)),className:"w-full text-sm rounded-lg px-3 py-2 appearance-none pr-8",style:{backgroundColor:"var(--muted)",color:"var(--foreground)",border:"1px solid var(--border)",cursor:"pointer"},children:t.map(l=>e.jsxs("option",{value:l.id,disabled:l.id===r,children:["v",l.version,l.is_active?" (published)":"",l.model_used?` — ${l.model_used.split("/").pop()}`:"",l.created_at?` · ${Kt(l.created_at)}`:""]},l.id))}),e.jsx(ce,{size:14,className:"absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none",style:{color:"var(--muted-foreground)"}})]})]})}function Fe({version:s}){var n;const t=s.synthesis_json;return e.jsxs("div",{className:"rounded-lg p-4 overflow-auto max-h-[60vh]",style:{backgroundColor:"var(--muted)",border:"1px solid var(--border)"},children:[e.jsxs("div",{className:"flex items-center gap-2 mb-3",children:[e.jsxs("span",{className:"text-xs font-semibold px-2 py-0.5 rounded-full",style:{backgroundColor:s.is_active?"color-mix(in srgb, var(--success) 12%, transparent)":"var(--card)",color:s.is_active?"var(--success)":"var(--muted-foreground)"},children:["v",s.version,s.is_active?" · Published":" · Draft"]}),e.jsxs("span",{className:"text-xs",style:{color:"var(--muted-foreground)"},children:[(n=s.model_used)==null?void 0:n.split("/").pop()," · ",s.strategy]})]}),(t==null?void 0:t.narrative)&&e.jsxs("div",{className:"mb-3",children:[e.jsx("h4",{className:"text-xs font-semibold uppercase tracking-wider mb-1",style:{color:"var(--muted-foreground)"},children:"Narrative"}),e.jsx("div",{className:"text-sm prose prose-sm max-w-none",style:{color:"var(--foreground)"},children:e.jsx(J,{content:t.narrative})})]}),(t==null?void 0:t.agreements)&&e.jsxs("div",{className:"mb-2",children:[e.jsxs("h4",{className:"text-xs font-semibold uppercase tracking-wider mb-1",style:{color:"var(--muted-foreground)"},children:["Agreements (",t.agreements.length,")"]}),e.jsx("ul",{className:"space-y-1",children:t.agreements.map((o,r)=>e.jsxs("li",{className:"text-xs",style:{color:"var(--foreground)"},children:["• ",String(o.claim||"")]},r))})]}),(t==null?void 0:t.disagreements)&&t.disagreements.length>0&&e.jsxs("div",{className:"mb-2",children:[e.jsxs("h4",{className:"text-xs font-semibold uppercase tracking-wider mb-1",style:{color:"var(--muted-foreground)"},children:["Disagreements (",t.disagreements.length,")"]}),e.jsx("ul",{className:"space-y-1",children:t.disagreements.map((o,r)=>e.jsxs("li",{className:"text-xs",style:{color:"var(--foreground)"},children:["• ",String(o.topic||"")]},r))})]}),!t&&s.synthesis&&e.jsx("div",{className:"text-sm prose prose-sm max-w-none",style:{color:"var(--foreground)"},children:e.jsx(J,{content:s.synthesis})}),!t&&!s.synthesis&&e.jsx("p",{className:"text-sm",style:{color:"var(--muted-foreground)"},children:"No synthesis content"})]})}function Jt({left:s,right:t,leftVersion:n,rightVersion:o}){var c,f,k,z,$,F,w,x;const r=((c=s.agreements)==null?void 0:c.length)??0,l=((f=t.agreements)==null?void 0:f.length)??0,d=((k=s.disagreements)==null?void 0:k.length)??0,p=((z=t.disagreements)==null?void 0:z.length)??0,g=(($=s.nuances)==null?void 0:$.length)??0,u=((F=t.nuances)==null?void 0:F.length)??0,v=((w=s.emergent_insights)==null?void 0:w.length)??0,i=((x=t.emergent_insights)==null?void 0:x.length)??0,a=[{label:"Agreements",l:r,r:l},{label:"Disagreements",l:d,r:p},{label:"Nuances",l:g,r:u},{label:"Emergent Insights",l:v,r:i}];return e.jsxs("div",{className:"rounded-lg p-3 text-xs",style:{backgroundColor:"var(--muted)",border:"1px solid var(--border)"},children:[e.jsx("h4",{className:"font-semibold uppercase tracking-wider mb-2",style:{color:"var(--muted-foreground)"},children:"Stats Comparison"}),e.jsxs("div",{className:"grid grid-cols-3 gap-x-4 gap-y-1",children:[e.jsx("div",{className:"font-medium",style:{color:"var(--muted-foreground)"}}),e.jsxs("div",{className:"text-center font-medium",style:{color:"var(--accent)"},children:["v",n]}),e.jsxs("div",{className:"text-center font-medium",style:{color:"var(--accent)"},children:["v",o]}),a.map(j=>e.jsxs(m.Fragment,{children:[e.jsx("div",{style:{color:"var(--foreground)"},children:j.label}),e.jsx("div",{className:"text-center",style:{color:"var(--foreground)"},children:j.l}),e.jsxs("div",{className:"text-center",style:{color:j.r!==j.l?"var(--warning, #f59e0b)":"var(--foreground)"},children:[j.r,j.r!==j.l&&e.jsxs("span",{className:"ml-1 text-[10px]",children:["(",j.r>j.l?"+":"",j.r-j.l,")"]})]})]},j.label))]})]})}function Xt(s){return s?new Date(s).toLocaleString(void 0,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):"Unknown"}function Yt(s){if(!s)return"";const t=Date.now()-new Date(s).getTime(),n=Math.floor(t/6e4);if(n<1)return"just now";if(n<60)return`${n}m ago`;const o=Math.floor(n/60);return o<24?`${o}h ago`:`${Math.floor(o/24)}d ago`}function Zt(s){if(!s)return"Unknown";const t=s.split("/");return t[t.length-1]||s}function en(s){return s?{single:"Single Analyst",ensemble:"Ensemble",structured:"Structured"}[s]||s:""}function sn({versions:s,selectedVersionId:t,onSelectVersion:n}){const[o,r]=m.useState(!1);if(s.length===0)return null;const l=[...s].sort((u,v)=>v.version-u.version),d=o?l.length:Math.min(3,l.length),p=l.slice(0,d),g=l.length>3;return e.jsxs("div",{className:"card p-4 sm:p-5",children:[e.jsxs("div",{className:"flex items-center justify-between mb-4",children:[e.jsxs("h3",{className:"text-sm font-semibold flex items-center gap-2",style:{color:"var(--foreground)"},children:[e.jsx(He,{size:15,style:{color:"var(--accent)"}}),"Version History"]}),e.jsxs("span",{className:"text-xs px-2 py-0.5 rounded-full",style:{backgroundColor:"var(--muted)",color:"var(--muted-foreground)"},children:[s.length," version",s.length!==1?"s":""]})]}),e.jsxs("div",{className:"relative pl-6",children:[e.jsx("div",{className:"absolute left-[9px] top-2 bottom-2 w-[2px]",style:{backgroundColor:"var(--border)"}}),e.jsx("div",{className:"space-y-0",children:p.map((u,v)=>{const i=u.id===t,a=v===0;return e.jsxs("button",{type:"button",onClick:()=>n(u.id),className:"relative w-full text-left group transition-all",style:{padding:"0.625rem 0.75rem 0.625rem 1.25rem",background:"none",border:"none",cursor:"pointer",borderRadius:"var(--radius)",fontFamily:"var(--font-family)"},onMouseEnter:c=>{c.currentTarget.style.backgroundColor="color-mix(in srgb, var(--accent) 5%, transparent)"},onMouseLeave:c=>{c.currentTarget.style.backgroundColor=i?"color-mix(in srgb, var(--accent) 8%, transparent)":"transparent"},children:[e.jsx("div",{className:"absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center",style:{left:"-14.5px"},children:e.jsx("div",{className:"rounded-full transition-all",style:{width:i||u.is_active?"14px":"10px",height:i||u.is_active?"14px":"10px",backgroundColor:u.is_active?"var(--success)":i?"var(--accent)":"var(--muted-foreground)",border:`2px solid ${u.is_active?"color-mix(in srgb, var(--success) 30%, transparent)":i?"color-mix(in srgb, var(--accent) 30%, transparent)":"var(--card)"}`,boxShadow:u.is_active||i?`0 0 0 3px ${u.is_active?"color-mix(in srgb, var(--success) 15%, transparent)":"color-mix(in srgb, var(--accent) 15%, transparent)"}`:"none"}})}),e.jsxs("div",{className:"flex items-start justify-between gap-2",children:[e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-0.5",children:[e.jsxs("span",{className:"text-sm font-semibold",style:{color:i?"var(--accent)":"var(--foreground)"},children:["v",u.version]}),u.is_active&&e.jsxs("span",{className:"inline-flex items-center gap-0.5 px-1.5 py-0 rounded-full text-[10px] font-semibold",style:{backgroundColor:"color-mix(in srgb, var(--success) 12%, transparent)",color:"var(--success)"},children:[e.jsx(me,{size:9})," Published"]}),a&&!u.is_active&&e.jsx("span",{className:"inline-flex items-center gap-0.5 px-1.5 py-0 rounded-full text-[10px] font-medium",style:{backgroundColor:"color-mix(in srgb, var(--accent) 10%, transparent)",color:"var(--accent)"},children:"Latest"})]}),e.jsxs("div",{className:"flex items-center gap-3 text-[11px]",style:{color:"var(--muted-foreground)"},children:[u.model_used&&e.jsxs("span",{className:"inline-flex items-center gap-1",children:[e.jsx(Ys,{size:10}),Zt(u.model_used)]}),u.strategy&&e.jsxs("span",{className:"inline-flex items-center gap-1",children:[e.jsx(Ue,{size:10}),en(u.strategy)]}),u.synthesis_json&&e.jsxs("span",{className:"inline-flex items-center gap-1",children:[e.jsx(Zs,{size:10}),"Structured"]})]})]}),e.jsxs("div",{className:"flex-shrink-0 text-right",style:{minWidth:"5rem"},children:[e.jsx("div",{className:"text-[11px] font-medium",style:{color:"var(--muted-foreground)"},children:Yt(u.created_at)}),e.jsx("div",{className:"text-[10px]",style:{color:"var(--muted-foreground)",opacity:.7},children:Xt(u.created_at)})]})]})]},u.id)})})]}),g&&e.jsx("button",{onClick:()=>r(u=>!u),className:"w-full flex items-center justify-center gap-1.5 text-xs font-medium mt-3 py-1.5 rounded-md transition-colors",style:{backgroundColor:"var(--muted)",color:"var(--muted-foreground)",border:"none",cursor:"pointer"},children:o?e.jsxs(e.Fragment,{children:[e.jsx(et,{size:12}),"Show Less"]}):e.jsxs(e.Fragment,{children:[e.jsx(ce,{size:12}),"Show ",l.length-3," More"]})})]})}const tn=["anthropic/claude-opus-4-6","anthropic/claude-sonnet-4","openai/gpt-4o","google/gemini-2.0-flash"];function Me(s){if(typeof s=="string")return s;if(s&&typeof s=="object"){const t=s;return String(t.text||t.label||t.question||"")}return""}function vn(){js("Synthesis Summary");const s=Ie(),{id:t}=gs(),n=Number(t),{toastError:o,toastWarning:r,toastSuccess:l}=Ns(),{token:d,logout:p}=ws(),g=d??"",[u,v]=m.useState(""),[i,a]=m.useState(null),[c,f]=m.useState([]),[k,z]=m.useState(null),[$,F]=m.useState(!1),[w,x]=m.useState(null),[j,C]=m.useState(!1),[A,N]=m.useState([]),[b,S]=m.useState(null),[q,H]=m.useState("preparing"),[We,G]=m.useState(0),[Ke]=m.useState(5),[xe,Ve]=m.useState("simple"),[Je,he]=m.useState("view"),[de,Xe]=m.useState("anthropic/claude-opus-4-6"),[ve,fe]=m.useState(!1),[O,be]=m.useState([]),[X,re]=m.useState(null),[ye,je]=m.useState(!1),[ke,Y]=m.useState([]),[nn,ue]=m.useState(!1),[Z,Ye]=m.useState(!0),Ze=m.useCallback(h=>{h.type==="synthesis_complete"&&h.form_id===n&&K().then(()=>{h.round_id&&typeof h.round_id=="number"&&ee(h.round_id)})},[n]),{viewers:es}=Es({formId:n||null,page:"summary",userEmail:u,onMessage:Ze}),P=xs({extensions:[hs,vs,fs.configure({placeholder:"Write the synthesis for this round…"})],content:"",editorProps:{attributes:{class:"prose prose-sm max-w-none focus:outline-none"}}}),D=b||k,R=(D==null?void 0:D.synthesis_json)||null,B=m.useMemo(()=>{if(!R)return{};const h={},y=new Set;for(const _ of R.agreements||[])for(const T of _.supporting_experts||[])y.add(T);for(const _ of R.disagreements||[])for(const T of _.positions||[])for(const M of T.experts||[])y.add(M);for(const _ of y)h[_]=`Expert ${_}`;return h},[R]),Ne=m.useMemo(()=>O.find(h=>h.id===X)||null,[O,X]);m.useEffect(()=>{g&&_s().then(h=>v(h.email||"")).catch(()=>{})},[g]),m.useEffect(()=>{!g||!n||K().then(()=>oe()).catch(()=>{})},[g,n,P]);async function K(){var h;F(!0),x(null);try{const y=await Cs(n);a(y);const _=await zs(n),T=(Array.isArray(_)?_:[]).map(I=>({id:I.id,round_number:I.round_number,synthesis:I.synthesis||"",synthesis_json:I.synthesis_json||null,is_active:!!I.is_active,questions:Array.isArray(I.questions)?I.questions:[],convergence_score:I.convergence_score??null,response_count:I.response_count??0}));f(T);const M=T.find(I=>I.is_active)||null;if(z(M),M&&!b&&(S(M),ee(M.id)),M&&P){P.commands.setContent(M.synthesis||""),ue(!!(M.synthesis&&M.synthesis.trim().length>0));const I=(h=M.questions)!=null&&h.length?M.questions:Array.isArray(y.questions)?y.questions:[];Y(I.map(Me))}else y&&Array.isArray(y.questions)&&Y(y.questions.map(Me))}catch(y){x(y.message||"Failed to load consultation data")}finally{F(!1)}}async function oe(){try{const h=await As(n);Array.isArray(h)&&N(h.map(y=>({id:y.id,round_number:y.round_number,synthesis:y.synthesis||"",is_active:!!y.is_active,responses:(y.responses||[]).map(_=>({id:_.id,answers:typeof _.answers=="string"?JSON.parse(_.answers):_.answers||{},email:_.email||null,timestamp:_.timestamp,version:_.version??1,round_id:y.id}))})))}catch{}}async function ee(h){try{const y=await ot(n,h);be(y);const _=y.find(T=>T.is_active);re((_==null?void 0:_.id)||(y.length>0?y[y.length-1].id:null))}catch{be([]),re(null)}}function ss(){p(),s("/")}async function ts(){if(j){C(!1);return}await oe(),C(!0)}async function ns(){if(!k||!n)return;const h=(P==null?void 0:P.getHTML())||"";try{await lt(n,h),ue(!0),l("Synthesis saved")}catch(y){o(y.message||"Failed to save synthesis")}}async function rs(){if(!n)return;const h=ke.map(y=>y.trim()).filter(y=>y.length>0);if(!h.length){r("Add at least one question for the next round.");return}F(!0);try{await Ts(n,{questions:h}),await K(),await oe(),ue(!1),S(null)}catch(y){o(y.message||"Failed to start next round")}finally{F(!1)}}async function os(){try{const h=await Ds(n,!0);if(!Array.isArray(h)||h.length===0){r("No responses to download");return}const y=h.flatMap((M,I)=>{const ls=new ae({children:[new Ce({text:`Response ${I+1}`,bold:!0})],spacing:{after:200}}),cs=Object.entries(M.answers).flatMap(([ds,us])=>[new ae({children:[new Ce({text:ds,bold:!0})],spacing:{after:80}}),new ae({text:String(us??""),spacing:{after:160}})]);return[ls,...cs,new ae("")]}),_=new bs({sections:[{children:y}]}),T=await ys.toBlob(_);te.saveAs(T,"responses.docx")}catch(h){o(h.message||"Failed to download responses")}}async function as(){const h=b||k;if(!(!n||!de||!h)){fe(!0),H("preparing"),G(0);try{H("analyzing"),G(1);const y=await it(n,h.id,{model:de,strategy:xe,n_analysts:3,mode:"human_only"});H("synthesising"),G(3),H("formatting"),G(4);const _=y.synthesis||y.summary||"";if(_&&P&&P.commands.setContent(_),y.synthesis_json&&h){const T={...h,synthesis:_,synthesis_json:y.synthesis_json};f(M=>M.map(I=>I.id===h.id?T:I)),(k==null?void 0:k.id)===h.id&&z(T),(b==null?void 0:b.id)===h.id&&S(T)}he("view"),await K(),h&&await ee(h.id),H("complete"),G(5),setTimeout(()=>{H("preparing"),G(0)},2e3)}catch(y){o(y.message||"Failed to generate synthesis"),H("preparing"),G(0)}finally{fe(!1)}}}async function is(h){try{await at(h),D&&await ee(D.id),await K()}catch(y){o(y.message||"Failed to activate version")}}function we(h){S(h),h.is_active&&P&&P.commands.setContent(h.synthesis||""),ee(h.id)}function _e(h,y){N(_=>_.map(T=>T.id===h?{...T,responses:T.responses.map(M=>M.id===y.id?{...M,answers:y.answers,version:y.version}:M)}:T))}return w&&!i?e.jsx("div",{className:"min-h-screen bg-background text-foreground flex items-center justify-center",children:e.jsxs("div",{className:"text-center max-w-md mx-auto px-4",children:[e.jsx("div",{className:"text-4xl mb-4",children:"⚠️"}),e.jsx("h2",{className:"text-xl font-semibold mb-2",style:{color:"var(--foreground)"},children:"Failed to Load"}),e.jsx("p",{className:"text-sm mb-6",style:{color:"var(--muted-foreground)"},children:w}),e.jsxs("div",{className:"flex gap-3 justify-center",children:[e.jsx(L,{variant:"accent",size:"md",onClick:()=>{K(),oe()},children:"Retry"}),e.jsx(L,{variant:"secondary",size:"md",onClick:()=>s("/"),children:"Back to Dashboard"})]})]})}):i?e.jsxs("div",{className:"min-h-screen bg-background text-foreground font-sans flex flex-col",children:[e.jsx(Ft,{email:u,viewers:es,onLogout:ss}),e.jsxs("main",{className:"flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6",children:[e.jsxs("div",{className:"mb-4 flex items-center justify-between",children:[e.jsx("button",{onClick:()=>s("/"),className:"text-sm font-medium transition-colors",style:{color:"var(--muted-foreground)",background:"none",border:"none",cursor:"pointer"},onMouseEnter:h=>h.currentTarget.style.color="var(--accent)",onMouseLeave:h=>h.currentTarget.style.color="var(--muted-foreground)",children:"← Back to Dashboard"}),e.jsx("h2",{className:"text-sm font-medium truncate max-w-[50vw] sm:max-w-none",style:{color:"var(--muted-foreground)"},children:i.title})]}),c.length>0&&e.jsx("div",{className:"mb-4 sm:mb-6 overflow-x-auto",children:e.jsx(wt,{rounds:c,activeRoundId:(k==null?void 0:k.id)||null,selectedRoundId:(b==null?void 0:b.id)||null,onSelectRound:we})}),e.jsx(jt,{stage:q,step:We,totalSteps:Ke,visible:ve}),e.jsxs("button",{onClick:()=>Ye(h=>!h),className:"fixed z-50 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium shadow-lg transition-all",style:{right:Z?"calc(20rem + 12px)":"12px",top:"4.75rem",background:"var(--card)",border:"1px solid var(--border)",color:"var(--foreground)"},title:Z?"Hide panel":"Show panel",children:[Z?e.jsx(pe,{size:15}):e.jsx(st,{size:15}),e.jsx("span",{className:"hidden sm:inline",children:Z?"Hide":"Controls"})]}),e.jsxs("div",{className:"space-y-4 sm:space-y-6",children:[b&&!b.is_active&&e.jsx(Ms,{round:b,isCurrentRound:!1,expertLabels:B,formId:n,token:g,currentUserEmail:u}),e.jsx(Ot,{structuredRounds:A,rounds:c,formQuestions:i.questions||[],formId:n,token:g,onResponseUpdated:_e}),(!b||b.is_active)&&e.jsx(Mt,{activeRound:k,synthesisViewMode:Je,onSetViewMode:he,editor:P}),b&&!b.is_active&&b.synthesis&&e.jsxs("div",{className:"card p-4 sm:p-6",children:[e.jsxs("h2",{className:"text-lg font-semibold mb-3 text-foreground",children:["Synthesis (Round ",b.round_number,")"]}),e.jsx(J,{content:b.synthesis})]}),R&&e.jsxs("div",{className:"card p-4 sm:p-6",children:[e.jsx("div",{className:"flex items-start justify-between gap-4 mb-3 flex-wrap",children:e.jsxs("h2",{className:"text-lg font-semibold text-foreground flex items-center gap-2",children:[e.jsx(tt,{size:20,style:{color:"var(--accent)"}})," Structured Analysis"]})}),D&&e.jsx("div",{className:"mb-4",children:e.jsx(Dt,{formId:n,roundId:D.id,synthesisText:(()=>{const h=[];R.narrative&&h.push(R.narrative);for(const y of R.agreements||[])h.push(`Agreement: ${y.claim} — ${y.evidence_summary}`);for(const y of R.disagreements||[]){h.push(`Disagreement: ${y.topic}`);for(const _ of y.positions||[])h.push(`  - ${_.position}: ${_.evidence}`)}for(const y of R.nuances||[])h.push(`Nuance: ${y.claim} — ${y.context}`);return h.join(`
`)})()})}),e.jsx(Le,{data:R,convergenceScore:(D==null?void 0:D.convergence_score)??void 0,expertLabels:B,formId:n,roundId:D==null?void 0:D.id,token:g,currentUserEmail:u})]}),D&&R&&e.jsx(At,{formId:n,roundId:D.id}),R&&e.jsxs("div",{className:"card p-4 sm:p-6",children:[e.jsxs("h2",{className:"text-lg font-semibold mb-3 text-foreground flex items-center gap-2",children:[e.jsx(nt,{size:20,style:{color:"var(--accent)"}})," Expert Cross-Analysis"]}),e.jsx(Is,{structuredData:R,resolvedExpertLabels:B,expertLabelPreset:"default"})]}),R&&e.jsxs("div",{className:"card p-4 sm:p-6",children:[e.jsxs("h2",{className:"text-lg font-semibold mb-3 text-foreground flex items-center gap-2",children:[e.jsx(rt,{size:20,style:{color:"var(--accent)"}})," Consensus Heatmap"]}),e.jsx(Ls,{structuredData:R,resolvedExpertLabels:B,questions:D==null?void 0:D.questions})]}),e.jsx(qt,{selectedVersion:Ne,displayRound:D,resolvedExpertLabels:B,formId:n,token:g,currentUserEmail:u}),ye&&O.length>=2&&e.jsx(Vt,{versions:O,currentVersionId:X,onClose:()=>je(!1)}),(R==null?void 0:R.emergent_insights)&&R.emergent_insights.length>0&&e.jsxs("div",{className:"card p-4 sm:p-6",children:[e.jsxs("h2",{className:"text-lg font-semibold mb-3 text-foreground flex items-center gap-2",children:[e.jsx(ne,{size:20,style:{color:"var(--accent)"}})," Emergent Insights"]}),e.jsx($t,{insights:R.emergent_insights??[],expertLabels:B,formId:n,roundId:D==null?void 0:D.id,token:g,currentUserEmail:u})]}),e.jsx(Pt,{questions:ke,onUpdateQuestion:(h,y)=>Y(_=>{const T=[..._];return T[h]=y,T}),onAddQuestion:()=>Y(h=>[...h,""]),onRemoveQuestion:h=>Y(y=>y.filter((_,T)=>T!==h))})]}),e.jsxs("div",{style:{position:"fixed",right:0,top:"4.5rem",width:"20rem",height:"calc(100vh - 4.5rem)",overflowY:"auto",zIndex:40,borderLeft:"1px solid var(--border)",background:"var(--background)",transform:Z?"translateX(0)":"translateX(100%)",transition:"transform 0.2s ease",padding:"1rem",display:"flex",flexDirection:"column",gap:"1rem"},children:[e.jsx(Ht,{form:i,activeRound:k}),e.jsx(Bt,{responsesOpen:j,onToggleResponses:ts,onDownloadResponses:os,onSaveSynthesis:ns,onStartNextRound:rs,loading:$,formTitle:i.title,formId:n,rounds:c,structuredSynthesisData:R,expertLabels:B}),e.jsx(It,{synthesisMode:xe,onModeChange:Ve,selectedModel:de,onModelChange:Xe,models:tn,isGenerating:ve,onGenerate:as}),e.jsx(Lt,{displayRound:D,synthesisVersions:O,selectedVersionId:X,onSelectVersion:re,selectedVersion:Ne,onActivateVersion:is,resolvedExpertLabels:B,formId:n,token:g,currentUserEmail:u,showCompare:ye,onToggleCompare:()=>je(h=>!h)}),O.length>0&&e.jsx(sn,{versions:O,selectedVersionId:X,onSelectVersion:re}),e.jsx(Qt,{rounds:c,selectedRoundId:(b==null?void 0:b.id)||null,onSelectRound:we})]})]}),e.jsx(Gt,{open:j,onClose:()=>C(!1),structuredRounds:A,rounds:c,formQuestions:i.questions||[],token:g,onResponseUpdated:_e})]}):e.jsx(Wt,{})}export{vn as default};
