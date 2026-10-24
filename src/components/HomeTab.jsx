import React from 'react';

const Icons = {
  redGem: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 0 8px rgba(255, 20, 20, 0.8))' }}>
      <path d="M12 22L2 9L6 2H18L22 9L12 22Z" fill="url(#redGradient)" stroke="#ff1414" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M2 9H22" stroke="#ff1414" strokeWidth="1.5"/>
      <path d="M6 2L12 22M18 2L12 22" stroke="#ff1414" strokeWidth="1.5" opacity="0.6"/>
      <defs>
        <linearGradient id="redGradient" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ff4b4b" />
          <stop offset="1" stopColor="#8b0000" />
        </linearGradient>
      </defs>
    </svg>
  ),
  global: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2" style={{ filter: 'drop-shadow(0 0 4px #00f0ff)' }}>
      <circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  lightning: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffe600" strokeWidth="2" style={{ filter: 'drop-shadow(0 0 4px #ffe600)' }}>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  ),
  megaphone: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00ffaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.5 13.5c-1 3-3 4.5-4.5"/>
    </svg>
  ),
  users: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8a2be2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
};

const neonStyles = {
  card: {
    background: 'linear-gradient(145deg, rgba(20, 8, 38, 0.9), rgba(15, 5, 28, 0.95))',
    border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: '20px', padding: '16px', marginBottom: '16px',
    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.5), inset 0 2px 10px rgba(0, 240, 255, 0.05)'
  },
  actionCard: {
    background: 'rgba(25, 10, 45, 0.6)', border: '1.5px solid #3d1b63', borderRadius: '16px', 
    padding: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '14px', 
    cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative', overflow: 'hidden'
  }
};

export default function HomeTab({ userData, setActiveTab, t }) {
  // 🔥 Transformamos los dólares a Gemas (x1000)
  const gemBalance = Math.floor(Number(userData?.balance || 0) * 1000);
  const gemEarnings = Math.floor(Number(userData?.total_earnings || 0) * 1000);

  return (
    <div className="fade-in" style={{ paddingBottom: '20px' }}>
      
      {/* ESTADÍSTICAS GLOBALES */}
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

      {/* TARJETA DE SALDO PRINCIPAL (GEMAS) */}
      <div style={{ ...neonStyles.card, textAlign: 'center', borderColor: '#ff1414', background: 'linear-gradient(135deg, rgba(38, 8, 8, 0.8), rgba(20, 5, 5, 0.95))', boxShadow: '0 8px 25px rgba(255, 20, 20, 0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
          {Icons.redGem}
        </div>
        <div style={{ fontSize: '12px', fontWeight: '900', color: '#ff9999', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Balance de Gemas
        </div>
        <div style={{ fontSize: '46px', fontWeight: '900', color: '#ffffff', margin: '4px 0', textShadow: '0 0 20px rgba(255, 20, 20, 0.5)' }}>
          {gemBalance}
        </div>
        <div style={{ fontSize: '11px', color: '#00ffaa', fontWeight: 'bold', marginBottom: '14px' }}>
          Ganancias Históricas: {gemEarnings} 💎
        </div>

        <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '10px', padding: '10px', fontSize: '11px', color: '#ccc', lineHeight: '1.4', border: '1px dashed #ff1414', textAlign: 'left' }}>
          <strong style={{ color: '#ff4b4b' }}>Importante:</strong> Las Gemas 💎 son la moneda oficial. Tienen paridad con el USDT (1000 Gemas = 1 USDT). El saldo depositado externamente es exclusivo para crear campañas.
        </div>
      </div>

      {/* ACCIONES RÁPIDAS */}
      <h3 style={{ fontSize: '14px', fontWeight: '900', color: '#00f0ff', marginBottom: '12px', textTransform: 'uppercase' }}>Acciones Rápidas</h3>

      <div onClick={() => setActiveTab('tasks')} style={{ ...neonStyles.actionCard, borderColor: '#00f0ff' }}>
        <div style={{ width: '40px', height: '40px', background: 'rgba(0, 240, 255, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {Icons.redGem}
        </div>
        <div>
          <div style={{ color: '#fff', fontSize: '15px', fontWeight: '900' }}>Ganar Gemas</div>
          <div style={{ color: '#ff99dd', fontSize: '11px', fontWeight: 'bold', marginTop: '2px' }}>Completa tareas y acumula saldo.</div>
        </div>
        <div style={{ position: 'absolute', right: '16px', color: '#00f0ff', fontWeight: '900' }}>➔</div>
      </div>

      <div onClick={() => setActiveTab('tasks')} style={{ ...neonStyles.actionCard, borderColor: '#00ffaa' }}>
        <div style={{ width: '40px', height: '40px', background: 'rgba(0, 255, 170, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {Icons.megaphone}
        </div>
        <div>
          <div style={{ color: '#fff', fontSize: '15px', fontWeight: '900' }}>Comprar Tráfico</div>
          <div style={{ color: '#ff99dd', fontSize: '11px', fontWeight: 'bold', marginTop: '2px' }}>Usa tus gemas para impulsar tu canal.</div>
        </div>
        <div style={{ position: 'absolute', right: '16px', color: '#00ffaa', fontWeight: '900' }}>➔</div>
      </div>

      <div onClick={() => setActiveTab('referrals')} style={{ ...neonStyles.actionCard, borderColor: '#8a2be2' }}>
        <div style={{ width: '40px', height: '40px', background: 'rgba(138, 43, 226, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {Icons.users}
        </div>
        <div style={{ paddingRight: '20px' }}>
          <div style={{ color: '#fff', fontSize: '15px', fontWeight: '900' }}>Invita y Gana</div>
          <div style={{ color: '#ff99dd', fontSize: '11px', fontWeight: 'bold', marginTop: '2px', lineHeight: '1.3' }}>
            Recibe el <span style={{ color: '#00f0ff' }}>20%</span> de las ganancias de tus referidos de por vida.
          </div>
        </div>
        <div style={{ position: 'absolute', right: '16px', color: '#8a2be2', fontWeight: '900' }}>➔</div>
      </div>
    </div>
  );
}
