import{j as i}from"./vendor-markdown-YiB4v9cZ.js";import{r as c}from"./vendor-react-Di_Vzd_F.js";import{M as h,m,u,S as g,U as p,H as f,P as b,E as y,b as x}from"./vendor-tiptap-D_aIDI57.js";import{T as k,a as v,b as S,c as C}from"./index-C1AOqyJ6.js";import{aw as T,ax as j,ay as A,aB as L,aC as H}from"./vendor-icons-CyLGjnJm.js";const M=e=>{if(!e.children.length)return;const s=e.querySelectorAll("span");s&&s.forEach(t=>{var l,o;const n=t.getAttribute("style"),r=(o=(l=t.parentElement)===null||l===void 0?void 0:l.closest("span"))===null||o===void 0?void 0:o.getAttribute("style");t.setAttribute("style",`${r};${n}`)})},w=h.create({name:"textStyle",priority:101,addOptions(){return{HTMLAttributes:{},mergeNestedSpanStyles:!1}},parseHTML(){return[{tag:"span",getAttrs:e=>e.hasAttribute("style")?(this.options.mergeNestedSpanStyles&&M(e),{}):!1}]},renderHTML({HTMLAttributes:e}){return["span",m(this.options.HTMLAttributes,e),0]},addCommands(){return{removeEmptyTextStyle:()=>({tr:e})=>{const{selection:s}=e;return e.doc.nodesBetween(s.from,s.to,(t,l)=>{if(t.isTextblock)return!0;t.marks.filter(o=>o.type===this.type).some(o=>Object.values(o.attrs).some(n=>!!n))||e.removeMark(l,l+t.nodeSize,this.type)}),!0}}}}),E=x.create({name:"importedDocumentStyles",addGlobalAttributes(){return[{types:["textStyle"],attributes:{style:{default:null,parseHTML:e=>e.getAttribute("style"),renderHTML:e=>e.style?{style:e.style}:{}}}},{types:["paragraph","heading","tableCell","tableHeader"],attributes:{class:{default:null,parseHTML:e=>e.getAttribute("class"),renderHTML:e=>e.class?{class:e.class}:{}},style:{default:null,parseHTML:e=>e.getAttribute("style"),renderHTML:e=>e.style?{style:e.style}:{}}}}]}});function I({value:e,onChange:s,readOnly:t=!1,placeholder:l="Write here…",minHeight:o="18rem"}){const n=c.useRef(e),r=u({editable:!t,immediatelyRender:!1,extensions:[g,w,f.configure({multicolor:!0}),p,C.configure({resizable:!0}),k,v,S,E,b.configure({placeholder:l})],content:e,onUpdate:({editor:a})=>{const d=a.getHTML();n.current=d,s?.(d)},editorProps:{attributes:{class:"symphonia-rich-editor focus:outline-none"}}});return c.useEffect(()=>{r&&r.setEditable(!t)},[r,t]),c.useEffect(()=>{if(r&&e!==n.current){if(r.getHTML()===e){n.current=e;return}r.commands.setContent(e,!1),n.current=e}},[r,e]),i.jsxs("div",{className:"overflow-hidden rounded-xl",style:{border:"1px solid var(--input)",backgroundColor:"var(--background)"},children:[i.jsx("style",{children:`
        .symphonia-rich-editor > *:first-child {
          margin-top: 0;
        }
        .symphonia-rich-editor h1,
        .symphonia-rich-editor h2,
        .symphonia-rich-editor h3 {
          line-height: 1.2;
          color: #10223e;
        }
        .symphonia-rich-editor p,
        .symphonia-rich-editor li {
          line-height: 1.7;
        }
        .symphonia-rich-editor [style*="text-align: center"] {
          text-align: center;
        }
        .symphonia-rich-editor [style*="text-align: right"] {
          text-align: right;
        }
        .symphonia-rich-editor [style*="text-align: justify"] {
          text-align: justify;
        }
        .symphonia-rich-editor table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
          table-layout: fixed;
        }
        .symphonia-rich-editor th,
        .symphonia-rich-editor td {
          border: 1px solid #d5deea;
          padding: 0.65rem 0.75rem;
          vertical-align: top;
        }
        .symphonia-rich-editor th {
          background: #eef4fb;
          font-weight: 600;
        }
        .symphonia-rich-editor ul,
        .symphonia-rich-editor ol {
          padding-left: 1.25rem;
        }
        .symphonia-rich-editor blockquote {
          border-left: 3px solid #9db5d1;
          margin: 1rem 0;
          padding-left: 1rem;
          color: #42526b;
        }
        .symphonia-rich-editor mark {
          padding: 0.05rem 0.18rem;
          border-radius: 0.2rem;
        }
        .symphonia-rich-editor mark.highlight-yellow {
          background: #fff3a3;
        }
        .symphonia-rich-editor mark.highlight-green {
          background: #cdeccf;
        }
        .symphonia-rich-editor mark.highlight-cyan {
          background: #c7eef7;
        }
        .symphonia-rich-editor mark.highlight-magenta {
          background: #f1d0e8;
        }
        .symphonia-rich-editor mark.highlight-blue {
          background: #d6e4ff;
        }
        .symphonia-rich-editor mark.highlight-red {
          background: #ffd6d1;
        }
        .symphonia-rich-editor mark.highlight-dark-blue {
          background: #24406f;
          color: #fff;
        }
        .symphonia-rich-editor mark.highlight-dark-red {
          background: #7a2430;
          color: #fff;
        }
        .symphonia-rich-editor mark.highlight-dark-yellow {
          background: #7d6518;
          color: #fff;
        }
        .symphonia-rich-editor mark.highlight-generic {
          background: #eceff3;
        }
      `}),t?null:i.jsx("div",{className:"flex flex-wrap items-center gap-2 border-b px-3 py-2",style:{borderColor:"var(--border)",backgroundColor:"color-mix(in srgb, var(--foreground) 2%, var(--card))"},children:[{label:"Bold",icon:i.jsx(T,{size:14}),active:!!r?.isActive("bold"),onClick:()=>r?.chain().focus().toggleBold().run()},{label:"Italic",icon:i.jsx(j,{size:14}),active:!!r?.isActive("italic"),onClick:()=>r?.chain().focus().toggleItalic().run()},{label:"Underline",icon:i.jsx(A,{size:14}),active:!!r?.isActive("underline"),onClick:()=>r?.chain().focus().toggleUnderline().run()},{label:"Bullets",icon:i.jsx(L,{size:14}),active:!!r?.isActive("bulletList"),onClick:()=>r?.chain().focus().toggleBulletList().run()},{label:"Numbered list",icon:i.jsx(H,{size:14}),active:!!r?.isActive("orderedList"),onClick:()=>r?.chain().focus().toggleOrderedList().run()}].map(a=>i.jsx("button",{type:"button",onClick:a.onClick,className:"inline-flex h-8 w-8 items-center justify-center rounded-md","aria-label":a.label,title:a.label,style:{border:a.active?"1px solid color-mix(in srgb, var(--accent) 35%, transparent)":"1px solid var(--border)",backgroundColor:a.active?"color-mix(in srgb, var(--accent) 10%, transparent)":"transparent",color:a.active?"var(--accent)":"var(--muted-foreground)"},children:a.icon},a.label))}),i.jsx("div",{className:"prose prose-sm max-w-none px-4 py-4",style:{color:"var(--foreground)",backgroundColor:"color-mix(in srgb, #ffffff 96%, var(--background))",minHeight:`calc(${o} + 2rem)`,display:"flex",justifyContent:"center"},children:i.jsx("div",{className:"w-full max-w-[860px] rounded-lg px-6 py-7 sm:px-10 sm:py-9",style:{minHeight:o,backgroundColor:"#fff",color:"#172033",boxShadow:"0 12px 40px color-mix(in srgb, var(--foreground) 10%, transparent)",border:"1px solid color-mix(in srgb, var(--border) 75%, transparent)"},children:i.jsx(y,{editor:r})})})]})}export{I as R,w as T};
