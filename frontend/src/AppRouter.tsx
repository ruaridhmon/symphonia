import { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { PageLayout, AuthLayout } from './layouts';
import PrivateRoute from './PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';
import RouteLoadingFallback from './components/RouteLoadingFallback';
import { lazyWithRetry } from './utils/lazyWithRetry';

/* ─── Lazy-loaded route components ─────────────────────────────────── */
const Dashboard = lazyWithRetry(() => import('./Dashboard'));
const SummaryPage = lazyWithRetry(() => import('./SummaryPage'));
const WaitingPage = lazyWithRetry(() => import('./WaitingPage'));
const ResultPage = lazyWithRetry(() => import('./ResultPage'));
const ThankYouPage = lazyWithRetry(() => import('./ThankYouPage'));
const FormEditor = lazyWithRetry(() => import('./FormEditor'));
const FormPage = lazyWithRetry(() => import('./FormPage'));
const Login = lazyWithRetry(() => import('./Login'));
const Register = lazyWithRetry(() => import('./Register'));
const ForgotPassword = lazyWithRetry(() => import('./ForgotPassword'));
const ResetPassword = lazyWithRetry(() => import('./ResetPassword'));
const NotFoundPage = lazyWithRetry(() => import('./NotFoundPage'));
const AdminFormNew = lazyWithRetry(() => import('./AdminFormNew'));
const AdminSettings = lazyWithRetry(() => import('./AdminSettings'));
const AdminUsers = lazyWithRetry(() => import('./AdminUsers'));
const JoinPage = lazyWithRetry(() => import('./JoinPage'));

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
 * │  /join/:code     Magic join link                  │
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
          <Route
            path="/forgot-password"
            element={
              <ErrorBoundary fallbackTitle="Forgot Password Error">
                <ForgotPassword />
              </ErrorBoundary>
            }
          />
          <Route
            path="/reset-password"
            element={
              <ErrorBoundary fallbackTitle="Reset Password Error">
                <ResetPassword />
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
            <Route
              path="/join"
              element={
                <ErrorBoundary fallbackTitle="Join Error">
                  <JoinPage />
                </ErrorBoundary>
              }
            />
            <Route
              path="/join/:code"
              element={
                <ErrorBoundary fallbackTitle="Join Error">
                  <JoinPage />
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
              path="/admin/users"
              element={
                <ErrorBoundary fallbackTitle="User Management Error">
                  <AdminUsers />
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
