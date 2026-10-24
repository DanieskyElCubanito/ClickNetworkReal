import React from 'react';

const Icons = {
  verify: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#00ffaa" stroke="#050214" strokeWidth="1">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
};

export default function ProfileHeader({ userData, t, lang, setLang }) {
  const toggleLang = () => {
    const newLang = lang === 'es' ? 'en' : 'es';
    setLang(newLang);
    localStorage.setItem('click_lang', newLang);
  };

  const username = userData?.username || "Usuario";
  const avatarLetter = username.charAt(0).toUpperCase();

  return (
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

        {/* Botón de Idioma */}
        <button onClick={toggleLang} style={{
          background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 153, 221, 0.3)',
          borderRadius: '12px', width: '36px', height: '36px', display: 'flex', 
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer', outline: 'none'
        }}>
          <span style={{ fontSize: '13px', fontWeight: '900', color: '#ff99dd' }}>{lang.toUpperCase()}</span>
        </button>
      </div>
    </div>
  );
}
