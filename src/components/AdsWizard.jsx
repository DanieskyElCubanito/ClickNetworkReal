import React from 'react';
import toast from 'react-hot-toast';
import WebApp from '@twa-dev/sdk';
import { TaskIcons } from './AdsStyles.jsx';

const goldLine = '1px solid rgba(212, 175, 122, 0.35)';
const champagneGrad = 'linear-gradient(135deg, #E2C290 0%, #B88E56 100%)';
const slateCard = {
  background: 'linear-gradient(145deg, #141D26 0%, #1B2632 100%)',
  border: goldLine,
  borderRadius: '18px',
  padding: '18px',
  marginBottom: '14px',
  boxShadow: '0 8px 24px rgba(11, 17, 23, 0.45), inset 0 1px 0 rgba(226, 194, 144, 0.16)'
};
const slateInput = {
  width: '100%',
  background: 'rgba(11, 17, 23, 0.85)',
  border: goldLine,
  borderRadius: '12px',
  padding: '12px 14px',
  fontSize: '14px',
  color: '#F3F4F6',
  outline: 'none',
  boxSizing: 'border-box'
};
const champagneBtn = {
  width: '100%',
  padding: '13px 16px',
  background: champagneGrad,
  color: '#0E151C',
  border: '1px solid rgba(226, 194, 144, 0.65)',
  borderRadius: '12px',
  fontWeight: '800',
  fontSize: '13px',
  cursor: 'pointer',
  letterSpacing: '0.4px',
  textTransform: 'uppercase'
};
const ghostSlateBtn = {
  padding: '12px 14px',
  background: 'rgba(20, 29, 38, 0.8)',
  color: '#94A3B8',
  border: goldLine,
  borderRadius: '12px',
  fontWeight: '700',
  fontSize: '12px',
  cursor: 'pointer',
  textTransform: 'uppercase'
};
const stepLabel = {
  fontSize: '11px',
  fontWeight: '700',
  textTransform: 'uppercase',
  color: '#94A3B8',
  marginBottom: '8px',
  display: 'block',
  letterSpacing: '0.6px'
};
const counterBtn = {
  width: '42px',
  height: '42px',
  background: 'rgba(14, 21, 28, 0.85)',
  color: '#E2C290',
  border: goldLine,
  borderRadius: '12px',
  fontWeight: '800',
  fontSize: '20px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0
};
const counterInput = {
  flex: 1,
  background: 'rgba(11, 17, 23, 0.85)',
  border: goldLine,
  borderRadius: '12px',
  padding: '10px',
  fontSize: '17px',
  fontWeight: '800',
  color: '#F3F4F6',
  outline: 'none',
  textAlign: 'center',
  minWidth: 0
};

export default function AdsWizard({ props }) {
  const {
    currentStepIndex,
    totalSteps,
    stepsFlow,
    currentStepId,
    taskType,
    setTaskType,
    targetUrl,
    setTargetUrl,
    botToken,
    setBotToken,
    validationCode,
    setValidationCode,
    completions,
    setCompletions,
    rewardPerGema,
    setRewardPerGema,
    isVerifying,
    handleVerifyUrl,
    depositBalanceUsdt,
    baseCostCredits,
    referralFeeCredits,
    adminFeeCredits,
    totalCreditsCost,
    totalUsdtCost,
    handleCreateTaskWithVault,
    isGenerating,
    setRechargeAmount,
    setRecharging,
    nextStep,
    prevStep,
    closeWizard,
    TASK_TYPES,
    t,
    recharging,
    rechargeMethod,
    setRechargeMethod,
    rechargeAmount,
    checkoutView,
    tempWallet,
    liveGramUsd,
    handleStartRecharge,
    handleVerifyPayment,
    cancelCheckout
  } = props;

  const copyWallet = (wallet) => {
    navigator.clipboard.writeText(wallet);
    toast.success('Dirección copiada al portapapeles.');
  };

  const openTonkeeper = () => {
    try {
      WebApp.openLink(`ton://transfer/${tempWallet}?amount=${Math.floor((rechargeAmount / liveGramUsd) * 1e9)}`);
    } catch {
      toast.error('Aplicación Tonkeeper no detectada.');
    }
  };

  const safeSetReward = (val) => {
    const num = Number(val);
    if (!Number.isFinite(num)) return;
    setRewardPerGema(Math.min(50, Math.max(1, Number(num.toFixed(1)))));
  };

  if (recharging) {
    return (
      <div className="fade-in" style={{ color: '#F3F4F6' }}>
        {checkoutView ? (
          <div style={slateCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#F3F4F6' }}>Pasarela Segura</h3>
              <button type="button" onClick={cancelCheckout} style={{ ...ghostSlateBtn, padding: '6px 10px' }}>✕</button>
            </div>

            {rechargeMethod === 'gram' ? (
              <>
                <div style={{ textAlign: 'center', marginBottom: '18px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' }}>Transfiera monto exacto</div>
                  <div style={{ fontSize: '32px', fontWeight: '900', color: '#E2C290', margin: '8px 0' }}>
                    {(rechargeAmount / liveGramUsd).toFixed(2)} GRAM
                  </div>
                  <div style={{ fontSize: '12px', color: '#94A3B8' }}>A la dirección asignada:</div>
                </div>
                <div style={{ background: 'rgba(11, 17, 23, 0.85)', padding: '14px', borderRadius: '12px', border: goldLine, wordBreak: 'break-all', textAlign: 'center', fontFamily: 'monospace', fontSize: '12px', marginBottom: '16px', color: '#F3F4F6' }}>
                  {tempWallet}
                </div>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                  <button type="button" onClick={() => copyWallet(tempWallet)} style={{ ...ghostSlateBtn, flex: 1, color: '#F3F4F6' }}>COPIAR</button>
                  <button type="button" onClick={openTonkeeper} style={{ ...champagneBtn, flex: 1 }}>TONKEEPER</button>
                </div>
                <button type="button" onClick={handleVerifyPayment} disabled={isGenerating} style={champagneBtn}>
                  {isGenerating ? 'VERIFICANDO...' : 'CONFIRMAR PAGO'}
                </button>
              </>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: '18px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' }}>Transfiera (BSC/BEP20)</div>
                  <div style={{ fontSize: '32px', fontWeight: '900', color: '#E2C290', margin: '8px 0' }}>
                    ${rechargeAmount.toFixed(2)} USDT
                  </div>
                  <div style={{ fontSize: '12px', color: '#94A3B8' }}>Contrato generado:</div>
                </div>
                <div style={{ background: 'rgba(11, 17, 23, 0.85)', padding: '14px', borderRadius: '12px', border: goldLine, wordBreak: 'break-all', textAlign: 'center', fontFamily: 'monospace', fontSize: '12px', marginBottom: '14px', color: '#F3F4F6' }}>
                  {tempWallet}
                </div>
                <button type="button" onClick={() => copyWallet(tempWallet)} style={{ ...ghostSlateBtn, width: '100%', color: '#F3F4F6', marginBottom: '12px' }}>
                  COPIAR DIRECCIÓN
                </button>
                <button type="button" onClick={handleVerifyPayment} disabled={isGenerating} style={champagneBtn}>
                  {isGenerating ? 'VERIFICANDO...' : 'VALIDAR PAGO'}
                </button>
              </>
            )}
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <button type="button" onClick={() => setRecharging(false)} style={{ ...ghostSlateBtn, padding: '7px 12px' }}>◀ VOLVER</button>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#D4AF7A', letterSpacing: '1px' }}>DEPÓSITO</div>
            </div>

            <div style={slateCard}>
              <h2 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: '800', color: '#F3F4F6', textAlign: 'center' }}>Bóveda Publicitaria</h2>
              <div style={{ textAlign: 'center', marginBottom: '18px', color: '#94A3B8', fontSize: '12px' }}>
                Fondos disponibles: <b style={{ color: '#E2C290' }}>{(depositBalanceUsdt * 1000).toFixed(2)} CRÉDITOS</b>
              </div>

              <span style={stepLabel}>Volumen a fondear (USDT)</span>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
                <button type="button" onClick={() => setRechargeAmount(p => Math.max(5, p - 5))} style={counterBtn}>-</button>
                <input type="number" value={rechargeAmount} onChange={(e) => setRechargeAmount(Number(e.target.value) || 0)} style={counterInput} />
                <button type="button" onClick={() => setRechargeAmount(p => p + 5)} style={counterBtn}>+</button>
              </div>

              <span style={stepLabel}>Protocolo de transferencia</span>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
                <button
                  type="button"
                  onClick={() => setRechargeMethod('gram')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '12px',
                    border: goldLine,
                    background: rechargeMethod === 'gram' ? champagneGrad : 'rgba(11, 17, 23, 0.7)',
                    color: rechargeMethod === 'gram' ? '#0E151C' : '#94A3B8',
                    fontWeight: '800',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  GRAM (TON)
                </button>
                <button
                  type="button"
                  onClick={() => setRechargeMethod('usdt')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '12px',
                    border: goldLine,
                    background: rechargeMethod === 'usdt' ? champagneGrad : 'rgba(11, 17, 23, 0.7)',
                    color: rechargeMethod === 'usdt' ? '#0E151C' : '#94A3B8',
                    fontWeight: '800',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  USDT (BEP20)
                </button>
              </div>

              <div style={{ background: 'rgba(11, 17, 23, 0.75)', border: goldLine, borderRadius: '14px', padding: '14px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#94A3B8' }}>TOTAL ORDEN:</span>
                <span style={{ fontWeight: '900', fontSize: '18px', color: '#E2C290' }}>
                  {rechargeMethod === 'gram' ? `${(rechargeAmount / liveGramUsd).toFixed(2)} GRAM` : `$${rechargeAmount.toFixed(2)} USDT`}
                </span>
              </div>

              <button type="button" onClick={handleStartRecharge} disabled={isGenerating} style={champagneBtn}>
                {isGenerating ? 'INICIALIZANDO...' : 'PROCESAR DEPÓSITO'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ color: '#F3F4F6' }}>
      {/* Cabecera de pasos */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        {currentStepIndex > 0 ? (
          <button type="button" onClick={prevStep} style={{ ...ghostSlateBtn, padding: '6px 12px' }}>◀</button>
        ) : (
          <div style={{ width: '36px' }} />
        )}
        <div style={{ fontSize: '11px', fontWeight: '800', color: '#D4AF7A', letterSpacing: '1.2px' }}>
          PASO {currentStepIndex + 1} DE {totalSteps}
        </div>
        <button type="button" onClick={closeWizard} style={{ ...ghostSlateBtn, padding: '6px 12px' }}>✕</button>
      </div>

      {/* Indicador de progreso */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '18px' }}>
        {stepsFlow.map((step, idx) => (
          <div
            key={step || idx}
            style={{
              flex: 1,
              height: '4px',
              borderRadius: '999px',
              background: idx <= currentStepIndex ? champagneGrad : 'rgba(212, 175, 122, 0.14)'
            }}
          />
        ))}
      </div>

      {/* Paso 1: Objetivo */}
      {currentStepId === 'type' && (
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#F3F4F6', margin: '0 0 12px 0' }}>
            SELECCIONE EL OBJETIVO
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {TASK_TYPES.map((type) => {
              const selected = taskType === type.id;
              const iconFn = TaskIcons[type.id];
              return (
                <div
                  key={type.id}
                  onClick={() => { setTaskType(type.id); nextStep(); }}
                  style={{
                    ...slateCard,
                    marginBottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    cursor: 'pointer',
                    border: selected ? '1px solid rgba(226, 194, 144, 0.75)' : goldLine
                  }}
                >
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(11, 17, 23, 0.8)', border: goldLine, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {iconFn ? iconFn('#D4AF7A') : type.icon}
                  </div>
                  <div>
                    <div style={{ color: '#F3F4F6', fontSize: '14px', fontWeight: '800' }}>{type.title}</div>
                    <div style={{ color: '#94A3B8', fontSize: '12px', marginTop: '3px' }}>{type.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Paso 2: Enlace */}
      {currentStepId === 'url' && (
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#F3F4F6', margin: '0 0 12px 0' }}>
            ENLACE DE DESTINO
          </h3>
          <div style={slateCard}>
            <p style={{ color: '#94A3B8', fontSize: '13px', margin: '0 0 14px 0', lineHeight: '1.5' }}>
              {taskType === 'bot' && (t?.('ads_url_desc_bot') || 'URL del Bot (Ej: @MiBot)')}
              {taskType === 'channel' && (t?.('ads_url_desc_channel') || 'URL del Canal (Ej: @MiCanal)')}
              {taskType === 'promo' && 'Dirige tráfico a tu sitio web, video o app.'}
            </p>
            <input style={slateInput} placeholder="https://..." value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} />

            {taskType === 'promo' && (
              <div style={{ marginTop: '16px', borderTop: goldLine, paddingTop: '14px' }}>
                <label style={stepLabel}>Código de Validación (Opcional)</label>
                <input style={slateInput} placeholder="Ej: VERIFICADO2026" value={validationCode} onChange={(e) => setValidationCode(e.target.value)} />
                <p style={{ fontSize: '11px', color: '#94A3B8', margin: '8px 0 0 0', lineHeight: '1.4' }}>
                  Solicita a los usuarios un código en tu destino para validar la tarea.
                </p>
              </div>
            )}
          </div>
          <button type="button" onClick={handleVerifyUrl} disabled={isVerifying} style={champagneBtn}>
            {isVerifying ? 'VERIFICANDO...' : 'CONTINUAR'}
          </button>
        </div>
      )}

      {/* Paso 3: Token de Bot */}
      {currentStepId === 'token' && (
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#F3F4F6', margin: '0 0 12px 0' }}>
            AUTENTICACIÓN DEL BOT
          </h3>
          <div style={slateCard}>
            <p style={{ color: '#94A3B8', fontSize: '12px', margin: '0 0 12px 0', lineHeight: '1.5' }}>
              Opcional: agrega el token de @BotFather si deseas verificación adicional del bot.
            </p>
            <input style={slateInput} placeholder="Token de @BotFather" value={botToken} onChange={(e) => setBotToken(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={nextStep} style={{ ...ghostSlateBtn, flex: 1 }}>OMITIR</button>
            <button type="button" onClick={nextStep} style={{ ...champagneBtn, flex: 1 }}>CONTINUAR</button>
          </div>
        </div>
      )}

      {/* Paso 4: Presupuesto */}
      {currentStepId === 'budget' && (
        <div style={slateCard}>
          <h2 style={{ margin: '0 0 14px 0', fontSize: '16px', fontWeight: '800', color: '#F3F4F6' }}>
            PRESUPUESTO DE CAMPAÑA
          </h2>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
            {[100, 500, 1000, 5000].map((preset) => {
              const active = completions === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCompletions(preset)}
                  style={{
                    flex: 1,
                    padding: '9px 4px',
                    borderRadius: '10px',
                    border: goldLine,
                    background: active ? champagneGrad : 'rgba(11, 17, 23, 0.7)',
                    color: active ? '#0E151C' : '#94A3B8',
                    fontWeight: '800',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  {preset >= 1000 ? `${preset / 1000}K` : preset}
                </button>
              );
            })}
          </div>

          <span style={stepLabel}>Volumen de tráfico (cupos)</span>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
            <button type="button" onClick={() => setCompletions(p => Math.max(10, Number(p) - 10))} style={counterBtn}>-</button>
            <input
              type="number"
              value={completions}
              onChange={(e) => setCompletions(e.target.value === '' ? '' : Number(e.target.value))}
              onBlur={(e) => setCompletions(Math.max(10, Number(e.target.value) || 10))}
              style={counterInput}
            />
            <button type="button" onClick={() => setCompletions(p => Number(p) + 10)} style={counterBtn}>+</button>
          </div>

          <span style={stepLabel}>Pago por usuario ($TGM)</span>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
            <button type="button" onClick={() => safeSetReward(Number(rewardPerGema) - 1)} style={counterBtn}>-</button>
            <input
              type="number"
              step="1"
              min="1"
              max="50"
              value={rewardPerGema}
              onChange={(e) => setRewardPerGema(e.target.value === '' ? '' : Number(e.target.value))}
              onBlur={(e) => safeSetReward(e.target.value)}
              style={counterInput}
            />
            <button type="button" onClick={() => safeSetReward(Number(rewardPerGema) + 1)} style={counterBtn}>+</button>
          </div>

          <div style={{ background: 'rgba(11, 17, 23, 0.78)', border: goldLine, borderRadius: '14px', padding: '14px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontWeight: '800', fontSize: '12px', color: '#F3F4F6', borderBottom: '1px solid rgba(212, 175, 122, 0.18)', paddingBottom: '6px' }}>
              DESGLOSE DE CAMPAÑA
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: '#94A3B8' }}>Fondo de Recompensas:</span>
              <span style={{ color: '#F3F4F6', fontWeight: '700' }}>{baseCostCredits} Créditos</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: '#94A3B8' }}>Distribución Matriz (20%):</span>
              <span style={{ color: '#F3F4F6', fontWeight: '700' }}>{referralFeeCredits} Créditos</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: '#94A3B8' }}>Fee Operativo (10%):</span>
              <span style={{ color: '#F3F4F6', fontWeight: '700' }}>{adminFeeCredits} Créditos</span>
            </div>
            <div style={{ marginTop: '6px', paddingTop: '10px', borderTop: '1px dashed rgba(212, 175, 122, 0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '800', fontSize: '11px', color: '#D4AF7A', textTransform: 'uppercase' }}>Inversión Requerida</span>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: '900', fontSize: '18px', color: '#E2C290' }}>
                  {totalCreditsCost} <span style={{ fontSize: '11px', color: '#94A3B8' }}>Créditos</span>
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '600' }}>~ ${totalUsdtCost.toFixed(3)} USDT</div>
              </div>
            </div>
          </div>

          {depositBalanceUsdt >= totalUsdtCost ? (
            <button type="button" onClick={handleCreateTaskWithVault} disabled={isGenerating} style={champagneBtn}>
              {isGenerating ? 'PROCESANDO...' : 'ACTIVAR CAMPAÑA'}
            </button>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: '12px', fontSize: '12px', color: '#E2C290', fontWeight: '700' }}>
                Fondos insuficientes en bóveda
              </div>
              <button type="button" onClick={() => { setRechargeAmount(Math.ceil(totalUsdtCost)); setRecharging(true); }} style={champagneBtn}>
                RECARGAR CRÉDITOS
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
