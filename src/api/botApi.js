import axios from 'axios';
import WebApp from '@twa-dev/sdk'; // Necesitamos WebApp para obtener initData

const api = axios.create({
  baseURL: '/api', 
  timeout: 25000, 
  headers: { 'Content-Type': 'application/json' }
});

// Interceptor para inyectar initData de forma segura en CADA petición al backend
api.interceptors.request.use((config) => {
  const initData = WebApp.initData;
  if (initData) {
    // Lo enviamos en un header personalizado
    config.headers['X-Telegram-Init-Data'] = initData;
  }
  return config;
});

const postAction = async (action, payload = {}) => {
  try {
    const res = await api.post('', { action, ...payload });
    return res.data;
  } catch (error) {
    const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message;
    console.error(`[API Error - ${action}]:`, errorMessage);
    throw new Error(errorMessage);
  }
};

export const botApi = {
  verifyUser: (user, startParam) => postAction('verify', { user, start_param: startParam }),
  verifyHuman: (userId, method) => postAction('verify-human', { userId, method }),
  checkChannels: (userId) => postAction('check-channels', { userId }),

  claimBonus: (userId) => postAction('claim-bonus', { userId }),
  getReferrals: (userId) => postAction('get-referrals', { userId }),

  getHistory: (userId) => postAction('get-history', { userId }),

  verifyBotAdmin: (url) => postAction('verify-admin', { url }),
  createTask: (payload) => postAction('create-task', payload),
  getTasks: (userId) => postAction('get-tasks', { userId }),
  completeTask: (userId, taskId) => postAction('complete-task', { userId, taskId }),

  generatePaymentWallet: (payload) => postAction('generate-payment-wallet', payload),
  verifyCryptoPayment: (payload) => postAction('verify-crypto-payment', payload),

  generateStarsInvoice: (payload) => postAction('generate-stars-invoice', payload),
  confirmStarsPayment: (payload) => postAction('confirm-stars-payment', payload)
};

export default botApi;
