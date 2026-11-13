import { NavLink, useNavigate } from 'react-router-dom';
import { Activity, ArrowUpRight, Bell, Box, CreditCard, LayoutDashboard, LogOut, Menu, Settings, ShieldCheck, Users, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from './auth';

export function Brand() {
  return <div className="brand"><div className="brand-mark">S</div><div><strong>StackPrime</strong><span>SAAS PLATFORM</span></div></div>;
}
export function Shell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const can = (p: string) => user?.permissions.includes(p as any);
  const links = [
    { to: '/', label: 'Overview', icon: LayoutDashboard, show: can('dashboard:read') },
    { to: '/products', label: 'Products', icon: Box, show: can('products:access') },
    { to: '/billing', label: 'Billing', icon: CreditCard, show: can('billing:read') },
    { to: '/organisation', label: 'Organisation', icon: Users, show: can('org:read') },
    { to: '/security', label: 'Security', icon: ShieldCheck, show: true },
  ];
  const nav = <><div className="side-brand"><Brand /></div><div className="nav-caption">WORKSPACE</div>
    {links.filter(x => x.show).map(({to,label,icon:Icon}) => <NavLink key={to} to={to} end={to==='/'} onClick={()=>setMobileOpen(false)} className={({isActive})=>`nav-link ${isActive?'active':''}`}><Icon size={18}/><span>{label}</span></NavLink>)}
    <div className="side-bottom"><div className="side-help"><div className="help-icon"><Activity size={17}/></div><div><b>Need assistance?</b><span>Our team is here to help.</span><a href="mailto:support@stackprimeconsulting.com.ng">Contact support <ArrowUpRight size={13}/></a></div></div>
    <button className="nav-link logout" onClick={async()=>{await signOut();navigate('/login')}}><LogOut size={18}/> Sign out</button></div></>;
  return <div className="app-shell"><aside className="sidebar">{nav}</aside>
    {mobileOpen && <div className="mobile-backdrop" onClick={()=>setMobileOpen(false)}><aside className="mobile-sidebar" onClick={e=>e.stopPropagation()}><button className="icon-btn close-nav" onClick={()=>setMobileOpen(false)}><X/></button>{nav}</aside></div>}
    <main className="main-area"><header className="topbar"><button className="icon-btn mobile-menu" onClick={()=>setMobileOpen(true)}><Menu/></button><div className="breadcrumb">Workspace <span>/</span> <b>Account</b></div><div className="top-actions"><button className="icon-btn" title="Notifications"><Bell size={18}/></button><div className="user-chip"><div className="avatar">{(user?.name||user?.email||'U').slice(0,1).toUpperCase()}</div><div><b>{user?.name || 'Account'}</b><span>{user?.email}</span></div></div></div></header>
    <div className="page-content">{children}</div><footer className="footer"><span>© {new Date().getFullYear()} StackPrime Consulting Ltd.</span><span>Secure. Scalable. Connected.</span></footer></main>
  </div>;
}
export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>;
}
export function Stat({ label, value, note, icon: Icon }: any) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><div className="stat-icon"><Icon size={18}/></div></div><strong>{value}</strong>{note && <small>{note}</small>}</div>;
}
export function Notice({ children, tone='info' }: { children: React.ReactNode; tone?: 'info'|'warning'|'success' }) {
  return <div className={`notice ${tone}`}>{children}</div>;
}
export function Empty({ title, text }: { title: string; text: string }) {
  return <div className="empty-state"><div className="empty-icon"><Box size={22}/></div><b>{title}</b><p>{text}</p></div>;
}
