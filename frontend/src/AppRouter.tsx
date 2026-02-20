import { Routes, Route } from 'react-router-dom';
import { PageLayout, AuthLayout } from './layouts';
import PrivateRoute from './PrivateRoute';
import Dashboard from './Dashboard';
import SummaryPage from './SummaryPage';
import WaitingPage from './WaitingPage';
import ResultPage from './ResultPage';
import ThankYouPage from './ThankYouPage';
import FormEditor from './FormEditor';
import FormPage from './FormPage';
import Login from './Login';
import Register from './Register';
import Atlas from './Atlas';

/**
 * Application routes organised by layout shell.
 *
 * ┌─ AuthLayout (centred card) ──────────────────────┐
 * │  /login                                          │
 * │  /register                                       │
 * └──────────────────────────────────────────────────┘
 *
 * ┌─ PrivateRoute → PageLayout (Header+Footer) ─────┐
 * │  /               Dashboard (admin or user)       │
 * │  /atlas          UX Atlas                        │
 * │  /waiting        Post-submission waiting room    │
 * │  /result         Synthesis result + feedback     │
 * │  /thank-you      Thank-you confirmation          │
 * │  /form/:id       User form submission            │
 * └──────────────────────────────────────────────────┘
 *
 * ┌─ PrivateRoute (admin) → PageLayout ──────────────┐
 * │  /admin/form/:id          Form editor            │
 * │  /admin/form/:id/summary  Summary workspace      │
 * └──────────────────────────────────────────────────┘
 */
export default function Router() {
  return (
    <Routes>
      {/* ── Public auth pages (centred layout) ── */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* ── Authenticated pages (shared page shell) ── */}
      <Route element={<PrivateRoute />}>
        <Route element={<PageLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/atlas" element={<Atlas />} />
          <Route path="/waiting" element={<WaitingPage />} />
          <Route path="/result" element={<ResultPage />} />
          <Route path="/thank-you" element={<ThankYouPage />} />
          <Route path="/form/:id" element={<FormPage />} />
        </Route>
      </Route>

      {/* ── Admin pages (shared page shell, admin-only) ── */}
      <Route element={<PrivateRoute isAdminRoute />}>
        <Route element={<PageLayout />}>
          <Route path="/admin/form/:id" element={<FormEditor />} />
          <Route path="/admin/form/:id/summary" element={<SummaryPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
