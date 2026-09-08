// src/utils/productPresentation.ts
function renderActionGroup(h, actions, title) {
  const [edit, summary, download, share, remove] = actions;
  return h(
    "div",
    { className: "product-actions", "aria-label": `Actions for ${title}` },
    summary,
    share,
    h(
      "details",
      { className: "product-more", onKeyDown: (event) => {
        if (event.key === "Escape") {
          event.currentTarget.open = false;
          event.currentTarget.querySelector("summary")?.focus();
        }
      } },
      h("summary", { "aria-label": `More actions for ${title}`, title: "More actions" }, "\u2022\u2022\u2022"),
      h("div", { className: "product-more-items", onClick: (event) => {
        if (event.target.closest("a,button")) event.currentTarget.closest("details").open = false;
      } }, edit, download, remove)
    )
  );
}
function renderWorkspaceLoading(h, contentOnly = false) {
  return h(
    "div",
    { className: `product-loading${contentOnly ? " product-loading-content" : ""}`, "aria-busy": true },
    !contentOnly && h(
      "header",
      { className: "product-loading-header" },
      h(
        "a",
        { href: "/", "aria-label": "Symphonia dashboard" },
        h("img", { src: "/logo-mark.png", alt: "" }),
        h("span", null, "Symphonia")
      )
    ),
    h(
      "div",
      { className: "product-loading-status", role: "status" },
      h("span", { className: "product-loading-dot", "aria-hidden": true }),
      "Loading\u2026"
    )
  );
}
export {
  renderActionGroup,
  renderWorkspaceLoading
};
