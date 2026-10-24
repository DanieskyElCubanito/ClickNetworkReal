import React, { useState, useEffect } from 'react';
import { botApi } from '../api/botApi';
import WebApp from '@twa-dev/sdk';

const Icons = {
  redGem: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 0 8px rgba(255, 20, 20, 0.8))' }}>
      <path d="M12 22L2 9L6 2H18L22 9L12 22Z" fill="url(#redGradient)" stroke="#ff1414" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M2 9H22" stroke="#ff1414" strokeWidth="1.5"/>
      <path d="M6 2L12 22M18 2L12 22" stroke="#ff1414" strokeWidth="1.5" opacity="0.6"/>
      <defs><linearGradient id="redGradient" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse"><stop stopColor="#ff4b4b" /><stop offset="1" stopColor="#8b0000" /></linearGradient></defs>
    </svg>
  ),
  global: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
  ),
  lightning: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffe600" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
  ),
  history: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00ffaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  ),
  support: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff99dd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
  ),
  doc: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
  )
};

const neonStyles = {
  card: {
    background: 'linear-gradient(145deg, rgba(20, 8, 38, 0.9), rgba(15, 5, 28, 0.95))', border: '1px solid rgba(0, 240, 255, 0.3)', 
    borderRadius: '20px', padding: '16px', marginBottom: '16px', boxShadow: '0 8px 25px rgba(0, 0, 0, 0.5), inset 0 2px 10px rgba(0, 240, 255, 0.05)'
  },
  actionCard: {
    background: 'rgba(25, 10, 45, 0.6)', border: '1.5px solid #3d1b63', borderRadius: '16px', padding: '16px', 
    marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer'
  }
};

export default function HomeTab({ userData, setActiveTab, t }) {
  const [history, setHistory] = useState([]);
  const gemBalance = Math.floor(Number(userData?.balance || 0) * 1000);
  const gemEarnings = Math.floor(Number(userData?.total_earnings || 0) * 1000);

  useEffect(() => {
    if (userData?.id) {
      botApi.getHistory(userData.id).then(data => {
        if (data && data.success) setHistory(data.history || []);
      });
    }
  }, [userData?.id]);

  const openLink = (url) => WebApp.openTelegramLink(url);

  return (
    <div className="fade-in" style={{ paddingBottom: '20px' }}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <div style={{ ...neonStyles.card, flex: 1, margin: 0, padding: '12px', display: 'flex', alignItems: 'center', gap: '8px', borderColor: '#00f0ff' }}>
          {Icons.global}
          <div>
            <div style={{ fontSize: '10px', color: '#00f0ff', fontWeight: '900', textTransform: 'uppercase' }}>Globales</div>
            <div style={{ fontSize: '14px', color: '#fff', fontWeight: '900' }}>{userData?.global_clicks || 0}</div>
          </div>
        </div>
        <div style={{ ...neonStyles.card, flex: 1, margin: 0, padding: '12px', display: 'flex', alignItems: 'center', gap: '8px', borderColor: '#ffe600' }}>
          {Icons.lightning}
          <div>
            <div style={{ fontSize: '10px', color: '#ffe600', fontWeight: '900', textTransform: 'uppercase' }}>Recibidos</div>
            <div style={{ fontSize: '14px', color: '#fff', fontWeight: '900' }}>{userData?.received_clicks || 0}</div>
          </div>
        </div>
      </div>

      <div style={{ ...neonStyles.card, textAlign: 'center', borderColor: '#ff1414', background: 'linear-gradient(135deg, rgba(38, 8, 8, 0.8), rgba(20, 5, 5, 0.95))', boxShadow: '0 8px 25px rgba(255, 20, 20, 0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>{Icons.redGem}</div>
        <div style={{ fontSize: '12px', fontWeight: '900', color: '#ff9999', textTransform: 'uppercase', letterSpacing: '1px' }}>Balance de Gemas</div>
        <div style={{ fontSize: '46px', fontWeight: '900', color: '#ffffff', margin: '4px 0', textShadow: '0 0 20px rgba(255, 20, 20, 0.5)' }}>{gemBalance}</div>
        <div style={{ fontSize: '11px', color: '#00ffaa', fontWeight: 'bold', marginBottom: '14px' }}>Ganancias Históricas: {gemEarnings} 💎</div>
      </div>

      <h3 style={{ fontSize: '14px', fontWeight: '900', color: '#00ffaa', marginBottom: '12px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
        {Icons.history} Historial Reciente
      </h3>
      <div style={{ ...neonStyles.card, borderColor: '#00ffaa', padding: '12px', maxHeight: '180px', overflowY: 'auto' }}>
        {history.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#888', fontSize: '12px' }}>Aún no hay transacciones.</div>
        ) : (
          history.slice(0, 10).map((log, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: idx < history.length - 1 ? '1px solid #3d1b63' : 'none' }}>
              <div>
                <div style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>{log.title}</div>
                <div style={{ color: '#aaa', fontSize: '10px' }}>{log.description}</div>
              </div>
              <div style={{ color: log.amount >= 0 ? '#00ffaa' : '#ff4b4b', fontWeight: '900', fontSize: '13px' }}>
                {log.amount > 0 ? '+' : ''}{Math.floor(log.amount * 1000)}
              </div>
            </div>
          ))
        )}
      </div>

      <h3 style={{ fontSize: '14px', fontWeight: '900', color: '#ff99dd', marginBottom: '12px', textTransform: 'uppercase' }}>Comunidad</h3>
      <div onClick={() => openLink('https://t.me/TuCanalSoporte')} style={{ ...neonStyles.actionCard, borderColor: '#ff99dd' }}>
        <div style={{ width: '40px', height: '40px', background: 'rgba(255, 153, 221, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Icons.support}</div>
        <div style={{ color: '#fff', fontSize: '15px', fontWeight: '900' }}>Soporte Técnico</div>
      </div>
      <div onClick={() => openLink('https://t.me/TuCanalTerminos')} style={{ ...neonStyles.actionCard, borderColor: '#00f0ff' }}>
        <div style={{ width: '40px', height: '40px', background: 'rgba(0, 240, 255, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Icons.doc}</div>
        <div style={{ color: '#fff', fontSize: '15px', fontWeight: '900' }}>Términos y Condiciones</div>
      </div>
    </div>
  );
}
