import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { PageLayout, AuthLayout } from './layouts';
import PrivateRoute from './PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';
import RouteLoadingFallback from './components/RouteLoadingFallback';

/* ─── Lazy-loaded route components ─────────────────────────────────── */
const Dashboard    = lazy(() => import('./Dashboard'));
const SummaryPage  = lazy(() => import('./SummaryPage'));
const WaitingPage  = lazy(() => import('./WaitingPage'));
const ResultPage   = lazy(() => import('./ResultPage'));
const ThankYouPage = lazy(() => import('./ThankYouPage'));
const FormEditor   = lazy(() => import('./FormEditor'));
const FormPage     = lazy(() => import('./FormPage'));
const Login        = lazy(() => import('./Login'));
const Register     = lazy(() => import('./Register'));
const Atlas        = lazy(() => import('./Atlas'));
const NotFoundPage  = lazy(() => import('./NotFoundPage'));
const AdminFormNew   = lazy(() => import('./AdminFormNew'));
const AdminSettings  = lazy(() => import('./AdminSettings'));

/**
 * Application routes organised by layout shell.
 *
 * All page components are lazy-loaded via React.lazy for code-splitting.
 * This reduces the initial JS bundle and loads each page on first visit.
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
    <Suspense fallback={<RouteLoadingFallback />}>
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
              path="/admin/settings"
              element={
                <ErrorBoundary fallbackTitle="Settings Error">
                  <AdminSettings />
                </ErrorBoundary>
              }
            />
            <Route
              path="/admin/forms/new"
              element={
                <ErrorBoundary fallbackTitle="New Form Error">
                  <AdminFormNew />
                </ErrorBoundary>
              }
            />
            <Route
              path="/admin/form/:id"
              element={
                <ErrorBoundary fallbackTitle="Form Editor Error">
                  <FormEditor />
                </ErrorBoundary>
              }
            />
          </Route>
          {/* SummaryPage has its own SummaryHeader — render outside PageLayout
              to avoid double header (PageLayout Header + SummaryHeader). */}
          <Route
            path="/admin/form/:id/summary"
            element={
              <ErrorBoundary fallbackTitle="Summary Page Error">
                <SummaryPage />
              </ErrorBoundary>
            }
          />
        </Route>
        {/* ── 404 catch-all ── */}
        <Route
          path="*"
          element={
            <ErrorBoundary fallbackTitle="Page Error">
              <NotFoundPage />
            </ErrorBoundary>
          }
        />
      </Routes>
    </Suspense>
  );
}
