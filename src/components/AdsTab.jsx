import { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import toast from 'react-hot-toast';
import { botApi } from '../api/botApi';

const neonStyles = {
  title: { fontSize: '24px', fontWeight: '900', textAlign: 'center', letterSpacing: '1px', textTransform: 'uppercase', margin: '10px 0 20px 0', color: '#00f0ff', textShadow: '0 0 15px rgba(0, 240, 255, 0.4)' },
  taskCard: {
    background: 'rgba(25, 10, 45, 0.6)', border: '1px solid #3d1b63', borderRadius: '16px',
    padding: '16px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', transition: 'all 0.2s ease', position: 'relative', overflow: 'hidden'
  },
  btnDo: {
    padding: '10px 18px', background: 'linear-gradient(90deg, #00f0ff, #0088ff)',
    color: '#050214', border: 'none', borderRadius: '12px', fontWeight: '900', fontSize: '12px',
    cursor: 'pointer', boxShadow: '0 4px 15px rgba(0, 240, 255, 0.3)', whiteSpace: 'nowrap'
  },
  btnCheck: {
    padding: '10px 18px', background: 'transparent', color: '#00ffaa', border: '2px solid #00ffaa', 
    borderRadius: '12px', fontWeight: '900', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap'
  },
  btnDone: {
    padding: '10px 18px', background: 'rgba(255,255,255,0.1)', color: '#888', border: 'none', 
    borderRadius: '12px', fontWeight: '900', fontSize: '12px', cursor: 'not-allowed'
  }
};

const Icons = {
  gem: <span style={{ fontSize: '14px', color: '#ff4b4b', filter: 'drop-shadow(0 0 4px #ff1414)' }}>💎</span>,
  telegram: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0088ff" strokeWidth="2"><path d="M21.5 2L2 11.5l6 2.5 1.5 7 3.5-3.5 5 4 3.5-19.5z"/></svg>,
  daily: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffe600" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
};

export default function AdsTab({ userData, setUserData, t }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState(null);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await botApi.getTasks(userData.id);
      if (data && data.success) setTasks(data.tasks);
    } catch (error) {}
    setLoading(false);
  };

  useEffect(() => { if (userData?.id) fetchTasks(); }, [userData?.id]);

  const handleAction = (task) => {
    WebApp.openTelegramLink(task.url);
    const upd = tasks.map(t => t.id === task.id ? { ...t, clicked: true } : t);
    setTasks(upd);
  };

  const handleVerify = async (task) => {
    setVerifyingId(task.id);
    try {
      const data = await botApi.completeTask(userData.id, task.id);
      if (data && data.success) {
        toast.success(`¡Ganaste ${Math.floor(data.reward * 1000)} Gemas!`);
        if (data.balance !== undefined) setUserData(prev => ({ ...prev, balance: data.balance }));
        const upd = tasks.map(t => t.id === task.id ? { ...t, is_completed: true } : t);
        setTasks(upd);
      } else {
        toast.error(data.error || "No completaste la tarea.");
      }
    } catch (err) { toast.error("Error al verificar."); }
    setVerifyingId(null);
  };

  const activeTasks = tasks.filter(t => !t.is_completed && t.status === 'active');
  const doneTasks = tasks.filter(t => t.is_completed);

  return (
    <div className="fade-in" style={{ paddingBottom: '20px' }}>
      <h2 style={neonStyles.title}>Centro de Tareas</h2>
      
      <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '16px', padding: '12px', marginBottom: '20px', border: '1px dashed #00f0ff', textAlign: 'center' }}>
        <p style={{ color: '#ff99dd', fontSize: '12px', margin: 0, fontWeight: 'bold' }}>Gana Gemas interactuando con nuestros patrocinadores.</p>
      </div>

      <div style={{ fontSize: '13px', color: '#00f0ff', fontWeight: '900', marginBottom: '10px', textTransform: 'uppercase' }}>Tareas Disponibles ({activeTasks.length})</div>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px', color: '#00f0ff' }}>Cargando tareas...</div>
      ) : activeTasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', color: '#aaa', fontSize: '13px' }}>No hay tareas nuevas. Vuelve más tarde.</div>
      ) : (
        activeTasks.map(task => {
          const isDaily = task.type.includes('daily');
          const gemReward = Math.floor((task.reward || 0) * 1000);

          return (
            <div key={task.id} style={neonStyles.taskCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '40px', height: '40px', background: 'rgba(0, 136, 255, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isDaily ? Icons.daily : Icons.telegram}
                </div>
                <div>
                  <div style={{ color: '#fff', fontSize: '14px', fontWeight: '900', marginBottom: '4px' }}>{task.title}</div>
                  <div style={{ color: '#ff4b4b', fontSize: '13px', fontWeight: '900' }}>+{gemReward} {Icons.gem}</div>
                </div>
              </div>

              {task.clicked ? (
                <button onClick={() => handleVerify(task)} disabled={verifyingId === task.id} style={neonStyles.btnCheck}>
                  {verifyingId === task.id ? '...' : 'VERIFICAR'}
                </button>
              ) : (
                <button onClick={() => handleAction(task)} style={neonStyles.btnDo}>
                  {isDaily ? 'RECLAMAR' : 'IR ➔'}
                </button>
              )}
            </div>
          );
        })
      )}

      {doneTasks.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <div style={{ fontSize: '13px', color: '#888', fontWeight: '900', marginBottom: '10px', textTransform: 'uppercase' }}>Completadas</div>
          {doneTasks.map(task => (
            <div key={task.id} style={{ ...neonStyles.taskCard, opacity: 0.5, border: '1px solid #333' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</div>
                <div style={{ color: '#fff', fontSize: '14px', fontWeight: '900', textDecoration: 'line-through' }}>{task.title}</div>
              </div>
              <button style={neonStyles.btnDone}>HECHO</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
