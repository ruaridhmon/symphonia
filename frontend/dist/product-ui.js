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
