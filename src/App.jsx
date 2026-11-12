import { useEffect, useState, useRef } from 'react';
import WebApp from '@twa-dev/sdk';
import toast, { Toaster } from 'react-hot-toast';  
import { translations } from './translations'; 

import ProfileHeader from './components/ProfileHeader';
import HomeTab from './components/HomeTab';
import AdsTab from './components/AdsTab';
import ShareTab from './components/ShareTab';
import BottomNav from './components/BottomNav';
import AdminDashboard from './components/AdminDashboard';
import WalletTab from './components/WalletTab'; 
import MarketTab from './components/MarketTab';
import LeaderboardTab from './components/LeaderboardTab';
import ChannelJoin from './components/ChannelJoin'; 

const modernTheme = {
  container: { 
    backgroundColor: '#050505', 
    backgroundImage: 'radial-gradient(circle at 50% 0%, #111827 0%, #050505 80%)', 
    minHeight: '100vh', 
    height: 'var(--tg-viewport-height, 100vh)', 
    color: '#F3F4F6', 
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif", 
    display: 'flex', 
    flexDirection: 'column', 
    boxSizing: 'border-box' 
  },
  main: { 
    flex: 1, 
    maxWidth: '520px', 
    margin: '0 auto', 
    width: '100%', 
    padding: '16px 16px 110px 16px', 
    boxSizing: 'border-box', 
    overflowY: 'auto', 
    WebkitOverflowScrolling: 'touch' 
  },
  center: { 
    minHeight: '100vh', 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#050505', 
    backgroundImage: 'radial-gradient(circle at center, #111827 0%, #050505 85%)', 
    padding: '24px', 
    textAlign: 'center', 
    boxSizing: 'border-box' 
  },
  loaderGlow: { 
    width: '56px', 
    height: '56px', 
    borderRadius: '50%', 
    border: '4px solid rgba(6, 182, 212, 0.1)', 
    borderTopColor: '#06B6D4', 
    borderRightColor: '#3B82F6', 
    animation: 'spin 1s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite', 
    boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)' 
  },
  errorCard: { 
    background: 'rgba(255, 255, 255, 0.02)', 
    border: '1px solid rgba(239, 68, 68, 0.3)', 
    borderRadius: '24px', 
    padding: '28px 24px', 
    maxWidth: '340px', 
    boxShadow: '0 8px 32px rgba(239, 68, 68, 0.15)',
    backdropFilter: 'blur(10px)' 
  },
  btnRetry: { 
    marginTop: '20px', 
    width: '100%',
    padding: '14px 28px', 
    background: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)', 
    color: '#ffffff', 
    border: 'none', 
    borderRadius: '16px', 
    fontWeight: '800', 
    fontSize: '14px', 
    letterSpacing: '0.5px', 
    cursor: 'pointer', 
    boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
    textTransform: 'uppercase'
  }
};

const safeStorage = {
  get: (key) => {
    try { return localStorage.getItem(key); } 
    catch (e) { return null; }
  },
  set: (key, value) => {
    try { localStorage.setItem(key, value); } 
    catch (e) { console.warn("LocalStorage bloqueado, usando memoria temporal."); }
  }
};

function App() {
  const [status, setStatus] = useState('loading'); 
  const [activeTab, setActiveTab] = useState('home'); 
  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState({ n1: 0, c1: "0.00" });
  const [errorMessage, setErrorMessage] = useState('');

  const [lang, setLang] = useState(safeStorage.get('click_lang') || 'es');
  const initialized = useRef(false);
  const t = (key) => translations[lang][key] || key;

  // GATEKEEPER STATES (Canales Obligatorios)
  const [mustJoin, setMustJoin] = useState(false);
  const [channelStatus, setChannelStatus] = useState({
    c1: true, c2: true, c1_url: '', c2_url: ''
  });

  const safeErrorMessage = (errorPayload, fallbackMsg) => {
    if (!errorPayload) return fallbackMsg;
    if (typeof errorPayload === 'string') return errorPayload;
    if (errorPayload.message) return errorPayload.message;
    if (errorPayload.error) return errorPayload.error;
    try { return JSON.stringify(errorPayload); } catch { return fallbackMsg; }
  };

  const verifyUser = async (teleUser, startParam) => {
    try {
      let localDeviceId = safeStorage.get('xpro_device_token');
      if (!localDeviceId) {
        localDeviceId = 'dev_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
        safeStorage.set('xpro_device_token', localDeviceId);
      }

      const storedFirstUser = safeStorage.get('xpro_linked_user');
      let previousAccount = null;

      if (!storedFirstUser) { 
        safeStorage.set('xpro_linked_user', String(teleUser.id)); 
      } else if (storedFirstUser !== String(teleUser.id)) { 
        previousAccount = storedFirstUser; 
      }

      // Payload seguro (Sin userId extra inyectado, confiando en el Header)
      const userPayload = { 
        ...teleUser, 
        deviceId: localDeviceId, 
        is_clone: previousAccount !== null 
      };

      const payloadRequest = {
        action: 'verify',
        user: userPayload,
        start_param: startParam
      };

      const response = await fetch('/api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': WebApp.initData || ''
        },
        body: JSON.stringify(payloadRequest)
      });

      const data = await response.json();

      if (data && data.success && data.user) {
        setUserData(data.user);
        setStats(data.stats || { n1: 0, c1: "0.00" });

        // GATEKEEPER ROUTING
        if (data.mandatory) {
           if (!data.mandatory.all_joined) {
              setChannelStatus({
                 c1: data.mandatory.c1_joined,
                 c2: data.mandatory.c2_joined,
                 c1_url: data.mandatory.c1_url,
                 c2_url: data.mandatory.c2_url
              });
              setMustJoin(true); 
           }
        }

        setStatus('member');
      } else {
        setErrorMessage(safeErrorMessage(data, "Fallo al sincronizar con el servidor central."));
        setStatus('error');
      }
    } catch (err) {
        const errPayload = err.response?.data || err;
        setErrorMessage(safeErrorMessage(errPayload, "Error de red o base de datos."));
        setStatus('error');
    }
  };

  useEffect(() => {
    if (initialized.current) return;
    const initTimer = setTimeout(() => {
      try {
        WebApp.ready(); WebApp.expand();
        if (WebApp.disableVerticalSwipes) WebApp.disableVerticalSwipes();
        const user = WebApp.initDataUnsafe?.user;
        const initData = WebApp.initData;
        const inviterId = WebApp.initDataUnsafe?.start_param;

        if (!safeStorage.get('click_lang') && user?.language_code) {
          const detectedLang = user.language_code.startsWith('es') ? 'es' : 'en';
          setLang(detectedLang);
          safeStorage.set('click_lang', detectedLang);
        }

        if (!user || !initData) { 
            setErrorMessage(t('access_denied') || 'Acceso Denegado. Solo a través de Telegram.'); 
            setStatus('error'); 
            return; 
        }

        initialized.current = true;
        verifyUser(user, inviterId);
      } catch (e) { 
          setErrorMessage("Error de compatibilidad con la plataforma."); 
          setStatus('error'); 
      }
    }, 150);
    return () => clearTimeout(initTimer);
  }, []);

  const handleShare = () => {
    const inviteLink = `https://t.me/TeleGemAds_bot/app?startapp=${userData?.id}`;
    WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(t('share_text'))}`);
  };

  if (status === 'loading') {
    return (
      <div style={modernTheme.center}>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        <div style={modernTheme.loaderGlow}></div>
        <p style={{ marginTop: '24px', fontSize: '13px', fontWeight: '800', color: '#06B6D4', letterSpacing: '1px', textTransform: 'uppercase' }}>
          {t('loading') || 'Sincronizando Sistema'}
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={modernTheme.center}>
        <div style={modernTheme.errorCard}>
          <div style={{ fontSize: '48px', marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 4px 10px rgba(239,68,68,0.3))' }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h2 style={{ color: '#EF4444', margin: '0 0 12px 0', fontSize: '18px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('access_interrupted') || 'Conexión Fallida'}</h2>

          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '16px', border: '1px dashed rgba(239, 68, 68, 0.4)', marginBottom: '20px' }}>
             <p style={{ color: '#FCA5A5', fontSize: '12px', lineHeight: '1.6', margin: 0, wordBreak: 'break-word', fontWeight: '500' }}>
               {errorMessage}
             </p>
          </div>

          <button style={modernTheme.btnRetry} onClick={() => window.location.reload()}>REINTENTAR CONEXIÓN</button>
        </div>
      </div>
    );
  }

  // DESPLIEGUE DEL GATEKEEPER
  if (mustJoin) {
    return (
      <ChannelJoin 
        channelStatus={channelStatus} 
        setChannelStatus={setChannelStatus} 
        setMustJoin={setMustJoin} 
      />
    );
  }

  return (
    <div style={modernTheme.container}>
      <Toaster position="top-center" toastOptions={{ duration: 3000, style: { background: '#111827', color: '#F3F4F6', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 30px rgba(0,0,0,0.5)', fontWeight: '600', fontSize: '13px' } }} />
      <div style={modernTheme.main}>
        {activeTab === 'home' && <div className="fade-in"><ProfileHeader userData={userData} t={t} lang={lang} setLang={setLang} /><HomeTab userData={userData} setUserData={setUserData} setActiveTab={setActiveTab} t={t} /></div>}
        {activeTab === 'tasks' && <div className="fade-in"><AdsTab userData={userData} setUserData={setUserData} t={t} /></div>}
        {activeTab === 'market' && <div className="fade-in"><MarketTab t={t} /></div>}
        {activeTab === 'referrals' && <div className="fade-in"><ShareTab stats={stats} handleShare={handleShare} userId={userData?.id} totalReferralEarnings={userData?.referral_earnings} t={t} /></div>}
        {activeTab === 'wallet' && <div className="fade-in"><WalletTab userData={userData} setUserData={setUserData} t={t} /></div>}
        {activeTab === 'admin' && <div className="fade-in"><AdminDashboard t={t} /></div>}
        {activeTab === 'leaderboard' && <div className="fade-in"><LeaderboardTab userData={userData} t={t} /></div>}
      </div>
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} userData={userData} t={t} />
    </div>
  );
}

export default App;
