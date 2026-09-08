// frontend/src/utils/unifiedClaims.ts
var claimText = (s) => s.replace(/^\s*Claim\s+\d+:\s*/i, "").replace(/\s+/g, " ").trim();
var previous = /* @__PURE__ */ new WeakMap();
function unifyClaims(main) {
  const preview = main.querySelector(".claim-evidence-preview");
  const card = preview?.closest(".card");
  if (!preview || !card) return;
  const progress = main.querySelector("#delphi-recorded-progress");
  const first = progress?.querySelector(".di-claim") || null;
  const signatureKey = (card.querySelector(".ProseMirror")?.innerHTML || preview.innerHTML) + String(preview.hidden) + (progress?.dataset.signature || "") + (progress?.dataset.filter || "") + Array.from(card.querySelectorAll("button")).filter((b) => !b.closest(".unified-actions")).map((b) => b.textContent + String(b.disabled)).join("|");
  const last = previous.get(main);
  if (last?.preview === preview && last.first === first && last.signature === signatureKey) return;
  previous.set(main, { preview, first, signature: signatureKey });
  const source = Array.from(preview.querySelectorAll(".claim-evidence-claim"));
  const labels = JSON.parse(progress?.dataset.claimLabels || "[]");
  const matched = source.filter((c) => labels.filter((l) => l === claimText(c.querySelector(".claim-evidence-claim-heading strong")?.textContent || "")).length === 1);
  const allMatched = source.length > 0 && matched.length === source.length;
  const editing = preview.hidden;
  card.classList.toggle("unified-synthesis", allMatched);
  card.classList.toggle("unified-editing", editing);
  for (const item of source) item.classList.toggle("unified-matched", matched.includes(item));
  const carry = Array.from(card.querySelectorAll("p,div")).find((p) => !p.closest(".unified-actions") && (p.textContent || "").length < 350 && p.textContent?.includes("carried forward"))?.textContent || "";
  for (const target of progress?.querySelectorAll(".di-claim") || []) {
    const label = claimText(target.querySelector("h3")?.textContent || "");
    const candidates = matched.filter((c) => claimText(c.querySelector(".claim-evidence-claim-heading strong")?.textContent || "") === label);
    const existing = target.querySelector(".unified-excerpts");
    if (candidates.length !== 1) {
      existing?.remove();
      continue;
    }
    const groups = Array.from(candidates[0].querySelectorAll(":scope > details"));
    const signature2 = carry + groups.map((g) => g.innerHTML).join("");
    if (existing?.dataset.signature === signature2) continue;
    existing?.remove();
    const detail = document.createElement("details");
    detail.className = "unified-excerpts";
    detail.dataset.signature = signature2;
    const title = document.createElement("summary");
    title.textContent = "Synthesis excerpts";
    detail.append(title);
    const note = document.createElement("p");
    note.className = "unified-provenance";
    note.textContent = carry || "From the saved synthesis. These excerpts are not additional ratings.";
    detail.append(note);
    groups.forEach((g) => {
      const clone = g.cloneNode(true);
      clone.open = false;
      clone.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
      detail.append(clone);
    });
    target.append(detail);
  }
  const originals = Array.from(card.querySelectorAll("button")).filter((b) => !b.closest(".unified-actions") && /^(Hide from survey|Publish to survey|Save|Revert|Expand all|Collapse all|Edit synthesis text|Preview evidence)$/.test(b.textContent?.trim() || ""));
  if (!originals.length) return;
  originals.forEach((b) => b.classList.add("unified-original-action"));
  let menu = main.querySelector(".unified-actions");
  if (!menu) {
    menu = document.createElement("details");
    menu.className = "unified-actions";
    const summary = document.createElement("summary");
    summary.textContent = "Synthesis actions";
    menu.append(summary, document.createElement("div"));
  }
  const host = allMatched && progress ? progress.querySelector(".di-heading") : card.firstElementChild;
  if (host && menu.parentElement !== host) host.append(menu);
  const status = Array.from(card.querySelectorAll("p,div")).filter((p) => !p.closest(".unified-actions") && (p.textContent || "").length < 350).map((p) => p.textContent || "").find((t) => t.includes("All changes saved") || t.includes("unsaved")) || "";
  const signature = originals.map((b) => `${b.textContent}:${b.disabled}`).join("|") + status;
  if (menu.dataset.signature !== signature) {
    menu.dataset.signature = signature;
    const items = menu.lastElementChild;
    items.replaceChildren();
    if (status) {
      const note = document.createElement("p");
      note.textContent = status;
      items.append(note);
    }
    originals.filter((b) => !b.disabled || !["Save", "Revert"].includes(b.textContent?.trim() || "")).forEach((original) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = original.textContent;
      b.disabled = original.disabled;
      b.onclick = () => {
        menu.open = false;
        const label = original.textContent?.trim();
        if (label === "Expand all" || label === "Collapse all") progress?.querySelectorAll(".di-reasons,.unified-excerpts,.unified-excerpts details").forEach((d) => d.open = label === "Expand all");
        original.click();
        if (label === "Edit synthesis text") {
          card.classList.add("unified-editing");
          card.scrollIntoView({ block: "start" });
        }
      };
      items.append(b);
    });
  }
}

// frontend/src/utils/consultationInbox.ts
function enhanceConsultationInbox(main) {
  for (const link of main.querySelectorAll('a[href$="/summary"]')) {
    const row = link.closest("tr") || link.closest(".rounded-2xl");
    if (!row || row.dataset.inboxBound) continue;
    row.dataset.inboxBound = "true";
    row.classList.add("inbox-row");
    const mobile = row.tagName !== "TR";
    const title = row.querySelector(mobile ? ".font-semibold" : "td");
    const name = link.getAttribute("aria-label")?.replace(/^Summary\s*/, "") || "Consultation";
    const actions = link.parentElement;
    actions.classList.add("inbox-original-actions");
    const more = document.createElement("button");
    more.type = "button";
    more.className = "inbox-more";
    more.textContent = "\u2022\u2022\u2022";
    more.setAttribute("aria-label", `Actions for ${name}`);
    more.setAttribute("aria-haspopup", "dialog");
    const open = () => {
      if (document.querySelector(".inbox-sheet[open]")) return;
      const dialog = document.createElement("dialog");
      dialog.className = "inbox-sheet";
      dialog.setAttribute("aria-label", `Actions for ${name}`);
      const heading = document.createElement("h2");
      heading.textContent = name;
      dialog.append(heading);
      for (const original of actions.querySelectorAll("a,button")) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = original.title || original.textContent?.trim() || "Open";
        if (original.getAttribute("title") === "Delete") button.className = "inbox-delete";
        button.disabled = original instanceof HTMLButtonElement && original.disabled;
        button.onclick = () => {
          dialog.close();
          original.click();
        };
        dialog.append(button);
      }
      const close = document.createElement("button");
      close.type = "button";
      close.className = "inbox-cancel";
      close.textContent = "Cancel";
      close.onclick = () => dialog.close();
      dialog.append(close);
      dialog.addEventListener("click", (e) => {
        if (e.target === dialog) {
          const r = dialog.getBoundingClientRect();
          if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
        }
      });
      dialog.addEventListener("close", () => {
        dialog.remove();
        if (row.isConnected) more.focus();
      }, { once: true });
      document.body.append(dialog);
      dialog.showModal();
    };
    more.onclick = open;
    if (mobile) row.append(more);
    else actions.after(more);
    if (title) {
      title.tabIndex = 0;
      title.setAttribute("role", "link");
      title.setAttribute("aria-label", `Open ${name}`);
      title.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          link.click();
        }
      });
    }
    let startX = 0, startY = 0, active = false, suppressUntil = 0, timer;
    const clear = () => {
      clearTimeout(timer);
      timer = void 0;
    };
    row.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" || e.target.closest("a,button,input")) return;
      active = true;
      startX = e.clientX;
      startY = e.clientY;
      timer = setTimeout(() => {
        active = false;
        suppressUntil = Date.now() + 800;
        open();
      }, 550);
    });
    row.addEventListener("pointermove", (e) => {
      if (!active) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) clear();
      if (Math.abs(dy) > 20) {
        active = false;
        return;
      }
      if (dx < -65 && Math.abs(dy) < 20) {
        active = false;
        suppressUntil = Date.now() + 800;
        open();
      }
    });
    row.addEventListener("pointerup", () => {
      clear();
      active = false;
    });
    row.addEventListener("pointercancel", () => {
      clear();
      active = false;
    });
    row.addEventListener("contextmenu", (e) => {
      if (mobile) {
        e.preventDefault();
        clear();
        active = false;
        suppressUntil = Date.now() + 800;
        open();
      }
    });
    row.addEventListener("click", (e) => {
      if (e.target.closest("a,button,input")) return;
      if (Date.now() < suppressUntil) {
        e.preventDefault();
        return;
      }
      if (window.getSelection()?.toString()) return;
      link.click();
    });
  }
}

// frontend/src/legacy/productUI.ts
function syncProductUI() {
  const main = document.querySelector("main");
  if (!main) return;
  unifyClaims(main);
  const dashboard = location.pathname === "/" && !!main.querySelector('input[aria-label="Search consultations"]');
  main.classList.toggle("product-dashboard", dashboard);
  if (dashboard) enhanceConsultationInbox(main);
  main.classList.toggle("product-summary", !!main.querySelector('aside[aria-label="Synthesis controls"]'));
  const select = main.querySelector("#summary-workspace-select");
  if (select) {
    select.closest("label")?.classList.add("product-view-control");
    let nav = main.querySelector(".product-views");
    if (!nav) {
      nav = document.createElement("nav");
      nav.className = "product-views";
      nav.setAttribute("aria-label", "Consultation views");
      select.closest("section")?.append(nav);
      for (const option of Array.from(select.options)) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.value = option.value;
        button.textContent = option.textContent === "Synthesis" ? "Summary" : option.textContent;
        button.onclick = () => {
          select.value = option.value;
          select.dispatchEvent(new Event("change", { bubbles: true }));
          syncProductUI();
        };
        nav.append(button);
      }
    }
    nav.querySelectorAll("button").forEach((button) => {
      const pressed = String(button.dataset.value === select.value);
      if (button.getAttribute("aria-pressed") !== pressed) button.setAttribute("aria-pressed", pressed);
    });
  }
  main.querySelectorAll(".ux-question-row textarea").forEach((area) => {
    if (area.dataset.productSized) return;
    area.dataset.productSized = "true";
    const resize = () => {
      area.style.height = "auto";
      area.style.height = `${Math.max(96, area.scrollHeight)}px`;
    };
    area.addEventListener("input", resize);
    resize();
  });
}
var queued = false;
new MutationObserver(() => {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    syncProductUI();
  });
}).observe(document.body, { childList: true, subtree: true });
document.addEventListener("change", syncProductUI);
document.addEventListener("click", (event) => {
  document.querySelectorAll(".product-more[open]").forEach((menu) => {
    if (!menu.contains(event.target)) menu.open = false;
  });
});
window.addEventListener("popstate", syncProductUI);
syncProductUI();
