import React from 'react';

const TabIcons = {
  home: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}>
      <path d="M3 10.5L12 3l9 7.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9.5z" /><path d="M9 22V12h6v10" />
    </svg>
  ),
  tasks: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}>
      <rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1z" /><line x1="9" y1="10" x2="15" y2="10" /><line x1="9" y1="14" x2="15" y2="14" /><line x1="9" y1="18" x2="13" y2="18" />
    </svg>
  ),
  wallet: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}>
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  ),
  leaderboard: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}>
      <path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10" /><path d="M17 4v8a5 5 0 0 1-10 0V4" /><path d="M7 4H4v3a2 2 0 0 0 2 2h1" /><path d="M17 4h3v3a2 2 0 0 1-2 2h-1" />
    </svg>
  ),
  referrals: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}>
      <circle cx="9" cy="7" r="3.5" /><path d="M2 19a7 7 0 0 1 14 0v1H2v-1z" /><circle cx="17" cy="8" r="2.5" /><path d="M16 14.5a5.5 5.5 0 0 1 6 4.5v1h-3" />
    </svg>
  ),
  admin: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
};

export default function BottomNav({ activeTab, setActiveTab, userData, t }) {
  // 🔥 BLINDAJE: Consistencia de Admins con el Backend
  const ADMIN_IDS = ['8968109534', '8892196101'];
  const isAdmin = userData && ADMIN_IDS.includes(String(userData.id));

  const getLabel = (key, fallback) => {
    const val = t(key);
    return val === key ? fallback : val;
  };

  // Nuevos colores corporativos, más elegantes y brillantes
  const tabs = [
    { id: 'home', label: getLabel('nav_home', 'INICIO'), icon: TabIcons.home, color: '#3B82F6' }, // Azul fuerte
    { id: 'tasks', label: getLabel('nav_tasks', 'TAREAS'), icon: TabIcons.tasks, color: '#06B6D4' }, // Cian vibrante
    { id: 'wallet', label: getLabel('nav_wallet', 'BÓVEDA'), icon: TabIcons.wallet, color: '#10B981' }, // Verde esmeralda
    { id: 'leaderboard', label: getLabel('nav_leaderboard', 'RANKING'), icon: TabIcons.leaderboard, color: '#F59E0B' }, // Naranja/Ambar
    { id: 'referrals', label: getLabel('nav_referrals', 'RED'), icon: TabIcons.referrals, color: '#8B5CF6' } // Morado Fintech
  ];

  if (isAdmin) tabs.push({ id: 'admin', label: getLabel('nav_admin', 'ADMIN'), icon: TabIcons.admin, color: '#EF4444' }); // Rojo alerta

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, 
      backgroundColor: 'rgba(11, 13, 20, 0.85)', backdropFilter: 'blur(16px)',
      display: 'flex', justifyContent: 'space-around', alignItems: 'center', 
      padding: '8px 8px 16px 8px', borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.5)', zIndex: 99999, userSelect: 'none'
    }}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, maxWidth: '75px', height: '54px', 
              backgroundColor: isActive ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              border: 'none', borderRadius: '16px', 
              boxShadow: isActive ? `inset 0 0 15px ${tab.color}30` : 'none', 
              display: 'flex', flexDirection: 'column', 
              alignItems: 'center', justifyContent: 'center', gap: '5px', 
              cursor: 'pointer', outline: 'none', 
              padding: 0, color: isActive ? tab.color : '#6B7280', 
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <div style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                transform: isActive ? 'scale(1.15) translateY(-2px)' : 'scale(1)', 
                transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)' 
            }}>
              {tab.icon}
            </div>
            <span style={{ 
                fontSize: '10px', fontWeight: '800', letterSpacing: '0.2px', lineHeight: 1, 
                color: isActive ? tab.color : '#6B7280',
                textShadow: isActive ? `0 0 10px ${tab.color}50` : 'none',
                transition: 'color 0.25s ease'
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
