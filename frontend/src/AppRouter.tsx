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
import ErrorBoundary from './components/ErrorBoundary';

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
        <Route
          path="/login"
          element={
            <ErrorBoundary fallbackTitle="Login Error">
              <Login />
            </ErrorBoundary>
          }
        />
        <Route
          path="/register"
          element={
            <ErrorBoundary fallbackTitle="Registration Error">
              <Register />
            </ErrorBoundary>
          }
        />
      </Route>

      {/* ── Authenticated pages (shared page shell) ── */}
      <Route element={<PrivateRoute />}>
        <Route element={<PageLayout />}>
          <Route
            path="/"
            element={
              <ErrorBoundary fallbackTitle="Dashboard Error">
                <Dashboard />
              </ErrorBoundary>
            }
          />
          <Route
            path="/atlas"
            element={
              <ErrorBoundary fallbackTitle="Atlas Error">
                <Atlas />
              </ErrorBoundary>
            }
          />
          <Route
            path="/waiting"
            element={
              <ErrorBoundary fallbackTitle="Waiting Page Error">
                <WaitingPage />
              </ErrorBoundary>
            }
          />
          <Route
            path="/result"
            element={
              <ErrorBoundary fallbackTitle="Result Page Error">
                <ResultPage />
              </ErrorBoundary>
            }
          />
          <Route
            path="/thank-you"
            element={
              <ErrorBoundary fallbackTitle="Thank You Page Error">
                <ThankYouPage />
              </ErrorBoundary>
            }
          />
          <Route
            path="/form/:id"
            element={
              <ErrorBoundary fallbackTitle="Form Submission Error">
                <FormPage />
              </ErrorBoundary>
            }
          />
        </Route>
      </Route>

      {/* ── Admin pages (shared page shell, admin-only) ── */}
      <Route element={<PrivateRoute isAdminRoute />}>
        <Route element={<PageLayout />}>
          <Route
            path="/admin/form/:id"
            element={
              <ErrorBoundary fallbackTitle="Form Editor Error">
                <FormEditor />
              </ErrorBoundary>
            }
          />
          <Route
            path="/admin/form/:id/summary"
            element={
              <ErrorBoundary fallbackTitle="Summary Page Error">
                <SummaryPage />
              </ErrorBoundary>
            }
          />
        </Route>
      </Route>
    </Routes>
  );
}
