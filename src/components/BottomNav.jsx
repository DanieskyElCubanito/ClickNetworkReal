import React from 'react';

const TabIcons = {
  home: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff41b4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 4px rgba(255,65,180,0.5))' }}>
      <path d="M3 10.5L12 3l9 7.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9.5z" /><path d="M9 22V12h6v10" />
    </svg>
  ),
  tasks: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 4px rgba(0,240,255,0.5))' }}>
      <rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1z" /><line x1="9" y1="10" x2="15" y2="10" /><line x1="9" y1="14" x2="15" y2="14" /><line x1="9" y1="18" x2="13" y2="18" />
    </svg>
  ),
  wallet: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00ffaa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 4px rgba(0,255,170,0.5))' }}>
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  ),
  leaderboard: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffaa00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 4px rgba(255,170,0,0.5))' }}>
      <path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10" /><path d="M17 4v8a5 5 0 0 1-10 0V4" /><path d="M7 4H4v3a2 2 0 0 0 2 2h1" /><path d="M17 4h3v3a2 2 0 0 1-2 2h-1" />
    </svg>
  ),
  referrals: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8a2be2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 4px rgba(138,43,226,0.5))' }}>
      <circle cx="9" cy="7" r="3.5" /><path d="M2 19a7 7 0 0 1 14 0v1H2v-1z" /><circle cx="17" cy="8" r="2.5" /><path d="M16 14.5a5.5 5.5 0 0 1 6 4.5v1h-3" />
    </svg>
  ),
  admin: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffe600" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 4px rgba(255,230,0,0.5))' }}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
};

export default function BottomNav({ activeTab, setActiveTab, userData, t }) {
  const ADMIN_IDS = ['8968109534', '8968109534'];
  const isAdmin = userData && ADMIN_IDS.includes(String(userData.id));

  const getLabel = (key, fallback) => {
    const val = t(key);
    return val === key ? fallback : val;
  };

  const tabs = [
    { id: 'home', label: getLabel('nav_home', 'INICIO'), icon: TabIcons.home, color: '#ff41b4' },
    { id: 'tasks', label: getLabel('nav_tasks', 'TAREAS'), icon: TabIcons.tasks, color: '#00f0ff' },
    { id: 'wallet', label: getLabel('nav_wallet', 'BANCO'), icon: TabIcons.wallet, color: '#00ffaa' },
    { id: 'leaderboard', label: getLabel('nav_leaderboard', 'TOP'), icon: TabIcons.leaderboard, color: '#ffaa00' },
    { id: 'referrals', label: getLabel('nav_referrals', 'AMIGOS'), icon: TabIcons.referrals, color: '#8a2be2' }
  ];

  if (isAdmin) tabs.push({ id: 'admin', label: getLabel('nav_admin', 'ADMIN'), icon: TabIcons.admin, color: '#ffe600' });

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(10, 3, 20, 0.95)', backdropFilter: 'blur(16px)',
      display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '8px 8px 16px 8px', borderTop: '2px solid #8a2be2',
      boxShadow: '0 -4px 20px rgba(138, 43, 226, 0.3)', zIndex: 99999, userSelect: 'none'
    }}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, maxWidth: '75px', height: '54px', backgroundColor: isActive ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              border: isActive ? `2px solid ${tab.color}` : '2px solid transparent', borderRadius: '14px', 
              boxShadow: isActive ? `0 0 10px ${tab.color}40` : 'none', display: 'flex', flexDirection: 'column', 
              alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer', outline: 'none', 
              padding: 0, color: '#000000', transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', transform: isActive ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.2s' }}>
              {tab.icon}
            </div>
            <span style={{ fontSize: '10px', fontWeight: '900', letterSpacing: '-0.3px', lineHeight: 1, color: isActive ? tab.color : '#888' }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
