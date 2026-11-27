import React from 'react';

const TabIcons = {
  home: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5L12 3l9 7.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9.5z" />
      <path d="M9 22V12h6v10" />
    </svg>
  ),
  tasks: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1z" />
      <line x1="9" y1="10" x2="15" y2="10" />
      <line x1="9" y1="14" x2="15" y2="14" />
      <line x1="9" y1="18" x2="13" y2="18" />
    </svg>
  ),
  wallet: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  ),
  leaderboard: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10" />
      <path d="M17 4v8a5 5 0 0 1-10 0V4" />
      <path d="M7 4H4v3a2 2 0 0 0 2 2h1" />
      <path d="M17 4h3v3a2 2 0 0 1-2 2h-1" />
    </svg>
  ),
  referrals: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="3.5" />
      <path d="M2 19a7 7 0 0 1 14 0v1H2v-1z" />
      <circle cx="17" cy="8" r="2.5" />
      <path d="M16 14.5a5.5 5.5 0 0 1 6 4.5v1h-3" />
    </svg>
  ),
  admin: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
};

const CHAMPAGNE_ACTIVE = 'linear-gradient(135deg, #E2C290 0%, #B88E56 100%)';
const DARK_INK = '#0E151C';
const SLATE_INACTIVE = '#94A3B8';

export default function BottomNav({ activeTab, setActiveTab, userData, t }) {
  const ADMIN_IDS = ['8968109534', '8892196101'];
  const isAdmin = userData && ADMIN_IDS.includes(String(userData.id));

  const getLabel = (key, fallback) => {
    const val = typeof t === 'function' ? t(key) : null;
    return !val || val === key ? fallback : val;
  };

  const tabs = [
    { id: 'home', label: getLabel('nav_home', 'INICIO'), icon: TabIcons.home },
    { id: 'tasks', label: getLabel('nav_tasks', 'TAREAS'), icon: TabIcons.tasks },
    { id: 'wallet', label: getLabel('nav_wallet', 'BÓVEDA'), icon: TabIcons.wallet },
    { id: 'leaderboard', label: getLabel('nav_leaderboard', 'RANKING'), icon: TabIcons.leaderboard },
    { id: 'referrals', label: getLabel('nav_referrals', 'RED'), icon: TabIcons.referrals }
  ];

  if (isAdmin) {
    tabs.push({ id: 'admin', label: getLabel('nav_admin', 'ADMIN'), icon: TabIcons.admin });
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(10px + env(safe-area-inset-bottom))',
        left: '10px',
        right: '10px',
        maxWidth: '500px',
        margin: '0 auto',
        background: 'linear-gradient(145deg, #141D26 0%, #1B2632 100%)',
        border: '1px solid rgba(212, 175, 122, 0.35)',
        borderRadius: '22px',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '6px',
        boxShadow: '0 10px 26px rgba(11, 17, 23, 0.6), inset 0 1px 0 rgba(226, 194, 144, 0.14)',
        zIndex: 99999,
        userSelect: 'none',
        boxSizing: 'border-box'
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const color = isActive ? DARK_INK : SLATE_INACTIVE;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              maxWidth: '76px',
              height: '52px',
              minWidth: 0,
              background: isActive ? CHAMPAGNE_ACTIVE : 'transparent',
              border: isActive ? '1px solid rgba(226, 194, 144, 0.65)' : '1px solid transparent',
              borderRadius: '15px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              cursor: 'pointer',
              outline: 'none',
              padding: 0,
              color,
              transition: 'all 0.2s ease'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: isActive ? 'translateY(-1px)' : 'none',
                transition: 'transform 0.2s ease'
              }}
            >
              {tab.icon}
            </div>
            <span
              style={{
                fontSize: '10px',
                fontWeight: '800',
                letterSpacing: '0.2px',
                lineHeight: 1,
                color,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '92%'
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
