import React from 'react';

const TabIcons = {
  home: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5L12 3l9 7.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9.5z" /><path d="M9 22V12h6v10" />
    </svg>
  ),
  tasks: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1z" /><line x1="9" y1="10" x2="15" y2="10" /><line x1="9" y1="14" x2="15" y2="14" /><line x1="9" y1="18" x2="13" y2="18" />
    </svg>
  ),
  wallet: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  ),
  leaderboard: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10" /><path d="M17 4v8a5 5 0 0 1-10 0V4" /><path d="M7 4H4v3a2 2 0 0 0 2 2h1" /><path d="M17 4h3v3a2 2 0 0 1-2 2h-1" />
    </svg>
  ),
  referrals: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="3.5" /><path d="M2 19a7 7 0 0 1 14 0v1H2v-1z" /><circle cx="17" cy="8" r="2.5" /><path d="M16 14.5a5.5 5.5 0 0 1 6 4.5v1h-3" />
    </svg>
  ),
  admin: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
};

const YELLOW = '#FACC15';     // pestaña activa
const INK = '#1F2937';        // texto/icono sobre amarillo
const INACTIVE = '#E0F2FE';   // pestañas inactivas sobre azul (más contraste)

export default function BottomNav({ activeTab, setActiveTab, userData, t }) {
  // Administradores (mismos IDs que el backend)
  const ADMIN_IDS = ['8968109534', '8892196101'];
  const isAdmin = userData && ADMIN_IDS.includes(String(userData.id));

  const getLabel = (key, fallback) => {
    const val = t(key);
    return val === key ? fallback : val;
  };

  const tabs = [
    { id: 'home', label: getLabel('nav_home', 'INICIO'), icon: TabIcons.home },
    { id: 'tasks', label: getLabel('nav_tasks', 'TAREAS'), icon: TabIcons.tasks },
    { id: 'wallet', label: getLabel('nav_wallet', 'BÓVEDA'), icon: TabIcons.wallet },
    { id: 'leaderboard', label: getLabel('nav_leaderboard', 'RANKING'), icon: TabIcons.leaderboard },
    { id: 'referrals', label: getLabel('nav_referrals', 'RED'), icon: TabIcons.referrals }
  ];

  if (isAdmin) tabs.push({ id: 'admin', label: getLabel('nav_admin', 'ADMIN'), icon: TabIcons.admin });

  return (
    <div style={{
      position: 'fixed', bottom: 'calc(10px + env(safe-area-inset-bottom))', left: '10px', right: '10px',
      maxWidth: '500px', margin: '0 auto',
      backgroundColor: '#0B3D6B',
      border: '3px solid #072A4A',
      borderRadius: '26px',
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      padding: '8px 6px',
      boxShadow: '0 6px 0 #072A4A, 0 12px 24px rgba(0, 0, 0, 0.35)',
      zIndex: 99999, userSelect: 'none', boxSizing: 'border-box'
    }}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const color = isActive ? INK : INACTIVE;
        return (
          <button
            key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, maxWidth: '75px', height: '56px', minWidth: 0,
              backgroundColor: isActive ? YELLOW : 'transparent',
              border: 'none', borderRadius: '18px',
              boxShadow: isActive ? '0 3px 0 #D4A017' : 'none',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '4px',
              cursor: 'pointer', outline: 'none',
              padding: 0, color,
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transform: isActive ? 'scale(1.1) translateY(-1px)' : 'scale(1)',
                transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
              {tab.icon}
            </div>
            <span style={{
                fontSize: '11px', fontWeight: '800', letterSpacing: '0.2px', lineHeight: 1,
                color,
                transition: 'color 0.25s ease',
                whiteSpace: 'nowrap'
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}