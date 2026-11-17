export const es = {
  // ==========================================
  // NAVEGACIÓN INFERIOR (BottomNav)
  // ==========================================
  nav_home: "INICIO",
  nav_tasks: "TAREAS",
  nav_wallet: "BÓVEDA",
  nav_leaderboard: "RANKING",
  nav_referrals: "RED",
  nav_admin: "ADMIN",

  // ==========================================
  // PESTAÑA INICIO (HomeTab)
  // ==========================================
  home_vault_title: "FONDOS DE CAMPAÑA",
  home_vault_desc: "Para creación de anuncios y tráfico",
  home_gems_title: "SALDO DISPONIBLE",
  home_gems_desc: "Generado en red:",
  home_quick: "Acceso Rápido",
  home_earn: "Ganar $TGM",
  home_create: "Crear Campaña",
  home_invite: "Expande tu Red",
  home_invite_desc: "Gana el 20% de las campañas completadas por tus referidos.",
  home_btn_affiliates: "PANEL DE AFILIADOS",

  // ==========================================
  // MERCADO DE ANUNCIOS (AdsMarket / AdsActivity)
  // ==========================================
  ads_tab_market: "MERCADO",
  ads_tab_my_ads: "MIS CAMPAÑAS",
  ads_edit_title: "CONFIGURAR CAMPAÑA",
  ads_label_title: "TÍTULO PÚBLICO",
  ads_label_url: "ENLACE / DESTINO",
  ads_btn_verifying: "VERIFICANDO...",
  ads_paused: "PAUSADA",
  ads_completed: "COMPLETADA",
  ads_your_campaigns: "MIS CAMPAÑAS",
  ads_update: "ACTUALIZAR",
  ads_empty_my_ads: "Aún no has creado campañas.",
  ads_btn_create: "CREAR CAMPAÑA",
  ads_cat_pagadas: "PAGADAS",
  ads_cat_diarias: "DIARIAS",
  ads_cat_partners: "PARTNERS",
  ads_explore: "EXPLORAR",
  ads_daily_streak: "🎁 Racha Diaria (Día {day})",
  ads_daily_sponsor: "Patrocinado por GigaPub",
  ads_daily_come_back: "VUELVE MAÑANA",
  ads_btn_loading: "Sincronizando...",
  ads_empty_category: "No hay misiones disponibles. Vuelve más tarde.",
  ads_url_desc_bot: "URL del Bot (Ej: @MiBot)",
  ads_url_desc_channel: "URL del Canal (Ej: @MiCanal)",

  // Categorías
  ads_type_bot: "Bot",
  ads_type_group: "Comunidad",
  ads_type_promo: "Tráfico",
  ads_type_partner: "Alianza Estratégica",

  // ==========================================
  // BÓVEDA Y TESORERÍA (WalletTab)
  // ==========================================
  bank_title: "Tesorería Digital",
  bank_gem_sack: "SALDO GANADO ($TGM)",
  bank_withdrawable: "Fondo Retirable",
  bank_vault_usdt: "FONDOS DE CAMPAÑA",
  bank_only_ads: "Créditos Publicitarios",

  bank_live_title: "📊 Auditoría Pública",
  bank_live_desc: "Registro de retiros procesados",
  bank_live_btn: "VER CANAL",

  bank_tab_withdraw: "SOLICITAR RETIRO",
  bank_tab_deposit: "INYECTAR CRÉDITOS",

  bank_wd_title: "EXTRACCIÓN DE ACTIVOS",
  bank_wd_min: "Umbral operativo: {min} $TGM",
  bank_wd_address_label: "Billetera TON Destino",
  bank_wd_address_placeholder: "UQDgJUo4Ycvd9Q...",
  bank_wd_amount_label: "Monto a liquidar ($TGM)",
  bank_btn_max: "MÁX",

  bank_req_title: "🛡️ Control de Seguridad (Elige uno)",
  bank_req_opt1: "Opción 1: Reclutar Referidos",
  bank_req_opt1_desc: "(Deben ser usuarios activos)",
  bank_req_opt2: "Opción 2: Tareas de Red (Diarias)",
  bank_req_btn_loading: "CONECTANDO...",
  bank_req_btn_watch: "EJECUTAR MISIÓN DE RED",

  bank_btn_processing: "PROCESANDO...",
  bank_btn_withdraw: "AUTORIZAR RETIRO",

  bank_dp_secure_title: "Pasarela de Liquidez",
  bank_dp_send_exact: "Cotización TON: ${price}",
  bank_dp_to_generated: "Dirección inteligente de contrato:",
  bank_btn_copy: "COPIAR",
  bank_btn_tonkeeper: "TONKEEPER",
  bank_btn_verify: "VERIFICAR TRANSACCIÓN",

  bank_dp_send_bsc: "Red (BSC / BEP20)",
  bank_dp_to_derived: "Dirección de Bóveda Asignada:",
  bank_btn_verifying: "VERIFICANDO...",
  bank_btn_verify_block: "CONFIRMAR DEPÓSITO",

  bank_promo_title: "🚀 Inyección de Capital",
  bank_promo_desc: "Añade liquidez para fondear tus campañas de tráfico masivo y atraer miles de usuarios.",
  bank_promo_highlight: "¡Sin límites de crecimiento!",
  bank_dp_title: "Monto a Inyectar (USDT)",

  bank_dp_method_label: "Red de Liquidación",
  bank_dp_method_gram: "GRAM (TON)",
  bank_dp_method_usdt: "USDT (BEP20)",
  bank_btn_connecting: "INICIALIZANDO CONTRATO...",
  bank_btn_proceed: "GENERAR CONTRATO DE PAGO",

  // Mensajes de Error y Éxito de Bóveda
  bank_err_wallet_empty: "Ingresa tu billetera TON.",
  bank_err_wallet_invalid: "Billetera TON inválida.",
  bank_err_min_withdraw: "El retiro mínimo es de {min} $TGM.",
  bank_err_insufficient: "Capital insuficiente.",
  bank_req_error: "Debes cumplir uno de los requisitos (5 Referidos o 5 Misiones de red).",
  bank_msg_processing: "Autorizando transacción...",
  bank_msg_success: "Retiro en proceso de liquidación.",
  bank_msg_error: "Fallo en transacción.",
  bank_msg_conn_error: "Error de red.",
  bank_err_amount: "Monto inválido.",
  bank_msg_generating: "Configurando pasarela...",
  bank_err_server_wallet: "Fallo al generar contrato.",
  bank_err_gateway: "Servidor inaccesible.",
  bank_msg_copied: "Copiado exitosamente.",
  bank_err_not_installed: "App no detectada.",
  bank_msg_verifying: "Auditando blockchain...",
  bank_msg_deposit_ok: "Liquidación de ${amount} acreditada en Bóveda.",
  bank_err_not_detected: "Confirmaciones pendientes.",

  // ==========================================
  // RED DE AFILIADOS (ShareTab)
  // ==========================================
  ref_title: "RED DE AFILIADOS",
  ref_status_active: "ACTIVOS",
  ref_status_pending: "PENDIENTES",
  ref_btn_invite: "🚀 INVITAR",
  ref_btn_copy: "📋 COPIAR LINK",

  ref_earnings_title: "Comisiones Generadas",
  ref_network_title: "🛰️ TU RED DE AFILIADOS",
  ref_syncing: "SINCRONIZANDO NODOS...",
  ref_empty_desc: "AÚN NO HAS INVITADO A NINGÚN USUARIO A TU RED.",

  ref_toast_copy_ok: "¡Enlace copiado al portapapeles!",
  ref_toast_copy_fail: "Error al copiar",
  share_text: "🌐 ¡Entra a mi red, completa misiones y gana recompensas cripto gratis! 🚀",
  operator: "Recluta",

  // ==========================================
  // RANKING (LeaderboardTab)
  // ==========================================
  lb_title: "Clasificación",
  lb_tab_tourney: "TORNEO",
  lb_tab_ref: "RED GLOBAL",
  lb_lifetime_ref: "Top Histórico (Comisiones de Red)",
  lb_tourney_ends: "Finaliza en:",
  lb_tourney_default_title: "Torneo Activo",
  lb_tourney_desc_ref: "¡Invita amigos y sube en el ranking para ganar premios!",
  lb_tourney_desc_task: "¡Completa misiones y domina la tabla para asegurar tu premio!",
  lb_btn_copy: "Copiar Enlace de Invitación",
  lb_empty_tourney: "No hay participantes aún.",
  lb_empty_history: "Aún no hay datos históricos.",
  lb_loading: "Cargando Rankings...",
  lb_you: "(TÚ)",
  lb_securing: "Asegurando",
  lb_pts: "pts",

  // ==========================================
  // AJUSTES Y LEGAL (ProfileHeader)
  // ==========================================
  support_tab: "SOPORTE",
  support_title: "Centro de Soporte",
  support_idea_title: "💡 Ideas y mejoras",
  support_idea_desc: "Envía tus sugerencias o propuestas de mejora a",
  support_bug_title: "🐞 Reporte de errores",
  support_bug_desc: "Si encuentras un fallo o una vulnerabilidad, repórtalo a",

  about_tab: "ACERCA DE",
  about_title: "Acerca de la plataforma",
  about_p1: "TeleGem Web3 es una plataforma de misiones y recompensas dentro de Telegram.",
  about_p2: "Completa tareas, invita a tu red y gana $TGM según tu actividad.",
  about_p3: "Las recompensas se acreditan en tu saldo y pueden retirarse al cumplir el mínimo.",

  terms_tab: "TÉRMINOS",
  terms_title: "Términos de uso",
  terms_subtitle: "Lee las condiciones antes de usar la plataforma.",
  terms_1: "Cada persona puede tener una sola cuenta; las cuentas duplicadas pueden bloquearse.",
  terms_2: "Las recompensas en $TGM dependen de las tareas completadas y de su verificación.",
  terms_3: "Los retiros requieren el mínimo indicado y cumplir los requisitos de seguridad vigentes.",
  terms_4: "La plataforma puede modificar tareas, recompensas y condiciones avisando a los usuarios.",
};