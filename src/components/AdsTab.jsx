import React, { useState, useEffect, useRef } from 'react';
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

  // Memoria síncrona inmune al congelamiento de Telegram
  const taskStartTimes = useRef({});

  const [taskType, setTaskType] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0); 

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
  const [originalReward, setOriginalReward] = useState(0.001);
  const [remainingCompletions, setRemainingCompletions] = useState(0);
  const [liveGramUsd, setLiveGramUsd] = useState(5.00);

  const depositBalanceUsdt = Number(userData?.deposit_balance || 0);
  const apiHeaders = { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': WebApp.initData || '' };

  const TASK_TYPES = [
    { id: 'bot', icon: TaskIcons.bot('#10B981'), title: t('ads_type_bot') || 'Bot', desc: 'Interacción con bot', color: '#10B981', autoName: 'Campaña Bot' },
    { id: 'channel', icon: TaskIcons.channel('#06B6D4'), title: t('ads_type_group') || 'Canal', desc: 'Miembros reales', color: '#06B6D4', autoName: 'Campaña Comunidad' },
    { id: 'promo', icon: TaskIcons.promo('#8B5CF6'), title: t('ads_type_promo') || 'Tráfico', desc: 'Visitas web o referidos', color: '#8B5CF6', autoName: 'Campaña Tráfico' }
  ];

  const stepsFlow = taskType === 'bot' ? ['type', 'url', 'token', 'budget'] : ['type', 'url', 'budget'];
  const totalSteps = stepsFlow.length;
  const currentStepId = stepsFlow[currentStepIndex];

  const nextStep = () => setCurrentStepIndex(prev => Math.min(prev + 1, totalSteps - 1));
  const prevStep = () => setCurrentStepIndex(prev => Math.max(prev - 1, 0));

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
        Object.keys(nextStatus).forEach(id => {
          if (nextStatus[id] === 'waiting_for_redirect') {
            nextStatus[id] = 'away'; 
            taskStartTimes.current[id] = Date.now(); 
          }
        });
        return nextStatus;
      });
    };

    const handleShow = () => {
      setTaskStatus(prev => {
        const next = { ...prev };
        let showedError = false;
        Object.keys(next).forEach(id => {
          if (next[id] === 'away') {
            const startTime = taskStartTimes.current[id];
            const timeAway = startTime ? Date.now() - startTime : 0; 
            const task = tasks.find(t => String(t.id) === String(id));

            let requiredTime = 8000; 
            if (['channel', 'group', 'daily_channel', 'partner'].includes(task?.type)) {
              requiredTime = 2000;
            }

            if (startTime && timeAway >= requiredTime) { 
              next[id] = 'ready_to_claim'; 
            } else {
              next[id] = 'ready'; 
              if (!showedError) { 
                toast.error(`Control: Debes permanecer en el destino al menos ${requiredTime / 1000} segundos.`); 
                showedError = true; 
              }
            }
          }
        });
        return next;
      });
    };

    const onVisibilityChange = () => document.hidden ? handleHide() : handleShow();
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', handleHide); 
    window.addEventListener('focus', handleShow);

    return () => { 
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', handleHide); 
      window.removeEventListener('focus', handleShow); 
    };
  }, [tasks]);

  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      const res = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: 'get-tasks', userId: userData.id }) });
      const data = await res.json();
      if (data && data.success) {
        setTasks(data.tasks || []);
        if (data.gigaPubClaimed) setTaskStatus(prev => ({ ...prev, 'gigapub_daily': 'completed' }));
        if (data.streakCount !== undefined) {
          setUserData(prev => ({ ...prev, streak_count: data.streakCount }));
        }
      }
    } catch (e) {} finally { setLoadingTasks(false); }
  };

  const handleStartTask = (task) => {
    try {
      let finalUrl = task.url.trim();
      if (finalUrl.startsWith('@')) finalUrl = `https://t.me/${finalUrl.substring(1)}`;
      else if (!finalUrl.startsWith('http')) finalUrl = `https://${finalUrl}`;

      setTaskStatus(prev => ({ ...prev, [task.id]: 'waiting_for_redirect' }));

      if (finalUrl.includes('t.me') || finalUrl.includes('telegram.me')) WebApp.openTelegramLink(finalUrl);
      else WebApp.openLink(finalUrl, { try_instant_view: true });
    } catch (e) { toast.error("Error al redireccionar."); }
  };

  const handlePlayGigaPub = () => {
    if (!window.showGiga) return toast.error("Conexión inestable.");
    setPlayingAd(true); const tid = toast.loading("Sincronizando...");
    window.showGiga().then(async () => {
      toast.loading("Validando transmisión...", { id: tid });
      try {
        const res = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: 'claim-gigapub-daily', userId: userData.id }) });
        const data = await res.json();
        if (data.success) {
          toast.success(`+${data.earned_gemas} 💎 Acreditado`, { id: tid });
          setUserData(prev => ({ 
            ...prev, 
            balance: data.balance !== undefined ? data.balance : prev.balance,
            streak_count: Math.round(Number(data.earned_gemas)) 
          }));
          setTaskStatus(prev => ({ ...prev, 'gigapub_daily': 'completed' }));
        } else { toast.error(data.error || "Fallo de validación.", { id: tid }); }
      } catch (e) { toast.error("Error en red.", { id: tid }); } finally { setPlayingAd(false); }
    }).catch(() => { toast.error("Visualización incompleta.", { id: tid }); setPlayingAd(false); });
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
      } else { toast.error(data.error || "Fallo de validación", { id: tid }); setTaskStatus(prev => ({ ...prev, [task.id]: 'ready' })); }
    } catch (e) { toast.error("Error en red.", { id: tid }); setTaskStatus(prev => ({ ...prev, [task.id]: 'ready' })); } 
  };

  const handleToggleStatus = async (task) => {
    const isPausing = task.status === 'active'; const tid = toast.loading(isPausing ? "Suspendiendo..." : "Reactivando...");
    try {
      const res = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: 'toggle-task-status', taskId: task.id, requestingUserId: userData.id }) });
      const data = await res.json();
      if (data.success) { toast.success("Completado.", { id: tid }); fetchTasks(); } else { throw new Error(data.error); }
    } catch (err) { toast.error(err.message || "Fallo de operación.", { id: tid }); }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("¿Confirmas la liquidación y reembolso de esta campaña?")) return;
    const tid = toast.loading("Liquidando...");
    try {
      const res = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: 'delete-task', taskId: taskId, requestingUserId: userData.id }) });
      const data = await res.json();
      if (data.success) { toast.success("Campaña terminada.", { id: tid }); fetchTasks(); } else { throw new Error(data.error); }
    } catch (err) { toast.error(err.message || "Fallo de operación.", { id: tid }); }
  };

  const handleOpenEdit = (task) => { 
    setEditingTask({ id: task.id, title: task.title, url: task.url, reward: Number(task.reward)||0.001, logo: task.logo||'crypto', addCompletions: 0 }); 
    setOriginalReward(Number(task.reward)||0.001);
    setRemainingCompletions(Number(task.completions_total) - Number(task.completions_done || 0));
    setShowEditModal(true); 
  };

  // 🔥 CORRECCIÓN: Cálculo de UI fiel a la DB para costo total de edición
  const calculateEditCost = () => {
    let cost = 0;
    if (!editingTask) return 0;
    
    // Si ajusta la recompensa de los cupos pendientes:
    if (editingTask.reward !== originalReward && remainingCompletions > 0) {
      cost += (remainingCompletions * editingTask.reward * 1.30) - (remainingCompletions * originalReward * 1.30);
    }
    // Si añade nuevos cupos al nuevo precio:
    if (editingTask.addCompletions > 0) {
      cost += editingTask.addCompletions * editingTask.reward * 1.30;
    }
    return Number(cost.toFixed(4));
  };

  const handleSaveEdit = async () => {
    const totalExtraCost = calculateEditCost();
    if (totalExtraCost > 0 && depositBalanceUsdt < totalExtraCost) return toast.error(`Capital insuficiente.`);
    
    const tid = toast.loading("Configurando...");
    try {
      const res = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: 'edit-task', taskId: editingTask.id, requestingUserId: userData.id, newTitle: editingTask.title, newUrl: editingTask.url, addCompletions: editingTask.addCompletions, newReward: editingTask.reward, newLogo: editingTask.logo }) });
      const data = await res.json();
      if (data.success) { 
        toast.success("Actualizada.", { id: tid }); 
        if (totalExtraCost !== 0) setUserData(p => ({...p, deposit_balance: Math.max(0, p.deposit_balance - totalExtraCost)}));
        setShowEditModal(false); fetchTasks(); 
      } else { throw new Error(data.error); }
    } catch (err) { toast.error("Error al guardar.", { id: tid }); }
  };

  const handleVerifyUrl = async () => {
    let val = targetUrl.trim(); if (!val) return toast.error("Falta el destino.");
    if (taskType === 'channel' || taskType === 'bot') { if (!val.startsWith('@') && !val.startsWith('t.me/') && !val.startsWith('https://t.me/')) return toast.error("Formato no válido."); }
    if (taskType === 'channel') {
      setIsVerifying(true); const tid = toast.loading("Analizando permisos...");
      try {
        const res = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: 'verify-admin', url: val }) });
        const data = await res.json();
        if (data.success) { toast.success("Enlace Autorizado.", { id: tid }); nextStep(); } 
        else { toast.error(data.error || "Añade al bot como admin.", { id: tid }); }
      } catch (e) { toast.error("Fallo de red.", { id: tid }); } finally { setIsVerifying(false); }
    } else { if (!val.startsWith('http') && !val.startsWith('@')) val = 'https://' + val; setTargetUrl(val); nextStep(); }
  };

  const handleCreateTaskWithVault = async () => {
    setIsGenerating(true); const tid = toast.loading("Desplegando...");
    try {
      const res = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ creator_id: userData?.id, action: 'create-task', type: taskType, title: TASK_TYPES.find(t=>t.id===taskType)?.autoName, url: targetUrl, bot_token: botToken, completions_total: completions, reward: rewardPerGema/1000, validation_code: validationCode }) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      if (data.deposit_balance !== undefined) setUserData(p => ({ ...p, deposit_balance: data.deposit_balance }));
      toast.success("Operación Exitosa.", { id: tid });
      setTaskType(null); setTargetUrl(''); setBotToken(''); setValidationCode(''); setCompletions(100); setCurrentStepIndex(0); setRecharging(false); setView('activity');
    } catch (err) { toast.error(err.message || "Fallo interno.", { id: tid }); } finally { setIsGenerating(false); }
  };

  const handleStartRecharge = async () => {
    setIsGenerating(true); const tid = toast.loading("Iniciando conexión...");
    try {
      const amt = rechargeMethod === 'usdt' ? rechargeAmount : (rechargeAmount/liveGramUsd).toFixed(2);
      const res = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: rechargeMethod === 'usdt' ? 'generate-usdt-wallet' : 'generate-payment-wallet', userId: userData.id, price: amt, clicks: rechargeAmount }) });
      const data = await res.json();
      if (data.success) { setTempWallet(data.wallet); setIntentId(data.intentId); toast.dismiss(tid); setCheckoutView(true); }
    } catch (e) { toast.error("Sin respuesta del nodo.", { id: tid }); } finally { setIsGenerating(false); }
  };

  const handleVerifyPayment = async () => {
    const tid = toast.loading("Confirmando inyección de liquidez...");
    try {
      const res = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: rechargeMethod === 'usdt' ? 'verify-usdt-payment' : 'verify-crypto-payment', userId: userData.id, intentId, clicks: rechargeAmount }) });
      const data = await res.json();
      if (data.success) { 
        toast.success(`Capital confirmado.`, { id: tid }); 
        if (data.deposit_balance !== undefined) setUserData(p => ({ ...p, deposit_balance: data.deposit_balance }));
        setCheckoutView(false); setRecharging(false); setTempWallet(''); setIntentId(null);
      } else throw new Error(data.error);
    } catch (e) { toast.error(e.message || "Escaneo pendiente. Reintenta.", { id: tid, duration: 6000 }); }
  };

  const closeWizard = () => {
    setView('list'); 
    setTaskType(null); 
    setCurrentStepIndex(0);
    setCompletions(100); 
    setValidationCode(''); 
  };

  const sharedProps = { 
    tasks, userData, taskStatus, verifyInputs, setVerifyInputs, handleStartTask, handleCheckTask, loadingTasks, setView, fetchTasks, t, gigaReady, playingAd, handlePlayGigaPub,
    handleToggleStatus, handleOpenEdit, handleDeleteTask, 
    currentStepIndex, totalSteps, stepsFlow, currentStepId,
    taskType, setTaskType, targetUrl, setTargetUrl, botToken, setBotToken, validationCode, setValidationCode, completions, setCompletions, rewardPerGema, setRewardPerGema, isVerifying, handleVerifyUrl, 
    depositBalanceUsdt, campaignCostUsdt: ((completions * rewardPerGema) * 1.3)/1000, baseCostGemas: completions * rewardPerGema, referralFeeGemas: Math.floor((completions * rewardPerGema)*0.20), adminFeeGemas: Math.floor((completions * rewardPerGema)*0.10), totalGemasCost: (completions * rewardPerGema) + Math.floor((completions * rewardPerGema)*0.20) + Math.floor((completions * rewardPerGema)*0.10),
    handleCreateTaskWithVault, isGenerating, setRechargeAmount, setRecharging, nextStep, prevStep, closeWizard, TASK_TYPES,
    recharging, rechargeMethod, setRechargeMethod, rechargeAmount, checkoutView, tempWallet, intentId, liveGramUsd, handleStartRecharge, handleVerifyPayment, cancelCheckout: () => { setCheckoutView(false); setRecharging(false); }
  };

  const calculatedEditCost = calculateEditCost();

  return (
    <div style={{ color: '#F3F4F6', paddingBottom: '20px' }}>
      <Toaster containerStyle={{ zIndex: 9999999 }} toastOptions={{ style: { background: '#1F2937', color: '#F3F4F6', border: '1px solid rgba(255,255,255,0.1)' } }} />

      {(view === 'list' || view === 'activity') && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          <button onClick={() => setView('list')} style={{ flex: 1, padding: '12px', borderRadius: '14px', fontWeight: '800', fontSize: '13px', border: 'none', cursor: 'pointer', transition: '0.2s', background: view === 'list' ? '#ffffff' : 'rgba(255,255,255,0.03)', color: view === 'list' ? '#111827' : '#9CA3AF', boxShadow: view === 'list' ? '0 4px 15px rgba(255,255,255,0.1)' : 'none', letterSpacing: '0.5px' }}>{t('ads_tab_market') || 'MERCADO'}</button>
          <button onClick={() => setView('activity')} style={{ flex: 1, padding: '12px', borderRadius: '14px', fontWeight: '800', fontSize: '13px', border: 'none', cursor: 'pointer', transition: '0.2s', background: view === 'activity' ? 'linear-gradient(135deg, #4F46E5, #7C3AED)' : 'rgba(255,255,255,0.03)', color: view === 'activity' ? '#ffffff' : '#9CA3AF', boxShadow: view === 'activity' ? '0 4px 15px rgba(124,58,237,0.3)' : 'none', letterSpacing: '0.5px' }}>{t('ads_tab_my_ads') || 'MIS CAMPAÑAS'}</button>
        </div>
      )}

      {view === 'list' && <AdsMarket props={sharedProps} />}
      {view === 'activity' && <AdsActivity props={sharedProps} />}
      {view === 'wizard' && <AdsWizard props={sharedProps} />}

      {/* MODAL DE EDICIÓN (Global) con Estilos Dark Glassmorphism */}
      {showEditModal && editingTask && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(5, 7, 10, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 100000, backdropFilter: 'blur(8px)' }}>
          <div style={{ ...neon.card, width: '100%', maxWidth: '340px', marginBottom: 0, borderColor: 'rgba(255,255,255,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#F9FAFB', fontSize: '16px', fontWeight: '800', letterSpacing: '0.5px' }}>{t('ads_edit_title') || 'CONFIGURAR CAMPAÑA'}</h3>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={neon.label}>{t('ads_label_title') || 'TÍTULO PÚBLICO'}</label>
              <input style={neon.input} value={editingTask.title} onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })} />
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={neon.label}>{t('ads_label_url') || 'ENLACE / DESTINO'}</label>
              <input style={neon.input} value={editingTask.url} onChange={(e) => setEditingTask({ ...editingTask, url: e.target.value })} />
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <div style={{ flex: 1 }}>
                <label style={neon.label}>USDT POR USUARIO</label>
                <input type="number" step="0.001" max="0.0025" style={{...neon.input, padding: '12px'}} value={editingTask.reward} onChange={(e) => setEditingTask({ ...editingTask, reward: Math.min(0.0025, Number(e.target.value)||0.001) })} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={neon.label}>ICONO VISUAL</label>
                <select style={{...neon.input, padding: '12px', appearance: 'none'}} value={editingTask.logo} onChange={(e) => setEditingTask({ ...editingTask, logo: e.target.value })}>
                  <option value="crypto">💎 Cripto</option>
                  <option value="game">🎮 Juego Web3</option>
                  <option value="money">💵 Finanzas</option>
                  <option value="web3">🌐 Web3</option>
                  <option value="bot">🤖 Bot</option>
                  <option value="channel">📢 Canal</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <label style={{...neon.label, color: '#F3F4F6'}}>AGREGAR NUEVOS CUPOS (OPCIONAL)</label>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button onClick={() => setEditingTask(prev => ({...prev, addCompletions: Math.max(0, prev.addCompletions - 10)}))} style={{...neon.btnActionCalc, width: '40px', height: '40px', fontSize: '20px'}}>-</button>
                <input type="number" style={{...neon.inputCalc, padding: '8px', fontSize: '18px'}} value={editingTask.addCompletions} onChange={(e) => setEditingTask(prev => ({...prev, addCompletions: Number(e.target.value) || 0}))} />
                <button onClick={() => setEditingTask(prev => ({...prev, addCompletions: prev.addCompletions + 10}))} style={{...neon.btnActionCalc, width: '40px', height: '40px', fontSize: '20px'}}>+</button>
              </div>
              
              {calculatedEditCost !== 0 && (
                <div style={{ fontSize: '12px', color: depositBalanceUsdt >= calculatedEditCost ? '#10B981' : '#EF4444', marginTop: '12px', fontWeight: '800', textAlign: 'center' }}>
                  {calculatedEditCost > 0 ? `Costo total del ajuste: $${calculatedEditCost} USDT` : `Reembolso por ajuste: +$${Math.abs(calculatedEditCost)} USDT`}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowEditModal(false)} style={{ ...neon.btnSecondary, flex: 1 }}>CANCELAR</button>
              <button onClick={handleSaveEdit} style={{ ...neon.btnPrimary, flex: 1 }}>ACTUALIZAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
