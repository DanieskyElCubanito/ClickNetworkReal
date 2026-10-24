import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { botApi } from '../api/botApi';

const neon = {
  card: { background: 'rgba(20, 8, 38, 0.95)', border: '1px solid #ffe600', borderRadius: '16px', padding: '20px', marginBottom: '16px' },
  input: { width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid #ffe600', borderRadius: '10px', padding: '12px', color: '#fff', marginBottom: '12px', outline: 'none' },
  btn: { width: '100%', padding: '12px', background: '#ffe600', color: '#000', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' },
  label: { fontSize: '12px', color: '#ffe600', fontWeight: '900', marginBottom: '6px', display: 'block' }
};

export default function AdminDashboard({ userData }) {
  const [stats, setStats] = useState({ users: 0, tasks: 0 });
  const [newTask, setNewTask] = useState({ type: 'channel', title: '', url: '', bot_token: '', completions_total: 100, reward_per_user: 0.002 });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const data = await botApi.getAdminStats(userData.id);
      if (data && data.success) setStats(data.stats);
    } catch (e) {}
  };

  const handleCreateTask = async () => {
    if (!newTask.title || !newTask.url) return toast.error("Faltan datos");
    setIsCreating(true);
    try {
      const data = await botApi.createTask(userData.id, newTask);
      if (data && data.success) {
        toast.success("Campaña creada (Descontado de tu saldo)");
        setNewTask({ ...newTask, title: '', url: '', bot_token: '' });
      } else toast.error(data.error || "Error");
    } catch (e) { toast.error("Error"); }
    setIsCreating(false);
  };

  const totalCost = (newTask.completions_total * (newTask.reward_per_user / 0.40)).toFixed(4);

  return (
    <div className="fade-in" style={{ paddingBottom: '20px' }}>
      <Toaster position="top-center" />
      <h2 style={{ color: '#ffe600', textAlign: 'center', fontWeight: '900' }}>Panel de Control</h2>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <div style={{ ...neon.card, flex: 1, margin: 0, textAlign: 'center' }}>
          <div style={{ color: '#ffe600', fontSize: '12px', fontWeight: '900' }}>Usuarios Totales</div>
          <div style={{ color: '#fff', fontSize: '24px', fontWeight: '900' }}>{stats.users}</div>
        </div>
        <div style={{ ...neon.card, flex: 1, margin: 0, textAlign: 'center' }}>
          <div style={{ color: '#ffe600', fontSize: '12px', fontWeight: '900' }}>Campañas Activas</div>
          <div style={{ color: '#fff', fontSize: '24px', fontWeight: '900' }}>{stats.tasks}</div>
        </div>
      </div>

      <div style={neon.card}>
        <h3 style={{ color: '#fff', marginTop: 0, fontSize: '16px' }}>Crear Campaña (Admin)</h3>
        
        <label style={neon.label}>Título Visual</label>
        <input style={neon.input} placeholder="Únete a nuestro canal..." value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
        
        <label style={neon.label}>Enlace (Telegram)</label>
        <input style={neon.input} placeholder="https://t.me/..." value={newTask.url} onChange={e => setNewTask({...newTask, url: e.target.value})} />
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <label style={neon.label}>Cupos (Usuarios)</label>
            <input style={neon.input} type="number" value={newTask.completions_total} onChange={e => setNewTask({...newTask, completions_total: Number(e.target.value)})} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={neon.label}>Pago a Usuario (USDT)</label>
            <input style={neon.input} type="number" step="0.001" value={newTask.reward_per_user} onChange={e => setNewTask({...newTask, reward_per_user: Number(e.target.value)})} />
          </div>
        </div>

        <div style={{ background: 'rgba(255,230,0,0.1)', padding: '12px', borderRadius: '10px', marginBottom: '16px', border: '1px dashed #ffe600' }}>
          <div style={{ color: '#fff', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Costo Total a descontar:</span>
            <strong style={{ color: '#ffe600' }}>{totalCost} USDT</strong>
          </div>
          <div style={{ color: '#888', fontSize: '11px', marginTop: '4px' }}>(Incluye 20% referidos + ganancia red)</div>
        </div>

        <button onClick={handleCreateTask} disabled={isCreating} style={neon.btn}>
          {isCreating ? 'CREANDO...' : 'LANZAR CAMPAÑA'}
        </button>
      </div>
    </div>
  );
}
