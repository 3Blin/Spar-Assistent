'use client';

import { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Receipt, Settings, Menu, X } from 'lucide-react';
import NavLink from './NavLink';
import AuthNav from './AuthNav';

const NAV_ITEMS = [
  { href: '/',             label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/bon',          label: 'Bon hochladen', Icon: Receipt },
  { href: '/admin/preise', label: 'Preise',     Icon: Settings },
];

export default function NavMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Lock body scroll when menu open on mobile
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <div ref={menuRef} className="flex items-center gap-1">

      {/* ── Desktop nav (hidden on mobile) ── */}
      <div className="hidden sm:flex items-center gap-1">
        {NAV_ITEMS.map(({ href, label, Icon }) => (
          <NavLink key={href} href={href}>
            <span className="flex items-center gap-1.5">
              <Icon size={14} aria-hidden="true" />
              <span>{label === 'Bon hochladen' ? 'Bon' : label}</span>
            </span>
          </NavLink>
        ))}
        <AuthNav />
      </div>

      {/* ── Mobile: AuthNav + Hamburger ── */}
      <div className="flex sm:hidden items-center gap-2">
        <AuthNav />
        <button
          onClick={() => setOpen(v => !v)}
          aria-label={open ? 'Menü schließen' : 'Menü öffnen'}
          aria-expanded={open}
          aria-controls="mobile-nav-menu"
          className="hamburger-btn"
        >
          {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </div>

      {/* ── Mobile dropdown ── */}
      {open && (
        <div
          id="mobile-nav-menu"
          role="dialog"
          aria-label="Navigation"
          className="mobile-nav-dropdown"
        >
          <nav className="flex flex-col gap-1 p-3">
            {NAV_ITEMS.map(({ href, label, Icon }) => (
              <a
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="mobile-nav-item"
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
