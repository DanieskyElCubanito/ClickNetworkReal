import { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import toast from 'react-hot-toast';
import { botApi } from '../api/botApi';

const Icons = {
  gem: <svg width="14" height="14" viewBox="0 0 24 24" fill="#ff1414" stroke="#ff1414"><path d="M12 22L2 9L6 2H18L22 9L12 22Z"/></svg>,
  telegram: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0088ff" strokeWidth="2"><path d="M21.5 2L2 11.5l6 2.5 1.5 7 3.5-3.5 5 4 3.5-19.5z"/></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ffaa" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>,
  plus: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
};

const neonStyles = {
  title: { fontSize: '24px', fontWeight: '900', textAlign: 'center', letterSpacing: '1px', textTransform: 'uppercase', margin: '10px 0 20px 0', color: '#00f0ff' },
  taskCard: { background: 'rgba(25, 10, 45, 0.6)', border: '1px solid #3d1b63', borderRadius: '16px', padding: '16px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  btnDo: { padding: '10px 18px', background: 'linear-gradient(90deg, #00f0ff, #0088ff)', color: '#050214', border: 'none', borderRadius: '12px', fontWeight: '900', fontSize: '12px', cursor: 'pointer' },
  btnCheck: { padding: '10px 18px', background: 'transparent', color: '#00ffaa', border: '2px solid #00ffaa', borderRadius: '12px', fontWeight: '900', fontSize: '12px', cursor: 'pointer' },
  input: { width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid #00f0ff', borderRadius: '10px', padding: '14px', color: '#fff', marginBottom: '14px', outline: 'none', boxSizing: 'border-box' },
  tabBtn: (active) => ({ flex: 1, padding: '12px', borderRadius: '12px', fontWeight: '900', fontSize: '12px', border: 'none', cursor: 'pointer', background: active ? 'linear-gradient(90deg, #00f0ff, #0088ff)' : 'rgba(255,255,255,0.05)', color: active ? '#050214' : '#00f0ff' })
};

export default function AdsTab({ userData, setUserData, t }) {
  const [subTab, setSubTab] = useState('earn'); // 'earn' o 'create'
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState(null);

  // Formulario Crear
  const [newTask, setNewTask] = useState({ title: '', url: '', bot_token: '', completions: 100, rewardGemas: 2 });
  const [isCreating, setIsCreating] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await botApi.getTasks(userData.id);
      if (data && data.success) setTasks(data.tasks);
    } catch (error) {}
    setLoading(false);
  };

  useEffect(() => { if (userData?.id) fetchTasks(); }, [userData?.id]);

  const handleVerify = async (task) => {
    setVerifyingId(task.id);
    try {
      const data = await botApi.completeTask(userData.id, task.id);
      if (data && data.success) {
        toast.success(`¡Misión completada!`);
        if (data.balance !== undefined) setUserData(prev => ({ ...prev, balance: data.balance }));
        setTasks(tasks.map(t => t.id === task.id ? { ...t, is_completed: true } : t));
      } else toast.error(data.error || "Misión no completada.");
    } catch (err) { toast.error("Error al verificar."); }
    setVerifyingId(null);
  };

  const handleCreateTask = async () => {
    if (!newTask.title || !newTask.url) return toast.error("Faltan datos");
    setIsCreating(true);
    try {
      const payload = {
        type: 'channel', title: newTask.title, url: newTask.url, bot_token: newTask.bot_token,
        completions_total: newTask.completions, reward_per_user: newTask.rewardGemas / 1000 // Convertir Gemas a USDT para backend
      };
      const data = await botApi.createTask(userData.id, payload);
      if (data && data.success) {
        toast.success("Campaña creada. Gemas descontadas.");
        if (data.balance !== undefined) setUserData(prev => ({ ...prev, balance: data.balance }));
        setNewTask({ title: '', url: '', bot_token: '', completions: 100, rewardGemas: 2 });
        fetchTasks();
        setSubTab('earn');
      } else toast.error(data.error || "Error");
    } catch (e) { toast.error("Error"); }
    setIsCreating(false);
  };

  const activeTasks = tasks.filter(t => !t.is_completed && t.status === 'active');
  const myTasks = tasks.filter(t => String(t.creator_id) === String(userData?.id));

  // Costo = (Recompensa / 0.40) * Usuarios. En gemas:
  const costGemas = Math.floor((newTask.rewardGemas / 0.40) * newTask.completions);

  return (
    <div className="fade-in" style={{ paddingBottom: '20px' }}>
      <h2 style={neonStyles.title}>Red de Tráfico</h2>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '16px' }}>
        <button onClick={() => setSubTab('earn')} style={neonStyles.tabBtn(subTab === 'earn')}>GANAR GEMAS</button>
        <button onClick={() => setSubTab('create')} style={neonStyles.tabBtn(subTab === 'create')}>CREAR CAMPAÑA</button>
      </div>

      {subTab === 'earn' && (
        <div className="fade-in">
          {loading ? (
            <div style={{ textAlign: 'center', color: '#00f0ff', padding: '20px' }}>Sincronizando...</div>
          ) : activeTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', border: '1px dashed #00f0ff', borderRadius: '16px' }}>Sin campañas.</div>
          ) : (
            activeTasks.map(task => (
              <div key={task.id} style={neonStyles.taskCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', background: 'rgba(0,136,255,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Icons.telegram}</div>
                  <div>
                    <div style={{ color: '#fff', fontSize: '14px', fontWeight: '900' }}>{task.title}</div>
                    <div style={{ color: '#ff4b4b', fontSize: '13px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '4px' }}>+{Math.floor(task.reward * 1000)} {Icons.gem}</div>
                  </div>
                </div>
                {task.clicked ? (
                  <button onClick={() => handleVerify(task)} disabled={verifyingId === task.id} style={neonStyles.btnCheck}>
                    {verifyingId === task.id ? '...' : 'VERIFICAR'}
                  </button>
                ) : (
                  <button onClick={() => { WebApp.openTelegramLink(task.url); setTasks(tasks.map(t => t.id === task.id ? { ...t, clicked: true } : t)); }} style={neonStyles.btnDo}>IR ➔</button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {subTab === 'create' && (
        <div className="fade-in">
          <div style={{ background: 'rgba(20,8,38,0.9)', border: '1px solid #00f0ff', borderRadius: '16px', padding: '20px' }}>
            <label style={{ color: '#00f0ff', fontSize: '12px', fontWeight: '900', marginBottom: '6px', display: 'block' }}>Título Breve</label>
            <input style={neonStyles.input} placeholder="Ej: Únete a mi comunidad" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
            
            <label style={{ color: '#00f0ff', fontSize: '12px', fontWeight: '900', marginBottom: '6px', display: 'block' }}>Enlace de Telegram</label>
            <input style={neonStyles.input} placeholder="https://t.me/..." value={newTask.url} onChange={e => setNewTask({...newTask, url: e.target.value})} />
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ color: '#00f0ff', fontSize: '12px', fontWeight: '900', marginBottom: '6px', display: 'block' }}>Usuarios</label>
                <input style={neonStyles.input} type="number" value={newTask.completions} onChange={e => setNewTask({...newTask, completions: Number(e.target.value)})} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ color: '#00f0ff', fontSize: '12px', fontWeight: '900', marginBottom: '6px', display: 'block' }}>Pago (Gemas)</label>
                <input style={neonStyles.input} type="number" value={newTask.rewardGemas} onChange={e => setNewTask({...newTask, rewardGemas: Number(e.target.value)})} />
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.5)', padding: '12px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ color: '#fff', fontSize: '12px' }}>Total a Descontar:</span>
              <strong style={{ color: '#ff4b4b' }}>{costGemas} {Icons.gem}</strong>
            </div>

            <button onClick={handleCreateTask} disabled={isCreating} style={{ ...neonStyles.btnDo, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {isCreating ? 'PROCESANDO...' : <>{Icons.plus} PAGAR Y LANZAR</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
