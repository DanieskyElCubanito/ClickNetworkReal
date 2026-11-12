import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import WebApp from '@twa-dev/sdk';

const modernStyles = {
  container: { color: '#F3F4F6', paddingBottom: '20px' },
  title: { fontSize: '20px', fontWeight: '900', textAlign: 'center', letterSpacing: '1px', textTransform: 'uppercase', margin: '10px 0 20px 0', color: '#06B6D4' },
  eventCard: { background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(16, 185, 129, 0.1))', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '24px', padding: '24px', marginBottom: '24px', textAlign: 'center', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(10px)' },
  tabContainer: { display: 'flex', gap: '8px', marginBottom: '20px', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto' },
  tabBtn: (active) => ({ flexShrink: 0, flex: 1, minWidth: '90px', padding: '10px 6px', borderRadius: '12px', fontWeight: '800', fontSize: '11px', border: 'none', cursor: 'pointer', transition: 'all 0.3s ease', background: active ? '#ffffff' : 'transparent', color: active ? '#111827' : '#9CA3AF', boxShadow: active ? '0 4px 15px rgba(255,255,255,0.1)' : 'none', textTransform: 'uppercase', textAlign: 'center', letterSpacing: '0.5px' }),
  rowCard: (isTop3, type) => ({ 
    background: isTop3 
      ? (type === 'event' ? 'linear-gradient(90deg, rgba(245, 158, 11, 0.1), rgba(17, 24, 39, 0.9))' : 'linear-gradient(90deg, rgba(6, 182, 212, 0.1), rgba(17, 24, 39, 0.9))') 
      : 'rgba(255, 255, 255, 0.02)', 
    border: `1px solid ${isTop3 ? (type === 'event' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(6, 182, 212, 0.4)') : 'rgba(255, 255, 255, 0.05)'}`, 
    borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', 
    boxShadow: isTop3 ? `0 4px 20px ${type === 'event' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(6, 182, 212, 0.15)'}` : '0 2px 10px rgba(0,0,0,0.2)' 
  }),
  prizeBox: { background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '12px', marginTop: '16px', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }
};

export default function LeaderboardTab({ userData, t }) {
  const [tab, setTab] = useState('event'); 
  const [loading, setLoading] = useState(true);

  // Datos Globales
  const [topTasks, setTopTasks] = useState([]);
  const [topReferrals, setTopReferrals] = useState([]);
  const [pastEvents, setPastEvents] = useState([]); 

  // Datos del Evento Dinámico
  const [activeEvent, setActiveEvent] = useState(null);
  const [eventLeaderboard, setEventLeaderboard] = useState([]);
  const [timeLeft, setTimeLeft] = useState('');

  const apiHeaders = { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': WebApp.initData || '' };

  useEffect(() => {
    let isMounted = true;
    const fetchAllData = async () => {
      try {
        const resEvent = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: 'get-active-event' }) });
        const dataEvent = await resEvent.json();

        if (isMounted) {
            if (dataEvent.success && dataEvent.activeEvent) {
            setActiveEvent(dataEvent.activeEvent);
            setEventLeaderboard(dataEvent.leaderboard || []);
            setTab('event'); 
            } else {
            setTab('past'); 
            }
        }

        const resGlobal = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: 'get-leaderboard' }) });
        const dataGlobal = await resGlobal.json();
        
        if (isMounted && dataGlobal.success) {
          setTopTasks(dataGlobal.topTasks || []);
          setTopReferrals(dataGlobal.topReferrals || []);
          setPastEvents(dataGlobal.pastEvents || []); 
        }

      } catch (e) {
        console.error("Error al cargar ranking", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchAllData();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (!activeEvent || !activeEvent.end_date) return;
    
    const calculateTimeLeft = () => {
      const diff = new Date(activeEvent.end_date).getTime() - new Date().getTime();
      if (diff <= 0) {
        setTimeLeft('FINALIZADO');
        setActiveEvent(null); 
        setTab('past'); 
        return false;
      }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      setTimeLeft(`${d}d ${h}h ${m}m`);
      return true;
    };

    if(calculateTimeLeft()) {
        const timer = setInterval(calculateTimeLeft, 60000); // Actualiza cada minuto (más eficiente)
        return () => clearInterval(timer);
    }
  }, [activeEvent]);

  const handleCopyRefLink = () => {
    const refLink = `https://t.me/TeleGemAds_bot/app?startapp=${userData?.id}`;
    navigator.clipboard.writeText(refLink);
    toast.success(t('ref_toast_copy_ok') || "¡Enlace copiado! Empieza a sumar puntos.");
  };

  const getMedal = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return <span style={{fontSize: '14px', color: '#6B7280'}}>#{index + 1}</span>;
  };

  const defaultPrizes = ["15 TON", "10 TON", "5 TON"];
  const prizeList = activeEvent?.prizes?.length > 0 ? activeEvent.prizes : defaultPrizes;

  return (
    <div style={modernStyles.container} className="fade-in">
      <Toaster position="top-center" toastOptions={{ style: { background: '#111827', color: '#F3F4F6', border: '1px solid rgba(255,255,255,0.1)' } }} />
      <h2 style={modernStyles.title}>🏆 {t('lb_title') || 'Clasificación'}</h2>

      {/* 🚀 TORNEO DINÁMICO ACTIVO */}
      {activeEvent && (
        <div style={modernStyles.eventCard} className="fade-in">
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', padding: '6px 14px', borderRadius: '12px', fontSize: '11px', fontWeight: '800', display: 'inline-block', marginBottom: '14px', textTransform: 'uppercase', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            ⏳ {t('lb_tourney_ends') || 'Finaliza en:'} {timeLeft}
          </div>

          <div style={{ fontSize: '22px', fontWeight: '900', color: '#ffffff', marginBottom: '10px', lineHeight: '1.2' }}>
            {activeEvent.title || t('lb_tourney_default_title')}
          </div>

          <div style={{ fontSize: '12px', color: '#D1D5DB', marginBottom: '18px', lineHeight: '1.5', fontWeight: '500' }}>
            {activeEvent.event_type === 'referral' 
              ? (t('lb_tourney_desc_ref') || '¡Invita amigos y sube en el ranking para ganar premios!') 
              : (t('lb_tourney_desc_task') || '¡Completa misiones y domina la tabla para asegurar tu premio!')}
          </div>

          <div style={modernStyles.prizeBox}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', filter: 'drop-shadow(0 2px 5px rgba(245, 158, 11, 0.4))' }}>🥇</div>
              <div style={{ fontSize: '13px', color: '#F59E0B', fontWeight: '900', marginTop: '6px' }}>{prizeList[0]}</div>
            </div>
            <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.1)', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '0 20px' }}>
              <div style={{ fontSize: '24px', filter: 'drop-shadow(0 2px 5px rgba(156, 163, 175, 0.4))' }}>🥈</div>
              <div style={{ fontSize: '13px', color: '#E5E7EB', fontWeight: '900', marginTop: '6px' }}>{prizeList[1] || 'Sorpresa'}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', filter: 'drop-shadow(0 2px 5px rgba(217, 119, 6, 0.4))' }}>🥉</div>
              <div style={{ fontSize: '13px', color: '#D97706', fontWeight: '900', marginTop: '6px' }}>{prizeList[2] || 'Sorpresa'}</div>
            </div>
          </div>

          {activeEvent.event_type === 'referral' && (
            <button onClick={handleCopyRefLink} style={{ width: '100%', marginTop: '20px', background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#ffffff', border: 'none', borderRadius: '14px', padding: '14px', fontWeight: '900', fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)', textTransform: 'uppercase' }}>
              {t('lb_btn_copy') || 'Copiar Enlace de Invitación'}
            </button>
          )}
        </div>
      )}

      {/* PESTAÑAS DE NAVEGACIÓN */}
      <div style={modernStyles.tabContainer}>
        {activeEvent && (
          <button onClick={() => setTab('event')} style={modernStyles.tabBtn(tab === 'event')}>
            {t('lb_tab_tourney') || 'TORNEO'}
          </button>
        )}
        <button onClick={() => setTab('past')} style={modernStyles.tabBtn(tab === 'past')}>
          SALÓN FAMA
        </button>
        <button onClick={() => setTab('referrals')} style={modernStyles.tabBtn(tab === 'referrals')}>
          {t('lb_tab_ref') || 'GLOBAL RED'}
        </button>
        <button onClick={() => setTab('tasks')} style={modernStyles.tabBtn(tab === 'tasks')}>
          CAZADORES
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#06B6D4', fontWeight: '800', fontSize: '13px', letterSpacing: '1px' }}>
          <style>{`@keyframes pulseRank { 0% { opacity: 0.3; } 50% { opacity: 1; } 100% { opacity: 0.3; } }`}</style>
          <div style={{ animation: 'pulseRank 1.5s infinite' }}>{t('lb_loading') || 'Cargando Rankings...'}</div>
        </div>
      ) : (
        <div>
          {/* TABLA DEL TORNEO ACTIVO */}
          {tab === 'event' && activeEvent && (
            <div className="fade-in">
              {eventLeaderboard.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#6B7280', padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  {t('lb_empty_tourney') || 'No hay participantes aún.'}
                </div>
              ) : (
                eventLeaderboard.map((item, index) => {
                  const isTop3 = index < 3;
                  return (
                  <div key={item.userId} style={modernStyles.rowCard(isTop3, 'event')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ fontSize: '24px', width: '30px', textAlign: 'center', filter: isTop3 ? 'drop-shadow(0 2px 4px rgba(245, 158, 11, 0.3))' : 'none' }}>
                        {getMedal(index)}
                      </div>
                      <div>
                        <div style={{ fontWeight: '800', color: '#F3F4F6', fontSize: '14px' }}>
                          {item.username !== 'Usuario' ? `@${item.username}` : `ID: ${item.userId}`}
                          {userData?.id === item.userId && <span style={{ color: '#10B981', fontSize: '10px', marginLeft: '6px' }}>{t('lb_you') || '(TÚ)'}</span>}
                        </div>
                        {isTop3 && (
                          <div style={{ color: '#F59E0B', fontSize: '10px', fontWeight: '800', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {t('lb_securing') || 'Asegurando'} {prizeList[index]}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ color: isTop3 ? '#F59E0B' : '#F3F4F6', fontWeight: '900', fontSize: '16px' }}>
                      {item.score} <span style={{fontSize:'10px', color: '#6B7280'}}>{t('lb_pts') || 'pts'}</span>
                    </div>
                  </div>
                )})
              )}
            </div>
          )}

          {/* SALÓN DE LA FAMA (TORNEOS PASADOS) */}
          {tab === 'past' && (
            <div className="fade-in">
              <div style={{ textAlign: 'center', marginBottom: '16px', fontSize: '11px', color: '#F59E0B', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Campeones Anteriores</div>

              {pastEvents.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#6B7280', padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  Aún no hay campeones coronados en el Salón de la Fama.
                </div>
              ) : (
                pastEvents.map(ev => (
                  <div key={ev.id} style={{ ...modernStyles.rowCard(false, 'global'), flexDirection: 'column', alignItems: 'stretch', borderColor: 'rgba(245, 158, 11, 0.2)', background: 'rgba(245, 158, 11, 0.05)', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                      <span style={{ fontWeight: '800', color: '#F59E0B', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{ev.title}</span>
                      <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: '600' }}>{new Date(ev.end_date).toLocaleDateString()}</span>
                    </div>

                    {ev.winners && ev.winners.length > 0 ? (
                      ev.winners.map((w, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '20px' }}>{getMedal(i)}</span>
                            <span style={{ color: '#F3F4F6', fontWeight: '700', fontSize: '13px' }}>
                              {w.username !== 'Usuario' ? `@${w.username}` : `ID: ${w.id || w.userId || 'Desconocido'}`}
                            </span>
                          </div>
                          <div style={{ color: '#06B6D4', fontWeight: '800', fontSize: '14px' }}>{w.score} <span style={{fontSize:'10px', color:'#6B7280'}}>pts</span></div>
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: 'center', fontSize: '12px', color: '#6B7280', padding: '10px 0' }}>Ningún jugador clasificó en esta temporada.</div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TABLA HISTÓRICA DE REFERIDOS */}
          {tab === 'referrals' && (
            <div className="fade-in">
              <div style={{ textAlign: 'center', marginBottom: '16px', fontSize: '11px', color: '#8B5CF6', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('lb_lifetime_ref') || 'Top Global Referidos'}</div>
              {topReferrals.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#6B7280', padding: '24px' }}>{t('lb_empty_history') || 'Aún no hay datos históricos.'}</div>
              ) : (
                topReferrals.map((item, index) => {
                  const isTop3 = index < 3;
                  return (
                  <div key={item.id} style={modernStyles.rowCard(isTop3, 'global')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ fontSize: '20px', width: '30px', textAlign: 'center' }}>
                        {getMedal(index)}
                      </div>
                      <div style={{ fontWeight: '800', color: '#F3F4F6', fontSize: '14px' }}>
                        {item.username !== 'Usuario' ? `@${item.username}` : `ID: ${item.id}`}
                      </div>
                    </div>

                    <div style={{ color: isTop3 ? '#06B6D4' : '#10B981', fontWeight: '900', fontSize: '15px', textAlign: 'right' }}>
                      {item.score}
                      <span style={{ display: 'block', fontSize: '10px', color: '#6B7280', fontWeight: '700', textTransform: 'uppercase' }}>Activos</span>
                    </div>
                  </div>
                )})
              )}
            </div>
          )}

          {/* TABLA HISTÓRICA CAZADORES ÉLITE */}
          {tab === 'tasks' && (
            <div className="fade-in">
              <div style={{ textAlign: 'center', marginBottom: '6px', fontSize: '15px', color: '#06B6D4', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>
                🔥 Cazadores Élite
              </div>
              <div style={{ textAlign: 'center', marginBottom: '20px', fontSize: '10px', color: '#9CA3AF', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Puntos por Misiones Completadas
              </div>

              {topTasks.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#6B7280', padding: '24px' }}>{t('lb_empty_history') || 'Aún no hay datos históricos.'}</div>
              ) : (
                topTasks.map((item, index) => {
                  const isTop3 = index < 3;
                  return (
                  <div key={item.id} style={modernStyles.rowCard(isTop3, 'global')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ fontSize: '20px', width: '30px', textAlign: 'center' }}>
                        {getMedal(index)}
                      </div>
                      <div style={{ fontWeight: '800', color: '#F3F4F6', fontSize: '14px' }}>
                        {item.username !== 'Usuario' ? `@${item.username}` : `ID: ${item.id}`}
                      </div>
                    </div>
                    <div style={{ color: '#06B6D4', fontWeight: '900', fontSize: '15px' }}>
                      {item.score} <span style={{fontSize: '10px', color: '#6B7280', textTransform: 'uppercase'}}>pts</span>
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
