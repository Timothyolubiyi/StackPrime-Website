import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth';
import { Shell } from './components';
import { Billing, Login, NotFound, Organisation, Overview, PaymentComplete, Products, Security, Signup } from './pages';

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth(); const location = useLocation();
  if (loading) return <div className="boot-screen"><div className="brand-mark">S</div><span>Loading StackPrime…</span></div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (user.mfaEnrolmentRequired && location.pathname !== '/security') return <Navigate to="/security" replace />;
  return <Shell>{children}</Shell>;
}
function PublicOnly({children}:{children:React.ReactNode}) {
  const {user,loading}=useAuth();if(loading)return <div className="boot-screen">Loading StackPrime…</div>;return user?<Navigate to="/" replace/>:<>{children}</>;
}
export default function App() {
  return <Routes>
    <Route path="/login" element={<PublicOnly><Login/></PublicOnly>}/>
    <Route path="/signup" element={<PublicOnly><Signup/></PublicOnly>}/>
    <Route path="/billing/complete" element={<Protected><PaymentComplete/></Protected>}/>
    <Route path="/" element={<Protected><Overview/></Protected>}/>
    <Route path="/products" element={<Protected><Products/></Protected>}/>
    <Route path="/billing" element={<Protected><Billing/></Protected>}/>
    <Route path="/organisation" element={<Protected><Organisation/></Protected>}/>
    <Route path="/security" element={<Protected><Security/></Protected>}/>
    <Route path="*" element={<Protected><NotFound/></Protected>}/>
  </Routes>;
}
