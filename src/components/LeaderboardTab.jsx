import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import WebApp from '@twa-dev/sdk';

const neon = {
  container: { color: '#ffffff', paddingBottom: '20px' },
  title: { fontSize: '22px', fontWeight: '900', textAlign: 'center', letterSpacing: '1px', textTransform: 'uppercase', margin: '10px 0 20px 0', color: '#00f0ff', textShadow: '0 0 15px rgba(0, 240, 255, 0.4)' },
  bannerCard: { background: 'linear-gradient(135deg, rgba(255, 20, 147, 0.2), rgba(138, 43, 226, 0.4))', border: '2px solid #ff1493', borderRadius: '24px', padding: '20px', marginBottom: '20px', textAlign: 'center', boxShadow: '0 8px 25px rgba(255, 20, 147, 0.3)' },
  tabContainer: { display: 'flex', gap: '10px', marginBottom: '20px', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '20px' },
  tabBtn: (active) => ({ flex: 1, padding: '12px', borderRadius: '14px', fontWeight: '900', fontSize: '13px', border: 'none', cursor: 'pointer', transition: '0.3s', background: active ? 'linear-gradient(90deg, #ff1493, #8a2be2)' : 'transparent', color: active ? '#ffffff' : '#ff99dd', boxShadow: active ? '0 4px 15px rgba(255,20,147,0.3)' : 'none', textTransform: 'uppercase' }),
  rowCard: { background: 'rgba(15, 5, 28, 0.8)', border: '1px solid #8a2be2', borderRadius: '16px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }
};

export default function LeaderboardTab({ userData, t }) {
  const [tab, setTab] = useState('tasks'); // 'tasks' o 'referrals'
  const [topTasks, setTopTasks] = useState([]);
  const [topReferrals, setTopReferrals] = useState([]);
  const [loading, setLoading] = useState(true);

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
  }, []);

  const handleCopyRefLink = () => {
    const refLink = `https://t.me/TeleGemAds_bot/app?startapp=${userData?.id}`;
    navigator.clipboard.writeText(refLink);
    toast.success("¡Enlace de referido copiado al portapapeles!");
  };

  return (
    <div style={neon.container} className="fade-in">
      <Toaster position="top-center" />
      <h2 style={neon.title}>🏆 Salón de la Fama</h2>

      {/* 🚀 BANNER LLAMATIVO DE REFERIDOS */}
      <div style={neon.bannerCard}>
        <div style={{ fontSize: '18px', fontWeight: '900', color: '#fff', marginBottom: '8px' }}>
          «Gana un 20% de por vida de lo que generen tus amigos»
        </div>
        <div style={{ fontSize: '12px', color: '#ff99dd', marginBottom: '16px', lineHeight: '1.4' }}>
          Comparte tu enlace único, compite en el reto mensual y gana bonos extra de TON directos a tu wallet.
        </div>
        <button 
          onClick={handleCopyRefLink}
          style={{ background: 'linear-gradient(180deg, #00f0ff, #0088ff)', color: '#050214', border: 'none', borderRadius: '14px', padding: '12px 24px', fontWeight: '900', fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,240,255,0.4)', textTransform: 'uppercase' }}
        >
          🔗 COPIAR MI ENLACE VIP
        </button>
      </div>

      {/* PESTAÑAS DE NAVEGACIÓN DEL TOP */}
      <div style={neon.tabContainer}>
        <button onClick={() => setTab('tasks')} style={neon.tabBtn(tab === 'tasks')}>
          🔥 Top Completores
        </button>
        <button onClick={() => setTab('referrals')} style={neon.tabBtn(tab === 'referrals')}>
          👥 Top Referidores
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px', color: '#00f0ff', fontWeight: 'bold' }}>Cargando leyendas...</div>
      ) : (
        <div>
          {tab === 'tasks' && (
            <div>
              {topTasks.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#aaa', padding: '20px' }}>Aún no hay registros en este ranking.</div>
              ) : (
                topTasks.map((item, index) => (
                  <div key={item.id} style={neon.rowCard}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ fontSize: '16px', fontWeight: '900', color: index === 0 ? '#ffe600' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#8a2be2', width: '24px', textAlign: 'center' }}>
                        #{index + 1}
                      </div>
                      <div style={{ fontWeight: '900', color: '#fff', fontSize: '14px' }}>
                        @{item.username !== 'Usuario' ? item.username : `ID: ${item.id.substring(0, 6)}...`}
                      </div>
                    </div>
                    <div style={{ color: '#00f0ff', fontWeight: '900', fontSize: '13px' }}>
                      {item.score} Tareas 🎯
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'referrals' && (
            <div>
              {topReferrals.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#aaa', padding: '20px' }}>Aún no hay registros en este ranking.</div>
              ) : (
                topReferrals.map((item, index) => (
                  <div key={item.id} style={neon.rowCard}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ fontSize: '16px', fontWeight: '900', color: index === 0 ? '#ffe600' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#8a2be2', width: '24px', textAlign: 'center' }}>
                        #{index + 1}
                      </div>
                      <div style={{ fontWeight: '900', color: '#fff', fontSize: '14px' }}>
                        @{item.username !== 'Usuario' ? item.username : `ID: ${item.id.substring(0, 6)}...`}
                      </div>
                    </div>
                    <div style={{ color: '#00ffaa', fontWeight: '900', fontSize: '13px' }}>
                      {(Number(item.referral_earnings || 0) * 1000).toFixed(2)} 💎
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
