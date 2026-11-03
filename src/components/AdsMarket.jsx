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

  // 🔥 NUEVO FILTRADO: Ajustado a las misiones maestras
  const pagadas = communityTasks.filter(t => !t.type.includes('daily') && t.type !== 'partner');
  const partners = communityTasks.filter(t => t.type === 'partner');
  const diarias = communityTasks.filter(t => t.type.includes('daily'));

  const getTaskIconType = (task) => {
    if (task.logo) return task.logo;
    if (task.type === 'publish_group' || task.type === 'partner' || task.type === 'daily_channel') return 'channel';
    if (task.type === 'daily_promo') return 'promo';
    return task.type;
  };

  const getTaskLabel = (type) => {
    if (type === 'partner') return t('ads_type_partner') || 'Alianza Estratégica';
    if (type === 'publish_group') return 'Red Comunitaria';
    if (type === 'group' || type === 'channel' || type === 'daily_channel') return t('ads_type_group') || 'Comunidad';
    if (type === 'bot') return t('ads_type_bot') || 'Bot';
    if (type === 'promo' || type === 'daily_promo') return t('ads_type_promo') || 'Tráfico';
    return 'Tarea';
  };

  const streakCount = userData?.streak_count || 1; 
  const gigaClaimed = taskStatus['gigapub_daily'] === 'completed';

  const renderTaskItem = (task) => {
    const iconType = getTaskIconType(task);
    const status = taskStatus[task.id];
    const isCompleted = task.is_completed || status === 'completed';
    const displayGemas = Number((Number(task.reward) * 1000).toFixed(2));
    
    // Verificación de permanencia
    const requiresRetention = ['channel', 'group', 'partner', 'daily_channel'].includes(task.type);
    
    // Barra de progreso de cupos (solo para pagadas)
    const isLimited = !task.type.includes('daily') && task.type !== 'partner';
    const fillPercent = isLimited ? Math.min((task.completions_done / task.completions_total) * 100, 100) : 0;
    const isAlmostFull = fillPercent > 85;

    // Etiqueta de rareza/dificultad gamificada
    let badgeText = "OP NORMAL";
    let badgeColor = "#ffaa00";
    if (task.type === 'partner') { badgeText = "OP ÉLITE"; badgeColor = "#ff1493"; }
    if (task.type.includes('daily')) { badgeText = "OP FLASH"; badgeColor = "#00ffaa"; }

    return (
      <div key={task.id} style={{ ...neon.taskCard, flexDirection: 'column', alignItems: 'stretch', position: 'relative', overflow: 'hidden' }}>
        
        {/* Efecto de borde brilloso si está casi llena la tarea */}
        {isLimited && isAlmostFull && !isCompleted && (
           <div style={{ position: 'absolute', top: 0, right: 0, padding: '2px 8px', background: '#ff1414', color: '#fff', fontSize: '9px', fontWeight: '900', borderBottomLeftRadius: '10px' }}>
              ⚠️ CUPOS CRÍTICOS
           </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, paddingRight: '10px' }}>
            <div style={{...neon.taskIconBox, borderColor: badgeColor, boxShadow: `0 0 10px ${badgeColor}40`}}>
               {TaskIcons[iconType] ? TaskIcons[iconType](badgeColor) : TaskIcons.promo(badgeColor)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                 <div style={{ color: '#fff', fontSize: '14px', fontWeight: '900', letterSpacing: '0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>{task.title}</div>
                 <div style={{ fontSize: '8px', background: `${badgeColor}20`, color: badgeColor, padding: '2px 6px', borderRadius: '4px', fontWeight: '900', border: `1px solid ${badgeColor}50` }}>{badgeText}</div>
              </div>
              <div style={{ color: '#00f0ff', fontSize: '11px', marginTop: '4px', fontWeight: 'bold' }}>
                {getTaskLabel(task.type)}
              </div>
              
              {/* Barra de progreso de la misión (cupos) */}
              {isLimited && (
                <div style={{ marginTop: '6px', width: '100%', maxWidth: '180px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#aaa', fontWeight: 'bold', marginBottom: '2px' }}>
                    <span>CUPOS CUBIERTOS</span>
                    <span style={{ color: isAlmostFull ? '#ff1414' : '#00f0ff'}}>{task.completions_done} / {task.completions_total}</span>
                  </div>
                  <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${fillPercent}%`, background: isAlmostFull ? '#ff1414' : '#00f0ff', transition: 'width 0.3s' }}></div>
                  </div>
                </div>
              )}

              {requiresRetention && (
                <div style={{ color: '#ffe600', fontSize: '9px', fontWeight: '900', marginTop: '6px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  🛡️ Permanencia de red: 24H
                </div>
              )}
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
            {task.needs_rejoin ? <button onClick={() => handleStartTask(task)} style={{...neon.taskButtonRejoin, boxShadow: '0 0 10px rgba(0, 255, 170, 0.4)'}}>RESTAURAR</button> :
             isCompleted ? <button disabled style={neon.taskButtonDisabled}>{t('ads_completed') || 'COMPLETADO'}</button> :
             status === 'waiting_for_redirect' ? <button disabled style={{...neon.taskButtonDisabled, color: '#ffaa00', borderColor: '#ffaa00'}}>⏳ 8 SEG</button> :
             status === 'away' ? <button disabled style={{...neon.taskButtonDisabled, color: '#00f0ff', borderColor: '#00f0ff'}}>⏳ REVISANDO...</button> :
             status === 'verifying' ? <button disabled style={neon.taskButtonDisabled}>{t('ads_btn_verifying') || 'VERIFICANDO...'}</button> :
             status === 'ready_to_claim' ? (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                 {task.validation_code && (
                   <input style={{ ...neon.input, padding: '6px', fontSize: '11px', width: '120px', textAlign: 'center', background: 'rgba(0,0,0,0.5)', borderColor: '#00ffaa' }} placeholder="Código..." value={verifyInputs[task.id] || ''} onChange={(e) => setVerifyInputs({ ...verifyInputs, [task.id]: e.target.value })} />
                 )}
                 <button onClick={() => handleCheckTask(task)} style={{...neon.taskButtonCheck, width: task.validation_code ? '120px' : 'auto', background: 'linear-gradient(90deg, #00ffaa, #00bb77)', color: '#050214', border: 'none'}}>{TaskIcons.check} RECLAMAR</button>
               </div>
             ) : <button onClick={() => handleStartTask(task)} style={{...neon.taskButton, background: `linear-gradient(180deg, ${badgeColor}, ${badgeColor}aa)`, color: '#050214', border: 'none', boxShadow: `0 4px 0 ${badgeColor}60`}}>{`+${displayGemas} 💎`}</button>}
          </div>
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
        {t('ads_btn_create')}
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '0 5px' }}>
        <h4 style={{ margin: 0, color: '#fff', fontSize: '16px', fontWeight: '900', textTransform: 'uppercase' }}>{t('ads_explore') || 'EXPLORAR'}</h4>
        <button onClick={fetchTasks} style={{ background: 'transparent', border: 'none', color: '#ff99dd', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>{t('ads_update') || 'ACTUALIZAR'}</button>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '16px' }}>
        <button onClick={() => setCategory('pagadas')} style={neon.subTabBtn(category === 'pagadas')}>{t('ads_cat_pagadas')}</button>
        <button onClick={() => setCategory('diarias')} style={neon.subTabBtn(category === 'diarias')}>{t('ads_cat_diarias')}</button>
        <button onClick={() => setCategory('partners')} style={neon.subTabBtn(category === 'partners')}>{t('ads_cat_partners')}</button>
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
                <div style={{ color: '#fff', fontSize: '14px', fontWeight: '900', letterSpacing: '0.3px' }}>
                  {t('ads_daily_streak') ? t('ads_daily_streak').replace('{day}', streakCount) : `🎁 Racha Diaria (Día ${streakCount})`}
                </div>
                <div style={{ color: '#00ffaa', fontSize: '11px', marginTop: '4px', fontWeight: 'bold' }}>{t('ads_daily_sponsor') || 'Patrocinado por GigaPub'}</div>
              </div>
            </div>
            {loadingTasks ? (
               <button disabled style={{...neon.taskButtonDisabled, background: 'rgba(0, 255, 170, 0.1)', borderColor: '#00ffaa', color: '#00ffaa', opacity: 0.6}}>CARGANDO...</button>
            ) : gigaClaimed ? (
               <button disabled style={neon.taskButtonDisabled}>{t('ads_daily_come_back') || 'VUELVE MAÑANA'}</button>
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
            <div style={{ animation: 'pulseTasks 1.5s infinite' }}>{t('ads_btn_loading') || 'Sincronizando...'}</div>
          </div>
        </div>
      ) : currentList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <p style={{ color: '#ff99dd', fontSize: '13px', fontWeight: 'bold', margin: 0, lineHeight: '1.5' }}>
             {t('ads_empty_category') || 'No hay misiones disponibles en esta categoría. Vuelve más tarde.'}
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
