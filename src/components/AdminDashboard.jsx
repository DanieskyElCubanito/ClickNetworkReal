import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import WebApp from '@twa-dev/sdk';

const Icons = {
  shield: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffe600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  search: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#050214" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  ban: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff1493" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>,
  restore: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ffaa" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>,
  trash: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  refresh: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ffaa" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
};

const neon = {
  card: { background: 'linear-gradient(145deg, #18052a, #0d0217)', border: '2px solid #ffe600', borderRadius: '20px', padding: '16px', marginBottom: '16px', boxShadow: '0 4px 20px rgba(255, 230, 0, 0.15)' },
  input: { width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid #ffe600', borderRadius: '12px', padding: '12px', color: '#fff', fontSize: '14px', outline: 'none', marginBottom: '10px' },
  btn: { width: '100%', background: 'linear-gradient(90deg, #ffe600, #ffaa00)', color: '#050214', fontWeight: '900', padding: '12px', border: 'none', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(255, 230, 0, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' },
  btnDanger: { width: '100%', background: 'transparent', color: '#ff1493', fontWeight: '900', padding: '12px', border: '2px solid #ff1493', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  label: { fontSize: '10px', color: '#ff99dd', fontWeight: '900', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }
};

export default function AdminDashboard({ userData }) {
  const [stats, setStats] = useState({ users: 0, tasks: 0 });
  const [searchId, setSearchId] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [newBalance, setNewBalance] = useState('');
  const [allTasks, setAllTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  const apiHeaders = { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': WebApp.initData || '' };

  useEffect(() => { loadStats(); loadAllTasks(); }, []);

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

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("¿Seguro que quieres eliminar esta campaña por violar las normas? Se reembolsará el saldo al creador.")) return;
    const tid = toast.loading("Eliminando campaña...");
    try {
      const res = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: 'delete-task', taskId: taskId, requestingUserId: userData.id, isAdminAction: true }) });
      const data = await res.json();
      if (data.success) { toast.success("Campaña eliminada", { id: tid }); loadAllTasks(); loadStats(); } 
      else { throw new Error(data.error); }
    } catch (err) { toast.error(err.message || "Error al eliminar.", { id: tid }); }
  };

  const handleSearchUser = async () => {
    if (!searchId) return toast.error("Ingresa un ID");
    const tid = toast.loading("Buscando...");
    try {
      const res = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: 'admin-search-user', adminId: userData.id, targetId: searchId }) });
      const data = await res.json();
      if (data.success && data.user) {
        setFoundUser(data.user); setNewBalance(data.user.balance); toast.success("Usuario encontrado", { id: tid });
      } else { toast.error("Usuario no existe", { id: tid }); setFoundUser(null); }
    } catch (e) { toast.error("Error al buscar", { id: tid }); }
  };

  const handleUpdateBalance = async () => {
    if (!foundUser) return;
    const tid = toast.loading("Actualizando saldo...");
    try {
      const res = await fetch('/api', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: 'admin-update-user', adminId: userData.id, targetId: foundUser.id, update: { balance: Number(newBalance) } }) });
      const data = await res.json();
      if (data.success) { toast.success("Saldo actualizado", { id: tid }); setFoundUser(prev => ({ ...prev, balance: Number(newBalance) })); } 
      else throw new Error();
    } catch (e) { toast.error("Error al actualizar", { id: tid }); }
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

  return (
    <div style={{ color: '#fff', paddingBottom: '20px' }}>
      <h2 style={{ color: '#ffe600', fontWeight: '900', textAlign: 'center', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        {Icons.shield} Panel de Control
      </h2>

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

      <div style={neon.card}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#ffe600' }}>Control de Usuarios</h3>
        <span style={neon.label}>Buscar por ID de Telegram</span>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          <input type="number" placeholder="Ej. 8968109534" style={{ ...neon.input, marginBottom: 0, flex: 1 }} value={searchId} onChange={(e) => setSearchId(e.target.value)} />
          <button onClick={handleSearchUser} style={{ ...neon.btn, width: 'auto', padding: '0 20px' }}>{Icons.search}</button>
        </div>

        {foundUser && (
          <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px dashed #8a2be2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{foundUser.username}</span>
              <span style={{ fontSize: '11px', color: foundUser.is_banned ? '#ff1493' : '#00ffaa', fontWeight: '900' }}>
                {foundUser.is_banned ? 'BANEADO' : 'ACTIVO'}
              </span>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <span style={neon.label}>Modificar Saldo (CLICK)</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="number" style={{ ...neon.input, marginBottom: 0, flex: 1 }} value={newBalance} onChange={(e) => setNewBalance(e.target.value)} />
                <button onClick={handleUpdateBalance} style={{ ...neon.btn, width: 'auto', background: 'linear-gradient(90deg, #00f0ff, #0088ff)', color: '#000' }}>Guardar</button>
              </div>
            </div>

            <button onClick={handleToggleBan} style={foundUser.is_banned ? { ...neon.btnDanger, borderColor: '#00ffaa', color: '#00ffaa' } : neon.btnDanger}>
              {foundUser.is_banned ? <>{Icons.restore} DESBANEAR USUARIO</> : <>{Icons.ban} BANEAR USUARIO</>}
            </button>
          </div>
        )}
      </div>

      <div style={neon.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#00ffaa' }}>Auditoría de Campañas</h3>
          <button onClick={loadAllTasks} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>{Icons.refresh}</button>
        </div>

        {loadingTasks ? (
          <div style={{ textAlign: 'center', fontSize: '12px', color: '#ff99dd' }}>Cargando datos...</div>
        ) : allTasks.length === 0 ? (
          <div style={{ textAlign: 'center', fontSize: '12px', color: '#ff99dd' }}>No hay campañas activas.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
            {allTasks.map(task => (
              <div key={task.id} style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '12px', padding: '12px', border: '1px solid #00f0ff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '13px', color: '#fff' }}>{task.title}</strong>
                  <span style={{ fontSize: '10px', color: task.status === 'paused' ? '#ffaa00' : '#00ffaa', fontWeight: 'bold' }}>{task.status.toUpperCase()}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#ff99dd', marginBottom: '8px', wordBreak: 'break-all' }}>{task.url}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px' }}>
                  <span style={{ color: '#aaa' }}>Creador: {task.creator_id}</span>
                  <span style={{ color: '#ffe600', fontWeight: 'bold' }}>{task.completions_done}/{task.completions_total}</span>
                </div>
                <div style={{ marginTop: '10px', textAlign: 'right' }}>
                  <button onClick={() => handleDeleteTask(task.id)} style={{ background: '#ff1493', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
                    {Icons.trash} Eliminar Forzadamente
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
