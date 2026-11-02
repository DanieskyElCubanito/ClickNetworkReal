// AdsMarket.jsx
import React, { useState } from 'react';
import { neon, TaskIcons } from './AdsStyles';

export default function AdsMarket({ props }) {
  const { 
    tasks, userData, taskStatus, verifyInputs, setVerifyInputs, 
    handleStartTask, handleCheckTask, loadingTasks, setView, fetchTasks, t,
    gigaReady, playingAd, handlePlayGigaPub
  } = props;
  
  const [category, setCategory] = useState('pagadas'); // pagadas | diarias | partners

  const communityTasks = tasks.filter(t => t.status === 'active' && t.creator_id !== String(userData?.id))
    .sort((a, b) => { if (a.is_completed === b.is_completed) return 0; return a.is_completed ? 1 : -1; });

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

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '16px' }}>
        <button onClick={() => setCategory('pagadas')} style={neon.subTabBtn(category === 'pagadas')}>Pagadas</button>
        <button onClick={() => setCategory('diarias')} style={neon.subTabBtn(category === 'diarias')}>Diarias</button>
        <button onClick={() => setCategory('partners')} style={neon.subTabBtn(category === 'partners')}>Partners</button>
      </div>

      {category === 'diarias' && (
        <div style={{ ...neon.taskCard, borderColor: '#00ffaa', background: 'linear-gradient(145deg, rgba(0, 255, 170, 0.1), rgba(26, 11, 51, 0.9))', flexDirection: 'column', alignItems: 'stretch' }}>
          
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
}
