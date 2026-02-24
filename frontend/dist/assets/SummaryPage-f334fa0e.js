import{j as e}from"./vendor-markdown-8e9c571a.js";import{r as g,u as Me,b as gs,f as ps}from"./vendor-react-cff1603b.js";import{E as xs,u as hs,S as vs,U as fs,P as bs}from"./vendor-tiptap-8421aa62.js";import{F as se,P as oe,T as Ce,a as ys,b as js}from"./vendor-docx-5da7a7ad.js";import{u as ks}from"./useDocumentTitle-dacbf0e5.js";import{a as W,A as Ns,b as ws,u as _s,g as Cs}from"./index-21b2a623.js";import{a as Ss}from"./forms-3ec29a03.js";import{f as $s,u as Es,a as zs,g as As,b as Ts,n as Ds,c as Rs}from"./usePresence-0f48dc26.js";import{L as M,e as Q}from"./questions-e15dd5dc.js";import{C as Is,M as J,P as Fs,S as qe,R as Ls,a as Ms,b as qs}from"./PasswordInput-71f75477.js";import{u as Pe}from"./useTranslation-d3da2142.js";import{i as Ps,j as Se,k as He,l as Hs,m as Bs,n as te,f as Be,B as Us,h as Ue,U as Ge,o as Gs,p as Os,I as Qs,Z as Oe,q as Ws,r as Ks,T as ie,s as Vs,t as le,e as me,G as Js,X as ge,u as $e,v as Ee,w as ue,x as Qe,y as ze,z as Xs,A as Ys,D as Zs,F as et,E as st,H as tt,J as nt,N as rt,O as ot}from"./vendor-icons-ef2e68eb.js";import{b as U,a as ee}from"./Skeleton-7cb61f3f.js";import"./index-cea90fcc.js";function at(s,n){return W.get(`/forms/${s}/rounds/${n}/synthesis_versions`)}function it(s){return W.put(`/synthesis_versions/${s}/activate`,{})}function lt(s,n,t){return W.post(`/forms/${s}/rounds/${n}/generate_synthesis`,t)}function ct(s,n){return W.post(`/forms/${s}/push_summary`,{summary:n})}async function dt(s,n){const t={}.VITE_API_BASE_URL??"",i=localStorage.getItem("access_token");function r(a){const o=document.cookie.match(new RegExp(`(?:^|; )${a}=([^;]*)`));return o?decodeURIComponent(o[1]):null}const m=r("csrf_token"),p=await fetch(`${t}/forms/${s}/export_synthesis?format=${n}`,{method:"GET",credentials:"include",headers:{...m?{"X-CSRF-Token":m}:{},...i?{Authorization:`Bearer ${i}`}:{}}});if(!p.ok)throw new Error(`Export failed: ${p.statusText}`);const l=await p.blob(),d=(p.headers.get("Content-Disposition")||"").match(/filename="?([^";\n]+)"?/),v=(d==null?void 0:d[1])||`synthesis-export.${n==="json"?"json":n==="pdf"?"pdf":"md"}`;return{blob:l,filename:v}}function ut(s,n){return W.post(`/forms/${s}/rounds/${n}/devil_advocate`)}function mt(s,n,t,i){return W.post(`/forms/${s}/rounds/${n}/translate`,{audience:t,synthesis_text:i})}function gt(s,n,t){return W.post(`/forms/${s}/rounds/${n}/voice_mirror`,{responses:t})}function pt(s,n){return n[s]||`Expert ${s}`}function ae(s,n){return s.map(t=>pt(t,n)).join(", ")}function xt(s){switch(s==null?void 0:s.toLowerCase()){case"high":return"[HIGH]";case"medium":return"[MED]";case"low":return"[LOW]";default:return"[—]"}}function ht(s,n,t,i){var p,l,c,d,v,a;const r=[],m=new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});r.push(`# ${s}`),r.push(""),r.push(`**Exported:** ${m}  `),r.push(`**Rounds:** ${n.length}`),r.push(""),r.push("---"),r.push("");for(const o of n)r.push(`## Round ${o.round_number}`),r.push(""),o.convergence_score!=null&&(r.push(`**Convergence Score:** ${(o.convergence_score*100).toFixed(0)}%`),r.push("")),o.response_count!=null&&(r.push(`**Responses:** ${o.response_count}`),r.push("")),o.questions.length>0&&(r.push("### Questions"),r.push(""),o.questions.forEach((u,f)=>{r.push(`${f+1}. ${u}`)}),r.push("")),o.synthesis&&(r.push("### Narrative Synthesis"),r.push(""),r.push(o.synthesis),r.push("")),r.push("---"),r.push("");if(t){if(r.push("## Structured Analysis"),r.push(""),t.narrative&&(r.push("### Narrative"),r.push(""),r.push(t.narrative),r.push("")),(p=t.agreements)!=null&&p.length){r.push("### Agreements"),r.push("");for(const o of t.agreements){const u=(o.confidence*100).toFixed(0);if(r.push(`- **${o.claim}** (${u}% confidence)`),r.push(`  - Supporting experts: ${ae(o.supporting_experts,i)}`),o.evidence_summary&&r.push(`  - Evidence: ${o.evidence_summary}`),(l=o.evidence_excerpts)!=null&&l.length){r.push("  - **Supporting Excerpts:**");for(const f of o.evidence_excerpts){const k=i[f.expert_id]||f.expert_label||`Expert ${f.expert_id}`;r.push(`    - _${k}_: "${f.quote}"`)}}}r.push("")}if((c=t.disagreements)!=null&&c.length){r.push("### Disagreements"),r.push("");for(const o of t.disagreements){r.push(`- **${o.topic}** ${xt(o.severity)} Severity: ${o.severity}`);for(const u of o.positions)r.push(`  - *${u.position}*`),r.push(`    - Experts: ${ae(u.experts,i)}`),u.evidence&&r.push(`    - Evidence: ${u.evidence}`)}r.push("")}if((d=t.nuances)!=null&&d.length){r.push("### Nuances"),r.push("");for(const o of t.nuances)r.push(`- **${o.claim}**`),r.push(`  - Context: ${o.context}`),r.push(`  - Relevant experts: ${ae(o.relevant_experts,i)}`);r.push("")}if((v=t.follow_up_probes)!=null&&v.length){r.push("### Follow-up Probes"),r.push("");for(const o of t.follow_up_probes)r.push(`- **${o.question}**`),r.push(`  - Target experts: ${ae(o.target_experts,i)}`),o.rationale&&r.push(`  - Rationale: ${o.rationale}`);r.push("")}if(Object.keys(i).length>0){r.push("### Expert Dimensions"),r.push("");for(const[o,u]of Object.entries(i))r.push(`- Expert ${o}: **${u}**`);r.push("")}if((a=t.emergent_insights)!=null&&a.length){r.push("### Emergent Insights"),r.push("");for(const o of t.emergent_insights)typeof o=="string"?r.push(`- ${o}`):o.title||o.description?(r.push(`- **${o.title||"Insight"}**: ${o.description||""}`),o.supporting_evidence&&r.push(`  - Evidence: ${o.supporting_evidence}`)):r.push(`- ${JSON.stringify(o)}`);r.push("")}if(t.confidence_map&&Object.keys(t.confidence_map).length>0){r.push("### Confidence Map"),r.push("");for(const[o,u]of Object.entries(t.confidence_map))r.push(`- ${o}: ${(u*100).toFixed(0)}%`);r.push("")}t.meta_synthesis_reasoning&&(r.push("### Meta-Synthesis Reasoning"),r.push(""),r.push(t.meta_synthesis_reasoning),r.push(""))}return r.push("---"),r.push("*Generated by Symphonia*"),r.join(`
`)}function vt(s,n,t,i){const r=We(s,n,t,i),m=r.replace("</body>","<script>window.addEventListener('load', function() { setTimeout(function() { window.print(); }, 600); });<\/script></body>"),p=window.open("","_blank");if(p)p.document.write(m),p.document.close();else{const l=new Blob([r],{type:"text/html;charset=utf-8"}),c=`${s.replace(/[^a-zA-Z0-9]+/g,"-").toLowerCase()}-report.html`;se.saveAs(l,c)}}function We(s,n,t,i){var k,z,$,I,_;const r=new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}),m=n.reduce((h,j)=>h+(j.response_count??0),0),p=Object.keys(i).length,l=n.filter(h=>h.convergence_score!=null).map(h=>h.convergence_score).pop();let c="";(k=t==null?void 0:t.agreements)!=null&&k.length&&(c=t.agreements.map(h=>{var N;const j=(h.confidence*100).toFixed(0),C=h.supporting_experts.map(y=>i[y]||`Expert ${y}`).join(", ");let A="";return(N=h.evidence_excerpts)!=null&&N.length&&(A='<div class="evidence-box"><p class="evidence-title">Supporting Evidence</p>'+h.evidence_excerpts.map(y=>{const S=i[y.expert_id]||y.expert_label||`Expert ${y.expert_id}`;return`<blockquote>&ldquo;${E(y.quote)}&rdquo;<br/><cite>&mdash; ${E(S)}</cite></blockquote>`}).join("")+"</div>"),`<div class="finding-card agreement">
        <div class="finding-header"><span class="finding-type">Area of Agreement</span><span class="confidence-badge">${j}% confidence</span></div>
        <h4>${E(h.claim)}</h4>
        <p class="experts-line">Supported by: ${E(C)}</p>
        ${h.evidence_summary?`<p>${E(h.evidence_summary)}</p>`:""}
        ${A}
      </div>`}).join(`
`));let d="";(z=t==null?void 0:t.disagreements)!=null&&z.length&&(d=t.disagreements.map(h=>{var A;const j=((A=h.severity)==null?void 0:A.toLowerCase())||"medium",C=h.positions.map(N=>{const y=N.experts.map(S=>i[S]||`Expert ${S}`).join(", ");return`<div class="position-block">
          <p class="position-text">${E(N.position)}</p>
          <p class="experts-line">Held by: ${E(y)}</p>
          ${N.evidence?`<p class="evidence-text">${E(N.evidence)}</p>`:""}
        </div>`}).join("");return`<div class="finding-card disagreement severity-${j}">
        <div class="finding-header"><span class="finding-type">Area of Disagreement</span><span class="severity-badge severity-${j}">${j.toUpperCase()}</span></div>
        <h4>${E(h.topic)}</h4>
        ${C}
      </div>`}).join(`
`));let v="";($=t==null?void 0:t.nuances)!=null&&$.length&&(v=t.nuances.map(h=>{const j=h.relevant_experts.map(C=>i[C]||`Expert ${C}`).join(", ");return`<div class="finding-card nuance">
        <div class="finding-header"><span class="finding-type">Nuance</span></div>
        <h4>${E(h.claim)}</h4>
        <p>${E(h.context)}</p>
        <p class="experts-line">Relevant experts: ${E(j)}</p>
      </div>`}).join(`
`));let a="";(I=t==null?void 0:t.follow_up_probes)!=null&&I.length&&(a='<ol class="probes-list">'+t.follow_up_probes.map(h=>{const j=h.target_experts.map(C=>i[C]||`Expert ${C}`).join(", ");return`<li>
        <strong>${E(h.question)}</strong>
        <br/><span class="experts-line">Target: ${E(j)}</span>
        ${h.rationale?`<br/><span class="rationale">${E(h.rationale)}</span>`:""}
      </li>`}).join("")+"</ol>");const o=n.map(h=>{const j=h.convergence_score!=null?`${(h.convergence_score*100).toFixed(0)}%`:"—";return`<tr><td>Round ${h.round_number}</td><td>${h.response_count??"—"}</td><td>${j}</td><td>${h.questions.length}</td></tr>`}).join("");let u="";(_=t==null?void 0:t.emergent_insights)!=null&&_.length&&(u=t.emergent_insights.map(h=>typeof h=="string"?`<li>${E(h)}</li>`:`<li><strong>${E(h.title||"Insight")}:</strong> ${E(h.description||"")}${h.supporting_evidence?`<br/><em>Evidence: ${E(h.supporting_evidence)}</em>`:""}</li>`).join(""),u=`<ul class="insights-list">${u}</ul>`);let f="";return t!=null&&t.confidence_map&&Object.keys(t.confidence_map).length>0&&(f=Object.entries(t.confidence_map).map(([h,j])=>{const C=(j*100).toFixed(0);return`<div class="confidence-bar-row">
        <span class="confidence-topic">${E(h)}</span>
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
      <dd class="govuk-summary-list__value">${n.length}</dd>
    </div>
    <div class="govuk-summary-list__row">
      <dt class="govuk-summary-list__key">Total responses</dt>
      <dd class="govuk-summary-list__value">${m}</dd>
    </div>
    <div class="govuk-summary-list__row">
      <dt class="govuk-summary-list__key">Experts consulted</dt>
      <dd class="govuk-summary-list__value">${p}</dd>
    </div>
    ${l!=null?`<div class="govuk-summary-list__row">
      <dt class="govuk-summary-list__key">Final convergence</dt>
      <dd class="govuk-summary-list__value">${(l*100).toFixed(0)}%</dd>
    </div>`:""}
  </div>

  <hr class="govuk-section-break govuk-section-break--xl govuk-section-break--visible" />

  <!-- Executive Summary -->
  <h2 class="govuk-heading-l">1. Executive Summary</h2>
  ${t!=null&&t.narrative?`<p class="govuk-body govuk-body-l">${E(t.narrative)}</p>`:'<p class="govuk-body">No structured synthesis narrative available. See individual round summaries below.</p>'}

  ${t!=null&&t.meta_synthesis_reasoning?`
  <div class="govuk-inset-text">
    <p class="govuk-body-s"><strong>Methodology note:</strong> ${E(t.meta_synthesis_reasoning)}</p>
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
    <tbody>${o}</tbody>
  </table>

  ${n.map(h=>`
  <h3 class="govuk-heading-m">Round ${h.round_number}</h3>
  ${h.questions.length>0?`
  <h4 class="govuk-heading-s">Questions posed</h4>
  <ol class="govuk-body">${h.questions.map(j=>`<li style="margin-bottom:8px">${E(j)}</li>`).join("")}</ol>`:""}
  ${h.synthesis?`
  <h4 class="govuk-heading-s">Round synthesis</h4>
  <div class="govuk-inset-text"><p class="govuk-body">${E(h.synthesis)}</p></div>`:""}
  `).join(`
`)}

  ${c||d||v?`
  <hr class="govuk-section-break govuk-section-break--xl govuk-section-break--visible" />

  <!-- Findings -->
  <h2 class="govuk-heading-l">3. Key Findings</h2>

  ${c?`
  <h3 class="govuk-heading-m">3.1 Areas of Agreement</h3>
  ${c}`:""}

  ${d?`
  <h3 class="govuk-heading-m">3.2 Areas of Disagreement</h3>
  <div class="govuk-warning-text">
    <span class="govuk-warning-text__icon" aria-hidden="true">!</span>
    <strong class="govuk-warning-text__text">The following areas show divergent expert opinion. These may require further consultation rounds or policy consideration of multiple approaches.</strong>
  </div>
  ${d}`:""}

  ${v?`
  <h3 class="govuk-heading-m">3.3 Nuances and Qualifications</h3>
  ${v}`:""}
  `:""}

  ${f?`
  <hr class="govuk-section-break govuk-section-break--xl govuk-section-break--visible" />
  <h2 class="govuk-heading-l">4. Confidence Assessment</h2>
  <p class="govuk-body">Confidence levels across key topics, based on expert agreement and evidence quality:</p>
  ${f}`:""}

  ${u?`
  <hr class="govuk-section-break govuk-section-break--xl govuk-section-break--visible" />
  <h2 class="govuk-heading-l">${f?"5":"4"}. Emergent Insights</h2>
  <p class="govuk-body">Cross-cutting themes and unexpected findings that emerged from the consultation:</p>
  ${u}`:""}

  ${a?`
  <hr class="govuk-section-break govuk-section-break--xl govuk-section-break--visible" />
  <h2 class="govuk-heading-l">Annex A: Recommended Follow-up Questions</h2>
  <p class="govuk-body">The following questions are recommended for subsequent consultation rounds:</p>
  ${a}`:""}

  ${p>0?`
  <hr class="govuk-section-break govuk-section-break--xl govuk-section-break--visible" />
  <h2 class="govuk-heading-l">Annex B: Expert Panel</h2>
  <table class="govuk-table">
    <thead><tr><th class="govuk-table__header">ID</th><th class="govuk-table__header">Expertise Dimension</th></tr></thead>
    <tbody>${Object.entries(i).map(([h,j])=>`<tr><td class="govuk-table__cell">Expert ${E(h)}</td><td class="govuk-table__cell">${E(j)}</td></tr>`).join("")}</tbody>
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
</html>`}function E(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function ft(s,n,t,i){const r=We(s,n,t,i),m=new Blob([r],{type:"text/html;charset=utf-8"}),p=`${s.replace(/[^a-zA-Z0-9]+/g,"-").toLowerCase()}-govuk-report.html`;se.saveAs(m,p)}function bt({formTitle:s,formId:n,rounds:t,structuredSynthesisData:i,expertLabels:r}){const[m,p]=g.useState(!1),[l,c]=g.useState(!1),[d,v]=g.useState(!1),[a,o]=g.useState(!1),[u,f]=g.useState(!1),[k,z]=g.useState(!1),$=()=>{p(!0);try{const j=ht(s,t,i,r),C=new Blob([j],{type:"text/markdown;charset=utf-8"}),A=`${s.replace(/[^a-zA-Z0-9]+/g,"-").toLowerCase()}-synthesis.md`;se.saveAs(C,A)}finally{setTimeout(()=>p(!1),500)}},I=()=>{c(!0);try{vt(s,t,i,r)}finally{setTimeout(()=>c(!1),800)}},_=()=>{v(!0);try{ft(s,t,i,r)}finally{setTimeout(()=>v(!1),800)}},h=async(j,C)=>{C(!0);try{const{blob:A,filename:N}=await dt(n,j);se.saveAs(A,N)}catch(A){console.error("Backend export failed:",A)}finally{C(!1)}};return e.jsxs(e.Fragment,{children:[e.jsx("p",{className:"text-xs font-semibold uppercase tracking-wider mt-2 mb-1",style:{color:"var(--muted-foreground)"},children:"Export Synthesis"}),e.jsx(M,{variant:"secondary",size:"md",onClick:()=>h("markdown",o),loading:a,loadingText:"Downloading…",className:"w-full text-left justify-start",children:"Download as Markdown"}),e.jsx(M,{variant:"secondary",size:"md",onClick:()=>h("json",f),loading:u,loadingText:"Downloading…",className:"w-full text-left justify-start",children:"Download as JSON"}),e.jsx(M,{variant:"secondary",size:"md",onClick:()=>h("pdf",z),loading:k,loadingText:"Downloading…",className:"w-full text-left justify-start",children:"Download as PDF"}),e.jsx("p",{className:"text-xs font-semibold uppercase tracking-wider mt-3 mb-1",style:{color:"var(--muted-foreground)"},children:"Client Reports"}),e.jsx(M,{variant:"secondary",size:"md",onClick:$,loading:m,loadingText:"Exporting…",className:"w-full text-left justify-start",children:"Export as Markdown"}),e.jsx(M,{variant:"secondary",size:"md",onClick:I,loading:l,loadingText:"Preparing PDF…",className:"w-full text-left justify-start",children:"Export as PDF"}),e.jsx(M,{variant:"secondary",size:"md",onClick:_,loading:d,loadingText:"Generating…",className:"w-full text-left justify-start",children:"Export GOV.UK Report"})]})}const yt={preparing:e.jsx(Ps,{size:16,style:{color:"var(--accent)"}}),mock_init:e.jsx(Se,{size:16,style:{color:"var(--accent)"}}),synthesising:e.jsx(He,{size:16,style:{color:"var(--accent)"}}),analyzing:e.jsx(Hs,{size:16,style:{color:"var(--accent)"}}),mapping_results:e.jsx(Bs,{size:16,style:{color:"var(--accent)"}}),formatting:e.jsx(te,{size:16,style:{color:"var(--accent)"}}),mock_complete:e.jsx(Se,{size:16,style:{color:"var(--accent)"}}),complete:e.jsx(Be,{size:16,style:{color:"var(--success)"}}),generating:e.jsx(Us,{size:16,style:{color:"var(--accent)"}})},jt={preparing:"synthesis.progress.preparing",mock_init:"synthesis.progress.mockInit",synthesising:"synthesis.progress.synthesising",analyzing:"synthesis.progress.analyzing",mapping_results:"synthesis.progress.mappingResults",formatting:"synthesis.progress.formatting",mock_complete:"synthesis.progress.mockComplete",complete:"synthesis.progress.complete",generating:"synthesis.progress.generating"},kt=e.jsx(Ue,{size:16,style:{color:"var(--muted-foreground)"}});function Nt({stage:s,step:n,totalSteps:t,visible:i}){const{t:r}=Pe();if(!i)return null;const m=yt[s]||kt,p=jt[s],l=p?r(p):s,c=t>0?Math.round(n/t*100):0,d=s==="complete"||s==="mock_complete";return e.jsxs("div",{className:`synthesis-progress ${d?"complete":""}`,"aria-live":"polite","aria-atomic":"true",children:[e.jsxs("div",{className:"synthesis-progress-header",children:[e.jsx("span",{className:"synthesis-progress-emoji","aria-hidden":"true",children:m}),e.jsx("span",{className:"synthesis-progress-label",children:l}),e.jsxs("span",{className:"synthesis-progress-pct",children:[c,"%"]})]}),e.jsx("div",{className:"synthesis-progress-track",role:"progressbar","aria-valuenow":c,"aria-valuemin":0,"aria-valuemax":100,"aria-label":r("synthesis.progress.progressLabel",{label:l}),children:e.jsx("div",{className:"synthesis-progress-fill",style:{width:`${c}%`}})}),!d&&e.jsx("div",{className:"synthesis-progress-steps",children:r("synthesis.progress.stepOf",{step:n,total:t})})]})}function wt(s){if(s==null)return"var(--muted-foreground)";const n=Math.round(s*100);return n>=80?"var(--success)":n>=60?"var(--warning)":"var(--destructive)"}function _t(s){return s==null?"—":`${Math.round(s*100)}%`}function Ct({rounds:s,activeRoundId:n,selectedRoundId:t,onSelectRound:i}){const[r,m]=g.useState(null),p=g.useRef([]),l=g.useRef([]),c=g.useCallback((a,o)=>{var f;let u=-1;a.key==="ArrowRight"||a.key==="ArrowDown"?(a.preventDefault(),u=(o+1)%s.length):a.key==="ArrowLeft"||a.key==="ArrowUp"?(a.preventDefault(),u=(o-1+s.length)%s.length):a.key==="Home"?(a.preventDefault(),u=0):a.key==="End"&&(a.preventDefault(),u=s.length-1),u>=0&&((f=p.current[u])==null||f.focus(),i(s[u]))},[s,i]),d=g.useCallback((a,o)=>{var f;let u=-1;a.key==="ArrowDown"?(a.preventDefault(),u=(o+1)%s.length):a.key==="ArrowUp"?(a.preventDefault(),u=(o-1+s.length)%s.length):a.key==="Home"?(a.preventDefault(),u=0):a.key==="End"&&(a.preventDefault(),u=s.length-1),u>=0&&((f=l.current[u])==null||f.focus(),i(s[u]))},[s,i]);if(s.length===0)return null;const v=s.findIndex(a=>a.id===t);return e.jsxs("div",{className:"round-timeline-v2",children:[e.jsxs("div",{className:"round-timeline-v2-header",children:[e.jsx("h3",{className:"round-timeline-v2-title",children:"Round Navigation"}),e.jsxs("span",{className:"round-timeline-v2-count",children:[s.length," round",s.length!==1?"s":""]})]}),e.jsx("div",{className:"round-timeline-v2-stepper",role:"tablist","aria-label":"Round stepper",children:s.map((a,o)=>{const u=a.is_active,f=a.id===t,k=!!(a.synthesis&&a.synthesis.trim()),z=o===s.length-1;return e.jsxs("div",{className:"round-timeline-v2-step",children:[!z&&e.jsx("div",{className:`round-timeline-v2-connector ${k?"completed":""}`}),e.jsx("button",{ref:$=>{p.current[o]=$},className:["round-timeline-v2-node",u?"active":"",f?"selected":"",k?"has-synthesis":""].filter(Boolean).join(" "),role:"tab","aria-selected":f,tabIndex:f||v===-1&&o===0?0:-1,onClick:()=>i(a),onKeyDown:$=>c($,o),onMouseEnter:()=>m(a.id),onMouseLeave:()=>m(null),"aria-label":`Round ${a.round_number}${u?" (active)":""}${k?" (synthesised)":""}`,children:k?e.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"3",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:e.jsx("polyline",{points:"20 6 9 17 4 12"})}):e.jsx("span",{className:"round-timeline-v2-node-number",children:a.round_number})}),e.jsxs("span",{className:`round-timeline-v2-step-label ${f?"selected":""} ${u?"active":""}`,"aria-hidden":"true",children:["R",a.round_number]})]},a.id)})}),e.jsx("div",{className:"round-timeline-v2-cards",role:"listbox","aria-label":"Round cards",children:s.map((a,o)=>{var z;const u=a.is_active,f=a.id===t,k=!!(a.synthesis&&a.synthesis.trim());return e.jsxs("button",{ref:$=>{l.current[o]=$},className:["round-card-v2",f?"selected":"",u?"current":""].filter(Boolean).join(" "),role:"option","aria-selected":f,tabIndex:f||v===-1&&o===0?0:-1,onClick:()=>i(a),onKeyDown:$=>d($,o),children:[e.jsx("div",{className:"round-card-v2-header",children:e.jsxs("div",{className:"round-card-v2-title-row",children:[e.jsxs("span",{className:"round-card-v2-title",children:["Round ",a.round_number]}),e.jsxs("div",{className:"round-card-v2-badges",children:[u&&e.jsxs("span",{className:"round-card-v2-badge round-card-v2-badge-active",children:[e.jsx("span",{className:"round-card-v2-badge-dot active"}),"Live"]}),k&&!u&&e.jsxs("span",{className:"round-card-v2-badge round-card-v2-badge-complete",children:[e.jsx(Be,{size:12,style:{color:"var(--success)",display:"inline",verticalAlign:"text-bottom",marginRight:"3px"}}),"Synthesised"]}),!k&&!u&&e.jsx("span",{className:"round-card-v2-badge round-card-v2-badge-pending",children:"Pending"})]})]})}),e.jsxs("div",{className:"round-card-v2-stats",children:[e.jsxs("div",{className:"round-card-v2-stat",children:[e.jsx("span",{className:"round-card-v2-stat-icon",children:e.jsx(Ge,{size:14,style:{color:"var(--muted-foreground)"}})}),e.jsx("span",{className:"round-card-v2-stat-value",children:a.response_count??0}),e.jsx("span",{className:"round-card-v2-stat-label",children:"responses"})]}),e.jsxs("div",{className:"round-card-v2-stat",children:[e.jsx("span",{className:"round-card-v2-stat-icon",children:e.jsx(Gs,{size:14,style:{color:"var(--accent)"}})}),e.jsx("span",{className:"round-card-v2-stat-value",style:{color:wt(a.convergence_score)},children:_t(a.convergence_score)}),e.jsx("span",{className:"round-card-v2-stat-label",children:"convergence"})]}),e.jsxs("div",{className:"round-card-v2-stat",children:[e.jsx("span",{className:"round-card-v2-stat-icon",children:e.jsx(Os,{size:14,style:{color:"var(--muted-foreground)"}})}),e.jsx("span",{className:"round-card-v2-stat-value",children:((z=a.questions)==null?void 0:z.length)??0}),e.jsx("span",{className:"round-card-v2-stat-label",children:"questions"})]})]}),f&&e.jsx("div",{className:"round-card-v2-selected-indicator"})]},a.id)})})]})}function St(s){if(!s)return"";const n=s.toLowerCase();return n.includes("past")||n.includes("urðr")||n.includes("urd")?"dimension-past":n.includes("present")||n.includes("verðandi")||n.includes("verdandi")?"dimension-present":n.includes("future")||n.includes("skuld")?"dimension-future":n.includes("quantitative")?"dimension-quantitative":n.includes("qualitative")?"dimension-qualitative":n.includes("mixed")?"dimension-mixed":n.includes("industry")?"dimension-industry":n.includes("academia")?"dimension-academia":n.includes("policy")?"dimension-policy":""}function $t(s){switch(s){case"cross-pollination":return"Cross-pollination";case"synthesis":return"Synthesis";case"implicit":return"Implicit";default:return s}}function Et(s){switch(s){case"cross-pollination":return"emergence-type-cross-pollination";case"synthesis":return"emergence-type-synthesis";case"implicit":return"emergence-type-implicit";default:return""}}function zt({insights:s,expertLabels:n,formId:t,roundId:i,token:r,currentUserEmail:m}){const p=!!(t&&i&&r),[l,c]=g.useState(!0);return!s||s.length===0?null:e.jsxs("div",{className:"emergence-section fade-in",children:[e.jsxs("button",{className:"structured-section-header",onClick:()=>c(!l),"aria-expanded":l,"aria-controls":"emergence-highlights-body","aria-label":`Emergent Insights — ${s.length} item${s.length!==1?"s":""}`,children:[e.jsxs("div",{className:"structured-section-left",children:[e.jsx("span",{className:"structured-section-emoji","aria-hidden":"true",children:e.jsx(te,{size:16,style:{color:"var(--accent)"}})}),e.jsx("span",{className:"structured-section-title",children:"Emergent Insights"}),e.jsx("span",{className:"structured-section-badge",style:{backgroundColor:"var(--accent)"},children:s.length})]}),e.jsx("span",{className:`structured-section-chevron ${l?"expanded":""}`,"aria-hidden":"true",children:"▸"})]}),l&&e.jsx("div",{className:"structured-section-body slide-down",id:"emergence-highlights-body",role:"region","aria-label":"Emergent Insights",children:s.map((d,v)=>e.jsxs("div",{className:"emergence-card",children:[e.jsxs("div",{className:"emergence-card-top",children:[e.jsx("p",{className:"emergence-card-insight",children:d.insight}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"8px",flexShrink:0},children:[e.jsx("span",{className:`emergence-type-badge ${Et(d.emergence_type)}`,children:$t(d.emergence_type)}),p&&e.jsx(Is,{formId:t,roundId:i,sectionType:"emergence",sectionIndex:v,token:r,currentUserEmail:m})]})]}),d.contributing_experts.length>0&&e.jsx("div",{className:"structured-card-experts",children:d.contributing_experts.map(a=>e.jsx("span",{className:`expert-chip ${St(n==null?void 0:n[a])}`,title:`Expert ${a}`,children:(n==null?void 0:n[a])||`E${a}`},a))}),e.jsx("p",{className:"emergence-explanation",children:d.explanation})]},v))})]})}const At={simple:e.jsx(Oe,{size:16,style:{color:"var(--warning)"}}),committee:e.jsx(Ge,{size:16,style:{color:"var(--accent)"}}),ttd:e.jsx(He,{size:16,style:{color:"var(--accent)"}})},Tt=["simple","committee","ttd"];function Dt({mode:s,onModeChange:n}){const{t}=Pe(),[i,r]=g.useState(null),m=Tt.map(l=>({id:l,name:t(`synthesis.modes.${l}`),description:t(`synthesis.modes.${l}Desc`),detail:t(`synthesis.modes.${l}Detail`),icon:At[l],speed:t(`synthesis.modes.speed${l==="simple"?"Fast":l==="committee"?"Moderate":"Thorough"}`),bestFor:t(`synthesis.modes.${l}BestFor`)})),p=g.useCallback(l=>{var v;const c=m.findIndex(a=>a.id===s);let d=c;if(l.key==="ArrowDown"||l.key==="ArrowRight"?(l.preventDefault(),d=(c+1)%m.length):(l.key==="ArrowUp"||l.key==="ArrowLeft")&&(l.preventDefault(),d=(c-1+m.length)%m.length),d!==c){n(m[d].id);const a=l.target.closest('[role="radiogroup"]'),o=a==null?void 0:a.querySelectorAll('[role="radio"]');(v=o==null?void 0:o[d])==null||v.focus()}},[s,n,m]);return e.jsx("div",{className:"synthesis-mode-selector",role:"radiogroup","aria-label":t("synthesis.modes.modeLabel"),children:m.map(l=>e.jsxs("div",{style:{position:"relative"},children:[e.jsxs("button",{className:`synthesis-mode-option ${s===l.id?"selected":""}`,onClick:()=>n(l.id),role:"radio","aria-checked":s===l.id,"aria-label":`${l.name} synthesis mode: ${l.description}`,tabIndex:s===l.id?0:-1,onKeyDown:p,children:[e.jsx("span",{className:"synthesis-mode-emoji",children:l.icon}),e.jsxs("div",{className:"synthesis-mode-text",children:[e.jsx("span",{className:"synthesis-mode-name",children:l.name}),e.jsx("span",{className:"synthesis-mode-desc",children:l.description})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"0.375rem"},children:[e.jsx("span",{className:"synthesis-mode-speed",children:l.speed}),e.jsx("button",{type:"button",onClick:c=>{c.stopPropagation(),r(i===l.id?null:l.id)},"aria-label":t("synthesis.modes.moreInfo",{mode:l.name}),style:{background:"none",border:"none",cursor:"pointer",padding:"2px",display:"flex",alignItems:"center",color:"var(--muted-foreground)",opacity:.7,transition:"opacity 0.15s"},onMouseEnter:c=>{c.target.style.opacity="1"},onMouseLeave:c=>{c.target.style.opacity="0.7"},children:e.jsx(Qs,{size:13})})]})]}),i===l.id&&e.jsxs("div",{className:"fade-in",style:{marginTop:"0.25rem",padding:"0.75rem 1rem",borderRadius:"var(--radius)",backgroundColor:"var(--muted)",border:"1px solid var(--border)",fontSize:"0.8125rem",lineHeight:"1.5",color:"var(--muted-foreground)"},children:[e.jsx("p",{style:{marginBottom:"0.5rem"},children:l.detail}),e.jsxs("p",{style:{fontSize:"0.75rem",fontWeight:600,color:"var(--foreground)"},children:[t("synthesis.modes.bestFor")," ",e.jsx("span",{style:{fontWeight:400,color:"var(--muted-foreground)"},children:l.bestFor})]})]})]},l.id))})}function Ke({response:s,questions:n,onUpdated:t}){const[i,r]=g.useState(!1),[m,p]=g.useState({}),[l,c]=g.useState(!1),[d,v]=g.useState(null),[a,o]=g.useState(null),[u,f]=g.useState(s.version),[k,z]=g.useState(s.answers),$=g.useRef({});g.useEffect(()=>{f(s.version),z(s.answers)},[s.version,s.answers]);const I=g.useCallback(()=>{const N={};for(const[y,S]of Object.entries(k))N[y]=String(S??"");p(N),r(!0),v(null),o(null)},[k]),_=g.useCallback(()=>{r(!1),p({}),v(null),o(null)},[]),h=g.useCallback((N,y)=>{p(S=>({...S,[N]:y}))},[]),j=g.useCallback(async(N=!1)=>{c(!0),v(null);try{const S=await(N?$s:Es)(s.id,m,u);f(S.version),z(S.answers),r(!1),p({}),o(null),t==null||t({...s,answers:S.answers,version:S.version})}catch(y){if(y instanceof Ns&&y.status===409){const S=parseInt(y.headers.get("X-Current-Version")||"0",10);o({serverVersion:S||u+1,localAnswers:{...m}});return}v(y instanceof Error?y.message:"Network error")}finally{c(!1)}},[m,u,s.id,t]),C=g.useCallback(()=>j(!0),[j]);g.useEffect(()=>{if(!a)return;const N=y=>{y.key==="Escape"&&(y.preventDefault(),o(null))};return document.addEventListener("keydown",N),()=>document.removeEventListener("keydown",N)},[a]);const A=g.useCallback(N=>{N&&(N.style.height="auto",N.style.height=`${N.scrollHeight}px`)},[]);return i?e.jsxs("div",{className:"rounded-lg p-4",style:{backgroundColor:"var(--card)",border:"2px solid var(--accent)",boxShadow:"0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent)"},children:[e.jsxs("div",{className:"flex items-center justify-between mb-3",children:[e.jsxs("span",{className:"text-xs font-medium",style:{color:"var(--muted-foreground)"},children:["Editing: ",s.email||"Anonymous"]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx("button",{onClick:_,disabled:l,className:"text-xs px-3 py-1 rounded",style:{backgroundColor:"var(--muted)",color:"var(--muted-foreground)"},children:"Cancel"}),e.jsx("button",{onClick:()=>j(!1),disabled:l,className:"text-xs px-3 py-1 rounded font-medium",style:{backgroundColor:"var(--accent)",color:"var(--accent-foreground)",opacity:l?.6:1},children:l?"Saving…":e.jsxs(e.Fragment,{children:[e.jsx(Ks,{size:12,className:"inline mr-1"})," Save"]})})]})]}),n.map((N,y)=>{const S=`q${y+1}`;return e.jsxs("div",{className:"mb-3 last:mb-0",children:[e.jsx("label",{className:"text-xs font-semibold mb-1 block",style:{color:"var(--foreground)"},children:Q(N)}),e.jsx("textarea",{ref:q=>{$.current[S]=q,A(q)},value:m[S]??"",onChange:q=>{h(S,q.target.value),A(q.target)},disabled:l,rows:2,className:"w-full rounded-md px-3 py-2 text-sm resize-none",style:{backgroundColor:"var(--background)",color:"var(--foreground)",border:"1px solid var(--input)"}})]},S)}),d&&e.jsxs("div",{className:"mt-3 p-3 rounded-md text-sm",style:{backgroundColor:"color-mix(in srgb, var(--destructive) 10%, transparent)",color:"var(--destructive)",border:"1px solid var(--destructive)"},children:[e.jsx(ie,{size:14,className:"inline mr-1"})," ",d]}),a&&e.jsx("div",{className:"fixed inset-0 z-[60] flex items-center justify-center p-4",style:{backgroundColor:"rgba(0,0,0,0.6)"},onClick:N=>{N.target===N.currentTarget&&o(null)},children:e.jsxs("div",{className:"rounded-xl p-6 max-w-lg w-full space-y-4",style:{backgroundColor:"var(--card)",border:"1px solid var(--border)",boxShadow:"0 25px 50px -12px rgba(0,0,0,0.25)"},children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(ie,{size:24,style:{color:"var(--destructive)"}}),e.jsx("h3",{className:"text-lg font-bold",style:{color:"var(--foreground)"},children:"Edit Conflict"})]}),e.jsxs("p",{className:"text-sm",style:{color:"var(--muted-foreground)"},children:["This response was modified by another admin since you started editing. Your version: ",e.jsxs("strong",{children:["v",u]}),", server version: ",e.jsxs("strong",{children:["v",a.serverVersion]}),"."]}),e.jsxs("div",{className:"rounded-md p-3 text-xs space-y-2",style:{backgroundColor:"var(--muted)",border:"1px solid var(--border)"},children:[e.jsx("div",{className:"font-semibold",style:{color:"var(--foreground)"},children:"Your pending changes:"}),n.map((N,y)=>{const S=`q${y+1}`,q=a.localAnswers[S]??"",H=String(k[S]??"");return q===H?null:e.jsxs("div",{children:[e.jsx("div",{style:{color:"var(--muted-foreground)"},children:Q(N)}),e.jsxs("div",{className:"mt-0.5",style:{color:"var(--destructive)"},children:["− ",H||"(empty)"]}),e.jsxs("div",{className:"mt-0.5",style:{color:"var(--success, #22c55e)"},children:["+ ",q||"(empty)"]})]},S)})]}),e.jsxs("div",{className:"flex gap-3 justify-end pt-2",children:[e.jsx("button",{onClick:()=>{o(null),_()},className:"px-4 py-2 rounded-lg text-sm",style:{backgroundColor:"var(--muted)",color:"var(--foreground)"},children:"Discard My Changes"}),e.jsx("button",{onClick:C,disabled:l,className:"px-4 py-2 rounded-lg text-sm font-medium",style:{backgroundColor:"var(--destructive)",color:"var(--destructive-foreground)",opacity:l?.6:1},children:l?"Saving…":"Force Save My Version"})]})]})})]}):e.jsxs("div",{className:"group relative rounded-lg p-4 transition-colors",style:{backgroundColor:"var(--card)",border:"1px solid var(--border)"},children:[e.jsxs("div",{className:"flex items-center justify-between mb-2",children:[e.jsx("span",{className:"text-xs font-medium",style:{color:"var(--muted-foreground)"},children:s.email||"Anonymous"}),e.jsxs("button",{onClick:I,className:"opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-1 rounded",style:{backgroundColor:"var(--accent)",color:"var(--accent-foreground)"},title:"Edit response",children:[e.jsx(Ws,{size:12,className:"inline mr-1"})," Edit"]})]}),n.map((N,y)=>{const S=`q${y+1}`,q=k[S];return q?e.jsxs("div",{className:"mb-3 last:mb-0",children:[e.jsx("div",{className:"text-xs font-semibold mb-1",style:{color:"var(--foreground)"},children:Q(N)}),e.jsx("div",{className:"text-sm leading-relaxed",style:{color:"var(--foreground)"},children:String(q)})]},S):null})]})}const Ae={strong:{bg:"color-mix(in srgb, var(--destructive) 12%, transparent)",text:"var(--destructive)",label:"Strong"},moderate:{bg:"color-mix(in srgb, var(--warning) 12%, transparent)",text:"var(--warning)",label:"Moderate"},weak:{bg:"color-mix(in srgb, var(--success) 12%, transparent)",text:"var(--success)",label:"Weak"}};function Rt({strength:s}){const n=Ae[s]||Ae.moderate;return e.jsx("span",{className:"text-xs font-medium px-2 py-0.5 rounded-full",style:{backgroundColor:n.bg,color:n.text},children:n.label})}function It({formId:s,roundId:n}){const[t,i]=g.useState([]),[r,m]=g.useState(!1),[p,l]=g.useState(null),[c,d]=g.useState(!0),[v,a]=g.useState(!1);async function o(){m(!0),l(null);try{const u=await ut(s,n);i(u.counterarguments),a(!0),d(!0)}catch(u){l(u.message||"Failed to generate counterarguments")}finally{m(!1)}}return e.jsxs("div",{className:"card p-4 sm:p-6",children:[e.jsxs("div",{className:"flex items-center justify-between mb-3",children:[e.jsxs("button",{onClick:()=>v&&d(u=>!u),className:"flex items-center gap-2 text-left",style:{background:"none",border:"none",cursor:v?"pointer":"default",padding:0},"aria-expanded":v?c:void 0,"aria-label":"Toggle AI counterpoints section",children:[e.jsx(Vs,{size:20,style:{color:"var(--warning)"}}),e.jsx("h2",{className:"text-lg font-semibold text-foreground",children:"🤖 AI Counterpoints"}),v&&e.jsx(le,{size:16,className:"transition-transform",style:{color:"var(--muted-foreground)",transform:c?"rotate(0deg)":"rotate(-90deg)"}})]}),e.jsx("button",{onClick:o,disabled:r,className:"text-sm font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5",style:{backgroundColor:r?"var(--muted)":"rgba(249,115,22,0.12)",color:r?"var(--muted-foreground)":"var(--warning)",border:"none",cursor:r?"not-allowed":"pointer"},children:r?e.jsxs(e.Fragment,{children:[e.jsx(me,{size:14,className:"animate-spin"}),"Generating…"]}):v?"Regenerate":"Generate"})]}),e.jsxs("div",{className:"flex items-start gap-2 text-xs rounded-lg px-3 py-2 mb-3",style:{backgroundColor:"rgba(249,115,22,0.06)",color:"var(--muted-foreground)"},children:[e.jsx(ie,{size:14,className:"flex-shrink-0 mt-0.5",style:{color:"var(--warning)"}}),e.jsxs("span",{children:["These counterarguments are ",e.jsx("strong",{children:"AI-generated"})," and do not represent expert views. They highlight potential blind spots for consideration."]})]}),p&&e.jsx("div",{className:"text-sm rounded-lg px-3 py-2 mb-3",style:{backgroundColor:"rgba(239,68,68,0.08)",color:"var(--destructive)"},children:p}),v&&c&&t.length>0&&e.jsx("div",{className:"space-y-3",children:t.map((u,f)=>e.jsxs("div",{className:"rounded-lg p-3 sm:p-4",style:{backgroundColor:"var(--muted)",border:"1px solid var(--border)"},children:[e.jsxs("div",{className:"flex items-start justify-between gap-3 mb-2",children:[e.jsx("p",{className:"text-sm font-medium text-foreground",children:u.argument}),e.jsx(Rt,{strength:u.strength})]}),e.jsx("p",{className:"text-sm",style:{color:"var(--muted-foreground)"},children:u.rationale})]},f))}),!v&&!r&&e.jsxs("p",{className:"text-sm text-center py-4",style:{color:"var(--muted-foreground)"},children:["Click ",e.jsx("strong",{children:"Generate"})," to have AI identify counterarguments and blind spots in the current synthesis."]})]})}const Ft=[{value:"policy_maker",label:"Policy Maker",icon:"🏛️"},{value:"technical",label:"Technical",icon:"🔬"},{value:"general_public",label:"General Public",icon:"👥"},{value:"executive",label:"Executive",icon:"💼"},{value:"academic",label:"Academic",icon:"🎓"}];function Lt({formId:s,roundId:n,synthesisText:t}){const[i,r]=g.useState(""),[m,p]=g.useState(null),[l,c]=g.useState(""),[d,v]=g.useState(!1),[a,o]=g.useState(null);async function u(k){if(r(k),o(null),!k){p(null),c("");return}v(!0);try{const z=await mt(s,n,k,t);p(z.translated_text),c(z.audience_label)}catch(z){o(z.message||"Failed to translate synthesis"),p(null)}finally{v(!1)}}function f(){r(""),p(null),c(""),o(null)}return e.jsxs("div",{className:"space-y-3",children:[e.jsxs("div",{className:"flex items-center gap-2 flex-wrap",children:[e.jsx(Js,{size:16,style:{color:"var(--accent)",flexShrink:0}}),e.jsx("span",{className:"text-sm font-medium",style:{color:"var(--muted-foreground)"},children:"Reading as:"}),e.jsxs("select",{value:i,onChange:k=>u(k.target.value),disabled:d,"aria-label":"Select audience for synthesis translation",className:"text-sm rounded-lg px-3 py-1.5 transition-colors",style:{backgroundColor:"var(--muted)",color:"var(--foreground)",border:"1px solid var(--border)",cursor:d?"wait":"pointer",minWidth:"180px"},children:[e.jsx("option",{value:"",children:"Select audience…"}),Ft.map(k=>e.jsxs("option",{value:k.value,children:[k.icon," ",k.label]},k.value))]}),i&&!d&&e.jsx("button",{onClick:f,className:"p-1 rounded transition-colors",style:{background:"none",border:"none",color:"var(--muted-foreground)",cursor:"pointer"},title:"Clear translation","aria-label":"Clear audience translation",children:e.jsx(ge,{size:14,"aria-hidden":"true"})}),d&&e.jsx(me,{size:16,className:"animate-spin",style:{color:"var(--accent)"}})]}),a&&e.jsx("div",{className:"text-sm rounded-lg px-3 py-2",style:{backgroundColor:"rgba(239,68,68,0.08)",color:"var(--destructive)"},children:a}),m&&e.jsxs("div",{className:"rounded-lg p-4 sm:p-5 space-y-2",style:{backgroundColor:"rgba(99,102,241,0.04)",border:"1px solid rgba(99,102,241,0.15)"},children:[e.jsxs("div",{className:"flex items-center gap-2 mb-2",children:[e.jsxs("span",{className:"text-xs font-medium px-2 py-0.5 rounded-full",style:{backgroundColor:"rgba(99,102,241,0.12)",color:"rgb(99,102,241)"},children:[l," Lens"]}),e.jsx("span",{className:"text-xs",style:{color:"var(--muted-foreground)"},children:"AI-translated version"})]}),e.jsx(J,{content:m})]})]})}function Mt({formId:s,roundId:n,responses:t,questions:i}){const[r,m]=g.useState({}),[p,l]=g.useState(new Set),[c,d]=g.useState(!1),[v,a]=g.useState(null),[o,u]=g.useState(!1),f=`${s}-${n}`,k=g.useCallback(async()=>{if(r[f]){u(!0);return}d(!0),a(null);try{const _=[];for(const j of t)for(let C=0;C<i.length;C++){const A=`q${C+1}`,N=j.answers[A];N&&_.push({expert:j.email||`Expert ${j.id}`,question:Q(i[C]),answer:String(N)})}if(_.length===0){a("No responses to clarify");return}const h=await gt(s,n,_);m(j=>({...j,[f]:h.clarified_responses})),u(!0)}catch(_){a(_ instanceof Error?_.message:"Failed to generate clarifications")}finally{d(!1)}},[s,n,t,i,f,r]),z=g.useCallback(_=>{l(h=>{const j=new Set(h);return j.has(_)?j.delete(_):j.add(_),j})},[]),$=g.useCallback(()=>{p.size===t.length?l(new Set):l(new Set(t.map(_=>_.id)))},[p,t]),I=(_,h)=>{const j=r[f];if(!j)return null;const C=_||"",A=Q(i[h]),N=j.find(y=>(y.expert===C||y.expert.includes(C))&&y.question===A);return(N==null?void 0:N.clarified)||null};return t.length===0?null:e.jsxs("div",{className:"rounded-lg overflow-hidden",style:{border:"1px solid var(--border)",backgroundColor:"var(--card)"},children:[e.jsxs("div",{className:"p-4 flex items-center justify-between",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(te,{size:16,style:{color:"var(--accent)"}}),e.jsx("h3",{className:"text-sm font-semibold",style:{color:"var(--foreground)"},children:"Voice Mirroring"}),e.jsx("span",{className:"text-xs px-2 py-0.5 rounded-full",style:{backgroundColor:"color-mix(in srgb, var(--accent) 12%, transparent)",color:"var(--accent)"},children:"AI"})]}),o?e.jsx("button",{onClick:$,className:"text-xs font-medium px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5",style:{backgroundColor:"color-mix(in srgb, var(--accent) 10%, transparent)",color:"var(--accent)",cursor:"pointer"},children:p.size===t.length?e.jsxs(e.Fragment,{children:[e.jsx($e,{size:14}),"Show All Originals"]}):e.jsxs(e.Fragment,{children:[e.jsx(Ee,{size:14}),"Show All Clarified"]})}):e.jsx("button",{onClick:k,disabled:c,className:"text-xs font-medium px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5",style:{backgroundColor:"var(--accent)",color:"var(--accent-foreground)",opacity:c?.7:1,cursor:c?"not-allowed":"pointer"},children:c?e.jsxs(e.Fragment,{children:[e.jsx(me,{size:12,className:"animate-spin"}),"Clarifying…"]}):e.jsxs(e.Fragment,{children:[e.jsx(te,{size:12}),"Generate Clarifications"]})})]}),o&&e.jsx("div",{className:"mx-4 mb-3 px-3 py-2 rounded-md text-xs",style:{backgroundColor:"color-mix(in srgb, var(--accent) 6%, transparent)",color:"var(--muted-foreground)",border:"1px solid color-mix(in srgb, var(--accent) 15%, transparent)"},children:"🔍 AI-clarified versions preserve the expert's original meaning while improving readability. Toggle per response to compare."}),v&&e.jsxs("div",{className:"mx-4 mb-3 p-3 rounded-md text-sm flex items-center gap-2",style:{backgroundColor:"color-mix(in srgb, var(--destructive) 10%, transparent)",color:"var(--destructive)",border:"1px solid var(--destructive)"},children:[e.jsx(ie,{size:14}),v]}),o&&e.jsx("div",{className:"px-4 pb-4 space-y-3",children:t.map(_=>{const h=p.has(_.id);return e.jsxs("div",{className:"rounded-lg p-3 transition-all",style:{backgroundColor:h?"color-mix(in srgb, var(--accent) 5%, var(--background))":"var(--background)",border:`1px solid ${h?"color-mix(in srgb, var(--accent) 25%, transparent)":"var(--border)"}`},children:[e.jsxs("div",{className:"flex items-center justify-between mb-2",children:[e.jsx("span",{className:"text-xs font-medium",style:{color:"var(--muted-foreground)"},children:_.email||"Anonymous"}),e.jsx("button",{onClick:()=>z(_.id),className:"flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors",style:{backgroundColor:h?"color-mix(in srgb, var(--accent) 15%, transparent)":"var(--muted)",color:h?"var(--accent)":"var(--muted-foreground)",cursor:"pointer",border:"none"},"aria-pressed":h,"aria-label":h?"Switch to original response":"Switch to AI-clarified response",children:h?e.jsxs(e.Fragment,{children:[e.jsx($e,{size:12}),"Clarified"]}):e.jsxs(e.Fragment,{children:[e.jsx(Ee,{size:12}),"Original"]})})]}),i.map((j,C)=>{const A=`q${C+1}`,N=_.answers[A];if(!N)return null;const y=I(_.email,C),S=h&&y?y:String(N);return e.jsxs("div",{className:"mb-2 last:mb-0",children:[e.jsx("div",{className:"text-xs font-semibold mb-1",style:{color:"var(--foreground)"},children:Q(j)}),e.jsx("div",{className:"text-sm leading-relaxed transition-all",style:{color:"var(--foreground)",fontStyle:"normal"},children:S}),h&&y&&e.jsxs("div",{className:"text-xs mt-1",style:{color:"var(--muted-foreground)",fontStyle:"italic"},children:["Original: ",String(N)]})]},A)})]},_.id)})})]})}function qt({email:s,viewers:n,onLogout:t}){const i=Me();return e.jsx("header",{className:"border-b sticky top-0 z-40",style:{backgroundColor:"var(--card)",borderColor:"var(--border)",boxShadow:"0 1px 3px 0 rgba(0,0,0,0.04)",backdropFilter:"blur(8px)"},children:e.jsxs("div",{className:"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center",children:[e.jsxs("div",{className:"flex items-center gap-2 sm:gap-4 min-w-0",children:[e.jsxs("div",{className:"flex items-center gap-2 sm:gap-3 min-w-0 cursor-pointer",onClick:()=>i("/"),children:[e.jsx("img",{src:"/logo-mark.png",alt:"Symphonia",className:"h-7 w-auto flex-shrink-0"}),e.jsxs("div",{className:"min-w-0",children:[e.jsx("h1",{className:"text-base sm:text-lg font-bold tracking-tight text-foreground leading-tight",children:"Admin Workspace"}),e.jsx("p",{className:"text-xs text-muted-foreground leading-tight truncate",children:s})]})]}),e.jsx(Fs,{viewers:n,currentUserEmail:s})]}),e.jsx("button",{onClick:t,className:"text-sm px-3 py-1.5 rounded-lg transition-colors flex-shrink-0",style:{color:"var(--muted-foreground)",backgroundColor:"transparent",border:"none",cursor:"pointer"},onMouseEnter:r=>{r.currentTarget.style.backgroundColor="var(--muted)",r.currentTarget.style.color="var(--destructive)"},onMouseLeave:r=>{r.currentTarget.style.backgroundColor="transparent",r.currentTarget.style.color="var(--muted-foreground)"},children:"Log out"})]})})}function Pt({activeRound:s,synthesisViewMode:n,onSetViewMode:t,editor:i}){return e.jsxs("div",{className:"card p-4 sm:p-6 min-h-[200px] lg:min-h-[300px]",style:{borderTop:"3px solid var(--accent)"},children:[e.jsxs("div",{className:"flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3",children:[e.jsxs("h2",{className:"text-lg font-semibold text-foreground flex items-center gap-2",style:{margin:0},children:[e.jsx("span",{children:"📝"})," Synthesis for Round ",(s==null?void 0:s.round_number)||""]}),e.jsxs("div",{role:"tablist","aria-label":"Synthesis view mode",style:{display:"inline-flex",borderRadius:"0.5rem",overflow:"hidden",border:"1px solid var(--border)",fontSize:"0.8125rem",alignSelf:"flex-start"},children:[e.jsx("button",{role:"tab","aria-selected":n==="view",onClick:()=>t("view"),style:{padding:"0.375rem 0.75rem",cursor:"pointer",border:"none",fontWeight:n==="view"?600:400,backgroundColor:n==="view"?"var(--accent)":"var(--card)",color:n==="view"?"white":"var(--muted-foreground)",transition:"all 0.15s ease"},children:"View"}),e.jsx("button",{role:"tab","aria-selected":n==="edit",onClick:()=>t("edit"),style:{padding:"0.375rem 0.75rem",cursor:"pointer",border:"none",borderLeft:"1px solid var(--border)",fontWeight:n==="edit"?600:400,backgroundColor:n==="edit"?"var(--accent)":"var(--card)",color:n==="edit"?"white":"var(--muted-foreground)",transition:"all 0.15s ease"},children:"Edit"})]})]}),n==="edit"?e.jsx("div",{className:"prose max-w-none",children:e.jsx(xs,{editor:i})}):e.jsx("div",{children:s!=null&&s.synthesis?e.jsx(J,{content:s.synthesis}):e.jsxs("div",{className:"rounded-lg p-6 text-center",style:{backgroundColor:"var(--muted)",border:"1px dashed var(--border)"},children:[e.jsx("div",{className:"text-3xl mb-3",children:"🤖"}),e.jsx("p",{className:"text-sm font-medium",style:{color:"var(--foreground)"},children:"No synthesis yet"}),e.jsx("p",{className:"text-sm mt-1",style:{color:"var(--muted-foreground)"},children:"Generate one using the AI panel on the right, or switch to Edit mode to write manually."})]})})]})}function Ht({synthesisMode:s,onModeChange:n,selectedModel:t,onModelChange:i,models:r,isGenerating:m,onGenerate:p}){return e.jsxs("div",{className:"card p-4",style:{background:"linear-gradient(180deg, color-mix(in srgb, var(--accent) 4%, var(--card)), var(--card))",borderColor:"color-mix(in srgb, var(--accent) 20%, var(--border))"},children:[e.jsx("h3",{className:"text-xs font-semibold uppercase tracking-wider mb-3",style:{color:"var(--accent)"},children:"🤖 AI-Powered Synthesis"}),e.jsxs("div",{className:"space-y-3",children:[e.jsx(Dt,{mode:s,onModeChange:n}),e.jsxs("div",{children:[e.jsx("label",{htmlFor:"model-select",className:"block text-sm font-medium text-muted-foreground mb-1.5",children:"Choose a model"}),e.jsx("select",{id:"model-select",className:"w-full rounded-lg px-3 py-2 text-sm",value:t,onChange:l=>i(l.target.value),children:r.map(l=>e.jsx("option",{value:l,children:l},l))})]}),e.jsx(M,{variant:"purple",size:"md",loading:m,loadingText:"Generating…",onClick:p,className:"w-full font-semibold",children:"Generate Summary"})]})]})}function Te(s){return s?new Date(s).toLocaleString(void 0,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):""}function Bt({displayRound:s,synthesisVersions:n,selectedVersionId:t,onSelectVersion:i,selectedVersion:r,onActivateVersion:m,showCompare:p,onToggleCompare:l}){return s?e.jsxs("div",{className:"card p-4",children:[e.jsxs("h3",{className:"text-xs font-semibold uppercase tracking-wider mb-3",style:{color:"var(--muted-foreground)"},children:["Synthesis Versions",e.jsxs("span",{className:"ml-2 font-normal normal-case tracking-normal",children:["· Round ",s.round_number]})]}),n.length===0?e.jsxs("p",{className:"text-sm",style:{color:"var(--muted-foreground)"},children:["No versions yet. Use ",e.jsx("strong",{children:"Generate Summary"})," above to create one."]}):e.jsxs("div",{className:"space-y-3",children:[e.jsx("div",{className:"flex flex-wrap gap-2",children:n.map(c=>{const d=c.id===t;return e.jsxs("button",{type:"button",onClick:()=>i(c.id),className:"relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",style:{backgroundColor:d?"color-mix(in srgb, var(--accent) 15%, var(--card))":"var(--muted)",color:d?"var(--accent)":"var(--muted-foreground)",border:d?"1.5px solid var(--accent)":"1.5px solid transparent",cursor:"pointer"},title:`v${c.version}${c.is_active?" (published)":""} — ${Te(c.created_at)}`,"aria-pressed":d,"aria-label":`Version ${c.version}${c.is_active?" (published)":""}`,children:["v",c.version,c.is_active&&e.jsx(ue,{size:12,style:{color:"var(--success)"},"aria-hidden":"true"})]},c.id)})}),r&&e.jsxs("div",{className:"text-xs space-y-1.5 p-3 rounded-lg",style:{background:"var(--muted)",color:"var(--muted-foreground)"},children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("span",{className:"font-semibold",style:{color:"var(--foreground)"},children:["v",r.version]}),r.is_active?e.jsxs("span",{className:"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",style:{backgroundColor:"color-mix(in srgb, var(--success) 12%, transparent)",color:"var(--success)"},children:[e.jsx(ue,{size:10})," Published"]}):e.jsx("span",{className:"inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium",style:{backgroundColor:"var(--card)",color:"var(--muted-foreground)"},children:"Draft"})]}),r.created_at&&e.jsx("div",{children:Te(r.created_at)}),e.jsxs("div",{children:[e.jsx("strong",{children:"Model:"})," ",r.model_used||"N/A"]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Strategy:"})," ",r.strategy||"N/A"]})]}),r&&!r.is_active&&e.jsxs(M,{variant:"success",size:"sm",onClick:()=>m(r.id),className:"w-full",children:["Publish v",r.version]}),n.length>=2&&l&&e.jsxs("button",{onClick:l,className:"w-full flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-colors",style:{backgroundColor:p?"color-mix(in srgb, var(--accent) 15%, var(--card))":"var(--card)",color:p?"var(--accent)":"var(--muted-foreground)",border:p?"1.5px solid var(--accent)":"1.5px solid var(--border)",cursor:"pointer"},children:[e.jsx(Qe,{size:14}),p?"Hide Comparison":"Compare Versions"]})]})]}):null}function Ut({selectedVersion:s,displayRound:n,resolvedExpertLabels:t,formId:i,token:r,currentUserEmail:m}){return s?e.jsxs(e.Fragment,{children:[s.synthesis&&e.jsxs("div",{className:"card p-4 sm:p-6",children:[e.jsxs("div",{className:"flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-3",children:[e.jsxs("h2",{className:"text-lg font-semibold text-foreground",children:["Synthesis v",s.version,s.is_active&&e.jsx("span",{className:"ml-2 text-xs font-normal px-2 py-0.5 rounded-full bg-success/10 text-success",children:"active"})]}),e.jsxs("span",{className:"text-xs text-muted-foreground",children:[s.model_used||""," · ",s.strategy||"",s.created_at&&` · ${new Date(s.created_at).toLocaleString()}`]})]}),e.jsx(J,{content:s.synthesis})]}),s.synthesis_json&&e.jsxs("div",{className:"card p-4 sm:p-6",children:[e.jsxs("h2",{className:"text-lg font-semibold mb-3 text-foreground",children:["Structured Analysis (v",s.version,")"]}),e.jsx(qe,{data:s.synthesis_json,convergenceScore:(n==null?void 0:n.convergence_score)??void 0,expertLabels:t,formId:i,roundId:n==null?void 0:n.id,token:r,currentUserEmail:m})]})]}):null}function Gt({questions:s,onUpdateQuestion:n,onAddQuestion:t,onRemoveQuestion:i}){return e.jsxs("div",{className:"card p-4 sm:p-6",children:[e.jsxs("h2",{className:"text-lg font-semibold text-foreground flex items-center gap-2",children:[e.jsx("span",{children:"❓"})," Next Round Questions"]}),e.jsx("div",{className:"space-y-2 mt-3",children:s.map((r,m)=>e.jsxs("div",{className:"flex gap-2 items-center group",children:[e.jsx("span",{className:"text-xs font-medium shrink-0 w-6 h-6 flex items-center justify-center rounded-full",style:{backgroundColor:"var(--muted)",color:"var(--muted-foreground)"},children:m+1}),e.jsx("input",{type:"text",className:"flex-1 rounded-lg px-3 py-2 text-sm min-w-0",value:r,onChange:p=>n(m,p.target.value),placeholder:`Question ${m+1}`}),e.jsx(M,{variant:"secondary",size:"sm",onClick:()=>i(m),style:{opacity:.4,transition:"opacity 0.15s ease"},className:"group-hover:!opacity-100",children:"✕"})]},m))}),e.jsx(M,{variant:"secondary",size:"sm",onClick:t,className:"mt-3",children:"+ Add Question"})]})}function Ot({form:s,activeRound:n}){return e.jsxs("div",{className:"card p-4",children:[e.jsx("h3",{className:"text-xs font-semibold uppercase tracking-wider mb-3",style:{color:"var(--muted-foreground)"},children:"Form Info"}),e.jsxs("div",{className:"text-sm space-y-2",children:[e.jsx("div",{className:"text-foreground font-medium",children:s.title}),e.jsx("div",{className:"flex items-center gap-2 text-sm",style:{color:"var(--muted-foreground)"},children:e.jsxs("span",{className:"inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",style:{backgroundColor:n?"color-mix(in srgb, var(--accent) 12%, transparent)":"var(--muted)",color:n?"var(--accent)":"var(--muted-foreground)"},children:[n&&e.jsx("span",{className:"w-1.5 h-1.5 rounded-full",style:{backgroundColor:"var(--accent)"}}),n?`Round ${n.round_number} active`:"No active round"]})})]})]})}function Qt({responsesOpen:s,onToggleResponses:n,onDownloadResponses:t,onSaveSynthesis:i,onStartNextRound:r,loading:m,formTitle:p,formId:l,rounds:c,structuredSynthesisData:d,expertLabels:v}){const[a,o]=g.useState(!1),[u,f]=g.useState(!1),k=g.useCallback(async()=>{o(!0);try{await i()}finally{o(!1)}},[i]),z=g.useCallback(async()=>{f(!0);try{await t()}finally{f(!1)}},[t]);return e.jsxs("div",{className:"card p-4",children:[e.jsx("h3",{className:"text-xs font-semibold uppercase tracking-wider mb-3",style:{color:"var(--muted-foreground)"},children:"Actions"}),e.jsxs("div",{className:"flex flex-col space-y-2",children:[e.jsx(M,{variant:"accent",size:"md",onClick:n,className:"w-full text-left justify-start",children:s?"Hide Responses":"View All Responses"}),e.jsx(M,{variant:"secondary",size:"md",onClick:z,loading:u,loadingText:"Downloading…",className:"w-full text-left justify-start",children:"Download Responses"}),e.jsx(M,{variant:"success",size:"md",onClick:k,loading:a,loadingText:"Saving…",className:"w-full text-left justify-start",children:"Save Synthesis"}),e.jsx(bt,{formTitle:p,formId:l,rounds:c,structuredSynthesisData:d,expertLabels:v}),e.jsx("div",{className:"pt-2",children:e.jsx(M,{variant:"accent",size:"md",onClick:r,loading:m,loadingText:"Starting…",className:"w-full font-semibold",style:{backgroundColor:"var(--accent-hover)"},children:"Start Next Round"})})]})]})}const De='a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';function Wt({active:s,onEscape:n}){const t=g.useRef(null),i=g.useRef(null),r=g.useCallback(m=>{if(m.key==="Escape"){m.preventDefault(),n==null||n();return}if(m.key!=="Tab")return;const p=t.current;if(!p)return;const l=Array.from(p.querySelectorAll(De));if(l.length===0)return;const c=l[0],d=l[l.length-1];m.shiftKey?document.activeElement===c&&(m.preventDefault(),d.focus()):document.activeElement===d&&(m.preventDefault(),c.focus())},[n]);return g.useEffect(()=>{if(!s)return;i.current=document.activeElement;const m=setTimeout(()=>{const p=t.current;if(p){const l=p.querySelector(De);l==null||l.focus()}},50);return document.addEventListener("keydown",r),()=>{var p;clearTimeout(m),document.removeEventListener("keydown",r),(p=i.current)==null||p.focus()}},[s,r]),t}function Kt({open:s,onClose:n,structuredRounds:t,rounds:i,formQuestions:r,token:m,onResponseUpdated:p}){const l=Wt({active:s,onEscape:n});return s?gs.createPortal(e.jsx("div",{className:"fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4",style:{backgroundColor:"rgba(0,0,0,0.65)"},onClick:c=>{c.target===c.currentTarget&&n()},role:"dialog","aria-modal":"true","aria-label":"All Responses",children:e.jsxs("div",{ref:l,className:"card max-w-full sm:max-w-3xl w-full max-h-screen sm:max-h-[90vh] rounded-none sm:rounded-lg overflow-y-auto p-4 sm:p-6 text-left",style:{boxShadow:"0 25px 50px -12px rgba(0,0,0,0.25)"},children:[e.jsxs("div",{className:"flex items-center justify-between mb-4",children:[e.jsx("h3",{className:"text-xl font-semibold text-foreground",children:"All Responses"}),e.jsx("button",{onClick:n,className:"text-lg w-8 h-8 flex items-center justify-center rounded-lg transition-colors",style:{color:"var(--muted-foreground)",backgroundColor:"transparent",border:"none",cursor:"pointer"},onMouseEnter:c=>c.currentTarget.style.backgroundColor="var(--muted)",onMouseLeave:c=>c.currentTarget.style.backgroundColor="transparent","aria-label":"Close responses modal",children:"✕"})]}),t.length===0?e.jsx("p",{style:{color:"var(--muted-foreground)"},children:"No responses yet for this form."}):t.map(c=>{var v;const d=((v=i.find(a=>a.id===c.id))==null?void 0:v.questions)||r||[];return e.jsxs("div",{className:"mb-6 p-3 sm:p-4 rounded-lg",style:{backgroundColor:"var(--muted)",border:"1px solid var(--border)"},children:[e.jsxs("h4",{className:"text-lg font-semibold mb-3 text-foreground",children:["Round ",c.round_number]}),c.responses.length===0?e.jsx("p",{style:{color:"var(--muted-foreground)"},children:"No responses for this round."}):e.jsx("div",{className:"space-y-3",children:c.responses.map(a=>e.jsx(Ke,{response:a,questions:d,token:m,onUpdated:o=>p(c.id,o)},a.id))})]},c.id)}),e.jsx(M,{variant:"secondary",size:"md",onClick:n,className:"mt-6",children:"Close"})]})}),document.body):null}function Vt({structuredRounds:s,rounds:n,formQuestions:t,formId:i,token:r,onResponseUpdated:m}){const[p,l]=g.useState(new Set);function c(o){l(u=>{const f=new Set(u);return f.has(o)?f.delete(o):f.add(o),f})}function d(){l(new Set(s.map(o=>o.id)))}function v(){l(new Set)}if(s.length===0)return e.jsxs("div",{className:"card p-4 sm:p-6",children:[e.jsxs("h2",{className:"text-lg font-semibold mb-3 text-foreground flex items-center gap-2",children:[e.jsx(ze,{size:18}),"Expert Responses"]}),e.jsx("p",{style:{color:"var(--muted-foreground)"},children:"No responses yet for this form."})]});const a=p.size===s.length;return e.jsxs("div",{className:"card p-4 sm:p-6",children:[e.jsxs("div",{className:"flex items-center justify-between mb-4",children:[e.jsxs("h2",{className:"text-lg font-semibold text-foreground flex items-center gap-2",children:[e.jsx(ze,{size:18}),"Expert Responses"]}),e.jsx("button",{onClick:a?v:d,className:"text-xs font-medium px-3 py-1.5 rounded-md transition-colors",style:{color:"var(--accent)",backgroundColor:"color-mix(in srgb, var(--accent) 10%, transparent)",border:"none",cursor:"pointer"},children:a?"Collapse All":"Expand All"})]}),e.jsx("div",{className:"space-y-2",children:s.map(o=>{var z;const u=p.has(o.id),f=((z=n.find($=>$.id===o.id))==null?void 0:z.questions)||t||[],k=o.responses.length;return e.jsxs("div",{className:"rounded-lg overflow-hidden transition-all",style:{border:"1px solid var(--border)",backgroundColor:u?"var(--card)":"var(--muted)"},children:[e.jsxs("button",{onClick:()=>c(o.id),className:"w-full flex items-center justify-between p-3 sm:p-4 text-left transition-colors",style:{background:"none",border:"none",cursor:"pointer",fontFamily:"var(--font-family)"},"aria-expanded":u,"aria-controls":`responses-round-${o.id}`,children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("span",{className:"flex items-center justify-center w-6 h-6 rounded-md transition-transform",style:{backgroundColor:"color-mix(in srgb, var(--accent) 12%, transparent)",color:"var(--accent)"},children:u?e.jsx(le,{size:14}):e.jsx(Xs,{size:14})}),e.jsxs("span",{className:"font-semibold text-sm",style:{color:"var(--foreground)"},children:["Round ",o.round_number]})]}),e.jsx("div",{className:"flex items-center gap-2",children:e.jsxs("span",{className:"flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",style:{backgroundColor:k>0?"color-mix(in srgb, var(--accent) 10%, transparent)":"var(--muted)",color:k>0?"var(--accent)":"var(--muted-foreground)"},children:[e.jsx(Ys,{size:11}),k," response",k!==1?"s":""]})})]}),u&&e.jsxs("div",{id:`responses-round-${o.id}`,className:"px-3 sm:px-4 pb-3 sm:pb-4 space-y-3 slide-down",role:"region","aria-label":`Responses for Round ${o.round_number}`,style:{borderTop:"1px solid var(--border)"},children:[f.length>0&&e.jsxs("div",{className:"pt-3 pb-1",children:[e.jsx("h4",{className:"text-xs font-semibold uppercase tracking-wider mb-2",style:{color:"var(--muted-foreground)"},children:"Questions"}),e.jsx("ol",{className:"list-decimal list-inside space-y-1",children:f.map(($,I)=>e.jsx("li",{className:"text-sm",style:{color:"var(--foreground)"},children:Q($)},I))})]}),k===0?e.jsx("p",{className:"text-sm py-2",style:{color:"var(--muted-foreground)"},children:"No responses for this round yet."}):e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"space-y-3 pt-2",children:o.responses.map($=>e.jsx(Ke,{response:$,questions:f,token:r,onUpdated:I=>m(o.id,I)},$.id))}),e.jsx("div",{className:"pt-3",children:e.jsx(Mt,{formId:i,roundId:o.id,responses:o.responses.map($=>({id:$.id,email:$.email,answers:$.answers})),questions:f})})]})]})]},o.id)})})]})}function Jt({rounds:s,selectedRoundId:n,onSelectRound:t}){return s.length===0?null:e.jsxs("div",{className:"card p-4",children:[e.jsx("h3",{className:"text-xs font-semibold uppercase tracking-wider mb-3",style:{color:"var(--muted-foreground)"},children:"Round History"}),e.jsx("ul",{className:"text-sm space-y-1",children:s.map(i=>e.jsxs("li",{className:`flex justify-between items-center border-b border-border last:border-b-0 py-1.5 cursor-pointer hover:bg-muted/50 rounded px-1 ${n===i.id?"bg-accent/10":""}`,onClick:()=>t(i),children:[e.jsxs("span",{className:"text-foreground",children:["Round ",i.round_number," ",i.is_active&&e.jsx("span",{className:"text-success font-semibold",children:"(active)"})]}),e.jsx("span",{className:`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${i.synthesis?"bg-success/10 text-success":"bg-muted text-muted-foreground"}`,children:i.synthesis?"Synthesis":"No Synthesis"})]},i.id))})]})}function Xt(){return e.jsxs("div",{className:"min-h-screen bg-background text-foreground font-sans flex flex-col",children:[e.jsx("header",{className:"border-b sticky top-0 z-40",style:{backgroundColor:"var(--card)",borderColor:"var(--border)",boxShadow:"0 1px 3px 0 rgba(0,0,0,0.04)"},children:e.jsxs("div",{className:"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx(U,{variant:"avatar",width:"2rem",height:"2rem"}),e.jsxs("div",{children:[e.jsx(U,{variant:"text",width:"10rem",height:"1.25rem"}),e.jsx(U,{variant:"text",width:"8rem",height:"0.875rem",style:{marginTop:"0.25rem"}})]})]}),e.jsx(U,{variant:"button",width:"5rem",height:"2rem"})]})}),e.jsxs("main",{className:"flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6",children:[e.jsx(U,{variant:"text",width:"10rem",style:{marginBottom:"1.5rem"}}),e.jsxs("div",{className:"mb-6 flex gap-4",children:[e.jsx(U,{variant:"avatar",width:"3rem",height:"3rem"}),e.jsx(U,{variant:"avatar",width:"3rem",height:"3rem"}),e.jsx(U,{variant:"avatar",width:"3rem",height:"3rem"})]}),e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-3 gap-6",children:[e.jsxs("div",{className:"lg:col-span-2 space-y-6",children:[e.jsx(ee,{}),e.jsx(ee,{})]}),e.jsxs("div",{className:"lg:col-span-1 space-y-6",children:[e.jsx(ee,{}),e.jsx(ee,{}),e.jsx(ee,{})]})]})]})]})}function Yt(s){return s?new Date(s).toLocaleString(void 0,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):""}function Zt({versions:s,currentVersionId:n,onClose:t}){var o;const i=g.useMemo(()=>[...s].sort((u,f)=>u.version-f.version),[s]),r=i.length>=2?i[i.length-2].id:((o=i[0])==null?void 0:o.id)??null,m=n??(i.length>=1?i[i.length-1].id:null),[p,l]=g.useState(r),[c,d]=g.useState(m),v=s.find(u=>u.id===p)??null,a=s.find(u=>u.id===c)??null;return s.length<2?null:e.jsxs("div",{className:"card p-4 sm:p-6",children:[e.jsxs("div",{className:"flex items-center justify-between mb-4",children:[e.jsxs("h2",{className:"text-lg font-semibold text-foreground flex items-center gap-2",children:[e.jsx(Qe,{size:20,style:{color:"var(--accent)"}}),"Compare Versions"]}),e.jsx("button",{onClick:t,className:"p-1.5 rounded-lg transition-colors",style:{background:"none",border:"none",color:"var(--muted-foreground)",cursor:"pointer"},title:"Close comparison","aria-label":"Close version comparison",children:e.jsx(ge,{size:18,"aria-hidden":"true"})})]}),e.jsxs("div",{className:"flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4",children:[e.jsx(Re,{label:"Left",versions:i,value:p,onChange:l,excludeId:c}),e.jsx("span",{className:"hidden sm:flex items-center justify-center text-xs font-bold px-2",style:{color:"var(--muted-foreground)"},children:"vs"}),e.jsx(Re,{label:"Right",versions:i,value:c,onChange:d,excludeId:p})]}),v&&a&&e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-2 gap-4",children:[e.jsx(Ie,{version:v}),e.jsx(Ie,{version:a})]}),(v==null?void 0:v.synthesis_json)&&(a==null?void 0:a.synthesis_json)&&e.jsx("div",{className:"mt-4",children:e.jsx(en,{left:v.synthesis_json,right:a.synthesis_json,leftVersion:v.version,rightVersion:a.version})})]})}function Re({label:s,versions:n,value:t,onChange:i,excludeId:r}){return e.jsxs("div",{className:"flex-1",children:[e.jsx("label",{className:"text-xs font-medium mb-1 block",style:{color:"var(--muted-foreground)"},children:s}),e.jsxs("div",{className:"relative",children:[e.jsx("select",{value:t??"",onChange:m=>i(Number(m.target.value)),className:"w-full text-sm rounded-lg px-3 py-2 appearance-none pr-8",style:{backgroundColor:"var(--muted)",color:"var(--foreground)",border:"1px solid var(--border)",cursor:"pointer"},children:n.map(m=>e.jsxs("option",{value:m.id,disabled:m.id===r,children:["v",m.version,m.is_active?" (published)":"",m.model_used?` — ${m.model_used.split("/").pop()}`:"",m.created_at?` · ${Yt(m.created_at)}`:""]},m.id))}),e.jsx(le,{size:14,className:"absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none",style:{color:"var(--muted-foreground)"}})]})]})}function Ie({version:s}){var t;const n=s.synthesis_json;return e.jsxs("div",{className:"rounded-lg p-4 overflow-auto max-h-[60vh]",style:{backgroundColor:"var(--muted)",border:"1px solid var(--border)"},children:[e.jsxs("div",{className:"flex items-center gap-2 mb-3",children:[e.jsxs("span",{className:"text-xs font-semibold px-2 py-0.5 rounded-full",style:{backgroundColor:s.is_active?"color-mix(in srgb, var(--success) 12%, transparent)":"var(--card)",color:s.is_active?"var(--success)":"var(--muted-foreground)"},children:["v",s.version,s.is_active?" · Published":" · Draft"]}),e.jsxs("span",{className:"text-xs",style:{color:"var(--muted-foreground)"},children:[(t=s.model_used)==null?void 0:t.split("/").pop()," · ",s.strategy]})]}),(n==null?void 0:n.narrative)&&e.jsxs("div",{className:"mb-3",children:[e.jsx("h4",{className:"text-xs font-semibold uppercase tracking-wider mb-1",style:{color:"var(--muted-foreground)"},children:"Narrative"}),e.jsx("div",{className:"text-sm prose prose-sm max-w-none",style:{color:"var(--foreground)"},children:e.jsx(J,{content:n.narrative})})]}),(n==null?void 0:n.agreements)&&e.jsxs("div",{className:"mb-2",children:[e.jsxs("h4",{className:"text-xs font-semibold uppercase tracking-wider mb-1",style:{color:"var(--muted-foreground)"},children:["Agreements (",n.agreements.length,")"]}),e.jsx("ul",{className:"space-y-1",children:n.agreements.map((i,r)=>e.jsxs("li",{className:"text-xs",style:{color:"var(--foreground)"},children:["• ",String(i.claim||"")]},r))})]}),(n==null?void 0:n.disagreements)&&n.disagreements.length>0&&e.jsxs("div",{className:"mb-2",children:[e.jsxs("h4",{className:"text-xs font-semibold uppercase tracking-wider mb-1",style:{color:"var(--muted-foreground)"},children:["Disagreements (",n.disagreements.length,")"]}),e.jsx("ul",{className:"space-y-1",children:n.disagreements.map((i,r)=>e.jsxs("li",{className:"text-xs",style:{color:"var(--foreground)"},children:["• ",String(i.topic||"")]},r))})]}),!n&&s.synthesis&&e.jsx("div",{className:"text-sm prose prose-sm max-w-none",style:{color:"var(--foreground)"},children:e.jsx(J,{content:s.synthesis})}),!n&&!s.synthesis&&e.jsx("p",{className:"text-sm",style:{color:"var(--muted-foreground)"},children:"No synthesis content"})]})}function en({left:s,right:n,leftVersion:t,rightVersion:i}){var u,f,k,z,$,I,_,h;const r=((u=s.agreements)==null?void 0:u.length)??0,m=((f=n.agreements)==null?void 0:f.length)??0,p=((k=s.disagreements)==null?void 0:k.length)??0,l=((z=n.disagreements)==null?void 0:z.length)??0,c=(($=s.nuances)==null?void 0:$.length)??0,d=((I=n.nuances)==null?void 0:I.length)??0,v=((_=s.emergent_insights)==null?void 0:_.length)??0,a=((h=n.emergent_insights)==null?void 0:h.length)??0,o=[{label:"Agreements",l:r,r:m},{label:"Disagreements",l:p,r:l},{label:"Nuances",l:c,r:d},{label:"Emergent Insights",l:v,r:a}];return e.jsxs("div",{className:"rounded-lg p-3 text-xs",style:{backgroundColor:"var(--muted)",border:"1px solid var(--border)"},children:[e.jsx("h4",{className:"font-semibold uppercase tracking-wider mb-2",style:{color:"var(--muted-foreground)"},children:"Stats Comparison"}),e.jsxs("div",{className:"grid grid-cols-3 gap-x-4 gap-y-1",children:[e.jsx("div",{className:"font-medium",style:{color:"var(--muted-foreground)"}}),e.jsxs("div",{className:"text-center font-medium",style:{color:"var(--accent)"},children:["v",t]}),e.jsxs("div",{className:"text-center font-medium",style:{color:"var(--accent)"},children:["v",i]}),o.map(j=>e.jsxs(g.Fragment,{children:[e.jsx("div",{style:{color:"var(--foreground)"},children:j.label}),e.jsx("div",{className:"text-center",style:{color:"var(--foreground)"},children:j.l}),e.jsxs("div",{className:"text-center",style:{color:j.r!==j.l?"var(--warning, #f59e0b)":"var(--foreground)"},children:[j.r,j.r!==j.l&&e.jsxs("span",{className:"ml-1 text-[10px]",children:["(",j.r>j.l?"+":"",j.r-j.l,")"]})]})]},j.label))]})]})}function Fe(s){return s?new Date(s).toLocaleString(void 0,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):"Unknown"}function sn(s){if(!s)return"";const n=Date.now()-new Date(s).getTime(),t=Math.floor(n/6e4);if(t<1)return"just now";if(t<60)return`${t}m ago`;const i=Math.floor(t/60);return i<24?`${i}h ago`:`${Math.floor(i/24)}d ago`}function tn(s){if(!s)return"Unknown";const n=s.split("/");return n[n.length-1]||s}function nn(s){return s?{single:"Single Analyst",ensemble:"Ensemble",structured:"Structured"}[s]||s:""}function rn({versions:s,selectedVersionId:n,onSelectVersion:t}){const[i,r]=g.useState(!1);if(s.length===0)return null;const m=[...s].sort((d,v)=>v.version-d.version),p=i?m.length:Math.min(3,m.length),l=m.slice(0,p),c=m.length>3;return e.jsxs("div",{className:"card p-4 sm:p-5",children:[e.jsxs("div",{className:"flex items-center justify-between mb-4",children:[e.jsxs("h3",{className:"text-sm font-semibold flex items-center gap-2",style:{color:"var(--foreground)"},children:[e.jsx(Ue,{size:15,style:{color:"var(--accent)"}}),"Version History"]}),e.jsxs("span",{className:"text-xs px-2 py-0.5 rounded-full",style:{backgroundColor:"var(--muted)",color:"var(--muted-foreground)"},children:[s.length," version",s.length!==1?"s":""]})]}),e.jsxs("div",{className:"relative pl-6",children:[e.jsx("div",{className:"absolute left-[9px] top-2 bottom-2 w-[2px]",style:{backgroundColor:"var(--border)"}}),e.jsx("div",{className:"space-y-0",children:l.map((d,v)=>{const a=d.id===n,o=v===0;return e.jsxs("button",{type:"button",onClick:()=>t(d.id),className:"relative w-full text-left group transition-all","aria-pressed":a,"aria-label":`Version ${d.version}${d.is_active?" (published)":""} — ${Fe(d.created_at)}`,style:{padding:"0.625rem 0.75rem 0.625rem 1.25rem",background:"none",border:"none",cursor:"pointer",borderRadius:"var(--radius)",fontFamily:"var(--font-family)"},onMouseEnter:u=>{u.currentTarget.style.backgroundColor="color-mix(in srgb, var(--accent) 5%, transparent)"},onMouseLeave:u=>{u.currentTarget.style.backgroundColor=a?"color-mix(in srgb, var(--accent) 8%, transparent)":"transparent"},children:[e.jsx("div",{className:"absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center",style:{left:"-14.5px"},children:e.jsx("div",{className:"rounded-full transition-all",style:{width:a||d.is_active?"14px":"10px",height:a||d.is_active?"14px":"10px",backgroundColor:d.is_active?"var(--success)":a?"var(--accent)":"var(--muted-foreground)",border:`2px solid ${d.is_active?"color-mix(in srgb, var(--success) 30%, transparent)":a?"color-mix(in srgb, var(--accent) 30%, transparent)":"var(--card)"}`,boxShadow:d.is_active||a?`0 0 0 3px ${d.is_active?"color-mix(in srgb, var(--success) 15%, transparent)":"color-mix(in srgb, var(--accent) 15%, transparent)"}`:"none"}})}),e.jsxs("div",{className:"flex items-start justify-between gap-2",children:[e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-0.5",children:[e.jsxs("span",{className:"text-sm font-semibold",style:{color:a?"var(--accent)":"var(--foreground)"},children:["v",d.version]}),d.is_active&&e.jsxs("span",{className:"inline-flex items-center gap-0.5 px-1.5 py-0 rounded-full text-[10px] font-semibold",style:{backgroundColor:"color-mix(in srgb, var(--success) 12%, transparent)",color:"var(--success)"},children:[e.jsx(ue,{size:9})," Published"]}),o&&!d.is_active&&e.jsx("span",{className:"inline-flex items-center gap-0.5 px-1.5 py-0 rounded-full text-[10px] font-medium",style:{backgroundColor:"color-mix(in srgb, var(--accent) 10%, transparent)",color:"var(--accent)"},children:"Latest"})]}),e.jsxs("div",{className:"flex items-center gap-3 text-[11px]",style:{color:"var(--muted-foreground)"},children:[d.model_used&&e.jsxs("span",{className:"inline-flex items-center gap-1",children:[e.jsx(Zs,{size:10}),tn(d.model_used)]}),d.strategy&&e.jsxs("span",{className:"inline-flex items-center gap-1",children:[e.jsx(Oe,{size:10}),nn(d.strategy)]}),d.synthesis_json&&e.jsxs("span",{className:"inline-flex items-center gap-1",children:[e.jsx(et,{size:10}),"Structured"]})]})]}),e.jsxs("div",{className:"flex-shrink-0 text-right",style:{minWidth:"5rem"},children:[e.jsx("div",{className:"text-[11px] font-medium",style:{color:"var(--muted-foreground)"},children:sn(d.created_at)}),e.jsx("div",{className:"text-[10px]",style:{color:"var(--muted-foreground)",opacity:.7},children:Fe(d.created_at)})]})]})]},d.id)})})]}),c&&e.jsx("button",{onClick:()=>r(d=>!d),className:"w-full flex items-center justify-center gap-1.5 text-xs font-medium mt-3 py-1.5 rounded-md transition-colors",style:{backgroundColor:"var(--muted)",color:"var(--muted-foreground)",border:"none",cursor:"pointer"},children:i?e.jsxs(e.Fragment,{children:[e.jsx(st,{size:12}),"Show Less"]}):e.jsxs(e.Fragment,{children:[e.jsx(le,{size:12}),"Show ",m.length-3," More"]})})]})}const on=["anthropic/claude-opus-4-6","anthropic/claude-sonnet-4","openai/gpt-4o","google/gemini-2.0-flash"];function Le(s){if(typeof s=="string")return s;if(s&&typeof s=="object"){const n=s;return String(n.text||n.label||n.question||"")}return""}function kn(){ks("Synthesis Summary");const s=Me(),{id:n}=ps(),t=Number(n),{toastError:i,toastWarning:r,toastSuccess:m}=ws(),{token:p,logout:l}=_s(),c=p??"",[d,v]=g.useState(""),[a,o]=g.useState(null),[u,f]=g.useState([]),[k,z]=g.useState(null),[$,I]=g.useState(!1),[_,h]=g.useState(null),[j,C]=g.useState(!1),[A,N]=g.useState([]),[y,S]=g.useState(null),[q,H]=g.useState("preparing"),[Ve,G]=g.useState(0),[Je]=g.useState(5),[pe,Xe]=g.useState("simple"),[Ye,xe]=g.useState("view"),[ce,Ze]=g.useState("anthropic/claude-opus-4-6"),[he,ve]=g.useState(!1),[O,fe]=g.useState([]),[X,ne]=g.useState(null),[be,ye]=g.useState(!1),[je,Y]=g.useState([]),[an,de]=g.useState(!1),[K,ke]=g.useState(()=>typeof window<"u"&&window.innerWidth>=768),es=g.useCallback(x=>{x.type==="synthesis_complete"&&x.form_id===t&&V().then(()=>{x.round_id&&typeof x.round_id=="number"&&Z(x.round_id)})},[t]),{viewers:ss}=zs({formId:t||null,page:"summary",userEmail:d,onMessage:es}),P=hs({extensions:[vs,fs,bs.configure({placeholder:"Write the synthesis for this round…"})],content:"",editorProps:{attributes:{class:"prose prose-sm max-w-none focus:outline-none"}}}),D=y||k,R=(D==null?void 0:D.synthesis_json)||null,B=g.useMemo(()=>{if(!R)return{};const x={},b=new Set;for(const w of R.agreements||[])for(const T of w.supporting_experts||[])b.add(T);for(const w of R.disagreements||[])for(const T of w.positions||[])for(const F of T.experts||[])b.add(F);for(const w of b)x[w]=`Expert ${w}`;return x},[R]),Ne=g.useMemo(()=>O.find(x=>x.id===X)||null,[O,X]);g.useEffect(()=>{c&&Cs().then(x=>v((x==null?void 0:x.email)||"")).catch(()=>{const x=localStorage.getItem("email");x&&v(x)})},[c]),g.useEffect(()=>{if(!c||!t)return;let x=!1;return V().then(()=>{if(!x)return re()}).catch(()=>{}),()=>{x=!0}},[c,t,P]);async function V(){var x;I(!0),h(null);try{const b=await Ss(t);if(!b)throw new Error("Form not found");o(b);let w;try{w=await As(t)}catch{w=[]}const T=(Array.isArray(w)?w:[]).map(L=>({id:L.id,round_number:L.round_number,synthesis:L.synthesis||"",synthesis_json:L.synthesis_json||null,is_active:!!L.is_active,questions:Array.isArray(L.questions)?L.questions:[],convergence_score:L.convergence_score??null,response_count:L.response_count??0}));f(T);const F=T.find(L=>L.is_active)||null;if(z(F),F&&!y&&(S(F),Z(F.id).catch(()=>{})),F&&P){P.commands.setContent(F.synthesis||""),de(!!(F.synthesis&&F.synthesis.trim().length>0));const L=(x=F.questions)!=null&&x.length?F.questions:Array.isArray(b.questions)?b.questions:[];Y((L||[]).map(Le))}else b&&Array.isArray(b.questions)&&Y(b.questions.map(Le))}catch(b){h(b.message||"Failed to load consultation data")}finally{I(!1)}}async function re(){try{const x=await Ts(t);Array.isArray(x)&&N(x.map(b=>({id:b.id,round_number:b.round_number,synthesis:b.synthesis||"",is_active:!!b.is_active,responses:(b.responses||[]).map(w=>({id:w.id,answers:typeof w.answers=="string"?JSON.parse(w.answers):w.answers||{},email:w.email||null,timestamp:w.timestamp,version:w.version??1,round_id:b.id}))})))}catch{}}async function Z(x){try{const b=await at(t,x);fe(b);const w=b.find(T=>T.is_active);ne((w==null?void 0:w.id)||(b.length>0?b[b.length-1].id:null))}catch{fe([]),ne(null)}}function ts(){l(),s("/")}async function ns(){if(j){C(!1);return}await re(),C(!0)}async function rs(){if(!k||!t)return;const x=(P==null?void 0:P.getHTML())||"";try{await ct(t,x),de(!0),m("Synthesis saved")}catch(b){i(b.message||"Failed to save synthesis")}}async function os(){if(!t)return;const x=je.map(b=>b.trim()).filter(b=>b.length>0);if(!x.length){r("Add at least one question for the next round.");return}I(!0);try{await Ds(t,{questions:x}),await V(),await re(),de(!1),S(null)}catch(b){i(b.message||"Failed to start next round")}finally{I(!1)}}async function as(){try{const x=await Rs(t,!0);if(!Array.isArray(x)||x.length===0){r("No responses to download");return}const b=x.flatMap((F,L)=>{const cs=new oe({children:[new Ce({text:`Response ${L+1}`,bold:!0})],spacing:{after:200}}),ds=Object.entries(F.answers).flatMap(([us,ms])=>[new oe({children:[new Ce({text:us,bold:!0})],spacing:{after:80}}),new oe({text:String(ms??""),spacing:{after:160}})]);return[cs,...ds,new oe("")]}),w=new ys({sections:[{children:b}]}),T=await js.toBlob(w);se.saveAs(T,"responses.docx")}catch(x){i(x.message||"Failed to download responses")}}async function is(){const x=y||k;if(!(!t||!ce||!x)){ve(!0),H("preparing"),G(0);try{H("analyzing"),G(1);const b=await lt(t,x.id,{model:ce,strategy:pe,n_analysts:3,mode:"human_only"});H("synthesising"),G(3),H("formatting"),G(4);const w=b.synthesis||b.summary||"";if(w&&P&&P.commands.setContent(w),b.synthesis_json&&x){const T={...x,synthesis:w,synthesis_json:b.synthesis_json};f(F=>F.map(L=>L.id===x.id?T:L)),(k==null?void 0:k.id)===x.id&&z(T),(y==null?void 0:y.id)===x.id&&S(T)}xe("view"),await V(),x&&await Z(x.id),H("complete"),G(5),setTimeout(()=>{H("preparing"),G(0)},2e3)}catch(b){i(b.message||"Failed to generate synthesis"),H("preparing"),G(0)}finally{ve(!1)}}}async function ls(x){try{await it(x),D&&await Z(D.id),await V()}catch(b){i(b.message||"Failed to activate version")}}function we(x){S(x),x.is_active&&P&&P.commands.setContent(x.synthesis||""),Z(x.id)}function _e(x,b){N(w=>w.map(T=>T.id===x?{...T,responses:T.responses.map(F=>F.id===b.id?{...F,answers:b.answers,version:b.version}:F)}:T))}return _&&!a?e.jsx("div",{className:"min-h-screen bg-background text-foreground flex items-center justify-center",children:e.jsxs("div",{className:"text-center max-w-md mx-auto px-4",children:[e.jsx("div",{className:"text-4xl mb-4",children:"⚠️"}),e.jsx("h2",{className:"text-xl font-semibold mb-2",style:{color:"var(--foreground)"},children:"Failed to Load"}),e.jsx("p",{className:"text-sm mb-6",style:{color:"var(--muted-foreground)"},children:_}),e.jsxs("div",{className:"flex gap-3 justify-center",children:[e.jsx(M,{variant:"accent",size:"md",onClick:()=>{V(),re()},children:"Retry"}),e.jsx(M,{variant:"secondary",size:"md",onClick:()=>s("/"),children:"Back to Dashboard"})]})]})}):a?e.jsxs("div",{className:"min-h-screen bg-background text-foreground font-sans flex flex-col",children:[e.jsx("a",{href:"#main-content",className:"skip-to-main",children:"Skip to main content"}),e.jsx(qt,{email:d,viewers:ss,onLogout:ts}),e.jsxs("main",{id:"main-content",className:"flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6",tabIndex:-1,children:[e.jsxs("div",{className:"mb-4 flex items-center justify-between",children:[e.jsx("button",{onClick:()=>s("/"),className:"text-sm font-medium transition-colors",style:{color:"var(--muted-foreground)",background:"none",border:"none",cursor:"pointer"},onMouseEnter:x=>x.currentTarget.style.color="var(--accent)",onMouseLeave:x=>x.currentTarget.style.color="var(--muted-foreground)",children:"← Back to Dashboard"}),e.jsx("h2",{className:"text-sm font-medium truncate max-w-[50vw] sm:max-w-none",style:{color:"var(--muted-foreground)"},children:a.title})]}),u.length>0&&e.jsx("div",{className:"mb-4 sm:mb-6 overflow-x-auto",children:e.jsx(Ct,{rounds:u,activeRoundId:(k==null?void 0:k.id)||null,selectedRoundId:(y==null?void 0:y.id)||null,onSelectRound:we})}),e.jsx(Nt,{stage:q,step:Ve,totalSteps:Je,visible:he}),e.jsxs("button",{onClick:()=>ke(x=>!x),className:"summary-sidebar-toggle fixed z-50 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium shadow-lg transition-all min-h-[44px]","data-open":K?"true":"false",style:{top:"4.75rem",background:"var(--card)",border:"1px solid var(--border)",color:"var(--foreground)"},title:K?"Hide panel":"Show panel",children:[K?e.jsx(ge,{size:15}):e.jsx(tt,{size:15}),e.jsx("span",{className:"hidden sm:inline",children:K?"Hide":"Controls"})]}),e.jsxs("div",{className:"space-y-4 sm:space-y-6",children:[y&&!y.is_active&&e.jsx(Ls,{round:y,isCurrentRound:!1,expertLabels:B,formId:t,token:c,currentUserEmail:d}),e.jsx(Vt,{structuredRounds:A,rounds:u,formQuestions:a.questions||[],formId:t,token:c,onResponseUpdated:_e}),(!y||y.is_active)&&e.jsx(Pt,{activeRound:k,synthesisViewMode:Ye,onSetViewMode:xe,editor:P}),y&&!y.is_active&&y.synthesis&&e.jsxs("div",{className:"card p-4 sm:p-6",children:[e.jsxs("h2",{className:"text-lg font-semibold mb-3 text-foreground",children:["Synthesis (Round ",y.round_number,")"]}),e.jsx(J,{content:y.synthesis})]}),R&&e.jsxs("div",{className:"card p-4 sm:p-6",children:[e.jsx("div",{className:"flex items-start justify-between gap-4 mb-3 flex-wrap",children:e.jsxs("h2",{className:"text-lg font-semibold text-foreground flex items-center gap-2",children:[e.jsx(nt,{size:20,style:{color:"var(--accent)"}})," Structured Analysis"]})}),D&&e.jsx("div",{className:"mb-4",children:e.jsx(Lt,{formId:t,roundId:D.id,synthesisText:(()=>{const x=[];R.narrative&&x.push(R.narrative);for(const b of R.agreements||[])x.push(`Agreement: ${b.claim} — ${b.evidence_summary}`);for(const b of R.disagreements||[]){x.push(`Disagreement: ${b.topic}`);for(const w of b.positions||[])x.push(`  - ${w.position}: ${w.evidence}`)}for(const b of R.nuances||[])x.push(`Nuance: ${b.claim} — ${b.context}`);return x.join(`
`)})()})}),e.jsx(qe,{data:R,convergenceScore:(D==null?void 0:D.convergence_score)??void 0,expertLabels:B,formId:t,roundId:D==null?void 0:D.id,token:c,currentUserEmail:d})]}),D&&R&&e.jsx(It,{formId:t,roundId:D.id}),R&&e.jsxs("div",{className:"card p-4 sm:p-6",children:[e.jsxs("h2",{className:"text-lg font-semibold mb-3 text-foreground flex items-center gap-2",children:[e.jsx(rt,{size:20,style:{color:"var(--accent)"}})," Expert Cross-Analysis"]}),e.jsx(Ms,{structuredData:R,resolvedExpertLabels:B,expertLabelPreset:"default"})]}),R&&e.jsxs("div",{className:"card p-4 sm:p-6",children:[e.jsxs("h2",{className:"text-lg font-semibold mb-3 text-foreground flex items-center gap-2",children:[e.jsx(ot,{size:20,style:{color:"var(--accent)"}})," Consensus Heatmap"]}),e.jsx(qs,{structuredData:R,resolvedExpertLabels:B,questions:D==null?void 0:D.questions})]}),e.jsx(Ut,{selectedVersion:Ne,displayRound:D,resolvedExpertLabels:B,formId:t,token:c,currentUserEmail:d}),be&&O.length>=2&&e.jsx(Zt,{versions:O,currentVersionId:X,onClose:()=>ye(!1)}),(R==null?void 0:R.emergent_insights)&&R.emergent_insights.length>0&&e.jsxs("div",{className:"card p-4 sm:p-6",children:[e.jsxs("h2",{className:"text-lg font-semibold mb-3 text-foreground flex items-center gap-2",children:[e.jsx(te,{size:20,style:{color:"var(--accent)"}})," Emergent Insights"]}),e.jsx(zt,{insights:R.emergent_insights??[],expertLabels:B,formId:t,roundId:D==null?void 0:D.id,token:c,currentUserEmail:d})]}),e.jsx(Gt,{questions:je,onUpdateQuestion:(x,b)=>Y(w=>{const T=[...w];return T[x]=b,T}),onAddQuestion:()=>Y(x=>[...x,""]),onRemoveQuestion:x=>Y(b=>b.filter((w,T)=>T!==x))})]}),K&&e.jsx("div",{className:"fixed inset-0 z-30 bg-black/30 md:hidden",onClick:()=>ke(!1),"aria-hidden":"true"}),e.jsxs("aside",{role:"complementary","aria-label":"Synthesis controls",className:"summary-sidebar",style:{position:"fixed",right:0,top:"4.5rem",height:"calc(100vh - 4.5rem)",overflowY:"auto",zIndex:40,borderLeft:"1px solid var(--border)",background:"var(--background)",transform:K?"translateX(0)":"translateX(100%)",transition:"transform 0.2s ease",padding:"1rem",display:"flex",flexDirection:"column",gap:"1rem"},children:[e.jsx(Ot,{form:a,activeRound:k}),e.jsx(Qt,{responsesOpen:j,onToggleResponses:ns,onDownloadResponses:as,onSaveSynthesis:rs,onStartNextRound:os,loading:$,formTitle:a.title,formId:t,rounds:u,structuredSynthesisData:R,expertLabels:B}),e.jsx(Ht,{synthesisMode:pe,onModeChange:Xe,selectedModel:ce,onModelChange:Ze,models:on,isGenerating:he,onGenerate:is}),e.jsx(Bt,{displayRound:D,synthesisVersions:O,selectedVersionId:X,onSelectVersion:ne,selectedVersion:Ne,onActivateVersion:ls,resolvedExpertLabels:B,formId:t,token:c,currentUserEmail:d,showCompare:be,onToggleCompare:()=>ye(x=>!x)}),O.length>0&&e.jsx(rn,{versions:O,selectedVersionId:X,onSelectVersion:ne}),e.jsx(Jt,{rounds:u,selectedRoundId:(y==null?void 0:y.id)||null,onSelectRound:we})]})]}),e.jsx(Kt,{open:j,onClose:()=>C(!1),structuredRounds:A,rounds:u,formQuestions:a.questions||[],token:c,onResponseUpdated:_e})]}):e.jsx(Xt,{})}export{kn as default};
