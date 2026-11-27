import { useEffect, useState, useRef } from 'react';
import WebApp from '@twa-dev/sdk';
import toast, { Toaster } from 'react-hot-toast';
import { es } from './locales/es';
import { en } from './locales/en';

import HomeTab from './components/HomeTab';
import AdsTab from './components/AdsTab';
import ShareTab from './components/ShareTab';
import BottomNav from './components/BottomNav';
import AdminDashboard from './components/AdminDashboard';
import WalletTab from './components/WalletTab';
import MarketTab from './components/MarketTab';
import LeaderboardTab from './components/LeaderboardTab';
import ChannelJoin from './components/ChannelJoin';

const translations = { es, en };

const goldBorder = '1px solid rgba(212, 175, 122, 0.35)';
const champagneGrad = 'linear-gradient(135deg, #E2C290 0%, #B88E56 100%)';
const slateCard = 'linear-gradient(145deg, #141D26 0%, #1B2632 100%)';

const modernTheme = {
  container: {
    backgroundColor: '#0B1117',
    backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(212, 175, 122, 0.08) 0%, #0E151C 72%)',
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
    padding: '14px 16px 110px 16px',
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
    backgroundColor: '#0B1117',
    backgroundImage: 'radial-gradient(circle at 50% 25%, rgba(212, 175, 122, 0.10) 0%, #0E151C 75%)',
    padding: '24px',
    textAlign: 'center',
    boxSizing: 'border-box'
  },
  splashCard: {
    width: '100%',
    maxWidth: '250px',
    padding: '28px 20px 24px 20px',
    borderRadius: '18px',
    background: slateCard,
    border: goldBorder,
    boxShadow: '0 14px 34px rgba(11, 17, 23, 0.65), inset 0 1px 0 rgba(226, 194, 144, 0.22)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxSizing: 'border-box'
  },
  errorCard: {
    background: slateCard,
    border: goldBorder,
    borderRadius: '20px',
    padding: '26px 22px',
    maxWidth: '340px',
    width: '100%',
    boxShadow: '0 12px 32px rgba(11, 17, 23, 0.55), inset 0 1px 0 rgba(226, 194, 144, 0.16)',
    boxSizing: 'border-box'
  },
  btnRetry: {
    marginTop: '18px',
    width: '100%',
    padding: '13px 22px',
    background: champagneGrad,
    color: '#0E151C',
    border: '1px solid rgba(226, 194, 144, 0.65)',
    borderRadius: '12px',
    fontWeight: '800',
    fontSize: '13px',
    letterSpacing: '0.5px',
    cursor: 'pointer',
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

  const t = (key, vars) => {
    let text = translations[lang]?.[key] ?? translations.es?.[key] ?? key;
    if (vars) Object.entries(vars).forEach(([name, value]) => { text = text.split(`{${name}}`).join(String(value)); });
    return text;
  };

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

        if (data.mandatory && !data.mandatory.all_joined) {
          setChannelStatus({
            c1: data.mandatory.c1_joined,
            c2: data.mandatory.c2_joined,
            c1_url: data.mandatory.c1_url,
            c2_url: data.mandatory.c2_url
          });
          setMustJoin(true);
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
        WebApp.ready();
        WebApp.expand();
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
        <style>{`
          @keyframes splashSweep {
            0% { transform: translateX(-65%); }
            50% { transform: translateX(35%); }
            100% { transform: translateX(-65%); }
          }
        `}</style>
        <div style={modernTheme.splashCard}>
          <svg
            width="52"
            height="46"
            viewBox="0 0 64 56"
            fill="none"
            style={{ marginBottom: '14px' }}
          >
            <polygon
              points="16,4 48,4 60,20 32,52 4,20"
              fill="rgba(212, 175, 122, 0.12)"
              stroke="#E2C290"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <line x1="4" y1="20" x2="60" y2="20" stroke="#D4AF7A" strokeWidth="1.8" />
            <polyline points="16,4 22,20 32,52 42,20 48,4" stroke="#E2C290" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>

          <div
            style={{
              fontSize: '21px',
              fontWeight: '600',
              letterSpacing: '2px',
              color: '#F3F4F6',
              textTransform: 'uppercase',
              lineHeight: 1.15
            }}
          >
            TELEGEM
          </div>

          <div
            style={{
              fontSize: '9px',
              fontWeight: '600',
              letterSpacing: '1.1px',
              color: '#94A3B8',
              textTransform: 'uppercase',
              marginTop: '5px',
              marginBottom: '22px'
            }}
          >
            {t('splash_subtitle') || 'RED DE TAREAS Y CAMPAÑAS'}
          </div>

          <div
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '999px',
              background: '#0E151C',
              border: goldBorder,
              overflow: 'hidden',
              position: 'relative',
              marginBottom: '10px'
            }}
          >
            <div
              style={{
                width: '72%',
                height: '100%',
                borderRadius: '999px',
                background: champagneGrad,
                animation: 'splashSweep 1.8s ease-in-out infinite'
              }}
            />
          </div>

          <div style={{ fontSize: '11px', fontWeight: '500', color: '#94A3B8' }}>
            {t('loading') || 'Cargando...'}
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={modernTheme.center}>
        <div style={modernTheme.errorCard}>
          <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#E2C290" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h2 style={{ color: '#F3F4F6', margin: '0 0 10px 0', fontSize: '17px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {t('access_interrupted') || 'Conexión Fallida'}
          </h2>

          <div style={{ background: '#0E151C', padding: '14px', borderRadius: '12px', border: goldBorder, marginBottom: '16px' }}>
            <p style={{ color: '#94A3B8', fontSize: '12px', lineHeight: '1.55', margin: 0, wordBreak: 'break-word', fontWeight: '500' }}>
              {errorMessage}
            </p>
          </div>

          <button type="button" style={modernTheme.btnRetry} onClick={() => window.location.reload()}>
            REINTENTAR CONEXIÓN
          </button>
        </div>
      </div>
    );
  }

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
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#141D26',
            color: '#F3F4F6',
            border: goldBorder,
            fontWeight: '600',
            fontSize: '13px'
          }
        }}
      />
      <div style={modernTheme.main}>
        {activeTab === 'home' && (
          <div className="fade-in">
            <HomeTab
              userData={userData}
              setUserData={setUserData}
              setActiveTab={setActiveTab}
              t={t}
              lang={lang}
              setLang={setLang}
            />
          </div>
        )}
        {activeTab === 'tasks' && (
          <div className="fade-in">
            <AdsTab
              userData={userData}
              setUserData={setUserData}
              t={t}
              lang={lang}
              setLang={setLang}
            />
          </div>
        )}
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
