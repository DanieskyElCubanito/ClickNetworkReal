import React, { useState } from 'react';
import toast from 'react-hot-toast';
import WebApp from '@twa-dev/sdk';
import { TaskIcons } from './AdsStyles';

const goldBorder = '1px solid rgba(212, 175, 122, 0.35)';
const champagneGrad = 'linear-gradient(135deg, #E2C290 0%, #B88E56 100%)';
const slateCard = 'linear-gradient(145deg, #141D26 0%, #1B2632 100%)';

const SvgIcon = {
  globe: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D4AF7A" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  check: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  plus: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
};

const cardPanel = {
  background: slateCard,
  border: goldBorder,
  borderRadius: '18px',
  padding: '16px',
  marginBottom: '14px',
  boxShadow: '0 8px 24px rgba(11, 17, 23, 0.45), inset 0 1px 0 rgba(226, 194, 144, 0.14)'
};

const darkActionBtn = {
  background: '#0E151C',
  border: goldBorder,
  borderRadius: '10px',
  color: '#F3F4F6',
  fontWeight: '700',
  cursor: 'pointer',
  boxShadow: 'inset 0 1px 0 rgba(226, 194, 144, 0.12)'
};

const champagneActionBtn = {
  background: champagneGrad,
  border: '1px solid rgba(226, 194, 144, 0.65)',
  borderRadius: '10px',
  color: '#0E151C',
  fontWeight: '800',
  cursor: 'pointer'
};

export default function AdsMarket({ props }) {
  const {
    tasks,
    userData,
    taskStatus,
    verifyInputs,
    setVerifyInputs,
    handleStartTask,
    handleCheckTask,
    loadingTasks,
    setView,
    t,
    lang,
    setLang,
    gigaReady,
    playingAd,
    handlePlayGigaPub
  } = props;

  const [category, setCategory] = useState('all');
  const [promoCode, setPromoCode] = useState('');
  const [redeemingPromo, setRedeemingPromo] = useState(false);

  const activeTasks = tasks
    .filter((item) => item.status === 'active')
    .map((item) => ({ ...item, type: item.type || 'promo' }))
    .sort((a, b) => (a.is_completed === b.is_completed ? 0 : a.is_completed ? 1 : -1));

  const dailyAndPartners = activeTasks.filter((item) => item.type.includes('daily') || item.type === 'partner');
  const channelsAndGroups = activeTasks.filter((item) => ['channel', 'group', 'publish_group', 'daily_channel'].includes(item.type));
  const websites = activeTasks.filter((item) => ['promo', 'daily_promo', 'web', 'website'].includes(item.type));
  const botsAndApps = activeTasks.filter((item) => ['bot', 'app', 'miniapp'].includes(item.type));

  const filteredTasks =
    category === 'all'
      ? activeTasks
      : category === 'daily_partners'
      ? dailyAndPartners
      : category === 'channels'
      ? channelsAndGroups
      : category === 'websites'
      ? websites
      : botsAndApps;

  const rawStreak = Number(userData?.streak_day ?? userData?.streak_count ?? 1);
  const streakCount = Number.isFinite(rawStreak) && rawStreak >= 1 ? Math.min(7, Math.floor(rawStreak)) : 1;

  const serverRewardTgm = Number(userData?.streak_reward_tgm ?? userData?.daily_reward_tgm);
  const streakRewardTgm =
    Number.isFinite(serverRewardTgm) && serverRewardTgm > 0
      ? Number(serverRewardTgm.toFixed(2))
      : streakCount;

  const todayKey = userData?.id ? `gigapub_claimed_${new Date().toISOString().slice(0, 10)}_${userData.id}` : '';
  const localClaimed = todayKey ? localStorage.getItem(todayKey) === 'true' : false;
  const gigaClaimed = taskStatus['gigapub_daily'] === 'completed' || localClaimed;

  const displayName =
    userData?.username && userData.username !== 'Usuario'
      ? userData.username
      : WebApp.initDataUnsafe?.user?.first_name || 'User123';
  const avatarLetter = String(displayName).charAt(0).toUpperCase() || 'U';
  const photoUrl = WebApp.initDataUnsafe?.user?.photo_url;
  const currentLang = String(lang || 'es').toUpperCase();

  const handleToggleLang = () => {
    if (typeof setLang === 'function') {
      const next = String(lang || 'es').toLowerCase() === 'es' ? 'en' : 'es';
      setLang(next);
      try { localStorage.setItem('click_lang', next); } catch {}
    }
  };

  const handleRedeemPromo = async () => {
    const cleanCode = promoCode.trim();
    if (!cleanCode) return toast.error('Ingresa un código promocional.');
    setRedeemingPromo(true);
    const tid = toast.loading('Validando código...');
    try {
      const res = await fetch('/api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': WebApp.initData || ''
        },
        body: JSON.stringify({ action: 'redeem-promo', code: cleanCode, userId: userData?.id })
      });
      const data = await res.json();
      if (data?.success) {
        toast.success(data.message || 'Código canjeado correctamente.', { id: tid });
        setPromoCode('');
      } else {
        toast.error(data?.error || 'Código no válido o expirado.', { id: tid });
      }
    } catch {
      toast.error('Error de conexión al canjear el código.', { id: tid });
    } finally {
      setRedeemingPromo(false);
    }
  };

  const getTaskMeta = (task) => {
    const type = task.type;
    if (type === 'channel' || type === 'group' || type === 'publish_group' || type === 'daily_channel') {
      return { label: 'Canal', iconKey: 'channel' };
    }
    if (type === 'bot') {
      return { label: 'Bot', iconKey: 'bot' };
    }
    if (type === 'app' || type === 'miniapp' || type === 'game') {
      return { label: 'Mini App', iconKey: 'game' };
    }
    return { label: 'Web', iconKey: 'web3' };
  };

  const renderTaskCard = (task) => {
    const status = taskStatus[task.id];
    const isCompleted = task.is_completed || status === 'completed';
    const isCreator = String(task.creator_id) === String(userData?.id);
    const rewardTgm = Math.round(Number(task.reward || 0) * 1000);
    const meta = getTaskMeta(task);
    const iconRenderer = TaskIcons[task.logo] || TaskIcons[meta.iconKey] || TaskIcons.promo;

    return (
      <div
        key={task.id}
        style={{
          ...cardPanel,
          padding: '12px 14px',
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '11px',
              background: '#0E151C',
              border: goldBorder,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            {iconRenderer ? iconRenderer('#D4AF7A') : null}
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: '14px',
                fontWeight: '700',
                color: '#F3F4F6',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {task.title}
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '600', marginTop: '1px' }}>
              {meta.label}
            </div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: '#E2C290', marginTop: '3px' }}>
              +{rewardTgm} $TGM
            </div>
          </div>
        </div>

        <div style={{ flexShrink: 0 }}>
          {isCreator ? (
            <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '700' }}>Propia</span>
          ) : isCompleted ? (
            <button
              type="button"
              disabled
              style={{ ...darkActionBtn, padding: '8px 16px', fontSize: '12px', color: '#94A3B8', opacity: 0.5, cursor: 'not-allowed' }}
            >
              Listo
            </button>
          ) : status === 'ready_to_claim' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
              {task.validation_code && (
                <input
                  style={{
                    background: '#0E151C',
                    border: goldBorder,
                    borderRadius: '8px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    color: '#F3F4F6',
                    width: '96px'
                  }}
                  placeholder="Código"
                  value={verifyInputs[task.id] || ''}
                  onChange={(e) => setVerifyInputs({ ...verifyInputs, [task.id]: e.target.value })}
                />
              )}
              <button
                type="button"
                onClick={() => handleCheckTask(task)}
                style={{ ...champagneActionBtn, padding: '8px 18px', fontSize: '13px' }}
              >
                Cobrar
              </button>
            </div>
          ) : status === 'waiting_for_redirect' || status === 'away' || status === 'verifying' ? (
            <button
              type="button"
              disabled
              style={{ ...darkActionBtn, padding: '8px 14px', fontSize: '12px', color: '#94A3B8', cursor: 'wait' }}
            >
              ...
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleStartTask(task)}
              style={{ ...darkActionBtn, padding: '8px 22px', fontSize: '13px' }}
            >
              {t?.('ads_btn_go') || 'Ir'}
            </button>
          )}
        </div>
      </div>
    );
  };

  const filterOptions = [
    { id: 'all', label: 'Todas' },
    { id: 'daily_partners', label: 'Diarias & Partners' },
    { id: 'channels', label: 'Canales & Grupos' },
    { id: 'websites', label: 'Sitios Web' },
    { id: 'bots', label: 'Bots & Mini Apps' }
  ];

  return (
    <div className="fade-in" style={{ color: '#F3F4F6' }}>
      {/* Cabecera superior */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 2px 14px 2px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {photoUrl ? (
            <img
              src={photoUrl}
              alt="Avatar"
              style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', border: goldBorder }}
            />
          ) : (
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: slateCard,
                border: goldBorder,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '800',
                fontSize: '13px',
                color: '#E2C290'
              }}
            >
              {avatarLetter}
            </div>
          )}
          <span style={{ fontSize: '15px', fontWeight: '700', color: '#F3F4F6' }}>{displayName}</span>
        </div>

        <button
          type="button"
          onClick={handleToggleLang}
          style={{
            background: '#141D26',
            border: goldBorder,
            borderRadius: '10px',
            padding: '5px 10px',
            color: '#F3F4F6',
            fontSize: '12px',
            fontWeight: '700',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer'
          }}
        >
          {SvgIcon.globe}
          <span>{currentLang}</span>
        </button>
      </div>

      {/* Recompensa Diaria (1 a 7) */}
      <div style={cardPanel}>
        <div style={{ textAlign: 'center', fontSize: '15px', fontWeight: '700', color: '#F3F4F6', marginBottom: '14px' }}>
          {t?.('ads_daily_reward_title') || 'Recompensa Diaria'}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', marginBottom: '16px' }}>
          {[1, 2, 3, 4, 5, 6, 7].map((day, idx) => {
            const isPast = day < streakCount;
            const isCurrent = day === streakCount;
            const done = isPast || (isCurrent && gigaClaimed);

            return (
              <React.Fragment key={day}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: '700',
                    color: done ? '#E2C290' : isCurrent ? '#F3F4F6' : '#94A3B8',
                    background: isCurrent && !gigaClaimed
                      ? 'radial-gradient(circle, rgba(226, 194, 144, 0.24) 0%, #0E151C 78%)'
                      : '#0E151C',
                    border: isCurrent && !gigaClaimed
                      ? '1.5px solid rgba(226, 194, 144, 0.75)'
                      : goldBorder,
                    boxShadow: isCurrent && !gigaClaimed ? '0 0 12px rgba(212, 175, 122, 0.28)' : 'none',
                    flexShrink: 0
                  }}
                >
                  {done ? SvgIcon.check : day}
                </div>
                {idx < 6 && (
                  <div
                    style={{
                      flex: 1,
                      height: '1px',
                      background: 'rgba(212, 175, 122, 0.24)',
                      minWidth: '4px'
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handlePlayGigaPub}
          disabled={loadingTasks || gigaClaimed || !gigaReady || playingAd}
          style={{
            ...darkActionBtn,
            width: '100%',
            padding: '11px 14px',
            fontSize: '14px',
            opacity: loadingTasks || gigaClaimed || !gigaReady || playingAd ? 0.6 : 1
          }}
        >
          {gigaClaimed
            ? t?.('ads_daily_come_back') || 'Racha Reclamada Hoy'
            : playingAd
            ? 'Validando...'
            : `Reclamar Racha Diaria (+${streakRewardTgm} $TGM)`}
        </button>
      </div>

      {/* Código promo + Canjear */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', alignItems: 'center' }}>
        <input
          type="text"
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value)}
          placeholder="Código promo..."
          style={{
            flex: 1,
            background: '#0E151C',
            border: goldBorder,
            borderRadius: '12px',
            padding: '11px 14px',
            color: '#F3F4F6',
            fontSize: '14px',
            outline: 'none'
          }}
        />
        <button
          type="button"
          onClick={handleRedeemPromo}
          disabled={redeemingPromo}
          style={{
            ...champagneActionBtn,
            padding: '11px 22px',
            fontSize: '14px',
            whiteSpace: 'nowrap'
          }}
        >
          {redeemingPromo ? '...' : 'Canjear'}
        </button>
      </div>

      {/* Mis Campañas | + Crear Campaña */}
      <div
        style={{
          ...cardPanel,
          padding: '10px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px'
        }}
      >
        <button
          type="button"
          onClick={() => setView('activity')}
          style={{ ...darkActionBtn, padding: '10px 8px', fontSize: '13px' }}
        >
          {t?.('ads_tab_my_ads') || 'Mis Campañas'}
        </button>

        <button
          type="button"
          onClick={() => setView('wizard')}
          style={{
            ...darkActionBtn,
            padding: '10px 8px',
            fontSize: '13px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          {SvgIcon.plus}
          <span>{t?.('ads_btn_create') || 'Crear Campaña'}</span>
        </button>
      </div>

      {/* Filtros de categoría */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
        {filterOptions.map((opt) => {
          const active = category === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setCategory(opt.id)}
              style={{
                padding: '7px 14px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                color: active ? '#0E151C' : '#94A3B8',
                background: active ? champagneGrad : '#0E151C',
                border: active ? '1px solid rgba(226, 194, 144, 0.65)' : goldBorder
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Lista de misiones */}
      {loadingTasks ? (
        <div style={{ ...cardPanel, textAlign: 'center', color: '#94A3B8', fontSize: '13px', padding: '24px' }}>
          {t?.('ads_btn_loading') || 'Sincronizando...'}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div style={{ ...cardPanel, textAlign: 'center', color: '#94A3B8', fontSize: '13px', padding: '24px' }}>
          {t?.('ads_empty_category') || 'No hay misiones disponibles en este filtro.'}
        </div>
      ) : (
        <div>{filteredTasks.map(renderTaskCard)}</div>
      )}
    </div>
  );
}
