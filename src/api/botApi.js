import axios from 'axios';
import WebApp from '@twa-dev/sdk';

const api = axios.create({
  baseURL: '/api', 
  timeout: 25000, 
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const initData = WebApp.initData;
  if (initData) {
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
    throw new Error(typeof errorMessage === 'object' ? JSON.stringify(errorMessage) : errorMessage);
  }
};

export const botApi = {
  verifyUser: (user, startParam) => postAction('verify', { user, start_param: startParam }),
  verifyHuman: (userId, method) => postAction('verify-human', { userId, method }),

  claimBonus: (userId) => postAction('claim-bonus', { userId }),
  getReferrals: (userId) => postAction('get-referrals', { userId }),
  getHistory: (userId) => postAction('get-history', { userId }),

  verifyBotAdmin: (url) => postAction('verify-admin', { url }),
  createTask: (payload) => postAction('create-task', payload),
  getTasks: (userId) => postAction('get-tasks', { userId }),
  completeTask: (userId, taskId) => postAction('complete-task', { userId, taskId }),

  // 🔥 NUEVOS MÓDULOS DE BÓVEDA USDT Y GRAM
  generateUsdtWallet: (payload) => postAction('generate-usdt-wallet', payload),
  verifyUsdtPayment: (payload) => postAction('verify-usdt-payment', payload),

  generatePaymentWallet: (payload) => postAction('generate-payment-wallet', payload),
  verifyCryptoPayment: (payload) => postAction('verify-crypto-payment', payload),

  adminGetConfig: (adminId) => postAction('admin-get-config', { adminId }),
  adminUpdateConfig: (adminId, config) => postAction('admin-update-config', { adminId, config }),
  adminStats: (adminId) => postAction('admin-stats', { adminId }),
  adminSearchUser: (adminId, targetId) => postAction('admin-search-user', { adminId, targetId }),
  adminUpdateUser: (adminId, targetId, update) => postAction('admin-update-user', { adminId, targetId, update }),
  adminGetTasks: (adminId) => postAction('admin-get-tasks', { adminId })
};

export default botApi;
