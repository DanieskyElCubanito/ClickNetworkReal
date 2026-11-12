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
  // El backend extrae el ID de la firma de Telegram (initData), por lo que no es necesario pasar el userId en el payload.
  verifyUser: (user, startParam) => postAction('verify', { user, start_param: startParam }),
  verifyHuman: (method) => postAction('verify-human', { method }),

  claimBonus: () => postAction('claim-bonus'),
  getReferrals: () => postAction('get-referrals'),
  getHistory: () => postAction('get-history'),

  verifyBotAdmin: (url) => postAction('verify-admin', { url }),
  createTask: (payload) => postAction('create-task', payload),
  getTasks: () => postAction('get-tasks'),
  completeTask: (taskId, validation_code_input) => postAction('complete-task', { taskId, validation_code_input }),

  // Módulos de Bóveda USDT y GRAM
  generateUsdtWallet: (payload) => postAction('generate-usdt-wallet', payload),
  verifyUsdtPayment: (payload) => postAction('verify-usdt-payment', payload),

  generatePaymentWallet: (payload) => postAction('generate-payment-wallet', payload),
  verifyCryptoPayment: (payload) => postAction('verify-crypto-payment', payload),

  // Panel Admin (El backend valida criptográficamente si el firmante es Administrador en ADMIN_IDS)
  adminGetConfig: () => postAction('admin-get-config'),
  adminUpdateConfig: (config) => postAction('admin-update-config', { config }),
  adminStats: () => postAction('admin-stats'),
  adminSearchUser: (targetId) => postAction('admin-search-user', { targetId }),
  adminUpdateUser: (targetId, update) => postAction('admin-update-user', { targetId, update }),
  adminGetTasks: () => postAction('admin-get-all-tasks')
};

export default botApi;
