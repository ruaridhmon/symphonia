// src/utils/summaryRoute.ts
var CONSULTATION_NAVIGATION = "symphonia:navigate-consultation";
function createSummaryRoute(R, useNavigate, useParams, Content) {
  return function SummaryRoute() {
    const navigate = useNavigate();
    const { id } = useParams();
    R.useEffect(() => {
      const onNavigate = (event) => {
        const href = event.detail?.href;
        if (!href) return;
        const url = new URL(href, location.origin);
        if (url.origin !== location.origin || !/^\/admin\/form\/\d+\/summary\/?$/.test(url.pathname)) return;
        event.preventDefault();
        R.startTransition(() => navigate(url.pathname + url.search));
      };
      window.addEventListener(CONSULTATION_NAVIGATION, onNavigate);
      return () => window.removeEventListener(CONSULTATION_NAVIGATION, onNavigate);
    }, [navigate]);
    return R.createElement(Content, { key: id });
  };
}
function forwardConsultationClick(event) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest("a[href]");
  if (!link || link.target && link.target !== "_self" || link.hasAttribute("download")) return;
  const url = new URL(link.href, location.origin);
  if (url.origin !== location.origin || !/^\/admin\/form\/\d+\/summary\/?$/.test(location.pathname) || !/^\/admin\/form\/\d+\/summary\/?$/.test(url.pathname)) return;
  if (url.pathname === location.pathname) {
    event.preventDefault();
    return;
  }
  const dirty = document.querySelector(".synthesis-draft-state")?.textContent?.includes("Unsaved changes") || document.querySelector(".response-workspace textarea:not(:disabled)") || document.querySelector('.manual-response-sheet[data-dirty="true"]');
  if (dirty && !window.confirm("Leave this consultation and discard unsaved edits?")) {
    event.preventDefault();
    return;
  }
  const request = new CustomEvent(CONSULTATION_NAVIGATION, { cancelable: true, detail: { href: url.pathname + url.search } });
  window.dispatchEvent(request);
  if (request.defaultPrevented) event.preventDefault();
}
export {
  CONSULTATION_NAVIGATION,
  createSummaryRoute,
  forwardConsultationClick
};
