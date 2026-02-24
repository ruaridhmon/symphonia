import{j as e}from"./vendor-markdown-8e9c571a.js";import{r as p,u as qe,b as gs,f as xs}from"./vendor-react-cff1603b.js";import{E as hs,u as vs,S as fs,U as bs,P as ys}from"./vendor-tiptap-8421aa62.js";import{F as te,P as ae,T as Se,a as js,b as ks}from"./vendor-docx-5da7a7ad.js";import{u as Ns}from"./useDocumentTitle-dacbf0e5.js";import{a as K,A as ws,b as _s,u as Cs,g as Ss}from"./index-0cfcc277.js";import{a as $s}from"./forms-ead37175.js";import{f as Es,u as zs,a as As,g as Ts,b as Rs,n as Ds,c as Fs}from"./usePresence-987628f9.js";import{L,e as W}from"./questions-e15dd5dc.js";import{C as Is,M as X,P as Ms,S as Pe,R as Ls,a as qs,b as Ps}from"./PasswordInput-7e35bdbe.js";import{u as Be}from"./useTranslation-7fda0a43.js";import{i as Bs,j as $e,k as He,l as Hs,m as Us,n as re,f as Ue,B as Gs,h as Ge,U as Oe,o as Os,p as Qs,I as Ws,Z as Qe,q as Ks,r as Vs,T as le,s as Js,t as ce,e as pe,G as Xs,X as ge,u as Ee,v as ze,w as me,x as We,y as Ae,z as Ys,A as Zs,D as et,F as st,E as tt,H as rt,J as nt,N as ot,O as at}from"./vendor-icons-ef2e68eb.js";import{b as U,a as se}from"./Skeleton-7cb61f3f.js";import"./index-cea90fcc.js";function it(s,r){return K.get(`/forms/${s}/rounds/${r}/synthesis_versions`)}function lt(s){return K.put(`/synthesis_versions/${s}/activate`,{})}function ct(s,r,t){return K.post(`/forms/${s}/rounds/${r}/generate_synthesis`,t)}function dt(s,r){return K.post(`/forms/${s}/push_summary`,{summary:r})}async function ut(s,r){const t={}.VITE_API_BASE_URL??"",a=localStorage.getItem("access_token");function n(i){const o=document.cookie.match(new RegExp(`(?:^|; )${i}=([^;]*)`));return o?decodeURIComponent(o[1]):null}const m=n("csrf_token"),g=await fetch(`${t}/forms/${s}/export_synthesis?format=${r}`,{method:"GET",credentials:"include",headers:{...m?{"X-CSRF-Token":m}:{},...a?{Authorization:`Bearer ${a}`}:{}}});if(!g.ok)throw new Error(`Export failed: ${g.statusText}`);const l=await g.blob(),d=(g.headers.get("Content-Disposition")||"").match(/filename="?([^";\n]+)"?/),f=(d==null?void 0:d[1])||`synthesis-export.${r==="json"?"json":r==="pdf"?"pdf":"md"}`;return{blob:l,filename:f}}function mt(s,r){return K.post(`/forms/${s}/rounds/${r}/devil_advocate`)}function pt(s,r,t,a){return K.post(`/forms/${s}/rounds/${r}/translate`,{audience:t,synthesis_text:a})}function gt(s,r,t){return K.post(`/forms/${s}/rounds/${r}/voice_mirror`,{responses:t})}function xt(s,r){return r[s]||`Expert ${s}`}function ie(s,r){return s.map(t=>xt(t,r)).join(", ")}function ht(s){switch(s==null?void 0:s.toLowerCase()){case"high":return"[HIGH]";case"medium":return"[MED]";case"low":return"[LOW]";default:return"[—]"}}function vt(s,r,t,a){var g,l,c,d,f,i;const n=[],m=new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});n.push(`# ${s}`),n.push(""),n.push(`**Exported:** ${m}  `),n.push(`**Rounds:** ${r.length}`),n.push(""),n.push("---"),n.push("");for(const o of r)n.push(`## Round ${o.round_number}`),n.push(""),o.convergence_score!=null&&(n.push(`**Convergence Score:** ${(o.convergence_score*100).toFixed(0)}%`),n.push("")),o.response_count!=null&&(n.push(`**Responses:** ${o.response_count}`),n.push("")),o.questions.length>0&&(n.push("### Questions"),n.push(""),o.questions.forEach((u,b)=>{n.push(`${b+1}. ${u}`)}),n.push("")),o.synthesis&&(n.push("### Narrative Synthesis"),n.push(""),n.push(o.synthesis),n.push("")),n.push("---"),n.push("");if(t){if(n.push("## Structured Analysis"),n.push(""),t.narrative&&(n.push("### Narrative"),n.push(""),n.push(t.narrative),n.push("")),(g=t.agreements)!=null&&g.length){n.push("### Agreements"),n.push("");for(const o of t.agreements){const u=(o.confidence*100).toFixed(0);if(n.push(`- **${o.claim}** (${u}% confidence)`),n.push(`  - Supporting experts: ${ie(o.supporting_experts,a)}`),o.evidence_summary&&n.push(`  - Evidence: ${o.evidence_summary}`),(l=o.evidence_excerpts)!=null&&l.length){n.push("  - **Supporting Excerpts:**");for(const b of o.evidence_excerpts){const k=a[b.expert_id]||b.expert_label||`Expert ${b.expert_id}`;n.push(`    - _${k}_: "${b.quote}"`)}}}n.push("")}if((c=t.disagreements)!=null&&c.length){n.push("### Disagreements"),n.push("");for(const o of t.disagreements){n.push(`- **${o.topic}** ${ht(o.severity)} Severity: ${o.severity}`);for(const u of o.positions)n.push(`  - *${u.position}*`),n.push(`    - Experts: ${ie(u.experts,a)}`),u.evidence&&n.push(`    - Evidence: ${u.evidence}`)}n.push("")}if((d=t.nuances)!=null&&d.length){n.push("### Nuances"),n.push("");for(const o of t.nuances)n.push(`- **${o.claim}**`),n.push(`  - Context: ${o.context}`),n.push(`  - Relevant experts: ${ie(o.relevant_experts,a)}`);n.push("")}if((f=t.follow_up_probes)!=null&&f.length){n.push("### Follow-up Probes"),n.push("");for(const o of t.follow_up_probes)n.push(`- **${o.question}**`),n.push(`  - Target experts: ${ie(o.target_experts,a)}`),o.rationale&&n.push(`  - Rationale: ${o.rationale}`);n.push("")}if(Object.keys(a).length>0){n.push("### Expert Dimensions"),n.push("");for(const[o,u]of Object.entries(a))n.push(`- Expert ${o}: **${u}**`);n.push("")}if((i=t.emergent_insights)!=null&&i.length){n.push("### Emergent Insights"),n.push("");for(const o of t.emergent_insights)typeof o=="string"?n.push(`- ${o}`):o.title||o.description?(n.push(`- **${o.title||"Insight"}**: ${o.description||""}`),o.supporting_evidence&&n.push(`  - Evidence: ${o.supporting_evidence}`)):n.push(`- ${JSON.stringify(o)}`);n.push("")}if(t.confidence_map&&Object.keys(t.confidence_map).length>0){n.push("### Confidence Map"),n.push("");for(const[o,u]of Object.entries(t.confidence_map))n.push(`- ${o}: ${(u*100).toFixed(0)}%`);n.push("")}t.meta_synthesis_reasoning&&(n.push("### Meta-Synthesis Reasoning"),n.push(""),n.push(t.meta_synthesis_reasoning),n.push(""))}return n.push("---"),n.push("*Generated by Symphonia*"),n.join(`
`)}function ft(s,r,t,a){const n=Ke(s,r,t,a),m=n.replace("</body>","<script>window.addEventListener('load', function() { setTimeout(function() { window.print(); }, 600); });<\/script></body>"),g=window.open("","_blank");if(g)g.document.write(m),g.document.close();else{const l=new Blob([n],{type:"text/html;charset=utf-8"}),c=`${s.replace(/[^a-zA-Z0-9]+/g,"-").toLowerCase()}-report.html`;te.saveAs(l,c)}}function Ke(s,r,t,a){var k,z,$,F,_;const n=new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}),m=r.reduce((h,j)=>h+(j.response_count??0),0),g=Object.keys(a).length,l=r.filter(h=>h.convergence_score!=null).map(h=>h.convergence_score).pop();let c="";(k=t==null?void 0:t.agreements)!=null&&k.length&&(c=t.agreements.map(h=>{var N;const j=(h.confidence*100).toFixed(0),C=h.supporting_experts.map(y=>a[y]||`Expert ${y}`).join(", ");let A="";return(N=h.evidence_excerpts)!=null&&N.length&&(A='<div class="evidence-box"><p class="evidence-title">Supporting Evidence</p>'+h.evidence_excerpts.map(y=>{const S=a[y.expert_id]||y.expert_label||`Expert ${y.expert_id}`;return`<blockquote>&ldquo;${E(y.quote)}&rdquo;<br/><cite>&mdash; ${E(S)}</cite></blockquote>`}).join("")+"</div>"),`<div class="finding-card agreement">
        <div class="finding-header"><span class="finding-type">Area of Agreement</span><span class="confidence-badge">${j}% confidence</span></div>
        <h4>${E(h.claim)}</h4>
        <p class="experts-line">Supported by: ${E(C)}</p>
        ${h.evidence_summary?`<p>${E(h.evidence_summary)}</p>`:""}
        ${A}
      </div>`}).join(`
`));let d="";(z=t==null?void 0:t.disagreements)!=null&&z.length&&(d=t.disagreements.map(h=>{var A;const j=((A=h.severity)==null?void 0:A.toLowerCase())||"medium",C=h.positions.map(N=>{const y=N.experts.map(S=>a[S]||`Expert ${S}`).join(", ");return`<div class="position-block">
          <p class="position-text">${E(N.position)}</p>
          <p class="experts-line">Held by: ${E(y)}</p>
          ${N.evidence?`<p class="evidence-text">${E(N.evidence)}</p>`:""}
        </div>`}).join("");return`<div class="finding-card disagreement severity-${j}">
        <div class="finding-header"><span class="finding-type">Area of Disagreement</span><span class="severity-badge severity-${j}">${j.toUpperCase()}</span></div>
        <h4>${E(h.topic)}</h4>
        ${C}
      </div>`}).join(`
`));let f="";($=t==null?void 0:t.nuances)!=null&&$.length&&(f=t.nuances.map(h=>{const j=h.relevant_experts.map(C=>a[C]||`Expert ${C}`).join(", ");return`<div class="finding-card nuance">
        <div class="finding-header"><span class="finding-type">Nuance</span></div>
        <h4>${E(h.claim)}</h4>
        <p>${E(h.context)}</p>
        <p class="experts-line">Relevant experts: ${E(j)}</p>
      </div>`}).join(`
`));let i="";(F=t==null?void 0:t.follow_up_probes)!=null&&F.length&&(i='<ol class="probes-list">'+t.follow_up_probes.map(h=>{const j=h.target_experts.map(C=>a[C]||`Expert ${C}`).join(", ");return`<li>
        <strong>${E(h.question)}</strong>
        <br/><span class="experts-line">Target: ${E(j)}</span>
        ${h.rationale?`<br/><span class="rationale">${E(h.rationale)}</span>`:""}
      </li>`}).join("")+"</ol>");const o=r.map(h=>{const j=h.convergence_score!=null?`${(h.convergence_score*100).toFixed(0)}%`:"—";return`<tr><td>Round ${h.round_number}</td><td>${h.response_count??"—"}</td><td>${j}</td><td>${h.questions.length}</td></tr>`}).join("");let u="";(_=t==null?void 0:t.emergent_insights)!=null&&_.length&&(u=t.emergent_insights.map(h=>typeof h=="string"?`<li>${E(h)}</li>`:`<li><strong>${E(h.title||"Insight")}:</strong> ${E(h.description||"")}${h.supporting_evidence?`<br/><em>Evidence: ${E(h.supporting_evidence)}</em>`:""}</li>`).join(""),u=`<ul class="insights-list">${u}</ul>`);let b="";return t!=null&&t.confidence_map&&Object.keys(t.confidence_map).length>0&&(b=Object.entries(t.confidence_map).map(([h,j])=>{const C=(j*100).toFixed(0);return`<div class="confidence-bar-row">
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
  <span class="govuk-phase-banner__text">This report was generated from a structured Delphi consultation on ${E(n)}.</span>
</div>

<div class="govuk-width-container">
<main class="govuk-main-wrapper" role="main">

  <h1 class="govuk-heading-xl">${E(s)}</h1>

  <!-- Document metadata -->
  <div class="govuk-summary-list">
    <div class="govuk-summary-list__row">
      <dt class="govuk-summary-list__key">Date</dt>
      <dd class="govuk-summary-list__value">${E(n)}</dd>
    </div>
    <div class="govuk-summary-list__row">
      <dt class="govuk-summary-list__key">Rounds completed</dt>
      <dd class="govuk-summary-list__value">${r.length}</dd>
    </div>
    <div class="govuk-summary-list__row">
      <dt class="govuk-summary-list__key">Total responses</dt>
      <dd class="govuk-summary-list__value">${m}</dd>
    </div>
    <div class="govuk-summary-list__row">
      <dt class="govuk-summary-list__key">Experts consulted</dt>
      <dd class="govuk-summary-list__value">${g}</dd>
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

  ${r.map(h=>`
  <h3 class="govuk-heading-m">Round ${h.round_number}</h3>
  ${h.questions.length>0?`
  <h4 class="govuk-heading-s">Questions posed</h4>
  <ol class="govuk-body">${h.questions.map(j=>`<li style="margin-bottom:8px">${E(j)}</li>`).join("")}</ol>`:""}
  ${h.synthesis?`
  <h4 class="govuk-heading-s">Round synthesis</h4>
  <div class="govuk-inset-text"><p class="govuk-body">${E(h.synthesis)}</p></div>`:""}
  `).join(`
`)}

  ${c||d||f?`
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

  ${f?`
  <h3 class="govuk-heading-m">3.3 Nuances and Qualifications</h3>
  ${f}`:""}
  `:""}

  ${b?`
  <hr class="govuk-section-break govuk-section-break--xl govuk-section-break--visible" />
  <h2 class="govuk-heading-l">4. Confidence Assessment</h2>
  <p class="govuk-body">Confidence levels across key topics, based on expert agreement and evidence quality:</p>
  ${b}`:""}

  ${u?`
  <hr class="govuk-section-break govuk-section-break--xl govuk-section-break--visible" />
  <h2 class="govuk-heading-l">${b?"5":"4"}. Emergent Insights</h2>
  <p class="govuk-body">Cross-cutting themes and unexpected findings that emerged from the consultation:</p>
  ${u}`:""}

  ${i?`
  <hr class="govuk-section-break govuk-section-break--xl govuk-section-break--visible" />
  <h2 class="govuk-heading-l">Annex A: Recommended Follow-up Questions</h2>
  <p class="govuk-body">The following questions are recommended for subsequent consultation rounds:</p>
  ${i}`:""}

  ${g>0?`
  <hr class="govuk-section-break govuk-section-break--xl govuk-section-break--visible" />
  <h2 class="govuk-heading-l">Annex B: Expert Panel</h2>
  <table class="govuk-table">
    <thead><tr><th class="govuk-table__header">ID</th><th class="govuk-table__header">Expertise Dimension</th></tr></thead>
    <tbody>${Object.entries(a).map(([h,j])=>`<tr><td class="govuk-table__cell">Expert ${E(h)}</td><td class="govuk-table__cell">${E(j)}</td></tr>`).join("")}</tbody>
  </table>`:""}

</main>
</div>

<footer class="govuk-footer" role="contentinfo">
  <div class="govuk-footer__meta">
    <p>This report was generated by <strong>Symphonia</strong> &mdash; a structured expert consultation platform using the Delphi method.</p>
    <p>Report generated: ${E(n)}. All expert contributions are anonymised.</p>
  </div>
</footer>

</body>
</html>`}function E(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function bt(s,r,t,a){const n=Ke(s,r,t,a),m=new Blob([n],{type:"text/html;charset=utf-8"}),g=`${s.replace(/[^a-zA-Z0-9]+/g,"-").toLowerCase()}-govuk-report.html`;te.saveAs(m,g)}function yt({formTitle:s,formId:r,rounds:t,structuredSynthesisData:a,expertLabels:n}){const[m,g]=p.useState(!1),[l,c]=p.useState(!1),[d,f]=p.useState(!1),[i,o]=p.useState(!1),[u,b]=p.useState(!1),[k,z]=p.useState(!1),$=()=>{g(!0);try{const j=vt(s,t,a,n),C=new Blob([j],{type:"text/markdown;charset=utf-8"}),A=`${s.replace(/[^a-zA-Z0-9]+/g,"-").toLowerCase()}-synthesis.md`;te.saveAs(C,A)}finally{setTimeout(()=>g(!1),500)}},F=()=>{c(!0);try{ft(s,t,a,n)}finally{setTimeout(()=>c(!1),800)}},_=()=>{f(!0);try{bt(s,t,a,n)}finally{setTimeout(()=>f(!1),800)}},h=async(j,C)=>{C(!0);try{const{blob:A,filename:N}=await ut(r,j);te.saveAs(A,N)}catch(A){console.error("Backend export failed:",A)}finally{C(!1)}};return e.jsxs(e.Fragment,{children:[e.jsx("p",{className:"text-xs font-semibold uppercase tracking-wider mt-2 mb-1",style:{color:"var(--muted-foreground)"},children:"Export Synthesis"}),e.jsx(L,{variant:"secondary",size:"md",onClick:()=>h("markdown",o),loading:i,loadingText:"Downloading…",className:"w-full text-left justify-start",children:"Download as Markdown"}),e.jsx(L,{variant:"secondary",size:"md",onClick:()=>h("json",b),loading:u,loadingText:"Downloading…",className:"w-full text-left justify-start",children:"Download as JSON"}),e.jsx(L,{variant:"secondary",size:"md",onClick:()=>h("pdf",z),loading:k,loadingText:"Downloading…",className:"w-full text-left justify-start",children:"Download as PDF"}),e.jsx("p",{className:"text-xs font-semibold uppercase tracking-wider mt-3 mb-1",style:{color:"var(--muted-foreground)"},children:"Client Reports"}),e.jsx(L,{variant:"secondary",size:"md",onClick:$,loading:m,loadingText:"Exporting…",className:"w-full text-left justify-start",children:"Export as Markdown"}),e.jsx(L,{variant:"secondary",size:"md",onClick:F,loading:l,loadingText:"Preparing PDF…",className:"w-full text-left justify-start",children:"Export as PDF"}),e.jsx(L,{variant:"secondary",size:"md",onClick:_,loading:d,loadingText:"Generating…",className:"w-full text-left justify-start",children:"Export GOV.UK Report"})]})}const jt={preparing:e.jsx(Bs,{size:16,style:{color:"var(--accent)"}}),mock_init:e.jsx($e,{size:16,style:{color:"var(--accent)"}}),synthesising:e.jsx(He,{size:16,style:{color:"var(--accent)"}}),analyzing:e.jsx(Hs,{size:16,style:{color:"var(--accent)"}}),mapping_results:e.jsx(Us,{size:16,style:{color:"var(--accent)"}}),formatting:e.jsx(re,{size:16,style:{color:"var(--accent)"}}),mock_complete:e.jsx($e,{size:16,style:{color:"var(--accent)"}}),complete:e.jsx(Ue,{size:16,style:{color:"var(--success)"}}),generating:e.jsx(Gs,{size:16,style:{color:"var(--accent)"}})},kt={preparing:"synthesis.progress.preparing",mock_init:"synthesis.progress.mockInit",synthesising:"synthesis.progress.synthesising",analyzing:"synthesis.progress.analyzing",mapping_results:"synthesis.progress.mappingResults",formatting:"synthesis.progress.formatting",mock_complete:"synthesis.progress.mockComplete",complete:"synthesis.progress.complete",generating:"synthesis.progress.generating"},Nt=e.jsx(Ge,{size:16,style:{color:"var(--muted-foreground)"}});function wt({stage:s,step:r,totalSteps:t,visible:a}){const{t:n}=Be();if(!a)return null;const m=jt[s]||Nt,g=kt[s],l=g?n(g):s,c=t>0?Math.round(r/t*100):0,d=s==="complete"||s==="mock_complete";return e.jsxs("div",{className:`synthesis-progress ${d?"complete":""}`,"aria-live":"polite","aria-atomic":"true",children:[e.jsxs("div",{className:"synthesis-progress-header",children:[e.jsx("span",{className:"synthesis-progress-emoji","aria-hidden":"true",children:m}),e.jsx("span",{className:"synthesis-progress-label",children:l}),e.jsxs("span",{className:"synthesis-progress-pct",children:[c,"%"]})]}),e.jsx("div",{className:"synthesis-progress-track",role:"progressbar","aria-valuenow":c,"aria-valuemin":0,"aria-valuemax":100,"aria-label":n("synthesis.progress.progressLabel",{label:l}),children:e.jsx("div",{className:"synthesis-progress-fill",style:{width:`${c}%`}})}),!d&&e.jsx("div",{className:"synthesis-progress-steps",children:n("synthesis.progress.stepOf",{step:r,total:t})})]})}function _t(s){if(s==null)return"var(--muted-foreground)";const r=Math.round(s*100);return r>=80?"var(--success)":r>=60?"var(--warning)":"var(--destructive)"}function Ct(s){return s==null?"—":`${Math.round(s*100)}%`}function St({rounds:s,activeRoundId:r,selectedRoundId:t,onSelectRound:a}){const[n,m]=p.useState(null),g=p.useRef([]),l=p.useRef([]),c=p.useCallback((i,o)=>{var b;let u=-1;i.key==="ArrowRight"||i.key==="ArrowDown"?(i.preventDefault(),u=(o+1)%s.length):i.key==="ArrowLeft"||i.key==="ArrowUp"?(i.preventDefault(),u=(o-1+s.length)%s.length):i.key==="Home"?(i.preventDefault(),u=0):i.key==="End"&&(i.preventDefault(),u=s.length-1),u>=0&&((b=g.current[u])==null||b.focus(),a(s[u]))},[s,a]),d=p.useCallback((i,o)=>{var b;let u=-1;i.key==="ArrowDown"?(i.preventDefault(),u=(o+1)%s.length):i.key==="ArrowUp"?(i.preventDefault(),u=(o-1+s.length)%s.length):i.key==="Home"?(i.preventDefault(),u=0):i.key==="End"&&(i.preventDefault(),u=s.length-1),u>=0&&((b=l.current[u])==null||b.focus(),a(s[u]))},[s,a]);if(s.length===0)return null;const f=s.findIndex(i=>i.id===t);return e.jsxs("div",{className:"round-timeline-v2",children:[e.jsxs("div",{className:"round-timeline-v2-header",children:[e.jsx("h3",{className:"round-timeline-v2-title",children:"Round Navigation"}),e.jsxs("span",{className:"round-timeline-v2-count",children:[s.length," round",s.length!==1?"s":""]})]}),e.jsx("div",{className:"round-timeline-v2-stepper",role:"tablist","aria-label":"Round stepper",children:s.map((i,o)=>{const u=i.is_active,b=i.id===t,k=!!(i.synthesis&&i.synthesis.trim()),z=o===s.length-1;return e.jsxs("div",{className:"round-timeline-v2-step",children:[!z&&e.jsx("div",{className:`round-timeline-v2-connector ${k?"completed":""}`}),e.jsx("button",{ref:$=>{g.current[o]=$},className:["round-timeline-v2-node",u?"active":"",b?"selected":"",k?"has-synthesis":""].filter(Boolean).join(" "),role:"tab","aria-selected":b,tabIndex:b||f===-1&&o===0?0:-1,onClick:()=>a(i),onKeyDown:$=>c($,o),onMouseEnter:()=>m(i.id),onMouseLeave:()=>m(null),"aria-label":`Round ${i.round_number}${u?" (active)":""}${k?" (synthesised)":""}`,children:k?e.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"3",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:e.jsx("polyline",{points:"20 6 9 17 4 12"})}):e.jsx("span",{className:"round-timeline-v2-node-number",children:i.round_number})}),e.jsxs("span",{className:`round-timeline-v2-step-label ${b?"selected":""} ${u?"active":""}`,"aria-hidden":"true",children:["R",i.round_number]})]},i.id)})}),e.jsx("div",{className:"round-timeline-v2-cards",role:"listbox","aria-label":"Round cards",children:s.map((i,o)=>{var z;const u=i.is_active,b=i.id===t,k=!!(i.synthesis&&i.synthesis.trim());return e.jsxs("button",{ref:$=>{l.current[o]=$},className:["round-card-v2",b?"selected":"",u?"current":""].filter(Boolean).join(" "),role:"option","aria-selected":b,tabIndex:b||f===-1&&o===0?0:-1,onClick:()=>a(i),onKeyDown:$=>d($,o),children:[e.jsx("div",{className:"round-card-v2-header",children:e.jsxs("div",{className:"round-card-v2-title-row",children:[e.jsxs("span",{className:"round-card-v2-title",children:["Round ",i.round_number]}),e.jsxs("div",{className:"round-card-v2-badges",children:[u&&e.jsxs("span",{className:"round-card-v2-badge round-card-v2-badge-active",children:[e.jsx("span",{className:"round-card-v2-badge-dot active"}),"Live"]}),k&&!u&&e.jsxs("span",{className:"round-card-v2-badge round-card-v2-badge-complete",children:[e.jsx(Ue,{size:12,style:{color:"var(--success)",display:"inline",verticalAlign:"text-bottom",marginRight:"3px"}}),"Synthesised"]}),!k&&!u&&e.jsx("span",{className:"round-card-v2-badge round-card-v2-badge-pending",children:"Pending"})]})]})}),e.jsxs("div",{className:"round-card-v2-stats",children:[e.jsxs("div",{className:"round-card-v2-stat",children:[e.jsx("span",{className:"round-card-v2-stat-icon",children:e.jsx(Oe,{size:14,style:{color:"var(--muted-foreground)"}})}),e.jsx("span",{className:"round-card-v2-stat-value",children:i.response_count??0}),e.jsx("span",{className:"round-card-v2-stat-label",children:"responses"})]}),e.jsxs("div",{className:"round-card-v2-stat",children:[e.jsx("span",{className:"round-card-v2-stat-icon",children:e.jsx(Os,{size:14,style:{color:"var(--accent)"}})}),e.jsx("span",{className:"round-card-v2-stat-value",style:{color:_t(i.convergence_score)},children:Ct(i.convergence_score)}),e.jsx("span",{className:"round-card-v2-stat-label",children:"convergence"})]}),e.jsxs("div",{className:"round-card-v2-stat",children:[e.jsx("span",{className:"round-card-v2-stat-icon",children:e.jsx(Qs,{size:14,style:{color:"var(--muted-foreground)"}})}),e.jsx("span",{className:"round-card-v2-stat-value",children:((z=i.questions)==null?void 0:z.length)??0}),e.jsx("span",{className:"round-card-v2-stat-label",children:"questions"})]})]}),b&&e.jsx("div",{className:"round-card-v2-selected-indicator"})]},i.id)})})]})}function $t(s){if(!s)return"";const r=s.toLowerCase();return r.includes("past")||r.includes("urðr")||r.includes("urd")?"dimension-past":r.includes("present")||r.includes("verðandi")||r.includes("verdandi")?"dimension-present":r.includes("future")||r.includes("skuld")?"dimension-future":r.includes("quantitative")?"dimension-quantitative":r.includes("qualitative")?"dimension-qualitative":r.includes("mixed")?"dimension-mixed":r.includes("industry")?"dimension-industry":r.includes("academia")?"dimension-academia":r.includes("policy")?"dimension-policy":""}function Et(s){switch(s){case"cross-pollination":return"Cross-pollination";case"synthesis":return"Synthesis";case"implicit":return"Implicit";default:return s}}function zt(s){switch(s){case"cross-pollination":return"emergence-type-cross-pollination";case"synthesis":return"emergence-type-synthesis";case"implicit":return"emergence-type-implicit";default:return""}}function At({insights:s,expertLabels:r,formId:t,roundId:a,token:n,currentUserEmail:m}){const g=!!(t&&a&&n),[l,c]=p.useState(!0);return!s||s.length===0?null:e.jsxs("div",{className:"emergence-section fade-in",children:[e.jsxs("button",{className:"structured-section-header",onClick:()=>c(!l),"aria-expanded":l,"aria-controls":"emergence-highlights-body","aria-label":`Emergent Insights — ${s.length} item${s.length!==1?"s":""}`,children:[e.jsxs("div",{className:"structured-section-left",children:[e.jsx("span",{className:"structured-section-emoji","aria-hidden":"true",children:e.jsx(re,{size:16,style:{color:"var(--accent)"}})}),e.jsx("span",{className:"structured-section-title",children:"Emergent Insights"}),e.jsx("span",{className:"structured-section-badge",style:{backgroundColor:"var(--accent)"},children:s.length})]}),e.jsx("span",{className:`structured-section-chevron ${l?"expanded":""}`,"aria-hidden":"true",children:"▸"})]}),l&&e.jsx("div",{className:"structured-section-body slide-down",id:"emergence-highlights-body",role:"region","aria-label":"Emergent Insights",children:s.map((d,f)=>e.jsxs("div",{className:"emergence-card",children:[e.jsxs("div",{className:"emergence-card-top",children:[e.jsx("p",{className:"emergence-card-insight",children:d.insight}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"8px",flexShrink:0},children:[e.jsx("span",{className:`emergence-type-badge ${zt(d.emergence_type)}`,children:Et(d.emergence_type)}),g&&e.jsx(Is,{formId:t,roundId:a,sectionType:"emergence",sectionIndex:f,token:n,currentUserEmail:m})]})]}),(d.contributing_experts||[]).length>0&&e.jsx("div",{className:"structured-card-experts",children:(d.contributing_experts||[]).map(i=>e.jsx("span",{className:`expert-chip ${$t(r==null?void 0:r[i])}`,title:`Expert ${i}`,children:(r==null?void 0:r[i])||`E${i}`},i))}),e.jsx("p",{className:"emergence-explanation",children:d.explanation})]},f))})]})}const Tt={simple:e.jsx(Qe,{size:16,style:{color:"var(--warning)"}}),committee:e.jsx(Oe,{size:16,style:{color:"var(--accent)"}}),ttd:e.jsx(He,{size:16,style:{color:"var(--accent)"}})},Rt=["simple","committee","ttd"];function Dt({mode:s,onModeChange:r}){const{t}=Be(),[a,n]=p.useState(null),m=Rt.map(l=>({id:l,name:t(`synthesis.modes.${l}`),description:t(`synthesis.modes.${l}Desc`),detail:t(`synthesis.modes.${l}Detail`),icon:Tt[l],speed:t(`synthesis.modes.speed${l==="simple"?"Fast":l==="committee"?"Moderate":"Thorough"}`),bestFor:t(`synthesis.modes.${l}BestFor`)})),g=p.useCallback(l=>{var f;const c=m.findIndex(i=>i.id===s);let d=c;if(l.key==="ArrowDown"||l.key==="ArrowRight"?(l.preventDefault(),d=(c+1)%m.length):(l.key==="ArrowUp"||l.key==="ArrowLeft")&&(l.preventDefault(),d=(c-1+m.length)%m.length),d!==c){r(m[d].id);const i=l.target.closest('[role="radiogroup"]'),o=i==null?void 0:i.querySelectorAll('[role="radio"]');(f=o==null?void 0:o[d])==null||f.focus()}},[s,r,m]);return e.jsx("div",{className:"synthesis-mode-selector",role:"radiogroup","aria-label":t("synthesis.modes.modeLabel"),children:m.map(l=>e.jsxs("div",{style:{position:"relative"},children:[e.jsxs("button",{className:`synthesis-mode-option ${s===l.id?"selected":""}`,onClick:()=>r(l.id),role:"radio","aria-checked":s===l.id,"aria-label":`${l.name} synthesis mode: ${l.description}`,tabIndex:s===l.id?0:-1,onKeyDown:g,children:[e.jsx("span",{className:"synthesis-mode-emoji",children:l.icon}),e.jsxs("div",{className:"synthesis-mode-text",children:[e.jsx("span",{className:"synthesis-mode-name",children:l.name}),e.jsx("span",{className:"synthesis-mode-desc",children:l.description})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"0.375rem"},children:[e.jsx("span",{className:"synthesis-mode-speed",children:l.speed}),e.jsx("button",{type:"button",onClick:c=>{c.stopPropagation(),n(a===l.id?null:l.id)},"aria-label":t("synthesis.modes.moreInfo",{mode:l.name}),style:{background:"none",border:"none",cursor:"pointer",padding:"2px",display:"flex",alignItems:"center",color:"var(--muted-foreground)",opacity:.7,transition:"opacity 0.15s"},onMouseEnter:c=>{c.target.style.opacity="1"},onMouseLeave:c=>{c.target.style.opacity="0.7"},children:e.jsx(Ws,{size:13})})]})]}),a===l.id&&e.jsxs("div",{className:"fade-in",style:{marginTop:"0.25rem",padding:"0.75rem 1rem",borderRadius:"var(--radius)",backgroundColor:"var(--muted)",border:"1px solid var(--border)",fontSize:"0.8125rem",lineHeight:"1.5",color:"var(--muted-foreground)"},children:[e.jsx("p",{style:{marginBottom:"0.5rem"},children:l.detail}),e.jsxs("p",{style:{fontSize:"0.75rem",fontWeight:600,color:"var(--foreground)"},children:[t("synthesis.modes.bestFor")," ",e.jsx("span",{style:{fontWeight:400,color:"var(--muted-foreground)"},children:l.bestFor})]})]})]},l.id))})}function Ve({response:s,questions:r,onUpdated:t}){const[a,n]=p.useState(!1),[m,g]=p.useState({}),[l,c]=p.useState(!1),[d,f]=p.useState(null),[i,o]=p.useState(null),[u,b]=p.useState(s.version),[k,z]=p.useState(s.answers),$=p.useRef({});p.useEffect(()=>{b(s.version),z(s.answers)},[s.version,s.answers]);const F=p.useCallback(()=>{const N={};for(const[y,S]of Object.entries(k))N[y]=String(S??"");g(N),n(!0),f(null),o(null)},[k]),_=p.useCallback(()=>{n(!1),g({}),f(null),o(null)},[]),h=p.useCallback((N,y)=>{g(S=>({...S,[N]:y}))},[]),j=p.useCallback(async(N=!1)=>{c(!0),f(null);try{const S=await(N?Es:zs)(s.id,m,u);b(S.version),z(S.answers),n(!1),g({}),o(null),t==null||t({...s,answers:S.answers,version:S.version})}catch(y){if(y instanceof ws&&y.status===409){const S=parseInt(y.headers.get("X-Current-Version")||"0",10);o({serverVersion:S||u+1,localAnswers:{...m}});return}f(y instanceof Error?y.message:"Network error")}finally{c(!1)}},[m,u,s.id,t]),C=p.useCallback(()=>j(!0),[j]);p.useEffect(()=>{if(!i)return;const N=y=>{y.key==="Escape"&&(y.preventDefault(),o(null))};return document.addEventListener("keydown",N),()=>document.removeEventListener("keydown",N)},[i]);const A=p.useCallback(N=>{N&&(N.style.height="auto",N.style.height=`${N.scrollHeight}px`)},[]);return a?e.jsxs("div",{className:"rounded-lg p-4",style:{backgroundColor:"var(--card)",border:"2px solid var(--accent)",boxShadow:"0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent)"},children:[e.jsxs("div",{className:"flex items-center justify-between mb-3",children:[e.jsxs("span",{className:"text-xs font-medium",style:{color:"var(--muted-foreground)"},children:["Editing: ",s.email||"Anonymous"]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx("button",{onClick:_,disabled:l,className:"text-xs px-3 py-1 rounded",style:{backgroundColor:"var(--muted)",color:"var(--muted-foreground)"},children:"Cancel"}),e.jsx("button",{onClick:()=>j(!1),disabled:l,className:"text-xs px-3 py-1 rounded font-medium",style:{backgroundColor:"var(--accent)",color:"var(--accent-foreground)",opacity:l?.6:1},children:l?"Saving…":e.jsxs(e.Fragment,{children:[e.jsx(Vs,{size:12,className:"inline mr-1"})," Save"]})})]})]}),r.map((N,y)=>{const S=`q${y+1}`;return e.jsxs("div",{className:"mb-3 last:mb-0",children:[e.jsx("label",{className:"text-xs font-semibold mb-1 block",style:{color:"var(--foreground)"},children:W(N)}),e.jsx("textarea",{ref:q=>{$.current[S]=q,A(q)},value:m[S]??"",onChange:q=>{h(S,q.target.value),A(q.target)},disabled:l,rows:2,className:"w-full rounded-md px-3 py-2 text-sm resize-none",style:{backgroundColor:"var(--background)",color:"var(--foreground)",border:"1px solid var(--input)"}})]},S)}),d&&e.jsxs("div",{className:"mt-3 p-3 rounded-md text-sm",style:{backgroundColor:"color-mix(in srgb, var(--destructive) 10%, transparent)",color:"var(--destructive)",border:"1px solid var(--destructive)"},children:[e.jsx(le,{size:14,className:"inline mr-1"})," ",d]}),i&&e.jsx("div",{className:"fixed inset-0 z-[60] flex items-center justify-center p-4",style:{backgroundColor:"rgba(0,0,0,0.6)"},onClick:N=>{N.target===N.currentTarget&&o(null)},children:e.jsxs("div",{className:"rounded-xl p-6 max-w-lg w-full space-y-4",style:{backgroundColor:"var(--card)",border:"1px solid var(--border)",boxShadow:"0 25px 50px -12px rgba(0,0,0,0.25)"},children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(le,{size:24,style:{color:"var(--destructive)"}}),e.jsx("h3",{className:"text-lg font-bold",style:{color:"var(--foreground)"},children:"Edit Conflict"})]}),e.jsxs("p",{className:"text-sm",style:{color:"var(--muted-foreground)"},children:["This response was modified by another admin since you started editing. Your version: ",e.jsxs("strong",{children:["v",u]}),", server version: ",e.jsxs("strong",{children:["v",i.serverVersion]}),"."]}),e.jsxs("div",{className:"rounded-md p-3 text-xs space-y-2",style:{backgroundColor:"var(--muted)",border:"1px solid var(--border)"},children:[e.jsx("div",{className:"font-semibold",style:{color:"var(--foreground)"},children:"Your pending changes:"}),r.map((N,y)=>{const S=`q${y+1}`,q=i.localAnswers[S]??"",B=String(k[S]??"");return q===B?null:e.jsxs("div",{children:[e.jsx("div",{style:{color:"var(--muted-foreground)"},children:W(N)}),e.jsxs("div",{className:"mt-0.5",style:{color:"var(--destructive)"},children:["− ",B||"(empty)"]}),e.jsxs("div",{className:"mt-0.5",style:{color:"var(--success, #22c55e)"},children:["+ ",q||"(empty)"]})]},S)})]}),e.jsxs("div",{className:"flex gap-3 justify-end pt-2",children:[e.jsx("button",{onClick:()=>{o(null),_()},className:"px-4 py-2 rounded-lg text-sm",style:{backgroundColor:"var(--muted)",color:"var(--foreground)"},children:"Discard My Changes"}),e.jsx("button",{onClick:C,disabled:l,className:"px-4 py-2 rounded-lg text-sm font-medium",style:{backgroundColor:"var(--destructive)",color:"var(--destructive-foreground)",opacity:l?.6:1},children:l?"Saving…":"Force Save My Version"})]})]})})]}):e.jsxs("div",{className:"group relative rounded-lg p-4 transition-colors",style:{backgroundColor:"var(--card)",border:"1px solid var(--border)"},children:[e.jsxs("div",{className:"flex items-center justify-between mb-2",children:[e.jsx("span",{className:"text-xs font-medium",style:{color:"var(--muted-foreground)"},children:s.email||"Anonymous"}),e.jsxs("button",{onClick:F,className:"opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-1 rounded",style:{backgroundColor:"var(--accent)",color:"var(--accent-foreground)"},title:"Edit response",children:[e.jsx(Ks,{size:12,className:"inline mr-1"})," Edit"]})]}),r.map((N,y)=>{const S=`q${y+1}`,q=k[S];return q?e.jsxs("div",{className:"mb-3 last:mb-0",children:[e.jsx("div",{className:"text-xs font-semibold mb-1",style:{color:"var(--foreground)"},children:W(N)}),e.jsx("div",{className:"text-sm leading-relaxed",style:{color:"var(--foreground)"},children:String(q)})]},S):null})]})}const Te={strong:{bg:"color-mix(in srgb, var(--destructive) 12%, transparent)",text:"var(--destructive)",label:"Strong"},moderate:{bg:"color-mix(in srgb, var(--warning) 12%, transparent)",text:"var(--warning)",label:"Moderate"},weak:{bg:"color-mix(in srgb, var(--success) 12%, transparent)",text:"var(--success)",label:"Weak"}};function Ft({strength:s}){const r=Te[s]||Te.moderate;return e.jsx("span",{className:"text-xs font-medium px-2 py-0.5 rounded-full",style:{backgroundColor:r.bg,color:r.text},children:r.label})}function It({formId:s,roundId:r}){const[t,a]=p.useState([]),[n,m]=p.useState(!1),[g,l]=p.useState(null),[c,d]=p.useState(!0),[f,i]=p.useState(!1);async function o(){m(!0),l(null);try{const u=await mt(s,r);a(u.counterarguments),i(!0),d(!0)}catch(u){l(u.message||"Failed to generate counterarguments")}finally{m(!1)}}return e.jsxs("div",{className:"card p-4 sm:p-6",children:[e.jsxs("div",{className:"flex items-center justify-between mb-3",children:[e.jsxs("button",{onClick:()=>f&&d(u=>!u),className:"flex items-center gap-2 text-left",style:{background:"none",border:"none",cursor:f?"pointer":"default",padding:0},"aria-expanded":f?c:void 0,"aria-label":"Toggle AI counterpoints section",children:[e.jsx(Js,{size:20,style:{color:"var(--warning)"}}),e.jsx("h2",{className:"text-lg font-semibold text-foreground",children:"🤖 AI Counterpoints"}),f&&e.jsx(ce,{size:16,className:"transition-transform",style:{color:"var(--muted-foreground)",transform:c?"rotate(0deg)":"rotate(-90deg)"}})]}),e.jsx("button",{onClick:o,disabled:n,className:"text-sm font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5",style:{backgroundColor:n?"var(--muted)":"rgba(249,115,22,0.12)",color:n?"var(--muted-foreground)":"var(--warning)",border:"none",cursor:n?"not-allowed":"pointer"},children:n?e.jsxs(e.Fragment,{children:[e.jsx(pe,{size:14,className:"animate-spin"}),"Generating…"]}):f?"Regenerate":"Generate"})]}),e.jsxs("div",{className:"flex items-start gap-2 text-xs rounded-lg px-3 py-2 mb-3",style:{backgroundColor:"rgba(249,115,22,0.06)",color:"var(--muted-foreground)"},children:[e.jsx(le,{size:14,className:"flex-shrink-0 mt-0.5",style:{color:"var(--warning)"}}),e.jsxs("span",{children:["These counterarguments are ",e.jsx("strong",{children:"AI-generated"})," and do not represent expert views. They highlight potential blind spots for consideration."]})]}),g&&e.jsx("div",{className:"text-sm rounded-lg px-3 py-2 mb-3",style:{backgroundColor:"rgba(239,68,68,0.08)",color:"var(--destructive)"},children:g}),f&&c&&t.length>0&&e.jsx("div",{className:"space-y-3",children:t.map((u,b)=>e.jsxs("div",{className:"rounded-lg p-3 sm:p-4",style:{backgroundColor:"var(--muted)",border:"1px solid var(--border)"},children:[e.jsxs("div",{className:"flex items-start justify-between gap-3 mb-2",children:[e.jsx("p",{className:"text-sm font-medium text-foreground",children:u.argument}),e.jsx(Ft,{strength:u.strength})]}),e.jsx("p",{className:"text-sm",style:{color:"var(--muted-foreground)"},children:u.rationale})]},b))}),!f&&!n&&e.jsxs("p",{className:"text-sm text-center py-4",style:{color:"var(--muted-foreground)"},children:["Click ",e.jsx("strong",{children:"Generate"})," to have AI identify counterarguments and blind spots in the current synthesis."]})]})}const Mt=[{value:"policy_maker",label:"Policy Maker",icon:"🏛️"},{value:"technical",label:"Technical",icon:"🔬"},{value:"general_public",label:"General Public",icon:"👥"},{value:"executive",label:"Executive",icon:"💼"},{value:"academic",label:"Academic",icon:"🎓"}];function Lt({formId:s,roundId:r,synthesisText:t}){const[a,n]=p.useState(""),[m,g]=p.useState(null),[l,c]=p.useState(""),[d,f]=p.useState(!1),[i,o]=p.useState(null);async function u(k){if(n(k),o(null),!k){g(null),c("");return}f(!0);try{const z=await pt(s,r,k,t);g(z.translated_text),c(z.audience_label)}catch(z){o(z.message||"Failed to translate synthesis"),g(null)}finally{f(!1)}}function b(){n(""),g(null),c(""),o(null)}return e.jsxs("div",{className:"space-y-3",children:[e.jsxs("div",{className:"flex items-center gap-2 flex-wrap",children:[e.jsx(Xs,{size:16,style:{color:"var(--accent)",flexShrink:0}}),e.jsx("span",{className:"text-sm font-medium",style:{color:"var(--muted-foreground)"},children:"Reading as:"}),e.jsxs("select",{value:a,onChange:k=>u(k.target.value),disabled:d,"aria-label":"Select audience for synthesis translation",className:"text-sm rounded-lg px-3 py-1.5 transition-colors",style:{backgroundColor:"var(--muted)",color:"var(--foreground)",border:"1px solid var(--border)",cursor:d?"wait":"pointer",minWidth:"180px"},children:[e.jsx("option",{value:"",children:"Select audience…"}),Mt.map(k=>e.jsxs("option",{value:k.value,children:[k.icon," ",k.label]},k.value))]}),a&&!d&&e.jsx("button",{onClick:b,className:"p-1 rounded transition-colors",style:{background:"none",border:"none",color:"var(--muted-foreground)",cursor:"pointer"},title:"Clear translation","aria-label":"Clear audience translation",children:e.jsx(ge,{size:14,"aria-hidden":"true"})}),d&&e.jsx(pe,{size:16,className:"animate-spin",style:{color:"var(--accent)"}})]}),i&&e.jsx("div",{className:"text-sm rounded-lg px-3 py-2",style:{backgroundColor:"rgba(239,68,68,0.08)",color:"var(--destructive)"},children:i}),m&&e.jsxs("div",{className:"rounded-lg p-4 sm:p-5 space-y-2",style:{backgroundColor:"rgba(99,102,241,0.04)",border:"1px solid rgba(99,102,241,0.15)"},children:[e.jsxs("div",{className:"flex items-center gap-2 mb-2",children:[e.jsxs("span",{className:"text-xs font-medium px-2 py-0.5 rounded-full",style:{backgroundColor:"rgba(99,102,241,0.12)",color:"rgb(99,102,241)"},children:[l," Lens"]}),e.jsx("span",{className:"text-xs",style:{color:"var(--muted-foreground)"},children:"AI-translated version"})]}),e.jsx(X,{content:m})]})]})}function qt({formId:s,roundId:r,responses:t,questions:a}){const[n,m]=p.useState({}),[g,l]=p.useState(new Set),[c,d]=p.useState(!1),[f,i]=p.useState(null),[o,u]=p.useState(!1),b=`${s}-${r}`,k=p.useCallback(async()=>{if(n[b]){u(!0);return}d(!0),i(null);try{const _=[];for(const j of t)for(let C=0;C<a.length;C++){const A=`q${C+1}`,N=j.answers[A];N&&_.push({expert:j.email||`Expert ${j.id}`,question:W(a[C]),answer:String(N)})}if(_.length===0){i("No responses to clarify");return}const h=await gt(s,r,_);m(j=>({...j,[b]:h.clarified_responses})),u(!0)}catch(_){i(_ instanceof Error?_.message:"Failed to generate clarifications")}finally{d(!1)}},[s,r,t,a,b,n]),z=p.useCallback(_=>{l(h=>{const j=new Set(h);return j.has(_)?j.delete(_):j.add(_),j})},[]),$=p.useCallback(()=>{g.size===t.length?l(new Set):l(new Set(t.map(_=>_.id)))},[g,t]),F=(_,h)=>{const j=n[b];if(!j)return null;const C=_||"",A=W(a[h]),N=j.find(y=>(y.expert===C||y.expert.includes(C))&&y.question===A);return(N==null?void 0:N.clarified)||null};return t.length===0?null:e.jsxs("div",{className:"rounded-lg overflow-hidden",style:{border:"1px solid var(--border)",backgroundColor:"var(--card)"},children:[e.jsxs("div",{className:"p-4 flex items-center justify-between",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(re,{size:16,style:{color:"var(--accent)"}}),e.jsx("h3",{className:"text-sm font-semibold",style:{color:"var(--foreground)"},children:"Voice Mirroring"}),e.jsx("span",{className:"text-xs px-2 py-0.5 rounded-full",style:{backgroundColor:"color-mix(in srgb, var(--accent) 12%, transparent)",color:"var(--accent)"},children:"AI"})]}),o?e.jsx("button",{onClick:$,className:"text-xs font-medium px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5",style:{backgroundColor:"color-mix(in srgb, var(--accent) 10%, transparent)",color:"var(--accent)",cursor:"pointer"},children:g.size===t.length?e.jsxs(e.Fragment,{children:[e.jsx(Ee,{size:14}),"Show All Originals"]}):e.jsxs(e.Fragment,{children:[e.jsx(ze,{size:14}),"Show All Clarified"]})}):e.jsx("button",{onClick:k,disabled:c,className:"text-xs font-medium px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5",style:{backgroundColor:"var(--accent)",color:"var(--accent-foreground)",opacity:c?.7:1,cursor:c?"not-allowed":"pointer"},children:c?e.jsxs(e.Fragment,{children:[e.jsx(pe,{size:12,className:"animate-spin"}),"Clarifying…"]}):e.jsxs(e.Fragment,{children:[e.jsx(re,{size:12}),"Generate Clarifications"]})})]}),o&&e.jsx("div",{className:"mx-4 mb-3 px-3 py-2 rounded-md text-xs",style:{backgroundColor:"color-mix(in srgb, var(--accent) 6%, transparent)",color:"var(--muted-foreground)",border:"1px solid color-mix(in srgb, var(--accent) 15%, transparent)"},children:"🔍 AI-clarified versions preserve the expert's original meaning while improving readability. Toggle per response to compare."}),f&&e.jsxs("div",{className:"mx-4 mb-3 p-3 rounded-md text-sm flex items-center gap-2",style:{backgroundColor:"color-mix(in srgb, var(--destructive) 10%, transparent)",color:"var(--destructive)",border:"1px solid var(--destructive)"},children:[e.jsx(le,{size:14}),f]}),o&&e.jsx("div",{className:"px-4 pb-4 space-y-3",children:t.map(_=>{const h=g.has(_.id);return e.jsxs("div",{className:"rounded-lg p-3 transition-all",style:{backgroundColor:h?"color-mix(in srgb, var(--accent) 5%, var(--background))":"var(--background)",border:`1px solid ${h?"color-mix(in srgb, var(--accent) 25%, transparent)":"var(--border)"}`},children:[e.jsxs("div",{className:"flex items-center justify-between mb-2",children:[e.jsx("span",{className:"text-xs font-medium",style:{color:"var(--muted-foreground)"},children:_.email||"Anonymous"}),e.jsx("button",{onClick:()=>z(_.id),className:"flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors",style:{backgroundColor:h?"color-mix(in srgb, var(--accent) 15%, transparent)":"var(--muted)",color:h?"var(--accent)":"var(--muted-foreground)",cursor:"pointer",border:"none"},"aria-pressed":h,"aria-label":h?"Switch to original response":"Switch to AI-clarified response",children:h?e.jsxs(e.Fragment,{children:[e.jsx(Ee,{size:12}),"Clarified"]}):e.jsxs(e.Fragment,{children:[e.jsx(ze,{size:12}),"Original"]})})]}),a.map((j,C)=>{const A=`q${C+1}`,N=_.answers[A];if(!N)return null;const y=F(_.email,C),S=h&&y?y:String(N);return e.jsxs("div",{className:"mb-2 last:mb-0",children:[e.jsx("div",{className:"text-xs font-semibold mb-1",style:{color:"var(--foreground)"},children:W(j)}),e.jsx("div",{className:"text-sm leading-relaxed transition-all",style:{color:"var(--foreground)",fontStyle:"normal"},children:S}),h&&y&&e.jsxs("div",{className:"text-xs mt-1",style:{color:"var(--muted-foreground)",fontStyle:"italic"},children:["Original: ",String(N)]})]},A)})]},_.id)})})]})}function Pt({email:s,viewers:r,onLogout:t}){const a=qe();return e.jsx("header",{className:"border-b sticky top-0 z-40",style:{backgroundColor:"var(--card)",borderColor:"var(--border)",boxShadow:"0 1px 3px 0 rgba(0,0,0,0.04)",backdropFilter:"blur(8px)"},children:e.jsxs("div",{className:"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center",children:[e.jsxs("div",{className:"flex items-center gap-2 sm:gap-4 min-w-0",children:[e.jsxs("div",{className:"flex items-center gap-2 sm:gap-3 min-w-0 cursor-pointer",onClick:()=>a("/"),children:[e.jsx("img",{src:"/logo-mark.png",alt:"Symphonia",className:"h-7 w-auto flex-shrink-0"}),e.jsxs("div",{className:"min-w-0",children:[e.jsx("h1",{className:"text-base sm:text-lg font-bold tracking-tight text-foreground leading-tight",children:"Admin Workspace"}),e.jsx("p",{className:"text-xs text-muted-foreground leading-tight truncate",children:s})]})]}),e.jsx(Ms,{viewers:r,currentUserEmail:s})]}),e.jsx("button",{onClick:t,className:"text-sm px-3 py-1.5 rounded-lg transition-colors flex-shrink-0",style:{color:"var(--muted-foreground)",backgroundColor:"transparent",border:"none",cursor:"pointer"},onMouseEnter:n=>{n.currentTarget.style.backgroundColor="var(--muted)",n.currentTarget.style.color="var(--destructive)"},onMouseLeave:n=>{n.currentTarget.style.backgroundColor="transparent",n.currentTarget.style.color="var(--muted-foreground)"},children:"Log out"})]})})}function Bt({activeRound:s,synthesisViewMode:r,onSetViewMode:t,editor:a}){return e.jsxs("div",{className:"card p-4 sm:p-6 min-h-[200px] lg:min-h-[300px]",style:{borderTop:"3px solid var(--accent)"},children:[e.jsxs("div",{className:"flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3",children:[e.jsxs("h2",{className:"text-lg font-semibold text-foreground flex items-center gap-2",style:{margin:0},children:[e.jsx("span",{children:"📝"})," Synthesis for Round ",(s==null?void 0:s.round_number)||""]}),e.jsxs("div",{role:"tablist","aria-label":"Synthesis view mode",style:{display:"inline-flex",borderRadius:"0.5rem",overflow:"hidden",border:"1px solid var(--border)",fontSize:"0.8125rem",alignSelf:"flex-start"},children:[e.jsx("button",{role:"tab","aria-selected":r==="view",onClick:()=>t("view"),style:{padding:"0.375rem 0.75rem",cursor:"pointer",border:"none",fontWeight:r==="view"?600:400,backgroundColor:r==="view"?"var(--accent)":"var(--card)",color:r==="view"?"white":"var(--muted-foreground)",transition:"all 0.15s ease"},children:"View"}),e.jsx("button",{role:"tab","aria-selected":r==="edit",onClick:()=>t("edit"),style:{padding:"0.375rem 0.75rem",cursor:"pointer",border:"none",borderLeft:"1px solid var(--border)",fontWeight:r==="edit"?600:400,backgroundColor:r==="edit"?"var(--accent)":"var(--card)",color:r==="edit"?"white":"var(--muted-foreground)",transition:"all 0.15s ease"},children:"Edit"})]})]}),r==="edit"?e.jsx("div",{className:"prose max-w-none",children:e.jsx(hs,{editor:a})}):e.jsx("div",{children:s!=null&&s.synthesis?e.jsx(X,{content:s.synthesis}):e.jsxs("div",{className:"rounded-lg p-6 text-center",style:{backgroundColor:"var(--muted)",border:"1px dashed var(--border)"},children:[e.jsx("div",{className:"text-3xl mb-3",children:"🤖"}),e.jsx("p",{className:"text-sm font-medium",style:{color:"var(--foreground)"},children:"No synthesis yet"}),e.jsx("p",{className:"text-sm mt-1",style:{color:"var(--muted-foreground)"},children:"Generate one using the AI panel on the right, or switch to Edit mode to write manually."})]})})]})}function Ht({synthesisMode:s,onModeChange:r,selectedModel:t,onModelChange:a,models:n,isGenerating:m,onGenerate:g}){return e.jsxs("div",{className:"card p-3",style:{background:"linear-gradient(180deg, color-mix(in srgb, var(--accent) 4%, var(--card)), var(--card))",borderColor:"color-mix(in srgb, var(--accent) 20%, var(--border))"},children:[e.jsx("h3",{className:"text-[10px] font-semibold uppercase tracking-wider mb-2",style:{color:"var(--accent)"},children:"🤖 AI Synthesis"}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(Dt,{mode:s,onModeChange:r}),e.jsxs("div",{children:[e.jsx("label",{htmlFor:"model-select",className:"block text-xs font-medium text-muted-foreground mb-1",children:"Model"}),e.jsx("select",{id:"model-select",className:"w-full rounded-md px-2 py-1.5 text-xs",value:t,onChange:l=>a(l.target.value),style:{backgroundColor:"var(--card)",border:"1px solid var(--input)",color:"var(--foreground)"},children:n.map(l=>e.jsx("option",{value:l,children:l.split("/").pop()},l))})]}),e.jsx(L,{variant:"purple",size:"sm",loading:m,loadingText:"Generating…",onClick:g,className:"w-full font-semibold",children:"Generate Summary"})]})]})}function Re(s){return s?new Date(s).toLocaleString(void 0,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):""}function Ut({displayRound:s,synthesisVersions:r,selectedVersionId:t,onSelectVersion:a,selectedVersion:n,onActivateVersion:m,showCompare:g,onToggleCompare:l}){return s?e.jsxs("div",{className:"card p-3",children:[e.jsxs("h3",{className:"text-[10px] font-semibold uppercase tracking-wider mb-2",style:{color:"var(--muted-foreground)"},children:["Versions",e.jsxs("span",{className:"ml-1.5 font-normal normal-case tracking-normal",children:["· R",s.round_number]})]}),r.length===0?e.jsxs("p",{className:"text-sm",style:{color:"var(--muted-foreground)"},children:["No versions yet. Use ",e.jsx("strong",{children:"Generate Summary"})," above to create one."]}):e.jsxs("div",{className:"space-y-3",children:[e.jsx("div",{className:"flex flex-wrap gap-2",children:r.map(c=>{const d=c.id===t;return e.jsxs("button",{type:"button",onClick:()=>a(c.id),className:"relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",style:{backgroundColor:d?"color-mix(in srgb, var(--accent) 15%, var(--card))":"var(--muted)",color:d?"var(--accent)":"var(--muted-foreground)",border:d?"1.5px solid var(--accent)":"1.5px solid transparent",cursor:"pointer"},title:`v${c.version}${c.is_active?" (published)":""} — ${Re(c.created_at)}`,"aria-pressed":d,"aria-label":`Version ${c.version}${c.is_active?" (published)":""}`,children:["v",c.version,c.is_active&&e.jsx(me,{size:12,style:{color:"var(--success)"},"aria-hidden":"true"})]},c.id)})}),n&&e.jsxs("div",{className:"text-xs space-y-1.5 p-3 rounded-lg",style:{background:"var(--muted)",color:"var(--muted-foreground)"},children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("span",{className:"font-semibold",style:{color:"var(--foreground)"},children:["v",n.version]}),n.is_active?e.jsxs("span",{className:"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",style:{backgroundColor:"color-mix(in srgb, var(--success) 12%, transparent)",color:"var(--success)"},children:[e.jsx(me,{size:10})," Published"]}):e.jsx("span",{className:"inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium",style:{backgroundColor:"var(--card)",color:"var(--muted-foreground)"},children:"Draft"})]}),n.created_at&&e.jsx("div",{children:Re(n.created_at)}),e.jsxs("div",{children:[e.jsx("strong",{children:"Model:"})," ",n.model_used||"N/A"]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Strategy:"})," ",n.strategy||"N/A"]})]}),n&&!n.is_active&&e.jsxs(L,{variant:"success",size:"sm",onClick:()=>m(n.id),className:"w-full",children:["Publish v",n.version]}),r.length>=2&&l&&e.jsxs("button",{onClick:l,className:"w-full flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-colors",style:{backgroundColor:g?"color-mix(in srgb, var(--accent) 15%, var(--card))":"var(--card)",color:g?"var(--accent)":"var(--muted-foreground)",border:g?"1.5px solid var(--accent)":"1.5px solid var(--border)",cursor:"pointer"},children:[e.jsx(We,{size:14}),g?"Hide Comparison":"Compare Versions"]})]})]}):null}function Gt({selectedVersion:s,displayRound:r,resolvedExpertLabels:t,formId:a,token:n,currentUserEmail:m}){return s?e.jsxs(e.Fragment,{children:[s.synthesis&&e.jsxs("div",{className:"card p-4",children:[e.jsxs("div",{className:"flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-3",children:[e.jsxs("h2",{className:"text-base font-semibold text-foreground",children:["Synthesis v",s.version,s.is_active&&e.jsx("span",{className:"ml-2 text-xs font-normal px-2 py-0.5 rounded-full bg-success/10 text-success",children:"active"})]}),e.jsxs("span",{className:"text-xs text-muted-foreground",children:[s.model_used||""," · ",s.strategy||"",s.created_at&&` · ${new Date(s.created_at).toLocaleString()}`]})]}),e.jsx(X,{content:s.synthesis})]}),s.synthesis_json&&e.jsxs("div",{className:"card p-4",children:[e.jsxs("h2",{className:"text-base font-semibold mb-2 text-foreground",children:["Structured Analysis (v",s.version,")"]}),e.jsx(Pe,{data:s.synthesis_json,convergenceScore:(r==null?void 0:r.convergence_score)??void 0,expertLabels:t,formId:a,roundId:r==null?void 0:r.id,token:n,currentUserEmail:m})]})]}):null}function Ot({questions:s,onUpdateQuestion:r,onAddQuestion:t,onRemoveQuestion:a}){return e.jsxs("div",{className:"card p-4 sm:p-6",children:[e.jsxs("h2",{className:"text-lg font-semibold text-foreground flex items-center gap-2",children:[e.jsx("span",{children:"❓"})," Next Round Questions"]}),e.jsx("div",{className:"space-y-2 mt-3",children:s.map((n,m)=>e.jsxs("div",{className:"flex gap-2 items-center group",children:[e.jsx("span",{className:"text-xs font-medium shrink-0 w-6 h-6 flex items-center justify-center rounded-full",style:{backgroundColor:"var(--muted)",color:"var(--muted-foreground)"},children:m+1}),e.jsx("input",{type:"text",className:"flex-1 rounded-lg px-3 py-2 text-sm min-w-0",value:n,onChange:g=>r(m,g.target.value),placeholder:`Question ${m+1}`}),e.jsx(L,{variant:"secondary",size:"sm",onClick:()=>a(m),style:{opacity:.4,transition:"opacity 0.15s ease"},className:"group-hover:!opacity-100",children:"✕"})]},m))}),e.jsx(L,{variant:"secondary",size:"sm",onClick:t,className:"mt-3",children:"+ Add Question"})]})}function Qt({responsesOpen:s,onToggleResponses:r,onDownloadResponses:t,onSaveSynthesis:a,onStartNextRound:n,loading:m,formTitle:g,formId:l,rounds:c,structuredSynthesisData:d,expertLabels:f}){const[i,o]=p.useState(!1),[u,b]=p.useState(!1),k=p.useCallback(async()=>{o(!0);try{await a()}finally{o(!1)}},[a]),z=p.useCallback(async()=>{b(!0);try{await t()}finally{b(!1)}},[t]);return e.jsxs("div",{className:"card p-3",children:[e.jsx("h3",{className:"text-[10px] font-semibold uppercase tracking-wider mb-2",style:{color:"var(--muted-foreground)"},children:"Actions"}),e.jsxs("div",{className:"flex flex-col space-y-1.5",children:[e.jsx(L,{variant:"accent",size:"sm",onClick:r,className:"w-full text-left justify-start",children:s?"Hide Responses":"View Responses"}),e.jsx(L,{variant:"secondary",size:"sm",onClick:z,loading:u,loadingText:"Downloading…",className:"w-full text-left justify-start",children:"Download"}),e.jsx(L,{variant:"success",size:"sm",onClick:k,loading:i,loadingText:"Saving…",className:"w-full text-left justify-start",children:"Save Synthesis"}),e.jsx(yt,{formTitle:g,formId:l,rounds:c,structuredSynthesisData:d,expertLabels:f}),e.jsx("div",{className:"pt-1",children:e.jsx(L,{variant:"accent",size:"sm",onClick:n,loading:m,loadingText:"Starting…",className:"w-full font-semibold",style:{backgroundColor:"var(--accent-hover)"},children:"Next Round →"})})]})]})}const De='a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';function Wt({active:s,onEscape:r}){const t=p.useRef(null),a=p.useRef(null),n=p.useCallback(m=>{if(m.key==="Escape"){m.preventDefault(),r==null||r();return}if(m.key!=="Tab")return;const g=t.current;if(!g)return;const l=Array.from(g.querySelectorAll(De));if(l.length===0)return;const c=l[0],d=l[l.length-1];m.shiftKey?document.activeElement===c&&(m.preventDefault(),d.focus()):document.activeElement===d&&(m.preventDefault(),c.focus())},[r]);return p.useEffect(()=>{if(!s)return;a.current=document.activeElement;const m=setTimeout(()=>{const g=t.current;if(g){const l=g.querySelector(De);l==null||l.focus()}},50);return document.addEventListener("keydown",n),()=>{var g;clearTimeout(m),document.removeEventListener("keydown",n),(g=a.current)==null||g.focus()}},[s,n]),t}function Kt({open:s,onClose:r,structuredRounds:t,rounds:a,formQuestions:n,token:m,onResponseUpdated:g}){const l=Wt({active:s,onEscape:r});return s?gs.createPortal(e.jsx("div",{className:"fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4",style:{backgroundColor:"rgba(0,0,0,0.65)"},onClick:c=>{c.target===c.currentTarget&&r()},role:"dialog","aria-modal":"true","aria-label":"All Responses",children:e.jsxs("div",{ref:l,className:"card max-w-full sm:max-w-3xl w-full max-h-screen sm:max-h-[90vh] rounded-none sm:rounded-lg overflow-y-auto p-4 sm:p-6 text-left",style:{boxShadow:"0 25px 50px -12px rgba(0,0,0,0.25)"},children:[e.jsxs("div",{className:"flex items-center justify-between mb-4",children:[e.jsx("h3",{className:"text-xl font-semibold text-foreground",children:"All Responses"}),e.jsx("button",{onClick:r,className:"text-lg w-8 h-8 flex items-center justify-center rounded-lg transition-colors",style:{color:"var(--muted-foreground)",backgroundColor:"transparent",border:"none",cursor:"pointer"},onMouseEnter:c=>c.currentTarget.style.backgroundColor="var(--muted)",onMouseLeave:c=>c.currentTarget.style.backgroundColor="transparent","aria-label":"Close responses modal",children:"✕"})]}),t.length===0?e.jsx("p",{style:{color:"var(--muted-foreground)"},children:"No responses yet for this form."}):t.map(c=>{var f;const d=((f=a.find(i=>i.id===c.id))==null?void 0:f.questions)||n||[];return e.jsxs("div",{className:"mb-6 p-3 sm:p-4 rounded-lg",style:{backgroundColor:"var(--muted)",border:"1px solid var(--border)"},children:[e.jsxs("h4",{className:"text-lg font-semibold mb-3 text-foreground",children:["Round ",c.round_number]}),c.responses.length===0?e.jsx("p",{style:{color:"var(--muted-foreground)"},children:"No responses for this round."}):e.jsx("div",{className:"space-y-3",children:c.responses.map(i=>e.jsx(Ve,{response:i,questions:d,token:m,onUpdated:o=>g(c.id,o)},i.id))})]},c.id)}),e.jsx(L,{variant:"secondary",size:"md",onClick:r,className:"mt-6",children:"Close"})]})}),document.body):null}function Vt({structuredRounds:s,rounds:r,formQuestions:t,formId:a,token:n,onResponseUpdated:m}){const[g,l]=p.useState(new Set);function c(o){l(u=>{const b=new Set(u);return b.has(o)?b.delete(o):b.add(o),b})}function d(){l(new Set(s.map(o=>o.id)))}function f(){l(new Set)}if(s.length===0)return e.jsxs("div",{className:"card p-4 sm:p-6",children:[e.jsxs("h2",{className:"text-lg font-semibold mb-3 text-foreground flex items-center gap-2",children:[e.jsx(Ae,{size:18}),"Expert Responses"]}),e.jsx("p",{style:{color:"var(--muted-foreground)"},children:"No responses yet for this form."})]});const i=g.size===s.length;return e.jsxs("div",{className:"card p-4 sm:p-6",children:[e.jsxs("div",{className:"flex items-center justify-between mb-4",children:[e.jsxs("h2",{className:"text-lg font-semibold text-foreground flex items-center gap-2",children:[e.jsx(Ae,{size:18}),"Expert Responses"]}),e.jsx("button",{onClick:i?f:d,className:"text-xs font-medium px-3 py-1.5 rounded-md transition-colors",style:{color:"var(--accent)",backgroundColor:"color-mix(in srgb, var(--accent) 10%, transparent)",border:"none",cursor:"pointer"},children:i?"Collapse All":"Expand All"})]}),e.jsx("div",{className:"space-y-2",children:s.map(o=>{var z;const u=g.has(o.id),b=((z=r.find($=>$.id===o.id))==null?void 0:z.questions)||t||[],k=o.responses.length;return e.jsxs("div",{className:"rounded-lg overflow-hidden transition-all",style:{border:"1px solid var(--border)",backgroundColor:u?"var(--card)":"var(--muted)"},children:[e.jsxs("button",{onClick:()=>c(o.id),className:"w-full flex items-center justify-between p-3 sm:p-4 text-left transition-colors",style:{background:"none",border:"none",cursor:"pointer",fontFamily:"var(--font-family)"},"aria-expanded":u,"aria-controls":`responses-round-${o.id}`,children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("span",{className:"flex items-center justify-center w-6 h-6 rounded-md transition-transform",style:{backgroundColor:"color-mix(in srgb, var(--accent) 12%, transparent)",color:"var(--accent)"},children:u?e.jsx(ce,{size:14}):e.jsx(Ys,{size:14})}),e.jsxs("span",{className:"font-semibold text-sm",style:{color:"var(--foreground)"},children:["Round ",o.round_number]})]}),e.jsx("div",{className:"flex items-center gap-2",children:e.jsxs("span",{className:"flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",style:{backgroundColor:k>0?"color-mix(in srgb, var(--accent) 10%, transparent)":"var(--muted)",color:k>0?"var(--accent)":"var(--muted-foreground)"},children:[e.jsx(Zs,{size:11}),k," response",k!==1?"s":""]})})]}),u&&e.jsxs("div",{id:`responses-round-${o.id}`,className:"px-3 sm:px-4 pb-3 sm:pb-4 space-y-3 slide-down",role:"region","aria-label":`Responses for Round ${o.round_number}`,style:{borderTop:"1px solid var(--border)"},children:[b.length>0&&e.jsxs("div",{className:"pt-3 pb-1",children:[e.jsx("h4",{className:"text-xs font-semibold uppercase tracking-wider mb-2",style:{color:"var(--muted-foreground)"},children:"Questions"}),e.jsx("ol",{className:"list-decimal list-inside space-y-1",children:b.map(($,F)=>e.jsx("li",{className:"text-sm",style:{color:"var(--foreground)"},children:W($)},F))})]}),k===0?e.jsx("p",{className:"text-sm py-2",style:{color:"var(--muted-foreground)"},children:"No responses for this round yet."}):e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"space-y-3 pt-2",children:o.responses.map($=>e.jsx(Ve,{response:$,questions:b,token:n,onUpdated:F=>m(o.id,F)},$.id))}),e.jsx("div",{className:"pt-3",children:e.jsx(qt,{formId:a,roundId:o.id,responses:o.responses.map($=>({id:$.id,email:$.email,answers:$.answers})),questions:b})})]})]})]},o.id)})})]})}function Jt({rounds:s,selectedRoundId:r,onSelectRound:t}){return s.length===0?null:e.jsxs("div",{className:"card p-3",children:[e.jsx("h3",{className:"text-[10px] font-semibold uppercase tracking-wider mb-2",style:{color:"var(--muted-foreground)"},children:"Rounds"}),e.jsx("ul",{className:"text-xs space-y-0.5",children:s.map(a=>e.jsxs("li",{className:`flex justify-between items-center border-b border-border last:border-b-0 py-1 cursor-pointer hover:bg-muted/50 rounded px-1 ${r===a.id?"bg-accent/10":""}`,onClick:()=>t(a),children:[e.jsxs("span",{className:"text-foreground text-xs",children:["R",a.round_number," ",a.is_active&&e.jsx("span",{className:"text-success font-semibold text-[10px]",children:"(live)"})]}),e.jsx("span",{className:`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${a.synthesis?"bg-success/10 text-success":"bg-muted text-muted-foreground"}`,children:a.synthesis?"✓":"—"})]},a.id))})]})}function Xt(){return e.jsxs("div",{className:"min-h-screen bg-background text-foreground font-sans flex flex-col",children:[e.jsx("header",{className:"border-b sticky top-0 z-40",style:{backgroundColor:"var(--card)",borderColor:"var(--border)",boxShadow:"0 1px 3px 0 rgba(0,0,0,0.04)"},children:e.jsxs("div",{className:"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx(U,{variant:"avatar",width:"2rem",height:"2rem"}),e.jsxs("div",{children:[e.jsx(U,{variant:"text",width:"10rem",height:"1.25rem"}),e.jsx(U,{variant:"text",width:"8rem",height:"0.875rem",style:{marginTop:"0.25rem"}})]})]}),e.jsx(U,{variant:"button",width:"5rem",height:"2rem"})]})}),e.jsxs("main",{className:"flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6",children:[e.jsx(U,{variant:"text",width:"10rem",style:{marginBottom:"1.5rem"}}),e.jsxs("div",{className:"mb-6 flex gap-4",children:[e.jsx(U,{variant:"avatar",width:"3rem",height:"3rem"}),e.jsx(U,{variant:"avatar",width:"3rem",height:"3rem"}),e.jsx(U,{variant:"avatar",width:"3rem",height:"3rem"})]}),e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-3 gap-6",children:[e.jsxs("div",{className:"lg:col-span-2 space-y-6",children:[e.jsx(se,{}),e.jsx(se,{})]}),e.jsxs("div",{className:"lg:col-span-1 space-y-6",children:[e.jsx(se,{}),e.jsx(se,{}),e.jsx(se,{})]})]})]})]})}function Yt(s){return s?new Date(s).toLocaleString(void 0,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):""}function Zt({versions:s,currentVersionId:r,onClose:t}){var o;const a=p.useMemo(()=>[...s].sort((u,b)=>u.version-b.version),[s]),n=a.length>=2?a[a.length-2].id:((o=a[0])==null?void 0:o.id)??null,m=r??(a.length>=1?a[a.length-1].id:null),[g,l]=p.useState(n),[c,d]=p.useState(m),f=s.find(u=>u.id===g)??null,i=s.find(u=>u.id===c)??null;return s.length<2?null:e.jsxs("div",{className:"card p-4 sm:p-6",children:[e.jsxs("div",{className:"flex items-center justify-between mb-4",children:[e.jsxs("h2",{className:"text-lg font-semibold text-foreground flex items-center gap-2",children:[e.jsx(We,{size:20,style:{color:"var(--accent)"}}),"Compare Versions"]}),e.jsx("button",{onClick:t,className:"p-1.5 rounded-lg transition-colors",style:{background:"none",border:"none",color:"var(--muted-foreground)",cursor:"pointer"},title:"Close comparison","aria-label":"Close version comparison",children:e.jsx(ge,{size:18,"aria-hidden":"true"})})]}),e.jsxs("div",{className:"flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4",children:[e.jsx(Fe,{label:"Left",versions:a,value:g,onChange:l,excludeId:c}),e.jsx("span",{className:"hidden sm:flex items-center justify-center text-xs font-bold px-2",style:{color:"var(--muted-foreground)"},children:"vs"}),e.jsx(Fe,{label:"Right",versions:a,value:c,onChange:d,excludeId:g})]}),f&&i&&e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-2 gap-4",children:[e.jsx(Ie,{version:f}),e.jsx(Ie,{version:i})]}),(f==null?void 0:f.synthesis_json)&&(i==null?void 0:i.synthesis_json)&&e.jsx("div",{className:"mt-4",children:e.jsx(er,{left:f.synthesis_json,right:i.synthesis_json,leftVersion:f.version,rightVersion:i.version})})]})}function Fe({label:s,versions:r,value:t,onChange:a,excludeId:n}){return e.jsxs("div",{className:"flex-1",children:[e.jsx("label",{className:"text-xs font-medium mb-1 block",style:{color:"var(--muted-foreground)"},children:s}),e.jsxs("div",{className:"relative",children:[e.jsx("select",{value:t??"",onChange:m=>a(Number(m.target.value)),className:"w-full text-sm rounded-lg px-3 py-2 appearance-none pr-8",style:{backgroundColor:"var(--muted)",color:"var(--foreground)",border:"1px solid var(--border)",cursor:"pointer"},children:r.map(m=>e.jsxs("option",{value:m.id,disabled:m.id===n,children:["v",m.version,m.is_active?" (published)":"",m.model_used?` — ${m.model_used.split("/").pop()}`:"",m.created_at?` · ${Yt(m.created_at)}`:""]},m.id))}),e.jsx(ce,{size:14,className:"absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none",style:{color:"var(--muted-foreground)"}})]})]})}function Ie({version:s}){var t;const r=s.synthesis_json;return e.jsxs("div",{className:"rounded-lg p-4 overflow-auto max-h-[60vh]",style:{backgroundColor:"var(--muted)",border:"1px solid var(--border)"},children:[e.jsxs("div",{className:"flex items-center gap-2 mb-3",children:[e.jsxs("span",{className:"text-xs font-semibold px-2 py-0.5 rounded-full",style:{backgroundColor:s.is_active?"color-mix(in srgb, var(--success) 12%, transparent)":"var(--card)",color:s.is_active?"var(--success)":"var(--muted-foreground)"},children:["v",s.version,s.is_active?" · Published":" · Draft"]}),e.jsxs("span",{className:"text-xs",style:{color:"var(--muted-foreground)"},children:[(t=s.model_used)==null?void 0:t.split("/").pop()," · ",s.strategy]})]}),(r==null?void 0:r.narrative)&&e.jsxs("div",{className:"mb-3",children:[e.jsx("h4",{className:"text-xs font-semibold uppercase tracking-wider mb-1",style:{color:"var(--muted-foreground)"},children:"Narrative"}),e.jsx("div",{className:"text-sm prose prose-sm max-w-none",style:{color:"var(--foreground)"},children:e.jsx(X,{content:r.narrative})})]}),(r==null?void 0:r.agreements)&&e.jsxs("div",{className:"mb-2",children:[e.jsxs("h4",{className:"text-xs font-semibold uppercase tracking-wider mb-1",style:{color:"var(--muted-foreground)"},children:["Agreements (",r.agreements.length,")"]}),e.jsx("ul",{className:"space-y-1",children:r.agreements.map((a,n)=>e.jsxs("li",{className:"text-xs",style:{color:"var(--foreground)"},children:["• ",String(a.claim||"")]},n))})]}),(r==null?void 0:r.disagreements)&&r.disagreements.length>0&&e.jsxs("div",{className:"mb-2",children:[e.jsxs("h4",{className:"text-xs font-semibold uppercase tracking-wider mb-1",style:{color:"var(--muted-foreground)"},children:["Disagreements (",r.disagreements.length,")"]}),e.jsx("ul",{className:"space-y-1",children:r.disagreements.map((a,n)=>e.jsxs("li",{className:"text-xs",style:{color:"var(--foreground)"},children:["• ",String(a.topic||"")]},n))})]}),!r&&s.synthesis&&e.jsx("div",{className:"text-sm prose prose-sm max-w-none",style:{color:"var(--foreground)"},children:e.jsx(X,{content:s.synthesis})}),!r&&!s.synthesis&&e.jsx("p",{className:"text-sm",style:{color:"var(--muted-foreground)"},children:"No synthesis content"})]})}function er({left:s,right:r,leftVersion:t,rightVersion:a}){var u,b,k,z,$,F,_,h;const n=((u=s.agreements)==null?void 0:u.length)??0,m=((b=r.agreements)==null?void 0:b.length)??0,g=((k=s.disagreements)==null?void 0:k.length)??0,l=((z=r.disagreements)==null?void 0:z.length)??0,c=(($=s.nuances)==null?void 0:$.length)??0,d=((F=r.nuances)==null?void 0:F.length)??0,f=((_=s.emergent_insights)==null?void 0:_.length)??0,i=((h=r.emergent_insights)==null?void 0:h.length)??0,o=[{label:"Agreements",l:n,r:m},{label:"Disagreements",l:g,r:l},{label:"Nuances",l:c,r:d},{label:"Emergent Insights",l:f,r:i}];return e.jsxs("div",{className:"rounded-lg p-3 text-xs",style:{backgroundColor:"var(--muted)",border:"1px solid var(--border)"},children:[e.jsx("h4",{className:"font-semibold uppercase tracking-wider mb-2",style:{color:"var(--muted-foreground)"},children:"Stats Comparison"}),e.jsxs("div",{className:"grid grid-cols-3 gap-x-4 gap-y-1",children:[e.jsx("div",{className:"font-medium",style:{color:"var(--muted-foreground)"}}),e.jsxs("div",{className:"text-center font-medium",style:{color:"var(--accent)"},children:["v",t]}),e.jsxs("div",{className:"text-center font-medium",style:{color:"var(--accent)"},children:["v",a]}),o.map(j=>e.jsxs(p.Fragment,{children:[e.jsx("div",{style:{color:"var(--foreground)"},children:j.label}),e.jsx("div",{className:"text-center",style:{color:"var(--foreground)"},children:j.l}),e.jsxs("div",{className:"text-center",style:{color:j.r!==j.l?"var(--warning, #f59e0b)":"var(--foreground)"},children:[j.r,j.r!==j.l&&e.jsxs("span",{className:"ml-1 text-[10px]",children:["(",j.r>j.l?"+":"",j.r-j.l,")"]})]})]},j.label))]})]})}function Me(s){return s?new Date(s).toLocaleString(void 0,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):"Unknown"}function sr(s){if(!s)return"";const r=Date.now()-new Date(s).getTime(),t=Math.floor(r/6e4);if(t<1)return"just now";if(t<60)return`${t}m ago`;const a=Math.floor(t/60);return a<24?`${a}h ago`:`${Math.floor(a/24)}d ago`}function tr(s){if(!s)return"Unknown";const r=s.split("/");return r[r.length-1]||s}function rr(s){return s?{single:"Single Analyst",ensemble:"Ensemble",structured:"Structured"}[s]||s:""}function nr({versions:s,selectedVersionId:r,onSelectVersion:t}){const[a,n]=p.useState(!1);if(s.length===0)return null;const m=[...s].sort((d,f)=>f.version-d.version),g=a?m.length:Math.min(3,m.length),l=m.slice(0,g),c=m.length>3;return e.jsxs("div",{className:"card p-3",children:[e.jsxs("div",{className:"flex items-center justify-between mb-2",children:[e.jsxs("h3",{className:"text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5",style:{color:"var(--muted-foreground)"},children:[e.jsx(Ge,{size:11,style:{color:"var(--accent)"}}),"History"]}),e.jsx("span",{className:"text-[10px] px-1.5 py-0.5 rounded-full",style:{backgroundColor:"var(--muted)",color:"var(--muted-foreground)"},children:s.length})]}),e.jsxs("div",{className:"relative pl-6",children:[e.jsx("div",{className:"absolute left-[9px] top-2 bottom-2 w-[2px]",style:{backgroundColor:"var(--border)"}}),e.jsx("div",{className:"space-y-0",children:l.map((d,f)=>{const i=d.id===r,o=f===0;return e.jsxs("button",{type:"button",onClick:()=>t(d.id),className:"relative w-full text-left group transition-all","aria-pressed":i,"aria-label":`Version ${d.version}${d.is_active?" (published)":""} — ${Me(d.created_at)}`,style:{padding:"0.625rem 0.75rem 0.625rem 1.25rem",background:"none",border:"none",cursor:"pointer",borderRadius:"var(--radius)",fontFamily:"var(--font-family)"},onMouseEnter:u=>{u.currentTarget.style.backgroundColor="color-mix(in srgb, var(--accent) 5%, transparent)"},onMouseLeave:u=>{u.currentTarget.style.backgroundColor=i?"color-mix(in srgb, var(--accent) 8%, transparent)":"transparent"},children:[e.jsx("div",{className:"absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center",style:{left:"-14.5px"},children:e.jsx("div",{className:"rounded-full transition-all",style:{width:i||d.is_active?"14px":"10px",height:i||d.is_active?"14px":"10px",backgroundColor:d.is_active?"var(--success)":i?"var(--accent)":"var(--muted-foreground)",border:`2px solid ${d.is_active?"color-mix(in srgb, var(--success) 30%, transparent)":i?"color-mix(in srgb, var(--accent) 30%, transparent)":"var(--card)"}`,boxShadow:d.is_active||i?`0 0 0 3px ${d.is_active?"color-mix(in srgb, var(--success) 15%, transparent)":"color-mix(in srgb, var(--accent) 15%, transparent)"}`:"none"}})}),e.jsxs("div",{className:"flex items-start justify-between gap-2",children:[e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-0.5",children:[e.jsxs("span",{className:"text-sm font-semibold",style:{color:i?"var(--accent)":"var(--foreground)"},children:["v",d.version]}),d.is_active&&e.jsxs("span",{className:"inline-flex items-center gap-0.5 px-1.5 py-0 rounded-full text-[10px] font-semibold",style:{backgroundColor:"color-mix(in srgb, var(--success) 12%, transparent)",color:"var(--success)"},children:[e.jsx(me,{size:9})," Published"]}),o&&!d.is_active&&e.jsx("span",{className:"inline-flex items-center gap-0.5 px-1.5 py-0 rounded-full text-[10px] font-medium",style:{backgroundColor:"color-mix(in srgb, var(--accent) 10%, transparent)",color:"var(--accent)"},children:"Latest"})]}),e.jsxs("div",{className:"flex items-center gap-3 text-[11px]",style:{color:"var(--muted-foreground)"},children:[d.model_used&&e.jsxs("span",{className:"inline-flex items-center gap-1",children:[e.jsx(et,{size:10}),tr(d.model_used)]}),d.strategy&&e.jsxs("span",{className:"inline-flex items-center gap-1",children:[e.jsx(Qe,{size:10}),rr(d.strategy)]}),d.synthesis_json&&e.jsxs("span",{className:"inline-flex items-center gap-1",children:[e.jsx(st,{size:10}),"Structured"]})]})]}),e.jsxs("div",{className:"flex-shrink-0 text-right",style:{minWidth:"5rem"},children:[e.jsx("div",{className:"text-[11px] font-medium",style:{color:"var(--muted-foreground)"},children:sr(d.created_at)}),e.jsx("div",{className:"text-[10px]",style:{color:"var(--muted-foreground)",opacity:.7},children:Me(d.created_at)})]})]})]},d.id)})})]}),c&&e.jsx("button",{onClick:()=>n(d=>!d),className:"w-full flex items-center justify-center gap-1.5 text-xs font-medium mt-3 py-1.5 rounded-md transition-colors",style:{backgroundColor:"var(--muted)",color:"var(--muted-foreground)",border:"none",cursor:"pointer"},children:a?e.jsxs(e.Fragment,{children:[e.jsx(tt,{size:12}),"Show Less"]}):e.jsxs(e.Fragment,{children:[e.jsx(ce,{size:12}),"Show ",m.length-3," More"]})})]})}class G extends p.Component{constructor(r){super(r),this.state={hasError:!1,error:null}}static getDerivedStateFromError(r){return{hasError:!0,error:r}}componentDidCatch(r,t){console.error("[SectionErrorBoundary]",r,t)}render(){var r;return this.state.hasError?e.jsx("div",{className:"card p-4",style:{borderColor:"var(--destructive)",borderWidth:"1px"},children:e.jsxs("div",{className:"text-center py-4",children:[e.jsx("div",{className:"text-2xl mb-2",children:"⚠️"}),e.jsx("h3",{className:"text-sm font-semibold mb-1",style:{color:"var(--foreground)"},children:this.props.fallbackTitle||"This section encountered an error"}),e.jsx("p",{className:"text-xs mb-3",style:{color:"var(--muted-foreground)"},children:((r=this.state.error)==null?void 0:r.message)||"An unexpected error occurred"}),e.jsx("button",{onClick:()=>{var t,a;this.setState({hasError:!1,error:null}),(a=(t=this.props).onReset)==null||a.call(t)},className:"text-xs font-medium px-3 py-1.5 rounded-lg transition-colors",style:{backgroundColor:"var(--muted)",color:"var(--foreground)",border:"1px solid var(--border)",cursor:"pointer"},children:"Try Again"})]})}):this.props.children}}const or=["anthropic/claude-opus-4-6","anthropic/claude-sonnet-4","openai/gpt-4o","google/gemini-2.0-flash"];function Le(s){if(typeof s=="string")return s;if(s&&typeof s=="object"){const r=s;return String(r.text||r.label||r.question||"")}return""}function jr(){Ns("Synthesis Summary");const s=qe(),{id:r}=xs(),t=Number(r),{toastError:a,toastWarning:n,toastSuccess:m}=_s(),{token:g,logout:l}=Cs(),c=g??"",[d,f]=p.useState(""),[i,o]=p.useState(null),[u,b]=p.useState([]),[k,z]=p.useState(null),[$,F]=p.useState(!1),[_,h]=p.useState(null),[j,C]=p.useState(!1),[A,N]=p.useState([]),[y,S]=p.useState(null),[q,B]=p.useState("preparing"),[Je,O]=p.useState(0),[Xe]=p.useState(5),[xe,Ye]=p.useState("simple"),[Ze,he]=p.useState("view"),[de,es]=p.useState("anthropic/claude-opus-4-6"),[ve,fe]=p.useState(!1),[Q,be]=p.useState([]),[Y,ne]=p.useState(null),[ye,je]=p.useState(!1),[ke,Z]=p.useState([]),[ar,ue]=p.useState(!1),[V,Ne]=p.useState(()=>typeof window<"u"&&window.innerWidth>=768),ss=p.useCallback(x=>{x.type==="synthesis_complete"&&x.form_id===t&&J().then(()=>{x.round_id&&typeof x.round_id=="number"&&ee(x.round_id)})},[t]),{viewers:ts}=As({formId:t||null,page:"summary",userEmail:d,onMessage:ss}),P=vs({extensions:[fs,bs,ys.configure({placeholder:"Write the synthesis for this round…"})],content:"",editorProps:{attributes:{class:"prose prose-sm max-w-none focus:outline-none"}}}),R=y||k,D=(R==null?void 0:R.synthesis_json)||null,H=p.useMemo(()=>{if(!D)return{};const x={},v=new Set;for(const w of D.agreements||[])for(const T of w.supporting_experts||[])v.add(T);for(const w of D.disagreements||[])for(const T of w.positions||[])for(const I of T.experts||[])v.add(I);for(const w of v)x[w]=`Expert ${w}`;return x},[D]),we=p.useMemo(()=>Q.find(x=>x.id===Y)||null,[Q,Y]);p.useEffect(()=>{c&&Ss().then(x=>f((x==null?void 0:x.email)||"")).catch(()=>{const x=localStorage.getItem("email");x&&f(x)})},[c]),p.useEffect(()=>{if(!c||!t)return;let x=!1;return J().then(()=>{if(!x)return oe()}).catch(()=>{}),()=>{x=!0}},[c,t,P]);async function J(){var x;F(!0),h(null);try{const v=await $s(t);if(!v)throw new Error("Form not found");o(v);let w;try{w=await Ts(t)}catch{w=[]}const T=(Array.isArray(w)?w:[]).map(M=>({id:M.id,round_number:M.round_number,synthesis:M.synthesis||"",synthesis_json:M.synthesis_json||null,is_active:!!M.is_active,questions:Array.isArray(M.questions)?M.questions:[],convergence_score:M.convergence_score??null,response_count:M.response_count??0}));b(T);const I=T.find(M=>M.is_active)||null;if(z(I),I&&!y&&(S(I),ee(I.id).catch(()=>{})),I&&P){P.commands.setContent(I.synthesis||""),ue(!!(I.synthesis&&I.synthesis.trim().length>0));const M=(x=I.questions)!=null&&x.length?I.questions:Array.isArray(v.questions)?v.questions:[];Z((M||[]).map(Le))}else v&&Array.isArray(v.questions)&&Z(v.questions.map(Le))}catch(v){h(v.message||"Failed to load consultation data")}finally{F(!1)}}async function oe(){try{const x=await Rs(t);Array.isArray(x)&&N(x.map(v=>({id:v.id,round_number:v.round_number,synthesis:v.synthesis||"",is_active:!!v.is_active,responses:(v.responses||[]).map(w=>({id:w.id,answers:typeof w.answers=="string"?JSON.parse(w.answers):w.answers||{},email:w.email||null,timestamp:w.timestamp,version:w.version??1,round_id:v.id}))})))}catch{}}async function ee(x){try{const v=await it(t,x);be(v);const w=v.find(T=>T.is_active);ne((w==null?void 0:w.id)||(v.length>0?v[v.length-1].id:null))}catch{be([]),ne(null)}}function rs(){l(),s("/")}async function ns(){if(j){C(!1);return}await oe(),C(!0)}async function os(){if(!k||!t)return;const x=(P==null?void 0:P.getHTML())||"";try{await dt(t,x),ue(!0),m("Synthesis saved")}catch(v){a(v.message||"Failed to save synthesis")}}async function as(){if(!t)return;const x=ke.map(v=>v.trim()).filter(v=>v.length>0);if(!x.length){n("Add at least one question for the next round.");return}F(!0);try{await Ds(t,{questions:x}),await J(),await oe(),ue(!1),S(null)}catch(v){a(v.message||"Failed to start next round")}finally{F(!1)}}async function is(){try{const x=await Fs(t,!0);if(!Array.isArray(x)||x.length===0){n("No responses to download");return}const v=x.flatMap((I,M)=>{const ds=new ae({children:[new Se({text:`Response ${M+1}`,bold:!0})],spacing:{after:200}}),us=Object.entries(I.answers).flatMap(([ms,ps])=>[new ae({children:[new Se({text:ms,bold:!0})],spacing:{after:80}}),new ae({text:String(ps??""),spacing:{after:160}})]);return[ds,...us,new ae("")]}),w=new js({sections:[{children:v}]}),T=await ks.toBlob(w);te.saveAs(T,"responses.docx")}catch(x){a(x.message||"Failed to download responses")}}async function ls(){const x=y||k;if(!(!t||!de||!x)){fe(!0),B("preparing"),O(0);try{B("analyzing"),O(1);const v=await ct(t,x.id,{model:de,strategy:xe,n_analysts:3,mode:"human_only"});B("synthesising"),O(3),B("formatting"),O(4);const w=v.synthesis||v.summary||"";if(w&&P&&P.commands.setContent(w),v.synthesis_json&&x){const T={...x,synthesis:w,synthesis_json:v.synthesis_json};b(I=>I.map(M=>M.id===x.id?T:M)),(k==null?void 0:k.id)===x.id&&z(T),(y==null?void 0:y.id)===x.id&&S(T)}he("view"),await J(),x&&await ee(x.id),B("complete"),O(5),setTimeout(()=>{B("preparing"),O(0)},2e3)}catch(v){a(v.message||"Failed to generate synthesis"),B("preparing"),O(0)}finally{fe(!1)}}}async function cs(x){try{await lt(x),R&&await ee(R.id),await J()}catch(v){a(v.message||"Failed to activate version")}}function _e(x){try{S(x),x.is_active&&P&&P.commands.setContent(x.synthesis||""),ee(x.id).catch(v=>{console.error("[handleSelectRound] Failed to load synthesis versions:",v),a("Failed to load synthesis versions for this round")})}catch(v){console.error("[handleSelectRound] Error selecting round:",v),a("Failed to switch to the selected round")}}function Ce(x,v){N(w=>w.map(T=>T.id===x?{...T,responses:T.responses.map(I=>I.id===v.id?{...I,answers:v.answers,version:v.version}:I)}:T))}return _&&!i?e.jsx("div",{className:"min-h-screen bg-background text-foreground flex items-center justify-center",children:e.jsxs("div",{className:"text-center max-w-md mx-auto px-4",children:[e.jsx("div",{className:"text-4xl mb-4",children:"⚠️"}),e.jsx("h2",{className:"text-xl font-semibold mb-2",style:{color:"var(--foreground)"},children:"Failed to Load"}),e.jsx("p",{className:"text-sm mb-6",style:{color:"var(--muted-foreground)"},children:_}),e.jsxs("div",{className:"flex gap-3 justify-center",children:[e.jsx(L,{variant:"accent",size:"md",onClick:()=>{J(),oe()},children:"Retry"}),e.jsx(L,{variant:"secondary",size:"md",onClick:()=>s("/"),children:"Back to Dashboard"})]})]})}):i?e.jsxs("div",{className:"min-h-screen bg-background text-foreground font-sans flex flex-col",children:[e.jsx("a",{href:"#main-content",className:"skip-to-main",children:"Skip to main content"}),e.jsx(Pt,{email:d,viewers:ts,onLogout:rs}),e.jsxs("main",{id:"main-content",className:"flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6",tabIndex:-1,children:[e.jsxs("div",{className:"mb-4 flex items-center justify-between",children:[e.jsx("button",{onClick:()=>s("/"),className:"text-sm font-medium transition-colors",style:{color:"var(--muted-foreground)",background:"none",border:"none",cursor:"pointer"},onMouseEnter:x=>x.currentTarget.style.color="var(--accent)",onMouseLeave:x=>x.currentTarget.style.color="var(--muted-foreground)",children:"← Back to Dashboard"}),e.jsx("h2",{className:"text-sm font-medium truncate max-w-[50vw] sm:max-w-none",style:{color:"var(--muted-foreground)"},children:i.title})]}),u.length>0&&e.jsx("div",{className:"mb-4 sm:mb-6 overflow-x-auto",children:e.jsx(St,{rounds:u,activeRoundId:(k==null?void 0:k.id)||null,selectedRoundId:(y==null?void 0:y.id)||null,onSelectRound:_e})}),e.jsx(wt,{stage:q,step:Je,totalSteps:Xe,visible:ve}),e.jsxs("button",{onClick:()=>Ne(x=>!x),className:"summary-sidebar-toggle fixed z-50 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium shadow-lg transition-all min-h-[44px]","data-open":V?"true":"false",style:{top:"4.75rem",background:"var(--card)",border:"1px solid var(--border)",color:"var(--foreground)"},title:V?"Hide panel":"Show panel",children:[V?e.jsx(ge,{size:15}):e.jsx(rt,{size:15}),e.jsx("span",{className:"hidden sm:inline",children:V?"Hide":"Controls"})]}),e.jsxs("div",{className:"space-y-4 sm:space-y-6",children:[y&&!y.is_active&&e.jsx(G,{fallbackTitle:"Failed to render round details",children:e.jsx(Ls,{round:y,isCurrentRound:!1,expertLabels:H,formId:t,token:c,currentUserEmail:d})}),e.jsx(Vt,{structuredRounds:A,rounds:u,formQuestions:i.questions||[],formId:t,token:c,onResponseUpdated:Ce}),(!y||y.is_active)&&e.jsx(Bt,{activeRound:k,synthesisViewMode:Ze,onSetViewMode:he,editor:P}),y&&!y.is_active&&y.synthesis&&e.jsxs("div",{className:"card p-4",children:[e.jsxs("h2",{className:"text-base font-semibold mb-2 text-foreground",children:["Synthesis (Round ",y.round_number,")"]}),e.jsx(X,{content:y.synthesis})]}),D&&e.jsx(G,{fallbackTitle:"Failed to render structured analysis",children:e.jsxs("div",{className:"card p-4",children:[e.jsx("div",{className:"flex items-start justify-between gap-4 mb-3 flex-wrap",children:e.jsxs("h2",{className:"text-base font-semibold text-foreground flex items-center gap-2",children:[e.jsx(nt,{size:20,style:{color:"var(--accent)"}})," Structured Analysis"]})}),R&&e.jsx("div",{className:"mb-4",children:e.jsx(Lt,{formId:t,roundId:R.id,synthesisText:(()=>{const x=[];D.narrative&&x.push(D.narrative);for(const v of D.agreements||[])x.push(`Agreement: ${v.claim} — ${v.evidence_summary}`);for(const v of D.disagreements||[]){x.push(`Disagreement: ${v.topic}`);for(const w of v.positions||[])x.push(`  - ${w.position}: ${w.evidence}`)}for(const v of D.nuances||[])x.push(`Nuance: ${v.claim} — ${v.context}`);return x.join(`
`)})()})}),e.jsx(Pe,{data:D,convergenceScore:(R==null?void 0:R.convergence_score)??void 0,expertLabels:H,formId:t,roundId:R==null?void 0:R.id,token:c,currentUserEmail:d})]})}),R&&D&&e.jsx(G,{fallbackTitle:"Failed to render AI counterpoints",children:e.jsx(It,{formId:t,roundId:R.id})}),D&&e.jsx(G,{fallbackTitle:"Failed to render cross-analysis",children:e.jsxs("div",{className:"card p-4",children:[e.jsxs("h2",{className:"text-base font-semibold mb-2 text-foreground flex items-center gap-2",children:[e.jsx(ot,{size:20,style:{color:"var(--accent)"}})," Expert Cross-Analysis"]}),e.jsx(qs,{structuredData:D,resolvedExpertLabels:H,expertLabelPreset:"default"})]})}),D&&e.jsx(G,{fallbackTitle:"Failed to render consensus heatmap",children:e.jsxs("div",{className:"card p-4",children:[e.jsxs("h2",{className:"text-base font-semibold mb-2 text-foreground flex items-center gap-2",children:[e.jsx(at,{size:20,style:{color:"var(--accent)"}})," Consensus Heatmap"]}),e.jsx(Ps,{structuredData:D,resolvedExpertLabels:H,questions:R==null?void 0:R.questions})]})}),e.jsx(G,{fallbackTitle:"Failed to render version content",children:e.jsx(Gt,{selectedVersion:we,displayRound:R,resolvedExpertLabels:H,formId:t,token:c,currentUserEmail:d})}),ye&&Q.length>=2&&e.jsx(G,{fallbackTitle:"Failed to render version comparison",children:e.jsx(Zt,{versions:Q,currentVersionId:Y,onClose:()=>je(!1)})}),(D==null?void 0:D.emergent_insights)&&D.emergent_insights.length>0&&e.jsx(G,{fallbackTitle:"Failed to render emergent insights",children:e.jsxs("div",{className:"card p-4",children:[e.jsxs("h2",{className:"text-base font-semibold mb-2 text-foreground flex items-center gap-2",children:[e.jsx(re,{size:20,style:{color:"var(--accent)"}})," Emergent Insights"]}),e.jsx(At,{insights:D.emergent_insights??[],expertLabels:H,formId:t,roundId:R==null?void 0:R.id,token:c,currentUserEmail:d})]})}),e.jsx(Ot,{questions:ke,onUpdateQuestion:(x,v)=>Z(w=>{const T=[...w];return T[x]=v,T}),onAddQuestion:()=>Z(x=>[...x,""]),onRemoveQuestion:x=>Z(v=>v.filter((w,T)=>T!==x))})]}),V&&e.jsx("div",{className:"fixed inset-0 z-30 bg-black/30 md:hidden",onClick:()=>Ne(!1),"aria-hidden":"true"}),e.jsxs("aside",{role:"complementary","aria-label":"Synthesis controls",className:"summary-sidebar",style:{position:"fixed",right:0,top:"4.5rem",height:"calc(100vh - 4.5rem)",overflowY:"auto",zIndex:40,borderLeft:"1px solid var(--border)",background:"var(--background)",transform:V?"translateX(0)":"translateX(100%)",transition:"transform 0.2s ease",padding:"0.75rem",display:"flex",flexDirection:"column",gap:"0.5rem"},children:[e.jsxs("div",{className:"flex items-center justify-between px-1 py-1",style:{borderBottom:"1px solid var(--border)",paddingBottom:"0.5rem"},children:[e.jsx("span",{className:"text-xs font-medium truncate",style:{color:"var(--foreground)",maxWidth:"10rem"},children:i.title}),e.jsxs("span",{className:"inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0",style:{backgroundColor:k?"color-mix(in srgb, var(--accent) 12%, transparent)":"var(--muted)",color:k?"var(--accent)":"var(--muted-foreground)"},children:[k&&e.jsx("span",{className:"w-1 h-1 rounded-full",style:{backgroundColor:"var(--accent)"}}),k?`R${k.round_number}`:"No round"]})]}),e.jsx(Qt,{responsesOpen:j,onToggleResponses:ns,onDownloadResponses:is,onSaveSynthesis:os,onStartNextRound:as,loading:$,formTitle:i.title,formId:t,rounds:u,structuredSynthesisData:D,expertLabels:H}),e.jsx(Ht,{synthesisMode:xe,onModeChange:Ye,selectedModel:de,onModelChange:es,models:or,isGenerating:ve,onGenerate:ls}),e.jsx(Ut,{displayRound:R,synthesisVersions:Q,selectedVersionId:Y,onSelectVersion:ne,selectedVersion:we,onActivateVersion:cs,resolvedExpertLabels:H,formId:t,token:c,currentUserEmail:d,showCompare:ye,onToggleCompare:()=>je(x=>!x)}),Q.length>0&&e.jsx(nr,{versions:Q,selectedVersionId:Y,onSelectVersion:ne}),e.jsx(Jt,{rounds:u,selectedRoundId:(y==null?void 0:y.id)||null,onSelectRound:_e})]})]}),e.jsx(Kt,{open:j,onClose:()=>C(!1),structuredRounds:A,rounds:u,formQuestions:i.questions||[],token:c,onResponseUpdated:Ce})]}):e.jsx(Xt,{})}export{jr as default};
