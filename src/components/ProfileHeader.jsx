import React, { useState } from 'react';
import WebApp from '@twa-dev/sdk';

const Icons = {
  verify: <svg width="16" height="16" viewBox="0 0 24 24" fill="#00ffaa" stroke="#050214" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  gear: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff99dd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  history: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  close: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff4b4b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  doc: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  globe: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff99dd" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
};

export default function ProfileHeader({ userData, t, lang, setLang }) {
  const [showSettings, setShowSettings] = useState(false);

  const toggleLang = () => {
    const newLang = lang === 'es' ? 'en' : 'es';
    setLang(newLang);
    localStorage.setItem('click_lang', newLang);
  };

  const username = userData?.username || "Usuario";
  const avatarLetter = username.charAt(0).toUpperCase();

  const openLink = (url) => {
    WebApp.openTelegramLink(url);
    setShowSettings(false);
  };

  return (
    <>
      <div style={{
        background: 'linear-gradient(135deg, rgba(20, 8, 38, 0.95), rgba(46, 16, 77, 0.9))',
        borderBottom: '2px solid #8a2be2',
        borderRadius: '0 0 24px 24px',
        padding: '24px 20px',
        marginBottom: '20px',
        boxShadow: '0 8px 25px rgba(138, 43, 226, 0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          {/* Info del Usuario */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '50px', height: '50px', borderRadius: '16px',
              background: 'linear-gradient(135deg, #00f0ff, #ff1493)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 15px rgba(0, 240, 255, 0.4)',
              border: '2px solid rgba(255, 255, 255, 0.2)'
            }}>
              <span style={{ fontSize: '22px', fontWeight: '900', color: '#fff' }}>{avatarLetter}</span>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#fff', letterSpacing: '0.5px' }}>
                  {username}
                </h2>
                {userData?.is_human && Icons.verify}
              </div>
              <div style={{ fontSize: '11px', color: '#ff99dd', fontWeight: 'bold', fontFamily: 'monospace', marginTop: '4px' }}>
                ID: {userData?.id}
              </div>
            </div>
          </div>

          {/* Botones Superiores (Historial y Ajustes) */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => alert("El historial se abrirá aquí")} style={{
              background: 'rgba(0, 240, 255, 0.1)', border: '1px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '12px', width: '38px', height: '38px', display: 'flex', 
              alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
            }}>
              {Icons.history}
            </button>
            <button onClick={() => setShowSettings(true)} style={{
              background: 'rgba(255, 153, 221, 0.1)', border: '1px solid rgba(255, 153, 221, 0.3)',
              borderRadius: '12px', width: '38px', height: '38px', display: 'flex', 
              alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
            }}>
              {Icons.gear}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE AJUSTES */}
      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(5, 2, 20, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 100000 }}>
          <div style={{ background: 'linear-gradient(145deg, rgba(20, 8, 38, 0.95), rgba(46, 16, 77, 0.9))', width: '100%', maxWidth: '320px', border: '1px solid #ff99dd', borderRadius: '24px', padding: '24px', position: 'relative' }}>
            
            <button onClick={() => setShowSettings(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
              {Icons.close}
            </button>
            
            <h3 style={{ margin: '0 0 20px 0', fontWeight: '900', color: '#ff99dd', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {Icons.gear} Ajustes
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Idioma */}
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #3d1b63' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>
                  {Icons.globe} Idioma
                </div>
                <button onClick={toggleLang} style={{ background: '#ff1493', border: 'none', borderRadius: '8px', padding: '6px 12px', color: '#fff', fontWeight: '900', fontSize: '12px', cursor: 'pointer' }}>
                  {lang === 'es' ? 'ESPAÑOL' : 'ENGLISH'}
                </button>
              </div>

              {/* Términos */}
              <div onClick={() => openLink('https://t.me/TuCanalTerminos')} style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #3d1b63', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>
                  {Icons.doc} Términos y Soporte
                </div>
                <div style={{ color: '#00f0ff', fontWeight: '900' }}>➔</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
