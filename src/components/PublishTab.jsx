import { useState, useRef, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import WebApp from '@twa-dev/sdk';

const neonStyles = {
  container: { color: '#ffffff', paddingBottom: '20px' },
  title: {
    fontSize: '24px', fontWeight: '900', textAlign: 'center', letterSpacing: '1.5px', textTransform: 'uppercase',
    margin: '10px 0 16px 0', background: 'linear-gradient(90deg, #ff41b4, #00f0ff, #ffe600)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: '0 0 20px rgba(255, 65, 180, 0.4)'
  },
  card: {
    background: 'linear-gradient(145deg, rgba(46, 16, 77, 0.85), rgba(20, 8, 38, 0.95))',
    border: '2px solid #ff41b4', borderRadius: '24px', padding: '18px', marginBottom: '16px',
    boxShadow: '0 8px 24px rgba(255, 65, 180, 0.25), inset 0 1px 0 rgba(255,255,255,0.2)'
  },
  cardInteractive: {
    background: 'linear-gradient(135deg, rgba(38, 14, 66, 0.9), rgba(18, 7, 36, 0.9))',
    border: '2px solid #8a2be2', borderRadius: '20px', padding: '14px 18px', marginBottom: '12px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(138, 43, 226, 0.3)', transition: 'all 0.2s ease'
  },
  btnPrimary: {
    width: '100%', padding: '15px', background: 'linear-gradient(180deg, #ff66cc 0%, #ff1493 50%, #d80073 100%)',
    color: '#ffffff', border: 'none', borderRadius: '18px', fontWeight: '900', fontSize: '16px',
    letterSpacing: '0.5px', cursor: 'pointer', boxShadow: '0 6px 0 #8b004b, 0 10px 20px rgba(255, 20, 147, 0.4)'
  },
  btnDark: {
    padding: '12px 18px', background: 'linear-gradient(180deg, #00ffff, #00aaff)', color: '#050214',
    border: 'none', borderRadius: '16px', fontWeight: '900', fontSize: '13px', cursor: 'pointer',
    boxShadow: '0 4px 0 #0077aa, 0 6px 15px rgba(0, 255, 255, 0.4)'
  },
  btnLight: {
    padding: '12px 18px', background: 'rgba(255, 255, 255, 0.08)', color: '#ff99dd',
    border: '2px solid rgba(255, 65, 180, 0.3)', borderRadius: '16px', fontWeight: '800', fontSize: '13px', cursor: 'pointer'
  },
  input: {
    width: '100%', background: 'rgba(15, 5, 28, 0.8)', border: '2px solid #8a2be2', borderRadius: '16px',
    padding: '12px 14px', fontSize: '14px', color: '#ffffff', outline: 'none', boxSizing: 'border-box'
  },
  progressBarContainer: { display: 'flex', justifyContent: 'center', gap: '8px', margin: '10px 0 20px 0' },
  progressStep: (active) => ({
    width: '45px', height: '8px',
    background: active ? 'linear-gradient(90deg, #ff1493, #00f0ff)' : 'rgba(255, 255, 255, 0.1)',
    borderRadius: '20px', boxShadow: active ? '0 0 10px #00f0ff' : 'none', transition: 'all 0.3s ease'
  }),
  historyItem: {
    backgroundColor: '#120822', padding: '12px 14px', borderRadius: '14px',
    border: '1px solid #3d1b63', marginBottom: '10px'
  }
};

const TEMPLATES = [
  { title: 'Airdrop Boom', icon: '🚀', accent: '#ff007f', text: '🚀 Nuevo Airdrop confirmado. Participa gratis completando las tareas y asegura tus tokens.' },
  { title: 'Sorteo Neón', icon: '💎', accent: '#00f0ff', text: '💎 Gran recompensa activa para la comunidad. Entra al enlace y participa ahora mismo.' },
  { title: 'Red de Tráfico', icon: '⚡', accent: '#ffe600', text: '⚡ Únete a nuestra red. Gana USDT gratis todos los días completando tareas simples.' }
];

export default function PublishTab({ userData, setUserData, setActiveTabGlobal, t }) {
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
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fileInputRef = useRef(null);
  const balance = Number(userData?.balance || 0);
  const [availableGroups, setAvailableGroups] = useState([]);

  // Cálculos matemáticos del USDT: El frontend suma precios, pero el backend lo cobra + 20%
  const totalCost = selectedGroups.reduce((acc, groupId) => {
      const grp = availableGroups.find(g => g.id === groupId);
      if (grp && String(grp.creator_id) === String(userData?.id)) return acc; 
      // El anunciante ve el precio + el fee de 20%
      return acc + (grp ? Number((grp.price * 1.20).toFixed(4)) : 0);
  }, 0);

  const apiHeaders = { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': WebApp.initData || '' };

  const fetchGroups = async () => {
    if (!userData?.id) return;
    try {
      const resComm = await fetch('/api', {
        method: 'POST', headers: apiHeaders,
        body: JSON.stringify({ action: 'get-publish-groups' })
      });
      const dataComm = await resComm.json();

      let allGroups = [];
      if (dataComm.success && dataComm.communityGroups) {
         dataComm.communityGroups.forEach(g => {
           // g es ahora de 'marketplace_canales'
           allGroups.push({ id: g.chat_id, name: g.chat_id, price: Number(g.price_24h), members: "...", rating: g.rating, creator_id: String(g.owner_id) });
         });
      }

      if (allGroups.length === 0) {
        setAvailableGroups([]);
        return;
      }

      const resStats = await fetch('/api', {
        method: 'POST', headers: apiHeaders,
        body: JSON.stringify({ action: 'get-group-stats', groupIds: allGroups.map(g => g.id) })
      });
      const dataStats = await resStats.json();

      if (dataStats.success && dataStats.stats) {
        setAvailableGroups(allGroups.map(grp => {
          const count = dataStats.stats[grp.id];
          if (count) {
            const formatted = count >= 1000 ? (count / 1000).toFixed(1).replace('.0', '') + 'K' : count;
            return { ...grp, members: `${formatted}` };
          }
          return { ...grp, members: "N/A" };
        }));
      } else {
        setAvailableGroups(allGroups);
      }
    } catch (e) {}
  };

  const fetchPublishHistory = async () => {
    if (!userData?.id) return;
    setLoadingHistory(true);
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
    } catch (e) {} finally {
      setLoadingHistory(false);
    }
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
    if (buttonConfig.text && !buttonConfig.url) return toast.error("URL required.");
    if (buttonConfig.url) {
      const urlPattern = /^(https?:\/\/|t\.me\/).+/i;
      if (!urlPattern.test(buttonConfig.url)) return toast.error("Invalid link.");
      if (!buttonConfig.text.trim()) setButtonConfig(prev => ({ ...prev, text: t('pub_open_link') }));
    }
    setShowButtonModal(false);
  };

  const handleClearButton = () => {
    setButtonConfig({ text: '', url: '', style: 'default' });
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
    const tid = toast.loading(t('pub_btn_launching'));

    try {
      // Compra uno por uno al backend usando el sistema Escrow (buy-marketplace-ad)
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
      toast.success("Pago retenido. Pendiente de aprobación del dueño.", { id: tid });
      setPostText(''); setImageUrl(''); setButtonConfig({ text: '', url: '', style: 'default' }); setSelectedGroups([]); setStep(1);
      setActiveTab('history');
    } catch (err) { toast.error(err.message || "Error", { id: tid }); } 
    finally { setIsPublishing(false); }
  };

  const handleAddCommunityGroup = async () => {
    if (!newGroupUrl.trim() || newGroupPrice <= 0) return;
    setIsVerifyingGroup(true);
    const tid = toast.loading(t('pub_modal_grp_verifying'));
    try {
      const res = await fetch('/api', {
        method: 'POST', headers: apiHeaders,
        body: JSON.stringify({ action: 'add-publish-group', url: newGroupUrl, price: newGroupPrice })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("OK!", { id: tid });
        setNewGroupUrl(''); setNewGroupPrice(1);
        setShowAddGroupModal(false);
        fetchGroups(); 
      } else {
        toast.error(data.error || "Error", { id: tid });
      }
    } catch (err) { toast.error("Error", { id: tid }); } 
    finally { setIsVerifyingGroup(false); }
  };

  const myCommunityGroups = availableGroups.filter(g => String(g.creator_id) === String(userData?.id));

  return (
    <div style={neonStyles.container}>
      <Toaster position="top-center" />
      <h2 style={neonStyles.title}>{t('pub_title')}</h2>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <button onClick={() => setActiveTab('create')} style={activeTab === 'create' ? { ...neonStyles.btnDark, flex: 1 } : { ...neonStyles.btnLight, flex: 1 }}>
          {t('pub_tab_new')}
        </button>
        <button onClick={() => setActiveTab('history')} style={activeTab === 'history' ? { ...neonStyles.btnDark, flex: 1 } : { ...neonStyles.btnLight, flex: 1 }}>
          {t('pub_tab_history')}
        </button>
      </div>

      {activeTab === 'create' && (
        <>
          <div style={{ textAlign: 'center', fontSize: '12px', fontWeight: '900', color: '#ff66cc', letterSpacing: '1px' }}>{t('pub_step')} {step} {t('pub_of')} 4</div>
          <div style={neonStyles.progressBarContainer}>
            <div style={neonStyles.progressStep(step >= 1)} />
            <div style={neonStyles.progressStep(step >= 2)} />
            <div style={neonStyles.progressStep(step >= 3)} />
            <div style={neonStyles.progressStep(step >= 4)} />
          </div>

          {step === 1 && (
            <div className="fade-in">
              <h3 style={{ fontSize: '17px', fontWeight: '900', marginBottom: '10px', color: '#ffe600' }}>{t('pub_q_promote')}</h3>
              <div style={neonStyles.card}>
                <textarea
                  style={{ ...neonStyles.input, height: '115px', resize: 'none', border: 'none', background: 'transparent', padding: 0, fontSize: '15px' }}
                  placeholder={t('pub_placeholder_html')}
                  maxLength={1000} value={postText} onChange={(e) => setPostText(e.target.value)}
                />
                <div style={{ textAlign: 'right', fontSize: '11px', color: '#ff99dd', marginTop: '6px', fontWeight: 'bold' }}>{postText.length} / 1000</div>
                <button onClick={handleNextStep1} style={{ ...neonStyles.btnPrimary, marginTop: '14px' }}>{t('pub_btn_next')}</button>
              </div>

              <div style={{ fontSize: '12px', fontWeight: '900', color: '#00f0ff', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('pub_templates')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {TEMPLATES.map((tmpl, idx) => (
                  <div key={idx} onClick={() => setPostText(tmpl.text)} style={{ ...neonStyles.card, padding: '12px 8px', cursor: 'pointer', marginBottom: 0, borderColor: tmpl.accent, textAlign: 'center' }}>
                    <div style={{ fontSize: '26px', marginBottom: '4px' }}>{tmpl.icon}</div>
                    <div style={{ fontWeight: '900', fontSize: '11px', color: '#fff' }}>{tmpl.title}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <button onClick={() => setStep(1)} style={{ ...neonStyles.btnLight, padding: '6px 12px' }}>◀</button>
                <h3 style={{ fontSize: '17px', fontWeight: '900', margin: 0, color: '#ffe600' }}>{t('pub_multimedia')}</h3>
              </div>
              <p style={{ fontSize: '12px', color: '#ff99dd', marginBottom: '14px' }}>{t('pub_multimedia_desc')}</p>

              <div onClick={() => fileInputRef.current.click()} style={neonStyles.cardInteractive}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '28px' }}>🖼️</div>
                  <div>
                    <div style={{ fontWeight: '900', color: '#ffffff', fontSize: '15px' }}>{t('pub_img_title')}</div>
                    <div style={{ fontSize: '12px', color: imageUrl ? '#00f0ff' : '#aaa' }}>{imageUrl ? t('pub_img_attached') : t('pub_img_upload')}</div>
                  </div>
                </div>
                {imageUrl && (
                  <button onClick={(e) => { e.stopPropagation(); setImageUrl(''); }} style={{ background: 'transparent', border: 'none', color: '#ff1493', fontWeight: 'bold', fontSize: '14px' }}>✕</button>
                )}
                {!imageUrl && <div style={{ color: '#00f0ff', fontWeight: '900', fontSize: '18px' }}>➔</div>}
              </div>
              <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />

              <div onClick={() => setShowButtonModal(true)} style={neonStyles.cardInteractive}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '28px' }}>🔘</div>
                  <div>
                    <div style={{ fontWeight: '900', color: '#ffffff', fontSize: '15px' }}>{t('pub_btn_title')}</div>
                    <div style={{ fontSize: '12px', color: buttonConfig.url ? '#ff41b4' : '#aaa' }}>{buttonConfig.url ? `${t('pub_btn_configured')} "${buttonConfig.text}"` : t('pub_btn_add')}</div>
                  </div>
                </div>
                <div style={{ color: '#ff41b4', fontWeight: '900', fontSize: '18px' }}>➔</div>
              </div>

              <button onClick={handleNextStep2} style={{ ...neonStyles.btnPrimary, marginTop: '16px' }}>{t('pub_btn_target')}</button>
            </div>
          )}

          {step === 3 && (
            <div className="fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <button onClick={() => setStep(2)} style={{ ...neonStyles.btnLight, padding: '6px 12px' }}>◀</button>
                <h3 style={{ fontSize: '17px', fontWeight: '900', margin: 0, color: '#ffe600' }}>{t('pub_where')}</h3>
              </div>
              <p style={{ fontSize: '12px', color: '#ff99dd', marginBottom: '14px' }}>{t('pub_where_desc')}</p>

              {availableGroups.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', marginBottom: '14px' }}>
                  <p style={{ fontSize: '13px', color: '#ccc', margin: 0 }}>{t('pub_empty_groups')}</p>
                </div>
              )}

              {availableGroups.map((grp) => {
                const isSelected = selectedGroups.includes(grp.id);
                const isMyGroup = String(grp.creator_id) === String(userData?.id);

                return (
                  <div 
                    key={grp.id} 
                    onClick={() => handleToggleGroup(grp.id)} 
                    style={{ ...neonStyles.cardInteractive, borderColor: isSelected ? '#00f0ff' : '#8a2be2', background: isSelected ? 'linear-gradient(135deg, rgba(0, 240, 255, 0.25), rgba(46, 16, 77, 0.9))' : neonStyles.cardInteractive.background }}
                  >
                    <div>
                      <div style={{ fontWeight: '900', fontSize: '15px', color: '#ffffff' }}>
                        {grp.name} 
                        {isMyGroup && <span style={{fontSize: '10px', background: '#00ffaa', color: '#000', padding: '2px 6px', borderRadius: '8px', marginLeft: '6px'}}>{t('pub_my_group')}</span>}
                      </div>
                      <div style={{ fontSize: '12px', color: isMyGroup ? '#00ffaa' : '#ff99dd', fontWeight: isMyGroup ? 'bold' : 'normal' }}>
                        {grp.members} miembros {isMyGroup ? ` • ${t('pub_publish_free')}` : ` • USDT ${(grp.price * 1.20).toFixed(4)}`}
                      </div>
                      <div style={{fontSize: '10px', color: '#ffe600', marginTop: '4px'}}>Rating: {grp.rating} ⭐</div>
                    </div>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: isSelected ? '#00f0ff' : 'transparent', border: '2px solid #00f0ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#050214', fontWeight: '900', fontSize: '14px' }}>
                      {isSelected ? '✓' : ''}
                    </div>
                  </div>
                );
              })}

              <button onClick={() => setShowAddGroupModal(true)} style={{ width: '100%', padding: '12px', background: 'transparent', color: '#00f0ff', border: '2px dashed #00f0ff', borderRadius: '16px', fontWeight: '900', fontSize: '13px', cursor: 'pointer', marginBottom: '14px' }}>
                {t('pub_btn_add_group')}
              </button>

              <div style={{ background: 'linear-gradient(90deg, #ff1493, #8a2be2)', borderRadius: '18px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', fontWeight: '900', fontSize: '14px', marginBottom: '14px', boxShadow: '0 4px 15px rgba(255, 20, 147, 0.3)', marginTop: '16px' }}>
                <span>🎯 {selectedGroups.length} {t('pub_selected')}</span>
                <span>{t('pub_cost')} {totalCost.toFixed(4)} USDT</span>
              </div>
              <button onClick={handleNextStep3} style={neonStyles.btnPrimary}>{t('pub_btn_review')}</button>
            </div>
          )}

          {step === 4 && (
            <div className="fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <button onClick={() => setStep(3)} style={{ ...neonStyles.btnLight, padding: '6px 12px' }}>◀</button>
                <h3 style={{ fontSize: '17px', fontWeight: '900', margin: 0, color: '#ffe600' }}>{t('pub_preview')}</h3>
              </div>

              <div style={neonStyles.card}>
                <div style={{ fontSize: '11px', color: '#00f0ff', fontWeight: '900', marginBottom: '8px' }}>{t('pub_post')}</div>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '14px', marginBottom: '12px', color: '#fff', lineHeight: '1.4' }} dangerouslySetInnerHTML={{ __html: postText.replace(/\n/g, '<br/>') }} />

                {imageUrl && <div style={{ fontSize: '12px', color: '#ff99dd', marginBottom: '12px' }}>{t('pub_img_tag')}</div>}

                {buttonConfig.url && (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    padding: '12px 18px', borderRadius: '12px', fontSize: '14px', fontWeight: '900',
                    background: buttonConfig.style === 'primary' ? 'linear-gradient(90deg, #00f0ff, #0088ff)' : 
                               buttonConfig.style === 'success' ? 'linear-gradient(90deg, #00ffaa, #00bb77)' : 
                               buttonConfig.style === 'danger' ? 'linear-gradient(90deg, #ff1493, #d80073)' : 
                               '#2F3A4C',
                    color: '#ffffff', textTransform: 'none', boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                  }}>
                    {buttonConfig.text || t('pub_open_link')}
                  </div>
                )}
              </div>

              <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '12px 16px', fontSize: '13px', marginBottom: '16px', color: '#fff', lineHeight: '1.7' }}>
                • {t('pub_balance_current')} <strong style={{ color: '#00f0ff' }}>{balance.toFixed(4)} USDT</strong><br />
                • {t('pub_balance_cost')} <strong style={{ color: '#ff41b4' }}>-{totalCost.toFixed(4)} USDT</strong><br />
                • {t('pub_balance_left')} <strong style={{ color: '#ffe600' }}>{(balance - totalCost).toFixed(4)} USDT</strong>
              </div>

              <button onClick={handlePublish} disabled={isPublishing} style={{ ...neonStyles.btnPrimary, background: 'linear-gradient(180deg, #00ffaa, #00bb77)', boxShadow: '0 6px 0 #007744, 0 10px 20px rgba(0, 255, 170, 0.4)' }}>
                {isPublishing ? t('pub_btn_launching') : "⚡ ENVIAR A ESCROW ⚡"}
              </button>
            </div>
          )}
        </>
      )}

      {activeTab === 'history' && (
        <div className="fade-in">
          <div style={neonStyles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h4 style={{ margin: 0, color: '#ffe600', fontSize: '16px', fontWeight: '900' }}>{t('pub_history_title')}</h4>
              <button onClick={fetchPublishHistory} style={{ background: 'transparent', border: 'none', color: '#ff99dd', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>🔄</button>
            </div>
            
            <p style={{ fontSize: '11px', color: '#ff99dd', marginBottom: '14px' }}>{t('pub_history_desc')}</p>

            {myCommunityGroups.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', color: '#00ffaa', fontWeight: '900', marginBottom: '8px', textTransform: 'uppercase' }}>Tus Canales en Mercado</div>
                {myCommunityGroups.map(grp => (
                  <div key={grp.id} style={{ ...neonStyles.cardInteractive, borderColor: '#00ffaa', background: 'rgba(0, 255, 170, 0.05)', marginBottom: '8px', padding: '10px 14px' }}>
                    <div>
                      <div style={{ color: '#fff', fontSize: '14px', fontWeight: '900' }}>{grp.name}</div>
                      <div style={{ color: '#00ffaa', fontSize: '11px', fontWeight: 'bold' }}>Cobras: {grp.price} USDT</div>
                    </div>
                    <div style={{ color: '#00ffaa', fontSize: '20px' }}>🌐</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ fontSize: '11px', color: '#ff41b4', fontWeight: '900', marginBottom: '8px', textTransform: 'uppercase' }}>Historial USDT</div>
            {loadingHistory ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#00f0ff', fontSize: '13px' }}>Cargando...</div>
            ) : historyList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>📜</div>
                <p style={{ fontSize: '12px', color: '#ff99dd', margin: '0 0 16px 0', lineHeight: '1.5' }}>Aún no hay transacciones en el mercado.</p>
                <button onClick={() => setShowAddGroupModal(true)} style={{ width: '100%', padding: '12px', background: 'transparent', color: '#00f0ff', border: '2px dashed #00f0ff', borderRadius: '16px', fontWeight: '900', fontSize: '13px', cursor: 'pointer' }}>
                  {t('pub_btn_add_group')}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                {historyList.map(item => (
                  <div key={item.id} style={neonStyles.historyItem}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '13px', color: '#fff' }}>{item.title}</strong>
                      <span style={{ fontSize: '12px', fontWeight: '900', color: item.amount >= 0 ? '#00ffaa' : '#ff1493' }}>
                        {item.amount > 0 ? `+${item.amount}` : item.amount} USDT
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#ff99dd' }}>{item.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODALES INFERIORES */}
      {showButtonModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(5, 2, 20, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 100000, backdropFilter: 'blur(5px)' }}>
          <div style={{ ...neonStyles.card, width: '100%', maxWidth: '340px', marginBottom: 0, borderColor: '#00f0ff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontWeight: '900', color: '#00f0ff', fontSize: '17px' }}>{t('pub_modal_btn_title')}</h3>
              <button onClick={() => setShowButtonModal(false)} style={{ ...neonStyles.btnLight, padding: '4px 10px', color: '#fff', borderColor: '#ff1493' }}>✕</button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', color: '#ff99dd', fontWeight: '900' }}>{t('pub_modal_btn_text')}</label>
              <input style={neonStyles.input} value={buttonConfig.text} onChange={(e) => setButtonConfig({ ...buttonConfig, text: e.target.value })} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', color: '#ff99dd', fontWeight: '900' }}>{t('pub_modal_btn_url')}</label>
              <input style={neonStyles.input} value={buttonConfig.url} onChange={(e) => setButtonConfig({ ...buttonConfig, url: e.target.value })} placeholder="https://t.me/..." />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleClearButton} style={{ ...neonStyles.btnLight, flex: 1, borderColor: '#ff1493', color: '#ff1493' }}>{t('pub_btn_clear')}</button>
              <button onClick={handleSaveButton} style={{ ...neonStyles.btnPrimary, flex: 2 }}>{t('pub_btn_save')}</button>
            </div>
          </div>
        </div>
      )}

      {showAddGroupModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(5, 2, 20, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 100000, backdropFilter: 'blur(5px)' }}>
          <div style={{ ...neonStyles.card, width: '100%', maxWidth: '340px', marginBottom: 0, borderColor: '#00ffaa' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontWeight: '900', color: '#00ffaa', fontSize: '17px' }}>{t('pub_modal_grp_title')}</h3>
              <button onClick={() => setShowAddGroupModal(false)} style={{ ...neonStyles.btnLight, padding: '4px 10px', color: '#fff', borderColor: '#ff1493' }}>✕</button>
            </div>

            <p style={{ fontSize: '12px', color: '#ff99dd', marginBottom: '14px', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
              {t('pub_modal_grp_desc')}
            </p>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', color: '#00ffaa', fontWeight: '900' }}>{t('pub_modal_grp_input')}</label>
              <input style={{...neonStyles.input, borderColor: '#00ffaa'}} value={newGroupUrl} onChange={(e) => setNewGroupUrl(e.target.value)} placeholder="@MiCanal" />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '11px', color: '#ffe600', fontWeight: '900' }}>Tu precio en USDT (Libre de comisiones)</label>
              <input type="number" step="0.1" min="1" style={{...neonStyles.input, borderColor: '#ffe600'}} value={newGroupPrice} onChange={(e) => setNewGroupPrice(Number(e.target.value))} placeholder="1.0" />
            </div>

            <button onClick={handleAddCommunityGroup} disabled={isVerifyingGroup} style={{ ...neonStyles.btnPrimary, background: 'linear-gradient(180deg, #00ffaa, #00bb77)', boxShadow: '0 6px 0 #007744' }}>
              {isVerifyingGroup ? t('pub_modal_grp_verifying') : t('pub_modal_grp_verify')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
