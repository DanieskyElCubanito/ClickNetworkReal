import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import WebApp from '@twa-dev/sdk';
import { neon, TaskIcons } from './AdsStyles.jsx';
import AdsMarket from './AdsMarket.jsx';
import AdsActivity from './AdsActivity.jsx';
import AdsWizard from './AdsWizard.jsx';

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
    const tid = toast.loading(t('ads_btn_verifying') || 'Verificando...');
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
            <h3 style={{ margin: '0 0 14px 0', color: '#ffe600', fontSize: '17px', fontWeight: '900' }}>{t('ads_edit_title') || 'EDITAR CAMPAÑA'}</h3>
            <div style={{ marginBottom: '10px' }}><label style={neon.label}>{t('ads_label_title') || 'TÍTULO'}</label><input style={neon.input} value={editingTask.title} onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })} /></div>
            <div style={{ marginBottom: '10px' }}><label style={neon.label}>{t('ads_label_url') || 'ENLACE'}</label><input style={neon.input} value={editingTask.url} onChange={(e) => setEditingTask({ ...editingTask, url: e.target.value })} /></div>
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
              <button onClick={() => setShowEditModal(false)} style={{ ...neon.btnSecondary, flex: 1 }}>{t('ads_btn_cancel') || 'CANCELAR'}</button>
              <button onClick={handleSaveEdit} style={{ ...neon.btnPrimary, flex: 2, background: 'linear-gradient(180deg, #ffe600, #ffaa00)', color: '#050214', boxShadow: '0 6px 0 #cc8800' }}>{t('ads_btn_update') || 'GUARDAR'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
