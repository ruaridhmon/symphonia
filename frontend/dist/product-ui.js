// src/utils/quietSummary.ts
var states = /* @__PURE__ */ new WeakMap();
var id = 0;
function quietSummary(main) {
  for (const stale of main.querySelectorAll(".quiet-synthesis-toggle")) {
    if (!document.getElementById(stale.getAttribute("aria-controls") || "")) stale.closest(".summary-switch")?.remove();
  }
  const heading = Array.from(main.querySelectorAll("h2")).find((n) => /^(Round \d+ synthesis|Synthesis for Round \d+)$/.test(n.textContent?.trim() || ""));
  const card = heading?.closest(".card");
  if (!card) {
    main.querySelector(".opening-claims")?.remove();
    return;
  }
  card.classList.add("full-summary-surface");
  card.id ||= `full-synthesis-${++id}`;
  let progress = main.querySelector("#delphi-recorded-progress");
  for (const stale of main.querySelectorAll(".opening-claims")) {
    if (stale.dataset.owner !== card.id || !/^Round 1 synthesis$|^Synthesis for Round 1$/.test(heading.textContent || "")) stale.remove();
  }
  if (/^Round 1 synthesis$|^Synthesis for Round 1$/.test(heading.textContent || "")) {
    const claims = Array.from(card.querySelectorAll(".ProseMirror p,.ProseMirror h3,.claim-evidence-claim-heading")).map((n) => (n.textContent || "").trim()).filter((text) => /^Claim\s+\d+:\s*\S/i.test(text));
    const unique = [...new Set(claims.map((text) => text.replace(/^Claim\s+\d+:\s*/i, "")))];
    if (unique.length) {
      let opening = main.querySelector(".opening-claims");
      if (!opening) {
        opening = document.createElement("section");
        opening.className = "delphi-insights opening-claims";
        opening.dataset.owner = card.id;
        (progress || card).before(opening);
      }
      const signature = JSON.stringify(unique);
      if (opening.dataset.signature !== signature) {
        opening.dataset.signature = signature;
        opening.replaceChildren();
        const note = document.createElement("p");
        note.className = "di-change-overview";
        note.textContent = "Claims from the opening round \xB7 not yet rated";
        opening.append(note);
        const table = document.createElement("div");
        table.className = "di-claims";
        opening.append(table);
        const columns = document.createElement("div");
        columns.className = "di-column-head";
        for (const text of ["Claim", "Status"]) {
          const cell = document.createElement("span");
          cell.textContent = text;
          columns.append(cell);
        }
        table.append(columns);
        unique.forEach((text, index) => {
          const row = document.createElement("article");
          row.className = "di-claim";
          const copy = document.createElement("div");
          copy.className = "di-claim-copy";
          const number = document.createElement("span");
          number.className = "di-claim-number";
          number.textContent = String(index + 1).padStart(2, "0");
          const title = document.createElement("h3");
          title.textContent = text;
          copy.append(number, title);
          const status = document.createElement("div");
          status.className = "di-rating opening-status";
          status.textContent = "Not rated";
          row.append(copy, status);
          table.append(row);
        });
      }
      if (progress) progress.hidden = true;
      progress = opening;
    } else main.querySelector(".opening-claims")?.remove();
  }
  const hasResults = !!progress?.querySelector(".di-claim");
  const empty = progress?.dataset.empty === "true";
  let state = states.get(card);
  if (!hasResults && !empty) {
    if (state) {
      card.hidden = false;
      state.nav.hidden = true;
      if (progress) progress.hidden = false;
    }
    return;
  }
  const round = heading.textContent || "";
  if (!state) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quiet-synthesis-toggle";
    card.id ||= `full-synthesis-${++id}`;
    button.setAttribute("aria-controls", card.id);
    const nav = document.createElement("nav");
    nav.className = "summary-switch";
    nav.setAttribute("aria-label", "Summary view");
    const claims = document.createElement("button");
    claims.type = "button";
    claims.textContent = hasResults ? "Claims" : "Overview";
    nav.append(claims, button);
    state = { button, claims, nav, open: false, round };
    states.set(card, state);
    (progress || card).before(nav);
    claims.onclick = () => {
      state.open = false;
      sync();
    };
    button.onclick = () => {
      const current2 = states.get(card);
      current2.open = true;
      sync();
    };
  }
  if (state.round !== round) {
    state.round = round;
    state.open = false;
  }
  if (card.classList.contains("unified-editing")) state.open = true;
  const current = state;
  function sync() {
    const text = empty ? "Write a summary" : "Full summary";
    if (current.button.textContent !== text) current.button.textContent = text;
    const expanded = String(current.open);
    if (current.button.getAttribute("aria-expanded") !== expanded) current.button.setAttribute("aria-expanded", expanded);
    if (card.hidden === current.open) card.hidden = !current.open;
    current.button.hidden = false;
    current.nav.hidden = false;
    current.claims.setAttribute("aria-pressed", String(!current.open));
    current.button.setAttribute("aria-pressed", String(current.open));
    if (progress) progress.hidden = current.open;
  }
  sync();
}

// src/utils/participantPresentation.ts
function enhanceParticipantPresentation(main) {
  const participant = /^\/(?:form\/\d+|public\/session\/)/.test(location.pathname);
  main.classList.toggle("cw-participant", participant);
  if (!participant) return;
  const nav = main.querySelector('nav[aria-label="Question sections"]');
  if (nav) {
    nav.querySelectorAll("button").forEach((button, index) => {
      const label = button.querySelector("span")?.textContent || button.textContent || "";
      if (button.dataset.step !== String(index + 1)) button.dataset.step = String(index + 1);
      if (button.getAttribute("aria-label") !== label) button.setAttribute("aria-label", label);
      if (button.title !== label) button.title = label;
    });
    main.querySelectorAll("section[aria-label]").forEach((section) => {
      const label = section.getAttribute("aria-label");
      if (!label) return;
      let heading = section.querySelector(":scope > .cw-question-heading");
      if (!heading) {
        heading = document.createElement("h2");
        heading.className = "cw-question-heading";
        section.prepend(heading);
      }
      if (heading.textContent !== label) heading.textContent = label;
    });
  }
  main.querySelectorAll("[data-question-key] textarea").forEach((area) => {
    const label = area.closest("[data-question-key]")?.querySelector("label")?.textContent?.replace(/Required|Optional|Not answered yet/g, "").trim();
    if (label && !area.labels?.length && area.getAttribute("aria-label") !== label) area.setAttribute("aria-label", label);
  });
}

// src/utils/synthesisControls.ts
var bound = /* @__PURE__ */ new WeakSet();
var panelId = 0;
function enhanceSynthesisControls(main) {
  const toolbar = main.querySelector('aside[aria-label="Synthesis controls"]');
  if (!toolbar) {
    main.querySelector(".summary-tools-only")?.remove();
    return;
  }
  const progress = main.querySelector("#delphi-recorded-progress");
  for (const text of toolbar.querySelectorAll("summary span")) {
    if (text.textContent?.trim() === "Generate synthesis") text.textContent = "Generate summary";
  }
  if (progress) {
    main.classList.add("summary-with-results");
    const refresh = progress.querySelector(".di-title > button");
    if (refresh) {
      toolbar.querySelector(".summary-refresh")?.remove();
      refresh.classList.add("summary-refresh");
      toolbar.append(refresh);
    }
    const actions = toolbar.querySelector(".unified-actions");
    if (actions && actions !== toolbar.lastElementChild) toolbar.append(actions);
  } else {
    main.classList.remove("summary-with-results");
    toolbar.querySelector(".summary-refresh")?.remove();
  }
  for (const detail of toolbar.querySelectorAll(":scope > details.summary-disclosure")) {
    if (bound.has(detail)) continue;
    bound.add(detail);
    const trigger = detail.querySelector(":scope > summary");
    const panel = detail.querySelector(":scope > .card");
    if (!trigger || !panel) continue;
    panel.id ||= `synthesis-panel-${++panelId}`;
    trigger.setAttribute("aria-controls", panel.id);
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-label", trigger.querySelector("span")?.textContent || "Synthesis settings");
    const close = document.createElement("button");
    close.type = "button";
    close.className = "summary-panel-close";
    close.textContent = "Close";
    close.setAttribute("aria-label", `Close ${panel.getAttribute("aria-label")?.toLowerCase()}`);
    close.onclick = () => {
      detail.open = false;
      (main.querySelector(".summary-actions-menu>summary") || trigger).focus();
    };
    panel.prepend(close);
    const sync = () => {
      trigger.setAttribute("aria-expanded", String(detail.open));
      if (detail.open) toolbar.querySelectorAll("details.summary-disclosure").forEach((other) => {
        if (other !== detail) other.open = false;
      });
    };
    detail.addEventListener("toggle", sync);
    sync();
  }
  let nav = main.querySelector(".summary-switch");
  if ((!nav || nav.hidden) && (progress || main.querySelector(".consultation-workspace"))) {
    nav = main.querySelector(".summary-tools-only");
    if (!nav) {
      nav = document.createElement("nav");
      nav.className = "summary-tools-only";
      nav.setAttribute("aria-label", "Summary actions");
      (progress || toolbar).before(nav);
    }
  } else main.querySelector(".summary-tools-only")?.remove();
  if (nav && !nav.hidden) {
    toolbar.classList.add("summary-actions-panel");
    if (main.querySelector(".di-claim")) nav.querySelector(".summary-generate-empty")?.remove();
    let menu = nav.querySelector(".summary-actions-menu");
    if (!menu) {
      menu = document.createElement("details");
      menu.className = "summary-actions-menu";
      const trigger = document.createElement("summary");
      trigger.textContent = "\u2022\u2022\u2022";
      trigger.setAttribute("aria-label", "Summary actions");
      menu.append(trigger);
      const items = document.createElement("div");
      items.className = "summary-actions-items";
      menu.append(items);
      nav.append(menu);
      if (!main.querySelector(".di-claim")) {
        const generate = document.createElement("button");
        generate.type = "button";
        generate.className = "summary-generate-empty";
        generate.textContent = "Generate summary";
        generate.onclick = () => {
          const detail = toolbar.querySelector("details.summary-disclosure");
          if (detail) {
            detail.open = true;
            detail.querySelector(".summary-panel-close")?.focus();
          }
        };
        nav.prepend(generate);
      }
      for (const detail of toolbar.querySelectorAll(":scope > details.summary-disclosure")) {
        const action = document.createElement("button");
        action.type = "button";
        action.textContent = detail.querySelector("summary span")?.textContent || "Summary settings";
        action.onclick = () => {
          menu.open = false;
          toolbar.querySelectorAll("details.summary-disclosure").forEach((other) => other.open = other === detail);
          detail.querySelector(".card input,.card select,.summary-panel-close")?.focus();
        };
        items.append(action);
      }
      const refresh = toolbar.querySelector(".summary-refresh");
      if (refresh) {
        const action = document.createElement("button");
        action.type = "button";
        action.textContent = "Refresh";
        action.onclick = () => {
          menu.open = false;
          refresh.click();
        };
        items.append(action);
      }
      menu.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          menu.open = false;
          trigger.focus();
        }
      });
      const dismiss = (event) => {
        if (!menu.isConnected) {
          document.removeEventListener("pointerdown", dismiss);
          return;
        }
        if (!menu.contains(event.target)) menu.open = false;
      };
      document.addEventListener("pointerdown", dismiss);
    }
  } else toolbar.classList.remove("summary-actions-panel");
  if (bound.has(toolbar)) return;
  bound.add(toolbar);
  toolbar.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const open = toolbar.querySelector("details.summary-disclosure[open]");
    if (open) {
      event.preventDefault();
      open.open = false;
      (main.querySelector(".summary-actions-menu>summary") || open.querySelector("summary"))?.focus();
    }
  });
  const outside = (event) => {
    if (!toolbar.isConnected) {
      document.removeEventListener("pointerdown", outside);
      return;
    }
    if (toolbar.contains(event.target)) return;
    toolbar.querySelectorAll("details.summary-disclosure[open]").forEach((d) => d.open = false);
  };
  document.addEventListener("pointerdown", outside);
}

// src/utils/unifiedClaims.ts
var claimText = (s) => s.replace(/^\s*Claim\s+\d+:\s*/i, "").replace(/\s+/g, " ").trim();
var previous = /* @__PURE__ */ new WeakMap();
var excerptId = 0;
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
  const carry = Array.from(card.querySelectorAll("p,div")).find((p) => !p.closest(".unified-actions") && (p.textContent || "").length < 350 && (p.textContent?.includes("carried forward") || p.classList.contains("synthesis-draft-note")))?.textContent || "";
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
    const openKeys = new Set(existing ? Array.from(existing.querySelectorAll("details[open]")).map((d) => d.dataset.key) : JSON.parse(target.dataset.openExcerpts || "[]"));
    existing?.remove();
    target.classList.add("unified-claim-card");
    target.querySelector(".unified-claim-heading")?.remove();
    const detail = document.createElement("div");
    detail.className = "unified-excerpts";
    detail.dataset.signature = signature2;
    const note = document.createElement("p");
    note.className = "unified-provenance";
    note.textContent = carry || "Original excerpts from the saved synthesis; counts above are recorded ratings.";
    if (carry) note.dataset.carried = "true";
    detail.append(note);
    const controls = document.createElement("div");
    controls.className = "unified-excerpt-controls";
    controls.setAttribute("role", "group");
    controls.setAttribute("aria-label", "Original excerpts");
    const caption = document.createElement("span");
    caption.className = "unified-excerpt-label";
    caption.textContent = "Excerpts";
    controls.append(caption);
    if (groups.length) detail.append(controls);
    groups.forEach((g, i) => {
      const clone = g.cloneNode(true);
      clone.dataset.key = `${target.dataset.key}:excerpt:${i}`;
      clone.open = openKeys.has(clone.dataset.key);
      clone.removeAttribute("id");
      clone.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
      const summary = clone.querySelector("summary");
      if (summary) {
        const label2 = summary.querySelector("span:not(.claim-evidence-count)");
        if (label2) label2.textContent = (label2.textContent || "").replace(/original excerpts/i, "excerpts");
        for (const n of Array.from(summary.childNodes)) if (n.nodeType === Node.TEXT_NODE) n.textContent = (n.textContent || "").replace(/original excerpts/i, "excerpts");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "unified-excerpt-button";
        const name = summary.querySelector("span:not(.claim-evidence-count)")?.textContent || summary.textContent || "Original excerpts";
        const count = summary.querySelector(".claim-evidence-count")?.textContent;
        button.append(document.createTextNode(name.replace(/\s+(original\s+)?excerpts.*$/i, "").trim()));
        if (count) {
          const n = document.createElement("span");
          n.textContent = count;
          n.className = "unified-excerpt-total";
          button.append(n);
        }
        clone.id = `claim-excerpts-${++excerptId}`;
        button.id = `${clone.id}-control`;
        button.setAttribute("aria-controls", clone.id);
        button.setAttribute("aria-label", `${name}${count ? " \xB7 " + count : ""}`);
        clone.setAttribute("aria-labelledby", button.id);
        const sync = () => button.setAttribute("aria-expanded", String(clone.open));
        sync();
        clone.addEventListener("toggle", sync);
        button.onclick = () => {
          const open = !clone.open;
          detail.querySelectorAll("details").forEach((d) => {
            d.open = false;
            const control = controls.querySelector(`[aria-controls="${d.id}"]`);
            control?.setAttribute("aria-expanded", "false");
          });
          clone.open = open;
          sync();
        };
        controls.append(button);
        summary.hidden = true;
      }
      detail.append(clone);
    });
    target.append(detail);
    target.querySelector(".di-reasons")?.remove();
  }
  const originals = Array.from(card.querySelectorAll("button")).filter((b) => !b.closest(".unified-actions") && /^(Hide from survey|Publish to survey|Save|Revert|Expand all|Collapse all|Edit synthesis text|Preview evidence)$/.test(b.textContent?.trim() || ""));
  if (!originals.length) return;
  originals.forEach((b) => b.classList.toggle("unified-original-action", allMatched || !b.closest(".synthesis-draft-header")));
  let menu = main.querySelector(".unified-actions");
  if (!menu) {
    menu = document.createElement("details");
    menu.className = "unified-actions";
    const summary = document.createElement("summary");
    summary.textContent = "Synthesis actions";
    menu.append(summary, document.createElement("div"));
  }
  const host = allMatched && progress ? main.querySelector('aside[aria-label="Synthesis controls"]') || progress.querySelector(".di-heading") : card.firstElementChild;
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
    originals.filter((b) => (allMatched || !b.closest(".synthesis-draft-header")) && (!b.disabled || !["Save", "Revert"].includes(b.textContent?.trim() || ""))).forEach((original) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = original.textContent;
      b.disabled = original.disabled;
      b.onclick = () => {
        menu.open = false;
        const label = original.textContent?.trim();
        if (label === "Expand all" || label === "Collapse all") progress?.querySelectorAll(".di-reasons,.unified-excerpts details").forEach((d) => d.open = label === "Expand all");
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

// src/utils/consultationInbox.ts
function enhanceConsultationInbox(main) {
  for (const button of main.querySelectorAll("button")) {
    for (const child of button.childNodes) if (child.nodeType === Node.TEXT_NODE) {
      if (child.textContent?.trim() === "Create Form") child.textContent = "New consultation";
      if (child.textContent?.trim() === "Enter code") child.textContent = "Join";
    }
  }
  for (const link of main.querySelectorAll('a[href$="/summary"]')) {
    const row = link.closest("tr") || link.closest(".rounded-2xl");
    if (!row || row.dataset.inboxBound) continue;
    row.dataset.inboxBound = "true";
    row.classList.add("inbox-row");
    const mobile = row.tagName !== "TR";
    const title = row.querySelector(mobile ? ".font-semibold" : "td");
    const rawName = link.getAttribute("aria-label")?.replace(/^Summary\s*/, "") || "Consultation";
    const simulated = /^SIMULATED PANEL\s*[—–-]\s*/i.test(rawName);
    const name = rawName.replace(/^SIMULATED PANEL\s*[—–-]\s*/i, "");
    if (simulated && title) {
      const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
      let text;
      while (text = walker.nextNode()) if (text.textContent?.includes("SIMULATED PANEL")) text.textContent = text.textContent.replace(/^SIMULATED PANEL\s*[—–-]\s*/i, "");
      const badge = document.createElement("span");
      badge.className = "inbox-demo-badge";
      badge.textContent = "Demo \xB7 fictional experts";
      title.append(badge);
    }
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

// src/legacy/productUI.ts
function syncProductUI() {
  const main = document.querySelector("main");
  if (!main) return;
  enhanceParticipantPresentation(main);
  unifyClaims(main);
  quietSummary(main);
  enhanceSynthesisControls(main);
  const dashboard = location.pathname === "/" && !!main.querySelector('input[aria-label="Search consultations"]');
  main.classList.toggle("product-dashboard", dashboard);
  if (dashboard) enhanceConsultationInbox(main);
  main.classList.toggle("product-summary", !!main.querySelector('.consultation-workspace,#summary-workspace-select,aside[aria-label="Synthesis controls"]'));
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
