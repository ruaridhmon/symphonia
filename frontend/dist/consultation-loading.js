// src/utils/consultationLoading.ts
function renderConsultationLoading(h, header) {
  return h(
    "div",
    { className: "min-h-screen bg-background text-foreground font-sans flex flex-col symphonia-shell symphonia-consultation-open" },
    header,
    h(
      "main",
      { className: "product-summary symphonia-summary-loading", "aria-busy": true, "aria-label": "Loading consultation" },
      h("div", { className: "symphonia-opening-status", role: "status" }, "Loading consultation\u2026"),
      h(
        "div",
        { className: "symphonia-reading-scaffold", "aria-hidden": true },
        h("div", { className: "symphonia-placeholder-title" }),
        h("div", { className: "symphonia-placeholder-tabs" }),
        ...[1, 2, 3].map((key) => h(
          "div",
          { key, className: "symphonia-placeholder-row" },
          h("span"),
          h("span")
        ))
      )
    )
  );
}
export {
  renderConsultationLoading
};
