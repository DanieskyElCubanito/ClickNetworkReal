import React, { useState, useRef, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import WebApp from '@twa-dev/sdk';

const modernStyles = {
  container: { color: '#F3F4F6', paddingBottom: '20px' },
  title: {
    fontSize: '22px', fontWeight: '900', textAlign: 'center', letterSpacing: '1px', textTransform: 'uppercase',
    margin: '10px 0 20px 0', color: '#06B6D4'
  },
  card: {
    background: 'linear-gradient(145deg, #171923, #11131a)',
    border: '1px solid rgba(6, 182, 212, 0.2)', borderRadius: '24px', padding: '20px', marginBottom: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)', backdropFilter: 'blur(10px)'
  },
  cardInteractive: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '16px', marginBottom: '12px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)', transition: 'all 0.2s ease'
  },
  btnPrimary: {
    width: '100%', padding: '16px', background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
    color: '#ffffff', border: 'none', borderRadius: '16px', fontWeight: '900', fontSize: '14px',
    letterSpacing: '0.5px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(124, 58, 237, 0.3)',
    textTransform: 'uppercase', transition: 'transform 0.2s'
  },
  btnCyan: {
    width: '100%', padding: '16px', background: 'linear-gradient(135deg, #06B6D4, #3B82F6)',
    color: '#ffffff', border: 'none', borderRadius: '16px', fontWeight: '900', fontSize: '14px',
    letterSpacing: '0.5px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(6, 182, 212, 0.3)',
    textTransform: 'uppercase', transition: 'transform 0.2s'
  },
  input: {
    width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px',
    padding: '16px', fontSize: '14px', color: '#F3F4F6', outline: 'none', boxSizing: 'border-box',
    transition: 'border 0.3s'
  },
  progressBarContainer: { display: 'flex', justifyContent: 'center', gap: '8px', margin: '10px 0 24px 0' },
  progressStep: (active) => ({
    flex: 1, height: '4px', maxWidth: '40px',
    background: active ? 'linear-gradient(90deg, #06B6D4, #3B82F6)' : 'rgba(255, 255, 255, 0.05)',
    borderRadius: '10px', boxShadow: active ? '0 0 10px rgba(6,182,212,0.4)' : 'none', transition: 'all 0.3s ease'
  })
};

const TEMPLATES = [
  { title: 'Airdrop Boom', icon: '🚀', accent: '#EC4899', text: '🚀 Nuevo Airdrop confirmado. Participa gratis completando las tareas y asegura tus tokens.' },
  { title: 'Sorteo Élite', icon: '💎', accent: '#06B6D4', text: '💎 Gran recompensa activa para la comunidad. Entra al enlace y participa ahora mismo.' },
  { title: 'Red de Tráfico', icon: '⚡', accent: '#F59E0B', text: '⚡ Únete a nuestra red. Gana USDT gratis todos los días completando tareas simples.' }
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

  const totalCost = selectedGroups.reduce((acc, groupId) => {
      const grp = availableGroups.find(g => g.id === groupId);
      if (grp && String(grp.creator_id) === String(userData?.id)) return acc; 
      return acc + (grp ? Number((grp.price * 1.20).toFixed(4)) : 0);
  }, 0);

  const apiHeaders = { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': WebApp.initData || '' };

  const fetchGroups = async () => {
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
           members: "Activo",
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
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchGroups();
      fetchPublishHistory();
    }
  }, [activeTab]);

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
    if (balance < totalCost) return toast.error(`Saldo insuficiente. Necesitas ${totalCost.toFixed(4)} USDT.`);
    setStep(4);
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    const tid = toast.loading("Autorizando Smart-Contract (Escrow)...");

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
      toast.success("Pago retenido en Escrow. Pendiente de publicación.", { id: tid });
      setPostText(''); setImageUrl(''); setButtonConfig({ text: '', url: '', style: 'default' }); setSelectedGroups([]); setStep(1);
      setActiveTab('history');
    } catch (err) { toast.error(err.message || "Error al procesar el pago", { id: tid }); } 
    finally { setIsPublishing(false); }
  };

  const handleAddCommunityGroup = async () => {
    if (!newGroupUrl.trim() || newGroupPrice <= 0) return toast.error("Datos inválidos");
    setIsVerifyingGroup(true);
    const tid = toast.loading("Analizando métricas del canal...");
    try {
      const res = await fetch('/api', {
        method: 'POST', headers: apiHeaders,
        body: JSON.stringify({ action: 'add-publish-group', url: newGroupUrl, price: newGroupPrice })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("¡Canal validado e integrado al Mercado!", { id: tid });
        setNewGroupUrl(''); setNewGroupPrice(1);
        setShowAddGroupModal(false);
        fetchGroups(); 
      } else {
        toast.error(data.error || "Fallo en validación", { id: tid });
      }
    } catch (err) { toast.error("Fallo de red", { id: tid }); } 
    finally { setIsVerifyingGroup(false); }
  };

  const myCommunityGroups = availableGroups.filter(g => String(g.creator_id) === String(userData?.id));

  return (
    <div style={modernStyles.container}>
      <Toaster position="top-center" toastOptions={{ style: { background: '#111827', color: '#F3F4F6', border: '1px solid rgba(255,255,255,0.1)' } }} />
      <h2 style={modernStyles.title}>Marketplace</h2>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', padding: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <button onClick={() => setActiveTab('create')} style={{ flex: 1, padding: '12px', borderRadius: '12px', fontWeight: '800', fontSize: '12px', border: 'none', cursor: 'pointer', transition: 'all 0.3s ease', background: activeTab === 'create' ? '#ffffff' : 'transparent', color: activeTab === 'create' ? '#111827' : '#9CA3AF', textTransform: 'uppercase' }}>
          PUBLICAR ANUNCIO
        </button>
        <button onClick={() => setActiveTab('history')} style={{ flex: 1, padding: '12px', borderRadius: '12px', fontWeight: '800', fontSize: '12px', border: 'none', cursor: 'pointer', transition: 'all 0.3s ease', background: activeTab === 'history' ? '#ffffff' : 'transparent', color: activeTab === 'history' ? '#111827' : '#9CA3AF', textTransform: 'uppercase' }}>
          MIS CANALES
        </button>
      </div>

      {activeTab === 'create' && (
        <div className="fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '0 4px' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#06B6D4', letterSpacing: '1px' }}>PASO {step} DE 4</div>
          </div>
          <div style={modernStyles.progressBarContainer}>
            <div style={modernStyles.progressStep(step >= 1)} />
            <div style={modernStyles.progressStep(step >= 2)} />
            <div style={modernStyles.progressStep(step >= 3)} />
            <div style={modernStyles.progressStep(step >= 4)} />
          </div>

          {step === 1 && (
            <div className="fade-in">
              <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px', color: '#F9FAFB', letterSpacing: '0.5px' }}>CONFIGURACIÓN BASE</h3>
              <div style={modernStyles.card}>
                <textarea
                  style={{ ...modernStyles.input, height: '120px', resize: 'none', border: '1px dashed rgba(6,182,212,0.5)' }}
                  placeholder="Redacta el texto de tu campaña publicitaria..."
                  maxLength={1000} value={postText} onChange={(e) => setPostText(e.target.value)}
                />
                <div style={{ textAlign: 'right', fontSize: '11px', color: '#6B7280', marginTop: '10px', fontWeight: '600' }}>{postText.length} / 1000 Caracteres</div>
                <button onClick={handleNextStep1} style={{ ...modernStyles.btnCyan, marginTop: '20px' }}>CONTINUAR ➔</button>
              </div>

              <div style={{ fontSize: '11px', fontWeight: '800', color: '#9CA3AF', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '24px' }}>Plantillas Rápidas</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {TEMPLATES.map((tmpl, idx) => (
                  <div key={idx} onClick={() => setPostText(tmpl.text)} style={{ ...modernStyles.card, padding: '16px 8px', cursor: 'pointer', marginBottom: 0, borderColor: `${tmpl.accent}40`, textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ fontSize: '28px', marginBottom: '10px', filter: `drop-shadow(0 4px 6px ${tmpl.accent}40)` }}>{tmpl.icon}</div>
                    <div style={{ fontWeight: '800', fontSize: '11px', color: '#F3F4F6' }}>{tmpl.title}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <button onClick={() => setStep(1)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '6px 12px', color: '#F3F4F6', cursor: 'pointer' }}>◀</button>
                <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: '#F9FAFB', letterSpacing: '0.5px' }}>MÓDULOS (OPCIONALES)</h3>
              </div>

              <div onClick={() => fileInputRef.current.click()} style={{...modernStyles.cardInteractive, border: '1px dashed rgba(255,255,255,0.1)'}}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ fontSize: '32px' }}>🖼️</div>
                  <div>
                    <div style={{ fontWeight: '800', color: '#F9FAFB', fontSize: '14px' }}>Banner Gráfico</div>
                    <div style={{ fontSize: '11px', color: imageUrl ? '#10B981' : '#9CA3AF', marginTop: '4px' }}>{imageUrl ? 'Archivo adjuntado correctamente' : 'Máx. 3MB (JPG, PNG)'}</div>
                  </div>
                </div>
                {imageUrl && <button onClick={(e) => { e.stopPropagation(); setImageUrl(''); }} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #EF4444', borderRadius: '50%', width: '28px', height: '28px', color: '#EF4444', fontWeight: 'bold' }}>✕</button>}
              </div>
              <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />

              <div onClick={() => setShowButtonModal(true)} style={{...modernStyles.cardInteractive, border: '1px dashed rgba(6,182,212,0.4)'}}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ fontSize: '32px' }}>🔘</div>
                  <div>
                    <div style={{ fontWeight: '800', color: '#F9FAFB', fontSize: '14px' }}>Enlace de Acción</div>
                    <div style={{ fontSize: '11px', color: buttonConfig.url ? '#10B981' : '#06B6D4', marginTop: '4px' }}>{buttonConfig.url ? `Botón configurado` : 'Añadir redirección (CTA)'}</div>
                  </div>
                </div>
                <div style={{ color: '#06B6D4', fontWeight: '900', fontSize: '20px' }}>+</div>
              </div>

              <button onClick={handleNextStep2} style={{ ...modernStyles.btnCyan, marginTop: '24px' }}>CONTINUAR ➔</button>
            </div>
          )}

          {step === 3 && (
            <div className="fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <button onClick={() => setStep(2)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '6px 12px', color: '#F3F4F6', cursor: 'pointer' }}>◀</button>
                <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: '#F9FAFB', letterSpacing: '0.5px' }}>REDES DISPONIBLES</h3>
              </div>

              {loadingData ? (
                <div style={{ textAlign: 'center', color: '#06B6D4', padding: '24px', fontWeight: '800', fontSize: '12px', letterSpacing: '1px' }}>Sincronizando Nodos...</div>
              ) : availableGroups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)', marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0, lineHeight: '1.5' }}>El mercado de anuncios está vacío actualmente. Integra tu propio canal y comienza a monetizar.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '40vh', overflowY: 'auto', paddingRight: '4px' }}>
                  {availableGroups.map((grp) => {
                    const isSelected = selectedGroups.includes(grp.id);
                    const isMyGroup = String(grp.creator_id) === String(userData?.id);

                    return (
                      <div key={grp.id} onClick={() => handleToggleGroup(grp.id)} style={{ ...modernStyles.cardInteractive, borderColor: isSelected ? '#06B6D4' : 'rgba(255,255,255,0.08)', background: isSelected ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.02)', marginBottom: 0 }}>
                        <div>
                          <div style={{ fontWeight: '800', fontSize: '14px', color: '#F9FAFB', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {grp.name} {isMyGroup && <span style={{fontSize: '9px', background: '#3B82F6', color: '#fff', padding: '2px 6px', borderRadius: '6px', textTransform: 'uppercase'}}>Propio</span>}
                          </div>
                          <div style={{ fontSize: '11px', color: isMyGroup ? '#3B82F6' : '#9CA3AF', fontWeight: '600', marginTop: '6px' }}>
                            {isMyGroup ? `Publicación sin costo` : `Tarifa (24H): ${(grp.price * 1.20).toFixed(4)} USDT`}
                          </div>
                        </div>
                        <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: isSelected ? '#06B6D4' : 'transparent', border: isSelected ? 'none' : '2px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111827', fontWeight: '900', fontSize: '12px' }}>
                          {isSelected ? '✓' : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <button onClick={() => setShowAddGroupModal(true)} style={{ width: '100%', padding: '16px', background: 'rgba(255,255,255,0.02)', color: '#F3F4F6', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '16px', fontWeight: '800', fontSize: '13px', cursor: 'pointer', margin: '20px 0', transition: 'background 0.2s' }}>
                + INTEGRAR UN NUEVO CANAL AL MERCADO
              </button>

              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: '16px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: '700', textTransform: 'uppercase' }}>Nodos Seleccionados</div>
                    <div style={{ fontSize: '18px', color: '#F9FAFB', fontWeight: '900' }}>{selectedGroups.length}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: '700', textTransform: 'uppercase' }}>Costo de Orden</div>
                    <div style={{ fontSize: '18px', color: '#06B6D4', fontWeight: '900' }}>{totalCost.toFixed(4)} <span style={{fontSize: '12px', color: '#D1D5DB'}}>USDT</span></div>
                </div>
              </div>

              <button onClick={handleNextStep3} style={modernStyles.btnCyan}>REVISAR ORDEN ➔</button>
            </div>
          )}

          {step === 4 && (
            <div className="fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <button onClick={() => setStep(3)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '6px 12px', color: '#F3F4F6', cursor: 'pointer' }}>◀</button>
                <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: '#F9FAFB', letterSpacing: '0.5px' }}>CONTRATO ESCROW</h3>
              </div>

              <div style={{...modernStyles.card, borderColor: 'rgba(16,185,129,0.3)', padding: '24px'}}>
                <div style={{ fontSize: '10px', color: '#10B981', fontWeight: '800', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>Previsualización en Telegram</div>
                <div style={{ fontSize: '14px', marginBottom: '20px', color: '#E5E7EB', lineHeight: '1.6', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }} dangerouslySetInnerHTML={{ __html: postText.replace(/\n/g, '<br/>') }} />

                {buttonConfig.url && (
                  <div style={{ padding: '14px', textAlign: 'center', borderRadius: '12px', fontSize: '13px', fontWeight: '800', background: 'rgba(6,182,212,0.1)', color: '#06B6D4', border: '1px solid rgba(6,182,212,0.3)', letterSpacing: '0.5px' }}>
                    {buttonConfig.text || 'Abrir Enlace'}
                  </div>
                )}
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '20px', padding: '20px', fontSize: '14px', marginBottom: '24px', color: '#F3F4F6', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                  <span style={{ color: '#9CA3AF', fontWeight: '500' }}>Balance Disponible:</span> <strong style={{ color: '#06B6D4' }}>{balance.toFixed(4)} USDT</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: '#9CA3AF', fontWeight: '500' }}>Reserva Escrow:</span> <strong style={{ color: '#EF4444' }}>-{totalCost.toFixed(4)} USDT</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <span>Balance Final:</span> <strong style={{ color: '#10B981', fontSize: '16px' }}>{(balance - totalCost).toFixed(4)} USDT</strong>
                </div>
              </div>

              <button onClick={handlePublish} disabled={isPublishing} style={{ ...modernStyles.btnPrimary, background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)' }}>
                {isPublishing ? 'AUTORIZANDO...' : 'FIRMAR Y PAGAR (ESCROW)'}
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '0 4px' }}>
            <h3 style={{ margin: 0, color: '#06B6D4', fontSize: '18px', fontWeight: '900' }}>Mi Ecosistema</h3>
            <button onClick={() => setShowAddGroupModal(true)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', padding: '8px 14px', color: '#F3F4F6', fontWeight: '800', fontSize: '11px', cursor: 'pointer', textTransform: 'uppercase' }}>+ Añadir Canal</button>
          </div>

          <div style={{ fontSize: '11px', color: '#10B981', fontWeight: '800', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px', padding: '0 4px' }}>Canales Monetizando</div>
          {myCommunityGroups.length === 0 ? (
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '20px', textAlign: 'center', marginBottom: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <p style={{ color: '#9CA3AF', fontSize: '13px', margin: 0, fontWeight: '500' }}>No tienes redes operativas vendiendo anuncios. Añade una para ganar USDT.</p>
            </div>
          ) : (
            <div style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {myCommunityGroups.map(grp => (
                <div key={grp.id} style={{ ...modernStyles.cardInteractive, borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.05)', marginBottom: 0 }}>
                  <div>
                    <div style={{ color: '#F9FAFB', fontSize: '14px', fontWeight: '900', letterSpacing: '0.5px' }}>{grp.name}</div>
                    <div style={{ color: '#10B981', fontSize: '11px', fontWeight: '700', marginTop: '4px' }}>Retorno por anuncio: {grp.price} USDT</div>
                  </div>
                  <div style={{ color: '#10B981', fontSize: '24px', opacity: 0.8 }}>💰</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ fontSize: '11px', color: '#8B5CF6', fontWeight: '800', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px', padding: '0 4px' }}>Historial Operativo</div>
          {historyList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p style={{ fontSize: '13px', color: '#6B7280', margin: 0, fontWeight: '500' }}>Sin registros de compra/venta publicitaria.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {historyList.map(item => (
                <div key={item.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ fontSize: '13px', color: '#F9FAFB' }}>{item.title}</strong>
                    <span style={{ fontSize: '14px', fontWeight: '900', color: item.amount >= 0 ? '#10B981' : '#EF4444' }}>
                      {item.amount > 0 ? `+${item.amount}` : item.amount} USDT
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#9CA3AF', lineHeight: '1.5' }}>{item.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODALES CON ESTILO GLASSMORPHISM */}
      {showButtonModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(5, 7, 10, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 100000, backdropFilter: 'blur(8px)' }}>
          <div style={{ ...modernStyles.card, width: '100%', maxWidth: '360px', borderColor: 'rgba(6,182,212,0.3)', padding: '24px' }}>
            <h3 style={{ margin: '0 0 20px 0', fontWeight: '900', color: '#06B6D4', fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>CONFIGURAR BOTÓN CTA</h3>

            <label style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: '800', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Texto Visible</label>
            <input style={{...modernStyles.input, marginBottom: '20px'}} value={buttonConfig.text} onChange={(e) => setButtonConfig({ ...buttonConfig, text: e.target.value })} placeholder="Ej: Registrarse Ahora" />

            <label style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: '800', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Enlace de Redirección (URL)</label>
            <input style={{...modernStyles.input, marginBottom: '24px'}} value={buttonConfig.url} onChange={(e) => setButtonConfig({ ...buttonConfig, url: e.target.value })} placeholder="https://..." />

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setButtonConfig({ text: '', url: '', style: 'default' }); setShowButtonModal(false); }} style={{ flex: 1, padding: '16px', background: 'rgba(255,255,255,0.05)', color: '#F3F4F6', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', fontWeight: '800', fontSize: '13px' }}>DESCARTAR</button>
              <button onClick={handleSaveButton} style={{ flex: 1, padding: '16px', background: 'linear-gradient(135deg, #06B6D4, #3B82F6)', color: '#ffffff', border: 'none', borderRadius: '16px', fontWeight: '900', fontSize: '13px', boxShadow: '0 4px 15px rgba(6,182,212,0.3)' }}>GUARDAR</button>
            </div>
          </div>
        </div>
      )}

      {showAddGroupModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(5, 7, 10, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 100000, backdropFilter: 'blur(8px)' }}>
          <div style={{ ...modernStyles.card, width: '100%', maxWidth: '360px', borderColor: 'rgba(139, 92, 246, 0.3)', padding: '24px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontWeight: '900', color: '#8B5CF6', fontSize: '18px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>INTEGRAR RED AL MERCADO</h3>
            <p style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '24px', lineHeight: '1.5', fontWeight: '500' }}>Para monetizar, el Smart Bot oficial debe tener permisos de Administrador en el destino seleccionado.</p>

            <label style={{ fontSize: '11px', color: '#D1D5DB', fontWeight: '800', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Enlace del Destino</label>
            <input style={{...modernStyles.input, borderColor: 'rgba(255,255,255,0.1)', marginBottom: '20px'}} value={newGroupUrl} onChange={(e) => setNewGroupUrl(e.target.value)} placeholder="Ej: @MiCanal" />

            <label style={{ fontSize: '11px', color: '#D1D5DB', fontWeight: '800', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>TARIFA POR ANUNCIO (USDT)</label>
            <input type="number" step="0.1" min="0.5" style={{...modernStyles.input, borderColor: 'rgba(255,255,255,0.1)', marginBottom: '32px'}} value={newGroupPrice} onChange={(e) => setNewGroupPrice(Number(e.target.value))} placeholder="1.0" />

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowAddGroupModal(false)} style={{ flex: 1, padding: '16px', background: 'rgba(255,255,255,0.05)', color: '#F3F4F6', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', fontWeight: '800', fontSize: '13px' }}>CANCELAR</button>
              <button onClick={handleAddCommunityGroup} disabled={isVerifyingGroup} style={{ flex: 1.5, padding: '16px', background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: '#ffffff', border: 'none', borderRadius: '16px', fontWeight: '900', fontSize: '13px', boxShadow: '0 4px 15px rgba(124, 58, 237, 0.3)' }}>
                {isVerifyingGroup ? 'ANALIZANDO...' : 'REGISTRAR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
