import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import WebApp from '@twa-dev/sdk';

// ==========================================
// 🎨 ESTILOS Y COMPONENTES VISUALES
// ==========================================
const neon = {
  card: { background: 'linear-gradient(145deg, rgba(46, 16, 77, 0.85), rgba(20, 8, 38, 0.95))', border: '2px solid #00f0ff', borderRadius: '24px', padding: '20px', marginBottom: '16px', boxShadow: '0 8px 24px rgba(0, 240, 255, 0.15)' },
  cardInteractive: { background: 'linear-gradient(135deg, rgba(38, 14, 66, 0.9), rgba(18, 7, 36, 0.9))', border: '2px solid #8a2be2', borderRadius: '20px', padding: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(138, 43, 226, 0.3)', transition: 'all 0.2s ease' },
  btnPrimary: { width: '100%', padding: '14px', background: 'linear-gradient(180deg, #00f0ff 0%, #0099ff 100%)', color: '#050214', border: 'none', borderRadius: '16px', fontWeight: '900', fontSize: '15px', cursor: 'pointer', boxShadow: '0 6px 0 #0066aa, 0 10px 20px rgba(0, 240, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  btnSecondary: { width: '100%', padding: '14px', background: 'transparent', color: '#ff99dd', border: '2px dashed #ff41b4', borderRadius: '16px', fontWeight: '900', fontSize: '15px', cursor: 'pointer', boxShadow: '0 0 15px rgba(255, 65, 180, 0.2)', textTransform: 'uppercase' },
  input: { width: '100%', background: 'rgba(15, 5, 28, 0.8)', border: '2px solid #8a2be2', borderRadius: '16px', padding: '14px 16px', fontSize: '15px', color: '#ffffff', outline: 'none', boxSizing: 'border-box' },
  progressBox: { display: 'flex', justifyContent: 'center', gap: '8px', margin: '15px 0 25px 0' },
  progressStep: (active) => ({ width: '40px', height: '6px', background: active ? 'linear-gradient(90deg, #ff1493, #00f0ff)' : 'rgba(255, 255, 255, 0.1)', borderRadius: '10px', boxShadow: active ? '0 0 10px #00f0ff' : 'none', transition: 'all 0.3s ease' }),
  taskCard: { background: 'linear-gradient(145deg, #10061e, #1a0b33)', border: '1.5px solid rgba(138, 43, 226, 0.5)', borderRadius: '20px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.4), inset 0 2px 10px rgba(138, 43, 226, 0.1)' },
  taskIconBox: { width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(138, 43, 226, 0.2))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0, 240, 255, 0.3)', flexShrink: 0 },
  taskButton: { background: 'linear-gradient(180deg, #ffe600, #ffaa00)', color: '#050214', border: 'none', borderRadius: '14px', padding: '10px 14px', fontWeight: '900', fontSize: '13px', boxShadow: '0 4px 0 #cc8800, 0 6px 15px rgba(255, 230, 0, 0.3)', cursor: 'pointer', whiteSpace: 'nowrap' },
  taskButtonRejoin: { background: 'transparent', color: '#ffe600', border: '2px solid #ffe600', borderRadius: '14px', padding: '10px 14px', fontWeight: '900', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' },
  taskButtonDisabled: { background: '#2b0b47', color: '#00f0ff', border: '1px solid #8a2be2', borderRadius: '14px', padding: '10px 14px', fontWeight: '900', fontSize: '13px', whiteSpace: 'nowrap', cursor: 'not-allowed' },
  taskButtonCheck: { background: 'linear-gradient(180deg, #00ffaa, #00bb77)', color: '#050214', border: 'none', borderRadius: '14px', padding: '10px 14px', fontWeight: '900', fontSize: '13px', boxShadow: '0 4px 0 #007744, 0 6px 15px rgba(0, 255, 170, 0.3)', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' },
  calcContainer: { background: 'linear-gradient(145deg, rgba(46, 16, 77, 0.85), rgba(20, 8, 38, 0.95))', border: '2px solid #8a2be2', borderRadius: '24px', padding: '20px', color: '#ffffff', boxShadow: '0 8px 24px rgba(138, 43, 226, 0.15)' },
  pillButton: (active) => ({ flex: 1, padding: '10px 0', fontSize: '14px', fontWeight: '900', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', background: active ? 'linear-gradient(90deg, #00f0ff, #0088ff)' : 'rgba(15, 5, 28, 0.8)', color: active ? '#050214' : '#ffffff', border: active ? 'none' : '1px solid #8a2be2', boxShadow: active ? '0 0 10px rgba(0, 240, 255, 0.5)' : 'none' }),
  label: { fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', color: '#ff99dd', marginBottom: '8px', display: 'block', letterSpacing: '0.5px' },
  btnActionCalc: { width: '45px', height: '45px', background: 'rgba(0, 240, 255, 0.1)', color: '#00f0ff', border: '2px solid #00f0ff', borderRadius: '12px', fontWeight: '900', fontSize: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  inputCalc: { flex: 1, background: 'rgba(15, 5, 28, 0.8)', border: '2px solid #8a2be2', borderRadius: '12px', padding: '10px', fontSize: '18px', fontWeight: '900', color: '#fff', outline: 'none', boxSizing: 'border-box', textAlign: 'center' },
  summaryBox: { background: 'linear-gradient(90deg, rgba(0, 240, 255, 0.1), rgba(138, 43, 226, 0.1))', border: '1px dashed #00f0ff', borderRadius: '16px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', boxShadow: 'inset 0 0 10px rgba(0, 240, 255, 0.1)' },
  actionBtn: { width: '100%', padding: '16px', background: 'linear-gradient(180deg, #00f0ff 0%, #0099ff 100%)', color: '#050214', border: 'none', borderRadius: '16px', fontWeight: '900', fontSize: '16px', boxShadow: '0 6px 0 #0066aa, 0 10px 20px rgba(0, 240, 255, 0.4)', cursor: 'pointer', transition: 'all 0.1s', textTransform: 'uppercase' },
  actionBtnDisabled: { width: '100%', padding: '16px', background: 'rgba(255,255,255,0.05)', color: '#666', border: 'none', borderRadius: '16px', fontWeight: '900', fontSize: '16px', cursor: 'not-allowed', textTransform: 'uppercase' },
  actionBtnDanger: { width: '100%', padding: '16px', background: 'linear-gradient(180deg, #ff1493 0%, #d80073 100%)', color: '#fff', border: 'none', borderRadius: '16px', fontWeight: '900', fontSize: '16px', boxShadow: '0 6px 0 #8b004b, 0 10px 20px rgba(255, 20, 147, 0.4)', cursor: 'pointer', transition: 'all 0.1s', textTransform: 'uppercase' },
  subTabBtn: (active) => ({ flex: 1, padding: '10px 5px', fontSize: '12px', fontWeight: '900', textAlign: 'center', cursor: 'pointer', borderRadius: '12px', transition: 'all 0.3s', background: active ? 'linear-gradient(90deg, #00f0ff, #0088ff)' : 'rgba(255,255,255,0.05)', color: active ? '#050214' : '#00f0ff', border: active ? 'none' : '1px solid rgba(0,240,255,0.3)', boxShadow: active ? '0 4px 10px rgba(0,240,255,0.3)' : 'none', textTransform: 'uppercase'})
};

const TaskIcons = {
  group: (color) => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  channel: (color) => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  bot: (color) => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" /><line x1="8" y1="16" x2="8.01" y2="16" /><line x1="16" y1="16" x2="16.01" y2="16" /></svg>,
  promo: (color) => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>,
  daily: (color) => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
  crypto: (color) => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l10 6.5v7L12 22 2 15.5v-7L12 2z"/><path d="M12 22v-6.5"/><path d="M22 8.5l-10 7-10-7"/><path d="M2 15.5l10-7 10 7"/></svg>,
  game: (color) => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2" ry="2"></rect><path d="M6 12h4"></path><path d="M8 10v4"></path><line x1="15" y1="13" x2="15.01" y2="13"></line><line x1="18" y1="11" x2="18.01" y2="11"></line></svg>,
  money: (color) => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>,
  web3: (color) => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>,
  play: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  pause: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>,
  edit: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2"/></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
};

// ==========================================
// 1️⃣ COMPONENTE: LISTA DE MISIONES (MARKET)
// ==========================================
const AdsMarket = ({ props }) => {
  const { 
    tasks, userData, taskStatus, verifyInputs, setVerifyInputs, 
    handleStartTask, handleCheckTask, loadingTasks, setView, fetchTasks, t,
    gigaReady, playingAd, handlePlayGigaPub
  } = props;
  
  const [category, setCategory] = useState('pagadas'); // pagadas | diarias | partners

  const communityTasks = tasks.filter(t => t.status === 'active' && t.creator_id !== String(userData?.id))
    .sort((a, b) => { if (a.is_completed === b.is_completed) return 0; return a.is_completed ? 1 : -1; });

  // 🔥 Filtros de tareas
  const pagadas = communityTasks.filter(t => t.type !== 'partner' && !t.type.includes('daily'));
  const partners = communityTasks.filter(t => t.type === 'partner');
  const diarias = communityTasks.filter(t => t.type.includes('daily'));

  const getTaskIconType = (task) => {
    if (task.logo) return task.logo;
    if (task.type === 'publish_group' || task.type === 'partner') return 'channel';
    return task.type;
  };

  const getTaskLabel = (type) => {
    if (type === 'partner') return 'Alianza Estratégica';
    if (type === 'publish_group') return 'Red Comunitaria';
    if (type === 'group' || type === 'channel') return t('ads_type_group');
    if (type === 'bot') return t('ads_type_bot');
    if (type === 'promo') return t('ads_type_promo');
    return 'Tarea';
  };

  // 🔥 DATOS RACHA DIARIA (Preparado para conectar con backend luego)
  const streakCount = userData?.streak_count || 1; 
  const gigaClaimed = taskStatus['gigapub_daily'] === 'completed';

  const renderTaskItem = (task) => {
    const iconType = getTaskIconType(task);
    const status = taskStatus[task.id];
    const isCompleted = task.is_completed || status === 'completed';
    const displayGemas = Number((Number(task.reward) * 1000).toFixed(2));

    return (
      <div key={task.id} style={{ ...neon.taskCard, flexDirection: 'column', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={neon.taskIconBox}>{TaskIcons[iconType] ? TaskIcons[iconType]('#00f0ff') : TaskIcons.promo('#00f0ff')}</div>
            <div>
              <div style={{ color: '#fff', fontSize: '14px', fontWeight: '900', letterSpacing: '0.3px' }}>{task.title}</div>
              <div style={{ color: '#00f0ff', fontSize: '11px', marginTop: '4px', fontWeight: 'bold' }}>
                {getTaskLabel(task.type)} {task.type !== 'partner' && !task.type.includes('daily') && `• ${task.completions_done} / ${task.completions_total}`}
              </div>
              {(task.type === 'channel' || task.type === 'group' || task.type === 'partner') && (
                <div style={{ color: '#ffe600', fontSize: '9px', fontWeight: '900', marginTop: '4px', textTransform: 'uppercase' }}>
                  🛡️ Permanencia requerida: 24h
                </div>
              )}
            </div>
          </div>
          
          {/* Botón de acción */}
          {task.needs_rejoin ? <button onClick={() => handleStartTask(task)} style={neon.taskButtonRejoin}>RESTAURAR</button> :
           isCompleted ? <button disabled style={neon.taskButtonDisabled}>{t('ads_completed')}</button> :
           status === 'waiting_for_redirect' ? <button disabled style={neon.taskButtonDisabled}>⏳ 8 SEG</button> :
           status === 'away' ? <button disabled style={neon.taskButtonDisabled}>⏳ REVISANDO...</button> :
           status === 'verifying' ? <button disabled style={neon.taskButtonDisabled}>{t('ads_btn_verifying')}</button> :
           status === 'ready_to_claim' ? (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
               {task.validation_code && (
                 <input style={{ ...neon.input, padding: '8px', fontSize: '12px', width: '130px', textAlign: 'center', background: 'rgba(0,0,0,0.5)' }} placeholder="Escribe el código..." value={verifyInputs[task.id] || ''} onChange={(e) => setVerifyInputs({ ...verifyInputs, [task.id]: e.target.value })} />
               )}
               <button onClick={() => handleCheckTask(task)} style={{...neon.taskButtonCheck, width: task.validation_code ? '130px' : 'auto'}}>{TaskIcons.check} RECLAMAR</button>
             </div>
           ) : <button onClick={() => handleStartTask(task)} style={neon.taskButton}>{`+${displayGemas} 💎`}</button>}
        </div>
      </div>
    );
  };

  const currentList = category === 'pagadas' ? pagadas : category === 'diarias' ? diarias : partners;

  return (
    <div className="fade-in">
      {/* 🚀 BOTÓN PREMIUM PARA CREAR CAMPAÑAS */}
      <button onClick={() => setView('wizard')} style={{
        width: '100%', padding: '16px', borderRadius: '16px',
        background: 'linear-gradient(90deg, #ff1493, #8a2be2)',
        color: '#fff', fontSize: '16px', fontWeight: '900',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
        boxShadow: '0 4px 15px rgba(255, 20, 147, 0.4)', border: 'none', cursor: 'pointer',
        marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px'
      }}>
        <span style={{ fontSize: '24px', fontWeight: '900', lineHeight: 1 }}>+</span> 
        Crear Nueva Campaña
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '0 5px' }}>
        <h4 style={{ margin: 0, color: '#fff', fontSize: '16px', fontWeight: '900', textTransform: 'uppercase' }}>{t('ads_explore')}</h4>
        <button onClick={fetchTasks} style={{ background: 'transparent', border: 'none', color: '#ff99dd', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>{t('ads_update')}</button>
      </div>

      {/* 🎯 PESTAÑAS DE CATEGORÍAS */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '16px' }}>
        <button onClick={() => setCategory('pagadas')} style={neon.subTabBtn(category === 'pagadas')}>Pagadas</button>
        <button onClick={() => setCategory('diarias')} style={neon.subTabBtn(category === 'diarias')}>Diarias</button>
        <button onClick={() => setCategory('partners')} style={neon.subTabBtn(category === 'partners')}>Partners</button>
      </div>

      {/* 🔥 SECCIÓN ESPECIAL: RACHA DIARIA GIGAPUB */}
      {category === 'diarias' && (
        <div style={{ ...neon.taskCard, borderColor: '#00ffaa', background: 'linear-gradient(145deg, rgba(0, 255, 170, 0.1), rgba(26, 11, 51, 0.9))', flexDirection: 'column', alignItems: 'stretch' }}>
          
          {/* UI de la Racha (Streak) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid rgba(0,255,170,0.2)', paddingBottom: '12px' }}>
            {[1,2,3,4,5,6,7].map(day => {
              const isPast = day < streakCount;
              const isToday = day === streakCount;
              const isFuture = day > streakCount;
              const color = isPast || (isToday && gigaClaimed) ? '#00ffaa' : isToday ? '#ffe600' : '#444';
              
              return (
                <div key={day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: isFuture ? 0.5 : 1 }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: color, color: '#050214', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '900', boxShadow: (isToday && !gigaClaimed) ? '0 0 10px #ffe600' : 'none' }}>
                    {(isPast || (isToday && gigaClaimed)) ? '✓' : day}
                  </div>
                  <span style={{ fontSize: '10px', marginTop: '6px', color: '#fff', fontWeight: 'bold' }}>{day} 💎</span>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ ...neon.taskIconBox, borderColor: '#00ffaa', background: 'rgba(0, 255, 170, 0.1)' }}>{TaskIcons.daily('#00ffaa')}</div>
              <div>
                <div style={{ color: '#fff', fontSize: '14px', fontWeight: '900', letterSpacing: '0.3px' }}>🎁 Racha Diaria (Día {streakCount})</div>
                <div style={{ color: '#00ffaa', fontSize: '11px', marginTop: '4px', fontWeight: 'bold' }}>Patrocinado por GigaPub</div>
              </div>
            </div>
            {loadingTasks ? (
               <button disabled style={{...neon.taskButtonDisabled, background: 'rgba(0, 255, 170, 0.1)', borderColor: '#00ffaa', color: '#00ffaa', opacity: 0.6}}>CARGANDO...</button>
            ) : gigaClaimed ? (
               <button disabled style={neon.taskButtonDisabled}>VUELVE MAÑANA</button>
            ) : (
               <button onClick={handlePlayGigaPub} disabled={!gigaReady || playingAd} style={{...neon.taskButton, background: 'linear-gradient(180deg, #00ffaa, #00bb77)', color: '#050214', boxShadow: '0 4px 0 #007744'}}>
                 {playingAd ? 'CARGANDO...' : `+${streakCount}.00 💎`}
               </button>
            )}
          </div>
        </div>
      )}

      {/* 📋 LISTA DE TAREAS FILTRADAS */}
      {loadingTasks ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ color: '#00f0ff', fontSize: '14px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase' }}>
            <style>{`@keyframes pulseTasks { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }`}</style>
            <div style={{ animation: 'pulseTasks 1.5s infinite' }}>Buscando Misiones...</div>
          </div>
        </div>
      ) : currentList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <p style={{ color: '#ff99dd', fontSize: '13px', fontWeight: 'bold', margin: 0, lineHeight: '1.5' }}>
             No hay misiones disponibles en esta categoría. Vuelve más tarde.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {currentList.map(renderTaskItem)}
        </div>
      )}
    </div>
  );
};


// ==========================================
// 2️⃣ COMPONENTE: MIS CAMPAÑAS (ACTIVITY)
// ==========================================
const AdsActivity = ({ props }) => {
  const { tasks, userData, handleToggleStatus, handleOpenEdit, handleDeleteTask, loadingTasks, setView, fetchTasks, t } = props;
  
  const myTasks = tasks.filter(t => t.creator_id === String(userData?.id));
  const getTaskIconType = (task) => task.logo || (task.type === 'publish_group' ? 'channel' : task.type);

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '0 5px' }}>
        <h4 style={{ margin: 0, color: '#ff41b4', fontSize: '16px', fontWeight: '900', textTransform: 'uppercase' }}>{t('ads_your_campaigns')}</h4>
        <button onClick={fetchTasks} style={{ background: 'transparent', border: 'none', color: '#ff99dd', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>{t('ads_update')}</button>
      </div>

      {loadingTasks ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ color: '#ff41b4', fontSize: '14px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase' }}>
            <style>{`@keyframes pulseMyAds { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }`}</style>
            <div style={{ animation: 'pulseMyAds 1.5s infinite' }}>Cargando tus Campañas...</div>
          </div>
        </div>
      ) : myTasks.length === 0 ? (
        <div style={{...neon.card, textAlign: 'center', padding: '30px 20px', borderColor: '#ff1493' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <div style={{ padding: '16px', background: 'rgba(255, 20, 147, 0.1)', borderRadius: '16px' }}>{TaskIcons.promo('#ff1493')}</div>
          </div>
          <p style={{ color: '#ff99dd', fontSize: '13px', lineHeight: '1.5', margin: '0 0 20px 0' }}>{t('ads_empty_my_ads')}</p>
          <button onClick={() => setView('wizard')} style={{...neon.btnPrimary, background: 'linear-gradient(180deg, #ff1493, #d80073)', boxShadow: '0 4px 15px rgba(255, 20, 147, 0.4)'}}>CREAR MI PRIMERA CAMPAÑA</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {myTasks.map((task) => {
            const percent = Math.floor((task.completions_done / task.completions_total) * 100);
            const isPaused = task.status === 'paused';
            const isCompleted = task.status === 'completed' || task.completions_done >= task.completions_total;
            const iconType = getTaskIconType(task);

            return (
              <div key={task.id} style={{...neon.taskCard, borderColor: isCompleted ? '#00ffaa' : isPaused ? '#ffaa00' : '#ff41b4', opacity: (isPaused || isCompleted) ? 0.7 : 1}}>
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                    <div style={{...neon.taskIconBox, borderColor: isCompleted ? '#00ffaa' : isPaused ? '#ffaa00' : '#ff1493', background: isCompleted ? 'rgba(0, 255, 170, 0.1)' : isPaused ? 'rgba(255, 170, 0, 0.1)' : 'rgba(255, 20, 147, 0.1)'}}>
                      {TaskIcons[iconType] ? TaskIcons[iconType](isCompleted ? '#00ffaa' : isPaused ? '#ffaa00' : '#ff1493') : TaskIcons.promo(isCompleted ? '#00ffaa' : isPaused ? '#ffaa00' : '#ff1493')}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#fff', fontSize: '14px', fontWeight: '900' }}>
                        {task.title} 
                        {isPaused && <span style={{ color: '#ffaa00', fontSize: '10px', verticalAlign: 'top', marginLeft: '4px' }}>({t('ads_paused')})</span>}
                        {isCompleted && <span style={{ color: '#00ffaa', fontSize: '10px', verticalAlign: 'top', marginLeft: '4px' }}>({t('ads_completed')})</span>}
                      </div>
                      <div style={{ color: isCompleted ? '#00ffaa' : isPaused ? '#ffaa00' : '#ff99dd', fontSize: '11px', marginTop: '4px', fontWeight: 'bold', fontFamily: 'monospace' }}>{task.url.substring(0, 25)}...</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', marginBottom: '6px' }}>
                    <span style={{ color: isCompleted ? '#00ffaa' : isPaused ? '#ffaa00' : '#ff41b4' }}>Progreso</span>
                    <span style={{ color: '#fff' }}>{task.completions_done} / {task.completions_total} usuarios</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
                    <div style={{ width: `${percent}%`, height: '100%', background: isCompleted ? 'linear-gradient(90deg, #00ffaa, #00bb77)' : isPaused ? 'linear-gradient(90deg, #ffaa00, #ffe600)' : 'linear-gradient(90deg, #ff1493, #ff66cc)', transition: 'width 0.3s ease' }}></div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    {!isCompleted && (
                      <button onClick={() => handleToggleStatus(task)} style={{ background: isPaused ? '#00ffaa' : '#ffaa00', color: '#050214', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {isPaused ? TaskIcons.play : TaskIcons.pause} {isPaused ? 'REANUDAR' : 'PAUSAR'}
                      </button>
                    )}
                    <button onClick={() => handleOpenEdit(task)} style={{ background: '#00f0ff', color: '#050214', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {TaskIcons.edit} EDITAR
                    </button>
                    {!isCompleted && (
                      <button onClick={() => handleDeleteTask(task.id)} style={{ background: '#ff1493', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {TaskIcons.trash} ELIMINAR
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
};


// ==========================================
// 3️⃣ COMPONENTE: WIZARD DE CREACIÓN
// ==========================================
const AdsWizard = ({ props }) => {
  const { 
    currentStepIndex, totalSteps, stepsFlow, currentStepId,
    taskType, setTaskType, targetUrl, setTargetUrl, botToken, setBotToken, validationCode, setValidationCode,
    completions, setCompletions, rewardPerGema, setRewardPerGema, isVerifying, handleVerifyUrl, 
    depositBalanceUsdt, campaignCostUsdt, baseCostGemas, referralFeeGemas, adminFeeGemas, totalGemasCost,
    handleCreateTaskWithVault, isGenerating, setRechargeAmount, setRecharging, prevStep, setView, TASK_TYPES, t
  } = props;

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        {currentStepIndex > 0 ? (
          <button onClick={prevStep} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '10px', padding: '6px 12px', color: '#fff', fontWeight: '900', cursor: 'pointer' }}>◀</button>
        ) : <div />}
        <div style={{ fontSize: '12px', fontWeight: '900', color: '#00f0ff', letterSpacing: '1px' }}>PASO {currentStepIndex + 1} DE {totalSteps}</div>
        <button onClick={() => { setView('list'); setTaskType(null); }} style={{ background: '#ff1493', border: 'none', borderRadius: '10px', padding: '6px 12px', color: '#fff', fontWeight: '900', cursor: 'pointer' }}>✕</button>
      </div>
      <div style={neon.progressBox}>{stepsFlow.map((step, idx) => <div key={idx} style={neon.progressStep(idx <= currentStepIndex)} />)}</div>

      {currentStepId === 'type' && (
        <div className="fade-in">
          <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#ffe600', marginBottom: '16px', textTransform: 'uppercase' }}>Seleccione el objetivo</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {TASK_TYPES.map((type) => (
              <div key={type.id} onClick={() => { setTaskType(type.id); props.nextStep(); }}
                style={{ ...neon.cardInteractive, borderColor: taskType === type.id ? type.color : '#8a2be2', background: taskType === type.id ? `linear-gradient(135deg, ${type.color}22, rgba(18, 7, 36, 0.9))` : neon.cardInteractive.background }}>
                <div style={{ width: '44px', height: '44px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{type.icon}</div>
                <div>
                  <div style={{ color: '#fff', fontSize: '15px', fontWeight: '900', lineHeight: '1.2' }}>{type.title}</div>
                  <div style={{ color: '#ff99dd', fontSize: '11px', fontWeight: 'bold', marginTop: '4px' }}>{type.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentStepId === 'url' && (
        <div className="fade-in">
          <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#ffe600', marginBottom: '16px', textTransform: 'uppercase' }}>Enlace Destino</h3>
          <div style={neon.card}>
            <p style={{ color: '#ff99dd', fontSize: '13px', marginBottom: '16px', lineHeight: '1.4', fontWeight: 'bold' }}>
              {taskType === 'bot' && t('ads_url_desc_bot')}
              {taskType === 'channel' && t('ads_url_desc_channel')}
              {taskType === 'promo' && 'Dirige tráfico a tu sitio web, video o app.'}
            </p>
            <input style={neon.input} placeholder="https://t.me/..." value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} />
            
            {taskType === 'promo' && (
              <div style={{ marginTop: '16px', borderTop: '1px dashed #8a2be2', paddingTop: '16px' }}>
                <label style={neon.label}>Código de Validación (Opcional)</label>
                <input style={{...neon.input, background: 'rgba(0,0,0,0.4)', borderColor: '#00f0ff'}} placeholder="Ej: MIBOT2026" value={validationCode} onChange={(e) => setValidationCode(e.target.value)} />
                <p style={{ fontSize: '11px', color: '#00f0ff', marginTop: '6px', fontWeight: 'bold' }}>Obliga a los usuarios a buscar este código en tu web para cobrar.</p>
              </div>
            )}
          </div>
          <button onClick={handleVerifyUrl} disabled={isVerifying} style={neon.btnPrimary}>{isVerifying ? 'VERIFICANDO...' : 'VALIDAR ➔'}</button>
        </div>
      )}

      {currentStepId === 'token' && (
        <div className="fade-in">
          <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#ffe600', marginBottom: '16px', textTransform: 'uppercase' }}>Autenticación del Bot</h3>
          <div style={{...neon.card, borderColor: '#ff41b4'}}>
            <input style={{...neon.input, borderColor: '#ff41b4'}} placeholder="Token de @BotFather" value={botToken} onChange={(e) => setBotToken(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={props.nextStep} style={{...neon.btnSecondary, flex: 1, border: '1px solid #8a2be2', color: '#8a2be2'}}>OMITIR</button>
            <button onClick={props.nextStep} style={{...neon.btnPrimary, flex: 1}}>CONTINUAR ➔</button>
          </div>
        </div>
      )}

      {currentStepId === 'budget' && (
        <div className="fade-in" style={neon.calcContainer}>
          <h2 style={{ margin: '0 0 10px 0', fontSize: '22px', fontWeight: '900', color: '#ffffff' }}>Configuración Final</h2>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <button onClick={() => setCompletions(100)} style={neon.pillButton(completions === 100)}>100</button>
            <button onClick={() => setCompletions(500)} style={neon.pillButton(completions === 500)}>500</button>
            <button onClick={() => setCompletions(1000)} style={neon.pillButton(completions === 1000)}>1K</button>
            <button onClick={() => setCompletions(5000)} style={neon.pillButton(completions === 5000)}>5K</button>
          </div>

          <span style={neon.label}>Usuarios a contratar</span>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button onClick={() => setCompletions(p => Math.max(10, p - 10))} style={neon.btnActionCalc}>-</button>
            <input type="number" value={completions} onChange={(e) => setCompletions(Number(e.target.value) || 0)} style={neon.inputCalc} />
            <button onClick={() => setCompletions(p => p + 10)} style={neon.btnActionCalc}>+</button>
          </div>

          <span style={neon.label}>Pago por usuario (Gemas)</span>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button onClick={() => setRewardPerGema(p => Math.max(1, p - 0.5))} style={neon.btnActionCalc}>-</button>
            <input type="number" step="0.5" max="2.5" value={rewardPerGema} onChange={(e) => setRewardPerGema(Math.min(2.5, Number(e.target.value) || 0))} style={neon.inputCalc} />
            <button onClick={() => setRewardPerGema(p => Math.min(2.5, p + 0.5))} style={neon.btnActionCalc}>+</button>
          </div>

          <div style={neon.summaryBox}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', color: '#ff99dd', marginBottom: '6px' }}>Total a repartir en red: {baseCostGemas + referralFeeGemas} 💎</div>
              <div style={{ fontWeight: '900', fontSize: '13px', color: '#ffffff' }}>INVERSIÓN REQUERIDA:</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: '900', fontSize: '20px', color: '#00f0ff' }}>{totalGemasCost} 💎</div>
              <div style={{ fontSize: '12px', color: '#00f0ff', opacity: 0.8 }}>${campaignCostUsdt.toFixed(2)} USDT</div>
            </div>
          </div>

          {depositBalanceUsdt >= campaignCostUsdt ? (
            <button onClick={handleCreateTaskWithVault} disabled={isGenerating} style={neon.actionBtn}>
              {isGenerating ? 'PROCESANDO...' : '✔️ ACTIVAR CAMPAÑA'}
            </button>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: '12px', fontSize: '12px', color: '#ff4b4b', fontWeight: 'bold' }}>Faltan USDT en la Bóveda</div>
              <button onClick={() => { setRechargeAmount(Math.ceil(campaignCostUsdt)); setRecharging(true); }} style={neon.actionBtnDanger}>RECARGAR BÓVEDA</button>
            </>
          )}
        </div>
      )}
    </div>
  );
};


// ==========================================
// 🚀 COMPONENTE PRINCIPAL (AdsTab Padre)
// ==========================================
export default function AdsTab({ userData, setUserData, t }) {
  const [view, setView] = useState('list'); // list | activity | wizard
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  const [taskStatus, setTaskStatus] = useState({}); 
  const [verifyInputs, setVerifyInputs] = useState({}); 
  const [taskStartTimes, setTaskStartTimes] = useState({});

  // Estados del Wizard y Recarga
  const [taskType, setTaskType] = useState(null);
  const [targetUrl, setTargetUrl] = useState('');
  const [botToken, setBotToken] = useState('');
  const [validationCode, setValidationCode] = useState(''); 
  const [isVerifying, setIsVerifying] = useState(false);
  
  const [gigaReady, setGigaReady] = useState(false);
  const [playingAd, setPlayingAd] = useState(false);

  const [completions, setCompletions] = useState(100);
  const [rewardPerGema, setRewardPerGema] = useState(2.5);

  const [recharging, setRecharging] = useState(false);
  const [rechargeMethod, setRechargeMethod] = useState('gram');
  const [rechargeAmount, setRechargeAmount] = useState(10); 
  const [checkoutView, setCheckoutView] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tempWallet, setTempWallet] = useState('');
  const [intentId, setIntentId] = useState(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [liveGramUsd, setLiveGramUsd] = useState(5.00);

  const depositBalanceUsdt = Number(userData?.deposit_balance || 0);
  const apiHeaders = { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': WebApp.initData || '' };

  const TASK_TYPES = [
    { id: 'bot', icon: TaskIcons.bot('#ffe600'), title: t('ads_type_bot') || 'Bot', desc: 'Interacción con bot', color: '#ffe600', autoName: 'Campaña Bot' },
    { id: 'channel', icon: TaskIcons.channel('#00ffaa'), title: t('ads_type_group') || 'Canal', desc: 'Miembros reales', color: '#00ffaa', autoName: 'Campaña Comunidad' },
    { id: 'promo', icon: TaskIcons.promo('#ff1493'), title: t('ads_type_promo') || 'Tráfico', desc: 'Visitas web o referidos', color: '#ff1493', autoName: 'Campaña Tráfico' }
  ];

  // (Scripts y Funciones de API que ya tenías)
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://ad.gigapub.tech/script?id=8567";
    script.async = true;
    script.onload = () => setGigaReady(true);
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd')
      .then(r => r.json()).then(d => { if(d['the-open-network']?.usd) setLiveGramUsd(d['the-open-network'].usd); }).catch(()=>{});
  }, []);

  useEffect(() => {
    if (userData?.id && (view === 'list' || view === 'activity')) fetchTasks();
  }, [userData?.id, view]);

  // Antifraude Visibilidad
  useEffect(() => {
    const handleHide = () => {
      setTaskStatus(prevStatus => {
        const nextStatus = { ...prevStatus };
        let changed = false;
        const newStartTimes = {};
        Object.keys(nextStatus).forEach(id => {
          if (nextStatus[id] === 'waiting_for_redirect' || nextStatus[id] === 'ready_to_claim') {
            nextStatus[id] = 'away'; newStartTimes[id] = Date.now(); changed = true;
          }
        });
        if (changed) setTaskStartTimes(prevTimes => ({ ...prevTimes, ...newStartTimes }));
        return nextStatus;
      });
    };
    const handleShow = () => {
      setTaskStatus(prev => {
        const next = { ...prev };
        let showedError = false;
        Object.keys(next).forEach(id => {
          if (next[id] === 'away') {
            const timeAway = Date.now() - (taskStartTimes[id] || 0);
            const task = tasks.find(t => String(t.id) === String(id));
            const requiredTime = task?.type === 'promo' ? 8000 : 1500;
            if (timeAway >= requiredTime) { next[id] = 'ready_to_claim'; } 
            else {
              next[id] = 'ready'; 
              if (!showedError) { toast.error(task?.type === 'promo' ? "Debes estar 8s en la web." : "Demasiado rápido."); showedError = true; }
            }
          }
        });
        return next;
      });
    };
    document.addEventListener('visibilitychange', () => document.hidden ? handleHide() : handleShow());
    window.addEventListener('blur', handleHide); window.addEventListener('focus', handleShow);
    return () => { window.removeEventListener('blur', handleHide); window.removeEventListener('focus', handleShow); };
  }, [taskStartTimes, tasks]);

  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      const res = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: 'get-tasks', userId: userData.id }) });
      const data = await res.json();
      if (data && data.success) {
        setTasks(data.tasks || []);
        if (data.gigaPubClaimed) setTaskStatus(prev => ({ ...prev, 'gigapub_daily': 'completed' }));
      }
    } catch (e) {} finally { setLoadingTasks(false); }
  };

  const handleStartTask = (task) => {
    try {
      let finalUrl = task.url.trim();
      if (finalUrl.startsWith('@')) finalUrl = `https://t.me/${finalUrl.substring(1)}`;
      else if (!finalUrl.startsWith('http')) finalUrl = `https://${finalUrl}`;
      if (finalUrl.includes('t.me') || finalUrl.includes('telegram.me')) WebApp.openTelegramLink(finalUrl);
      else WebApp.openLink(finalUrl, { try_instant_view: true });
      setTaskStatus(prev => ({ ...prev, [task.id]: 'waiting_for_redirect' }));
    } catch (e) { toast.error("Error redirección."); }
  };

  const handlePlayGigaPub = () => {
    if (!window.showGiga) return toast.error("Servidor inactivo.");
    setPlayingAd(true); const tid = toast.loading("Cargando anuncio...");
    window.showGiga().then(async () => {
      toast.loading("Validando...", { id: tid });
      try {
        const res = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: 'claim-gigapub-daily', userId: userData.id }) });
        const data = await res.json();
        if (data.success) {
          toast.success(`+${data.earned_gemas} 💎 Recompensa Obtenida`, { id: tid });
          if (data.balance !== undefined) setUserData(prev => ({ ...prev, balance: data.balance }));
          setTaskStatus(prev => ({ ...prev, 'gigapub_daily': 'completed' }));
        } else { toast.error(data.error || "Error.", { id: tid }); }
      } catch (e) { toast.error("Error servidor.", { id: tid }); } finally { setPlayingAd(false); }
    }).catch(() => { toast.error("Debes ver completo.", { id: tid }); setPlayingAd(false); });
  };

  const handleCheckTask = async (task) => {
    const tid = toast.loading(t('ads_btn_verifying'));
    setTaskStatus(prev => ({ ...prev, [task.id]: 'verifying' }));
    try {
      const res = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: 'complete-task', userId: userData.id, taskId: task.id, validation_code_input: verifyInputs[task.id] || '' }) });
      const data = await res.json();
      if (data.success) {
        toast.success(`+${Number((Number(data.reward) * 1000).toFixed(2))} 💎`, { id: tid });
        if (data.balance !== undefined) setUserData(prev => ({ ...prev, balance: data.balance }));
        setTaskStatus(prev => ({ ...prev, [task.id]: 'completed' })); fetchTasks();
      } else { toast.error(data.error || "Error", { id: tid }); setTaskStatus(prev => ({ ...prev, [task.id]: 'ready' })); }
    } catch (e) { toast.error("Error servidor.", { id: tid }); setTaskStatus(prev => ({ ...prev, [task.id]: 'ready' })); } 
  };

  const handleToggleStatus = async (task) => {
    const isPausing = task.status === 'active'; const tid = toast.loading(isPausing ? "Pausando..." : "Reanudando...");
    try {
      const res = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: 'toggle-task-status', taskId: task.id, requestingUserId: userData.id }) });
      const data = await res.json();
      if (data.success) { toast.success("Éxito.", { id: tid }); fetchTasks(); } else { throw new Error(data.error); }
    } catch (err) { toast.error(err.message || "Error.", { id: tid }); }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("¿Eliminar campaña y reembolsar saldo?")) return;
    const tid = toast.loading("Eliminando...");
    try {
      const res = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: 'delete-task', taskId: taskId, requestingUserId: userData.id }) });
      const data = await res.json();
      if (data.success) { toast.success("Eliminada.", { id: tid }); fetchTasks(); } else { throw new Error(data.error); }
    } catch (err) { toast.error(err.message || "Error.", { id: tid }); }
  };

  const handleOpenEdit = (task) => { setEditingTask({ id: task.id, title: task.title, url: task.url, reward: Number(task.reward)||0.001, logo: task.logo||'crypto', addCompletions: 0 }); setShowEditModal(true); };

  const handleSaveEdit = async () => {
    const extraCost = Number((editingTask.addCompletions * editingTask.reward * 1.30).toFixed(4));
    if (editingTask.addCompletions > 0 && depositBalanceUsdt < extraCost) return toast.error(`Capital insuficiente.`);
    const tid = toast.loading("Aplicando...");
    try {
      const res = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: 'edit-task', taskId: editingTask.id, requestingUserId: userData.id, newTitle: editingTask.title, newUrl: editingTask.url, addCompletions: editingTask.addCompletions, newReward: editingTask.reward, newLogo: editingTask.logo }) });
      const data = await res.json();
      if (data.success) { 
        toast.success("Actualizada.", { id: tid }); 
        if (editingTask.addCompletions > 0) setUserData(p => ({...p, deposit_balance: Math.max(0, p.deposit_balance - extraCost)}));
        setShowEditModal(false); fetchTasks(); 
      } else { throw new Error(data.error); }
    } catch (err) { toast.error("Error.", { id: tid }); }
  };

  const handleVerifyUrl = async () => {
    let val = targetUrl.trim(); if (!val) return toast.error("Enlace vacío.");
    if (taskType === 'channel' || taskType === 'bot') { if (!val.startsWith('@') && !val.startsWith('t.me/') && !val.startsWith('https://t.me/')) return toast.error("Formato inválido."); }
    if (taskType === 'channel') {
      setIsVerifying(true); const tid = toast.loading("Validando admin...");
      try {
        const res = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: 'verify-admin', url: val }) });
        const data = await res.json();
        if (data.success) { toast.success("Confirmado.", { id: tid }); setCurrentStepIndex(p => p+1); } 
        else { toast.error(data.error || "Falta admin.", { id: tid }); }
      } catch (e) { toast.error("Error servidor.", { id: tid }); } finally { setIsVerifying(false); }
    } else { if (!val.startsWith('http') && !val.startsWith('@')) val = 'https://' + val; setTargetUrl(val); setCurrentStepIndex(p => p+1); }
  };

  const handleCreateTaskWithVault = async () => {
    setIsGenerating(true); const tid = toast.loading("Desplegando...");
    try {
      const res = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ creator_id: userData?.id, action: 'create-task', type: taskType, title: TASK_TYPES.find(t=>t.id===taskType)?.autoName, url: targetUrl, bot_token: botToken, completions_total: completions, reward: rewardPerGema/1000, validation_code: validationCode }) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      if (data.deposit_balance !== undefined) setUserData(p => ({ ...p, deposit_balance: data.deposit_balance }));
      toast.success("Activada exitosamente.", { id: tid });
      setTaskType(null); setTargetUrl(''); setBotToken(''); setValidationCode(''); setCompletions(100); setCurrentStepIndex(0); setRecharging(false); setView('activity');
    } catch (err) { toast.error(err.message || "Error.", { id: tid }); } finally { setIsGenerating(false); }
  };

  const handleStartRecharge = async () => {
    setIsGenerating(true); const tid = toast.loading("Conectando blockchain...");
    try {
      const amt = rechargeMethod === 'usdt' ? rechargeAmount : (rechargeAmount/liveGramUsd).toFixed(2);
      const res = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: rechargeMethod === 'usdt' ? 'generate-usdt-wallet' : 'generate-payment-wallet', userId: userData.id, price: amt, clicks: rechargeAmount }) });
      const data = await res.json();
      if (data.success) { setTempWallet(data.wallet); setIntentId(data.intentId); toast.dismiss(tid); setCheckoutView(true); }
    } catch (e) { toast.error("Error de red.", { id: tid }); } finally { setIsGenerating(false); }
  };

  const handleVerifyPayment = async () => {
    const tid = toast.loading("Verificando en blockchain...");
    try {
      const res = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: rechargeMethod === 'usdt' ? 'verify-usdt-payment' : 'verify-crypto-payment', userId: userData.id, intentId, clicks: rechargeAmount }) });
      const data = await res.json();
      if (data.success) { 
        toast.success(`Acreditado exitosamente.`, { id: tid }); 
        if (data.deposit_balance !== undefined) setUserData(p => ({ ...p, deposit_balance: data.deposit_balance }));
        setCheckoutView(false); setRecharging(false); setTempWallet(''); setIntentId(null);
      } else throw new Error(data.error);
    } catch (e) { toast.error(e.message || "No detectado aún.", { id: tid, duration: 6000 }); }
  };

  // Props inyectados a los subcomponentes
  const sharedProps = { 
    tasks, userData, taskStatus, verifyInputs, setVerifyInputs, handleStartTask, handleCheckTask, loadingTasks, setView, fetchTasks, t, gigaReady, playingAd, handlePlayGigaPub,
    handleToggleStatus, handleOpenEdit, handleDeleteTask, 
    currentStepIndex, totalSteps: taskType === 'bot' ? 4 : 3, stepsFlow: taskType === 'bot' ? ['type', 'url', 'token', 'budget'] : ['type', 'url', 'budget'], currentStepId: (taskType === 'bot' ? ['type', 'url', 'token', 'budget'] : ['type', 'url', 'budget'])[currentStepIndex],
    taskType, setTaskType, targetUrl, setTargetUrl, botToken, setBotToken, validationCode, setValidationCode, completions, setCompletions, rewardPerGema, setRewardPerGema, isVerifying, handleVerifyUrl, 
    depositBalanceUsdt, campaignCostUsdt: ((completions * rewardPerGema) * 1.3)/1000, baseCostGemas: completions * rewardPerGema, referralFeeGemas: Math.floor((completions * rewardPerGema)*0.20), adminFeeGemas: Math.floor((completions * rewardPerGema)*0.10), totalGemasCost: (completions * rewardPerGema) + Math.floor((completions * rewardPerGema)*0.20) + Math.floor((completions * rewardPerGema)*0.10),
    handleCreateTaskWithVault, isGenerating, setRechargeAmount, setRecharging, nextStep: () => setCurrentStepIndex(p => p+1), prevStep: () => setCurrentStepIndex(p => Math.max(p - 1, 0)), TASK_TYPES,
    recharging, rechargeMethod, setRechargeMethod, rechargeAmount, checkoutView, tempWallet, intentId, liveGramUsd, handleStartRecharge, handleVerifyPayment, cancelCheckout: () => { setCheckoutView(false); setRecharging(false); }
  };

  return (
    <div style={{ color: '#ffffff', paddingBottom: '20px' }}>
      <Toaster containerStyle={{ zIndex: 9999999 }} />

      {(view === 'list' || view === 'activity') && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          <button onClick={() => setView('list')} style={{ flex: 1, padding: '12px', borderRadius: '16px', fontWeight: '900', fontSize: '13px', border: 'none', cursor: 'pointer', transition: '0.2s', background: view === 'list' ? 'linear-gradient(90deg, #00f0ff, #0088ff)' : 'rgba(255,255,255,0.05)', color: view === 'list' ? '#050214' : '#00f0ff', boxShadow: view === 'list' ? '0 4px 15px rgba(0,240,255,0.3)' : 'none', letterSpacing: '0.5px' }}>{t('ads_tab_market') || 'MERCADO'}</button>
          <button onClick={() => setView('activity')} style={{ flex: 1, padding: '12px', borderRadius: '16px', fontWeight: '900', fontSize: '13px', border: 'none', cursor: 'pointer', transition: '0.2s', background: view === 'activity' ? 'linear-gradient(90deg, #ff1493, #8a2be2)' : 'rgba(255,255,255,0.05)', color: view === 'activity' ? '#fff' : '#ff41b4', boxShadow: view === 'activity' ? '0 4px 15px rgba(255,20,147,0.3)' : 'none', letterSpacing: '0.5px' }}>{t('ads_tab_my_ads') || 'MIS CAMPAÑAS'}</button>
        </div>
      )}

      {view === 'list' && <AdsMarket props={sharedProps} />}
      {view === 'activity' && <AdsActivity props={sharedProps} />}
      {view === 'wizard' && <AdsWizard props={sharedProps} />}

      {/* MODAL DE EDICIÓN (Global) */}
      {showEditModal && editingTask && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(5, 2, 20, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 100000, backdropFilter: 'blur(5px)' }}>
          <div style={{ ...neon.card, width: '100%', maxWidth: '340px', marginBottom: 0, borderColor: '#ffe600', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 14px 0', color: '#ffe600', fontSize: '17px', fontWeight: '900' }}>{t('ads_edit_title')}</h3>
            <div style={{ marginBottom: '10px' }}><label style={neon.label}>{t('ads_label_title')}</label><input style={neon.input} value={editingTask.title} onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })} /></div>
            <div style={{ marginBottom: '10px' }}><label style={neon.label}>{t('ads_label_url')}</label><input style={neon.input} value={editingTask.url} onChange={(e) => setEditingTask({ ...editingTask, url: e.target.value })} /></div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}><label style={neon.label}>PAGO (USDT)</label><input type="number" step="0.001" max="0.0025" style={{...neon.input, padding: '10px'}} value={editingTask.reward} onChange={(e) => setEditingTask({ ...editingTask, reward: Math.min(0.0025, Number(e.target.value)||0.001) })} /></div>
              <div style={{ flex: 1 }}><label style={neon.label}>ICONO 3D</label><select style={{...neon.input, padding: '10px', backgroundColor: 'rgba(0,0,0,0.8)'}} value={editingTask.logo} onChange={(e) => setEditingTask({ ...editingTask, logo: e.target.value })}><option value="crypto">💎 Criptomoneda</option><option value="game">🎮 Juego Web3</option><option value="money">💵 Dinero / Cash</option><option value="web3">🌐 Nodos Web3</option><option value="bot">🤖 Bot de Telegram</option><option value="channel">📢 Canal / Comunidad</option></select></div>
            </div>
            <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px dashed #00f0ff' }}>
              <label style={{...neon.label, color: '#00f0ff'}}>INYECCIÓN DE CUPOS EXTRA (OPCIONAL)</label>
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}><button onClick={() => setEditingTask(prev => ({...prev, addCompletions: Math.max(0, prev.addCompletions - 10)}))} style={{...neon.btnActionCalc, width: '35px', height: '35px', fontSize: '18px'}}>-</button><input type="number" style={{...neon.inputCalc, padding: '5px', fontSize: '16px'}} value={editingTask.addCompletions} onChange={(e) => setEditingTask(prev => ({...prev, addCompletions: Number(e.target.value) || 0}))} /><button onClick={() => setEditingTask(prev => ({...prev, addCompletions: prev.addCompletions + 10}))} style={{...neon.btnActionCalc, width: '35px', height: '35px', fontSize: '18px'}}>+</button></div>
              {editingTask.addCompletions > 0 && <div style={{ fontSize: '11px', color: depositBalanceUsdt >= (editingTask.addCompletions * editingTask.reward * 1.30) ? '#00ffaa' : '#ff4b4b', marginTop: '10px', fontWeight: 'bold' }}>Costo táctico: -${(editingTask.addCompletions * editingTask.reward * 1.30).toFixed(4)} USDT de Bóveda</div>}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowEditModal(false)} style={{ ...neon.btnSecondary, flex: 1 }}>{t('ads_btn_cancel')}</button>
              <button onClick={handleSaveEdit} style={{ ...neon.btnPrimary, flex: 2, background: 'linear-gradient(180deg, #ffe600, #ffaa00)', color: '#050214', boxShadow: '0 6px 0 #cc8800' }}>{t('ads_btn_update')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
