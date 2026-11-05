import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import WebApp from '@twa-dev/sdk';
import { neon, TaskIcons } from './AdsStyles';

export default function AdsMarket({ props }) {
  const { 
    tasks, userData, taskStatus, verifyInputs, setVerifyInputs, 
    handleStartTask, handleCheckTask, loadingTasks, setView, fetchTasks, t,
    gigaReady, playingAd, handlePlayGigaPub
  } = props;
  
  const [category, setCategory] = useState('pagadas');
  
  const [bounties, setBounties] = useState([]);
  const [loadingBounties, setLoadingBounties] = useState(false);
  const [showCreateVipModal, setShowCreateVipModal] = useState(false);
  
  const [vipTitle, setVipTitle] = useState('');
  const [vipDescEs, setVipDescEs] = useState('');
  const [vipDescEn, setVipDescEn] = useState('');
  const [vipRewardGemas, setVipRewardGemas] = useState(10);
  const [vipCompletions, setVipCompletions] = useState(50);
  const [vipImageBase64, setVipImageBase64] = useState(''); // 🔥 Memoria para la foto de ejemplo
  
  const isComandante = String(userData?.id) === '8968109534' || String(userData?.id) === '8892196101';
  const apiHeaders = { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': WebApp.initData || '' };

  const communityTasks = tasks.filter(t => t.status === 'active')
    .sort((a, b) => { if (a.is_completed === b.is_completed) return 0; return a.is_completed ? 1 : -1; });

  const pagadas = communityTasks.filter(t => !t.type.includes('daily') && t.type !== 'partner');
  const partners = communityTasks.filter(t => t.type === 'partner');
  const diarias = communityTasks.filter(t => t.type.includes('daily'));

  useEffect(() => {
    if (category === 'vip' && userData?.id) fetchBounties();
  }, [category, userData?.id]);

  const fetchBounties = async () => {
    setLoadingBounties(true);
    try {
      const res = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: 'get-bounties', userId: userData.id }) });
      const data = await res.json();
      if (data.success) setBounties(data.bounties || []);
    } catch (e) { toast.error("Error al cargar VIPs"); }
    finally { setLoadingBounties(false); }
  };

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
    
    const isCreator = task.creator_id === String(userData?.id); 
    const requiresRetention = ['channel', 'group', 'partner', 'daily_channel'].includes(task.type);
    
    const isLimited = !task.type.includes('daily') && task.type !== 'partner';
    const fillPercent = isLimited ? Math.min((task.completions_done / task.completions_total) * 100, 100) : 0;
    const isAlmostFull = fillPercent > 85;

    let badgeText = "OP NORMAL";
    let badgeColor = "#ffaa00";
    if (task.type === 'partner') { badgeText = "OP ÉLITE"; badgeColor = "#ff1493"; }
    if (task.type.includes('daily')) { badgeText = "OP FLASH"; badgeColor = "#00ffaa"; }

    return (
      <div key={task.id} style={{ ...neon.taskCard, flexDirection: 'column', alignItems: 'stretch', position: 'relative', overflow: 'hidden' }}>
        {isLimited && isAlmostFull && !isCompleted && !isCreator && (
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
              <div style={{ color: '#00f0ff', fontSize: '11px', marginTop: '4px', fontWeight: 'bold' }}>{getTaskLabel(task.type)}</div>
              
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
              {requiresRetention && <div style={{ color: '#ffe600', fontSize: '9px', fontWeight: '900', marginTop: '6px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>🛡️ Permanencia de red: 24H</div>}
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
            {isCreator ? (
               <button disabled style={{...neon.taskButtonDisabled, color: '#ff1493', borderColor: '#ff1493'}}>TU MISIÓN</button>
            ) : task.needs_rejoin ? <button onClick={() => handleStartTask(task)} style={{...neon.taskButtonRejoin, boxShadow: '0 0 10px rgba(0, 255, 170, 0.4)'}}>RESTAURAR</button> :
             isCompleted ? <button disabled style={neon.taskButtonDisabled}>{t('ads_completed') || 'COMPLETADO'}</button> :
             status === 'waiting_for_redirect' ? <button disabled style={{...neon.taskButtonDisabled, color: '#ffaa00', borderColor: '#ffaa00'}}>⏳ 8 SEG</button> :
             status === 'away' ? <button disabled style={{...neon.taskButtonDisabled, color: '#00f0ff', borderColor: '#00f0ff'}}>⏳ REVISANDO...</button> :
             status === 'verifying' ? <button disabled style={neon.taskButtonDisabled}>{t('ads_btn_verifying') || 'VERIFICANDO...'}</button> :
             status === 'ready_to_claim' ? (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                 {task.validation_code && <input style={{ ...neon.input, padding: '6px', fontSize: '11px', width: '120px', textAlign: 'center', background: 'rgba(0,0,0,0.5)', borderColor: '#00ffaa' }} placeholder="Código..." value={verifyInputs[task.id] || ''} onChange={(e) => setVerifyInputs({ ...verifyInputs, [task.id]: e.target.value })} />}
                 <button onClick={() => handleCheckTask(task)} style={{...neon.taskButtonCheck, width: task.validation_code ? '120px' : 'auto', background: 'linear-gradient(90deg, #00ffaa, #00bb77)', color: '#050214', border: 'none'}}>{TaskIcons.check} RECLAMAR</button>
               </div>
             ) : <button onClick={() => handleStartTask(task)} style={{...neon.taskButton, background: `linear-gradient(180deg, ${badgeColor}, ${badgeColor}aa)`, color: '#050214', border: 'none', boxShadow: `0 4px 0 ${badgeColor}60`}}>{`+${displayGemas} 💎`}</button>}
          </div>
        </div>
      </div>
    );
  };

  const handleUploadProof = async (bountyId, e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 4 * 1024 * 1024) return toast.error("La imagen debe pesar menos de 4MB.");
    
    const tid = toast.loading("Procesando prueba...");
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const base64Image = reader.result;
        
        const res = await fetch('/api', { 
          method: 'POST', 
          headers: apiHeaders, 
          body: JSON.stringify({ action: 'submit-bounty', userId: userData.id, taskId: bountyId, imageBase64: base64Image }) 
        });
        const result = await res.json();
        
        if (result.success) {
           toast.success("Prueba enviada. El admin la revisará pronto.", { id: tid, duration: 4000 });
           fetchBounties();
        } else throw new Error(result.error);
      } catch (err) {
        toast.error(err.message || "Error al enviar la prueba.", { id: tid });
      }
    };
    reader.onerror = () => toast.error("Error al procesar la imagen.", { id: tid });
  };

  const handleCreateVipBounty = async () => {
    if (!vipTitle || !vipDescEs || !vipDescEn || !vipRewardGemas) return toast.error("Rellena los campos obligatorios.");
    const tid = toast.loading("Desplegando misión VIP...");
    try {
      const res = await fetch('/api', { 
        method: 'POST', 
        headers: apiHeaders, 
        body: JSON.stringify({ 
          action: 'admin-create-bounty', 
          adminId: userData.id, 
          title: vipTitle, 
          description_es: vipDescEs, 
          description_en: vipDescEn, 
          imageBase64: vipImageBase64, // 🔥 Foto enviada al backend
          reward_gemas: vipRewardGemas, 
          completions_total: vipCompletions 
        }) 
      });
      const data = await res.json();
      if (data.success) {
         toast.success("Misión VIP activada.", { id: tid });
         setShowCreateVipModal(false);
         setVipImageBase64('');
         fetchBounties();
      } else throw new Error(data.error);
    } catch (err) {
      toast.error(err.message || "Fallo táctico.", { id: tid });
    }
  };

  const renderVipItem = (bounty) => {
    const isPending = bounty.user_status === 'pending';
    const isApproved = bounty.user_status === 'approved';
    const isRejected = bounty.user_status === 'rejected';
    const fillPercent = Math.min((bounty.completions_done / bounty.completions_total) * 100, 100);

    return (
      <div key={bounty.id} style={{ ...neon.taskCard, flexDirection: 'column', alignItems: 'stretch', borderColor: '#cc00ff', background: 'linear-gradient(145deg, rgba(204, 0, 255, 0.05), rgba(26, 11, 51, 0.9))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
           <div style={{ color: '#fff', fontSize: '15px', fontWeight: '900', letterSpacing: '0.5px' }}>💎 {bounty.title}</div>
           <div style={{ color: '#cc00ff', fontSize: '16px', fontWeight: '900' }}>+{Number(bounty.reward * 1000).toFixed(2)} Gemas</div>
        </div>
        
        {/* 🔥 VISUALIZADOR DE LA FOTO DE REFERENCIA */}
        {bounty.image_url && (
          <div style={{ marginBottom: '12px' }}>
            <img src={bounty.image_url} alt="Referencia" style={{ width: '100%', borderRadius: '12px', border: '1px solid rgba(204,0,255,0.3)', objectFit: 'cover' }} />
          </div>
        )}

        <div style={{ color: '#aaa', fontSize: '12px', lineHeight: '1.4', marginBottom: '14px', whiteSpace: 'pre-wrap' }}>
          {t('lang') === 'en' ? bounty.description_en : bounty.description_es}
        </div>

        <div style={{ width: '100%', marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#888', fontWeight: 'bold', marginBottom: '4px' }}>
            <span>CUPOS CUBIERTOS</span>
            <span style={{ color: '#cc00ff' }}>{bounty.completions_done} / {bounty.completions_total}</span>
          </div>
          <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${fillPercent}%`, background: '#cc00ff' }}></div>
          </div>
        </div>

        {isApproved ? (
           <button disabled style={{...neon.taskButtonDisabled, width: '100%', background: 'rgba(0,255,170,0.1)', color: '#00ffaa', borderColor: '#00ffaa'}}>✅ PAGO RECIBIDO</button>
        ) : isPending ? (
           <button disabled style={{...neon.taskButtonDisabled, width: '100%', background: 'rgba(255,170,0,0.1)', color: '#ffaa00', borderColor: '#ffaa00'}}>⏳ EN REVISIÓN (ESPERA)</button>
        ) : isRejected ? (
           <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ color: '#ff1414', fontSize: '11px', textAlign: 'center', fontWeight: 'bold' }}>❌ Prueba rechazada. Intenta de nuevo.</div>
              <label style={{...neon.btnPrimary, width: '100%', textAlign: 'center', cursor: 'pointer', background: 'linear-gradient(90deg, #cc00ff, #8a2be2)', border: 'none'}}>
                📸 SUBIR NUEVA PRUEBA
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleUploadProof(bounty.id, e)} />
              </label>
           </div>
        ) : (
           <label style={{...neon.btnPrimary, width: '100%', textAlign: 'center', cursor: 'pointer', background: 'linear-gradient(90deg, #cc00ff, #8a2be2)', border: 'none'}}>
              📸 SUBIR CAPTURA PARA COBRAR
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleUploadProof(bounty.id, e)} />
           </label>
        )}
      </div>
    );
  };

  const currentList = category === 'pagadas' ? pagadas : category === 'diarias' ? diarias : category === 'partners' ? partners : bounties;

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

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '16px', overflowX: 'auto' }}>
        <button onClick={() => setCategory('pagadas')} style={{ ...neon.subTabBtn(category === 'pagadas'), flexShrink: 0 }}>{t('ads_cat_pagadas')}</button>
        <button onClick={() => setCategory('diarias')} style={{ ...neon.subTabBtn(category === 'diarias'), flexShrink: 0 }}>{t('ads_cat_diarias')}</button>
        <button onClick={() => setCategory('partners')} style={{ ...neon.subTabBtn(category === 'partners'), flexShrink: 0 }}>{t('ads_cat_partners')}</button>
        <button onClick={() => setCategory('vip')} style={{ ...neon.subTabBtn(category === 'vip'), flexShrink: 0, color: category === 'vip' ? '#050214' : '#cc00ff', background: category === 'vip' ? 'linear-gradient(90deg, #cc00ff, #8a2be2)' : 'transparent', boxShadow: category === 'vip' ? '0 0 10px rgba(204,0,255,0.4)' : 'none' }}>VIP 💎</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '0 5px' }}>
        <h4 style={{ margin: 0, color: '#fff', fontSize: '16px', fontWeight: '900', textTransform: 'uppercase' }}>
          {category === 'vip' ? 'MISIONES DE ÉLITE' : t('ads_explore') || 'EXPLORAR'}
        </h4>
        <button onClick={() => category === 'vip' ? fetchBounties() : fetchTasks()} style={{ background: 'transparent', border: 'none', color: '#ff99dd', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>{t('ads_update') || 'ACTUALIZAR'}</button>
      </div>

      {category === 'vip' && isComandante && (
        <button onClick={() => setShowCreateVipModal(true)} style={{ ...neon.btnPrimary, width: '100%', marginBottom: '16px', background: 'linear-gradient(90deg, #ffaa00, #ffe600)', color: '#050214', border: 'none' }}>
           ➕ CREAR MISIÓN VIP (SOLO ADMIN)
        </button>
      )}

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

      {(category === 'vip' ? loadingBounties : loadingTasks) ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ color: category === 'vip' ? '#cc00ff' : '#00f0ff', fontSize: '14px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase' }}>
            <style>{`@keyframes pulseTasks { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }`}</style>
            <div style={{ animation: 'pulseTasks 1.5s infinite' }}>{t('ads_btn_loading') || 'Sincronizando...'}</div>
          </div>
        </div>
      ) : currentList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <p style={{ color: '#ff99dd', fontSize: '13px', fontWeight: 'bold', margin: 0, lineHeight: '1.5' }}>
             {category === 'vip' ? 'No hay misiones VIP activas en este momento.' : t('ads_empty_category') || 'No hay misiones disponibles. Vuelve más tarde.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {category === 'vip' ? bounties.map(renderVipItem) : currentList.map(renderTaskItem)}
        </div>
      )}

      {/* MODAL PARA CREAR MISIONES VIP (SOLO ADMIN) */}
      {showCreateVipModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(5, 2, 20, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 100000, backdropFilter: 'blur(10px)' }}>
          <div style={{ ...neon.card, width: '100%', maxWidth: '340px', borderColor: '#cc00ff', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#cc00ff', fontSize: '18px', fontWeight: '900' }}>👑 DESPLEGAR MISIÓN VIP</h3>
            
            <div style={{ marginBottom: '12px' }}><label style={neon.label}>TÍTULO DE LA MISIÓN</label>
              <input style={neon.input} placeholder="Ej: Regístrate en Binance y verifica KYC" value={vipTitle} onChange={(e) => setVipTitle(e.target.value)} />
            </div>
            
            <div style={{ marginBottom: '12px' }}><label style={neon.label}>INSTRUCCIONES (ESPAÑOL)</label>
              <textarea style={{...neon.input, height: '80px', resize: 'none'}} placeholder="1. Entra a este link...\n2. Regístrate\n3. Sube captura del perfil..." value={vipDescEs} onChange={(e) => setVipDescEs(e.target.value)} />
            </div>

            <div style={{ marginBottom: '12px' }}><label style={neon.label}>INSTRUCCIONES (INGLÉS)</label>
              <textarea style={{...neon.input, height: '80px', resize: 'none'}} placeholder="1. Go to this link...\n2. Register\n3. Upload screenshot..." value={vipDescEn} onChange={(e) => setVipDescEn(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
              <div style={{ flex: 1 }}><label style={neon.label}>PAGO (GEMAS)</label>
                <input type="number" style={neon.input} value={vipRewardGemas} onChange={(e) => setVipRewardGemas(Number(e.target.value))} />
              </div>
              <div style={{ flex: 1 }}><label style={neon.label}>CUPOS TOTALES</label>
                <input type="number" style={neon.input} value={vipCompletions} onChange={(e) => setVipCompletions(Number(e.target.value))} />
              </div>
            </div>

            {/* 🔥 BOTÓN PARA SUBIR FOTO DE EJEMPLO */}
            <div style={{ marginBottom: '20px' }}>
              <label style={neon.label}>FOTO DE REFERENCIA (OPCIONAL)</label>
              <label style={{...neon.btnSecondary, width: '100%', textAlign: 'center', cursor: 'pointer', display: 'block', padding: '10px', marginTop: '6px'}}>
                 📸 ELEGIR FOTO
                 <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                   const file = e.target.files[0];
                   if (file) {
                     const reader = new FileReader();
                     reader.readAsDataURL(file);
                     reader.onload = () => setVipImageBase64(reader.result);
                   }
                 }} />
              </label>
              {vipImageBase64 && <img src={vipImageBase64} alt="Preview" style={{ width: '100%', marginTop: '10px', borderRadius: '8px', border: '1px solid #cc00ff' }} />}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowCreateVipModal(false)} style={{ ...neon.btnSecondary, flex: 1 }}>CANCELAR</button>
              <button onClick={handleCreateVipBounty} style={{ ...neon.btnPrimary, flex: 2, background: 'linear-gradient(90deg, #cc00ff, #8a2be2)', border: 'none' }}>DESPLEGAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
