import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { botApi } from '../api/botApi';

const Icons = {
  search: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffe600" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  save: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  trash: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
};

const neon = {
  card: { background: 'rgba(20, 8, 38, 0.95)', border: '1px solid #ffe600', borderRadius: '16px', padding: '20px', marginBottom: '16px' },
  input: { width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid #ffe600', borderRadius: '10px', padding: '12px', color: '#fff', marginBottom: '12px', outline: 'none', boxSizing: 'border-box' },
  btn: { padding: '10px 16px', background: '#ffe600', color: '#000', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }
};

export default function AdminDashboard({ userData }) {
  const [stats, setStats] = useState({ users: 0, tasks: 0 });
  const [searchId, setSearchId] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [editBalance, setEditBalance] = useState('');
  const [allTasks, setAllTasks] = useState([]);

  useEffect(() => { 
    botApi.getAdminStats(userData.id).then(d => { if(d?.success) setStats(d.stats); });
    botApi.getAdminTasks(userData.id).then(d => { if(d?.success) setAllTasks(d.tasks); });
  }, [userData.id]);

  const handleSearchUser = async () => {
    if (!searchId.trim()) return toast.error("Ingresa un ID");
    const d = await botApi.adminSearchUser(userData.id, searchId);
    if (d && d.success) { setFoundUser(d.user); setEditBalance(d.user.balance); } 
    else toast.error("Usuario no encontrado");
  };

  const handleUpdateUser = async () => {
    if (!foundUser) return;
    const d = await botApi.adminUpdateUser(userData.id, foundUser.id, { balance: Number(editBalance) });
    if (d && d.success) toast.success("Saldo actualizado");
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("¿Borrar esta campaña y reembolsar?")) return;
    const d = await botApi.deleteTask(userData.id, taskId, true);
    if (d && d.success) {
      toast.success("Borraba exitosamente");
      setAllTasks(allTasks.filter(t => t.id !== taskId));
    }
  };

  return (
    <div className="fade-in" style={{ paddingBottom: '20px' }}>
      <Toaster position="top-center" />
      <h2 style={{ color: '#ffe600', textAlign: 'center', fontWeight: '900', textTransform: 'uppercase' }}>Consola Admin</h2>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <div style={{ ...neon.card, flex: 1, margin: 0, textAlign: 'center' }}>
          <div style={{ color: '#ffe600', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}>Usuarios Base</div>
          <div style={{ color: '#fff', fontSize: '24px', fontWeight: '900' }}>{stats.users}</div>
        </div>
        <div style={{ ...neon.card, flex: 1, margin: 0, textAlign: 'center' }}>
          <div style={{ color: '#ffe600', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}>Campañas Red</div>
          <div style={{ color: '#fff', fontSize: '24px', fontWeight: '900' }}>{stats.tasks}</div>
        </div>
      </div>

      <div style={neon.card}>
        <h3 style={{ color: '#fff', marginTop: 0, fontSize: '14px', textTransform: 'uppercase' }}>Gestión de Usuarios</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input style={{...neon.input, marginBottom: 0}} placeholder="Pegar ID de Telegram" value={searchId} onChange={e => setSearchId(e.target.value)} />
          <button onClick={handleSearchUser} style={neon.btn}>{Icons.search}</button>
        </div>

        {foundUser && (
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', marginTop: '16px' }}>
            <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '12px' }}>@{foundUser.username || 'SinUsuario'}</div>
            <label style={{ color: '#ffe600', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', display: 'block' }}>Balance Exacto (USDT)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input style={{...neon.input, marginBottom: 0}} type="number" step="0.001" value={editBalance} onChange={e => setEditBalance(e.target.value)} />
              <button onClick={handleUpdateUser} style={neon.btn}>{Icons.save}</button>
            </div>
          </div>
        )}
      </div>

      <div style={neon.card}>
        <h3 style={{ color: '#fff', marginTop: 0, fontSize: '14px', textTransform: 'uppercase' }}>Todas las Campañas</h3>
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {allTasks.map(t => (
            <div key={t.id} style={{ background: 'rgba(0,0,0,0.5)', padding: '12px', borderRadius: '10px', marginBottom: '8px', border: '1px solid #3d1b63' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <strong style={{ color: '#fff', fontSize: '13px' }}>{t.title}</strong>
                <button onClick={() => handleDeleteTask(t.id)} style={{ background: '#ff4b4b', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}>{Icons.trash}</button>
              </div>
              <div style={{ color: '#aaa', fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Creador: {t.creator_id}</span>
                <span style={{ color: '#ffe600' }}>{t.completions_done}/{t.completions_total}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
