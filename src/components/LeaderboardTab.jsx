import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import WebApp from '@twa-dev/sdk';

const neon = {
  container: { color: '#ffffff', paddingBottom: '20px' },
  title: { fontSize: '22px', fontWeight: '900', textAlign: 'center', letterSpacing: '1px', textTransform: 'uppercase', margin: '10px 0 20px 0', color: '#00f0ff', textShadow: '0 0 15px rgba(0, 240, 255, 0.4)' },
  eventCard: { background: 'linear-gradient(135deg, rgba(255, 230, 0, 0.15), rgba(255, 170, 0, 0.25))', border: '2px solid #ffe600', borderRadius: '24px', padding: '20px', marginBottom: '20px', textAlign: 'center', boxShadow: '0 8px 30px rgba(255, 230, 0, 0.2)' },
  tabContainer: { display: 'flex', gap: '10px', marginBottom: '20px', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '20px' },
  tabBtn: (active) => ({ flex: 1, padding: '12px', borderRadius: '14px', fontWeight: '900', fontSize: '13px', border: 'none', cursor: 'pointer', transition: '0.3s', background: active ? 'linear-gradient(90deg, #ff1493, #8a2be2)' : 'transparent', color: active ? '#ffffff' : '#ff99dd', boxShadow: active ? '0 4px 15px rgba(255,20,147,0.3)' : 'none', textTransform: 'uppercase' }),
  rowCard: (isTop3, type) => ({ 
    background: isTop3 
      ? (type === 'event' ? 'linear-gradient(90deg, rgba(255, 230, 0, 0.15), rgba(15, 5, 28, 0.9))' : 'linear-gradient(90deg, rgba(0, 240, 255, 0.15), rgba(15, 5, 28, 0.9))') 
      : 'rgba(15, 5, 28, 0.8)', 
    border: `1px solid ${isTop3 ? (type === 'event' ? '#ffe600' : '#00f0ff') : '#8a2be2'}`, 
    borderRadius: '16px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', 
    boxShadow: isTop3 ? `0 0 15px ${type === 'event' ? 'rgba(255, 230, 0, 0.2)' : 'rgba(0, 240, 255, 0.2)'}` : '0 4px 10px rgba(0,0,0,0.3)' 
  }),
  prizeBox: { background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,230,0,0.5)', borderRadius: '12px', padding: '10px', marginTop: '12px', display: 'flex', justifyContent: 'space-around' }
};

export default function LeaderboardTab({ userData, t }) {
  const [tab, setTab] = useState('event'); 
  const [loading, setLoading] = useState(true);
  
  // Datos Globales
  const [topTasks, setTopTasks] = useState([]);
  const [topReferrals, setTopReferrals] = useState([]);
  
  // Datos del Evento Dinámico
  const [activeEvent, setActiveEvent] = useState(null);
  const [eventLeaderboard, setEventLeaderboard] = useState([]);
  const [timeLeft, setTimeLeft] = useState('');

  const apiHeaders = { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': WebApp.initData || '' };

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // 1. Cargar Evento Activo (El Torneo)
        const resEvent = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: 'get-active-event' }) });
        const dataEvent = await resEvent.json();
        
        if (dataEvent.success && dataEvent.activeEvent) {
          setActiveEvent(dataEvent.activeEvent);
          setEventLeaderboard(dataEvent.leaderboard || []);
          setTab('event'); // Si hay evento, forzamos a mostrar esta pestaña primero
        } else {
          setTab('referrals'); // Si no hay evento, mostramos el global histórico
        }

        // 2. Cargar Top Histórico Global
        const resGlobal = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: 'get-leaderboard' }) });
        const dataGlobal = await resGlobal.json();
        if (dataGlobal.success) {
          setTopTasks(dataGlobal.topTasks || []);
          setTopReferrals(dataGlobal.topReferrals || []);
        }

      } catch (e) {
        console.error("Error al cargar ranking", e);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  // Cronómetro del evento
  useEffect(() => {
    if (!activeEvent || !activeEvent.end_date) return;
    const timer = setInterval(() => {
      const diff = new Date(activeEvent.end_date).getTime() - new Date().getTime();
      if (diff <= 0) {
        setTimeLeft('FINALIZADO');
        clearInterval(timer);
        return;
      }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      setTimeLeft(`${d}d ${h}h ${m}m`);
    }, 1000);
    return () => clearInterval(timer);
  }, [activeEvent]);

  const handleCopyRefLink = () => {
    const refLink = `https://t.me/TeleGemAds_bot/app?startapp=${userData?.id}`;
    navigator.clipboard.writeText(refLink);
    toast.success("¡Enlace copiado! Empieza a sumar puntos.");
  };

  const getMedal = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  // Por si el admin no configuró los premios, ponemos unos épicos por defecto
  const defaultPrizes = ["15 TON", "10 TON", "5 TON"];
  const prizeList = activeEvent?.prizes?.length > 0 ? activeEvent.prizes : defaultPrizes;

  return (
    <div style={neon.container} className="fade-in">
      <Toaster position="top-center" />
      <h2 style={neon.title}>🏆 Salón de la Fama</h2>

      {/* 🚀 TORNEO DINÁMICO ACTIVO */}
      {activeEvent && (
        <div style={neon.eventCard} className="fade-in">
          <div style={{ background: 'rgba(0, 0, 0, 0.4)', color: '#ffe600', padding: '6px 14px', borderRadius: '12px', fontSize: '11px', fontWeight: '900', display: 'inline-block', marginBottom: '12px', textTransform: 'uppercase', border: '1px solid #ffe600' }}>
            ⏳ Termina en: {timeLeft}
          </div>
          
          <div style={{ fontSize: '20px', fontWeight: '900', color: '#fff', marginBottom: '8px', lineHeight: '1.2', textShadow: '0 2px 10px rgba(255,230,0,0.5)' }}>
            {activeEvent.title || 'Torneo Relámpago'}
          </div>
          
          <div style={{ fontSize: '12px', color: '#ffcc00', marginBottom: '16px', lineHeight: '1.4', fontWeight: 'bold' }}>
            {activeEvent.event_type === 'referral' 
              ? 'Invita amigos reales con tu enlace. Cada usuario activo te suma 1 Punto al torneo.' 
              : 'Completa tareas y campañas. Cada interacción verificada suma 1 Punto a tu marcador.'}
          </div>

          {/* 💰 PESOS / PREMIOS ESPECÍFICOS */}
          <div style={neon.prizeBox}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '22px' }}>🥇</div>
              <div style={{ fontSize: '12px', color: '#fff', fontWeight: '900', marginTop: '4px' }}>{prizeList[0]}</div>
            </div>
            <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,230,0,0.3)', borderRight: '1px solid rgba(255,230,0,0.3)', padding: '0 15px' }}>
              <div style={{ fontSize: '22px' }}>🥈</div>
              <div style={{ fontSize: '12px', color: '#fff', fontWeight: '900', marginTop: '4px' }}>{prizeList[1] || 'Sorpresa'}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '22px' }}>🥉</div>
              <div style={{ fontSize: '12px', color: '#fff', fontWeight: '900', marginTop: '4px' }}>{prizeList[2] || 'Sorpresa'}</div>
            </div>
          </div>

          {activeEvent.event_type === 'referral' && (
            <button onClick={handleCopyRefLink} style={{ width: '100%', marginTop: '16px', background: 'linear-gradient(180deg, #ffe600, #ffaa00)', color: '#050214', border: 'none', borderRadius: '14px', padding: '14px', fontWeight: '900', fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(255, 170, 0, 0.4)', textTransform: 'uppercase' }}>
              🔗 COPIAR ENLACE Y SUMAR PUNTOS
            </button>
          )}
        </div>
      )}

      {/* PESTAÑAS DE NAVEGACIÓN */}
      <div style={neon.tabContainer}>
        {activeEvent && (
          <button onClick={() => setTab('event')} style={neon.tabBtn(tab === 'event')}>
            🏆 Torneo
          </button>
        )}
        <button onClick={() => setTab('referrals')} style={neon.tabBtn(tab === 'referrals')}>
          👥 Histórico Amigos
        </button>
        <button onClick={() => setTab('tasks')} style={neon.tabBtn(tab === 'tasks')}>
          🔥 Histórico Tareas
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#00f0ff', fontWeight: '900', fontSize: '14px', letterSpacing: '1px' }}>
          <style>{`@keyframes pulseRank { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }`}</style>
          <div style={{ animation: 'pulseRank 1.5s infinite' }}>CARGANDO RANKING...</div>
        </div>
      ) : (
        <div>
          {/* TABLA DEL TORNEO ACTIVO */}
          {tab === 'event' && activeEvent && (
            <div className="fade-in">
              {eventLeaderboard.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#aaa', padding: '20px', background: 'rgba(0,0,0,0.3)', borderRadius: '16px', border: '1px dashed #ffe600' }}>
                  El tablero está vacío. ¡Haz tu primer movimiento y asegura el 🥇 1er Lugar!
                </div>
              ) : (
                eventLeaderboard.map((item, index) => {
                  const isTop3 = index < 3;
                  return (
                  <div key={item.userId} style={neon.rowCard(isTop3, 'event')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ fontSize: '22px', fontWeight: '900', color: isTop3 ? '#ffe600' : '#8a2be2', width: '30px', textAlign: 'center', textShadow: isTop3 ? '0 0 10px rgba(255,230,0,0.5)' : 'none' }}>
                        {getMedal(index)}
                      </div>
                      <div>
                        <div style={{ fontWeight: '900', color: '#fff', fontSize: '15px' }}>
                          @{item.username !== 'Usuario' ? item.username : `ID: ${item.userId.substring(0, 5)}...`}
                          {userData?.id === item.userId && <span style={{ color: '#00ffaa', fontSize: '10px', marginLeft: '6px' }}>(TÚ)</span>}
                        </div>
                        {isTop3 && (
                          <div style={{ color: '#ffe600', fontSize: '10px', fontWeight: 'bold', marginTop: '2px', textTransform: 'uppercase' }}>
                            Asegurando: {prizeList[index]}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ color: isTop3 ? '#ffe600' : '#fff', fontWeight: '900', fontSize: '16px', textShadow: isTop3 ? '0 0 10px rgba(255,230,0,0.5)' : 'none' }}>
                      {item.score} <span style={{fontSize:'10px', color: '#aaa'}}>PTS</span>
                    </div>
                  </div>
                )})
              )}
            </div>
          )}

          {/* TABLA HISTÓRICA DE REFERIDOS */}
          {tab === 'referrals' && (
            <div className="fade-in">
              <div style={{ textAlign: 'center', marginBottom: '14px', fontSize: '11px', color: '#ff99dd', fontWeight: 'bold', textTransform: 'uppercase' }}>Top Vitalicio (Ganancias Totales)</div>
              {topReferrals.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#aaa', padding: '20px' }}>Sin registros históricos.</div>
              ) : (
                topReferrals.map((item, index) => {
                  const isTop3 = index < 3;
                  return (
                  <div key={item.id} style={neon.rowCard(isTop3, 'global')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ fontSize: '18px', fontWeight: '900', color: isTop3 ? '#00f0ff' : '#8a2be2', width: '30px', textAlign: 'center' }}>
                        {getMedal(index)}
                      </div>
                      <div style={{ fontWeight: '900', color: '#fff', fontSize: '14px' }}>
                        @{item.username !== 'Usuario' ? item.username : `ID: ${item.id.substring(0, 5)}...`}
                      </div>
                    </div>
                    <div style={{ color: isTop3 ? '#00f0ff' : '#00ffaa', fontWeight: '900', fontSize: '14px' }}>
                      {(Number(item.referral_earnings || 0) * 1000).toFixed(2)} 💎
                    </div>
                  </div>
                )})
              )}
            </div>
          )}

          {/* TABLA HISTÓRICA DE TAREAS */}
          {tab === 'tasks' && (
            <div className="fade-in">
              <div style={{ textAlign: 'center', marginBottom: '14px', fontSize: '11px', color: '#ff99dd', fontWeight: 'bold', textTransform: 'uppercase' }}>Top Vitalicio (Ganancias por Tareas)</div>
              {topTasks.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#aaa', padding: '20px' }}>Sin registros históricos.</div>
              ) : (
                topTasks.map((item, index) => {
                  const isTop3 = index < 3;
                  return (
                  <div key={item.id} style={neon.rowCard(isTop3, 'global')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ fontSize: '18px', fontWeight: '900', color: isTop3 ? '#00f0ff' : '#8a2be2', width: '30px', textAlign: 'center' }}>
                        {getMedal(index)}
                      </div>
                      <div style={{ fontWeight: '900', color: '#fff', fontSize: '14px' }}>
                        @{item.username !== 'Usuario' ? item.username : `ID: ${item.id.substring(0, 5)}...`}
                      </div>
                    </div>
                    <div style={{ color: '#00f0ff', fontWeight: '900', fontSize: '14px' }}>
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
