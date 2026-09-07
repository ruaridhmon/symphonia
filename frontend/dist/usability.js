// frontend/src/legacy/usability.ts
var makeButton = (text, fn) => {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = text;
  b.onclick = fn;
  return b;
};
var lastPath = "";
function sync() {
  const main = document.querySelector("main");
  if (!main) return;
  if (lastPath !== location.pathname) {
    document.body.classList.remove("ux-access-open");
    lastPath = location.pathname;
  }
  const builder = !!main.querySelector("#form-title") && /^\/admin\/(forms\/new|form\/\d+)\/?$/.test(location.pathname);
  document.body.classList.toggle("ux-builder", builder);
  if (builder) {
    const title = main.querySelector("h1");
    title?.parentElement?.classList.add("ux-builder-heading");
    main.querySelector("#form-title")?.parentElement?.parentElement?.classList.add("ux-builder-panel");
    if (title && !main.querySelector(".ux-builder-intro")) {
      const p = document.createElement("p");
      p.className = "ux-builder-intro";
      p.textContent = "Add a title and question, then preview what participants will see.";
      title.parentElement?.after(p);
    }
    for (const select of main.querySelectorAll('select[id^="question-type-"]')) {
      for (const o of Array.from(select.options)) {
        const label = o.value === "consensus" ? "Written response" : o.value === "survey" ? "Survey question" : o.textContent;
        if (label && o.textContent !== label) o.textContent = label;
      }
      select.parentElement?.classList.add("ux-question-row");
    }
    for (const b of main.querySelectorAll("button")) {
      if (b.textContent?.trim() !== "Evidence") continue;
      const group = b.parentElement;
      if (!group || !group.textContent?.includes("Counterarguments")) continue;
      group.classList.add("ux-question-extras");
      const active = Array.from(group.querySelectorAll("button")).filter((b2) => b2.style.color === "var(--accent)").length;
      const existing = group.previousElementSibling;
      if (existing?.classList.contains("ux-extras-toggle")) {
        const label = existing.querySelector("strong");
        if (label && label.textContent !== `Reasoning fields \xB7 ${active} enabled`) label.textContent = `Reasoning fields \xB7 ${active} enabled`;
        continue;
      }
      const toggle2 = makeButton("", () => {
        const open = group.classList.toggle("ux-extras-open");
        toggle2.setAttribute("aria-expanded", String(open));
      });
      toggle2.className = "ux-extras-toggle";
      toggle2.setAttribute("aria-expanded", "false");
      const title2 = document.createElement("strong");
      title2.textContent = `Reasoning fields \xB7 ${active} enabled`;
      toggle2.append(title2);
      const note = document.createElement("span");
      note.textContent = "Evidence, counterarguments, confidence";
      toggle2.append(note);
      group.before(toggle2);
    }
    const publicControl = document.getElementById("toggle-public-share");
    const consentControl = document.getElementById("toggle-consent-step");
    const cards = [publicControl?.closest("section"), consentControl?.closest("section")].filter(Boolean);
    cards.forEach((c) => c.classList.add("ux-access-card"));
    if (cards.length && !main.querySelector(".ux-access-toggle")) {
      const toggle2 = makeButton("Sharing & consent", () => {
        const open = document.body.classList.toggle("ux-access-open");
        toggle2.setAttribute("aria-expanded", String(open));
      });
      toggle2.className = "ux-access-toggle";
      toggle2.setAttribute("aria-expanded", "false");
      cards[0].before(toggle2);
    }
    const toggle = main.querySelector(".ux-access-toggle");
    if (toggle) {
      const label = `Sharing & consent \xB7 ${publicControl?.getAttribute("aria-checked") === "true" ? "public link enabled" : "sign-in required"}${consentControl?.getAttribute("aria-checked") === "true" ? " \xB7 consent required" : ""}`;
      if (toggle.textContent !== label) toggle.textContent = label;
    }
  } else main.querySelectorAll(".ux-builder-intro,.ux-access-toggle").forEach((n) => n.remove());
  const heading = Array.from(main.querySelectorAll("h2")).find((h) => h.textContent?.trim() === "Expert Responses");
  const card = heading?.closest(".card");
  const aside = card?.querySelector("aside");
  const reader = aside?.nextElementSibling;
  if (!card || !aside || !reader) {
    document.body.classList.remove("ux-responses");
    return;
  }
  document.body.classList.add("ux-responses");
  card.classList.add("ux-response-card");
  aside.classList.add("ux-response-list");
  reader.classList.add("ux-response-reader");
  aside.parentElement?.classList.add("ux-response-columns");
  for (const n of [...aside.querySelectorAll('[role="button"][aria-pressed] .truncate'), ...reader.querySelectorAll("h3")]) {
    if (n.children.length) continue;
    const raw = n.textContent || "";
    const clean = raw.replace(/^Guest:\s*/, "").replace(/\s*\[[A-Za-z0-9]{8}\]$/, "");
    if (clean !== raw) {
      n.title = raw;
      n.textContent = clean;
    }
  }
  for (const n of aside.querySelectorAll('[class*="line-clamp"]')) if (!n.children.length && n.textContent?.startsWith("Position: ")) n.textContent = n.textContent.slice(10);
  const search = aside.querySelector('input[type="search"]');
  search?.setAttribute("aria-label", "Search responses");
  const header = card.firstElementChild;
  if (header && !header.querySelector(".ux-manage")) {
    const toggle = makeButton("Manage responses", () => {
      const managing = card.classList.toggle("ux-managing");
      toggle.textContent = managing ? "Done managing" : "Manage responses";
      toggle.setAttribute("aria-pressed", String(managing));
    });
    toggle.className = "ux-manage";
    toggle.setAttribute("aria-pressed", "false");
    header.append(toggle);
  }
  for (const b of card.querySelectorAll("button")) if (b.textContent?.trim() === "Delete" || /Delete selected/.test(b.textContent || "")) b.classList.add("ux-destructive-control");
  for (const input of aside.querySelectorAll('input[type="checkbox"]')) {
    if (input.parentElement?.tagName === "LABEL") input.parentElement.classList.add("ux-selection-control");
    else input.classList.add("ux-selection-control");
  }
  const all = aside.querySelector("label.ux-selection-control");
  all?.parentElement?.parentElement?.classList.add("ux-selection-toolbar");
  if (!reader.querySelector(".ux-reader-back")) {
    const back = makeButton("\u2190 All responses", () => {
      card.classList.remove("ux-reading");
      const active = aside.querySelector('[aria-pressed="true"]');
      active?.focus();
    });
    back.className = "ux-reader-back";
    reader.prepend(back);
  }
  if (!card.dataset.uxBound) {
    card.dataset.uxBound = "true";
    const openReader = (event) => {
      const target = event.target;
      if (target.closest("input,label") || card.classList.contains("ux-managing")) return;
      const chosen = target.closest("[aria-pressed]");
      if (!chosen) return;
      card.classList.add("ux-reading");
      if (matchMedia("(max-width: 767px)").matches) setTimeout(() => {
        reader.querySelector(".ux-reader-back")?.focus();
        reader.scrollIntoView({ block: "start", behavior: "instant" });
      }, 0);
    };
    aside.addEventListener("click", openReader);
    aside.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") openReader(e);
    });
    aside.querySelector("select")?.addEventListener("change", () => card.classList.remove("ux-reading"));
  }
}
var timer;
new MutationObserver(() => {
  clearTimeout(timer);
  timer = setTimeout(sync, 80);
}).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "aria-checked"] });
window.addEventListener("popstate", sync);
sync();
