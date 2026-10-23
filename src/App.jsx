import { useEffect, useState, useRef } from 'react';
import WebApp from '@twa-dev/sdk';
import axios from 'axios';

/**
 * IA PROFIT TON BOT - FRONTEND CORE
 * Versión: 3.0 - CON FILTROS DE SEGURIDAD
 */

function App() {
  /* --- ESTADOS --- */
  const [status, setStatus] = useState('loading');
  const [userData, setUserData] = useState(null);
  const [errorInfo, setErrorInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stats, setStats] = useState({ 
    n1: 0, n2: 0, n3: 0, 
    c1: "0.00", c2: "0.00", c3: "0.00" 
  });
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [walletAddr, setWalletAddr] = useState('');
  const [turnstileToken, setTurnstileToken] = useState(null);
  const turnstileRef = useRef(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  /* --- LÓGICA DE INICIO Y SEGURIDAD SILENCIOSA --- */
  
  const verifyUser = (user, startParam) => {
    // Captura de datos del sistema para el filtro antifraude (Como en tu script original)
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const userLang = navigator.language || navigator.userLanguage;

    axios.post('/api/verify', { 
      user, 
      start_param: startParam,
      tz: userTimezone,
      ln: userLang
    })
      .then(res => {
        if (res.data.success) {
          setUserData(res.data.user);
          setStats(res.data.stats);
          setStatus('member');
        } else {
          if(res.data.error === 'USER_BANNED') {
             setStatus('error');
             setErrorInfo('Cuenta suspendida por fraude, multicuenta o región no permitida.');
          } else {
             setStatus('guest');
          }
        }
      })
      .catch(err => {
        console.error(err);
        setStatus('error');
        setErrorInfo('Error de conexión. Reintenta en unos minutos.');
      });
  };

  useEffect(() => {
    try {
      WebApp.ready();
      WebApp.expand();
      WebApp.setHeaderColor('#000000');
      WebApp.setBackgroundColor('#000000');
      
      const user = WebApp.initDataUnsafe?.user;
      const startParam = WebApp.initDataUnsafe?.start_param;

      if (!user) {
        setStatus('error');
        setErrorInfo('Ejecuta la App desde Telegram.');
        return;
      }
      verifyUser(user, startParam);
    } catch (e) {
      setStatus('error');
      setErrorInfo('Fallo en SDK: ' + e.message);
    }
  }, []);

  /* --- FUNCIONES RESTAURADAS Y COMPLETAS --- */

  const handleStartWithdraw = () => {
    if ((userData?.balance || 0) < 0.1) {
      WebApp.showAlert('⚠️ Mínimo de retiro: 0.1 TON');
      return;
    }
    setIsWithdrawing(true);
    setTurnstileToken(null);
  };

  useEffect(() => {
    if (isWithdrawing && window.turnstile) {
      const renderCaptcha = () => {
        if (turnstileRef.current) {
          window.turnstile.render(turnstileRef.current, {
            sitekey: '0x4AAAAAACqyiOXggbsrQdnA',
            callback: (token) => setTurnstileToken(token),
            'expired-callback': () => setTurnstileToken(null),
          });
        }
      };
      setTimeout(renderCaptcha, 200);
    }
  }, [isWithdrawing]);

  const handleCheckSubscription = () => {
    const user = WebApp.initDataUnsafe?.user;
    const startParam = WebApp.initDataUnsafe?.start_param;
    setStatus('loading');
    verifyUser(user, startParam);
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await axios.get(`/api/history?userId=${userData.id}`);
      setHistory(res.data.history || []);
      setShowHistory(true);
      WebApp.HapticFeedback.impactOccurred('light');
    } catch (e) {
      WebApp.showAlert('Error al sincronizar historial.');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleShare = () => {
    const link = `https://t.me/IAProfitTonBot/app?startapp=${userData?.id}`;
    const text = `💰 ¡Gana TON con IA Profit! Referidos de 3 niveles activados. 🚀`;
    WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
    WebApp.HapticFeedback.impactOccurred('medium');
  };

  const executeWithdraw = async () => {
    if (!walletAddr || walletAddr.trim().length < 20) {
      WebApp.showAlert('⚠️ Dirección TON inválida.');
      return;
    }
    if (!turnstileToken) {
      WebApp.showAlert('⚠️ Completa el captcha.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await axios.post('/api/withdraw', { 
        userId: userData.id, 
        address: walletAddr.trim(),
        captchaToken: turnstileToken
      });

      if (res.data.success) {
        WebApp.HapticFeedback.notificationOccurred('success');
        WebApp.showAlert('✅ Retiro procesado con éxito.');
        window.location.reload();
      } else {
        WebApp.HapticFeedback.notificationOccurred('error');
        WebApp.showAlert('❌ ERROR: ' + res.data.error);
        setIsSubmitting(false);
      }
    } catch (e) {
      WebApp.showAlert('❌ Error de red.');
      setIsSubmitting(false);
    }
  };

  /* --- RENDERIZADO --- */

  if (status === 'loading') return (
    <div style={s.center}><div style={s.loader}></div><p style={{marginTop:'20px'}}>Sincronizando...</p></div>
  );

  if (status === 'error') return (
    <div style={s.center}>
      <h2 style={{color:'#ff4444'}}>BLOQUEADO</h2>
      <div style={s.errorBox}>{errorInfo}</div>
      <button style={s.btnWhite} onClick={() => window.location.reload()}>REINTENTAR</button>
    </div>
  );

  return (
    <div style={s.container}>
      {status === 'member' && (
        <button onClick={loadHistory} style={s.btnHistoryIcon} disabled={loadingHistory}>
          {loadingHistory ? '...' : '📜'}
        </button>
      )}

      {showHistory && (
        <div style={s.modalOverlay}>
          <div style={s.historyCard}>
            <div style={s.modalHeader}>
              <h3 style={{margin:0, color:'#ff4444'}}>HISTORIAL</h3>
              <button onClick={() => setShowHistory(false)} style={s.btnClose}>CERRAR</button>
            </div>
            <div style={s.historyList}>
              {history.length === 0 ? <p style={{textAlign:'center', padding:'20px'}}>Sin movimientos.</p> :
                history.map((h, i) => (
                  <div key={i} style={s.historyItem}>
                    <div style={{textAlign:'left'}}>
                      <div style={{fontSize:'12px', color:'#fff'}}>{new Date(h.created_at).toLocaleDateString()}</div>
                      <div style={{fontSize:'10px', color:'#777'}}>{new Date(h.created_at).toLocaleTimeString()}</div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{color:'#ff4444', fontWeight:'bold'}}>-{h.amount} TON</div>
                      <div style={{fontSize:'9px', color:'#28a745'}}>COMPLETADO</div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}

      {status === 'guest' ? (
        <div style={s.main}>
          <div style={s.card}>
            <div style={s.iconCircle}>🔔</div>
            <h2>Canal Requerido</h2>
            <p style={{color:'#aaa', marginBottom:'25px'}}>Únete al canal para activar el sistema.</p>
            <button style={s.btnBlue} onClick={() => WebApp.openTelegramLink('https://t.me/CryptosBitcoins')}>1. UNIRME AL CANAL</button>
            <button style={{...s.btnOutline, marginTop:'12px'}} onClick={handleCheckSubscription}>2. VERIFICAR</button>
          </div>
        </div>
      ) : (
        <div style={s.main}>
           <div style={s.cardBalance}>
              {!isWithdrawing ? (
                <>
                  <p style={{fontSize:'13px', fontWeight:'bold'}}>SALDO DISPONIBLE</p>
                  <h1 style={{fontSize:'48px', margin:'10px 0'}}>{userData?.balance?.toFixed(3) || '0.000'} <span style={{fontSize:'18px'}}>TON</span></h1>
                  <button style={s.btnWhite} onClick={handleStartWithdraw}>SOLICITAR RETIRO</button>
                  <div style={s.badge}>Pago mínimo: 0.1 TON</div>
                </>
              ) : (
                <>
                  <p style={{fontWeight:'bold', marginBottom:'15px'}}>RETIRO DE FONDOS</p>
                  <input type="text" placeholder="Dirección TON" value={walletAddr} onChange={(e) => setWalletAddr(e.target.value)} style={s.inputStyle}/>
                  
                  <div ref={turnstileRef} style={{marginTop:'15px', display:'flex', justifyContent:'center'}}></div>
                  
                  <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
                    <button style={s.btnCancel} onClick={() => setIsWithdrawing(false)}>CANCELAR</button>
                    <button 
                      style={{...s.btnConfirm, opacity: (turnstileToken && !isSubmitting) ? 1 : 0.5}} 
                      onClick={executeWithdraw}
                      disabled={!turnstileToken || isSubmitting}
                    >
                      {isSubmitting ? '...' : 'CONFIRMAR'}
                    </button>
                  </div>
                </>
              )}
           </div>

           <div style={s.card}>
              <h4 style={{marginTop:0, color:'#0088cc'}}>SISTEMA DE AFILIADOS</h4>
              <div style={s.row}>
                <div style={s.box}>NIVEL 1<br/><b style={{color:'#fff'}}>0.03 TON</b></div>
                <div style={s.box}>NIVEL 2<br/><b style={{color:'#fff'}}>0.02 TON</b></div>
                <div style={s.box}>NIVEL 3<br/><b style={{color:'#fff'}}>0.01 TON</b></div>
              </div>
              <button style={s.btnGreen} onClick={handleShare}>🚀 INVITAR AMIGOS</button>
           </div>

           <div style={{...s.card, marginTop:'20px'}}>
              <h4 style={{color:'#aaa', textAlign:'left', fontSize:'12px'}}>TU RED DE TRABAJO</h4>
              <div style={s.statsGrid}>
                <div style={s.statCol}><p style={s.statLabel}>DIRECTOS</p><p style={s.statValue}>{stats.n1}</p><p style={s.statCom}>+{stats.c1}</p></div>
                <div style={s.statCol}><p style={s.statLabel}>NIVEL 2</p><p style={s.statValue}>{stats.n2}</p><p style={s.statCom}>+{stats.c2}</p></div>
                <div style={s.statCol}><p style={s.statLabel}>NIVEL 3</p><p style={s.statValue}>{stats.n3}</p><p style={s.statCom}>+{stats.c3}</p></div>
              </div>
              <div style={s.totalRow}>
                <p style={{fontSize:'11px'}}>TOTAL GANADO:</p>
                <p style={{fontSize:'16px', fontWeight:'bold', color:'#28a745'}}>
                  {(parseFloat(stats.c1) + parseFloat(stats.c2) + parseFloat(stats.c3)).toFixed(3)} TON
                </p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

const s = {
  container: { backgroundColor:'#000', color:'#fff', minHeight:'100vh', padding:'20px', fontFamily:'Inter, sans-serif' },
  center: { height:'100vh', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center' },
  loader: { width:'40px', height:'40px', border:'3px solid #333', borderTop:'3px solid #0088cc', borderRadius:'50%' },
  main: { display:'flex', flexDirection:'column', maxWidth:'500px', margin:'0 auto' },
  cardBalance: { background:'linear-gradient(135deg, #0088cc 0%, #005588 100%)', padding:'30px 20px', borderRadius:'24px', textAlign:'center', marginBottom:'20px' },
  card: { backgroundColor:'#111', padding:'20px', borderRadius:'24px', textAlign:'center', border:'1px solid #1a1a1a' },
  badge: { fontSize:'10px', backgroundColor:'rgba(255,255,255,0.1)', padding:'4px 10px', borderRadius:'20px', marginTop:'10px', display:'inline-block' },
  iconCircle: { width:'60px', height:'60px', backgroundColor:'#1a1a1a', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto', fontSize:'24px' },
  btnBlue: { width:'100%', padding:'16px', backgroundColor:'#0088cc', border:'none', borderRadius:'14px', color:'#fff', fontWeight:'bold' },
  btnOutline: { width:'100%', padding:'16px', backgroundColor:'transparent', border:'2px solid #333', borderRadius:'14px', color:'#fff', fontWeight:'bold' },
  btnWhite: { width:'100%', padding:'14px', backgroundColor:'#fff', color:'#0088cc', border:'none', borderRadius:'14px', fontWeight:'900' },
  btnGreen: { width:'100%', padding:'16px', backgroundColor:'#28a745', border:'none', borderRadius:'14px', color:'#fff', fontWeight:'bold' },
  row: { display:'flex', justifyContent:'space-around', margin:'20px 0' },
  box: { fontSize:'10px', color:'#666', textAlign:'center' },
  statsGrid: { display:'flex', justifyContent:'space-between', marginTop:'10px' },
  statCol: { flex:1, textAlign:'center' },
  statLabel: { fontSize:'10px', color:'#555' },
  statValue: { fontSize:'18px', fontWeight:'bold', margin:'5px 0' },
  statCom: { fontSize:'12px', color:'#28a745', fontWeight:'bold' },
  totalRow: { marginTop:'20px', paddingTop:'15px', borderTop:'1px solid #1a1a1a', display:'flex', justifyContent:'space-between' },
  inputStyle: { width:'100%', padding:'15px', borderRadius:'12px', border:'none', textAlign:'center', backgroundColor:'#fff', color:'#000', fontWeight:'bold' },
  btnCancel: { flex:1, padding:'14px', backgroundColor:'rgba(0,0,0,0.3)', color:'#fff', border:'none', borderRadius:'12px' },
  btnConfirm: { flex:1, padding:'14px', backgroundColor:'#fff', color:'#0088cc', border:'none', borderRadius:'12px', fontWeight:'bold' },
  btnHistoryIcon: { position:'absolute', top:'20px', right:'20px', backgroundColor:'#111', border:'1px solid #222', borderRadius:'50%', width:'45px', height:'45px', fontSize:'20px' },
  modalOverlay: { position:'fixed', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(0,0,0,0.9)', zIndex:100, display:'flex', justifyContent:'center', alignItems:'center', padding:'20px' },
  historyCard: { backgroundColor:'#0a0a0a', border:'2px solid #ff4444', borderRadius:'20px', width:'100%', maxWidth:'380px', maxHeight:'80vh', display:'flex', flexDirection:'column' },
  modalHeader: { padding:'20px', borderBottom:'1px solid #1a1a1a', display:'flex', justifyContent:'space-between' },
  historyList: { flex:1, overflowY:'auto', padding:'10px' },
  historyItem: { display:'flex', justifyContent:'space-between', padding:'15px', borderBottom:'1px solid #1a1a1a' },
  btnClose: { background:'none', border:'1px solid #ff4444', color:'#ff4444', borderRadius:'8px', padding:'5px' },
  errorBox: { backgroundColor:'#1a0000', color:'#ff8888', padding:'15px', borderRadius:'12px', border:'1px solid #ff4444', margin:'20px' }
};

export default App;
