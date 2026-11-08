      {/* CONFIGURACIÓN DE SISTEMA */}
      <div style={{ ...neon.card, borderColor: '#ff41b4' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#ff99dd', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {Icons.wallet} Configuración del Sistema
        </h3>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
           <div style={{ flex: 1 }}>
              <span style={neon.label}>MÍNIMO DE RETIRO (GEMAS)</span>
              <input 
                 type="number" 
                 placeholder="Ej: 50" 
                 style={{ ...neon.input, borderColor: '#ff41b4', textAlign: 'center' }} 
                 value={minWithdrawalGemas} 
                 onChange={(e) => setMinWithdrawalGemas(e.target.value)} 
              />
           </div>
        </div>

        {/* CONTROLES DE REFERIDOS */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
           <div style={{ flex: 1 }}>
              <span style={neon.label}>% COMISIÓN REFERIDOS</span>
              <div style={{ position: 'relative' }}>
                <input 
                   type="number" 
                   style={{ ...neon.input, borderColor: '#ff41b4', textAlign: 'center', marginBottom: 0 }} 
                   value={refPercent} 
                   onChange={(e) => setRefPercent(e.target.value)} 
                />
                <span style={{ position: 'absolute', right: '15px', top: '12px', color: '#ff99dd', fontWeight: 'bold' }}>%</span>
              </div>
           </div>
           <div style={{ flex: 1 }}>
              <span style={neon.label}>BONO ÚNICO (GEMAS)</span>
              <input 
                 type="number" 
                 style={{ ...neon.input, borderColor: '#ff41b4', textAlign: 'center', marginBottom: 0 }} 
                 value={refBonusGemas} 
                 onChange={(e) => setRefBonusGemas(e.target.value)} 
              />
           </div>
        </div>
        
        <div style={{ fontSize: '10px', color: '#aaa', marginBottom: '20px', textAlign: 'center' }}>
          * El bono único se paga automáticamente cuando el recluta alcanza sus primeras 5 Gemas.
        </div>

        {/* CANALES OBLIGATORIOS AL INICIO */}
        <div style={{ background: 'rgba(255, 65, 180, 0.1)', border: '1px dashed #ff41b4', padding: '12px', borderRadius: '12px', marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#ff99dd', textTransform: 'uppercase' }}>📢 Gatekeeper (Canales Obligatorios)</h4>
            <span style={neon.label}>Canal Obligatorio 1 (URL)</span>
            <input 
              type="text" 
              placeholder="Ej: https://t.me/AirdropsCriptoES (Opcional)" 
              style={{ ...neon.input, borderColor: '#ff41b4' }} 
              value={sysConfig.mandatory_channel_1 || ''} 
              onChange={(e) => setSysConfig({ ...sysConfig, mandatory_channel_1: e.target.value })} 
            />

            <span style={neon.label}>Canal Obligatorio 2 (URL)</span>
            <input 
              type="text" 
              placeholder="Ej: https://t.me/TONAirdropsES (Opcional)" 
              style={{ ...neon.input, borderColor: '#ff41b4', marginBottom: 0 }} 
              value={sysConfig.mandatory_channel_2 || ''} 
              onChange={(e) => setSysConfig({ ...sysConfig, mandatory_channel_2: e.target.value })} 
            />
            <div style={{ fontSize: '10px', color: '#aaa', marginTop: '6px' }}>Si dejas el campo vacío, no se exigirá ese canal. Recuerda que el bot debe ser admin en esos canales para leer los miembros.</div>
        </div>

        {/* 🔥 NUEVO: CANAL DE PAGOS */}
        <span style={neon.label}>Canal de Notificaciones de Pago (ID o @Username)</span>
        <input 
          type="text" 
          placeholder="Ej: -1002352835078 o @MisPagos" 
          style={{ ...neon.input, borderColor: '#ff41b4', marginBottom: '16px' }} 
          value={sysConfig.payment_channel_id || ''} 
          onChange={(e) => setSysConfig({ ...sysConfig, payment_channel_id: e.target.value })} 
        />
        <div style={{ fontSize: '10px', color: '#aaa', marginTop: '-6px', marginBottom: '20px' }}>* El Bot oficial debe ser Administrador en este canal.</div>

        <span style={neon.label}>Billetera Pública GRAM (Red TON)</span>
        <input 
          type="text" 
          placeholder="Ej: UQDgJUo4Ycvd9Q_ICUI..." 
          style={{ ...neon.input, borderColor: '#ff41b4' }} 
          value={sysConfig.master_wallet_gram || ''} 
          onChange={(e) => setSysConfig({ ...sysConfig, master_wallet_gram: e.target.value })} 
        />

        <span style={neon.label}>Billetera Pública USDT (Red BEP20)</span>
        <input 
          type="text" 
          placeholder="Ej: 0x1234567890abcdef..." 
          style={{ ...neon.input, borderColor: '#ff41b4', marginBottom: '16px' }} 
          value={sysConfig.master_wallet_usdt_bep20 || ''} 
          onChange={(e) => setSysConfig({ ...sysConfig, master_wallet_usdt_bep20: e.target.value })} 
        />

        <div style={{ background: 'rgba(0, 255, 170, 0.1)', border: '1px dashed #00ffaa', padding: '10px', borderRadius: '10px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#00ffaa' }}>
          {Icons.lock} <span>Las llaves privadas de retiro y gas están protegidas en el cifrado de entorno.</span>
        </div>

        <button onClick={handleSaveConfig} disabled={savingConfig} style={{ ...neon.btn, background: 'linear-gradient(90deg, #ff1493, #8a2be2)', color: '#fff' }}>
          {savingConfig ? 'Sincronizando...' : 'GUARDAR CONFIGURACIÓN'}
        </button>
      </div>
