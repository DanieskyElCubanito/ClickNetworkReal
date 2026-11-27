import React from 'react';
import { TaskIcons } from './AdsStyles';

const goldChampagne = '#D4AF7A';
const champagneBright = '#E2C290';
const champagneDark = '#B88E56';
const slateText = '#F3F4F6';
const slateMuted = '#94A3B8';

const surfaceCard = {
  background: 'linear-gradient(145deg, #141D26 0%, #1B2632 100%)',
  border: '1px solid rgba(212, 175, 122, 0.35)',
  borderRadius: '18px',
  padding: '16px',
  marginBottom: '12px',
  boxShadow: '0 8px 24px rgba(11, 17, 23, 0.45), inset 0 1px 0 rgba(226, 194, 144, 0.16)'
};

const primaryGoldBtn = {
  width: '100%',
  padding: '12px 16px',
  background: `linear-gradient(135deg, ${champagneBright} 0%, ${champagneDark} 100%)`,
  color: '#0E151C',
  border: '1px solid rgba(226, 194, 144, 0.6)',
  borderRadius: '12px',
  fontWeight: '800',
  fontSize: '13px',
  cursor: 'pointer',
  letterSpacing: '0.4px'
};

const secondaryActionBtn = {
  background: 'rgba(14, 21, 28, 0.72)',
  color: slateText,
  border: '1px solid rgba(212, 175, 122, 0.35)',
  borderRadius: '9px',
  padding: '6px 11px',
  fontSize: '11px',
  fontWeight: '700',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px'
};

export default function AdsActivity({ props }) {
  const {
    tasks,
    userData,
    handleToggleStatus,
    handleOpenEdit,
    handleDeleteTask,
    loadingTasks,
    setView,
    fetchTasks,
    t
  } = props;

  const myTasks = (tasks || []).filter((item) => item.creator_id === String(userData?.id));
  const getTaskIconType = (task) => task.logo || (task.type === 'publish_group' ? 'channel' : task.type);

  return (
    <div className="fade-in" style={{ color: slateText }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '14px',
          padding: '0 4px'
        }}
      >
        <h4
          style={{
            margin: 0,
            color: slateText,
            fontSize: '15px',
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
        >
          {t?.('ads_your_campaigns') || 'MIS CAMPAÑAS'}
        </h4>
        <button
          type="button"
          onClick={fetchTasks}
          style={{
            background: 'rgba(20, 29, 38, 0.85)',
            border: '1px solid rgba(212, 175, 122, 0.35)',
            borderRadius: '9px',
            color: goldChampagne,
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: '700',
            padding: '5px 10px'
          }}
        >
          {t?.('ads_update') || 'ACTUALIZAR'}
        </button>
      </div>

      {loadingTasks ? (
        <div style={{ ...surfaceCard, textAlign: 'center', padding: '32px 16px' }}>
          <style>{`@keyframes pulseChampagne { 0% { opacity: 0.45; } 50% { opacity: 1; } 100% { opacity: 0.45; } }`}</style>
          <div
            style={{
              color: goldChampagne,
              fontSize: '13px',
              fontWeight: '800',
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              animation: 'pulseChampagne 1.5s infinite'
            }}
          >
            Cargando tus campañas...
          </div>
        </div>
      ) : myTasks.length === 0 ? (
        <div style={{ ...surfaceCard, textAlign: 'center', padding: '28px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: 'rgba(14, 21, 28, 0.75)',
                border: '1px solid rgba(212, 175, 122, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {TaskIcons.promo ? TaskIcons.promo(goldChampagne) : null}
            </div>
          </div>
          <p style={{ color: slateMuted, fontSize: '13px', lineHeight: '1.5', margin: '0 0 18px 0' }}>
            {t?.('ads_empty_my_ads') || 'Aún no has creado campañas.'}
          </p>
          <button type="button" onClick={() => setView('wizard')} style={primaryGoldBtn}>
            CREAR MI PRIMERA CAMPAÑA
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {myTasks.map((task) => {
            const total = Math.max(1, Number(task.completions_total || 1));
            const done = Number(task.completions_done || 0);
            const percent = Math.min(100, Math.floor((done / total) * 100));
            const isPaused = task.status === 'paused';
            const isCompleted = task.status === 'completed' || done >= total;
            const iconType = getTaskIconType(task);
            const iconFn = TaskIcons[iconType] || TaskIcons.promo;
            const rewardTgm = Number((Number(task.reward || 0) * 1000).toFixed(2));

            return (
              <div
                key={task.id}
                style={{
                  ...surfaceCard,
                  opacity: isPaused || isCompleted ? 0.78 : 1
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: 'rgba(14, 21, 28, 0.8)',
                      border: '1px solid rgba(212, 175, 122, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {iconFn ? iconFn(goldChampagne) : null}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        color: slateText,
                        fontSize: '14px',
                        fontWeight: '800',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {task.title}
                      {isPaused && (
                        <span style={{ color: goldChampagne, fontSize: '10px', marginLeft: '6px' }}>
                          ({t?.('ads_paused') || 'PAUSADA'})
                        </span>
                      )}
                      {isCompleted && (
                        <span style={{ color: champagneBright, fontSize: '10px', marginLeft: '6px' }}>
                          ({t?.('ads_completed') || 'COMPLETADA'})
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        color: slateMuted,
                        fontSize: '11px',
                        marginTop: '3px',
                        fontFamily: 'monospace',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {task.url}
                    </div>

                    <div
                      style={{
                        color: goldChampagne,
                        fontSize: '11px',
                        marginTop: '5px',
                        fontWeight: '700'
                      }}
                    >
                      Pago por usuario: +{rewardTgm} $TGM
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    fontWeight: '700',
                    marginBottom: '6px'
                  }}
                >
                  <span style={{ color: slateMuted }}>Progreso</span>
                  <span style={{ color: slateText }}>
                    {done} / {total} usuarios ({percent}%)
                  </span>
                </div>

                <div
                  style={{
                    width: '100%',
                    height: '7px',
                    background: 'rgba(11, 17, 23, 0.9)',
                    border: '1px solid rgba(212, 175, 122, 0.2)',
                    borderRadius: '999px',
                    overflow: 'hidden',
                    marginBottom: '12px'
                  }}
                >
                  <div
                    style={{
                      width: `${percent}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, ${champagneDark} 0%, ${champagneBright} 100%)`,
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                  {!isCompleted && (
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(task)}
                      style={{
                        ...secondaryActionBtn,
                        color: isPaused ? champagneBright : slateText
                      }}
                    >
                      {isPaused ? TaskIcons.play : TaskIcons.pause}
                      <span>{isPaused ? 'REANUDAR' : 'PAUSAR'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(task)}
                    style={{
                      ...secondaryActionBtn,
                      background: `linear-gradient(135deg, ${champagneBright} 0%, ${champagneDark} 100%)`,
                      color: '#0E151C',
                      border: '1px solid rgba(226, 194, 144, 0.6)'
                    }}
                  >
                    {TaskIcons.edit}
                    <span>EDITAR</span>
                  </button>

                  {!isCompleted && (
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(task.id)}
                      style={{
                        ...secondaryActionBtn,
                        color: slateMuted
                      }}
                    >
                      {TaskIcons.trash}
                      <span>ELIMINAR</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
