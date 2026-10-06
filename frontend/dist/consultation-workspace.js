// src/utils/consultationWorkspace.ts
function questionOutline(questions) {
  const groups = [];
  for (const [index, q] of questions.entries()) {
    const config = typeof q === "string" ? {} : q;
    const label = typeof q === "string" ? q : String(q.label || q.question || q.text || `Question ${index + 1}`);
    const section = String(config.sectionTitle || "");
    let group = section && groups.at(-1)?.title === section ? groups.at(-1) : void 0;
    if (!group) {
      group = { title: section || label, fields: [] };
      groups.push(group);
    }
    group.fields.push({ label: section ? label : "", options: Array.isArray(config.options) ? config.options.map(String) : [], optional: config.optional === true });
  }
  const scales = [...new Set(groups.flatMap((group) => group.fields.filter((field) => field.options.length).map((field) => JSON.stringify(field.options))))];
  return { groups, sharedScale: scales.length === 1 ? JSON.parse(scales[0]) : null };
}
function createConsultationWorkspace(R, ManualResponse, FinalSynthesis) {
  const h = R.createElement;
  return function ConsultationWorkspace(p) {
    const [panel, setPanel] = R.useState(null);
    const [finalView, setFinalView] = R.useState(false);
    const [completed, setCompleted] = R.useState(false);
    const [copyState, setCopyState] = R.useState("");
    const [adding, setAdding] = R.useState(null);
    const [saved, setSaved] = R.useState("");
    const addTrigger = R.useRef(null);
    const dialog = R.useRef(null);
    const titleId = R.useId();
    const options = R.useRef(null);
    const openPanel = (next) => {
      if (options.current) options.current.open = false;
      setCopyState("");
      setPanel(next);
    };
    const ordered = [...p.rounds].sort((a, b) => a.round_number - b.round_number);
    const round = ordered.find((r) => r.id === p.selectedRoundId) || ordered.find((r) => r.is_active) || ordered[0];
    const responseGroup = p.responses?.find((r) => r.id === round?.id);
    const count = responseGroup ? responseGroup.responses.length : round?.response_count;
    const joinUrl = new URL(`/share/${encodeURIComponent(p.form.join_code)}`, window.location.origin).href;
    const outline = questionOutline(round?.questions || p.form.questions);
    const simulated = /^SIMULATED PANEL\s*[—–-]\s*/i.test(p.form.title);
    const displayTitle = p.form.title.replace(/^SIMULATED PANEL\s*[—–-]\s*/i, "");
    const hint = round?.round_number === 1 ? "Collect independent views, then draw out the claims." : round?.round_number === 2 ? "Review the claims and where the panel agrees or differs." : "Review final ratings alongside the reasons behind them.";
    R.useEffect(() => {
      if (panel && dialog.current && !dialog.current.open) dialog.current.showModal();
      if (!panel && dialog.current?.open) dialog.current.close();
    }, [panel]);
    R.useEffect(() => {
      setPanel(null);
      setCopyState("");
      setAdding(null);
      setSaved("");
      setFinalView(false);
      setCompleted(false);
    }, [p.form.id]);
    const canLeave = () => !document.querySelector(".response-workspace textarea") || window.confirm("Discard unsaved response edits?");
    const button = (text, onClick, props = {}) => h("button", { type: "button", onClick, ...props }, props.children ?? text);
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(joinUrl);
        setCopyState("Link copied");
      } catch {
        setCopyState("Copy unavailable. Select the link below and copy it.");
      }
    };
    return h(
      "section",
      { className: "consultation-workspace", "data-final-view": finalView ? "true" : void 0, "data-final-round": ordered.some((r) => r.round_number === 3) ? "true" : void 0, "aria-label": "Consultation workspace" },
      h(
        "div",
        { className: "cw-title-row" },
        h("div", { className: "cw-identity" }, h("h2", null, displayTitle), simulated && !p.isDemo ? h("span", { className: "cw-provenance", title: "Simulated consultation with fictional experts", "aria-label": "Demo with fictional experts" }, "Demo") : null),
        p.isDemo ? h("span", { className: "cw-demo-badge" }, "Synthetic example") : h(
          "div",
          { className: "cw-title-actions" },
          h(
            "details",
            { ref: options, className: "cw-options", onKeyDown: (e) => {
              if (e.key === "Escape") {
                e.currentTarget.open = false;
                e.currentTarget.querySelector("summary")?.focus();
              }
            } },
            h("summary", { "aria-label": "Consultation options" }, "\u2022\u2022\u2022"),
            h(
              "div",
              null,
              button("Invite people", () => openPanel("invite")),
              h("a", { href: `/admin/form/${p.form.id}` }, "Edit consultation"),
              button("View questions", () => openPanel("questions"), { className: "cw-mobile-questions", "aria-label": "Preview round questions", disabled: !round }),
              p.onDownload ? button("Download", p.onDownload) : null,
              round && !round.is_active && p.onMakeLive ? button(p.makingLiveId === round.id ? "Updating\u2026" : `Make Round ${round.round_number} current`, () => p.onMakeLive?.(round), { disabled: p.makingLiveId === round.id }) : null
            )
          )
        )
      ),
      h(
        "nav",
        { className: "cw-views", "aria-label": "Consultation views" },
        [["synthesis", "Summary"], ["responses", "Responses"]].map(([view, label]) => button(label, () => {
          if (canLeave()) {
            setFinalView(false);
            p.onView(view);
          }
        }, { key: view, "aria-pressed": !finalView && p.view === view })),
        h(
          "div",
          { className: "cw-context cw-simple-context" },
          ordered.length <= 5 ? h("div", { className: "cw-round-tabs", "aria-label": "Rounds" }, ...ordered.map((r) => button(`Round ${r.round_number}`, () => {
            if (canLeave()) {
              setFinalView(false);
              p.onRound(r);
            }
          }, { key: r.id, "aria-pressed": !finalView && round?.id === r.id, title: r.is_active ? "Current round" : `View Round ${r.round_number}` }))) : h("label", { className: "cw-round-picker" }, h("span", { className: "cw-round-display", "aria-hidden": true }, `Round ${round?.round_number || "\u2014"} \u2304`), h("select", { "aria-label": "Round", value: round?.id || "", onChange: (event) => {
            const selected = ordered.find((r) => r.id === Number(event.target.value));
            if (selected && canLeave()) {
              setFinalView(false);
              p.onRound(selected);
            }
          } }, ...ordered.map((r) => h("option", { key: r.id, value: r.id }, `Round ${r.round_number}${r.is_active ? " \xB7 Current" : ""}`)))),
          ordered.some((r) => r.round_number === 3) && FinalSynthesis ? button("Final synthesis", () => {
            if (canLeave()) {
              p.onView("synthesis");
              setFinalView(true);
            }
          }, { "aria-pressed": finalView, className: "cw-final-tab", title: "Round 4 \xB7 final synthesis" }) : null,
          count !== void 0 && !finalView ? h("span", null, `${count} response${count === 1 ? "" : "s"}`) : null,
          !finalView && !p.isDemo && ManualResponse && p.onResponseAdded ? button("+ Add response", () => {
            if (round?.is_active && !completed && canLeave()) {
              setSaved("");
              setAdding(round);
            }
          }, { ref: addTrigger, className: "cw-add-response", disabled: !round?.is_active || completed, title: round?.is_active ? "Record a response received outside Symphonia" : "Select the current round to add a response" }) : null,
          button("View questions", () => setPanel("questions"), { className: "cw-text-button", disabled: !round })
        )
      ),
      finalView && FinalSynthesis ? h(FinalSynthesis, { formId: p.form.id, onComplete: () => setCompleted(true) }) : null,
      saved ? h("p", { className: "cw-response-saved", role: "status" }, saved) : null,
      adding && ManualResponse ? h(ManualResponse, { form: p.form, round: adding, onClose: () => {
        setAdding(null);
        requestAnimationFrame(() => addTrigger.current?.focus());
      }, onSaved: async () => {
        await p.onResponseAdded?.();
        setSaved("Response saved");
      } }) : null,
      h(
        "dialog",
        { ref: dialog, className: "cw-dialog", "aria-labelledby": titleId, onCancel: () => setPanel(null), onClose: () => setPanel(null), onClick: (event) => {
          if (event.target === event.currentTarget) setPanel(null);
        } },
        h(
          "div",
          { className: "cw-dialog-body" },
          h("header", null, h("h2", { id: titleId }, panel === "invite" ? "Invite people" : `Round ${round?.round_number} questions`), button("\xD7", () => setPanel(null), { "aria-label": "Close dialog", className: "cw-close" })),
          panel === "invite" ? h(
            R.Fragment,
            null,
            h("p", { className: "cw-dialog-intro" }, "Share one link. Each person joins the consultation and responds in their own space."),
            !p.form.allow_join ? h("p", { role: "status", className: "cw-notice" }, "Joining is currently closed. Review access settings before inviting new participants.") : null,
            h("label", { className: "cw-link-label" }, "Invitation link", h("input", { value: joinUrl, readOnly: true, onFocus: (e) => e.target.select() })),
            h("div", { className: "cw-invite-actions" }, button(copyState === "Link copied" ? "Copied \u2713" : "Copy invite link", () => {
              void copy();
            }, { className: "cw-primary" }), h("a", { href: joinUrl, target: "_blank", rel: "noreferrer" }, "Preview join page \u2197")),
            h("p", { className: "cw-copy-status", role: "status" }, copyState),
            h("div", { className: "cw-invite-note" }, h("strong", null, "One panel, every round"), h("p", null, "Participants use this link again when the next round opens. Existing sign-in and consent requirements still apply.")),
            h("a", { className: "cw-settings-link", href: `/admin/form/${p.form.id}` }, "Manage access and consultation settings \u2192")
          ) : h(
            R.Fragment,
            null,
            h("p", { className: "cw-dialog-intro" }, hint),
            outline.sharedScale ? h("details", { className: "cw-shared-scale" }, h("summary", null, "Rating scale used for every rated claim"), h("p", null, outline.sharedScale.join(" \xB7 "))) : null,
            h("ol", { className: "cw-questions cw-question-outline" }, ...outline.groups.map((group, i) => h(
              "li",
              { key: i },
              h("h3", null, group.title),
              h("div", { className: "cw-field-outline" }, ...group.fields.map((field, j) => h(
                "p",
                { key: j },
                field.options.length && /^your (response|position)$/i.test(field.label) ? "Rating" : /^explain your position$/i.test(field.label) ? "Written explanation" : field.label || "Written response",
                h("span", null, field.optional ? " \xB7 Optional" : " \xB7 Required"),
                !outline.sharedScale && field.options.length ? h("small", null, field.options.join(" \xB7 ")) : null
              )))
            )))
          )
        )
      )
    );
  };
}
export {
  createConsultationWorkspace,
  questionOutline
};
