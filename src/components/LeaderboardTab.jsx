import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import WebApp from '@twa-dev/sdk';

const goldBorder = '1px solid rgba(212, 175, 122, 0.35)';
const champagneGrad = 'linear-gradient(135deg, #E2C290 0%, #B88E56 100%)';
const slateCard = 'linear-gradient(145deg, #141D26 0%, #1B2632 100%)';

const modernStyles = {
  container: { color: '#F3F4F6', paddingBottom: '24px' },
  title: {
    fontSize: '18px',
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    margin: '6px 0 18px 0',
    color: '#F3F4F6'
  },
  eventCard: {
    background: slateCard,
    border: goldBorder,
    borderRadius: '18px',
    padding: '20px',
    marginBottom: '18px',
    textAlign: 'center',
    boxShadow: '0 8px 24px rgba(11, 17, 23, 0.45), inset 0 1px 0 rgba(226, 194, 144, 0.14)'
  },
  tabContainer: {
    display: 'flex',
    gap: '6px',
    marginBottom: '18px',
    background: '#0E151C',
    padding: '5px',
    borderRadius: '14px',
    border: goldBorder,
    overflowX: 'auto'
  },
  tabBtn: (active) => ({
    flexShrink: 0,
    flex: 1,
    minWidth: '82px',
    padding: '9px 6px',
    borderRadius: '10px',
    fontWeight: '800',
    fontSize: '10px',
    border: active ? '1px solid rgba(226, 194, 144, 0.65)' : '1px solid transparent',
    cursor: 'pointer',
    background: active ? champagneGrad : 'transparent',
    color: active ? '#0E151C' : '#94A3B8',
    textTransform: 'uppercase',
    textAlign: 'center',
    letterSpacing: '0.4px'
  }),
  rowCard: (isTop3) => ({
    background: slateCard,
    border: isTop3 ? '1px solid rgba(226, 194, 144, 0.6)' : goldBorder,
    borderRadius: '16px',
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '10px',
    boxShadow: isTop3
      ? '0 8px 22px rgba(11, 17, 23, 0.5), inset 0 1px 0 rgba(226, 194, 144, 0.22)'
      : '0 6px 18px rgba(11, 17, 23, 0.35)'
  }),
  prizeBox: {
    background: '#0E151C',
    border: goldBorder,
    borderRadius: '14px',
    padding: '12px',
    marginTop: '14px',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center'
  }
};

export default function LeaderboardTab({ userData, t }) {
  const [tab, setTab] = useState('event');
  const [loading, setLoading] = useState(true);

  const [topTasks, setTopTasks] = useState([]);
  const [topReferrals, setTopReferrals] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);

  const [activeEvent, setActiveEvent] = useState(null);
  const [eventLeaderboard, setEventLeaderboard] = useState([]);
  const [timeLeft, setTimeLeft] = useState('');

  const apiHeaders = {
    'Content-Type': 'application/json',
    'X-Telegram-Init-Data': WebApp.initData || ''
  };

  useEffect(() => {
    let isMounted = true;
    const fetchAllData = async () => {
      try {
        const resEvent = await fetch('/api', {
          method: 'POST',
          headers: apiHeaders,
          body: JSON.stringify({ action: 'get-active-event' })
        });
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

        const resGlobal = await fetch('/api', {
          method: 'POST',
          headers: apiHeaders,
          body: JSON.stringify({ action: 'get-leaderboard' })
        });
        const dataGlobal = await resGlobal.json();

        if (isMounted && dataGlobal.success) {
          setTopTasks(dataGlobal.topTasks || []);
          setTopReferrals(dataGlobal.topReferrals || []);
          setPastEvents(dataGlobal.pastEvents || []);
        }
      } catch (e) {
        console.error('Error al cargar ranking', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchAllData();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!activeEvent || !activeEvent.end_date) return;

    const calculateTimeLeft = () => {
      const diff = new Date(activeEvent.end_date).getTime() - Date.now();
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

    if (calculateTimeLeft()) {
      const timer = setInterval(calculateTimeLeft, 60000);
      return () => clearInterval(timer);
    }
  }, [activeEvent]);

  const handleCopyRefLink = () => {
    const refLink = `https://t.me/TeleGemAds_bot/app?startapp=${userData?.id}`;
    navigator.clipboard.writeText(refLink);
    toast.success(t('ref_toast_copy_ok') || '¡Enlace copiado! Empieza a sumar puntos.');
  };

  const getMedal = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return <span style={{ fontSize: '13px', color: '#94A3B8', fontWeight: '700' }}>#{index + 1}</span>;
  };

  const defaultPrizes = ['15 TON', '10 TON', '5 TON'];
  const prizeList = activeEvent?.prizes?.length > 0 ? activeEvent.prizes : defaultPrizes;

  return (
    <div style={modernStyles.container} className="fade-in">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#141D26',
            color: '#F3F4F6',
            border: goldBorder
          }
        }}
      />

      <h2 style={modernStyles.title}>{t('lb_title') || 'Clasificación'}</h2>

      {activeEvent && (
        <div style={modernStyles.eventCard} className="fade-in">
          <div
            style={{
              background: '#0E151C',
              color: '#E2C290',
              padding: '5px 12px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: '800',
              display: 'inline-block',
              marginBottom: '12px',
              textTransform: 'uppercase',
              border: goldBorder
            }}
          >
            {t('lb_tourney_ends') || 'Finaliza en:'} {timeLeft}
          </div>

          <div style={{ fontSize: '20px', fontWeight: '900', color: '#F3F4F6', marginBottom: '8px', lineHeight: '1.2' }}>
            {activeEvent.title || t('lb_tourney_default_title')}
          </div>

          <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '14px', lineHeight: '1.5', fontWeight: '500' }}>
            {activeEvent.event_type === 'referral'
              ? t('lb_tourney_desc_ref') || '¡Invita amigos y sube en el ranking para ganar premios!'
              : t('lb_tourney_desc_task') || '¡Completa misiones y domina la tabla para asegurar tu premio!'}
          </div>

          <div style={modernStyles.prizeBox}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '22px' }}>🥇</div>
              <div style={{ fontSize: '12px', color: '#E2C290', fontWeight: '800', marginTop: '4px' }}>{prizeList[0]}</div>
            </div>
            <div style={{ textAlign: 'center', borderLeft: goldBorder, borderRight: goldBorder, padding: '0 18px' }}>
              <div style={{ fontSize: '22px' }}>🥈</div>
              <div style={{ fontSize: '12px', color: '#F3F4F6', fontWeight: '800', marginTop: '4px' }}>{prizeList[1] || 'Sorpresa'}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '22px' }}>🥉</div>
              <div style={{ fontSize: '12px', color: '#D4AF7A', fontWeight: '800', marginTop: '4px' }}>{prizeList[2] || 'Sorpresa'}</div>
            </div>
          </div>

          {activeEvent.event_type === 'referral' && (
            <button
              type="button"
              onClick={handleCopyRefLink}
              style={{
                width: '100%',
                marginTop: '16px',
                background: champagneGrad,
                color: '#0E151C',
                border: '1px solid rgba(226, 194, 144, 0.65)',
                borderRadius: '12px',
                padding: '13px',
                fontWeight: '800',
                fontSize: '12px',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.4px'
              }}
            >
              {t('lb_btn_copy') || 'Copiar Enlace de Invitación'}
            </button>
          )}
        </div>
      )}

      <div style={modernStyles.tabContainer}>
        {activeEvent && (
          <button type="button" onClick={() => setTab('event')} style={modernStyles.tabBtn(tab === 'event')}>
            {t('lb_tab_tourney') || 'TORNEO'}
          </button>
        )}
        <button type="button" onClick={() => setTab('past')} style={modernStyles.tabBtn(tab === 'past')}>
          SALÓN FAMA
        </button>
        <button type="button" onClick={() => setTab('referrals')} style={modernStyles.tabBtn(tab === 'referrals')}>
          {t('lb_tab_ref') || 'GLOBAL RED'}
        </button>
        <button type="button" onClick={() => setTab('tasks')} style={modernStyles.tabBtn(tab === 'tasks')}>
          CAZADORES
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '36px', color: '#D4AF7A', fontWeight: '800', fontSize: '12px', letterSpacing: '0.8px' }}>
          <style>{`@keyframes pulseRank { 0% { opacity: 0.35; } 50% { opacity: 1; } 100% { opacity: 0.35; } }`}</style>
          <div style={{ animation: 'pulseRank 1.5s infinite' }}>{t('lb_loading') || 'Cargando Rankings...'}</div>
        </div>
      ) : (
        <div>
          {tab === 'event' && activeEvent && (
            <div className="fade-in">
              {eventLeaderboard.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94A3B8', padding: '24px', background: '#0E151C', borderRadius: '16px', border: goldBorder }}>
                  {t('lb_empty_tourney') || 'No hay participantes aún.'}
                </div>
              ) : (
                eventLeaderboard.map((item, index) => {
                  const isTop3 = index < 3;
                  return (
                    <div key={item.userId} style={modernStyles.rowCard(isTop3)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontSize: '20px', width: '28px', textAlign: 'center' }}>{getMedal(index)}</div>
                        <div>
                          <div style={{ fontWeight: '800', color: '#F3F4F6', fontSize: '13px' }}>
                            {item.username !== 'Usuario' ? `@${item.username}` : `ID: ${item.userId}`}
                            {userData?.id === item.userId && (
                              <span style={{ color: '#E2C290', fontSize: '10px', marginLeft: '6px' }}>
                                {t('lb_you') || '(TÚ)'}
                              </span>
                            )}
                          </div>
                          {isTop3 && (
                            <div style={{ color: '#D4AF7A', fontSize: '10px', fontWeight: '700', marginTop: '3px', textTransform: 'uppercase' }}>
                              {t('lb_securing') || 'Asegurando'} {prizeList[index]}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ color: isTop3 ? '#E2C290' : '#F3F4F6', fontWeight: '900', fontSize: '15px' }}>
                        {item.score} <span style={{ fontSize: '10px', color: '#94A3B8' }}>{t('lb_pts') || 'pts'}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === 'past' && (
            <div className="fade-in">
              <div style={{ textAlign: 'center', marginBottom: '14px', fontSize: '11px', color: '#D4AF7A', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Campeones Anteriores
              </div>

              {pastEvents.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94A3B8', padding: '24px', background: '#0E151C', borderRadius: '16px', border: goldBorder }}>
                  Aún no hay campeones coronados en el Salón de la Fama.
                </div>
              ) : (
                pastEvents.map((ev) => (
                  <div
                    key={ev.id}
                    style={{
                      ...modernStyles.rowCard(false),
                      flexDirection: 'column',
                      alignItems: 'stretch',
                      marginBottom: '14px'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '12px',
                        borderBottom: '1px solid rgba(212, 175, 122, 0.2)',
                        paddingBottom: '8px'
                      }}
                    >
                      <span style={{ fontWeight: '800', color: '#E2C290', fontSize: '13px', textTransform: 'uppercase' }}>{ev.title}</span>
                      <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '600' }}>
                        {new Date(ev.end_date).toLocaleDateString()}
                      </span>
                    </div>

                    {ev.winners && ev.winners.length > 0 ? (
                      ev.winners.map((w, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '18px' }}>{getMedal(i)}</span>
                            <span style={{ color: '#F3F4F6', fontWeight: '700', fontSize: '13px' }}>
                              {w.username !== 'Usuario' ? `@${w.username}` : `ID: ${w.id || w.userId || 'Desconocido'}`}
                            </span>
                          </div>
                          <div style={{ color: '#E2C290', fontWeight: '800', fontSize: '13px' }}>
                            {w.score} <span style={{ fontSize: '10px', color: '#94A3B8' }}>pts</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: 'center', fontSize: '12px', color: '#94A3B8', padding: '8px 0' }}>
                        Ningún jugador clasificó en esta temporada.
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'referrals' && (
            <div className="fade-in">
              <div style={{ textAlign: 'center', marginBottom: '14px', fontSize: '11px', color: '#D4AF7A', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                {t('lb_lifetime_ref') || 'Top Global Referidos'}
              </div>
              {topReferrals.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94A3B8', padding: '24px' }}>
                  {t('lb_empty_history') || 'Aún no hay datos históricos.'}
                </div>
              ) : (
                topReferrals.map((item, index) => {
                  const isTop3 = index < 3;
                  return (
                    <div key={item.id} style={modernStyles.rowCard(isTop3)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontSize: '18px', width: '28px', textAlign: 'center' }}>{getMedal(index)}</div>
                        <div style={{ fontWeight: '800', color: '#F3F4F6', fontSize: '13px' }}>
                          {item.username !== 'Usuario' ? `@${item.username}` : `ID: ${item.id}`}
                        </div>
                      </div>

                      <div style={{ color: isTop3 ? '#E2C290' : '#F3F4F6', fontWeight: '900', fontSize: '14px', textAlign: 'right' }}>
                        {item.score}
                        <span style={{ display: 'block', fontSize: '10px', color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' }}>
                          Activos
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === 'tasks' && (
            <div className="fade-in">
              <div style={{ textAlign: 'center', marginBottom: '4px', fontSize: '14px', color: '#F3F4F6', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Cazadores Élite
              </div>
              <div style={{ textAlign: 'center', marginBottom: '16px', fontSize: '10px', color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' }}>
                Puntos por Misiones Completadas
              </div>

              {topTasks.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94A3B8', padding: '24px' }}>
                  {t('lb_empty_history') || 'Aún no hay datos históricos.'}
                </div>
              ) : (
                topTasks.map((item, index) => {
                  const isTop3 = index < 3;
                  return (
                    <div key={item.id} style={modernStyles.rowCard(isTop3)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontSize: '18px', width: '28px', textAlign: 'center' }}>{getMedal(index)}</div>
                        <div style={{ fontWeight: '800', color: '#F3F4F6', fontSize: '13px' }}>
                          {item.username !== 'Usuario' ? `@${item.username}` : `ID: ${item.id}`}
                        </div>
                      </div>
                      <div style={{ color: isTop3 ? '#E2C290' : '#F3F4F6', fontWeight: '900', fontSize: '14px' }}>
                        {item.score} <span style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase' }}>{t('lb_pts') || 'pts'}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
