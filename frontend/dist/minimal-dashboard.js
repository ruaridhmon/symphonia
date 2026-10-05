// src/legacy/minimalDashboard.ts
function cleanText(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}
function findButton(pattern) {
  return Array.from(document.querySelectorAll("button")).find((button) => pattern.test(cleanText(button.textContent))) || null;
}
function relabelButton(button, label) {
  if (!button || button.dataset.minimalLabel === label) return;
  button.dataset.minimalLabel = label;
  button.setAttribute("aria-label", label);
  button.textContent = label;
}
function markHeader() {
  const header = Array.from(document.querySelectorAll("header")).find((candidate) => candidate.querySelector('img[src*="logo-mark.png"]'));
  if (!header) return;
  header.classList.add("symphonia-shell-header");
  header.parentElement?.classList.add("symphonia-shell");
  let navigation = header.querySelector(".symphonia-shell-navigation");
  if (!navigation) {
    navigation = document.createElement("nav");
    navigation.className = "symphonia-shell-navigation";
    navigation.setAttribute("aria-label", "Workspace");
    const home2 = document.createElement("a");
    home2.href = "/";
    home2.textContent = "Consultations";
    navigation.append(home2);
    header.append(navigation);
  }
  const home = navigation.querySelector('a[href="/"]');
  if (location.pathname === "/") home.setAttribute("aria-current", "page");
  else home.removeAttribute("aria-current");
  const canCreate = !!findButton(/^new(?: consultation)?$/i) || location.pathname.startsWith("/admin/");
  const existing = navigation.querySelector('a[href="/admin/forms/new"]');
  if (canCreate && !existing) {
    const create = document.createElement("a");
    create.href = "/admin/forms/new";
    create.textContent = "New consultation";
    navigation.append(create);
  }
  if (existing) {
    if (location.pathname === "/admin/forms/new") existing.setAttribute("aria-current", "page");
    else existing.removeAttribute("aria-current");
  }
}
function nearestCard(node) {
  let current = node?.parentElement || null;
  while (current && current.id !== "root") {
    if (current.classList.contains("rounded-xl") || current.classList.contains("rounded-2xl")) return current;
    current = current.parentElement;
  }
  return null;
}
function markAdminDashboard() {
  const newButton = findButton(/^new(?: consultation)?$/i);
  const joinButton = findButton(/^(join|enter).*code|^join consultation$/i);
  if (!newButton) return false;
  const section = newButton.closest("section, main");
  if (!section) return false;
  section.classList.add("symphonia-minimal-dashboard", "symphonia-admin-home");
  const title = Array.from(section.querySelectorAll("h1")).find((heading) => /^consultations$/i.test(cleanText(heading.textContent)));
  title?.classList.add("symphonia-redundant-title");
  relabelButton(newButton, "New consultation");
  newButton.classList.add("symphonia-create-action");
  if (joinButton) relabelButton(joinButton, "Join");
  const search = section.querySelector(
    'input[aria-label*="Search"], input[placeholder*="Search"]'
  );
  search?.closest("div")?.classList.add("symphonia-minimal-search");
  const table = section.querySelector("table");
  if (table) {
    table.closest(".rounded-2xl")?.classList.add("symphonia-flat-list");
    table.classList.add("symphonia-flat-table");
  }
  Array.from(section.querySelectorAll(".rounded-2xl")).forEach((panel) => {
    if (!panel.querySelector("table")) panel.classList.add("symphonia-flat-empty");
  });
  return true;
}
function markExpertDashboard() {
  const joinHeading = Array.from(document.querySelectorAll("h2")).find((heading) => /^join a consultation$/i.test(cleanText(heading.textContent)));
  const listHeading = Array.from(document.querySelectorAll("h2")).find((heading) => /^my consultations$/i.test(cleanText(heading.textContent)));
  if (!joinHeading && !listHeading) return;
  const section = (joinHeading || listHeading)?.closest("section, main");
  section?.classList.add("symphonia-minimal-dashboard", "symphonia-expert-home");
  if (joinHeading) {
    const card = nearestCard(joinHeading);
    card?.classList.add("symphonia-join-card");
    joinHeading.classList.add("symphonia-redundant-title");
    const form = card?.querySelector("form");
    form?.classList.add("symphonia-join-form");
    const input = form?.querySelector("input");
    if (input) input.placeholder = "Join with code";
    relabelButton(form?.querySelector('button[type="submit"]') || null, "Join");
  }
  if (listHeading) {
    nearestCard(listHeading)?.classList.add("symphonia-list-card");
    listHeading.classList.add("symphonia-redundant-title");
  }
}
function applyMinimalDashboard() {
  markHeader();
  if (window.location.pathname !== "/") return;
  if (!markAdminDashboard()) markExpertDashboard();
}
var scheduled = false;
function scheduleApply() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    applyMinimalDashboard();
  });
}
applyMinimalDashboard();
var observer = new MutationObserver(scheduleApply);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("popstate", scheduleApply);
