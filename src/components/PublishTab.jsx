import { useState, useRef, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import WebApp from '@twa-dev/sdk';

const neonStyles = {
  container: { color: '#ffffff', paddingBottom: '20px' },
  title: {
    fontSize: '22px', fontWeight: '900', textAlign: 'center', letterSpacing: '1px', textTransform: 'uppercase',
    margin: '10px 0 20px 0', color: '#00f0ff', textShadow: '0 0 15px rgba(0, 240, 255, 0.4)'
  },
  card: {
    background: 'linear-gradient(145deg, rgba(20, 8, 38, 0.9), rgba(15, 5, 28, 0.95))',
    border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: '20px', padding: '18px', marginBottom: '16px',
    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.5), inset 0 2px 10px rgba(0, 240, 255, 0.05)'
  },
  cardInteractive: {
    background: 'rgba(25, 10, 45, 0.6)',
    border: '1.5px solid rgba(255, 20, 147, 0.4)', borderRadius: '16px', padding: '14px 16px', marginBottom: '12px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)', transition: 'all 0.2s ease'
  },
  btnPrimary: {
    width: '100%', padding: '15px', background: 'linear-gradient(90deg, #ff1493, #d80073)',
    color: '#ffffff', border: 'none', borderRadius: '16px', fontWeight: '900', fontSize: '15px',
    letterSpacing: '0.5px', cursor: 'pointer', boxShadow: '0 6px 0 #8b004b, 0 10px 20px rgba(255, 20, 147, 0.3)',
    textTransform: 'uppercase'
  },
  btnCyan: {
    width: '100%', padding: '15px', background: 'linear-gradient(90deg, #00f0ff, #0088ff)',
    color: '#050214', border: 'none', borderRadius: '16px', fontWeight: '900', fontSize: '15px',
    letterSpacing: '0.5px', cursor: 'pointer', boxShadow: '0 6px 0 #0066aa, 0 10px 20px rgba(0, 240, 255, 0.3)',
    textTransform: 'uppercase'
  },
  input: {
    width: '100%', background: 'rgba(10, 2, 20, 0.8)', border: '1.5px solid #8a2be2', borderRadius: '14px',
    padding: '14px', fontSize: '14px', color: '#ffffff', outline: 'none', boxSizing: 'border-box',
    transition: 'border 0.3s'
  },
  progressBarContainer: { display: 'flex', justifyContent: 'center', gap: '6px', margin: '10px 0 24px 0' },
  progressStep: (active) => ({
    flex: 1, height: '6px', maxWidth: '40px',
    background: active ? 'linear-gradient(90deg, #00f0ff, #ff1493)' : 'rgba(255, 255, 255, 0.1)',
    borderRadius: '10px', boxShadow: active ? '0 0 10px #00f0ff' : 'none', transition: 'all 0.3s ease'
  })
};

const TEMPLATES = [
  { title: 'Airdrop Boom', icon: '🚀', accent: '#ff007f', text: '🚀 Nuevo Airdrop confirmado. Participa gratis completando las tareas y asegura tus tokens.' },
  { title: 'Sorteo Neón', icon: '💎', accent: '#00f0ff', text: '💎 Gran recompensa activa para la comunidad. Entra al enlace y participa ahora mismo.' },
  { title: 'Red de Tráfico', icon: '⚡', accent: '#ffe600', text: '⚡ Únete a nuestra red. Gana USDT gratis todos los días completando tareas simples.' }
];

export default function PublishTab({ userData, setUserData, t }) {
  const [activeTab, setActiveTab] = useState('create');
  const [step, setStep] = useState(1);

  const [postText, setPostText] = useState('');
  const [imageUrl, setImageUrl] = useState(''); 
  const [buttonConfig, setButtonConfig] = useState({ text: '', url: '', style: 'default' });
  const [selectedGroups, setSelectedGroups] = useState([]);

  const [showButtonModal, setShowButtonModal] = useState(false);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [newGroupUrl, setNewGroupUrl] = useState('');
  const [newGroupPrice, setNewGroupPrice] = useState(1);
  const [isVerifyingGroup, setIsVerifyingGroup] = useState(false);

  const [isPublishing, setIsPublishing] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  const fileInputRef = useRef(null);
  const balance = Number(userData?.balance || 0);
  const [availableGroups, setAvailableGroups] = useState([]);

  // Cálculos matemáticos del USDT: El frontend suma precios, pero el backend lo cobra + 20%
  const totalCost = selectedGroups.reduce((acc, groupId) => {
      const grp = availableGroups.find(g => g.id === groupId);
      if (grp && String(grp.creator_id) === String(userData?.id)) return acc; 
      return acc + (grp ? Number((grp.price * 1.20).toFixed(4)) : 0);
  }, 0);

  const apiHeaders = { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': WebApp.initData || '' };

  // 🔥 CORE FIX: Se simplificó la extracción para que nunca falle la carga
  const fetchGroups = async () => {
    if (!userData?.id) return;
    setLoadingData(true);
    try {
      const resComm = await fetch('/api', {
        method: 'POST', headers: apiHeaders,
        body: JSON.stringify({ action: 'get-publish-groups' })
      });
      const dataComm = await resComm.json();

      if (dataComm.success && dataComm.communityGroups) {
         const allGroups = dataComm.communityGroups.map(g => ({
           id: g.chat_id, 
           name: g.chat_id, 
           price: Number(g.price_24h), 
           members: "Activo", // Como no hay endpoint de stats, mostramos activo
           rating: g.rating, 
           creator_id: String(g.owner_id) 
         }));
         setAvailableGroups(allGroups);
      }
    } catch (e) {
      console.error("Error obteniendo canales:", e);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchPublishHistory = async () => {
    if (!userData?.id) return;
    try {
      const res = await fetch('/api', {
        method: 'POST', headers: apiHeaders,
        body: JSON.stringify({ action: 'get-history' })
      });
      const data = await res.json();
      if (data.success && data.history) {
        const pubLogs = data.history.filter(h => h.title && h.title.includes('Publicidad'));
        setHistoryList(pubLogs);
      }
    } catch (e) {}
  };

  useEffect(() => { 
    fetchGroups(); 
  }, [userData?.id]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchGroups();
      fetchPublishHistory();
    }
  }, [activeTab, userData?.id]);

  const handleToggleGroup = (groupId) => {
    setSelectedGroups(prev => prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) return toast.error("Max 3MB.");
      const reader = new FileReader();
      reader.onloadend = () => setImageUrl(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveButton = () => {
    if (buttonConfig.text && !buttonConfig.url) return toast.error("URL requerida.");
    if (buttonConfig.url) {
      if (!buttonConfig.text.trim()) setButtonConfig(prev => ({ ...prev, text: 'Abrir Enlace' }));
    }
    setShowButtonModal(false);
  };

  const handleNextStep1 = () => { if (!postText.trim()) return toast.error("Escribe algo para publicar."); setStep(2); };
  const handleNextStep2 = () => setStep(3);
  const handleNextStep3 = () => {
    if (selectedGroups.length === 0) return toast.error("Selecciona al menos un canal del mercado.");
    if (balance < totalCost) return toast.error(`Saldo insuficiente. Necesitas ${totalCost} USDT.`);
    setStep(4);
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    const tid = toast.loading("Enviando al Escrow...");

    try {
      for (const chatId of selectedGroups) {
        const targetGroup = availableGroups.find(g => g.id === chatId);
        if (!targetGroup) continue;

        const response = await fetch('/api', {
          method: 'POST', headers: apiHeaders,
          body: JSON.stringify({ action: 'buy-marketplace-ad', channel_owner_id: targetGroup.creator_id, chat_id: chatId, text: postText, price: targetGroup.price })
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        if (data.balance !== undefined) setUserData((prev) => ({ ...prev, balance: data.balance }));
      }
      toast.success("Pago retenido. Pendiente de aprobación.", { id: tid });
      setPostText(''); setImageUrl(''); setButtonConfig({ text: '', url: '', style: 'default' }); setSelectedGroups([]); setStep(1);
      setActiveTab('history');
    } catch (err) { toast.error(err.message || "Error", { id: tid }); } 
    finally { setIsPublishing(false); }
  };

  const handleAddCommunityGroup = async () => {
    if (!newGroupUrl.trim() || newGroupPrice <= 0) return toast.error("Datos inválidos");
    setIsVerifyingGroup(true);
    const tid = toast.loading("Verificando permisos...");
    try {
      const res = await fetch('/api', {
        method: 'POST', headers: apiHeaders,
        body: JSON.stringify({ action: 'add-publish-group', url: newGroupUrl, price: newGroupPrice })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("¡Canal listado en el Mercado!", { id: tid });
        setNewGroupUrl(''); setNewGroupPrice(1);
        setShowAddGroupModal(false);
        fetchGroups(); 
      } else {
        toast.error(data.error || "Error", { id: tid });
      }
    } catch (err) { toast.error("Error de conexión", { id: tid }); } 
    finally { setIsVerifyingGroup(false); }
  };

  const myCommunityGroups = availableGroups.filter(g => String(g.creator_id) === String(userData?.id));

  return (
    <div style={neonStyles.container}>
      <Toaster position="top-center" />
      <h2 style={neonStyles.title}>Marketplace</h2>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', padding: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px' }}>
        <button onClick={() => setActiveTab('create')} style={{ flex: 1, padding: '12px', borderRadius: '16px', fontWeight: '900', fontSize: '13px', border: 'none', cursor: 'pointer', transition: '0.2s', background: activeTab === 'create' ? 'linear-gradient(90deg, #00f0ff, #0088ff)' : 'transparent', color: activeTab === 'create' ? '#050214' : '#00f0ff' }}>
          PUBLICAR ANUNCIO
        </button>
        <button onClick={() => setActiveTab('history')} style={{ flex: 1, padding: '12px', borderRadius: '16px', fontWeight: '900', fontSize: '13px', border: 'none', cursor: 'pointer', transition: '0.2s', background: activeTab === 'history' ? 'linear-gradient(90deg, #ff1493, #8a2be2)' : 'transparent', color: activeTab === 'history' ? '#fff' : '#ff99dd' }}>
          MIS CANALES / PAGOS
        </button>
      </div>

      {activeTab === 'create' && (
        <div className="fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <div style={{ fontSize: '12px', fontWeight: '900', color: '#ff41b4' }}>PASO {step} DE 4</div>
          </div>
          <div style={neonStyles.progressBarContainer}>
            <div style={neonStyles.progressStep(step >= 1)} />
            <div style={neonStyles.progressStep(step >= 2)} />
            <div style={neonStyles.progressStep(step >= 3)} />
            <div style={neonStyles.progressStep(step >= 4)} />
          </div>

          {step === 1 && (
            <div className="fade-in">
              <h3 style={{ fontSize: '18px', fontWeight: '900', marginBottom: '14px', color: '#fff' }}>Diseña tu Anuncio</h3>
              <div style={neonStyles.card}>
                <textarea
                  style={{ ...neonStyles.input, height: '120px', resize: 'none', background: 'rgba(0,0,0,0.3)', border: '1px dashed #00f0ff' }}
                  placeholder="Ej: 🔥 Únete a mi canal y gana..."
                  maxLength={1000} value={postText} onChange={(e) => setPostText(e.target.value)}
                />
                <div style={{ textAlign: 'right', fontSize: '11px', color: '#00f0ff', marginTop: '8px' }}>{postText.length} / 1000</div>
                <button onClick={handleNextStep1} style={{ ...neonStyles.btnCyan, marginTop: '16px' }}>SIGUIENTE ➔</button>
              </div>

              <div style={{ fontSize: '12px', fontWeight: '900', color: '#ff99dd', marginBottom: '10px', textTransform: 'uppercase' }}>Plantillas Rápidas</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {TEMPLATES.map((tmpl, idx) => (
                  <div key={idx} onClick={() => setPostText(tmpl.text)} style={{ ...neonStyles.card, padding: '14px 8px', cursor: 'pointer', marginBottom: 0, borderColor: tmpl.accent, textAlign: 'center', background: 'rgba(20,8,38,0.6)' }}>
                    <div style={{ fontSize: '28px', marginBottom: '6px' }}>{tmpl.icon}</div>
                    <div style={{ fontWeight: '900', fontSize: '11px', color: '#fff' }}>{tmpl.title}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <button onClick={() => setStep(1)} style={{ background: 'transparent', border: 'none', color: '#00f0ff', fontSize: '20px', cursor: 'pointer' }}>◀</button>
                <h3 style={{ fontSize: '18px', fontWeight: '900', margin: 0, color: '#fff' }}>Elementos (Opcional)</h3>
              </div>

              <div onClick={() => fileInputRef.current.click()} style={neonStyles.cardInteractive}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ fontSize: '32px' }}>🖼️</div>
                  <div>
                    <div style={{ fontWeight: '900', color: '#ffffff', fontSize: '15px' }}>Adjuntar Imagen</div>
                    <div style={{ fontSize: '12px', color: imageUrl ? '#00ffaa' : '#ff99dd' }}>{imageUrl ? 'Imagen lista' : 'Sube un banner para tu anuncio'}</div>
                  </div>
                </div>
                {imageUrl && <button onClick={(e) => { e.stopPropagation(); setImageUrl(''); }} style={{ background: 'transparent', border: 'none', color: '#ff1493', fontWeight: 'bold' }}>✕</button>}
              </div>
              <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />

              <div onClick={() => setShowButtonModal(true)} style={{...neonStyles.cardInteractive, borderColor: '#00f0ff'}}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ fontSize: '32px' }}>🔘</div>
                  <div>
                    <div style={{ fontWeight: '900', color: '#ffffff', fontSize: '15px' }}>Botón Interactivo</div>
                    <div style={{ fontSize: '12px', color: buttonConfig.url ? '#00ffaa' : '#00f0ff' }}>{buttonConfig.url ? `Botón: "${buttonConfig.text}"` : 'Agrega un botón con enlace'}</div>
                  </div>
                </div>
                <div style={{ color: '#00f0ff', fontWeight: '900', fontSize: '18px' }}>+</div>
              </div>

              <button onClick={handleNextStep2} style={{ ...neonStyles.btnCyan, marginTop: '20px' }}>SIGUIENTE ➔</button>
            </div>
          )}

          {step === 3 && (
            <div className="fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <button onClick={() => setStep(2)} style={{ background: 'transparent', border: 'none', color: '#00f0ff', fontSize: '20px', cursor: 'pointer' }}>◀</button>
                <h3 style={{ fontSize: '18px', fontWeight: '900', margin: 0, color: '#fff' }}>¿Dónde publicar?</h3>
              </div>

              {loadingData ? (
                <div style={{ textAlign: 'center', color: '#00f0ff', padding: '20px' }}>Cargando mercado...</div>
              ) : availableGroups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', marginBottom: '14px' }}>
                  <p style={{ fontSize: '13px', color: '#ff99dd', margin: 0 }}>El mercado está vacío. ¡Añade tu canal y sé el primero en cobrar!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {availableGroups.map((grp) => {
                    const isSelected = selectedGroups.includes(grp.id);
                    const isMyGroup = String(grp.creator_id) === String(userData?.id);

                    return (
                      <div key={grp.id} onClick={() => handleToggleGroup(grp.id)} style={{ ...neonStyles.cardInteractive, borderColor: isSelected ? '#00f0ff' : '#3d1b63', background: isSelected ? 'linear-gradient(135deg, rgba(0, 240, 255, 0.15), rgba(46, 16, 77, 0.9))' : 'rgba(25, 10, 45, 0.6)' }}>
                        <div>
                          <div style={{ fontWeight: '900', fontSize: '15px', color: '#ffffff' }}>
                            {grp.name} {isMyGroup && <span style={{fontSize: '10px', background: '#ff1493', color: '#fff', padding: '2px 6px', borderRadius: '8px'}}>Mío</span>}
                          </div>
                          <div style={{ fontSize: '12px', color: isMyGroup ? '#ff99dd' : '#00f0ff', fontWeight: 'bold' }}>
                            {isMyGroup ? `Publicas gratis` : `Precio: ${(grp.price * 1.20).toFixed(4)} USDT`}
                          </div>
                        </div>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: isSelected ? '#00f0ff' : 'transparent', border: '2px solid #00f0ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#050214', fontWeight: '900', fontSize: '14px' }}>
                          {isSelected ? '✓' : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <button onClick={() => setShowAddGroupModal(true)} style={{ width: '100%', padding: '14px', background: 'rgba(255,20,147,0.1)', color: '#ff1493', border: '2px dashed #ff1493', borderRadius: '16px', fontWeight: '900', fontSize: '14px', cursor: 'pointer', margin: '20px 0' }}>
                + AÑADIR MI CANAL AL MERCADO
              </button>

              <div style={{ background: 'linear-gradient(90deg, #10061e, #1a0b33)', border: '1px solid #00f0ff', borderRadius: '16px', padding: '16px', display: 'flex', justifyContent: 'space-between', fontWeight: '900', fontSize: '15px', marginBottom: '16px' }}>
                <span style={{ color: '#fff' }}>Seleccionados: <span style={{ color: '#00f0ff' }}>{selectedGroups.length}</span></span>
                <span style={{ color: '#fff' }}>Costo: <span style={{ color: '#ff41b4' }}>{totalCost.toFixed(4)} USDT</span></span>
              </div>

              <button onClick={handleNextStep3} style={neonStyles.btnCyan}>REVISAR COMPRA ➔</button>
            </div>
          )}

          {step === 4 && (
            <div className="fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <button onClick={() => setStep(3)} style={{ background: 'transparent', border: 'none', color: '#ff1493', fontSize: '20px', cursor: 'pointer' }}>◀</button>
                <h3 style={{ fontSize: '18px', fontWeight: '900', margin: 0, color: '#fff' }}>Confirmar Escrow</h3>
              </div>

              <div style={{...neonStyles.card, borderColor: '#00ffaa'}}>
                <div style={{ fontSize: '11px', color: '#00ffaa', fontWeight: '900', marginBottom: '10px', textTransform: 'uppercase' }}>Vista Previa</div>
                <div style={{ fontSize: '14px', marginBottom: '14px', color: '#fff', lineHeight: '1.5' }} dangerouslySetInnerHTML={{ __html: postText.replace(/\n/g, '<br/>') }} />

                {buttonConfig.url && (
                  <div style={{ padding: '12px', textAlign: 'center', borderRadius: '12px', fontSize: '14px', fontWeight: '900', background: 'linear-gradient(90deg, #00f0ff, #0088ff)', color: '#050214' }}>
                    {buttonConfig.text || 'Abrir Enlace'}
                  </div>
                )}
              </div>

              <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '16px', padding: '16px', fontSize: '14px', marginBottom: '20px', color: '#fff', border: '1px dashed #ff1493' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Saldo actual:</span> <strong style={{ color: '#00f0ff' }}>{balance.toFixed(4)} USDT</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>A retener:</span> <strong style={{ color: '#ff1493' }}>-{totalCost.toFixed(4)} USDT</strong>
                </div>
                <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '10px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900' }}>
                  <span>Saldo restante:</span> <strong style={{ color: '#ffe600' }}>{(balance - totalCost).toFixed(4)} USDT</strong>
                </div>
              </div>

              <button onClick={handlePublish} disabled={isPublishing} style={{ ...neonStyles.btnPrimary, background: 'linear-gradient(180deg, #00ffaa, #00bb77)', boxShadow: '0 6px 0 #007744', color: '#050214' }}>
                {isPublishing ? 'PROCESANDO...' : 'PAGAR CON ESCROW'}
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, color: '#00f0ff', fontSize: '18px', fontWeight: '900' }}>Mi Ecosistema</h3>
            <button onClick={() => setShowAddGroupModal(true)} style={{ background: '#ff1493', border: 'none', borderRadius: '10px', padding: '8px 12px', color: '#fff', fontWeight: '900', fontSize: '12px' }}>+ AÑADIR CANAL</button>
          </div>

          <div style={{ fontSize: '12px', color: '#00ffaa', fontWeight: '900', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Canales Monetizando</div>
          {myCommunityGroups.length === 0 ? (
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '16px', textAlign: 'center', marginBottom: '20px', border: '1px dashed #ff99dd' }}>
              <p style={{ color: '#ff99dd', fontSize: '13px', margin: 0 }}>No has añadido ningún canal al mercado para ganar USDT.</p>
            </div>
          ) : (
            <div style={{ marginBottom: '24px' }}>
              {myCommunityGroups.map(grp => (
                <div key={grp.id} style={{ ...neonStyles.cardInteractive, borderColor: '#00ffaa', background: 'rgba(0, 255, 170, 0.05)' }}>
                  <div>
                    <div style={{ color: '#fff', fontSize: '15px', fontWeight: '900' }}>{grp.name}</div>
                    <div style={{ color: '#00ffaa', fontSize: '12px', fontWeight: 'bold' }}>Tus ganancias por anuncio: {grp.price} USDT</div>
                  </div>
                  <div style={{ color: '#00ffaa', fontSize: '24px' }}>💰</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ fontSize: '12px', color: '#ff41b4', fontWeight: '900', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Historial Publicitario</div>
          {historyList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 10px', background: 'rgba(0,0,0,0.3)', borderRadius: '16px' }}>
              <p style={{ fontSize: '13px', color: '#aaa', margin: 0 }}>Aún no has comprado ni vendido anuncios.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {historyList.map(item => (
                <div key={item.id} style={{ background: '#120822', padding: '14px', borderRadius: '14px', border: '1px solid #3d1b63' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <strong style={{ fontSize: '14px', color: '#fff' }}>{item.title}</strong>
                    <span style={{ fontSize: '14px', fontWeight: '900', color: item.amount >= 0 ? '#00ffaa' : '#ff1493' }}>
                      {item.amount > 0 ? `+${item.amount}` : item.amount} USDT
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#ff99dd' }}>{item.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODALES */}
      {showButtonModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(5, 2, 20, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 100000 }}>
          <div style={{ ...neonStyles.card, width: '100%', maxWidth: '360px', borderColor: '#00f0ff' }}>
            <h3 style={{ margin: '0 0 16px 0', fontWeight: '900', color: '#00f0ff', fontSize: '18px' }}>Configurar Botón</h3>
            
            <label style={{ fontSize: '12px', color: '#ff99dd', fontWeight: '900', display: 'block', marginBottom: '6px' }}>Texto del Botón</label>
            <input style={{...neonStyles.input, marginBottom: '16px'}} value={buttonConfig.text} onChange={(e) => setButtonConfig({ ...buttonConfig, text: e.target.value })} placeholder="Ej: Únete Ahora" />
            
            <label style={{ fontSize: '12px', color: '#ff99dd', fontWeight: '900', display: 'block', marginBottom: '6px' }}>Enlace (URL)</label>
            <input style={{...neonStyles.input, marginBottom: '20px'}} value={buttonConfig.url} onChange={(e) => setButtonConfig({ ...buttonConfig, url: e.target.value })} placeholder="https://t.me/..." />
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setButtonConfig({ text: '', url: '', style: 'default' }); setShowButtonModal(false); }} style={{ flex: 1, padding: '14px', background: 'transparent', color: '#ff1493', border: '2px solid #ff1493', borderRadius: '14px', fontWeight: '900' }}>BORRAR</button>
              <button onClick={handleSaveButton} style={{ flex: 1, padding: '14px', background: '#00f0ff', color: '#050214', border: 'none', borderRadius: '14px', fontWeight: '900' }}>GUARDAR</button>
            </div>
          </div>
        </div>
      )}

      {showAddGroupModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(5, 2, 20, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 100000 }}>
          <div style={{ ...neonStyles.card, width: '100%', maxWidth: '360px', borderColor: '#ff1493' }}>
            <h3 style={{ margin: '0 0 10px 0', fontWeight: '900', color: '#ff1493', fontSize: '20px' }}>Vender Publicidad</h3>
            <p style={{ fontSize: '12px', color: '#ff99dd', marginBottom: '20px', lineHeight: '1.4' }}>El Bot debe ser Administrador de tu canal/grupo para poder publicar los anuncios automáticamente.</p>
            
            <label style={{ fontSize: '12px', color: '#fff', fontWeight: '900', display: 'block', marginBottom: '6px' }}>Enlace de tu Canal</label>
            <input style={{...neonStyles.input, borderColor: '#ff1493', marginBottom: '16px'}} value={newGroupUrl} onChange={(e) => setNewGroupUrl(e.target.value)} placeholder="Ej: @MiCanal" />
            
            <label style={{ fontSize: '12px', color: '#fff', fontWeight: '900', display: 'block', marginBottom: '6px' }}>¿Cuánto cobrarás en USDT?</label>
            <input type="number" step="0.1" min="0.5" style={{...neonStyles.input, borderColor: '#00f0ff', marginBottom: '24px'}} value={newGroupPrice} onChange={(e) => setNewGroupPrice(Number(e.target.value))} placeholder="1.0" />
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowAddGroupModal(false)} style={{ flex: 1, padding: '14px', background: 'transparent', color: '#ff99dd', border: '2px solid #ff99dd', borderRadius: '14px', fontWeight: '900' }}>CANCELAR</button>
              <button onClick={handleAddCommunityGroup} disabled={isVerifyingGroup} style={{ flex: 2, padding: '14px', background: 'linear-gradient(90deg, #ff1493, #d80073)', color: '#fff', border: 'none', borderRadius: '14px', fontWeight: '900' }}>
                {isVerifyingGroup ? 'VERIFICANDO...' : 'AÑADIR AL MERCADO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
