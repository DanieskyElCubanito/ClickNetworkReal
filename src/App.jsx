import { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';
import axios from 'axios';

/* */
function App() {
  const [status, setStatus] = useState('loading');
  const [userData, setUserData] = useState(null);
  const [errorInfo, setErrorInfo] = useState('');

  /* */
  useEffect(() => {
    try {
      WebApp.ready();
      WebApp.expand();
      
      const user = WebApp.initDataUnsafe?.user;
      const startParam = WebApp.initDataUnsafe?.start_param;

      if (!user) {
        setStatus('error');
        setErrorInfo('No se detectó usuario de Telegram.');
        return;
      }

      axios.post('/api/verify', { user, start_param: startParam })
        .then(res => {
          if (res.data.success) {
            setUserData(res.data.user);
            setStatus('member');
          } else {
            setStatus('guest');
          }
        })
        .catch(err => {
          setStatus('error');
          setErrorInfo(err.response?.data?.error || err.message);
        });
    } catch (e) {
      setStatus('error');
      setErrorInfo('Fallo crítico: ' + e.message);
    }
  }, []);

  /* */
  const handleShare = () => {
    const link = `https://t.me/IAProfitTonBot/app?startapp=${userData?.id}`;
    const text = `¡Gana TON en 3 niveles con IA Profit! 🚀`;
    WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
  };

  /* */
  const handleWithdraw = async () => {
    if (!userData || userData.balance < 0.1) {
      WebApp.showAlert('Necesitas al menos 0.1 TON');
      return;
    }
    
    WebApp.showPrompt('Pega tu dirección de Wallet TON:', async (addr) => {
      if (!addr) return;
      try {
        const res = await axios.post('/api/withdraw', { userId: userData.id, address: addr });
        if (res.data.success) {
          WebApp.showAlert('✅ Retiro enviado con éxito');
          window.location.reload();
        } else {
          WebApp.showAlert('❌ Error: ' + res.data.error);
        }
      } catch (e) {
        WebApp.showAlert('Error en la red de retiro');
      }
    });
  };

  /* */
  if (status === 'loading') return <div style={s.center}>🛰️ Conectando con IA Profit...</div>;
  
  if (status === 'error') return (
    <div style={s.center}>
      <h2 style={{color: '#ff4444'}}>⚠️ Error</h2>
      <p>{errorInfo}</p>
      <button onClick={() => window.location.reload()}>Reintentar</button>
    </div>
  );

  return (
    <div style={s.container}>
      {status === 'guest' ? (
        <div style={s.card}>
          <h2>📢 ¡Únete al Canal!</h2>
          <p>Debes estar en @CryptosBitcoins para participar.</p>
          <button style={s.btnBlue} onClick={() => WebApp.openTelegramLink('https://t.me/CryptosBitcoins')}>Unirme</button>
        </div>
      ) : (
        <div style={s.main}>
           <div style={s.cardBalance}>
              <p>Balance Disponible</p>
              <h1 style={{fontSize: '40px'}}>{userData?.balance || '0.00'} <span style={{fontSize: '18px'}}>TON</span></h1>
              <button style={s.btnWhite} onClick={handleWithdraw}>RETIRAR 0.1 TON</button>
           </div>

           <div style={s.card}>
              <h4>Sistema de Referidos</h4>
              <div style={s.row}>
                <div style={s.box}>Lvl 1<br/><b>0.003</b></div>
                <div style={s.box}>Lvl 2<br/><b>0.002</b></div>
                <div style={s.box}>Lvl 3<br/><b>0.001</b></div>
              </div>
              <button style={s.btnGreen} onClick={handleShare}>🚀 Invitar Amigos</button>
           </div>
        </div>
      )}
    </div>
  );
}

/* */
const s = {
  container: { backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' },
  center: { backgroundColor: '#000', color: '#fff', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' },
  cardBalance: { backgroundColor: '#0088cc', padding: '30px', borderRadius: '20px', textAlign: 'center', marginBottom: '20px' },
  card: { backgroundColor: '#1c1c1c', padding: '20px', borderRadius: '20px', textAlign: 'center' },
  btnBlue: { width: '100%', padding: '15px', backgroundColor: '#0088cc', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 'bold' },
  btnWhite: { width: '100%', padding: '12px', backgroundColor: '#fff', color: '#0088cc', border: 'none', borderRadius: '12px', fontWeight: 'bold' },
  btnGreen: { width: '100%', padding: '15px', backgroundColor: '#28a745', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 'bold' },
  row: { display: 'flex', justifyContent: 'space-around', margin: '20px 0' },
  box: { fontSize: '12px', color: '#aaa' }
};

export default App;
