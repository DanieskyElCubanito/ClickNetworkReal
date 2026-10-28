import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import WebApp from '@twa-dev/sdk';

const Icons = {
  shield: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffe600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  search: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#050214" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  ban: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff1493" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>,
  restore: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ffaa" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>,
  trash: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  refresh: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ffaa" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  wallet: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff99dd" strokeWidth="2"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>,
  lock: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ffaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
  cross: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
  trophy: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffe600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10"/><path d="M17 4v8a5 5 0 0 1-10 0V4"/><path d="M7 4H4v3a2 2 0 0 0 2 2h1"/><path d="M17 4h3v3a2 2 0 0 1-2 2h-1"/></svg>
};

const neon = {
  card: { background: 'linear-gradient(145deg, #18052a, #0d0217)', border: '2px solid #ffe600', borderRadius: '20px', padding: '16px', marginBottom: '16px', boxShadow: '0 4px 20px rgba(255, 230, 0, 0.15)' },
  input: { width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid #ffe600', borderRadius: '12px', padding: '12px', color: '#fff', fontSize: '14px', outline: 'none', marginBottom: '10px', boxSizing: 'border-box' },
  btn: { width: '100%', background: 'linear-gradient(90deg, #ffe600, #ffaa00)', color: '#050214', fontWeight: '900', padding: '12px', border: 'none', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(255, 230, 0, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textTransform: 'uppercase' },
  btnDanger: { width: '100%', background: 'transparent', color: '#ff1493', fontWeight: '900', padding: '12px', border: '2px solid #ff1493', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textTransform: 'uppercase' },
  label: { fontSize: '10px', color: '#ff99dd', fontWeight: '900', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }
};

export default function AdminDashboard({ userData }) {
  const [stats, setStats] = useState({ users: 0, tasks: 0 });
  const [searchId, setSearchId] = useState('');
  const [foundUser, setFoundUser] = useState(null);

  const [newBalance, setNewBalance] = useState('');
  const [newDepositBalance, setNewDepositBalance] = useState('');

  const [allTasks, setAllTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  const [sysConfig, setSysConfig] = useState({ master_wallet_gram: '', master_wallet_usdt_bep20: '' });
  const [savingConfig, setSavingConfig] = useState(false);

  const [pendingWithdrawals, setPendingWithdrawals] = useState([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(false);

  // 🔥 NUEVOS ESTADOS PARA GESTIÓN DE TORNEOS 🔥
  const [activeEvent, setActiveEvent] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(false);
  const [eventTitle, setEventTitle] = useState('Torneo Semanal VIP');
  const [eventType, setEventType] = useState('referral');
  const [eventDays, setEventDays] = useState(7);
  const [prize1, setPrize1] = useState('15 TON');
  const [prize2, setPrize2] = useState('10 TON');
  const [prize3, setPrize3] = useState('5 TON');
  const [pastEvents, setPastEvents] = useState([]);
  const [loadingPast, setLoadingPast] = useState(false);

  const apiHeaders = { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': WebApp.initData || '' };

    useEffect(() => {
    loadStats();
    loadAllTasks();
    loadSysConfig();
    loadPendingWithdrawals();
    loadActiveEvent(); 
    loadPastEvents(); // 🔥 NUEVO
  }, []);


  const loadStats = async () => {
    try {
      const res = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: 'admin-stats', adminId: userData.id }) });
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (e) { console.error(e); }
  };

  const loadAllTasks = async () => {
    setLoadingTasks(true);
    try {
      const res = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: 'admin-get-tasks', adminId: userData.id }) });
      const data = await res.json();
      if (data.success) setAllTasks(data.tasks || []);
    } catch (e) { console.error("Error cargando campañas", e); } finally { setLoadingTasks(false); }
  };

  const loadSysConfig = async () => {
    try {
      const res = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: 'admin-get-config', adminId: userData.id }) });
      const data = await res.json();
      if (data.success && data.config) setSysConfig(data.config);
    } catch (e) { console.error(e); }
  };

  const loadPendingWithdrawals = async () => {
    setLoadingWithdrawals(true);
    try {
      const res = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: 'admin-get-withdrawals', adminId: userData.id }) });
      const data = await res.json();
      if (data.success) setPendingWithdrawals(data.withdrawals || []);
    } catch (e) { console.error("Error cargando retiros pendientes", e); } finally { setLoadingWithdrawals(false); }
  };

  const handleApproveWithdrawal = async (withdrawalId) => {
    if (!window.confirm("¿Seguro que ya enviaste los fondos a este usuario? Esto completará la orden.")) return;
    const tid = toast.loading("Aprobando...");
    try {
      const res = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: 'admin-approve-withdrawal', adminId: userData.id, withdrawalId }) });
      const data = await res.json();
      if (data.success) { toast.success("Retiro aprobado", { id: tid }); loadPendingWithdrawals(); } 
      else throw new Error(data.error);
    } catch (err) { toast.error(err.message || "Error al aprobar.", { id: tid }); }
  };

  const handleRejectWithdrawal = async (withdrawalId) => {
    const reason = window.prompt("Motivo del rechazo (se mostrará al usuario):");
    if (reason === null) return; 
    const tid = toast.loading("Rechazando...");
    try {
      const res = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: 'admin-reject-withdrawal', adminId: userData.id, withdrawalId, reason }) });
      const data = await res.json();
      if (data.success) { toast.success("Retiro rechazado", { id: tid }); loadPendingWithdrawals(); } 
      else throw new Error(data.error);
    } catch (err) { toast.error(err.message || "Error al rechazar.", { id: tid }); }
  };

  const handleSaveConfig = async () => {
    const tid = toast.loading("Guardando configuración...");
    setSavingConfig(true);
    try {
      const res = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: 'admin-update-config', adminId: userData.id, config: sysConfig }) });
      const data = await res.json();
      if (data.success) toast.success("Billeteras actualizadas", { id: tid });
      else throw new Error(data.error);
    } catch (e) { toast.error("Error al guardar", { id: tid }); }
    setSavingConfig(false);
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("¿Seguro que quieres eliminar esta campaña por violar las normas? Se reembolsará el saldo al creador.")) return;
    const tid = toast.loading("Eliminando campaña...");
    try {
      const res = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: 'delete-task', taskId: taskId, requestingUserId: userData.id, isAdminAction: true }) });
      const data = await res.json();
      if (data.success) { toast.success("Campaña eliminada", { id: tid }); loadAllTasks(); loadStats(); } 
      else throw new Error(data.error);
    } catch (err) { toast.error(err.message || "Error al eliminar.", { id: tid }); }
  };

  const handleSearchUser = async () => {
    if (!searchId) return toast.error("Ingresa un ID");
    const tid = toast.loading("Buscando...");
    try {
      const res = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: 'admin-search-user', adminId: userData.id, targetId: searchId }) });
      const data = await res.json();
      if (data.success && data.user) {
        setFoundUser(data.user);
        setNewBalance(data.user.balance ?? 0);
        setNewDepositBalance(data.user.deposit_balance ?? 0);
        toast.success("Usuario encontrado", { id: tid });
      } else { toast.error("Usuario no existe", { id: tid }); setFoundUser(null); }
    } catch (e) { toast.error("Error al buscar", { id: tid }); }
  };

  const handleUpdateBalance = async () => {
    if (!foundUser) return;
    const tid = toast.loading("Actualizando saldo de retiro...");
    try {
      const res = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: 'admin-update-user', adminId: userData.id, targetId: foundUser.id, update: { balance: Number(newBalance) } }) });
      const data = await res.json();
      if (data.success) { 
        toast.success("Saldo de Gemas actualizado", { id: tid }); 
        setFoundUser(prev => ({ ...prev, balance: Number(newBalance) })); 
      } else throw new Error();
    } catch (e) { toast.error("Error al actualizar", { id: tid }); }
  };

  const handleUpdateDepositBalance = async () => {
    if (!foundUser) return;
    const tid = toast.loading("Actualizando Bóveda USDT...");
    try {
      const res = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: 'admin-update-user', adminId: userData.id, targetId: foundUser.id, update: { deposit_balance: Number(newDepositBalance) } }) });
      const data = await res.json();
      if (data.success) { 
        toast.success("Bóveda USDT actualizada", { id: tid }); 
        setFoundUser(prev => ({ ...prev, deposit_balance: Number(newDepositBalance) })); 
      } else throw new Error();
    } catch (e) { toast.error("Error al actualizar Bóveda", { id: tid }); }
  };

  const handleToggleBan = async () => {
    if (!foundUser) return;
    const isBanning = !foundUser.is_banned;
    const tid = toast.loading(isBanning ? "Baneando..." : "Desbaneando...");
    try {
      const res = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: 'admin-update-user', adminId: userData.id, targetId: foundUser.id, update: { is_banned: isBanning } }) });
      const data = await res.json();
      if (data.success) { toast.success(isBanning ? "Usuario baneado" : "Usuario restaurado", { id: tid }); setFoundUser(prev => ({ ...prev, is_banned: isBanning })); } 
      else throw new Error();
    } catch (e) { toast.error("Error en la operación", { id: tid }); }
  };

  // 🔥 FUNCIONES DE GESTIÓN DE TORNEOS 🔥
  const loadActiveEvent = async () => {
    setLoadingEvent(true);
    try {
      const res = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: 'get-active-event' }) });
      const data = await res.json();
      if (data.success && data.activeEvent) {
        setActiveEvent(data.activeEvent);
      } else {
        setActiveEvent(null);
      }
    } catch (e) { console.error("Error cargando evento", e); } finally { setLoadingEvent(false); }
  };
   
    const loadPastEvents = async () => {
    setLoadingPast(true);
    try {
      const res = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: 'admin-get-past-events', adminId: userData.id }) });
      const data = await res.json();
      if (data.success) setPastEvents(data.pastEvents || []);
    } catch (e) { console.error("Error cargando historial", e); } finally { setLoadingPast(false); }
  };

  const handleCreateEvent = async () => {
    if (!eventTitle.trim()) return toast.error("Ponle un título al torneo.");
    const tid = toast.loading("Lanzando torneo en vivo...");
    try {
      const startDate = new Date().toISOString();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + Number(eventDays));

      const res = await fetch('/api', {
        method: 'POST', headers: apiHeaders,
        body: JSON.stringify({
          action: 'admin-create-event',
          adminId: userData.id,
          title: eventTitle,
          event_type: eventType,
          start_date: startDate,
          end_date: endDate.toISOString(),
          prizes: [prize1, prize2, prize3]
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("¡Torneo activado con éxito!", { id: tid });
        loadActiveEvent();
      } else throw new Error(data.error);
    } catch (e) { toast.error(e.message || "Error al crear", { id: tid }); }
  };

  const handleManageEvent = async (newStatus) => {
    if (!activeEvent) return;
    const confirmMsg = newStatus === 'deleted' ? "¿Estás seguro de ELIMINAR todo el torneo actual?" : "¿Quieres FINALIZAR el torneo ahora mismo?";
    if (!window.confirm(confirmMsg)) return;
    
    const tid = toast.loading("Procesando...");
    try {
      const res = await fetch('/api', {
        method: 'POST', headers: apiHeaders,
        body: JSON.stringify({
          action: 'admin-manage-event',
          adminId: userData.id,
          eventId: activeEvent.id,
          newStatus: newStatus
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Torneo actualizado", { id: tid });
        loadActiveEvent();
      } else throw new Error(data.error);
    } catch (e) { toast.error(e.message || "Error en la gestión", { id: tid }); }
  };

  return (
    <div style={{ color: '#fff', paddingBottom: '20px' }}>
      <Toaster containerStyle={{ zIndex: 9999999 }} />
      <h2 style={{ color: '#ffe600', fontWeight: '900', textAlign: 'center', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        {Icons.shield} Panel de Control
      </h2>

      {/* MÉTRICAS GLOBALES */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <div style={{ ...neon.card, flex: 1, textAlign: 'center', marginBottom: 0, padding: '12px' }}>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#00f0ff' }}>{stats.users}</div>
          <div style={{ fontSize: '10px', color: '#ff99dd', fontWeight: '900' }}>USUARIOS TOTALES</div>
        </div>
        <div style={{ ...neon.card, flex: 1, textAlign: 'center', marginBottom: 0, padding: '12px' }}>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#00ffaa' }}>{stats.tasks}</div>
          <div style={{ fontSize: '10px', color: '#ff99dd', fontWeight: '900' }}>CAMPAÑAS CREADAS</div>
        </div>
      </div>

      {/* 🔥 NUEVA SECCIÓN: GESTIÓN DE TORNEOS 🔥 */}
      <div style={{ ...neon.card, borderColor: '#00f0ff', background: 'linear-gradient(145deg, #0d1225, #050b14)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#00f0ff', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {Icons.trophy} Gestión de Torneos
          </h3>
          <button onClick={loadActiveEvent} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>{Icons.refresh}</button>
        </div>

        {loadingEvent ? (
          <div style={{ textAlign: 'center', fontSize: '12px', color: '#00f0ff' }}>Comprobando eventos activos...</div>
        ) : activeEvent ? (
          <div style={{ background: 'rgba(0,0,0,0.5)', padding: '16px', borderRadius: '12px', border: '1px dashed #00f0ff', textAlign: 'center' }}>
            <div style={{ color: '#00ffaa', fontSize: '10px', fontWeight: '900', letterSpacing: '1px', marginBottom: '6px' }}>TORNEO EN CURSO</div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#fff', marginBottom: '8px' }}>{activeEvent.title}</div>
            <div style={{ fontSize: '12px', color: '#ff99dd', marginBottom: '16px' }}>
              Modalidad: <b>{activeEvent.event_type === 'referral' ? 'Invitar Amigos' : 'Completar Tareas'}</b>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '12px' }}>
              <div><div style={{fontSize:'16px'}}>🥇</div><div style={{fontSize:'12px', fontWeight:'bold'}}>{activeEvent.prizes[0]}</div></div>
              <div><div style={{fontSize:'16px'}}>🥈</div><div style={{fontSize:'12px', fontWeight:'bold'}}>{activeEvent.prizes[1]}</div></div>
              <div><div style={{fontSize:'16px'}}>🥉</div><div style={{fontSize:'12px', fontWeight:'bold'}}>{activeEvent.prizes[2]}</div></div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => handleManageEvent('completed')} style={{ ...neon.btn, background: 'linear-gradient(90deg, #00f0ff, #0088ff)', flex: 1, color: '#fff' }}>FINALIZAR AHORA</button>
              <button onClick={() => handleManageEvent('deleted')} style={{ ...neon.btnDanger, flex: 1 }}>{Icons.trash} ELIMINAR</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '11px', color: '#aaa', textAlign: 'center', marginBottom: '8px' }}>Crea un evento dinámico para que los usuarios compitan en el Salón de la Fama.</div>
            
            <div>
              <span style={neon.label}>Título del Evento</span>
              <input type="text" style={{...neon.input, borderColor: '#00f0ff', marginBottom: 0}} value={eventTitle} onChange={e => setEventTitle(e.target.value)} placeholder="Ej. Torneo de Fin de Semana" />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 2 }}>
                <span style={neon.label}>Modo de Competencia</span>
                <select style={{...neon.input, borderColor: '#00f0ff', marginBottom: 0, padding: '11px'}} value={eventType} onChange={e => setEventType(e.target.value)}>
                  <option value="referral">👥 Referidos (Invitar Amigos)</option>
                  <option value="task_completion">🔥 Actividad (Hacer Tareas)</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <span style={neon.label}>Días de duración</span>
                <input type="number" style={{...neon.input, borderColor: '#00f0ff', marginBottom: 0, textAlign: 'center'}} value={eventDays} onChange={e => setEventDays(e.target.value)} />
              </div>
            </div>

            <span style={{...neon.label, marginTop: '8px'}}>Premios para el TOP 3 (Pesos Específicos)</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="text" style={{...neon.input, borderColor: '#ffe600', marginBottom: 0, textAlign: 'center'}} value={prize1} onChange={e => setPrize1(e.target.value)} placeholder="🥇 1er Lugar" />
              <input type="text" style={{...neon.input, borderColor: '#C0C0C0', marginBottom: 0, textAlign: 'center'}} value={prize2} onChange={e => setPrize2(e.target.value)} placeholder="🥈 2do Lugar" />
              <input type="text" style={{...neon.input, borderColor: '#cd7f32', marginBottom: 0, textAlign: 'center'}} value={prize3} onChange={e => setPrize3(e.target.value)} placeholder="🥉 3er Lugar" />
            </div>

            <button onClick={handleCreateEvent} style={{ ...neon.btn, background: 'linear-gradient(90deg, #00f0ff, #0088ff)', color: '#fff', marginTop: '10px' }}>
              🚀 LANZAR TORNEO EN VIVO
            </button>
          </div>
        )}
      </div>

      {/* CONFIGURACIÓN DE BILLETERAS */}
      <div style={{ ...neon.card, borderColor: '#ff41b4' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#ff99dd', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {Icons.wallet} Billeteras de Operación
        </h3>

        <span style={neon.label}>Billetera Pública GRAM (Red TON)</span>
        <input 
          type="text" 
          placeholder="Ej: UQDgJUo4Ycvd9Q_ICUI..." 
          style={{ ...neon.input, borderColor: '#ff41b4' }} 
          value={sysConfig.master_wallet_gram || ''} 
          onChange={(e) => setSysConfig({ ...sysConfig, master_wallet_gram: e.target.value })} 
        />

        <span style={neon.label}>Billetera Pública USDT (Red BEP20)</span>
        <input 
          type="text" 
          placeholder="Ej: 0x1234567890abcdef..." 
          style={{ ...neon.input, borderColor: '#ff41b4', marginBottom: '16px' }} 
          value={sysConfig.master_wallet_usdt_bep20 || ''} 
          onChange={(e) => setSysConfig({ ...sysConfig, master_wallet_usdt_bep20: e.target.value })} 
        />

        <div style={{ background: 'rgba(0, 255, 170, 0.1)', border: '1px dashed #00ffaa', padding: '10px', borderRadius: '10px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#00ffaa' }}>
          {Icons.lock} <span>Las llaves privadas de retiro y gas están protegidas en Vercel (process.env).</span>
        </div>

        <button onClick={handleSaveConfig} disabled={savingConfig} style={{ ...neon.btn, background: 'linear-gradient(90deg, #ff1493, #8a2be2)', color: '#fff' }}>
          {savingConfig ? 'GUARDANDO...' : 'GUARDAR BILLETERAS'}
        </button>
      </div>

      {/* BUSCADOR DE USUARIOS */}
      <div style={neon.card}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#ffe600' }}>Control de Usuarios</h3>
        <span style={neon.label}>Buscar por ID de Telegram</span>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          <input 
            type="number" 
            placeholder="Ej. 8968109534" 
            style={{ ...neon.input, marginBottom: 0, flex: 1 }} 
            value={searchId} 
            onChange={(e) => setSearchId(e.target.value)} 
          />
          <button onClick={handleSearchUser} style={{ ...neon.btn, width: 'auto', padding: '0 20px' }}>{Icons.search}</button>
        </div>

        {foundUser && (
          <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px dashed #8a2be2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#00f0ff' }}>@{foundUser.username} (ID: {foundUser.id})</span>
              <span style={{ fontSize: '11px', color: foundUser.is_banned ? '#ff1493' : '#00ffaa', fontWeight: '900' }}>
                {foundUser.is_banned ? 'BANEADO' : 'ACTIVO'}
              </span>
            </div>

            {/* CONTROL 1: BÓVEDA USDT (DEPOSIT_BALANCE) */}
            <div style={{ marginBottom: '14px' }}>
              <span style={{ ...neon.label, color: '#00ffaa' }}>Bóveda de Campañas (USDT - Solo Compras)</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="number" 
                  step="0.01"
                  style={{ ...neon.input, marginBottom: 0, flex: 1, borderColor: '#00ffaa' }} 
                  value={newDepositBalance} 
                  onChange={(e) => setNewDepositBalance(e.target.value)} 
                />
                <button onClick={handleUpdateDepositBalance} style={{ ...neon.btn, width: 'auto', background: 'linear-gradient(90deg, #00ffaa, #00bb77)', color: '#050214' }}>Guardar</button>
              </div>
            </div>

            {/* CONTROL 2: SALDO RETIRABLE (BALANCE) */}
            <div style={{ marginBottom: '16px' }}>
              <span style={{ ...neon.label, color: '#00f0ff' }}>Saldo Retirable Base (1.00 = 1000 Gemas)</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="number" 
                  step="0.001"
                  style={{ ...neon.input, marginBottom: 0, flex: 1, borderColor: '#00f0ff' }} 
                  value={newBalance} 
                  onChange={(e) => setNewBalance(e.target.value)} 
                />
                <button onClick={handleUpdateBalance} style={{ ...neon.btn, width: 'auto', background: 'linear-gradient(90deg, #00f0ff, #0088ff)', color: '#050214' }}>Guardar</button>
              </div>
            </div>

            <button onClick={handleToggleBan} style={foundUser.is_banned ? { ...neon.btnDanger, borderColor: '#00ffaa', color: '#00ffaa' } : neon.btnDanger}>
              {foundUser.is_banned ? <>{Icons.restore} DESBANEAR USUARIO</> : <>{Icons.ban} BANEAR USUARIO</>}
            </button>
          </div>
        )}
      </div>

      {/* 🔥 INICIO PANEL DE RETIROS PENDIENTES 🔥 */}
      <div style={{ ...neon.card, borderColor: '#ff99dd' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#ff99dd' }}>Retiros Pendientes</h3>
          <button onClick={loadPendingWithdrawals} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>{Icons.refresh}</button>
        </div>

        {loadingWithdrawals ? (
          <div style={{ textAlign: 'center', fontSize: '12px', color: '#aaa' }}>Cargando retiros...</div>
        ) : pendingWithdrawals.length === 0 ? (
          <div style={{ textAlign: 'center', fontSize: '12px', color: '#aaa' }}>No hay retiros pendientes de aprobación.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
            {pendingWithdrawals.map(w => (
              <div key={w.id} style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '12px', padding: '12px', border: '1px solid #ff99dd' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#fff', fontWeight: 'bold' }}>User ID: {w.user_id}</span>
                  <span style={{ fontSize: '14px', color: '#ffe600', fontWeight: '900' }}>{w.amount} USDT</span>
                </div>
                <div style={{ fontSize: '11px', color: '#00ffaa', marginBottom: '12px', wordBreak: 'break-all' }}>
                  Billetera: {w.wallet_address}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleApproveWithdrawal(w.id)} style={{ flex: 1, background: '#00ffaa', border: 'none', padding: '8px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    {Icons.check} APROBAR
                  </button>
                  <button onClick={() => handleRejectWithdrawal(w.id)} style={{ flex: 1, background: 'transparent', border: '1px solid #ff1493', color: '#ff1493', padding: '8px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    {Icons.cross} RECHAZAR
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AUDITORÍA DE CAMPAÑAS */}
      <div style={neon.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#00ffaa' }}>Auditoría de Campañas</h3>
          <button onClick={loadAllTasks} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>{Icons.refresh}</button>
        </div>

        {loadingTasks ? (
          <div style={{ textAlign: 'center', fontSize: '12px', color: '#ff99dd' }}>Cargando datos...</div>
        ) : allTasks.length === 0 ? (
          <div style={{ textAlign: 'center', fontSize: '12px', color: '#ff99dd' }}>No hay campañas activas en la plataforma.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
            {allTasks.map(task => (
              <div key={task.id} style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '12px', padding: '12px', border: '1px solid #00f0ff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '13px', color: '#fff' }}>{task.title}</strong>
                  <span style={{ fontSize: '10px', color: task.status === 'paused' ? '#ffaa00' : '#00ffaa', fontWeight: 'bold' }}>
                    {task.status.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#ff99dd', marginBottom: '8px', wordBreak: 'break-all' }}>
                  {task.url}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px' }}>
                  <span style={{ color: '#aaa' }}>Creador: {task.creator_id}</span>
                  <span style={{ color: '#ffe600', fontWeight: 'bold' }}>{task.completions_done}/{task.completions_total}</span>
                </div>
                <div style={{ marginTop: '10px', textAlign: 'right' }}>
                  <button onClick={() => handleDeleteTask(task.id)} style={{ background: '#ff1493', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
                    {Icons.trash} Eliminar Forzada
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
