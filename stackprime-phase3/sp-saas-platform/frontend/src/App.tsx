import { Link, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import { RequireAuth, useAuth } from './auth';
import { Button, Page, Splash } from './ui';
import { Account } from './pages/Account';
import { Admin } from './pages/Admin';
import { AcceptInvite, ForgotPassword, Login, ResetPassword, Signup, VerifyEmail } from './pages/AuthPages';
import { Billing, BillingComplete } from './pages/Billing';
import { Dashboard } from './pages/Dashboard';
import { Organisation } from './pages/Organisation';
import { Products } from './pages/Products';

function Brand({ to }: { to: string }) {
  return (
    <Link to={to} className="brand">
      <i aria-hidden="true" />
      StackPrime
    </Link>
  );
}

/** The signed-in layout has a side rail; visitors get a simple top bar. */
function Layout() {
  const { status, me, logout, can } = useAuth();
  if (status === 'loading') return <Splash />;

  if (status === 'out') {
    return (
      <>
        <header className="topbar">
          <div className="topbar-inner">
            <Brand to="/" />
            <nav aria-label="Account">
              <Link className="btn btn-quiet btn-small" to="/login">Sign in</Link>
              <Link className="btn btn-primary btn-small" to="/signup">Create account</Link>
            </nav>
          </div>
        </header>
        <main className="public-main"><Outlet /></main>
      </>
    );
  }

  return (
    <div className="shell">
      <aside className="rail">
        <Brand to="/dashboard" />
        <nav aria-label="Main">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/" end>Products</NavLink>
          {(can('billing:read') || can('billing:manage')) && <NavLink to="/billing">Billing</NavLink>}
          <NavLink to="/organisation">Organisation</NavLink>
          <NavLink to="/account">Account</NavLink>
          {me?.isStaff && <NavLink to="/admin">Admin</NavLink>}
        </nav>
        <div className="rail-foot">
          <span className="who">{me?.email}</span>
          <Button kind="quiet" small onClick={logout}>Sign out</Button>
        </div>
      </aside>
      <main className="main"><Outlet /></main>
    </div>
  );
}

function NotFound() {
  return (
    <Page title="Page not found" intro="That address does not exist, or it has moved.">
      <p><Link to="/">Go to the products page</Link></p>
    </Page>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Products />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/billing" element={<RequireAuth><Billing /></RequireAuth>} />
        <Route path="/billing/complete" element={<RequireAuth><BillingComplete /></RequireAuth>} />
        <Route path="/organisation" element={<RequireAuth><Organisation /></RequireAuth>} />
        <Route path="/accept-invite" element={<RequireAuth><AcceptInvite /></RequireAuth>} />
        <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />
        <Route path="/admin" element={<RequireAuth staff><Admin /></RequireAuth>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
