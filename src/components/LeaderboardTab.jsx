import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import WebApp from '@twa-dev/sdk';

const neon = {
  container: { color: '#ffffff', paddingBottom: '20px' },
  title: { fontSize: '22px', fontWeight: '900', textAlign: 'center', letterSpacing: '1px', textTransform: 'uppercase', margin: '10px 0 20px 0', color: '#00f0ff', textShadow: '0 0 15px rgba(0, 240, 255, 0.4)' },
  bannerCard: { background: 'linear-gradient(135deg, rgba(255, 20, 147, 0.15), rgba(138, 43, 226, 0.3))', border: '2px solid #ff1493', borderRadius: '24px', padding: '20px', marginBottom: '20px', textAlign: 'center', boxShadow: '0 8px 25px rgba(255, 20, 147, 0.25)' },
  tabContainer: { display: 'flex', gap: '10px', marginBottom: '20px', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '20px' },
  tabBtn: (active) => ({ flex: 1, padding: '12px', borderRadius: '14px', fontWeight: '900', fontSize: '13px', border: 'none', cursor: 'pointer', transition: '0.3s', background: active ? 'linear-gradient(90deg, #ff1493, #8a2be2)' : 'transparent', color: active ? '#ffffff' : '#ff99dd', boxShadow: active ? '0 4px 15px rgba(255,20,147,0.3)' : 'none', textTransform: 'uppercase' }),
  rowCard: (isTop3) => ({ background: isTop3 ? 'linear-gradient(90deg, rgba(255, 230, 0, 0.1), rgba(15, 5, 28, 0.8))' : 'rgba(15, 5, 28, 0.8)', border: `1px solid ${isTop3 ? '#ffe600' : '#8a2be2'}`, borderRadius: '16px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', boxShadow: isTop3 ? '0 0 15px rgba(255, 230, 0, 0.15)' : '0 4px 10px rgba(0,0,0,0.3)' })
};

export default function LeaderboardTab({ userData, t }) {
  const [tab, setTab] = useState('referrals'); 
  const [topTasks, setTopTasks] = useState([]);
  const [topReferrals, setTopReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState('');

  const apiHeaders = { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': WebApp.initData || '' };

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch('/api', {
          method: 'POST',
          headers: apiHeaders,
          body: JSON.stringify({ action: 'get-leaderboard' })
        });
        const data = await res.json();
        if (data.success) {
          setTopTasks(data.topTasks || []);
          setTopReferrals(data.topReferrals || []);
        }
      } catch (e) {
        console.error("Error al cargar leaderboard", e);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();

    // 🛠️ Calcular días restantes para el Domingo (Fin del torneo semanal)
    const calcTimeLeft = () => {
      const now = new Date();
      const endOfWeek = new Date();
      endOfWeek.setDate(now.getDate() + (7 - now.getDay())); // Próximo domingo
      endOfWeek.setHours(23, 59, 59, 999);
      const diff = endOfWeek - now;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      setTimeLeft(`${days}d ${hours}h`);
    };
    calcTimeLeft();
  }, []);

  const handleCopyRefLink = () => {
    const refLink = `https://t.me/TeleGemAds_bot/app?startapp=${userData?.id}`;
    navigator.clipboard.writeText(refLink);
    toast.success("¡Enlace de referido copiado al portapapeles!");
  };

  const getMedal = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  return (
    <div style={neon.container} className="fade-in">
      <Toaster position="top-center" />
      <h2 style={neon.title}>🏆 Salón de la Fama</h2>

      {/* 🚀 BANNER LLAMATIVO DEL TORNEO SEMANAL */}
      <div style={neon.bannerCard}>
        <div style={{ background: 'rgba(255, 230, 0, 0.2)', color: '#ffe600', padding: '4px 12px', borderRadius: '12px', fontSize: '10px', fontWeight: '900', display: 'inline-block', marginBottom: '10px', textTransform: 'uppercase', border: '1px solid #ffe600' }}>
          ⏳ Cierra en: {timeLeft}
        </div>
        <div style={{ fontSize: '18px', fontWeight: '900', color: '#fff', marginBottom: '8px', lineHeight: '1.2' }}>
          ¡Concurso Semanal de Afiliados!
        </div>
        <div style={{ fontSize: '12px', color: '#ff99dd', marginBottom: '16px', lineHeight: '1.4' }}>
          Los <b>3 usuarios</b> con más ingresos de referidos ganarán un bono extra de <b>TON</b> enviado directamente a sus billeteras. ¡Además del 20% que ganas de por vida!
        </div>
        <button 
          onClick={handleCopyRefLink}
          style={{ width: '100%', background: 'linear-gradient(180deg, #ffe600, #ffaa00)', color: '#050214', border: 'none', borderRadius: '14px', padding: '14px', fontWeight: '900', fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(255, 170, 0, 0.4)', textTransform: 'uppercase' }}
        >
          🔗 COPIAR MI ENLACE Y COMPETIR
        </button>
      </div>

      {/* PESTAÑAS DE NAVEGACIÓN DEL TOP */}
      <div style={neon.tabContainer}>
        <button onClick={() => setTab('referrals')} style={neon.tabBtn(tab === 'referrals')}>
          👥 Torneo Afiliados
        </button>
        <button onClick={() => setTab('tasks')} style={neon.tabBtn(tab === 'tasks')}>
          🔥 Top Activos
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px', color: '#00f0ff', fontWeight: 'bold' }}>Cargando ranking en vivo...</div>
      ) : (
        <div>
          {tab === 'referrals' && (
            <div className="fade-in">
              {topReferrals.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#aaa', padding: '20px' }}>La competencia acaba de empezar. ¡Sé el primero!</div>
              ) : (
                topReferrals.map((item, index) => {
                  const isTop3 = index < 3;
                  return (
                  <div key={item.id} style={neon.rowCard(isTop3)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ fontSize: '20px', fontWeight: '900', color: isTop3 ? '#ffe600' : '#8a2be2', width: '30px', textAlign: 'center' }}>
                        {getMedal(index)}
                      </div>
                      <div>
                        <div style={{ fontWeight: '900', color: '#fff', fontSize: '14px' }}>
                          @{item.username !== 'Usuario' ? item.username : `ID: ${item.id.substring(0, 5)}...`}
                          {userData?.id === item.id && <span style={{ color: '#00ffaa', fontSize: '10px', marginLeft: '6px' }}>(TÚ)</span>}
                        </div>
                        {isTop3 && (
                          <div style={{ color: '#ffe600', fontSize: '10px', fontWeight: 'bold', marginTop: '2px' }}>
                            🎁 Clasifica para Bono TON
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ color: isTop3 ? '#ffe600' : '#00ffaa', fontWeight: '900', fontSize: '14px' }}>
                      {(Number(item.referral_earnings || 0) * 1000).toFixed(2)} 💎
                    </div>
                  </div>
                )})
              )}
            </div>
          )}

          {tab === 'tasks' && (
            <div className="fade-in">
              {topTasks.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#aaa', padding: '20px' }}>Aún no hay registros en este ranking.</div>
              ) : (
                topTasks.map((item, index) => {
                  const isTop3 = index < 3;
                  return (
                  <div key={item.id} style={neon.rowCard(false)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ fontSize: '18px', fontWeight: '900', color: isTop3 ? '#00f0ff' : '#8a2be2', width: '30px', textAlign: 'center' }}>
                        {getMedal(index)}
                      </div>
                      <div style={{ fontWeight: '900', color: '#fff', fontSize: '14px' }}>
                        @{item.username !== 'Usuario' ? item.username : `ID: ${item.id.substring(0, 5)}...`}
                        {userData?.id === item.id && <span style={{ color: '#00ffaa', fontSize: '10px', marginLeft: '6px' }}>(TÚ)</span>}
                      </div>
                    </div>
                    <div style={{ color: '#00f0ff', fontWeight: '900', fontSize: '13px' }}>
                      {item.score} 💎
                    </div>
                  </div>
                )})
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
