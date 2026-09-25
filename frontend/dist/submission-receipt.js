// src/utils/submissionReceipt.ts
function createSubmissionReceipt(R, get) {
  const h = R.createElement;
  return function SubmissionReceipt({ context, navigate }) {
    const [saved] = R.useState(() => {
      if (context.formId) return context;
      try {
        return JSON.parse(sessionStorage.getItem("symphonia-submission-receipt") || "{}");
      } catch {
        return {};
      }
    });
    const [ready, setReady] = R.useState(false), [next, setNext] = R.useState(null), [error, setError] = R.useState(""), [busy, setBusy] = R.useState(false);
    const mounted = R.useRef(true), checking = R.useRef(false);
    const check = R.useCallback(async () => {
      if (!saved.formId || checking.current) return;
      checking.current = true;
      setBusy(true);
      try {
        const [round, summary] = await Promise.all([get(`/forms/${saved.formId}/active_round`), get(`/forms/${saved.formId}/summary_text`)]);
        if (!mounted.current) return;
        setNext(saved.roundNumber && round.round_number > saved.roundNumber ? round.round_number : null);
        setReady(Boolean(summary.summary?.trim()));
        setError("");
      } catch {
        if (mounted.current) setError("Could not check for updates. Your submitted response is still saved.");
      } finally {
        checking.current = false;
        if (mounted.current) setBusy(false);
      }
    }, [saved.formId, saved.roundNumber]);
    R.useEffect(() => {
      mounted.current = true;
      if (saved.formId) try {
        sessionStorage.setItem("symphonia-submission-receipt", JSON.stringify(saved));
      } catch {
      }
      void check();
      const timer = setInterval(() => {
        if (document.visibilityState === "visible") void check();
      }, 15e3);
      return () => {
        mounted.current = false;
        clearInterval(timer);
      };
    }, [check, saved]);
    return h(
      "section",
      { className: "cw-receipt" },
      h("div", { className: "cw-receipt-mark", "aria-hidden": true }, "\u2713"),
      h("p", { className: "cw-eyebrow" }, saved.roundNumber ? `Round ${saved.roundNumber} \xB7 Submitted` : "Submitted"),
      h("h1", null, "Your perspective is part of the conversation."),
      h("p", { className: "cw-receipt-title" }, saved.formTitle || "Your response has been recorded."),
      h("p", { className: "cw-receipt-copy" }, next ? `Round ${next} is ready. Review the panel\u2019s feedback and share your updated view.` : saved.roundNumber === 3 ? "Your ratings are saved. The facilitator can now review the panel\u2019s agreement and remaining differences." : "Your response is saved. You can return when the facilitator opens the next round."),
      h(
        "div",
        { className: "cw-receipt-actions" },
        next ? h("button", { className: "cw-primary", onClick: () => navigate(`/form/${saved.formId}`) }, `Continue to round ${next} \u2192`) : ready ? h("button", { className: "cw-primary", onClick: () => navigate("/result", { state: saved }) }, "View published findings \u2192") : saved.formId ? h("button", { onClick: () => {
          void check();
        }, disabled: busy, className: "cw-primary" }, busy ? "Checking\u2026" : "Check for updates") : null,
        saved.formId ? h("button", { onClick: () => navigate(`/form/${saved.formId}`) }, "Review my response") : null
      ),
      h("p", { role: "status", className: "cw-receipt-status" }, error || (!ready && !next ? "Updates appear here when available." : "")),
      h("button", { className: "cw-text-button", onClick: () => navigate("/") }, "\u2190 Back to consultations")
    );
  };
}
export {
  createSubmissionReceipt
};
