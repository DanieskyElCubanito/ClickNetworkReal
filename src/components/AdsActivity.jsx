// AdsActivity.jsx
import React from 'react';
import { neon, TaskIcons } from './AdsStyles';

export default function AdsActivity({ props }) {
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
}
