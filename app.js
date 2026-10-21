/* ============================================================
   Akuma Clean · app.js (pantalla)
   Pedidos, preparación, reparto, cobranzas y cuentas corrientes
   para la química. Funciona en PC, celular y como app instalada.

   Desarrollado por AkumaNet. Todos los derechos reservados.
   Autor: Juan Carlos Ojeda · Tel. 11 6033-1552.
   ============================================================ */

/* La URL de la API de Apps Script (termina en /exec) se pega en config.js.
   Si queda vacía, la app funciona en MODO DEMOSTRACIÓN (datos en este navegador). */
var API_URL = (typeof AKUMA_API_URL !== 'undefined' && AKUMA_API_URL) || '';

/* Logo de la marca (sidebar, login y remitos). */
var LOGO_URL = 'logo.png';

(function () {
  'use strict';

  /* ============================================================
   * 1. UTILIDADES
   * ============================================================ */
  var $ = function (sel, raiz) { return (raiz || document).querySelector(sel); };
  var $$ = function (sel, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(sel)); };
  function esc(v) {
    return String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(v) { var n = Number(String(v === null || v === undefined ? '' : v).replace(',', '.')); return isFinite(n) ? n : 0; }
  var fmtPesos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 2 });
  function pesos(n) { return fmtPesos.format(num(n)); }
  var fmtUsd = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  /** Cotización del dólar oficial que manda el servidor (0 si no hay). */
  function dolar() { return D && D.dolar && num(D.dolar.valor) > 0 ? num(D.dolar.valor) : 0; }
  /** Pesos → texto en dólares. cot opcional (la del pedido); si no, la actual. */
  function usd(ars, cot) { cot = num(cot) || dolar(); return cot ? 'US$ ' + fmtUsd.format(num(ars) / cot) : ''; }
  function mostrarUsd() { return D.config.mostrarUsd !== 'no' && dolar() > 0; }
  function cant(n) { return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(num(n)); }
  function fechaCorta(iso) {
    if (!iso) return '';
    var s = String(iso).slice(0, 10).split('-');
    return s.length === 3 ? s[2] + '/' + s[1] + '/' + s[0].slice(2) : iso;
  }
  function fechaHora(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }
  function diasDesde(iso, hoy) { return Math.max(0, Math.round((Date.parse(hoy) - Date.parse(String(iso).slice(0, 10))) / 86400000)); }
  function nroPedido(n) { return '#' + String(n || 0).padStart(4, '0'); }
  function nroRemito(n) { return (D.config.puntoVenta || '0001').padStart(4, '0') + '-' + String(n || 0).padStart(8, '0'); }
  function normal(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function guardarLocal(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } }
  function leerLocal(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  var ICONOS = {
    inicio: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    pedidos: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v3H9z"/><path d="M9 11h6M9 15h4"/>',
    clientes: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.8c1.6.8 2.6 2.5 3 5.2"/>',
    cobranzas: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18"/><circle cx="16.5" cy="15" r="1.3"/>',
    productos: '<path d="M10 2h4v4l2 3v12a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V9l2-3z"/><path d="M8 13h8"/>',
    ajustes: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    mas: '<path d="M12 5v14M5 12h14"/>',
    buscar: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    imprimir: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
    wa: '<path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5"/>',
    salir: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',
    camion: '<path d="M2 6h11v10H2zM13 10h4l4 3v3h-8z"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
    editar: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    basura: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    subir: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/>',
    repetir: '<path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5"/>',
    pesos: '<path d="M12 3v18M16.5 7.5C16 6 14.4 5 12 5c-2.8 0-4.5 1.3-4.5 3.3 0 4.7 9 2.5 9 7.2 0 2-1.8 3.5-4.5 3.5-2.6 0-4.3-1.1-4.8-2.8"/>',
    copiar: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>',
    etiqueta: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
    matraz: '<path d="M9 3h6M10 3v6.5L4.6 18.4A1.8 1.8 0 0 0 6.2 21h11.6a1.8 1.8 0 0 0 1.6-2.6L14 9.5V3"/><path d="M7.2 15h9.6"/>',
    caja: '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M7 8V5h10v3M3 13h18M10 17h4"/>',
    carrito: '<path d="M3 4h2l2.4 11h11l2-8H6.2"/><circle cx="9.5" cy="19.5" r="1.5"/><circle cx="17" cy="19.5" r="1.5"/>',
    grafico: '<path d="M4 20V11M10 20V5M16 20v-8M21 20H3"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    luna: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'
  };
  function ic(n) { return '<svg class="i" viewBox="0 0 24 24" aria-hidden="true">' + (ICONOS[n] || '') + '</svg>'; }

  var ESTADO = {
    nuevo: { t: 'Nuevo', sig: 'preparacion', btn: 'Empezar a preparar' },
    preparacion: { t: 'En preparación', sig: 'listo', btn: 'Marcar listo' },
    listo: { t: 'Listo para enviar', sig: 'encamino', btn: 'Salió a reparto' },
    encamino: { t: 'En camino', sig: 'entregado', btn: 'Marcar entregado' },
    entregado: { t: 'Entregado' },
    anulado: { t: 'Anulado' }
  };
  var PAGO = { pendiente: 'Debe', parcial: 'Pago parcial', pagado: 'Pagado', anulado: 'Anulado' };
  var PERMISO_TXT = {
    pedidos: ['Pedidos', 'Crear y editar pedidos'],
    clientes: ['Clientes', 'Cargar y editar clientes'],
    pagos: ['Cobros', 'Registrar pagos y ver deudas'],
    precios: ['Precios de venta', 'Ver precios, totales y saldos'],
    produccion: ['Producción', 'Ver las recetas, el stock de insumos y registrar producciones'],
    costos: ['Costos y ganancias', 'Ver costos de insumos y productos, fórmulas valorizadas y márgenes']
  };
  var ROL = { admin: 'Administrador', ventas: 'Ventas / Oficina', deposito: 'Depósito', reparto: 'Reparto' };
  var MEDIO = { efectivo: 'Efectivo', transferencia: 'Transferencia', mercadopago: 'Mercado Pago', cheque: 'Cheque', otro: 'Otro' };
  function chipEstado(e) { return '<span class="chip st-' + e + '">' + esc(ESTADO[e] ? ESTADO[e].t : e) + '</span>'; }
  function chipPago(p) {
    var e = QG.estadoPago(p);
    if (e === 'pendiente' && p.estado !== 'entregado') return '<span class="chip pg-acobrar">A cobrar</span>';
    return '<span class="chip pg-' + e + '">' + PAGO[e] + '</span>';
  }

  /* ----- Modo claro / oscuro (cada persona elige en su dispositivo) ----- */
  function temaOscuro() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t) return t === 'dark';
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function aplicarTema(t) {
    if (t === 'dark' || t === 'light') document.documentElement.setAttribute('data-theme', t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', temaOscuro() ? '#0a0a0b' : '#111111');
  }
  function botonTema(extra) {
    var osc = temaOscuro();
    return '<button class="btn icono btn-tema' + (extra || '') + '" type="button" data-tema title="' + (osc ? 'Pasar a modo claro' : 'Pasar a modo oscuro') + '" aria-label="' + (osc ? 'Pasar a modo claro' : 'Pasar a modo oscuro') + '">' + ic(osc ? 'sol' : 'luna') + '</button>';
  }
  aplicarTema(leerLocal('ac_tema'));
  document.addEventListener('click', function (e) {
    if (!e.target.closest('[data-tema]')) return;
    var nuevo = temaOscuro() ? 'light' : 'dark';
    aplicarTema(nuevo);
    guardarLocal('ac_tema', nuevo);
    $$('[data-tema]').forEach(function (b) { b.outerHTML = botonTema(b.classList.contains('flotante') ? ' flotante' : ''); });
  });

  /* ============================================================
   * 2. ESTADO Y DATOS DERIVADOS
   * ============================================================ */
  var S = { token: leerLocal('qg_token'), vista: 'inicio', vistaPedidos: leerLocal('qg_vped') || 'tablero', busqueda: {}, ocupado: 0 };
  var D = null; // datos del servidor
  var IDX = {};

  function aplicarDatos(r) {
    // aviso cuando entra un pedido nuevo de la tienda online
    if (D && D.pedidos && r.pedidos && puede('pedidos')) {
      var antes = {};
      D.pedidos.forEach(function (p) { antes[p.id] = 1; });
      var nuevos = r.pedidos.filter(function (p) { return p.origen === 'web' && !antes[p.id]; });
      if (nuevos.length) setTimeout(function () { toast('🛒 ' + (nuevos.length > 1 ? nuevos.length + ' pedidos nuevos' : 'Pedido nuevo') + ' de la tienda online: ' + nuevos.map(function (p) { return p.clienteNombre; }).join(', ')); }, 50);
    }
    D = r;
    IDX = { cli: {}, prod: {}, zona: {}, usr: {}, pedido: {} };
    D.clientes.forEach(function (c) { IDX.cli[c.id] = c; });
    D.productos.forEach(function (p) { IDX.prod[p.id] = p; });
    D.zonas.forEach(function (z) { IDX.zona[z.id] = z; });
    D.usuarios.forEach(function (u) { IDX.usr[u.id] = u; });
    D.pedidos.forEach(function (p) { IDX.pedido[p.id] = p; });
  }
  function rol() { return D.yo.rol; }
  function puede(p) { return QG.puede(D.yo, p); }
  function verPrecios() { return puede('precios'); }
  function esAdmin() { return rol() === 'admin'; }
  /** Costos, ganancias y precios de insumos: solo el admin o quien tenga ese permiso. */
  function verCostos() { return puede('costos'); }
  function puedeMover(de, a) {
    if (rol() === 'admin' || rol() === 'ventas') return true;
    var t = QG.TRANSICIONES[rol()];
    return !!(t && t[de] && t[de].indexOf(a) >= 0);
  }
  function deudaCliente(id) {
    var r = { entregado: 0, enCurso: 0, pedidos: 0, masViejo: null };
    if (!verPrecios()) return r;
    D.pedidos.forEach(function (p) {
      if (p.clienteId !== id) return;
      var pend = QG.pendiente(p);
      if (pend <= 0) return;
      if (p.estado === 'entregado') {
        r.entregado += pend; r.pedidos++;
        var ref = p.fechaEntrega || p.creado;
        if (!r.masViejo || ref < r.masViejo) r.masViejo = ref;
      } else r.enCurso += pend;
    });
    return r;
  }
  function telWa(t) {
    var d = String(t || '').replace(/\D/g, '');
    if (!d) return '';
    if (d.indexOf('00') === 0) d = d.slice(2);
    if (d.indexOf('54') === 0) return d.indexOf('549') === 0 ? d : '549' + d.slice(2);
    if (d.charAt(0) === '0') d = d.slice(1);
    return '549' + d;
  }
  function linkWa(tel, texto) { return 'https://wa.me/' + telWa(tel) + '?text=' + encodeURIComponent(texto); }

  /* ============================================================
   * 3. API (servidor real o modo demostración)
   * ============================================================ */
  /* Tres formas de funcionar:
     - 'gas': la app se abrió desde el link /exec de Apps Script (habla directo con el servidor).
     - 'url': la app está en GitHub Pages u otro hosting y llama a API_URL.
     - 'demo': sin servidor, datos de ejemplo en este navegador. */
  var MODO = (window.google && google.script && google.script.run) ? 'gas' : API_URL ? 'url' : 'demo';
  function llamar(accion, datos) {
    var req = { accion: accion, token: S.token, datos: datos || {} };
    var promesa;
    if (MODO === 'gas') {
      promesa = new Promise(function (ok, mal) {
        google.script.run.withSuccessHandler(ok).withFailureHandler(function (e) { mal(new Error(e && e.message || String(e))); }).api(req);
      });
    } else if (MODO === 'demo') {
      promesa = new Promise(function (ok) { setTimeout(function () { ok(window.QGDemo.atender(req)); }, 150); });
    } else {
      promesa = fetch(API_URL, { method: 'POST', body: JSON.stringify(req), redirect: 'follow' })
        .then(function (r) { if (!r.ok) throw new Error('El servidor respondió ' + r.status + '. Revisá la URL de la API.'); return r.json(); });
    }
    marcarSync(+1);
    return promesa.then(function (res) {
      marcarSync(-1);
      if (!res || !res.ok) {
        if (res && res.codigo === 'AUTH' && accion !== 'login') { cerrarSesionLocal(); }
        throw new Error((res && res.error) || 'No se pudo completar la acción.');
      }
      if (res.yo) aplicarDatos(res);
      return res;
    }, function (e) {
      marcarSync(-1, true);
      throw new Error(e && e.message && e.message !== 'Failed to fetch' ? e.message : 'Sin conexión con el servidor. Revisá internet y probá de nuevo.');
    });
  }
  function marcarSync(d, error) {
    S.ocupado = Math.max(0, S.ocupado + d);
    var el = $('#sync');
    if (!el) return;
    el.className = 'sync' + (error ? ' error' : S.ocupado ? ' ocupado' : '');
    $('span', el).textContent = error ? 'Sin conexión' : S.ocupado ? 'Guardando…' : 'Al día';
  }
  /** Ejecuta una acción de escritura con el botón bloqueado y aviso al terminar. */
  function accion(btn, nombre, datos, mensaje) {
    if (btn) btn.disabled = true;
    return llamar(nombre, datos).then(function (r) {
      if (btn) btn.disabled = false;
      var msj = (r.resultado && r.resultado.mensaje) || mensaje;
      if (msj) toast(msj);
      render();
      refrescarModales();
      return r;
    }, function (e) {
      if (btn) btn.disabled = false;
      toast(e.message, true);
      throw e;
    });
  }

  /* Actualización automática: cada 12 s pregunta si hay cambios de otros trabajadores */
  setInterval(function () {
    if (!D || document.hidden || S.ocupado) return;
    llamar('ping').then(function (r) {
      if (D && r.version !== D.version) return llamar('sync').then(function () { render(); refrescarModales(); });
    }).catch(function () { /* se reintenta en el próximo ciclo */ });
  }, 12000);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && D) llamar('sync').then(function () { render(); refrescarModales(); }).catch(function () {});
  });

  /* ============================================================
   * 4. AVISOS Y MODALES
   * ============================================================ */
  function toast(msg, error) {
    var cont = $('#toasts');
    var t = document.createElement('div');
    t.className = 'toast' + (error ? ' error' : '');
    t.setAttribute('role', 'status');
    t.textContent = msg;
    cont.appendChild(t);
    setTimeout(function () { t.remove(); }, error ? 6000 : 3200);
  }

  var MODALES = [];
  /** op: { titulo, cuerpo(), pie(), tam, alAbrir(raiz), refrescable } */
  function abrirModal(op) {
    var fondo = document.createElement('div');
    fondo.className = 'modal-fondo';
    fondo.innerHTML = '<div class="modal ' + (op.tam || '') + '" role="dialog" aria-modal="true"></div>';
    $('#modales').appendChild(fondo);
    var m = { op: op, fondo: fondo, raiz: $('.modal', fondo) };
    MODALES.push(m);
    pintarModal(m);
    fondo.addEventListener('mousedown', function (e) { if (e.target === fondo) cerrarModal(m); });
    var primero = $('[autofocus]', m.raiz) || $('input, select, textarea', m.raiz);
    if (primero && !op.sinFoco) setTimeout(function () { primero.focus(); }, 30);
    return m;
  }
  function pintarModal(m) {
    var op = m.op;
    m.raiz.innerHTML = '<div class="modal-head"><h2>' + (typeof op.titulo === 'function' ? op.titulo() : op.titulo) + '</h2>' +
      '<button class="cerrar" type="button" data-cerrar aria-label="Cerrar">' + ic('x') + '</button></div>' +
      '<div class="modal-body">' + op.cuerpo() + '</div>' + (op.pie ? '<div class="modal-pie">' + op.pie() + '</div>' : '');
    $('[data-cerrar]', m.raiz).addEventListener('click', function () { cerrarModal(m); });
    if (op.alAbrir) op.alAbrir(m.raiz, m);
  }
  function cerrarModal(m) {
    m = m || MODALES[MODALES.length - 1];
    if (!m) return;
    MODALES.splice(MODALES.indexOf(m), 1);
    m.fondo.remove();
  }
  function cerrarTodos() { while (MODALES.length) cerrarModal(); }
  function refrescarModales() { MODALES.forEach(function (m) { if (m.op.refrescable) pintarModal(m); }); }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && MODALES.length) cerrarModal(); });

  /** Confirmación propia (el navegador de algunas vistas no muestra confirm()). */
  function confirmar(texto, boton, fn, peligro) {
    abrirModal({
      titulo: 'Confirmar', sinFoco: true,
      cuerpo: function () { return '<p style="margin:0">' + esc(texto) + '</p>'; },
      pie: function () { return '<button class="btn" type="button" data-cerrar2>Cancelar</button><button class="btn ' + (peligro ? 'peligro' : 'pri') + '" type="button" data-si>' + esc(boton) + '</button>'; },
      alAbrir: function (r, m) {
        $('[data-cerrar2]', r).onclick = function () { cerrarModal(m); };
        $('[data-si]', r).onclick = function () { cerrarModal(m); fn(); };
        $('[data-si]', r).focus();
      }
    });
  }

  /* ============================================================
   * 5. LOGIN Y ESTRUCTURA
   * ============================================================ */
  function pantallaLogin() {
    var demo = MODO === 'demo';
    document.getElementById('raiz').innerHTML =
      '<div class="login">' + botonTema(' flotante') + '<form class="login-card" id="f-login" autocomplete="on">' +
      '<div class="marca marca-login"><img class="logo" src="' + LOGO_URL + '" alt=""><div><b>Akuma Clean</b><small>Productos de alta calidad</small></div></div>' +
      '<p class="muted" style="margin:0">Pedidos, reparto y cobranzas de la química.</p>' +
      '<label class="campo"><span>Usuario</span><input class="in" id="l-usuario" autocomplete="username" autocapitalize="none" required></label>' +
      '<label class="campo"><span>PIN</span><input class="in" id="l-pin" type="password" inputmode="numeric" autocomplete="current-password" required></label>' +
      '<button class="btn pri" type="submit" id="l-btn">Ingresar</button>' +
      (demo ? '<div class="aviso azul"><b>Modo demostración.</b> Tocá un usuario para entrar con ese rol:</div><div class="demo-users">' +
        [['admin', '1234', 'Juan Carlos', 'Administrador'], ['lucia', '1111', 'Lucía', 'Ventas'], ['martin', '2222', 'Martín', 'Depósito'], ['diego', '3333', 'Diego', 'Reparto']]
          .map(function (u) { return '<button type="button" data-demo="' + u[0] + '|' + u[1] + '"><b>' + u[2] + '</b><small>' + u[3] + ' · PIN ' + u[1] + '</small></button>'; }).join('') + '</div>' : '') +
      '<p class="creditos">Desarrollado por AkumaNet · Autor: Juan Carlos Ojeda · Tel. 11 6033-1552</p></form></div>' + baseFlotante();
    var entrar = function (usuario, pin) {
      var btn = $('#l-btn');
      btn.disabled = true;
      llamar('login', { usuario: usuario, pin: pin }).then(function (r) {
        S.token = r.token;
        guardarLocal('qg_token', r.token);
        S.vista = ['deposito', 'reparto'].indexOf(r.yo.rol) >= 0 ? 'pedidos' : 'inicio';
        armarApp();
      }, function (e) { btn.disabled = false; toast(e.message, true); });
    };
    $('#f-login').addEventListener('submit', function (e) { e.preventDefault(); entrar($('#l-usuario').value, $('#l-pin').value); });
    $$('[data-demo]').forEach(function (b) {
      b.onclick = function () { var p = b.getAttribute('data-demo').split('|'); $('#l-usuario').value = p[0]; $('#l-pin').value = p[1]; entrar(p[0], p[1]); };
    });
  }
  function baseFlotante() { return '<div id="modales"></div><div class="toasts" id="toasts" aria-live="polite"></div>'; }
  function cerrarSesionLocal() {
    S.token = null; D = null;
    guardarLocal('qg_token', null);
    cerrarTodos();
    pantallaLogin();
  }

  var VISTAS = {
    inicio: { t: 'Inicio', ic: 'inicio', ver: function () { return puede('pedidos'); } },
    pedidos: { t: 'Pedidos', ic: 'pedidos', roles: ['admin', 'ventas', 'deposito', 'reparto'] },
    clientes: { t: 'Clientes', ic: 'clientes', ver: function () { return puede('clientes') || puede('pagos'); } },
    cobranzas: { t: 'Cobranzas', ic: 'cobranzas', ver: function () { return puede('pagos'); } },
    caja: { t: 'Caja', ic: 'caja', ver: function () { return puede('pagos'); } },
    productos: { t: 'Productos', ic: 'productos', roles: ['admin', 'ventas', 'deposito'] },
    produccion: { t: 'Producción', ic: 'matraz', ver: function () { return puede('produccion'); } },
    compras: { t: 'Compras', ic: 'carrito', ver: function () { return esAdmin(); } },
    etiquetas: { t: 'Etiquetas', ic: 'etiqueta', roles: ['admin', 'ventas', 'deposito'] },
    reportes: { t: 'Reportes', ic: 'grafico', ver: function () { return puede('costos'); } },
    ajustes: { t: 'Ajustes', ic: 'ajustes', roles: ['admin', 'ventas', 'deposito', 'reparto'] }
  };
  function vistasPermitidas() { return Object.keys(VISTAS).filter(function (v) { return VISTAS[v].ver ? VISTAS[v].ver() : VISTAS[v].roles.indexOf(rol()) >= 0; }); }

  function armarApp() {
    if (vistasPermitidas().indexOf(S.vista) < 0) S.vista = vistasPermitidas()[0];
    document.getElementById('raiz').innerHTML =
      (MODO === 'demo' ? '<div class="demo-band"><b>Modo demostración:</b> los datos quedan solo en este navegador. Abrí otra pestaña con otro usuario para ver cómo se actualiza entre trabajadores.</div>' : '') +
      '<div class="app"><nav class="side" id="nav" aria-label="Secciones"></nav><div class="main">' +
      '<header class="top"><h1 id="titulo"></h1><span id="dolar-top"></span><span class="sync" id="sync"><i></i><span>Al día</span></span>' + botonTema() +
      '<span id="acciones-top" class="fila"></span></header><main class="vista" id="vista"></main></div></div>' +
      '<button class="fab" id="fab" type="button" data-act="nuevoPedido" aria-label="Nuevo pedido" hidden>' + ic('mas') + '</button>' + baseFlotante();
    render();
  }
  function pintarNav() {
    var porPreparar = D.pedidos.filter(function (p) { return p.estado === 'nuevo'; }).length;
    var html = '<div class="marca"><img class="logo" src="' + LOGO_URL + '" alt=""><div><b>Akuma Clean</b><small>Productos de alta calidad</small></div></div>';
    var movil = vistasMovil();
    vistasPermitidas().forEach(function (v) {
      var badge = v === 'pedidos' && porPreparar ? '<span class="badge">' + porPreparar + '</span>' : '';
      html += '<button class="nav-btn' + (movil.indexOf(v) < 0 ? ' extra-movil' : '') + '" type="button" data-vista="' + v + '"' + (S.vista === v ? ' aria-current="page"' : '') + '>' + ic(VISTAS[v].ic) + '<span>' + VISTAS[v].t + '</span>' + badge + '</button>';
    });
    html += '<button class="nav-btn nav-mas" type="button" data-act="menuMas"' + (movil.indexOf(S.vista) < 0 ? ' aria-current="page"' : '') + '>' + ic('menu') + '<span>Más</span></button>';
    html += '<div class="yo"><b>' + esc(D.yo.nombre) + '</b><span>' + ROL[rol()] + '</span>' +
      '<button class="lnk" type="button" data-salir style="color:var(--nav-fg);margin-top:6px;display:flex;gap:6px;align-items:center">' + ic('salir') + 'Cerrar sesión</button></div>';
    $('#nav').innerHTML = html;
  }
  function render() {
    if (!D || !$('#vista')) return;
    if (S.edicion && $('#ed-inline')) { S.renderPendiente = true; return; }
    S.renderPendiente = false;
    pintarNav();
    $('#titulo').textContent = VISTAS[S.vista].t;
    var dt = $('#dolar-top');
    if (dt) dt.innerHTML = verPrecios() && D.dolar ? '<span class="dolar-chip" title="' + esc((D.dolar.fuente === 'manual' ? 'Cotización manual cargada en Ajustes' : 'Dólar oficial venta · ' + (D.dolar.fuente || '')) + (D.dolar.fecha ? ' · actualizado ' + fechaHora(D.dolar.fecha) : '') + (D.dolar.viejo ? ' · sin conexión, último valor conocido' : '')) + '">' +
      '<span class="dl-txt">' + (D.dolar.fuente === 'manual' ? 'Dólar' : 'Dólar oficial') + '</span> <b>' + pesos(D.dolar.valor) + '</b>' + (D.dolar.viejo ? ' ⚠' : '') + '</span>' : '';
    var top = '';
    if (puede('pedidos') && S.vista !== 'ajustes') top = '<button class="btn pri solo-pc" type="button" data-act="nuevoPedido">' + ic('mas') + 'Nuevo pedido</button>';
    var fab = $('#fab');
    if (fab) fab.hidden = !(puede('pedidos') && S.vista !== 'ajustes');
    $('#acciones-top').innerHTML = top;
    var y = window.scrollY;
    var foco = document.activeElement && document.activeElement.id;
    var pos = foco && document.activeElement.selectionStart;
    $('#vista').innerHTML = RENDER[S.vista]();
    tarjetizar($('#vista'));
    if (ALABRIR[S.vista]) ALABRIR[S.vista]($('#vista'));
    if (foco && $('#' + foco) && $('#vista').contains($('#' + foco))) {
      var el = $('#' + foco); el.focus();
      try { if (pos !== null && pos !== undefined) el.setSelectionRange(pos, pos); } catch (e) { /* no es texto */ }
    }
    window.scrollTo(0, y);
  }

  /* Clics globales con data-act / data-vista */
  document.addEventListener('click', function (e) {
    var v = e.target.closest('[data-vista]');
    if (v) { S.vista = v.getAttribute('data-vista'); render(); window.scrollTo(0, 0); return; }
    if (e.target.closest('[data-salir]')) {
      confirmar('¿Cerrar sesión en este dispositivo?', 'Cerrar sesión', function () { llamar('logout').catch(function () {}); cerrarSesionLocal(); });
      return;
    }
    var a = e.target.closest('[data-act]');
    if (a && ACT[a.getAttribute('data-act')]) { e.preventDefault(); ACT[a.getAttribute('data-act')](a.getAttribute('data-id'), a); }
  });

  var ACT = {
    nuevoPedido: function (clienteId) { editorPedido(null, clienteId ? { clienteId: clienteId } : null); },
    verPedido: function (id) { detallePedido(id); },
    verCliente: function (id) { detalleCliente(id); },
    nuevoCliente: function () { editorCliente(null); },
    cobrar: function (id) { modalPago({ clienteId: id }); },
    nuevoProducto: function () { editorProducto(null); },
    editarProducto: function (id) { editorProducto(id); },
    importar: function () { modalImportar(); },
    aumentar: function () { modalAumento(); },
    stock: function (id) { modalStock(id); },
    hojaRuta: function () { hojaDeRuta(); },
    vistaPed: function (v) { S.vistaPedidos = v; guardarLocal('qg_vped', v); render(); },
    filtroCat: function (c) { S.busqueda.cat = c || ''; render(); },
    editarZona: function (id) { editorZona(id); },
    editarUsuario: function (id) { editorUsuario(id); },
    miPin: function () { modalMiPin(); },
    respaldo: function (id, btn) {
      btn.disabled = true;
      llamar('respaldoAhora').then(function (r) { btn.disabled = false; toast(r.mensaje); llamar('sync').then(render); }, function (e) { btn.disabled = false; toast(e.message, true); });
    },
    borrarPago: function (id) {
      confirmar('¿Eliminar este pago? El saldo del pedido vuelve a quedar pendiente.', 'Eliminar pago', function () { accion(null, 'borrarPago', { id: id }, 'Pago eliminado.'); }, true);
    }
  };

  /* ============================================================
   * 6. VISTA INICIO (panel de control)
   * ============================================================ */
  var RENDER = {}, ALABRIR = {};

  RENDER.inicio = function () {
    var hoy = D.hoy, mes = hoy.slice(0, 7);
    var cuenta = function (e) { return D.pedidos.filter(function (p) { return p.estado === e; }).length; };
    var porCobrar = 0, enCurso = 0, ventasMes = 0, ganMes = 0, pedidosMes = 0, cobradoMes = 0;
    D.pedidos.forEach(function (p) {
      if (p.estado === 'anulado') return;
      if (p.estado === 'entregado') porCobrar += QG.pendiente(p); else enCurso += QG.pendiente(p);
      if (String(p.creado).slice(0, 7) === mes) { ventasMes += num(p.total); ganMes += num(p.subtotal) - num(p.descuento) - num(p.costoTotal); pedidosMes++; }
    });
    D.pagos.forEach(function (x) { if (String(x.fecha).slice(0, 7) === mes) cobradoMes += num(x.monto); });

    var kpi = function (t, v, sub, vista, alerta) {
      return '<button class="kpi' + (alerta ? ' alerta' : '') + '" type="button" data-vista="' + vista + '"><small>' + t + '</small><b>' + v + '</b><em>' + sub + '</em></button>';
    };
    var html = '<div class="kpis">' +
      kpi('Para preparar', cuenta('nuevo') + cuenta('preparacion'), cuenta('nuevo') + ' nuevos · ' + cuenta('preparacion') + ' en preparación', 'pedidos') +
      kpi('Listos para enviar', cuenta('listo'), cuenta('encamino') + ' en camino ahora', 'pedidos') +
      kpi('Te deben (entregado)', pesos(porCobrar), pesos(enCurso) + ' más en pedidos en curso', 'cobranzas', porCobrar > 0) +
      kpi('Vendido este mes', pesos(ventasMes), pedidosMes + ' pedidos · cobrado ' + pesos(cobradoMes), 'pedidos') +
      (verCostos() ? kpi('Ganancia del mes', pesos(ganMes), ventasMes ? 'Margen ' + Math.round(ganMes / Math.max(1, ventasMes) * 100) + ' % sobre lo vendido' : 'Sin ventas aún', 'pedidos') : '') +
      '</div>';

    var urgentes = D.pedidos.filter(function (p) { return ['entregado', 'anulado'].indexOf(p.estado) < 0 && p.fechaEntrega && p.fechaEntrega <= hoy; })
      .sort(function (a, b) { return a.fechaEntrega < b.fechaEntrega ? -1 : 1; });
    var bajos = D.productos.filter(function (p) { return p.activo === 'si' && p.modoStock !== 'granel' && num(p.stockMinimo) > 0 && num(p.stock) <= num(p.stockMinimo); });
    var deudores = deudoresOrdenados().slice(0, 6);

    var insBajos = puede('produccion') ? insumosBajos() : [];
    var margenBajo = [];
    if (verCostos()) (D.formulas || []).forEach(function (f) { if (f.activo === 'si') analisisFormula(f).bajos.forEach(function (x) { margenBajo.push({ f: f, x: x }); }); });
    html += '<div class="dos-col">' +
      ((insBajos.length || margenBajo.length || verCostos()) && (D.formulas || []).length ? '<section class="card"><h2>' + ic('matraz') + 'Producción</h2><div class="lista-simple">' +
        (insBajos.length ? insBajos.slice(0, 5).map(function (i) { return '<div><span>Reponer <b style="font-weight:500">' + esc(i.nombre) + '</b></span><span class="num bajo">' + cantInsumo(i.stock, i.unidad) + '</span></div>'; }).join('') : '') +
        (margenBajo.length ? margenBajo.slice(0, 5).map(function (o) {
          return '<div><span>' + esc(o.x.p.nombre) + ' <span class="muted">' + esc(o.x.p.presentacion) + '</span></span><span class="num bajo" title="Ganancia mayorista sobre el costo">' + Math.round(o.x.gMay) + ' % · sug. ' + pesos(o.x.sugMay) + '</span></div>';
        }).join('') : '') +
        (!insBajos.length && !margenBajo.length ? '<p class="vacio">Insumos con stock y precios que cubren tu ganancia.</p>' : '') +
        '</div><div class="fila fin" style="margin-top:10px"><button class="btn chico" type="button" data-vista="produccion">Ir a producción</button></div></section>' : '') +
      '<section class="card"><h2>' + ic('camion') + 'Entregas para hoy o atrasadas</h2><div class="lista-simple">' +
      (urgentes.length ? urgentes.map(function (p) {
        return '<div><button class="lnk" type="button" data-act="verPedido" data-id="' + p.id + '">' + nroPedido(p.numero) + ' · ' + esc(p.clienteNombre) + '</button>' +
          '<span class="fila">' + (p.fechaEntrega < hoy ? '<span class="chip plano pg-pendiente">Atrasado ' + fechaCorta(p.fechaEntrega) + '</span>' : '<span class="chip plano st-listo">Hoy</span>') + chipEstado(p.estado) + '</span></div>';
      }).join('') : '<p class="vacio">No hay entregas pendientes para hoy.</p>') + '</div></section>' +
      '<section class="card"><h2>' + ic('cobranzas') + 'Quién debe más</h2><div class="lista-simple">' +
      (deudores.length ? deudores.map(function (d) {
        return '<div><button class="lnk" type="button" data-act="verCliente" data-id="' + d.c.id + '">' + esc(d.c.nombre) + '</button>' +
          '<span class="fila"><span class="muted" style="font-size:.8rem">' + d.dias + ' días</span><b class="num">' + pesos(d.deuda.entregado) + '</b></span></div>';
      }).join('') : '<p class="vacio">Nadie te debe. 🎉</p>') + '</div></section>' +
      '<section class="card"><h2>' + ic('productos') + 'Stock bajo</h2><div class="lista-simple">' +
      (bajos.length ? bajos.map(function (p) {
        return '<div><span>' + esc(p.nombre) + ' <span class="muted">' + esc(p.presentacion) + '</span></span><span class="fila"><span class="num bajo">' + cant(p.stock) + (p.modoStock === 'tanque' ? ' L' : '') + ' / mín. ' + cant(p.stockMinimo) + '</span>' +
          (p.modoStock === 'envasado' && puedeEnvasar() && IDX.prod[p.granelId] && num(IDX.prod[p.granelId].stock) > 0 ? '<button class="btn chico" type="button" data-act="envasar" data-id="' + p.id + '">Envasar</button>' : '') + '</span></div>';
      }).join('') : '<p class="vacio">Todo el stock está por encima del mínimo.</p>') + '</div></section>' +
      '</div>';
    return html;
  };
  function deudoresOrdenados() {
    return D.clientes.map(function (c) {
      var d = deudaCliente(c.id);
      return { c: c, deuda: d, dias: d.masViejo ? diasDesde(d.masViejo, D.hoy) : 0 };
    }).filter(function (x) { return x.deuda.entregado > 0; })
      .sort(function (a, b) { return b.deuda.entregado - a.deuda.entregado; });
  }

  /* ============================================================
   * 7. VISTA PEDIDOS (tablero y lista)
   * ============================================================ */
  function filtrarPedidos(lista) {
    var q = normal(S.busqueda.pedidos);
    var pago = S.busqueda.pago || '';
    return lista.filter(function (p) {
      if (q && normal(p.clienteNombre + ' ' + p.numero + ' ' + (p.items || []).map(function (i) { return i.nombre; }).join(' ')).indexOf(q) < 0) return false;
      if (pago && verPrecios()) {
        var e = QG.estadoPago(p);
        if (pago === 'debe' && !(e === 'pendiente' || e === 'parcial')) return false;
        if (pago === 'pagado' && e !== 'pagado') return false;
      }
      return true;
    });
  }
  RENDER.pedidos = function () {
    var barra = '<div class="fila"><label class="buscar">' + ic('buscar') + '<input class="in" id="b-pedidos" type="search" placeholder="Buscar cliente, número o producto" value="' + esc(S.busqueda.pedidos || '') + '"></label>' +
      '<div class="seg" role="group" aria-label="Vista"><button type="button" data-act="vistaPed" data-id="tablero" aria-pressed="' + (S.vistaPedidos === 'tablero') + '">Tablero</button>' +
      '<button type="button" data-act="vistaPed" data-id="lista" aria-pressed="' + (S.vistaPedidos === 'lista') + '">Lista</button></div>' +
      (verPrecios() ? '<select class="in" id="f-pago" style="width:auto"><option value="">Todos los pagos</option><option value="debe"' + (S.busqueda.pago === 'debe' ? ' selected' : '') + '>Deben</option><option value="pagado"' + (S.busqueda.pago === 'pagado' ? ' selected' : '') + '>Pagados</option></select>' : '') +
      '<button class="btn" type="button" data-act="hojaRuta" style="margin-left:auto">' + ic('camion') + 'Hoja de ruta</button></div>';
    return barra + (S.vistaPedidos === 'lista' ? listaPedidos() : tableroPedidos());
  };
  ALABRIR.pedidos = function (r) {
    var b = $('#b-pedidos', r);
    b.addEventListener('input', function () { S.busqueda.pedidos = b.value; render(); });
    var f = $('#f-pago', r);
    if (f) f.addEventListener('change', function () { S.busqueda.pago = f.value; render(); });
    // Arrastrar tarjetas entre columnas (PC)
    $$('.ped[draggable="true"]', r).forEach(function (c) {
      c.addEventListener('dragstart', function (e) { e.dataTransfer.setData('text/plain', c.getAttribute('data-id')); e.dataTransfer.effectAllowed = 'move'; });
    });
    $$('.col', r).forEach(function (col) {
      col.addEventListener('dragover', function (e) { e.preventDefault(); col.classList.add('sobre'); });
      col.addEventListener('dragleave', function () { col.classList.remove('sobre'); });
      col.addEventListener('drop', function (e) {
        e.preventDefault(); col.classList.remove('sobre');
        var p = IDX.pedido[e.dataTransfer.getData('text/plain')], a = col.getAttribute('data-estado');
        if (!p || p.estado === a) return;
        if (!puedeMover(p.estado, a)) { toast('Tu usuario no puede pasar el pedido de "' + ESTADO[p.estado].t + '" a "' + ESTADO[a].t + '".', true); return; }
        moverPedido(p.id, a);
      });
    });
  };
  function moverPedido(id, estado, btn) {
    var p = IDX.pedido[id];
    return accion(btn, 'cambiarEstado', { id: id, estado: estado }, nroPedido(p.numero) + ' → ' + ESTADO[estado].t);
  }
  function tableroPedidos() {
    var hoy = D.hoy;
    var lista = filtrarPedidos(D.pedidos);
    var cols = ['nuevo', 'preparacion', 'listo', 'encamino', 'entregado'];
    if (rol() === 'deposito') cols = ['nuevo', 'preparacion', 'listo'];
    if (rol() === 'reparto') cols = ['listo', 'encamino', 'entregado'];
    if (cols.indexOf(S.colMovil) < 0) S.colMovil = cols.filter(function (e) { return lista.some(function (p) { return p.estado === e; }); })[0] || cols[0];
    var CORTO = { nuevo: 'Nuevos', preparacion: 'Prepar.', listo: 'Listos', encamino: 'En camino', entregado: 'Entreg.' };
    var html = '<div class="seg seg-scroll tabs-estado solo-movil" role="tablist">' + cols.map(function (e) {
      var n = lista.filter(function (p) { return p.estado === e && (e !== 'entregado' || QG.pendiente(p) > 0 || diasDesde(p.actualizado, hoy) <= 7); }).length;
      return '<button type="button" class="st-' + e + '" data-act="colMovil" data-id="' + e + '" aria-pressed="' + (S.colMovil === e) + '">' + CORTO[e] + ' <span class="cuenta">' + n + '</span></button>';
    }).join('') + '</div>';
    html += '<div class="tablero-wrap"><div class="tablero" style="' + (cols.length < 5 ? 'grid-template-columns:repeat(' + cols.length + ',minmax(230px,1fr));min-width:' + cols.length * 240 + 'px' : '') + '">';
    cols.forEach(function (e) {
      var ps = lista.filter(function (p) {
        if (p.estado !== e) return false;
        // en "Entregado" solo los últimos 7 días o los que deben
        if (e === 'entregado') return QG.pendiente(p) > 0 || diasDesde(p.actualizado, hoy) <= 7;
        return true;
      }).sort(function (a, b) { return (a.fechaEntrega || '9') < (b.fechaEntrega || '9') ? -1 : (a.fechaEntrega || '9') > (b.fechaEntrega || '9') ? 1 : a.numero - b.numero; });
      html += '<section class="col st-' + e + (S.colMovil !== e ? ' oculta-movil' : '') + '" data-estado="' + e + '" aria-label="' + ESTADO[e].t + '"><div class="col-head">' + ESTADO[e].t + '<span class="n">' + ps.length + '</span></div>' +
        (ps.length ? ps.map(tarjetaPedido).join('') : '<p class="vacio" style="padding:14px 4px">Sin pedidos</p>') + '</section>';
    });
    return html + '</div></div>';
  }
  function tarjetaPedido(p) {
    var items = p.items || [];
    var sig = ESTADO[p.estado].sig;
    var tarde = p.fechaEntrega && p.fechaEntrega < D.hoy && p.estado !== 'entregado';
    var mostrar = rol() === 'deposito' ? items : items.slice(0, 3);
    return '<article class="ped st-' + p.estado + '" data-act="verPedido" data-id="' + p.id + '" draggable="true" tabindex="0">' +
      '<div class="l1"><span class="cli">' + esc(p.clienteNombre) + '</span><span class="nro">' + (p.origen === 'web' ? '<span class="chip plano web" title="Pedido de la tienda online">Web</span> ' : '') + nroPedido(p.numero) + '</span></div>' +
      (p.arrepentimiento ? '<div class="chip plano pg-pendiente" style="margin-bottom:4px">Arrepentimiento</div>' : '') +
      '<ul>' + mostrar.map(function (i) { return '<li>' + cant(i.cantidad) + ' × ' + esc(i.nombre) + (i.presentacion ? ' ' + esc(i.presentacion) : '') + '</li>'; }).join('') +
      (items.length > mostrar.length ? '<li>+ ' + (items.length - mostrar.length) + ' productos más</li>' : '') + '</ul>' +
      '<div class="l3">' + (verPrecios() ? '<span class="tot">' + pesos(p.total) + '</span>' + chipPago(p) : '') +
      (p.fechaEntrega ? '<span class="' + (tarde ? 'tarde' : 'muted') + '" style="font-size:.75rem">' + (tarde ? 'Atrasado ' : 'Entrega ') + fechaCorta(p.fechaEntrega) + '</span>' : '') + '</div>' +
      (sig && puedeMover(p.estado, sig) ? '<button class="btn chico avanzar" type="button" data-act="avanzar" data-id="' + p.id + '">' + ESTADO[p.estado].btn + ' →</button>' : '') +
      '</article>';
  }
  ACT.colMovil = function (e) { S.colMovil = e; render(); };
  ACT.avanzar = function (id, btn) { var p = IDX.pedido[id]; moverPedido(id, ESTADO[p.estado].sig, btn); };
  function listaPedidos() {
    var lista = filtrarPedidos(D.pedidos).slice().sort(function (a, b) { return b.numero - a.numero; });
    if (!lista.length) return '<p class="vacio">No hay pedidos que coincidan.</p>';
    return '<div class="tabla-wrap"><table class="t"><thead><tr><th>N°</th><th>Fecha</th><th>Cliente</th><th>Estado</th>' +
      (verPrecios() ? '<th class="der">Total</th><th class="der">Saldo</th><th>Pago</th>' : '<th>Productos</th>') + '<th>Entrega</th></tr></thead><tbody>' +
      lista.map(function (p) {
        return '<tr class="clic" data-act="verPedido" data-id="' + p.id + '"><td class="mono">' + nroPedido(p.numero) + '</td><td class="num">' + fechaCorta(p.creado) + '</td><td>' + esc(p.clienteNombre) + '</td><td>' + chipEstado(p.estado) + '</td>' +
          (verPrecios() ? '<td class="der num">' + pesos(p.total) + '</td><td class="der num">' + (QG.pendiente(p) ? pesos(QG.pendiente(p)) : '—') + '</td><td>' + chipPago(p) + '</td>' : '<td>' + (p.items || []).length + '</td>') +
          '<td class="num">' + fechaCorta(p.fechaEntrega) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  /* ============================================================
   * 8. EDITOR DE PEDIDO (precios, envío y total en vivo)
   * ============================================================ */
  function editorPedido(id, base) {
    var p = id ? IDX.pedido[id] : null;
    var b = base || {};
    var E = {
      id: p ? p.id : null,
      clienteId: p ? p.clienteId : b.clienteId || '',
      tipoPrecio: p ? p.tipoPrecio : 'mayorista',
      items: (p ? p.items : b.items || []).map(function (i) {
        var prod = IDX.prod[i.productoId];
        var lista = prod ? precioLista(prod, p ? p.tipoPrecio : 'mayorista', i.cantidad) : num(i.precio);
        return { productoId: i.productoId, cantidad: i.cantidad, precio: p ? num(i.precio) : lista, manual: p ? num(i.precio) !== lista : false };
      }).filter(function (i) { return IDX.prod[i.productoId]; }),
      descuentoPct: p ? num(p.descuentoPct) : 0,
      zonaId: p ? p.zonaId : '', distanciaKm: p ? num(p.distanciaKm) : 0,
      envioManual: p ? p.envioManual === 'si' : false, envio: p ? num(p.envio) : 0,
      fechaEntrega: p ? p.fechaEntrega : '', notas: p ? p.notas : ''
    };
    if (!p && E.clienteId) elegirCliente(E, E.clienteId);
    abrirModal({
      tam: 'lg',
      titulo: p ? 'Editar pedido ' + nroPedido(p.numero) : 'Nuevo pedido',
      cuerpo: function () { return cuerpoEditor(E); },
      pie: function () { return '<button class="btn" type="button" data-cerrar2>Cancelar</button><button class="btn pri" type="button" id="pe-guardar">' + (p ? 'Guardar cambios' : 'Crear pedido') + '</button>'; },
      alAbrir: function (r, m) { conectarEditor(E, r, m); }
    });
  }
  function precioLista(prod, tipo, cantidad) { return QG.precioItem(prod, tipo, cantidad === undefined ? 1 : cantidad); }
  function elegirCliente(E, id) {
    var c = IDX.cli[id];
    if (!c) return;
    E.clienteId = id;
    E.zonaId = c.zonaId || '';
    E.distanciaKm = num(c.distanciaKm);
    if (E.tipoPrecio !== c.tipoPrecio) cambiarTipoPrecio(E, c.tipoPrecio || 'mayorista');
  }
  function cambiarTipoPrecio(E, tipo) {
    E.tipoPrecio = tipo;
    E.items.forEach(function (i) { if (!i.manual) i.precio = precioLista(IDX.prod[i.productoId], tipo, i.cantidad); });
  }
  function totalesEditor(E) {
    var items = E.items.map(function (i) { var pr = IDX.prod[i.productoId]; return { cantidad: i.cantidad, precio: i.precio, costo: pr ? pr.costo : 0 }; });
    var parcial = QG.calcularTotales(items, E.descuentoPct, 0);
    var envio = E.envioManual ? num(E.envio) : QG.calcularEnvio(IDX.zona[E.zonaId], E.distanciaKm, parcial.subtotal - parcial.descuento);
    return QG.calcularTotales(items, E.descuentoPct, envio);
  }
  function cuerpoEditor(E) {
    return '<div class="pe"><div class="pe-lado">' +
      '<div id="pe-cli"></div>' +
      '<div class="dropdown"><label class="campo"><span>Agregar producto</span>' +
      '<label class="buscar" style="max-width:none">' + ic('buscar') + '<input class="in" id="pe-buscar" type="search" placeholder="Escribí: suavizante, detergente, lavandina…" autocomplete="off"></label></label>' +
      '<div class="resultados" id="pe-res" hidden></div></div>' +
      '<div class="tabla-wrap"><table class="t items"><thead><tr><th>Producto</th><th class="der">Cantidad</th><th class="der">Precio unit.</th><th class="der">Subtotal</th><th></th></tr></thead><tbody id="pe-items"></tbody></table></div>' +
      '<label class="campo"><span>Notas para depósito y reparto</span><textarea class="in" id="pe-notas" placeholder="Ej.: dejar en el portón, trae bidones vacíos">' + esc(E.notas) + '</textarea></label>' +
      '</div><div class="pe-lado">' +
      '<div class="campo"><span>Lista de precios</span><div class="seg" role="group"><button type="button" data-tp="mayorista" aria-pressed="' + (E.tipoPrecio === 'mayorista') + '">Mayorista</button><button type="button" data-tp="minorista" aria-pressed="' + (E.tipoPrecio === 'minorista') + '">Minorista</button></div></div>' +
      '<div class="grid2"><label class="campo"><span>Descuento %</span><input class="in num" id="pe-desc" inputmode="decimal" value="' + (E.descuentoPct || '') + '" placeholder="0"></label>' +
      '<label class="campo"><span>Fecha de entrega</span><input class="in" id="pe-fecha" type="date" value="' + esc(E.fechaEntrega) + '"></label></div>' +
      '<label class="campo"><span>Zona de envío</span><select class="in" id="pe-zona"><option value="">Sin envío (retira en local)</option>' +
      D.zonas.filter(function (z) { return z.activo === 'si' || z.id === E.zonaId; }).map(function (z) { return '<option value="' + z.id + '"' + (z.id === E.zonaId ? ' selected' : '') + '>' + esc(z.nombre) + '</option>'; }).join('') + '</select></label>' +
      '<div class="grid2"><label class="campo"><span>Distancia (km)</span><input class="in num" id="pe-km" inputmode="decimal" value="' + (E.distanciaKm || '') + '" placeholder="0"></label>' +
      '<label class="campo"><span>Envío $</span><input class="in num" id="pe-envio" inputmode="decimal"' + (E.envioManual ? '' : ' readonly') + '></label></div>' +
      '<label class="check"><input type="checkbox" id="pe-envman"' + (E.envioManual ? ' checked' : '') + '> Poner el envío a mano</label>' +
      '<div id="pe-regla" class="muted" style="font-size:.78rem"></div>' +
      '<div class="resumen" id="pe-resumen"></div>' +
      '</div></div>';
  }
  function conectarEditor(E, r, m) {
    var pintarCliente = function () {
      var c = IDX.cli[E.clienteId];
      var cont = $('#pe-cli', r);
      if (!c) {
        cont.innerHTML = '<div class="dropdown"><label class="campo"><span>Cliente</span><label class="buscar" style="max-width:none">' + ic('buscar') +
          '<input class="in" id="pe-bcli" type="search" placeholder="Buscar cliente por nombre o teléfono" autocomplete="off"></label></label><div class="resultados" id="pe-rcli" hidden></div></div>';
        var inp = $('#pe-bcli', r), res = $('#pe-rcli', r);
        var buscar = function () {
          var q = normal(inp.value);
          var lista = D.clientes.filter(function (c) { return c.activo === 'si' && (!q || normal(c.nombre + ' ' + c.telefono + ' ' + c.localidad).indexOf(q) >= 0); }).slice(0, 8);
          res.hidden = false;
          res.innerHTML = lista.map(function (c, i) {
            return '<button type="button" data-cid="' + c.id + '"' + (i === 0 ? ' class="act"' : '') + '><span>' + esc(c.nombre) + '</span><small>' + esc(c.localidad || c.direccion) + ' · ' + (c.tipoPrecio === 'minorista' ? 'Minorista' : 'Mayorista') + '</small></button>';
          }).join('') + '<button type="button" data-cnuevo><span>' + ic('mas') + ' Crear cliente nuevo' + (inp.value ? ': "' + esc(inp.value) + '"' : '') + '</span></button>';
        };
        inp.addEventListener('input', buscar);
        inp.addEventListener('focus', buscar);
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); var a = $('[data-cid]', res); if (a) a.click(); } });
        res.addEventListener('click', function (e) {
          var bt = e.target.closest('[data-cid]');
          if (bt) { elegirCliente(E, bt.getAttribute('data-cid')); pintarCliente(); refrescarTodo(); $('#pe-buscar', r).focus(); return; }
          if (e.target.closest('[data-cnuevo]')) {
            editorCliente(null, { nombre: inp.value }, function (nuevoId) { elegirCliente(E, nuevoId); pintarCliente(); refrescarTodo(); });
          }
        });
        return;
      }
      var d = deudaCliente(c.id);
      var zona = IDX.zona[c.zonaId];
      var aviso = '';
      if (d.entregado > 0) aviso = '<div class="aviso' + (num(c.limiteCredito) && d.entregado + d.enCurso > num(c.limiteCredito) ? ' rojo' : '') + '" style="margin-top:8px">Debe ' + pesos(d.entregado) + (d.enCurso ? ' + ' + pesos(d.enCurso) + ' en pedidos en curso' : '') +
        (num(c.limiteCredito) ? ' · Límite de crédito ' + pesos(c.limiteCredito) : '') + '</div>';
      cont.innerHTML = '<div class="cli-sel"><div><b>' + esc(c.nombre) + '</b><span class="muted" style="font-size:.84rem">' + esc([c.direccion, c.localidad].filter(Boolean).join(', ')) +
        (zona ? ' · ' + esc(zona.nombre) : '') + (c.telefono ? ' · ' + esc(c.telefono) : '') + '</span></div>' +
        (E.id ? '' : '<button class="btn chico" type="button" id="pe-cambiar">Cambiar</button>') + '</div>' + aviso;
      var cb = $('#pe-cambiar', r);
      if (cb) cb.onclick = function () { E.clienteId = ''; pintarCliente(); };
    };

    var pintarItems = function () {
      $('#pe-items', r).innerHTML = E.items.length ? E.items.map(function (i, n) {
        var pr = IDX.prod[i.productoId];
        return '<tr><td><b style="font-weight:500">' + esc(pr.nombre) + '</b> <span class="muted">' + esc(pr.presentacion) + '</span>' +
          (num(pr.minMayorista) && E.tipoPrecio === 'minorista' ? '<br><small class="' + (num(i.cantidad) >= num(pr.minMayorista) ? 'ok-txt' : 'muted') + '">Mayorista desde ' + cant(pr.minMayorista) + ' u.' + (num(i.cantidad) >= num(pr.minMayorista) ? ' ✓' : '') + '</small>' : '') +
          (num(pr.stock) < num(i.cantidad) ? '<br><small class="bajo">Stock: ' + cant(pr.stock) + '</small>' : '') + '</td>' +
          '<td class="cant"><input class="in num" data-n="' + n + '" data-k="cantidad" inputmode="decimal" value="' + i.cantidad + '" aria-label="Cantidad"></td>' +
          '<td class="precio"><input class="in num" data-n="' + n + '" data-k="precio" inputmode="decimal" value="' + i.precio + '" aria-label="Precio unitario"' + (i.manual ? ' title="Precio cambiado a mano" style="border-color:var(--warn)"' : '') + '></td>' +
          '<td class="der num" data-sub="' + n + '">' + pesos(num(i.cantidad) * num(i.precio)) + '</td>' +
          '<td class="acc"><button class="btn icono chico peligro" type="button" data-quitar="' + n + '" aria-label="Quitar">' + ic('x') + '</button></td></tr>';
      }).join('') : '<tr><td colspan="5" class="vacio">Buscá productos arriba para armar el pedido.</td></tr>';
    };

    var pintarResumen = function () {
      var t = totalesEditor(E);
      var zona = IDX.zona[E.zonaId];
      if (!E.envioManual) $('#pe-envio', r).value = t.envio;
      $('#pe-regla', r).textContent = zona && !E.envioManual ? 'Regla de ' + zona.nombre + ': ' + pesos(zona.costoBase) + ' + ' + pesos(zona.costoKm) + ' por km' +
        (num(zona.gratisDesde) ? ' · gratis desde ' + pesos(zona.gratisDesde) : '') : '';
      var gan = t.subtotal - t.descuento - t.costoTotal;
      $('#pe-resumen', r).innerHTML =
        '<div class="r"><span>Subtotal (' + E.items.length + ' productos)</span><span>' + pesos(t.subtotal) + '</span></div>' +
        (t.descuento ? '<div class="r"><span>Descuento ' + cant(E.descuentoPct) + ' %</span><span>− ' + pesos(t.descuento) + '</span></div>' : '') +
        '<div class="r"><span>Envío</span><span>' + (t.envio ? pesos(t.envio) : zona ? 'Gratis' : '—') + '</span></div>' +
        '<div class="r total"><span>Total</span><span>' + pesos(t.total) + '</span></div>' +
        (dolar() ? '<div class="r usd"><span>En dólares (oficial ' + pesos(dolar()) + ')</span><span>' + usd(t.total) + '</span></div>' : '') +
        (verCostos() && t.subtotal ? '<div class="r gan"><span>Costo ' + pesos(t.costoTotal) + '</span><span>Gana ' + pesos(gan) + (t.costoTotal ? ' · ' + Math.round(gan / t.costoTotal * 100) + '% s/costo' : '') + '</span></div>' : '');
      $$('[data-sub]', r).forEach(function (td) { var i = E.items[td.getAttribute('data-sub')]; if (i) td.textContent = pesos(num(i.cantidad) * num(i.precio)); });
    };
    var refrescarTodo = function () {
      pintarItems(); pintarResumen();
      $$('[data-tp]', r).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-tp') === E.tipoPrecio)); });
      $('#pe-zona', r).value = E.zonaId;
      $('#pe-km', r).value = E.distanciaKm || '';
    };

    // Buscador de productos
    var inp = $('#pe-buscar', r), res = $('#pe-res', r);
    var buscarProd = function () {
      var q = normal(inp.value);
      if (!q) { res.hidden = true; return; }
      var palabras = q.split(/\s+/);
      var lista = D.productos.filter(function (p) {
        var t = normal(p.nombre + ' ' + p.presentacion + ' ' + p.categoria + ' ' + p.codigo);
        return p.activo === 'si' && palabras.every(function (w) { return t.indexOf(w) >= 0; });
      }).slice(0, 10);
      res.hidden = false;
      res.innerHTML = lista.length ? lista.map(function (p, i) {
        return '<button type="button" data-pid="' + p.id + '"' + (i === 0 ? ' class="act"' : '') + '><span>' + esc(p.nombre) + ' <small>' + esc(p.presentacion) + '</small></span>' +
          '<small class="num">' + pesos(precioLista(p, E.tipoPrecio)) + ' · stock ' + cant(p.stock) + '</small></button>';
      }).join('') : '<p class="vacio">No hay productos con "' + esc(inp.value) + '".</p>';
    };
    var agregar = function (pid) {
      var ya = E.items.filter(function (i) { return i.productoId === pid; })[0];
      if (ya) ya.cantidad = num(ya.cantidad) + 1;
      else E.items.push({ productoId: pid, cantidad: 1, precio: precioLista(IDX.prod[pid], E.tipoPrecio), manual: false });
      inp.value = ''; res.hidden = true;
      pintarItems(); pintarResumen();
      var idx = E.items.indexOf(ya || E.items[E.items.length - 1]);
      var q = $('[data-n="' + idx + '"][data-k="cantidad"]', r);
      if (q) { q.focus(); q.select(); }
    };
    inp.addEventListener('input', buscarProd);
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); var a = $('[data-pid]', res); if (a) agregar(a.getAttribute('data-pid')); }
    });
    res.addEventListener('click', function (e) { var b = e.target.closest('[data-pid]'); if (b) agregar(b.getAttribute('data-pid')); });
    r.addEventListener('click', function (e) {
      if (!e.target.closest('.dropdown')) { res.hidden = true; var rc = $('#pe-rcli', r); if (rc) rc.hidden = true; }
    });

    // Cantidades y precios
    $('#pe-items', r).addEventListener('input', function (e) {
      var el = e.target, n = el.getAttribute('data-n');
      if (n === null) return;
      var it = E.items[n];
      it[el.getAttribute('data-k')] = num(el.value);
      if (el.getAttribute('data-k') === 'precio') it.manual = num(el.value) !== precioLista(IDX.prod[it.productoId], E.tipoPrecio, it.cantidad);
      if (el.getAttribute('data-k') === 'cantidad' && !it.manual) {
        var nuevo = precioLista(IDX.prod[it.productoId], E.tipoPrecio, it.cantidad);
        if (nuevo !== num(it.precio)) {
          it.precio = nuevo;
          var pin = $('[data-n="' + n + '"][data-k="precio"]', r);
          if (pin) { pin.value = nuevo; pin.classList.add('destello'); setTimeout(function () { pin.classList.remove('destello'); }, 700); }
        }
      }
      pintarResumen();
    });
    $('#pe-items', r).addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.getAttribute('data-k')) { e.preventDefault(); inp.focus(); }
    });
    $('#pe-items', r).addEventListener('click', function (e) {
      var b = e.target.closest('[data-quitar]');
      if (b) { E.items.splice(Number(b.getAttribute('data-quitar')), 1); pintarItems(); pintarResumen(); }
    });
    $$('[data-tp]', r).forEach(function (b) { b.onclick = function () { cambiarTipoPrecio(E, b.getAttribute('data-tp')); refrescarTodo(); }; });
    $('#pe-desc', r).addEventListener('input', function (e) { E.descuentoPct = Math.min(100, Math.max(0, num(e.target.value))); pintarResumen(); });
    $('#pe-fecha', r).addEventListener('change', function (e) { E.fechaEntrega = e.target.value; });
    $('#pe-notas', r).addEventListener('input', function (e) { E.notas = e.target.value; });
    $('#pe-zona', r).addEventListener('change', function (e) { E.zonaId = e.target.value; pintarResumen(); });
    $('#pe-km', r).addEventListener('input', function (e) { E.distanciaKm = num(e.target.value); pintarResumen(); });
    $('#pe-envman', r).addEventListener('change', function (e) {
      E.envioManual = e.target.checked;
      $('#pe-envio', r).readOnly = !E.envioManual;
      if (E.envioManual) { E.envio = num($('#pe-envio', r).value); $('#pe-envio', r).focus(); }
      pintarResumen();
    });
    $('#pe-envio', r).addEventListener('input', function (e) { if (E.envioManual) { E.envio = num(e.target.value); pintarResumen(); } });

    $('[data-cerrar2]', r).onclick = function () { cerrarModal(m); };
    $('#pe-guardar', r).onclick = function () {
      var btn = this;
      if (!E.clienteId) { toast('Elegí un cliente.', true); return; }
      if (!E.items.some(function (i) { return num(i.cantidad) > 0; })) { toast('Agregá al menos un producto con cantidad.', true); return; }
      var t = totalesEditor(E);
      accion(btn, 'guardarPedido', {
        id: E.id, clienteId: E.clienteId, tipoPrecio: E.tipoPrecio,
        items: E.items.map(function (i) { return { productoId: i.productoId, cantidad: i.cantidad, precio: i.precio }; }),
        descuentoPct: E.descuentoPct, zonaId: E.zonaId, distanciaKm: E.distanciaKm,
        envioManual: E.envioManual, envio: t.envio, fechaEntrega: E.fechaEntrega, notas: E.notas
      }, E.id ? 'Pedido actualizado.' : 'Pedido creado. Ya lo ve el depósito.').then(function (res) {
        cerrarModal(m);
        if (!E.id) detallePedido(res.resultado.id);
      }, function () {});
    };

    pintarCliente();
    refrescarTodo();
    if (!E.clienteId) setTimeout(function () { var b = $('#pe-bcli', r); if (b) b.focus(); }, 40);
  }

  /* ============================================================
   * 9. DETALLE DE PEDIDO, WHATSAPP Y REMITO
   * ============================================================ */
  /** Si a un pedido le faltan unidades envasadas y hay litros en el tanque, sugiere envasar. */
  function faltantesEnvasar(p) {
    if (p.estado === 'entregado' || p.estado === 'anulado') return [];
    var pide = {};
    (p.items || []).forEach(function (i) { pide[i.productoId] = (pide[i.productoId] || 0) + num(i.cantidad); });
    return Object.keys(pide).map(function (pid) {
      var pr = IDX.prod[pid];
      if (!pr || pr.modoStock !== 'envasado') return null;
      var t = IDX.prod[pr.granelId];
      var falta = p.stockDescontado === 'si' ? Math.max(0, -num(pr.stock)) : Math.max(0, pide[pid] - num(pr.stock));
      if (!falta || !t) return null;
      var alcanza = Math.max(0, Math.floor(num(t.stock) / QG.contenidoDe(pr) + 1e-9));
      return { p: pr, t: t, falta: Math.ceil(falta), alcanza: alcanza };
    }).filter(Boolean);
  }
  function avisoEnvasar(p) {
    var f = faltantesEnvasar(p);
    if (!f.length) return '';
    return '<div class="aviso envasar">' + f.map(function (x) {
      return '<div class="fila"><span>' + ic('matraz') + 'Faltan <b>' + x.falta + ' × ' + esc(x.p.nombre) + ' ' + esc(x.p.presentacion) + '</b>. ' +
        (x.alcanza ? 'En el tanque hay ' + cant(x.t.stock) + ' L (alcanza para ' + x.alcanza + ').' : 'El tanque está vacío: hay que producir.') + '</span>' +
        (x.alcanza && puedeEnvasar() ? '<button class="btn chico pri" type="button" data-envasar="' + x.p.id + '" data-cant="' + Math.min(x.falta, x.alcanza) + '" style="margin-left:auto">Envasar ' + Math.min(x.falta, x.alcanza) + '</button>' : '') + '</div>';
    }).join('') + '</div>';
  }
  function detallePedido(id) {
    abrirModal({
      tam: 'md', refrescable: true, sinFoco: true,
      titulo: function () {
        var p = IDX.pedido[id];
        return p ? 'Pedido ' + nroPedido(p.numero) + ' ' + chipEstado(p.estado) + (verPrecios() ? chipPago(p) : '') : 'Pedido';
      },
      cuerpo: function () {
        var p = IDX.pedido[id];
        if (!p) return '<p class="vacio">Este pedido ya no está disponible.</p>';
        var c = IDX.cli[p.clienteId] || {};
        var zona = IDX.zona[p.zonaId];
        var pagos = D.pagos.filter(function (x) { return x.pedidoId === p.id; });
        var vp = verPrecios();
        return '<div class="cli-sel"><div><b>' + esc(p.clienteNombre) + '</b><span class="muted" style="font-size:.85rem">' +
          esc([c.direccion, c.localidad].filter(Boolean).join(', ')) + (zona ? ' · ' + esc(zona.nombre) : '') + (c.telefono ? ' · ' + esc(c.telefono) : '') + '</span></div>' +
          (puede('clientes') ? '<button class="btn chico" type="button" data-act="verCliente" data-id="' + p.clienteId + '">Ver cuenta</button>' : '') + '</div>' +
          '<div class="fila muted" style="font-size:.84rem">Creado ' + fechaHora(p.creado) + ' por ' + (p.origen === 'web' ? '<b style="color:var(--text)">la tienda online</b>' : esc((IDX.usr[p.creadoPor] || {}).nombre || '—')) +
          (p.fechaEntrega ? ' · Entrega: <b style="color:var(--text)">' + fechaCorta(p.fechaEntrega) + '</b>' : '') + ' · Lista ' + esc(p.tipoPrecio) + '</div>' +
          (p.notas ? '<div class="aviso">' + esc(p.notas) + '</div>' : '') + avisoEnvasar(p) +
          '<div class="tabla-wrap"><table class="t"><thead><tr><th>Producto</th><th class="der">Cant.</th>' + (vp ? '<th class="der">Precio</th><th class="der">Subtotal</th>' : '') + '</tr></thead><tbody>' +
          (p.items || []).map(function (i) {
            return '<tr><td>' + esc(i.nombre) + ' <span class="muted">' + esc(i.presentacion) + '</span></td><td class="der num"><b>' + cant(i.cantidad) + '</b></td>' +
              (vp ? '<td class="der num">' + pesos(i.precio) + '</td><td class="der num">' + pesos(num(i.precio) * num(i.cantidad)) + '</td>' : '') + '</tr>';
          }).join('') + '</tbody></table></div>' +
          (vp ? '<div class="resumen" style="max-width:340px;margin-left:auto;width:100%">' +
            '<div class="r"><span>Subtotal</span><span>' + pesos(p.subtotal) + '</span></div>' +
            (num(p.descuento) ? '<div class="r"><span>Descuento ' + cant(p.descuentoPct) + ' %</span><span>− ' + pesos(p.descuento) + '</span></div>' : '') +
            '<div class="r"><span>Envío</span><span>' + (num(p.envio) ? pesos(p.envio) : 'Gratis / retira') + '</span></div>' +
            '<div class="r total"><span>Total</span><span>' + pesos(p.total) + '</span></div>' +
            (num(p.cotizacion) || dolar() ? '<div class="r usd"><span>En dólares (a ' + pesos(num(p.cotizacion) || dolar()) + ')</span><span>' + usd(p.total, p.cotizacion) + '</span></div>' : '') +
            '<div class="r"><span>Pagado</span><span>' + pesos(p.pagado) + '</span></div>' +
            '<div class="r" style="font-weight:600;color:' + (QG.pendiente(p) ? 'var(--danger)' : 'var(--ok)') + '"><span>Saldo</span><span>' + pesos(QG.pendiente(p)) + '</span></div>' +
            (verCostos() ? '<div class="r gan"><span>Costo ' + pesos(p.costoTotal) + '</span><span>Ganancia ' + pesos(num(p.subtotal) - num(p.descuento) - num(p.costoTotal)) + '</span></div>' : '') + '</div>' : '') +
          (pagos.length ? '<section><h3 style="font-size:.9rem;margin-bottom:6px">Pagos</h3><div class="lista-simple">' + pagos.map(function (x) {
            return '<div><span>' + fechaCorta(x.fecha) + ' · ' + MEDIO[x.medio] + textoPagoUsd(x) + (x.nota ? ' · <span class="muted">' + esc(x.nota) + '</span>' : '') + '</span><span class="fila"><b class="num">' + pesos(x.monto) + '</b>' +
              (esAdmin() ? '<button class="btn icono chico peligro" type="button" data-act="borrarPago" data-id="' + x.id + '" aria-label="Eliminar pago">' + ic('basura') + '</button>' : '') + '</span></div>';
          }).join('') + '</div></section>' : '') +
          '<details><summary class="muted" style="cursor:pointer;font-size:.85rem">Historial del pedido</summary><div class="timeline" style="margin-top:8px">' +
          (p.historial || []).slice().reverse().map(function (h) { return '<div><span class="muted num">' + fechaHora(h.f) + '</span><span>' + esc(h.u) + ': ' + esc(h.a) + '</span></div>'; }).join('') + '</div></details>';
      },
      pie: function () {
        var p = IDX.pedido[id];
        if (!p) return '';
        var sig = ESTADO[p.estado].sig;
        var html = '';
        if (verPrecios()) {
          html += '<a class="btn wa" target="_blank" rel="noopener" href="' + esc(linkWa((IDX.cli[p.clienteId] || {}).telefono, textoWhatsApp(p))) + '">' + ic('wa') + 'WhatsApp</a>';
          html += '<button class="btn" type="button" data-pac="remito">' + ic('imprimir') + 'Remito</button>';
        }
        if (puede('pagos') && QG.pendiente(p) > 0) html += '<button class="btn" type="button" data-pac="cobrar">' + ic('pesos') + 'Cobrar</button>';
        if (puede('pedidos')) {
          if (p.estado !== 'anulado' && (p.estado !== 'entregado' || esAdmin())) html += '<button class="btn" type="button" data-pac="editar">' + ic('editar') + 'Editar</button>';
          html += '<button class="btn" type="button" data-pac="repetir">' + ic('repetir') + 'Repetir</button>';
        }
        var otros = QG.ESTADOS.filter(function (e) { return e !== p.estado && e !== sig && puedeMover(p.estado, e); });
        if (otros.length) html += '<select class="in" data-pac="estado" style="width:auto" aria-label="Cambiar estado"><option value="">Cambiar estado…</option>' +
          otros.map(function (e) { return '<option value="' + e + '">' + ESTADO[e].t + '</option>'; }).join('') + '</select>';
        if (sig && puedeMover(p.estado, sig)) html += '<button class="btn pri" type="button" data-pac="avanzar">' + ESTADO[p.estado].btn + ' →</button>';
        return html;
      },
      alAbrir: function (r, m) {
        var p = IDX.pedido[id];
        if (!p) return;
        $$('[data-envasar]', r).forEach(function (b) { b.onclick = function () { modalEnvasar(b.getAttribute('data-envasar'), b.getAttribute('data-cant')); }; });
        $$('[data-pac]', r).forEach(function (el) {
          var a = el.getAttribute('data-pac');
          if (a === 'estado') {
            el.onchange = function () {
              var e = el.value; if (!e) return;
              if (e === 'anulado') confirmar('¿Anular el pedido ' + nroPedido(p.numero) + '? Si ya estaba preparado, el stock vuelve al depósito.', 'Anular pedido', function () { moverPedido(id, e); }, true);
              else moverPedido(id, e);
              el.value = '';
            };
            return;
          }
          el.onclick = function () {
            if (a === 'avanzar') moverPedido(id, ESTADO[p.estado].sig, el);
            if (a === 'cobrar') modalPago({ pedidoId: id, clienteId: p.clienteId });
            if (a === 'editar') { cerrarModal(m); editorPedido(id); }
            if (a === 'repetir') { cerrarModal(m); editorPedido(null, { clienteId: p.clienteId, items: p.items }); }
            if (a === 'remito') modalRemito(id);
          };
        });
      }
    });
  }

  function textoPagoUsd(x) { return x.moneda === 'USD' ? ' · <b>US$ ' + fmtUsd.format(num(x.montoMoneda)) + '</b> <span class="muted">a ' + pesos(x.cotizacion) + '</span>' : ''; }
  function textoWhatsApp(p) {
    var lineas = ['*' + (D.config.empresa || 'Pedido') + '*', 'Pedido ' + nroPedido(p.numero) + ' · ' + fechaCorta(p.creado), 'Cliente: ' + p.clienteNombre, ''];
    (p.items || []).forEach(function (i) {
      lineas.push('• ' + cant(i.cantidad) + ' × ' + i.nombre + (i.presentacion ? ' ' + i.presentacion : '') + ' — ' + pesos(num(i.cantidad) * num(i.precio)));
    });
    lineas.push('');
    lineas.push('Subtotal: ' + pesos(p.subtotal));
    if (num(p.descuento)) lineas.push('Descuento (' + cant(p.descuentoPct) + ' %): −' + pesos(p.descuento));
    lineas.push('Envío: ' + (num(p.envio) ? pesos(p.envio) : 'sin cargo'));
    lineas.push('*TOTAL: ' + pesos(p.total) + '*');
    if (mostrarUsd()) lineas.push('Equivale a ' + usd(p.total, p.cotizacion) + ' (dólar oficial ' + pesos(num(p.cotizacion) || dolar()) + ')');
    if (num(p.pagado)) lineas.push('Pagado: ' + pesos(p.pagado) + ' · Saldo: ' + pesos(QG.pendiente(p)));
    if (p.fechaEntrega) lineas.push('Entrega: ' + fechaCorta(p.fechaEntrega));
    if (D.config.alias || D.config.cbu) { lineas.push(''); lineas.push('Para transferir: ' + [D.config.alias && 'Alias ' + D.config.alias, D.config.cbu && 'CBU ' + D.config.cbu].filter(Boolean).join(' · ')); }
    lineas.push('¡Gracias por tu compra!');
    return lineas.join('\n');
  }

  function htmlRemito(p, formato) {
    var c = IDX.cli[p.clienteId] || {};
    var cfg = D.config;
    if (formato === 'ticket') {
      return '<div class="doc ticket"><div class="c"><img class="doc-logo" src="' + LOGO_URL + '" alt=""></div><h1>' + esc(cfg.empresa || '') + '</h1><div class="c">' + esc(cfg.direccion || '') + (cfg.telefono ? '<br>Tel. ' + esc(cfg.telefono) : '') +
        '</div><hr><div>REMITO ' + nroRemito(p.numero) + '<br>Fecha: ' + fechaCorta(p.creado) + '<br>Cliente: ' + esc(p.clienteNombre) + (c.direccion ? '<br>' + esc(c.direccion) : '') +
        '</div><hr><table>' + (p.items || []).map(function (i) {
          return '<tr><td colspan="2">' + esc(i.nombre) + ' ' + esc(i.presentacion) + '</td></tr><tr><td>' + cant(i.cantidad) + ' x ' + pesos(i.precio) + '</td><td class="der">' + pesos(num(i.cantidad) * num(i.precio)) + '</td></tr>';
        }).join('') + '</table><hr><table><tr><td>Subtotal</td><td class="der">' + pesos(p.subtotal) + '</td></tr>' +
        (num(p.descuento) ? '<tr><td>Descuento</td><td class="der">-' + pesos(p.descuento) + '</td></tr>' : '') +
        '<tr><td>Envío</td><td class="der">' + pesos(p.envio) + '</td></tr><tr><td><b>TOTAL</b></td><td class="der"><b>' + pesos(p.total) + '</b></td></tr>' +
        (mostrarUsd() ? '<tr><td>En dólares</td><td class="der">' + usd(p.total, p.cotizacion) + '</td></tr>' : '') +
        (num(p.pagado) ? '<tr><td>Pagado</td><td class="der">' + pesos(p.pagado) + '</td></tr><tr><td>Saldo</td><td class="der">' + pesos(QG.pendiente(p)) + '</td></tr>' : '') +
        '</table><hr><div class="c">' + esc(cfg.pieRemito || 'Documento no válido como factura') + '<br><br>Firma: ____________</div></div>';
    }
    return '<div class="doc">' +
      '<div class="enc"><div class="enc-marca"><img class="doc-logo" src="' + LOGO_URL + '" alt=""><div><h1>' + esc(cfg.empresa || '') + '</h1>' + esc(cfg.direccion || '') + '<br>' + (cfg.telefono ? 'Tel. ' + esc(cfg.telefono) : '') + (cfg.cuit ? ' · CUIT ' + esc(cfg.cuit) : '') + '</div></div>' +
      '<div class="letra">R</div><div style="text-align:right"><b style="font-size:15px">REMITO</b><br>N° ' + nroRemito(p.numero) + '<br>Fecha: ' + fechaCorta(p.creado) + '<br>Pedido ' + nroPedido(p.numero) + '</div></div>' +
      '<div class="bloque"><div><b>Cliente:</b> ' + esc(p.clienteNombre) + '<br><b>Dirección:</b> ' + esc([c.direccion, c.localidad].filter(Boolean).join(', ')) + '</div>' +
      '<div><b>Tel.:</b> ' + esc(c.telefono || '') + '<br><b>Entrega:</b> ' + fechaCorta(p.fechaEntrega || p.creado) + '</div></div>' +
      '<table style="margin-top:10px"><thead><tr><th>Cant.</th><th>Producto</th><th>Presentación</th><th class="der">Precio unit.</th><th class="der">Importe</th></tr></thead><tbody>' +
      (p.items || []).map(function (i) {
        return '<tr><td>' + cant(i.cantidad) + '</td><td>' + esc(i.nombre) + '</td><td>' + esc(i.presentacion) + '</td><td class="der">' + pesos(i.precio) + '</td><td class="der">' + pesos(num(i.cantidad) * num(i.precio)) + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<div class="totales"><div><span>Subtotal</span><span>' + pesos(p.subtotal) + '</span></div>' +
      (num(p.descuento) ? '<div><span>Descuento ' + cant(p.descuentoPct) + ' %</span><span>-' + pesos(p.descuento) + '</span></div>' : '') +
      '<div><span>Envío</span><span>' + pesos(p.envio) + '</span></div><div class="g"><span>TOTAL</span><span>' + pesos(p.total) + '</span></div>' +
      (mostrarUsd() ? '<div><span>Equivale (dólar oficial ' + pesos(num(p.cotizacion) || dolar()) + ')</span><span>' + usd(p.total, p.cotizacion) + '</span></div>' : '') +
      (num(p.pagado) ? '<div><span>Pagado</span><span>' + pesos(p.pagado) + '</span></div><div><span>Saldo</span><span>' + pesos(QG.pendiente(p)) + '</span></div>' : '') + '</div>' +
      (p.notas ? '<p><b>Observaciones:</b> ' + esc(p.notas) + '</p>' : '') +
      '<div class="firmas"><div>Firma y aclaración de quien recibe</div><div>Fecha de recepción</div></div>' +
      '<p class="pie">' + esc(cfg.pieRemito || 'Documento no válido como factura.') + (cfg.alias ? ' · Alias para transferir: ' + esc(cfg.alias) : '') + '</p></div>';
  }
  function imprimir(html, formato) {
    $('#imprimir').innerHTML = html;
    var st = $('#estilo-pagina');
    st.textContent = formato === 'ticket' ? '@page { size: 80mm auto; margin: 3mm; }' : formato === 'etiquetas' ? '@page { size: A4; margin: 5mm; }' : '@page { size: A4; margin: 14mm; }';
    window.print();
  }
  function modalRemito(id) {
    var formato = D.config.formatoRemito === 'ticket' ? 'ticket' : 'a4';
    abrirModal({
      tam: 'md', titulo: 'Remito', sinFoco: true,
      cuerpo: function () {
        return '<div class="fila"><div class="seg" role="group" aria-label="Formato"><button type="button" data-fmt="a4" aria-pressed="' + (formato === 'a4') + '">Hoja A4</button><button type="button" data-fmt="ticket" aria-pressed="' + (formato === 'ticket') + '">Ticket 80 mm</button></div>' +
          '<span class="muted" style="font-size:.8rem">Para PDF: Imprimir → "Guardar como PDF".</span></div><div class="vista-previa">' + htmlRemito(IDX.pedido[id], formato) + '</div>';
      },
      pie: function () { return '<button class="btn" type="button" data-copiar>' + ic('copiar') + 'Copiar texto</button><button class="btn pri" type="button" data-imp>' + ic('imprimir') + 'Imprimir</button>'; },
      alAbrir: function (r, m) {
        $$('[data-fmt]', r).forEach(function (b) { b.onclick = function () { formato = b.getAttribute('data-fmt'); pintarModal(m); }; });
        $('[data-imp]', r).onclick = function () { imprimir(htmlRemito(IDX.pedido[id], formato), formato); };
        $('[data-copiar]', r).onclick = function () { copiarTexto(textoWhatsApp(IDX.pedido[id])); };
      }
    });
  }
  function copiarTexto(t) {
    var hecho = function () { toast('Texto copiado. Pegalo en WhatsApp o donde quieras.'); };
    try {
      navigator.clipboard.writeText(t).then(hecho, function () { fallbackCopiar(t); hecho(); });
    } catch (e) { fallbackCopiar(t); hecho(); }
  }
  function fallbackCopiar(t) {
    var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) { /* sin portapapeles */ }
    ta.remove();
  }
  function hojaDeRuta() {
    var lista = D.pedidos.filter(function (p) { return p.estado === 'listo' || p.estado === 'encamino'; })
      .sort(function (a, b) { var za = (IDX.zona[a.zonaId] || {}).nombre || 'zzz', zb = (IDX.zona[b.zonaId] || {}).nombre || 'zzz'; return za < zb ? -1 : za > zb ? 1 : a.numero - b.numero; });
    if (!lista.length) { toast('No hay pedidos listos ni en camino para armar la hoja de ruta.', true); return; }
    var vp = verPrecios();
    var html = '<div class="doc"><div class="enc"><div><h1>Hoja de ruta</h1>' + esc(D.config.empresa || '') + ' · ' + fechaCorta(D.hoy) + '</div><div style="text-align:right">' + lista.length + ' entregas' +
      (vp ? '<br>A cobrar: ' + pesos(lista.reduce(function (s, p) { return s + QG.pendiente(p); }, 0)) : '') + '</div></div>' +
      '<table style="margin-top:10px"><thead><tr><th>Pedido</th><th>Cliente / dirección</th><th>Productos</th>' + (vp ? '<th class="der">A cobrar</th>' : '') + '<th>Firma</th></tr></thead><tbody>' +
      lista.map(function (p) {
        var c = IDX.cli[p.clienteId] || {};
        return '<tr><td>' + nroPedido(p.numero) + '<br><small>' + esc((IDX.zona[p.zonaId] || {}).nombre || 'Retira') + '</small></td><td><b>' + esc(p.clienteNombre) + '</b><br>' + esc([c.direccion, c.localidad].filter(Boolean).join(', ')) + '<br>' + esc(c.telefono || '') + (p.notas ? '<br><i>' + esc(p.notas) + '</i>' : '') + '</td>' +
          '<td>' + (p.items || []).map(function (i) { return cant(i.cantidad) + ' × ' + esc(i.nombre) + ' ' + esc(i.presentacion); }).join('<br>') + '</td>' +
          (vp ? '<td class="der">' + pesos(QG.pendiente(p)) + '</td>' : '') + '<td style="width:110px"></td></tr>';
      }).join('') + '</tbody></table></div>';
    abrirModal({
      tam: 'lg', titulo: 'Hoja de ruta', sinFoco: true,
      cuerpo: function () { return '<div class="vista-previa">' + html + '</div>'; },
      pie: function () { return '<button class="btn pri" type="button" data-imp>' + ic('imprimir') + 'Imprimir hoja de ruta</button>'; },
      alAbrir: function (r) { $('[data-imp]', r).onclick = function () { imprimir(html, 'a4'); }; }
    });
  }

  /* ============================================================
   * 10. PAGOS
   * ============================================================ */
  function modalPago(op) {
    var cliente = IDX.cli[op.clienteId];
    if (!cliente) return;
    var pendientes = D.pedidos.filter(function (p) { return p.clienteId === cliente.id && QG.pendiente(p) > 0; }).sort(function (a, b) { return a.creado < b.creado ? -1 : 1; });
    var deuda = pendientes.reduce(function (s, p) { return s + QG.pendiente(p); }, 0);
    var sugerido = op.pedidoId && IDX.pedido[op.pedidoId] ? QG.pendiente(IDX.pedido[op.pedidoId]) : deuda;
    abrirModal({
      titulo: 'Registrar pago · ' + esc(cliente.nombre),
      cuerpo: function () {
        return '<div class="aviso azul">Deuda total del cliente: <b>' + pesos(deuda) + '</b> en ' + pendientes.length + ' pedido(s). Si el pago supera el pedido elegido, el resto se aplica a los pedidos más viejos.</div>' +
          '<label class="campo"><span>Aplicar primero a</span><select class="in" id="pg-ped"><option value="">Los pedidos más viejos primero</option>' +
          pendientes.map(function (p) { return '<option value="' + p.id + '"' + (p.id === op.pedidoId ? ' selected' : '') + '>' + nroPedido(p.numero) + ' · ' + fechaCorta(p.creado) + ' · debe ' + pesos(QG.pendiente(p)) + '</option>'; }).join('') + '</select></label>' +
          '<div class="campo"><span>Moneda en que paga</span><div class="seg" role="group"><button type="button" data-mon="ARS" aria-pressed="true">Pesos $</button>' +
          '<button type="button" data-mon="USD" aria-pressed="false"' + (dolar() ? '' : ' disabled title="No hay cotización del dólar"') + '>Dólares US$</button></div></div>' +
          '<div class="grid2"><label class="campo"><span id="pg-etq">Monto en pesos</span><input class="in num" id="pg-monto" inputmode="decimal" value="' + sugerido + '" autofocus></label>' +
          '<label class="campo"><span>Medio</span><select class="in" id="pg-medio">' + QG.MEDIOS.map(function (m) { return '<option value="' + m + '">' + MEDIO[m] + '</option>'; }).join('') + '</select></label></div>' +
          '<div class="grid2"><label class="campo"><span>Fecha</span><input class="in" id="pg-fecha" type="date" value="' + D.hoy + '"></label>' +
          '<label class="campo"><span>Nota (opcional)</span><input class="in" id="pg-nota" placeholder="N° de operación, quién pagó…"></label></div>' +
          '<div id="pg-conv" class="muted" style="font-size:.85rem"></div>';
      },
      pie: function () { return '<button class="btn" type="button" data-cerrar2>Cancelar</button><button class="btn ok" type="button" id="pg-ok">Registrar pago</button>'; },
      alAbrir: function (r, m) {
        $('[data-cerrar2]', r).onclick = function () { cerrarModal(m); };
        var moneda = 'ARS';
        var conv = function () {
          var v = num($('#pg-monto', r).value);
          $('#pg-conv', r).innerHTML = !dolar() ? '' : moneda === 'USD'
            ? 'US$ ' + fmtUsd.format(v) + ' × dólar oficial ' + pesos(dolar()) + ' = <b>' + pesos(v * dolar()) + '</b> que se descuentan de la deuda.'
            : 'Equivale a ' + usd(v) + ' (dólar oficial ' + pesos(dolar()) + ').';
        };
        var sugerir = function () {
          var p = IDX.pedido[$('#pg-ped', r).value], ars = p ? QG.pendiente(p) : deuda;
          $('#pg-monto', r).value = moneda === 'USD' ? (Math.ceil(ars / dolar() * 100) / 100) : ars;
          conv();
        };
        $$('[data-mon]', r).forEach(function (b) {
          b.onclick = function () {
            moneda = b.getAttribute('data-mon');
            $$('[data-mon]', r).forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
            $('#pg-etq', r).textContent = moneda === 'USD' ? 'Monto en dólares (US$)' : 'Monto en pesos';
            sugerir();
          };
        });
        $('#pg-ped', r).onchange = sugerir;
        $('#pg-monto', r).addEventListener('input', conv);
        conv();
        $('#pg-monto', r).select();
        $('#pg-ok', r).onclick = function () {
          var v = num($('#pg-monto', r).value);
          accion(this, 'registrarPago', {
            clienteId: cliente.id, pedidoId: $('#pg-ped', r).value, moneda: moneda,
            monto: moneda === 'USD' ? 0 : v, montoMoneda: moneda === 'USD' ? v : 0,
            medio: $('#pg-medio', r).value, fecha: $('#pg-fecha', r).value, nota: $('#pg-nota', r).value
          }).then(function () { cerrarModal(m); }, function () {});
        };
      }
    });
  }

  /* ============================================================
   * 11. CLIENTES Y CUENTA CORRIENTE
   * ============================================================ */
  RENDER.clientes = function () {
    var q = normal(S.busqueda.clientes);
    var lista = D.clientes.filter(function (c) { return !q || normal(c.nombre + ' ' + c.telefono + ' ' + c.direccion + ' ' + c.localidad).indexOf(q) >= 0; })
      .sort(function (a, b) { return a.nombre.localeCompare(b.nombre); });
    return '<div class="fila"><label class="buscar">' + ic('buscar') + '<input class="in" id="b-clientes" type="search" placeholder="Buscar por nombre, teléfono o dirección" value="' + esc(S.busqueda.clientes || '') + '"></label>' +
      (puede('clientes') ? '<button class="btn" type="button" data-act="nuevoCliente" style="margin-left:auto">' + ic('mas') + 'Nuevo cliente</button>' : '') + '</div>' +
      (lista.length ? '<div class="tabla-wrap"><table class="t"><thead><tr><th>Cliente</th><th>Teléfono</th><th>Zona</th><th>Lista</th><th class="der">Debe</th><th class="der">En curso</th></tr></thead><tbody>' +
        lista.map(function (c) {
          var d = deudaCliente(c.id);
          var excedido = num(c.limiteCredito) && d.entregado + d.enCurso > num(c.limiteCredito);
          return '<tr class="clic" data-act="verCliente" data-id="' + c.id + '"><td><b style="font-weight:500">' + esc(c.nombre) + '</b>' + (c.activo !== 'si' ? ' <span class="chip plano">Inactivo</span>' : '') +
            '<br><small class="muted">' + esc([c.direccion, c.localidad].filter(Boolean).join(', ')) + '</small></td><td class="num">' + esc(c.telefono) + '</td><td>' + esc((IDX.zona[c.zonaId] || {}).nombre || '—') + '</td>' +
            '<td>' + (c.tipoPrecio === 'minorista' ? 'Minorista' : 'Mayorista') + '</td>' +
            '<td class="der num' + (d.entregado ? ' bajo' : '') + '">' + (d.entregado ? pesos(d.entregado) : '—') + (excedido ? '<br><small>Límite superado</small>' : '') + '</td>' +
            '<td class="der num">' + (d.enCurso ? pesos(d.enCurso) : '—') + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<p class="vacio">No hay clientes que coincidan. Creá el primero con "Nuevo cliente".</p>');
  };
  ALABRIR.clientes = function (r) { var b = $('#b-clientes', r); b.addEventListener('input', function () { S.busqueda.clientes = b.value; render(); }); };

  function detalleCliente(id) {
    abrirModal({
      tam: 'md', refrescable: true, sinFoco: true,
      titulo: function () { return esc((IDX.cli[id] || {}).nombre || 'Cliente'); },
      cuerpo: function () {
        var c = IDX.cli[id];
        if (!c) return '<p class="vacio">El cliente ya no existe.</p>';
        var d = deudaCliente(id);
        var peds = D.pedidos.filter(function (p) { return p.clienteId === id; }).sort(function (a, b) { return b.numero - a.numero; });
        var pagos = D.pagos.filter(function (x) { return x.clienteId === id; }).sort(function (a, b) { return a.creado < b.creado ? 1 : -1; }).slice(0, 15);
        var zona = IDX.zona[c.zonaId];
        return '<div class="kpis"><div class="kpi' + (d.entregado ? ' alerta' : '') + '"><small>Debe (entregado)</small><b>' + pesos(d.entregado) + '</b><em>' + (d.masViejo ? 'Hace ' + diasDesde(d.masViejo, D.hoy) + ' días el más viejo' : 'Al día') + '</em></div>' +
          '<div class="kpi"><small>En pedidos en curso</small><b>' + pesos(d.enCurso) + '</b><em>Todavía no entregado</em></div>' +
          '<div class="kpi"><small>Límite de crédito</small><b>' + (num(c.limiteCredito) ? pesos(c.limiteCredito) : 'Sin límite') + '</b><em>Lista ' + (c.tipoPrecio === 'minorista' ? 'minorista' : 'mayorista') + '</em></div></div>' +
          '<div class="muted" style="font-size:.86rem">' + esc([c.direccion, c.localidad].filter(Boolean).join(', ') || 'Sin dirección') + (zona ? ' · ' + esc(zona.nombre) + (num(c.distanciaKm) ? ' (' + cant(c.distanciaKm) + ' km)' : '') : '') + (c.telefono ? ' · Tel. ' + esc(c.telefono) : '') + (c.notas ? '<br>' + esc(c.notas) : '') + '</div>' +
          '<section><h3 style="font-size:.9rem;margin-bottom:6px">Pedidos</h3>' + (peds.length ? '<div class="tabla-wrap"><table class="t"><thead><tr><th>N°</th><th>Fecha</th><th>Estado</th><th class="der">Total</th><th class="der">Saldo</th></tr></thead><tbody>' +
            peds.map(function (p) {
              return '<tr class="clic" data-act="verPedido" data-id="' + p.id + '"><td class="mono">' + nroPedido(p.numero) + '</td><td class="num">' + fechaCorta(p.creado) + '</td><td>' + chipEstado(p.estado) + '</td><td class="der num">' + pesos(p.total) + '</td><td class="der num">' + (QG.pendiente(p) ? pesos(QG.pendiente(p)) : '—') + '</td></tr>';
            }).join('') + '</tbody></table></div>' : '<p class="vacio">Todavía no tiene pedidos.</p>') + '</section>' +
          (pagos.length ? '<section><h3 style="font-size:.9rem;margin-bottom:6px">Últimos pagos</h3><div class="lista-simple">' + pagos.map(function (x) {
            return '<div><span>' + fechaCorta(x.fecha) + ' · ' + MEDIO[x.medio] + textoPagoUsd(x) + ' · ' + nroPedido((IDX.pedido[x.pedidoId] || {}).numero) + '</span><b class="num">' + pesos(x.monto) + '</b></div>';
          }).join('') + '</div></section>' : '');
      },
      pie: function () {
        var c = IDX.cli[id];
        if (!c) return '';
        var d = deudaCliente(id);
        var html = '';
        if (d.entregado > 0) html += '<a class="btn wa" target="_blank" rel="noopener" href="' + esc(linkWa(c.telefono, textoRecordatorio(c, d))) + '">' + ic('wa') + 'Recordar deuda</a>';
        if (puede('pagos') && d.entregado + d.enCurso > 0) html += '<button class="btn" type="button" data-cac="cobrar">' + ic('pesos') + 'Registrar pago</button>';
        if (puede('clientes')) html += '<button class="btn" type="button" data-cac="editar">' + ic('editar') + 'Editar</button>';
        if (puede('pedidos')) html += '<button class="btn pri" type="button" data-cac="pedido">' + ic('mas') + 'Nuevo pedido</button>';
        return html;
      },
      alAbrir: function (r, m) {
        $$('[data-cac]', r).forEach(function (b) {
          b.onclick = function () {
            var a = b.getAttribute('data-cac');
            if (a === 'cobrar') modalPago({ clienteId: id });
            if (a === 'editar') editorCliente(id);
            if (a === 'pedido') { cerrarModal(m); editorPedido(null, { clienteId: id }); }
          };
        });
      }
    });
  }
  function textoRecordatorio(c, d) {
    var peds = D.pedidos.filter(function (p) { return p.clienteId === c.id && p.estado === 'entregado' && QG.pendiente(p) > 0; });
    return 'Hola ' + c.nombre + ', te escribimos de *' + (D.config.empresa || 'la química') + '*.\n' +
      'Te recordamos que quedó un saldo pendiente de *' + pesos(d.entregado) + '*:\n' +
      peds.map(function (p) { return '• Pedido ' + nroPedido(p.numero) + ' del ' + fechaCorta(p.fechaEntrega || p.creado) + ': ' + pesos(QG.pendiente(p)); }).join('\n') +
      (D.config.alias || D.config.cbu ? '\n\nPodés transferir a: ' + [D.config.alias && 'Alias ' + D.config.alias, D.config.cbu && 'CBU ' + D.config.cbu].filter(Boolean).join(' · ') : '') +
      '\n¡Muchas gracias!';
  }
  function editorCliente(id, base, alGuardar) {
    var c = id ? IDX.cli[id] : (base || {});
    abrirModal({
      titulo: id ? 'Editar cliente' : 'Nuevo cliente',
      cuerpo: function () {
        return '<label class="campo"><span>Nombre o razón social</span><input class="in" id="c-nombre" value="' + esc(c.nombre || '') + '" autofocus></label>' +
          '<div class="grid2"><label class="campo"><span>Teléfono (WhatsApp)</span><input class="in" id="c-tel" inputmode="tel" value="' + esc(c.telefono || '') + '" placeholder="11 2345-6789"></label>' +
          '<label class="campo"><span>Lista de precios</span><select class="in" id="c-tipo"><option value="mayorista">Mayorista</option><option value="minorista"' + (c.tipoPrecio === 'minorista' ? ' selected' : '') + '>Minorista</option></select></label></div>' +
          '<div class="grid2"><label class="campo"><span>Dirección</span><input class="in" id="c-dir" value="' + esc(c.direccion || '') + '"></label>' +
          '<label class="campo"><span>Localidad</span><input class="in" id="c-loc" value="' + esc(c.localidad || '') + '"></label></div>' +
          '<div class="grid3"><label class="campo"><span>Zona de envío</span><select class="in" id="c-zona"><option value="">Retira en local</option>' +
          D.zonas.map(function (z) { return '<option value="' + z.id + '"' + (z.id === c.zonaId ? ' selected' : '') + '>' + esc(z.nombre) + '</option>'; }).join('') + '</select></label>' +
          '<label class="campo"><span>Distancia (km)</span><input class="in num" id="c-km" inputmode="decimal" value="' + (c.distanciaKm || '') + '"></label>' +
          '<label class="campo"><span>Límite de crédito $</span><input class="in num" id="c-lim" inputmode="decimal" value="' + (c.limiteCredito || '') + '" placeholder="Sin límite"></label></div>' +
          '<label class="campo"><span>Notas</span><textarea class="in" id="c-notas" placeholder="Horario, referencias, forma de pago habitual">' + esc(c.notas || '') + '</textarea></label>' +
          (id ? '<label class="check"><input type="checkbox" id="c-activo"' + (c.activo !== 'no' ? ' checked' : '') + '> Cliente activo</label>' : '');
      },
      pie: function () { return '<button class="btn" type="button" data-cerrar2>Cancelar</button><button class="btn pri" type="button" id="c-ok">Guardar cliente</button>'; },
      alAbrir: function (r, m) {
        $('[data-cerrar2]', r).onclick = function () { cerrarModal(m); };
        $('#c-ok', r).onclick = function () {
          accion(this, 'guardarCliente', {
            id: id, nombre: $('#c-nombre', r).value, telefono: $('#c-tel', r).value, tipoPrecio: $('#c-tipo', r).value,
            direccion: $('#c-dir', r).value, localidad: $('#c-loc', r).value, zonaId: $('#c-zona', r).value,
            distanciaKm: num($('#c-km', r).value), limiteCredito: num($('#c-lim', r).value), notas: $('#c-notas', r).value,
            activo: id ? $('#c-activo', r).checked : true
          }, 'Cliente guardado.').then(function (res) { cerrarModal(m); if (alGuardar) alGuardar(res.resultado.id); }, function () {});
        };
      }
    });
  }

  /* ============================================================
   * 12. COBRANZAS
   * ============================================================ */
  RENDER.cobranzas = function () {
    var deudores = deudoresOrdenados();
    var total = deudores.reduce(function (s, d) { return s + d.deuda.entregado; }, 0);
    var mes = D.hoy.slice(0, 7), cobradoMes = 0, porMedio = {};
    D.pagos.forEach(function (x) { if (String(x.fecha).slice(0, 7) === mes) { cobradoMes += num(x.monto); porMedio[x.medio] = (porMedio[x.medio] || 0) + num(x.monto); } });
    var viejos = deudores.filter(function (d) { return d.dias > 30; });
    var enCurso = D.pedidos.reduce(function (s, p) { return s + (p.estado !== 'entregado' ? QG.pendiente(p) : 0); }, 0);
    var html = '<div class="kpis">' +
      '<div class="kpi alerta"><small>Te deben (mercadería entregada)</small><b>' + pesos(total) + '</b><em>' + deudores.length + ' clientes' + (dolar() ? ' · ' + usd(total) : '') + '</em></div>' +
      '<div class="kpi' + (viejos.length ? ' alerta' : '') + '"><small>Deudas de más de 30 días</small><b>' + pesos(viejos.reduce(function (s, d) { return s + d.deuda.entregado; }, 0)) + '</b><em>' + viejos.length + ' clientes</em></div>' +
      '<div class="kpi"><small>A cobrar en pedidos en curso</small><b>' + pesos(enCurso) + '</b><em>Se cobra al entregar</em></div>' +
      '<div class="kpi"><small>Cobrado este mes</small><b>' + pesos(cobradoMes) + '</b><em>' + (Object.keys(porMedio).map(function (k) { return MEDIO[k] + ' ' + pesos(porMedio[k]); }).join(' · ') || 'Sin cobros') + '</em></div></div>';
    html += '<section class="card" style="padding:0;overflow:hidden"><h2 style="padding:14px 16px 0">Quién debe</h2>' + (deudores.length ? '<div style="overflow-x:auto"><table class="t"><thead><tr><th>Cliente</th><th class="der">Pedidos</th><th class="der">Antigüedad</th><th class="der">Debe</th><th></th></tr></thead><tbody>' +
      deudores.map(function (d) {
        var excedido = num(d.c.limiteCredito) && d.deuda.entregado + d.deuda.enCurso > num(d.c.limiteCredito);
        var clase = d.dias > 60 ? 'pg-pendiente' : d.dias > 30 ? 'pg-parcial' : 'st-nuevo';
        return '<tr><td><button class="lnk" type="button" data-act="verCliente" data-id="' + d.c.id + '">' + esc(d.c.nombre) + '</button>' + (excedido ? ' <span class="chip plano pg-pendiente">Límite superado</span>' : '') + '<br><small class="muted">' + esc(d.c.telefono) + '</small></td>' +
          '<td class="der num">' + d.deuda.pedidos + '</td><td class="der"><span class="chip plano ' + clase + '">' + d.dias + ' días</span></td><td class="der num"><b>' + pesos(d.deuda.entregado) + '</b></td>' +
          '<td class="acc"><a class="btn chico wa" target="_blank" rel="noopener" href="' + esc(linkWa(d.c.telefono, textoRecordatorio(d.c, d.deuda))) + '">' + ic('wa') + '<span class="solo-pc">Recordar</span></a> ' +
          (puede('pagos') ? '<button class="btn chico" type="button" data-act="cobrar" data-id="' + d.c.id + '">' + ic('pesos') + '<span class="solo-pc">Cobrar</span></button>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '<p class="vacio">Nadie te debe. Todo cobrado.</p>') + '</section>';
    var ultimos = D.pagos.slice().sort(function (a, b) { return a.creado < b.creado ? 1 : -1; }).slice(0, 15);
    html += '<section class="card"><h2>Últimos cobros</h2><div class="lista-simple">' + (ultimos.length ? ultimos.map(function (x) {
      return '<div><span>' + fechaCorta(x.fecha) + ' · <button class="lnk" type="button" data-act="verCliente" data-id="' + x.clienteId + '">' + esc((IDX.cli[x.clienteId] || {}).nombre || '—') + '</button> · ' + MEDIO[x.medio] + textoPagoUsd(x) +
        ' <span class="muted">· ' + esc((IDX.usr[x.usuarioId] || {}).nombre || '') + '</span></span><span class="fila"><b class="num">' + pesos(x.monto) + '</b>' +
        (esAdmin() ? '<button class="btn icono chico peligro" type="button" data-act="borrarPago" data-id="' + x.id + '" aria-label="Eliminar pago">' + ic('basura') + '</button>' : '') + '</span></div>';
    }).join('') : '<p class="vacio">Todavía no hay cobros registrados.</p>') + '</div></section>';
    return html;
  };

  /* ============================================================
   * 13. PRODUCTOS (precios mayorista / minorista y stock)
   * ============================================================ */
  RENDER.productos = function () {
    var q = normal(S.busqueda.productos), cat = S.busqueda.cat || '';
    var cats = {};
    D.productos.forEach(function (p) { cats[p.categoria] = (cats[p.categoria] || 0) + 1; });
    var lista = D.productos.filter(function (p) {
      return (!cat || p.categoria === cat) && (!q || normal(p.nombre + ' ' + p.presentacion + ' ' + p.codigo + ' ' + p.categoria).indexOf(q) >= 0);
    }).sort(function (a, b) { return (a.categoria + a.nombre + a.presentacion).localeCompare(b.categoria + b.nombre + b.presentacion); });
    var adm = esAdmin(), vp = verPrecios(), vc = verCostos(), edSt = adm || rol() === 'deposito';
    var ed = function (ok, campo, id) { return ok ? ' data-ed="' + campo + '" data-id="' + id + '" tabindex="0" title="Tocá para cambiarlo"' : ''; };
    S.selProd = S.selProd || {};
    var nSel = Object.keys(S.selProd).filter(function (id) { return S.selProd[id] && IDX.prod[id]; }).length;
    var html = '<div class="fila"><label class="buscar">' + ic('buscar') + '<input class="in" id="b-productos" type="search" placeholder="Buscar producto o código" value="' + esc(S.busqueda.productos || '') + '"></label>' +
      (vp ? '<button class="btn" type="button" data-act="listaPrecios"' + (adm ? '' : ' style="margin-left:auto"') + '>' + ic('imprimir') + 'Lista de precios</button>' : '') +
      (adm ? '<span class="fila" style="margin-left:auto"><button class="btn" type="button" data-act="importar">' + ic('subir') + 'Importar Excel</button><button class="btn" type="button" data-act="aumentar">% Actualizar precios</button>' +
        '<button class="btn pri" type="button" data-act="nuevoProducto">' + ic('mas') + 'Producto</button></span>' : '') + '</div>' +
      '<div class="fila"><button class="btn chico' + (!cat ? ' pri' : '') + '" type="button" data-act="filtroCat" data-id="">Todos (' + D.productos.length + ')</button>' +
      Object.keys(cats).sort().map(function (c) { return '<button class="btn chico' + (cat === c ? ' pri' : '') + '" type="button" data-act="filtroCat" data-id="' + esc(c) + '">' + esc(c) + ' (' + cats[c] + ')</button>'; }).join('') + '</div>' +
      (adm && nSel ? '<div class="aviso rojo fila"><span><b>' + nSel + '</b> producto' + (nSel > 1 ? 's' : '') + ' seleccionado' + (nSel > 1 ? 's' : '') + '</span>' +
        '<button class="btn chico" type="button" data-act="selNinguno" style="margin-left:auto">Quitar selección</button><button class="btn chico peligro" type="button" data-act="borrarSel">' + ic('basura') + 'Eliminar seleccionados</button></div>' : '');
    if (!lista.length) return html + '<p class="vacio">No hay productos. ' + (adm ? 'Cargalos uno por uno o importá tu planilla de Excel.' : '') + '</p>';
    if (adm || edSt) html += '<p class="muted ed-ayuda">' + ic('editar') + 'Cambio rápido: tocá ' + (adm ? 'un precio, el nombre o el stock' : 'el stock') + ', escribí y apretá <kbd>Enter</kbd> (pasa al de abajo) · <kbd>Tab</kbd> al siguiente dato · <kbd>Esc</kbd> cancela.' + (adm ? ' Para todo lo demás, el lápiz.' : '') + '</p>';
    var todos = lista.length && lista.every(function (p) { return S.selProd[p.id]; });
    html += '<div class="tabla-wrap"><table class="t"><thead><tr>' + (adm ? '<th style="width:34px"><input type="checkbox" id="sel-todos" aria-label="Seleccionar todos los que se ven"' + (todos ? ' checked' : '') + '></th>' : '') + '<th>Código</th><th>Producto</th><th>Presentación</th>' +
      (vc ? '<th class="der">Costo</th>' : '') + (vp ? '<th class="der">Mayorista</th><th class="der">Minorista</th>' : '') + (vc ? '<th class="der" title="Ganancia sobre el costo, precio mayorista">Ganancia may.</th>' : '') +
      '<th class="der">Stock</th><th></th></tr></thead><tbody>' +
      lista.map(function (p) {
        var bajo = num(p.stockMinimo) > 0 && num(p.stock) <= num(p.stockMinimo);
        var margen = num(p.costo) ? Math.round((num(p.precioMayorista) - num(p.costo)) / num(p.costo) * 100) : 0;
        var fo = formulaDeProducto(p.id);
        return '<tr' + (p.activo !== 'si' ? ' style="opacity:.55"' : '') + '>' + (adm ? '<td><input type="checkbox" data-sel="' + p.id + '" aria-label="Seleccionar"' + (S.selProd[p.id] ? ' checked' : '') + '></td>' : '') + '<td class="mono"' + ed(adm, 'codigo', p.id) + '>' + (esc(p.codigo) || (adm ? '<span class="muted">—</span>' : '')) + '</td><td><b style="font-weight:500" class="ed-txt"' + ed(adm, 'nombre', p.id) + '>' + esc(p.nombre) + '</b><br><small class="muted">' + esc(p.categoria) + '</small>' + (p.modoStock ? ' <small class="chip plano modo-' + p.modoStock + '">' + MODO_STOCK.filter(function (o) { return o[0] === p.modoStock; })[0][1] + '</small>' : '') + '</td><td' + ed(adm, 'presentacion', p.id) + '>' + (esc(p.presentacion) || (adm ? '<span class="muted">—</span>' : '')) + '</td>' +
          (vc ? '<td class="der num"' + ed(adm && !fo, 'costo', p.id) + '>' + pesos(p.costo) + '</td>' : '') +
          (vp ? '<td class="der num"' + ed(adm, 'precioMayorista', p.id) + '>' + pesos(p.precioMayorista) + (dolar() ? '<br><small class="muted">' + usd(p.precioMayorista) + '</small>' : '') + (num(p.minMayorista) ? '<br><small class="chip plano st-listo" title="Precio mayorista para cualquier cliente que lleve esta cantidad o más">desde ' + cant(p.minMayorista) + ' u.</small>' : '') + '</td><td class="der num"' + ed(adm, 'precioMinorista', p.id) + '>' + pesos(p.precioMinorista) + (dolar() ? '<br><small class="muted">' + usd(p.precioMinorista) + '</small>' : '') + '</td>' : '') +
          (vc ? '<td class="der num">' + (num(p.costo) ? '<span class="' + (fo && margen < num(fo.margenMay) ? 'bajo' : '') + '">' + margen + ' %</span>' : '—') + (fo ? '<br><small class="muted" title="El costo sale de la fórmula ' + esc(fo.nombre) + '">⚗ fórmula</small>' : '') + '</td>' : '') +
          '<td class="der num' + (bajo ? ' bajo' : '') + '"' + ed(edSt && p.modoStock !== 'granel', 'stock', p.id) + '>' + stockVisible(p) + (p.modoStock === 'envasado' && puedeEnvasar() ? '<br><button class="lnk envasar-lnk" type="button" data-act="envasar" data-id="' + p.id + '" title="Pasar litros del tanque a unidades">' + ic('matraz') + 'Envasar</button>' : '') + '</td>' +
          '<td class="acc">' +
          ((adm || rol() === 'deposito') && p.modoStock !== 'granel' ? '<button class="btn chico" type="button" data-act="stock" data-id="' + p.id + '">Stock</button> ' : '') +
          (adm ? '<button class="btn chico icono" type="button" data-act="editarProducto" data-id="' + p.id + '" aria-label="Editar">' + ic('editar') + '</button>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    return html;
  };
  ALABRIR.productos = function (r) {
    var b = $('#b-productos', r);
    b.addEventListener('input', function () { S.busqueda.productos = b.value; render(); });
    $$('[data-sel]', r).forEach(function (c) { c.onchange = function () { S.selProd[c.getAttribute('data-sel')] = c.checked; render(); }; });
    var t = $('#sel-todos', r);
    if (t) t.onchange = function () { $$('[data-sel]', r).forEach(function (c) { S.selProd[c.getAttribute('data-sel')] = t.checked; }); render(); };
    $$('[data-ed]', r).forEach(function (c) {
      c.onclick = function (ev) { if (ev.target.closest('[data-act]') !== null && ev.target.closest('[data-act]') !== c) return; ev.stopPropagation(); editarEnLinea(c); };
      c.onkeydown = function (ev) { if (ev.key === 'Enter' || ev.key === 'F2') { ev.preventDefault(); editarEnLinea(c); } };
    });
    if (S.edSiguiente) {
      var sig = $('[data-ed="' + S.edSiguiente.campo + '"][data-id="' + S.edSiguiente.id + '"]', r);
      S.edSiguiente = null;
      if (sig) editarEnLinea(sig);
    }
  };
  /** Lee un número escrito a la argentina: "1.500", "1.500,50", "$ 2500", "12,5". */
  function leerNumero(t) {
    t = String(t || '').replace(/[$\s]/g, '');
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, '');
    return t.replace(',', '.');
  }
  /* Edición rápida en la tabla de productos: un dato por vez, sin abrir el editor. */
  function editarEnLinea(celda) {
    if (S.edicion) return;
    var id = celda.getAttribute('data-id'), campo = celda.getAttribute('data-ed'), p = IDX.prod[id];
    if (!p) return;
    var texto = campo === 'nombre' || campo === 'presentacion' || campo === 'codigo';
    var original = texto ? String(p[campo] || '') : String(num(p[campo]) || 0);
    S.edicion = { id: id, campo: campo };
    var ancho = Math.max(celda.offsetWidth - 12, texto ? 140 : 90);
    celda.classList.add('editando');
    celda.innerHTML = '<input class="in ed-in' + (texto ? '' : ' num') + '" id="ed-inline" ' + (texto ? '' : 'inputmode="decimal" ') + 'style="width:' + ancho + 'px" value="' + esc(original) + '" aria-label="Nuevo valor">';
    var inp = $('#ed-inline', celda);
    inp.focus(); inp.select();
    var terminado = false;
    // orden de los datos editables de esta fila y de la columna, para Enter y Tab
    var proximo = function (dir) {
      var todos = $$('[data-ed]', $('#vista'));
      if (dir === 'abajo') {
        var col = todos.filter(function (x) { return x.getAttribute('data-ed') === campo; });
        var i = col.indexOf(celda);
        return col[i + 1] || null;
      }
      var fila = todos.filter(function (x) { return x.getAttribute('data-id') === id; });
      var j = fila.indexOf(celda);
      return fila[j + 1] || null;
    };
    var cerrar = function (sig) {
      S.edicion = null;
      S.edSiguiente = sig ? { id: sig.getAttribute('data-id'), campo: sig.getAttribute('data-ed') } : null;
      render();
    };
    var guardar = function (dir) {
      if (terminado) return;
      terminado = true;
      var sig = dir ? proximo(dir) : null;
      var valor = texto ? inp.value.trim() : leerNumero(inp.value);
      if (texto ? valor === original : (valor !== '' && Number(valor) === Number(original))) return cerrar(sig);
      if (campo === 'nombre' && !valor) { toast('El nombre no puede quedar vacío.', 'error'); return cerrar(null); }
      inp.disabled = true;
      celda.classList.add('guardando');
      llamar('editarCampoProducto', { id: id, campo: campo, valor: valor }).then(function () {
        celda.classList.remove('guardando');
        cerrar(sig);
      }, function (e) {
        toast(e.message || 'No se pudo guardar.', 'error');
        cerrar(null);
      });
    };
    inp.onkeydown = function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); guardar('abajo'); }
      else if (ev.key === 'Tab') { ev.preventDefault(); guardar('derecha'); }
      else if (ev.key === 'Escape') { ev.preventDefault(); terminado = true; cerrar(null); }
    };
    inp.onblur = function () { guardar(null); };
    inp.onclick = function (ev) { ev.stopPropagation(); };
  }
  ACT.selNinguno = function () { S.selProd = {}; render(); };
  ACT.borrarSel = function () {
    var ids = Object.keys(S.selProd).filter(function (id) { return S.selProd[id] && IDX.prod[id]; });
    borrarProductos(ids);
  };
  function borrarProductos(ids, alTerminar) {
    if (!ids.length) return;
    var nombres = ids.slice(0, 3).map(function (id) { return IDX.prod[id].nombre; }).join(', ') + (ids.length > 3 ? ' y ' + (ids.length - 3) + ' más' : '');
    confirmar('¿Eliminar ' + (ids.length === 1 ? 'el producto' : 'estos ' + ids.length + ' productos') + ': ' + nombres + '? Los pedidos ya hechos no cambian. Si solo querés dejar de venderlo, mejor destildá "Se vende".',
      ids.length === 1 ? 'Eliminar producto' : 'Eliminar ' + ids.length + ' productos', function () {
        accion(null, 'borrarProductos', { ids: ids }).then(function () { S.selProd = {}; render(); if (alTerminar) alTerminar(); }, function () {});
      }, true);
  }

  var MODO_STOCK = [
    ['', 'Normal', 'por unidad'],
    ['tanque', 'Tanque', 'granel, en litros'],
    ['envasado', 'Envasado', 'se llena del tanque'],
    ['granel', 'Suelto', 'trae su envase']
  ];
  var MODO_AYUDA = {
    '': 'Stock en unidades, como cualquier producto (bazar, envases, etc.).',
    tanque: 'El líquido a granel que fabricás. El stock está en <b>litros</b>. Lo que sobra de cada producción entra acá solo.',
    envasado: 'Botellas o bidones ya llenos. Tienen su propio stock; con <b>Envasar</b> pasás litros del tanque a unidades (y se descuentan los envases de la fórmula).',
    granel: 'Se vende suelto (el cliente trae el envase): al vender, descuenta los litros directamente del tanque. En la tienda online solo se ofrece para retirar en el local.'
  };
  function puedeEnvasar() { return esAdmin() || rol() === 'deposito' || puede('produccion'); }
  /** Texto corto del stock real de un producto: litros del tanque, o unidades + lo que hay en el tanque. */
  function stockVisible(p) {
    var t = p.granelId ? IDX.prod[p.granelId] : null;
    if (p.modoStock === 'tanque') return '<b>' + cant(p.stock) + '</b> <small class="muted">L en tanque</small>';
    if (p.modoStock === 'granel' && t) return '<small class="muted">del tanque</small> <b>' + cant(t.stock) + '</b> <small class="muted">L</small>';
    return cant(p.stock) + ' <small class="muted">' + esc(p.unidad) + '</small>' + (p.modoStock === 'envasado' && t ? '<br><small class="muted" title="Litros en el tanque de ' + esc(t.nombre) + '">tanque ' + cant(t.stock) + ' L</small>' : '');
  }
  function modalEnvasar(id, sugerido) {
    var p = IDX.prod[id], t = IDX.prod[p.granelId];
    if (!t) return toast('Este producto no tiene tanque. Configuralo con el lápiz.', true);
    var litros = QG.contenidoDe(p), alcanza = Math.floor(num(t.stock) / litros + 1e-9);
    abrirModal({
      titulo: 'Envasar · ' + esc(p.nombre) + ' ' + esc(p.presentacion),
      cuerpo: function () {
        return '<div class="tanque"><div class="tq-barra"><i style="height:' + Math.max(4, Math.min(100, num(t.stock) / Math.max(num(t.stockMinimo) * 3, num(t.stock), 1) * 100)) + '%"></i></div>' +
          '<div><b>' + esc(t.nombre) + '</b><br><span class="num" style="font-size:1.3rem">' + cant(t.stock) + ' L</span> en el tanque<br><span class="muted">alcanza para ' + alcanza + ' × ' + esc(p.presentacion) + ' (' + cant(litros) + ' L c/u)</span></div></div>' +
          '<label class="campo"><span>¿Cuántas unidades envasaste?</span><input class="in num" id="e-cant" type="number" min="1" step="1" inputmode="numeric" value="' + (sugerido || '') + '" autofocus></label>' +
          '<p class="muted" id="e-calc" style="margin:0;font-size:.85rem"></p>';
      },
      pie: function () { return '<button class="btn" type="button" data-cerrar2>Cancelar</button><button class="btn pri" type="button" id="e-ok">Envasar</button>'; },
      alAbrir: function (r, m) {
        var calc = function () {
          var c = Math.round(num($('#e-cant', r).value)), l = c * litros;
          $('#e-calc', r).innerHTML = c > 0 ? 'Usa <b>' + cant(l) + ' L</b> del tanque · quedan ' + cant(num(t.stock) - l) + ' L' + (l > num(t.stock) ? ' <b style="color:var(--danger)">— no alcanza</b>' : '') + ' · stock de ' + esc(p.presentacion) + ': ' + cant(p.stock) + ' → ' + cant(num(p.stock) + c) : '';
        };
        $('#e-cant', r).addEventListener('input', calc); calc();
        $('[data-cerrar2]', r).onclick = function () { cerrarModal(m); };
        $('#e-ok', r).onclick = function () {
          var c = Math.round(num($('#e-cant', r).value));
          if (!(c > 0)) return toast('Indicá cuántas unidades.', true);
          var btn = this, enviar = function (forzar) { accion(btn, 'envasar', { productoId: id, cantidad: c, forzar: forzar }).then(function () { cerrarModal(m); }, function () {}); };
          if (c * litros > num(t.stock) + 0.001) confirmar('El tanque marca ' + cant(t.stock) + ' L y necesitás ' + cant(c * litros) + ' L. ¿Envasar igual? (el tanque queda en negativo hasta que cargues la producción)', 'Envasar igual', function () { enviar(true); });
          else enviar(false);
        };
      }
    });
  }
  ACT.envasar = function (id) { modalEnvasar(id); };
  function editorProducto(id) {
    var p = id ? IDX.prod[id] : { unidad: 'u', activo: 'si' };
    var cats = Object.keys(D.productos.reduce(function (o, x) { o[x.categoria] = 1; return o; }, {}));
    abrirModal({
      titulo: id ? 'Editar producto' : 'Nuevo producto',
      cuerpo: function () {
        return '<div class="grid3"><label class="campo" style="grid-column:span 2"><span>Nombre</span><input class="in" id="p-nombre" value="' + esc(p.nombre || '') + '" placeholder="Suavizante Brisa" autofocus></label>' +
          '<label class="campo"><span>Código</span><input class="in" id="p-cod" value="' + esc(p.codigo || '') + '"></label></div>' +
          '<div class="grid3"><label class="campo"><span>Categoría</span><input class="in" id="p-cat" list="p-cats" value="' + esc(p.categoria || '') + '" placeholder="Suavizantes"><datalist id="p-cats">' + cats.map(function (c) { return '<option value="' + esc(c) + '">'; }).join('') + '</datalist></label>' +
          '<label class="campo"><span>Presentación</span><input class="in" id="p-pres" value="' + esc(p.presentacion || '') + '" placeholder="Bidón 5 L"></label>' +
          '<label class="campo"><span>Unidad de venta</span><select class="in" id="p-uni">' + ['u', 'L', 'kg', 'bidón', 'caja'].map(function (u) { return '<option' + (p.unidad === u ? ' selected' : '') + '>' + u + '</option>'; }).join('') + '</select></label></div>' +
          '<div class="grid3"><label class="campo"><span>Costo $</span><input class="in num" id="p-costo" inputmode="decimal" value="' + (p.costo || '') + '"></label>' +
          '<label class="campo"><span>Precio mayorista $</span><input class="in num" id="p-may" inputmode="decimal" value="' + (p.precioMayorista || '') + '"></label>' +
          '<label class="campo"><span>Precio minorista $</span><input class="in num" id="p-min" inputmode="decimal" value="' + (p.precioMinorista || '') + '"></label></div>' +
          '<div id="p-margen" class="muted" style="font-size:.82rem"></div>' +
          '<label class="campo"><span>Mayorista desde (unidades) · a partir de esa cantidad, cualquier cliente paga precio mayorista</span><input class="in num" id="p-minmay" inputmode="numeric" value="' + (num(p.minMayorista) || '') + '" placeholder="Sin mínimo: el minorista siempre paga minorista"></label>' +
          '<div class="grid3"><label class="campo"><span>Stock actual</span><input class="in num" id="p-stock" inputmode="decimal" value="' + (p.stock || '') + '"></label>' +
          '<label class="campo"><span>Stock mínimo (aviso)</span><input class="in num" id="p-min-st" inputmode="decimal" value="' + (p.stockMinimo || '') + '"></label>' +
          '<label class="check" style="align-self:end;padding-bottom:9px"><input type="checkbox" id="p-activo"' + (p.activo !== 'no' ? ' checked' : '') + '> Se vende</label></div>' +
          '<fieldset class="modo-stock"><legend>¿Cómo se maneja el stock?</legend><div class="seg seg-modo" role="group">' + MODO_STOCK.map(function (o) {
            return '<button type="button" data-modo="' + o[0] + '" aria-pressed="' + ((p.modoStock || '') === o[0]) + '"><b>' + o[1] + '</b><small>' + o[2] + '</small></button>';
          }).join('') + '</div>' +
          '<div class="grid2" id="p-tq-box"><label class="campo"><span>Sale del tanque</span><select class="in" id="p-granel"><option value="">Elegí el tanque…</option>' +
          D.productos.filter(function (x) { return x.modoStock === 'tanque' && x.id !== id; }).map(function (x) { return '<option value="' + x.id + '"' + (p.granelId === x.id ? ' selected' : '') + '>' + esc(x.nombre + ' ' + x.presentacion) + ' · ' + cant(x.stock) + ' L</option>'; }).join('') + '</select></label>' +
          '<label class="campo"><span>Litros por unidad</span><input class="in num" id="p-cont" inputmode="decimal" value="' + (num(p.contenido) || '') + '" placeholder="Ej.: 5"></label></div>' +
          '<p class="muted" id="p-modo-ayuda" style="margin:0;font-size:.8rem"></p></fieldset>' +
          '<label class="check"><input type="checkbox" id="p-web"' + (p.web !== 'no' ? ' checked' : '') + '> Mostrar en la tienda online</label>';
      },
      pie: function () { return (id ? '<button class="btn peligro" type="button" id="p-borrar" style="margin-right:auto">' + ic('basura') + 'Eliminar</button>' : '') + '<button class="btn" type="button" data-cerrar2>Cancelar</button><button class="btn pri" type="button" id="p-ok">Guardar producto</button>'; },
      alAbrir: function (r, m) {
        var margen = function () {
          var c = num($('#p-costo', r).value), may = num($('#p-may', r).value), min = num($('#p-min', r).value);
          $('#p-margen', r).innerHTML = (dolar() ? '<b>En dólares</b> (oficial ' + pesos(dolar()) + '): costo ' + usd(c) + ' · mayorista ' + usd(may) + ' · minorista ' + usd(min) + '<br>' : '') +
            (c ? 'Ganancia sobre el costo · mayorista: ' + pesos(may - c) + ' (' + Math.round((may - c) / c * 100) + ' %) · minorista: ' + pesos(min - c) + ' (' + Math.round((min - c) / c * 100) + ' %)' : '');
        };
        ['#p-costo', '#p-may', '#p-min'].forEach(function (s) { $(s, r).addEventListener('input', margen); });
        var modo = p.modoStock || '';
        var pintarModo = function () {
          $$('[data-modo]', r).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-modo') === modo)); });
          $('#p-tq-box', r).hidden = !(modo === 'envasado' || modo === 'granel');
          $('#p-modo-ayuda', r).innerHTML = MODO_AYUDA[modo];
          var cont = $('#p-cont', r);
          if (!cont.value && (modo === 'envasado' || modo === 'granel')) cont.value = QG.litrosDeTexto($('#p-pres', r).value) || '';
          if (modo === 'tanque') { $('#p-uni', r).value = 'L'; }
        };
        $$('[data-modo]', r).forEach(function (b) { b.onclick = function () { modo = b.getAttribute('data-modo'); pintarModo(); }; });
        pintarModo();
        var pb = $('#p-borrar', r);
        if (pb) pb.onclick = function () { borrarProductos([id], function () { cerrarModal(m); }); };
        margen();
        $('[data-cerrar2]', r).onclick = function () { cerrarModal(m); };
        $('#p-ok', r).onclick = function () {
          accion(this, 'guardarProducto', {
            id: id, nombre: $('#p-nombre', r).value, codigo: $('#p-cod', r).value, categoria: $('#p-cat', r).value, presentacion: $('#p-pres', r).value,
            unidad: $('#p-uni', r).value, costo: num($('#p-costo', r).value), precioMayorista: num($('#p-may', r).value), precioMinorista: num($('#p-min', r).value),
            stock: num($('#p-stock', r).value), stockMinimo: num($('#p-min-st', r).value), activo: $('#p-activo', r).checked, minMayorista: num($('#p-minmay', r).value),
            modoStock: modo, granelId: $('#p-granel', r).value, contenido: num($('#p-cont', r).value), web: $('#p-web', r).checked
          }, 'Producto guardado.').then(function () { cerrarModal(m); }, function () {});
        };
      }
    });
  }
  function modalStock(id) {
    var p = IDX.prod[id];
    abrirModal({
      titulo: 'Stock · ' + esc(p.nombre) + ' ' + esc(p.presentacion),
      cuerpo: function () {
        return '<p style="margin:0">Stock actual: <b class="num">' + cant(p.stock) + ' ' + esc(p.unidad) + '</b></p>' +
          '<label class="campo"><span>Sumar (producción o compra) o restar (rotura, ajuste). Usá − para restar.</span><input class="in num" id="s-cant" inputmode="decimal" placeholder="Ej.: 20 o -3" autofocus></label>';
      },
      pie: function () { return '<button class="btn" type="button" data-cerrar2>Cancelar</button><button class="btn pri" type="button" id="s-ok">Aplicar</button>'; },
      alAbrir: function (r, m) {
        $('[data-cerrar2]', r).onclick = function () { cerrarModal(m); };
        $('#s-ok', r).onclick = function () {
          var c = num($('#s-cant', r).value);
          if (!c) { toast('Ingresá una cantidad distinta de cero.', true); return; }
          accion(this, 'ajustarStock', { id: id, cantidad: c }, 'Stock actualizado.').then(function () { cerrarModal(m); }, function () {});
        };
      }
    });
  }
  function modalAumento() {
    var cats = Object.keys(D.productos.reduce(function (o, x) { o[x.categoria] = 1; return o; }, {})).sort();
    abrirModal({
      titulo: 'Actualizar precios por porcentaje',
      cuerpo: function () {
        return '<div class="grid2"><label class="campo"><span>Categoría</span><select class="in" id="a-cat"><option value="">Todas</option>' + cats.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('') + '</select></label>' +
          '<label class="campo"><span>Porcentaje (usá − para bajar)</span><input class="in num" id="a-pct" inputmode="decimal" placeholder="8" autofocus></label></div>' +
          '<div class="fila"><label class="check"><input type="checkbox" value="precioMayorista" checked> Mayorista</label><label class="check"><input type="checkbox" value="precioMinorista" checked> Minorista</label><label class="check"><input type="checkbox" value="costo"> Costo</label></div>' +
          '<p class="muted" style="margin:0;font-size:.82rem">Los precios se redondean a pesos enteros. Los pedidos ya creados no cambian.</p>';
      },
      pie: function () { return '<button class="btn" type="button" data-cerrar2>Cancelar</button><button class="btn pri" type="button" id="a-ok">Aplicar aumento</button>'; },
      alAbrir: function (r, m) {
        $('[data-cerrar2]', r).onclick = function () { cerrarModal(m); };
        $('#a-ok', r).onclick = function () {
          var btn = this;
          var campos = $$('input[type=checkbox]:checked', r).map(function (c) { return c.value; });
          var pct = num($('#a-pct', r).value), cat = $('#a-cat', r).value;
          confirmar('¿Aplicar ' + (pct > 0 ? '+' : '') + pct + ' % a ' + (cat || 'todas las categorías') + '?', 'Aplicar', function () {
            accion(btn, 'ajustarPrecios', { categoria: cat, pct: pct, campos: campos }).then(function () { cerrarModal(m); }, function () {});
          });
        };
      }
    });
  }

  /* ----- Importar desde Excel / CSV ----- */
  var COLUMNAS = {
    minMayorista: ['min mayorista', 'minimo mayorista', 'mayorista desde', 'cant mayorista', 'cantidad mayorista'],
    codigo: ['codigo', 'cod', 'sku', 'id'],
    nombre: ['nombre', 'producto', 'descripcion', 'articulo'],
    categoria: ['categoria', 'rubro', 'tipo', 'familia'],
    presentacion: ['presentacion', 'envase', 'medida', 'tamano', 'litros'],
    unidad: ['unidad', 'um'],
    costo: ['costo', 'precio costo', 'costo unitario', 'compra'],
    precioMayorista: ['mayorista', 'precio mayorista', 'p mayorista', 'pm', 'por mayor'],
    precioMinorista: ['minorista', 'precio minorista', 'p minorista', 'publico', 'precio publico', 'precio', 'venta', 'por menor'],
    stock: ['stock', 'existencia', 'cantidad'],
    stockMinimo: ['minimo', 'stock minimo', 'stock min']
  };
  function mapearEncabezados(enc) {
    var mapa = {};
    enc.forEach(function (h, i) {
      var n = normal(h).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
      Object.keys(COLUMNAS).forEach(function (campo) {
        if (mapa[campo] !== undefined) return;
        if (COLUMNAS[campo].indexOf(n) >= 0) mapa[campo] = i;
      });
    });
    // segunda pasada: coincidencias parciales
    enc.forEach(function (h, i) {
      var n = normal(h);
      Object.keys(COLUMNAS).forEach(function (campo) {
        if (mapa[campo] !== undefined || Object.keys(mapa).some(function (k) { return mapa[k] === i; })) return;
        if (COLUMNAS[campo].some(function (a) { return a.length > 3 && n.indexOf(a) >= 0; })) mapa[campo] = i;
      });
    });
    return mapa;
  }
  function numeroPlanilla(v) {
    if (typeof v === 'number') return v;
    var s = String(v || '').replace(/[$\s]/g, '');
    if (!s) return '';
    if (s.indexOf(',') >= 0 && s.indexOf('.') >= 0) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    else if (s.indexOf(',') >= 0) s = s.replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    var n = Number(s);
    return isFinite(n) ? n : '';
  }
  function filasAProductos(tabla) {
    tabla = tabla.filter(function (f) { return f.some(function (c) { return String(c).trim(); }); });
    if (tabla.length < 2) return { error: 'La planilla necesita una fila de encabezados y al menos un producto.' };
    var mapa = mapearEncabezados(tabla[0].map(String));
    if (mapa.nombre === undefined) return { error: 'No encontré la columna del nombre del producto. Poné un encabezado "Producto" o "Nombre".' };
    var productos = tabla.slice(1).map(function (f) {
      var o = {};
      Object.keys(mapa).forEach(function (k) {
        var v = f[mapa[k]];
        o[k] = ['costo', 'precioMayorista', 'precioMinorista', 'stock', 'stockMinimo', 'minMayorista'].indexOf(k) >= 0 ? numeroPlanilla(v) : String(v === undefined ? '' : v).trim();
      });
      return o;
    }).filter(function (o) { return o.nombre; });
    return { mapa: mapa, productos: productos };
  }
  function parsearTexto(t) {
    var sep = t.indexOf('\t') >= 0 ? '\t' : (t.split('\n')[0].split(';').length > t.split('\n')[0].split(',').length ? ';' : ',');
    return t.replace(/\r/g, '').split('\n').map(function (l) {
      if (sep === '\t') return l.split('\t');
      var out = [], cur = '', q = false;
      for (var i = 0; i < l.length; i++) {
        var ch = l[i];
        if (ch === '"') { if (q && l[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
        else if (ch === sep && !q) { out.push(cur); cur = ''; }
        else cur += ch;
      }
      out.push(cur);
      return out;
    });
  }
  function cargarXLSX() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise(function (ok, mal) {
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = function () { ok(window.XLSX); };
      s.onerror = function () { mal(new Error('No se pudo cargar el lector de Excel. Copiá las celdas y pegalas en el cuadro.')); };
      document.head.appendChild(s);
    });
  }
  function modalImportar() {
    var resultado = null;
    abrirModal({
      tam: 'md', titulo: 'Importar productos desde Excel',
      cuerpo: function () {
        return '<div class="aviso azul">La primera fila tiene que tener los encabezados. Reconozco: <b>Código, Producto, Categoría, Presentación, Unidad, Costo, Mayorista, Minorista, Stock, Mínimo</b>. ' +
          '<b>No se duplica nada:</b> si un producto ya existe (mismo código, o mismo nombre y presentación) se actualizan sus datos; si no existe, se crea. Las celdas vacías no borran lo que ya tenías.</div>' +
          '<label class="campo"><span>Opción 1: elegí el archivo (.xlsx, .xls o .csv)</span><input class="in" type="file" id="i-arch" accept=".xlsx,.xls,.csv,.txt"></label>' +
          '<label class="campo"><span>Opción 2: en Excel seleccioná las celdas, copiá y pegá acá</span><textarea class="in" id="i-texto" rows="5" placeholder="Código	Producto	Presentación	Mayorista	Minorista…"></textarea></label>' +
          '<div id="i-prev"></div>' +
          '<label class="check"><input type="checkbox" id="i-faltantes"> Marcar como "no se vende" los productos que no estén en esta planilla</label>';
      },
      pie: function () { return '<button class="btn" type="button" data-cerrar2>Cancelar</button><button class="btn pri" type="button" id="i-ok" disabled>Importar</button>'; },
      alAbrir: function (r, m) {
        var mostrar = function (tabla) {
          resultado = filasAProductos(tabla);
          var prev = $('#i-prev', r);
          if (resultado.error) { prev.innerHTML = '<div class="aviso rojo">' + esc(resultado.error) + '</div>'; $('#i-ok', r).disabled = true; return; }
          var campos = Object.keys(resultado.mapa);
          prev.innerHTML = '<p style="margin:0 0 6px"><b>' + resultado.productos.length + ' productos</b> listos. Columnas reconocidas: ' + campos.join(', ') + '.</p>' +
            '<div class="tabla-wrap"><table class="t"><thead><tr>' + campos.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr></thead><tbody>' +
            resultado.productos.slice(0, 8).map(function (p) { return '<tr>' + campos.map(function (c) { return '<td>' + esc(p[c]) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' +
            (resultado.productos.length > 8 ? '<p class="muted" style="font-size:.8rem;margin:6px 0 0">…y ' + (resultado.productos.length - 8) + ' más.</p>' : '');
          $('#i-ok', r).disabled = !resultado.productos.length;
        };
        $('#i-texto', r).addEventListener('input', function () { if (this.value.trim()) mostrar(parsearTexto(this.value)); });
        $('#i-arch', r).addEventListener('change', function () {
          var f = this.files[0];
          if (!f) return;
          var lector = new FileReader();
          if (/\.(csv|txt)$/i.test(f.name)) {
            lector.onload = function () { mostrar(parsearTexto(String(lector.result))); };
            lector.readAsText(f);
          } else {
            lector.onload = function () {
              cargarXLSX().then(function (X) {
                var wb = X.read(new Uint8Array(lector.result), { type: 'array' });
                mostrar(X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' }));
              }).catch(function (e) { toast(e.message, true); });
            };
            lector.readAsArrayBuffer(f);
          }
        });
        $('[data-cerrar2]', r).onclick = function () { cerrarModal(m); };
        $('#i-ok', r).onclick = function () {
          accion(this, 'importarProductos', { filas: resultado.productos, desactivarFaltantes: $('#i-faltantes', r).checked }).then(function () { cerrarModal(m); }, function () {});
        };
      }
    });
  }

  /* ============================================================
   * 16. AJUSTES (empresa, zonas de envío, usuarios, mi PIN)
   * ============================================================ */
  /* ============================================================
   * 14. CENTRO DE PRODUCCIÓN (insumos, fórmulas y fabricación)
   * ============================================================ */
  var TIPO_INSUMO = { materia: 'Materia prima', envase: 'Envase', otro: 'Otro' };
  S.prod = { tab: leerLocal('ac_prod_tab') || 'formulas', q: '', tipo: '' };

  function insumoPorId(id) { return (D.insumos || []).filter(function (i) { return i.id === id; })[0] || null; }
  function formulaPorId(id) { return (D.formulas || []).filter(function (f) { return f.id === id; })[0] || null; }
  /** Fórmula conectada a un producto (si la hay). */
  function formulaDeProducto(productoId) {
    return (D.formulas || []).filter(function (f) {
      return f.activo === 'si' && (f.presentaciones || []).some(function (p) { return p.productoId === productoId; });
    })[0] || null;
  }
  /** Cantidad legible: 0,05 kg → 50 g · 0,3 L → 300 ml. */
  function cantInsumo(c, unidad) {
    c = num(c);
    if (unidad === 'kg' && Math.abs(c) < 1 && c !== 0) return cant(c * 1000) + ' g';
    if (unidad === 'L' && Math.abs(c) < 1 && c !== 0) return cant(c * 1000) + ' ml';
    return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 }).format(c) + ' ' + (unidad || '');
  }
  function costoUnit(ins) { return QG.costoUnitInsumo(ins, dolar()); }
  function precioInsumoTxt(ins) {
    return (ins.moneda === 'USD' ? 'US$ ' + fmtUsd.format(num(ins.precioEnvase)) : pesos(ins.precioEnvase)) + ' · ' + cantInsumo(ins.cantidadEnvase, ins.unidad);
  }
  /** Resumen de una fórmula con sus presentaciones, costos y márgenes reales. */
  function analisisFormula(f) {
    var c = QG.costoFormula(f, D.insumos, dolar());
    var pres = (f.presentaciones || []).map(function (pr) {
      var p = IDX.prod[pr.productoId];
      var costo = QG.costoPresentacion(pr, c.porLitro, D.insumos, dolar()).total;
      var may = p ? num(p.precioMayorista) : 0, min = p ? num(p.precioMinorista) : 0;
      return {
        pr: pr, p: p, costo: costo,
        may: may, min: min,
        gMay: costo ? (may - costo) / costo * 100 : 0, gMin: costo ? (min - costo) / costo * 100 : 0,
        sugMay: QG.precioSugerido(costo, f.margenMay), sugMin: QG.precioSugerido(costo, f.margenMin)
      };
    }).filter(function (x) { return x.p; });
    var bajos = pres.filter(function (x) { return (num(f.margenMay) && x.gMay < num(f.margenMay) - 0.5) || (num(f.margenMin) && x.gMin < num(f.margenMin) - 0.5); });
    return { c: c, pres: pres, bajos: bajos };
  }
  function insumosBajos() {
    return (D.insumos || []).filter(function (i) { return i.activo === 'si' && num(i.stockMinimo) > 0 && num(i.stock) <= num(i.stockMinimo); });
  }

  RENDER.produccion = function () {
    var adm = esAdmin(), vc = verCostos();
    var mes = D.hoy.slice(0, 7);
    var prodMes = (D.producciones || []).filter(function (x) { return x.estado !== 'anulada' && String(x.fecha).slice(0, 7) === mes; });
    var litrosMes = prodMes.reduce(function (s, x) { return s + num(x.litros); }, 0);
    var bajos = insumosBajos();
    var conMargenBajo = vc ? (D.formulas || []).filter(function (f) { return f.activo === 'si' && analisisFormula(f).bajos.length; }) : [];
    var valorStock = vc ? (D.insumos || []).reduce(function (s, i) { return s + Math.max(0, num(i.stock)) * costoUnit(i); }, 0) : 0;
    var tab = S.prod.tab;
    var kpi = function (t, v, sub, alerta, act) {
      return '<button class="kpi' + (alerta ? ' alerta' : '') + '" type="button"' + (act ? ' data-act="' + act + '"' : '') + '><small>' + t + '</small><b>' + v + '</b><em>' + sub + '</em></button>';
    };
    var html = '<div class="kpis">' +
      kpi('Producido este mes', cant(litrosMes) + ' L', prodMes.length + ' tanda' + (prodMes.length === 1 ? '' : 's'), false, 'prodTabHist') +
      kpi('Insumos por reponer', bajos.length, bajos.length ? bajos.slice(0, 2).map(function (i) { return i.nombre; }).join(', ') + (bajos.length > 2 ? '…' : '') : 'Todo con stock', bajos.length > 0, 'prodTabIns') +
      (vc ? kpi('Precios bajo tu margen', conMargenBajo.length, conMargenBajo.length ? 'Revisá: ' + conMargenBajo.map(function (f) { return f.nombre; }).join(', ') : 'Todos los precios cubren tu ganancia', conMargenBajo.length > 0, 'prodTabForm') : '') +
      (vc ? kpi('Valor del stock de insumos', pesos(Math.round(valorStock)), dolar() ? usd(valorStock) : 'Al costo de reposición', false, 'prodTabIns') : '') +
      '</div>';
    var nF = (D.formulas || []).length, nI = (D.insumos || []).length, nP = (D.producciones || []).length;
    html += '<div class="fila"><div class="seg" role="tablist" aria-label="Secciones de producción">' +
      [['formulas', 'Fórmulas', nF], ['insumos', 'Insumos', nI], ['historial', 'Producciones', nP]].map(function (t) {
        return '<button type="button" role="tab" data-act="prodTab" data-id="' + t[0] + '" aria-pressed="' + (tab === t[0]) + '">' + t[1] + ' <span class="cuenta">' + t[2] + '</span></button>';
      }).join('') + '</div>' +
      '<span class="fila" style="margin-left:auto">' +
      (adm && tab === 'formulas' ? '<button class="btn" type="button" data-act="importarCosteApp">' + ic('subir') + 'Traer de CosteApp</button><button class="btn" type="button" data-act="editarFormula">' + ic('mas') + 'Fórmula</button>' : '') +
      (adm && tab === 'insumos' ? '<button class="btn" type="button" data-act="editarInsumo">' + ic('mas') + 'Insumo</button>' : '') +
      '<button class="btn pri" type="button" data-act="producir">' + ic('matraz') + 'Nueva producción</button></span></div>';
    if (tab === 'insumos') html += vistaInsumos();
    else if (tab === 'historial') html += vistaProducciones();
    else html += vistaFormulas();
    return html;
  };
  ACT.prodTab = function (t) { S.prod.tab = t; guardarLocal('ac_prod_tab', t); render(); };
  ACT.prodTabHist = function () { ACT.prodTab('historial'); };
  ACT.prodTabIns = function () { ACT.prodTab('insumos'); };
  ACT.prodTabForm = function () { ACT.prodTab('formulas'); };
  ALABRIR.produccion = function (r) {
    var b = $('#b-insumos', r);
    if (b) b.addEventListener('input', function () { S.prod.q = b.value; render(); });
  };

  /* ----- Fórmulas: tarjetas ----- */
  function vistaFormulas() {
    var adm = esAdmin(), vc = verCostos();
    var lista = (D.formulas || []).slice().sort(function (a, b) { return a.nombre.localeCompare(b.nombre); });
    if (!lista.length) {
      return '<div class="card vacio"><p style="margin:0 0 6px"><b>Todavía no hay fórmulas.</b></p><p style="margin:0 0 12px">Cargá tus insumos y después armá la receta de cada producto. Si ya las tenés en CosteApp, traelas con un clic.</p>' +
        (adm ? '<div class="fila" style="justify-content:center"><button class="btn" type="button" data-act="importarCosteApp">' + ic('subir') + 'Traer de CosteApp</button><button class="btn pri" type="button" data-act="editarFormula">' + ic('mas') + 'Crear fórmula</button></div>' : '') + '</div>';
    }
    return '<div class="formulas">' + lista.map(function (f) {
      var a = vc ? analisisFormula(f) : null;
      var estado = !vc ? '' : a.c.faltaDolar ? '<span class="chip pg-parcial">Falta cotización</span>' : a.bajos.length ? '<span class="chip pg-pendiente">' + a.bajos.length + ' precio' + (a.bajos.length > 1 ? 's' : '') + ' bajo margen</span>' : a.pres.length ? '<span class="chip pg-pagado">Precios OK</span>' : '<span class="chip plano">Sin presentaciones</span>';
      var html = '<article class="fcard' + (f.activo !== 'si' ? ' inactiva' : '') + '"><header class="fcard-head"><span class="fcard-ic">' + ic('matraz') + '</span>' +
        '<div class="fcard-tit"><h3>' + esc(f.nombre) + '</h3><span class="muted">Rinde ' + cant(f.rinde) + ' L · ' + (f.ingredientes || []).length + ' ingredientes</span></div>' + estado + '</header>';
      if (vc) {
        html += '<div class="ftiles"><div><small>Costo de la tanda</small><b>' + pesos(Math.round(a.c.tanda)) + '</b></div><div><small>Costo por litro</small><b>' + pesos(a.c.porLitro) + '</b>' + (dolar() ? '<em>' + usd(a.c.porLitro) + '</em>' : '') + '</div>' +
          '<div><small>Ganancia objetivo</small><b>' + cant(f.margenMay) + ' / ' + cant(f.margenMin) + ' %</b><em>mayorista / minorista</em></div></div>';
        html += a.pres.length ? '<div class="fpres"><div class="fpres-row fpres-h"><span>Presentación</span><span>Costo</span><span>Mayorista</span><span>Minorista</span></div>' + a.pres.map(function (x) {
          var celda = function (precio, g, obj, sug) {
            var mal = num(obj) && g < num(obj) - 0.5;
            return '<span class="' + (mal ? 'mal' : 'bien') + '"><b class="num">' + pesos(precio) + '</b><small>' + Math.round(g) + ' %' + (mal ? ' · sug. ' + pesos(sug) : '') + '</small></span>';
          };
          return '<div class="fpres-row"><span>' + esc(x.p.presentacion || x.p.nombre) + '<small class="muted">' + cant(x.pr.litros) + ' L' + ((x.pr.envases || []).length ? ' + envase' : '') + '</small></span><span class="num">' + pesos(Math.round(x.costo)) + '</span>' +
            celda(x.may, x.gMay, f.margenMay, x.sugMay) + celda(x.min, x.gMin, f.margenMin, x.sugMin) + '</div>';
        }).join('') + '</div>' : '<p class="muted" style="margin:0;font-size:.85rem">Conectala con los productos que vendés (bidón, botella, suelto) para calcular su costo.</p>';
      } else {
        html += '<ul class="freceta">' + (f.ingredientes || []).map(function (it) { var ins = insumoPorId(it.insumoId); return '<li><span>' + esc(ins ? ins.nombre : '—') + '</span><b>' + cant(it.cantidad) + ' ' + it.unidad + '</b></li>'; }).join('') + '</ul>';
      }
      html += '<footer class="fila">' + (adm && a && a.bajos.length ? '<button class="btn chico" type="button" data-act="aplicarPrecios" data-id="' + f.id + '">Aplicar precios sugeridos</button>' : '') +
        '<span class="fila" style="margin-left:auto">' + (adm ? '<button class="btn chico" type="button" data-act="editarFormula" data-id="' + f.id + '">' + ic('editar') + 'Editar</button>' : '<button class="btn chico" type="button" data-act="verReceta" data-id="' + f.id + '">Ver receta</button>') +
        '<button class="btn chico pri" type="button" data-act="producir" data-id="' + f.id + '">' + ic('matraz') + 'Producir</button></span></footer></article>';
      return html;
    }).join('') + '</div>';
  }
  ACT.aplicarPrecios = function (id) {
    var f = formulaPorId(id), a = analisisFormula(f);
    confirmar('¿Poner los precios sugeridos en ' + a.pres.length + ' producto(s) de "' + f.nombre + '"? ' + a.pres.map(function (x) {
      return (x.p.presentacion || x.p.nombre) + ': may. ' + pesos(x.sugMay) + ' / min. ' + pesos(x.sugMin);
    }).join(' · '), 'Aplicar precios', function () { accion(null, 'aplicarPreciosFormula', { id: id }).catch(function () {}); });
  };
  ACT.verReceta = function (id) { modalProduccion(id, true); };

  /* ----- Insumos: tabla ----- */
  function vistaInsumos() {
    var adm = esAdmin(), vc = verCostos(), q = normal(S.prod.q), tipo = S.prod.tipo;
    var lista = (D.insumos || []).filter(function (i) { return (!tipo || i.tipo === tipo) && (!q || normal(i.nombre + ' ' + i.proveedor).indexOf(q) >= 0); })
      .sort(function (a, b) { return (a.tipo + a.nombre).localeCompare(b.tipo + b.nombre); });
    var html = '<div class="fila"><label class="buscar">' + ic('buscar') + '<input class="in" id="b-insumos" type="search" placeholder="Buscar insumo o proveedor" value="' + esc(S.prod.q) + '"></label>' +
      [['', 'Todos'], ['materia', 'Materias primas'], ['envase', 'Envases'], ['otro', 'Otros']].map(function (t) {
        return '<button class="btn chico' + (tipo === t[0] ? ' pri' : '') + '" type="button" data-act="prodTipo" data-id="' + t[0] + '">' + t[1] + '</button>';
      }).join('') + '</div>';
    if (!lista.length) return html + '<div class="card vacio">' + ((D.insumos || []).length ? 'No hay insumos que coincidan.' : 'Cargá lo que comprás: pasta, esencias, lauril, agua, bidones, tapas y etiquetas.') + '</div>';
    html += '<div class="tabla-wrap"><table class="t"><thead><tr><th>Insumo</th>' + (vc ? '<th>Compra</th><th class="der">Costo por unidad</th>' : '') + '<th class="der">Stock</th><th></th></tr></thead><tbody>' +
      lista.map(function (i) {
        var bajo = num(i.stockMinimo) > 0 && num(i.stock) <= num(i.stockMinimo);
        return '<tr' + (i.activo !== 'si' ? ' style="opacity:.55"' : '') + '><td><b style="font-weight:500">' + esc(i.nombre) + '</b> <span class="chip plano tipo-' + i.tipo + '">' + TIPO_INSUMO[i.tipo] + '</span>' +
          (i.proveedor ? '<br><small class="muted">' + esc(i.proveedor) + '</small>' : '') + '</td>' +
          (vc ? '<td class="num">' + precioInsumoTxt(i) + (i.moneda === 'USD' ? ' <span class="chip plano pg-parcial">US$</span>' : '') + '</td>' +
            '<td class="der num"><b>' + pesos(costoUnit(i)) + '</b> <small class="muted">/ ' + i.unidad + '</small>' + (dolar() ? '<br><small class="muted">' + usd(costoUnit(i)) + '</small>' : '') + '</td>' : '') +
          '<td class="der num' + (bajo ? ' bajo' : '') + '">' + cantInsumo(i.stock, i.unidad) + (num(i.stockMinimo) ? '<br><small class="muted">mín. ' + cantInsumo(i.stockMinimo, i.unidad) + '</small>' : '') + '</td>' +
          '<td class="acc"><button class="btn chico" type="button" data-act="movInsumo" data-id="' + i.id + '">' + ic('mas') + 'Entrada</button> ' +
          (adm ? '<button class="btn chico icono" type="button" data-act="editarInsumo" data-id="' + i.id + '" aria-label="Editar">' + ic('editar') + '</button>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    return html;
  }
  ACT.prodTipo = function (t) { S.prod.tipo = t || ''; render(); };

  /* ----- Historial de producciones ----- */
  function vistaProducciones() {
    var adm = esAdmin(), vc = verCostos();
    var lista = (D.producciones || []).slice().sort(function (a, b) { return b.numero - a.numero; });
    if (!lista.length) return '<div class="card vacio">Todavía no registraste producciones. Tocá <b>Nueva producción</b> cuando fabriques una tanda: se descuentan los insumos y se suma el stock de lo envasado.</div>';
    return '<div class="tabla-wrap"><table class="t"><thead><tr><th>Lote</th><th>Fecha</th><th>Fórmula</th><th class="der">Litros</th><th>Envasado</th>' + (vc ? '<th class="der">Costo</th>' : '') + '<th>Hizo</th><th></th></tr></thead><tbody>' +
      lista.map(function (x) {
        var anulada = x.estado === 'anulada';
        return '<tr' + (anulada ? ' style="opacity:.5"' : '') + '><td class="mono">' + esc(x.lote) + (anulada ? ' <span class="chip plano st-anulado">Anulada</span>' : '') + '</td><td class="num">' + fechaCorta(x.fecha) + '</td><td>' + esc(x.formulaNombre) + '</td>' +
          '<td class="der num">' + cant(x.litros) + ' L</td><td style="font-size:.84rem">' + ((x.salidas || []).map(function (s) { return '<b>' + cant(s.cantidad) + '</b> × ' + esc(s.presentacion || s.nombre); }).join('<br>') || '<span class="muted">A granel</span>') +
          (num(x.litros) - num(x.litrosEnvasados) > 0.05 ? '<br><small class="muted">' + cant(num(x.litros) - num(x.litrosEnvasados)) + ' L sin envasar</small>' : '') + '</td>' +
          (vc ? '<td class="der num">' + pesos(x.costoTotal) + '<br><small class="muted">' + pesos(num(x.costoTotal) / Math.max(1, num(x.litros))) + '/L</small></td>' : '') +
          '<td>' + esc((IDX.usr[x.usuarioId] || {}).nombre || '') + '</td>' +
          '<td class="acc">' + (!anulada && (x.salidas || []).length ? '<button class="btn chico" type="button" data-act="etqLote" data-id="' + x.id + '">' + ic('etiqueta') + 'Etiquetas</button> ' : '') +
          (adm && !anulada ? '<button class="btn chico icono peligro" type="button" data-act="anularProd" data-id="' + x.id + '" aria-label="Anular">' + ic('basura') + '</button>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  ACT.anularProd = function (id) {
    var x = (D.producciones || []).filter(function (p) { return p.id === id; })[0];
    confirmar('¿Anular la producción ' + x.lote + '? Vuelven al stock los insumos usados y se descuenta lo envasado.', 'Anular producción', function () {
      accion(null, 'anularProduccion', { id: id }).catch(function () {});
    }, true);
  };
  /** Lleva a Etiquetas con las cantidades y el lote de una producción. */
  ACT.etqLote = function (id) {
    var x = (D.producciones || []).filter(function (p) { return p.id === id; })[0];
    if (x) irAEtiquetas(x.salidas, x.lote);
  };
  function irAEtiquetas(salidas, lote) {
    S.etq.cant = {};
    var sinEtq = [], porTam = {};
    (salidas || []).forEach(function (s) {
      if (/por litro|suelt|granel/i.test(s.nombre + ' ' + s.presentacion)) return; // lo suelto va en el envase del cliente
      var sg = QG.sugerirEtiqueta(s.nombre);
      var e = D.etiquetas.filter(function (x) { return normal(x.nombre + '|' + x.subtitulo) === normal(sg.nombre + '|' + sg.subtitulo); })[0];
      if (!e) { sinEtq.push(s.nombre); return; }
      S.etq.cant[e.id] = (S.etq.cant[e.id] || 0) + num(s.cantidad);
      var l = num(s.litros), tam = l >= 4 ? 'bidon5' : l >= 2 ? 'env25' : l >= 0.5 ? 'env1' : 'perf250';
      porTam[tam] = (porTam[tam] || 0) + num(s.cantidad);
    });
    var tam = Object.keys(porTam).sort(function (a, b) { return porTam[b] - porTam[a]; })[0];
    if (!tam && !sinEtq.length) { toast('Lo envasado en este lote es suelto: no lleva etiqueta.'); return; }
    if (tam) { S.etq.tam = tam; guardarLocal('ac_etq_tam', tam); }
    S.etq.lote = lote || '';
    cerrarTodos();
    S.vista = 'etiquetas';
    render();
    window.scrollTo(0, 0);
    toast('Etiquetas listas para el lote ' + lote + '.' + (sinEtq.length ? ' Sin etiqueta: ' + sinEtq.join(', ') + ' (creala en Etiquetas).' : ''), !!sinEtq.length);
  }

  /* ----- Editor de insumo ----- */
  ACT.editarInsumo = function (id) {
    var i = id ? insumoPorId(id) : { tipo: 'materia', unidad: 'kg', moneda: 'ARS', densidad: 1, cantidadEnvase: 1, activo: 'si' };
    var unidadCompra = i.unidad;
    var cantCompra = num(i.cantidadEnvase);
    if (i.unidad === 'kg' && cantCompra < 1 && cantCompra > 0) { unidadCompra = 'g'; cantCompra = cantCompra * 1000; }
    if (i.unidad === 'L' && cantCompra < 1 && cantCompra > 0) { unidadCompra = 'ml'; cantCompra = cantCompra * 1000; }
    var moneda = i.moneda || 'ARS';
    abrirModal({
      tam: 'md', titulo: id ? 'Editar insumo' : 'Nuevo insumo',
      cuerpo: function () {
        return '<div class="grid3"><label class="campo" style="grid-column:span 2"><span>Nombre</span><input class="in" id="in-nombre" value="' + esc(i.nombre || '') + '" placeholder="Pasta suavizante" autofocus></label>' +
          '<label class="campo"><span>Tipo</span><select class="in" id="in-tipo">' + Object.keys(TIPO_INSUMO).map(function (t) { return '<option value="' + t + '"' + (i.tipo === t ? ' selected' : '') + '>' + TIPO_INSUMO[t] + '</option>'; }).join('') + '</select></label></div>' +
          '<div class="card" style="box-shadow:none;background:var(--surface-2);border:0;display:grid;gap:12px"><b style="font-size:.88rem">¿Cómo lo comprás?</b>' +
          '<div class="grid3"><div class="campo"><span>Moneda</span><div class="seg"><button type="button" data-mon="ARS" aria-pressed="' + (moneda === 'ARS') + '">Pesos $</button><button type="button" data-mon="USD" aria-pressed="' + (moneda === 'USD') + '">Dólares US$</button></div></div>' +
          '<label class="campo"><span id="in-etq-precio">Precio del envase o bulto</span><input class="in num" id="in-precio" inputmode="decimal" value="' + (i.precioEnvase || '') + '" placeholder="150000"></label>' +
          '<div class="campo"><span>Trae</span><div class="fila" style="flex-wrap:nowrap"><input class="in num" id="in-cant" inputmode="decimal" value="' + (cantCompra || '') + '" style="min-width:0">' +
          '<select class="in" id="in-uc" style="width:auto">' + ['g', 'kg', 'ml', 'L', 'u'].map(function (u) { return '<option' + (u === unidadCompra ? ' selected' : '') + '>' + u + '</option>'; }).join('') + '</select></div></div></div>' +
          '<div id="in-calc" class="aviso azul"></div></div>' +
          '<div class="grid3"><label class="campo"><span>Densidad (kg por litro)</span><input class="in num" id="in-dens" inputmode="decimal" value="' + (i.densidad || 1) + '" title="Para pasar de kg a litros. El agua es 1."></label>' +
          '<label class="campo"><span id="in-etq-stock">Stock actual</span><input class="in num" id="in-stock" inputmode="decimal" value="' + (num(i.stock) || '') + '"></label>' +
          '<label class="campo"><span id="in-etq-min">Avisar cuando quede menos de</span><input class="in num" id="in-min" inputmode="decimal" value="' + (num(i.stockMinimo) || '') + '"></label></div>' +
          '<div class="grid2"><label class="campo"><span>Proveedor</span><input class="in" id="in-prov" value="' + esc(i.proveedor || '') + '" placeholder="Opcional"></label>' +
          (id ? '<label class="check" style="align-self:end;padding-bottom:9px"><input type="checkbox" id="in-activo"' + (i.activo !== 'no' ? ' checked' : '') + '> Activo</label>' : '<span></span>') + '</div>';
      },
      pie: function () {
        return (id ? '<button class="btn peligro" type="button" id="in-borrar" style="margin-right:auto">' + ic('basura') + 'Eliminar</button>' : '') +
          '<button class="btn" type="button" data-cerrar2>Cancelar</button><button class="btn pri" type="button" id="in-ok">Guardar insumo</button>';
      },
      alAbrir: function (r, m) {
        var base = function () { var uc = $('#in-uc', r).value; return uc === 'g' || uc === 'kg' ? 'kg' : uc === 'ml' || uc === 'L' ? 'L' : 'u'; };
        var calc = function () {
          var uc = $('#in-uc', r).value, b = base();
          var cantBase = num($('#in-cant', r).value) * (uc === 'g' || uc === 'ml' ? 0.001 : 1);
          var tmp = { precioEnvase: num($('#in-precio', r).value), cantidadEnvase: cantBase, moneda: moneda, unidad: b };
          var cu = QG.costoUnitInsumo(tmp, dolar());
          $('#in-etq-precio', r).textContent = 'Precio del envase o bulto (' + (moneda === 'USD' ? 'US$' : '$') + ')';
          $('#in-etq-stock', r).textContent = 'Stock actual (' + b + ')';
          $('#in-etq-min', r).textContent = 'Avisar cuando quede menos de (' + b + ')';
          $('#in-dens', r).disabled = b === 'u';
          $('#in-calc', r).innerHTML = cantBase > 0 && tmp.precioEnvase > 0
            ? 'Te sale <b>' + pesos(cu) + ' por ' + b + '</b>' + (dolar() ? ' (' + usd(cu) + ')' : '') + (moneda === 'USD' ? ' · se recalcula solo con el dólar oficial' : '') + (b !== 'u' ? ' · ' + pesos(cu / 1000) + ' por ' + (b === 'kg' ? 'gramo' : 'ml') : '')
            : 'Completá precio y cantidad para ver el costo por unidad.';
        };
        $$('[data-mon]', r).forEach(function (b) {
          b.onclick = function () { moneda = b.getAttribute('data-mon'); $$('[data-mon]', r).forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); }); calc(); };
        });
        ['#in-precio', '#in-cant', '#in-uc'].forEach(function (s) { $(s, r).addEventListener('input', calc); $(s, r).addEventListener('change', calc); });
        calc();
        $('[data-cerrar2]', r).onclick = function () { cerrarModal(m); };
        var bb = $('#in-borrar', r);
        if (bb) bb.onclick = function () {
          confirmar('¿Eliminar el insumo "' + i.nombre + '"?', 'Eliminar insumo', function () { accion(null, 'borrarInsumo', { id: id }).then(function () { cerrarModal(m); }, function () {}); }, true);
        };
        $('#in-ok', r).onclick = function () {
          var uc = $('#in-uc', r).value;
          accion(this, 'guardarInsumo', {
            id: id, nombre: $('#in-nombre', r).value, tipo: $('#in-tipo', r).value, unidad: base(), moneda: moneda,
            precioEnvase: num($('#in-precio', r).value), cantidadEnvase: num($('#in-cant', r).value) * (uc === 'g' || uc === 'ml' ? 0.001 : 1),
            densidad: num($('#in-dens', r).value) || 1, stock: num($('#in-stock', r).value), stockMinimo: num($('#in-min', r).value),
            proveedor: $('#in-prov', r).value, activo: id ? $('#in-activo', r).checked : true
          }).then(function () { cerrarModal(m); }, function () {});
        };
      }
    });
  };

  /* ----- Entrada / salida de insumos (compras y ajustes) ----- */
  ACT.movInsumo = function (id) {
    var i = insumoPorId(id), tipo = 'entrada', adm = esAdmin();
    abrirModal({
      titulo: esc(i.nombre),
      cuerpo: function () {
        return '<p style="margin:0">Stock actual: <b>' + cantInsumo(i.stock, i.unidad) + '</b></p>' +
          '<div class="seg"><button type="button" data-tipo="entrada" aria-pressed="true">Entrada (compra)</button><button type="button" data-tipo="salida" aria-pressed="false">Salida (ajuste, rotura)</button></div>' +
          '<label class="campo"><span>Cantidad en ' + i.unidad + '</span><input class="in num" id="mi-cant" inputmode="decimal" autofocus placeholder="' + (i.unidad === 'u' ? '100' : '20') + '"></label>' +
          (adm ? '<div id="mi-precio-box"><label class="check"><input type="checkbox" id="mi-actualizar"> Actualizar el precio con esta compra</label>' +
            '<div class="grid2" id="mi-precio" hidden style="margin-top:10px"><label class="campo"><span>Precio pagado (' + (i.moneda === 'USD' ? 'US$' : '$') + ')</span><input class="in num" id="mi-pp" inputmode="decimal" value="' + num(i.precioEnvase) + '"></label>' +
            '<label class="campo"><span>Por cuánto (' + i.unidad + ')</span><input class="in num" id="mi-pc" inputmode="decimal" value="' + num(i.cantidadEnvase) + '"></label></div></div>' : '');
      },
      pie: function () { return '<button class="btn" type="button" data-cerrar2>Cancelar</button><button class="btn pri" type="button" id="mi-ok">Registrar</button>'; },
      alAbrir: function (r, m) {
        $$('[data-tipo]', r).forEach(function (b) {
          b.onclick = function () {
            tipo = b.getAttribute('data-tipo');
            $$('[data-tipo]', r).forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
            var pb = $('#mi-precio-box', r); if (pb) pb.hidden = tipo !== 'entrada';
          };
        });
        var act = $('#mi-actualizar', r);
        if (act) act.onchange = function () { $('#mi-precio', r).hidden = !act.checked; };
        $('[data-cerrar2]', r).onclick = function () { cerrarModal(m); };
        $('#mi-ok', r).onclick = function () {
          var c = Math.abs(num($('#mi-cant', r).value));
          if (!c) { toast('Ingresá la cantidad.', true); return; }
          var datos = { id: id, cantidad: tipo === 'entrada' ? c : -c };
          if (act && act.checked && tipo === 'entrada') { datos.precioEnvase = num($('#mi-pp', r).value); datos.cantidadEnvase = num($('#mi-pc', r).value); }
          accion(this, 'movimientoInsumo', datos).then(function () { cerrarModal(m); }, function () {});
        };
      }
    });
  };

  /* ----- Editor de fórmula (receta + presentaciones + precios) ----- */
  ACT.editarFormula = function (id) {
    var f0 = id ? formulaPorId(id) : null;
    var F = f0 ? JSON.parse(JSON.stringify(f0)) : { nombre: '', rinde: 50, ingredientes: [], extras: { minutos: 0, valorHora: 0, otros: 0 }, presentaciones: [], margenMay: 40, margenMin: 70, actualizarCosto: 'si', notas: '', activo: 'si' };
    F.extras = F.extras || { minutos: 0, valorHora: 0, otros: 0 };
    var unidadesPara = function (ins) { return ins.unidad === 'u' ? ['u'] : ins.unidad === 'kg' ? ['g', 'kg', 'ml', 'L'] : ['ml', 'L', 'g', 'kg']; };
    abrirModal({
      tam: 'lg', titulo: id ? 'Fórmula · ' + esc(F.nombre) : 'Nueva fórmula',
      cuerpo: function () {
        return '<div class="pe"><div class="pe-lado">' +
          '<div class="grid3"><label class="campo" style="grid-column:span 2"><span>Nombre del producto</span><input class="in" id="fo-nombre" value="' + esc(F.nombre) + '" placeholder="Suavizante Celeste" autofocus></label>' +
          '<label class="campo"><span>La tanda rinde (litros)</span><input class="in num" id="fo-rinde" inputmode="decimal" value="' + (F.rinde || '') + '"></label></div>' +
          '<div class="dropdown"><label class="campo"><span>Agregar ingrediente</span><label class="buscar" style="max-width:none">' + ic('buscar') +
          '<input class="in" id="fo-buscar" type="search" placeholder="Buscá un insumo: pasta, esencia, agua…" autocomplete="off"></label></label><div class="resultados" id="fo-res" hidden></div></div>' +
          '<div class="tabla-wrap"><table class="t items"><thead><tr><th>Ingrediente</th><th class="der">Cantidad</th><th>Unidad</th><th class="der">Costo</th><th></th></tr></thead><tbody id="fo-ing"></tbody></table></div>' +
          '<div class="grid3"><label class="campo"><span>Mano de obra (minutos por tanda)</span><input class="in num" id="fo-min" inputmode="decimal" value="' + (num(F.extras.minutos) || '') + '" placeholder="0"></label>' +
          '<label class="campo"><span>Valor de la hora $</span><input class="in num" id="fo-vh" inputmode="decimal" value="' + (num(F.extras.valorHora) || '') + '" placeholder="0"></label>' +
          '<label class="campo"><span>Otros gastos por tanda $</span><input class="in num" id="fo-otros" inputmode="decimal" value="' + (num(F.extras.otros) || '') + '" placeholder="Luz, gas…"></label></div>' +
          '<label class="campo"><span>Procedimiento / notas para el depósito</span><textarea class="in" id="fo-notas" rows="3" placeholder="Orden de mezcla, temperatura, tiempo de batido…">' + esc(F.notas) + '</textarea></label>' +
          '</div><div class="pe-lado">' +
          '<div class="resumen" id="fo-resumen"></div>' +
          '<div class="grid2"><label class="campo"><span>Ganancia mayorista %</span><input class="in num" id="fo-mmay" inputmode="decimal" value="' + (num(F.margenMay) || '') + '"></label>' +
          '<label class="campo"><span>Ganancia minorista %</span><input class="in num" id="fo-mmin" inputmode="decimal" value="' + (num(F.margenMin) || '') + '"></label></div>' +
          '<div class="campo"><span>Se vende como</span><div id="fo-pres" class="pres-lista"></div>' +
          '<div class="dropdown"><label class="buscar" style="max-width:none">' + ic('mas') + '<input class="in" id="fo-bprod" type="search" placeholder="Conectar producto: bidón 5 L, botella, suelto…" autocomplete="off"></label><div class="resultados" id="fo-rprod" hidden></div></div></div>' +
          '<label class="check"><input type="checkbox" id="fo-auto"' + (F.actualizarCosto !== 'no' ? ' checked' : '') + '> Actualizar solo el costo de estos productos</label>' +
          (id ? '<label class="check"><input type="checkbox" id="fo-activo"' + (F.activo !== 'no' ? ' checked' : '') + '> Fórmula activa</label>' : '') +
          '</div></div>';
      },
      pie: function () {
        return (id ? '<button class="btn peligro" type="button" id="fo-borrar" style="margin-right:auto">' + ic('basura') + 'Eliminar</button>' : '') +
          '<button class="btn" type="button" data-cerrar2>Cancelar</button><button class="btn" type="button" id="fo-ok-precios">Guardar y aplicar precios</button><button class="btn pri" type="button" id="fo-ok">Guardar fórmula</button>';
      },
      alAbrir: function (r, m) {
        var leerExtras = function () {
          F.nombre = $('#fo-nombre', r).value; F.rinde = num($('#fo-rinde', r).value);
          F.extras = { minutos: num($('#fo-min', r).value), valorHora: num($('#fo-vh', r).value), otros: num($('#fo-otros', r).value) };
          F.margenMay = num($('#fo-mmay', r).value); F.margenMin = num($('#fo-mmin', r).value); F.notas = $('#fo-notas', r).value;
        };
        var pintarIng = function () {
          var c = QG.costoFormula(F, D.insumos, dolar());
          $('#fo-ing', r).innerHTML = F.ingredientes.length ? F.ingredientes.map(function (it, n) {
            var ins = insumoPorId(it.insumoId);
            if (!ins) return '';
            var costo = c.detalle[n] ? c.detalle[n].costo : 0, pct = c.tanda ? costo / c.tanda * 100 : 0;
            return '<tr><td><b style="font-weight:500">' + esc(ins.nombre) + '</b>' + (ins.moneda === 'USD' ? ' <span class="chip plano pg-parcial">US$</span>' : '') +
              '<div class="barra-pct" title="' + Math.round(pct) + ' % del costo"><i style="width:' + Math.min(100, pct).toFixed(1) + '%"></i></div></td>' +
              '<td class="cant"><input class="in num" data-i="' + n + '" data-k="cantidad" inputmode="decimal" value="' + it.cantidad + '" aria-label="Cantidad"></td>' +
              '<td><select class="in" data-i="' + n + '" data-k="unidad" style="width:auto">' + unidadesPara(ins).map(function (u) { return '<option' + (u === it.unidad ? ' selected' : '') + '>' + u + '</option>'; }).join('') + '</select></td>' +
              '<td class="der num" data-costo="' + n + '">' + pesos(costo) + '<br><small class="muted">' + Math.round(pct) + ' %</small></td>' +
              '<td class="acc"><button class="btn icono chico peligro" type="button" data-quitar-i="' + n + '" aria-label="Quitar">' + ic('x') + '</button></td></tr>';
          }).join('') : '<tr><td colspan="5" class="vacio">Buscá los insumos arriba y poné la cantidad para una tanda.</td></tr>';
        };
        var pintarResumen = function () {
          var c = QG.costoFormula(F, D.insumos, dolar());
          $('#fo-resumen', r).innerHTML =
            '<div class="r"><span>Ingredientes</span><span>' + pesos(c.ingredientes) + '</span></div>' +
            (c.manoObra ? '<div class="r"><span>Mano de obra</span><span>' + pesos(c.manoObra) + '</span></div>' : '') +
            (c.otros ? '<div class="r"><span>Otros gastos</span><span>' + pesos(c.otros) + '</span></div>' : '') +
            '<div class="r total"><span>Tanda de ' + cant(F.rinde) + ' L</span><span>' + pesos(c.tanda) + '</span></div>' +
            '<div class="r" style="font-weight:600"><span>Costo por litro</span><span>' + pesos(c.porLitro) + '</span></div>' +
            (dolar() ? '<div class="r usd"><span>En dólares (oficial ' + pesos(dolar()) + ')</span><span>' + usd(c.porLitro) + ' / L</span></div>' : '') +
            (c.faltaDolar ? '<div class="aviso">Hay insumos en dólares y no hay cotización: cargá una manual en Ajustes.</div>' : '');
          pintarPres(c);
        };
        var pintarPres = function (c) {
          c = c || QG.costoFormula(F, D.insumos, dolar());
          var envases = (D.insumos || []).filter(function (i) { return i.tipo !== 'materia'; });
          $('#fo-pres', r).innerHTML = F.presentaciones.length ? F.presentaciones.map(function (pr, n) {
            var p = IDX.prod[pr.productoId];
            if (!p) return '';
            var co = QG.costoPresentacion(pr, c.porLitro, D.insumos, dolar());
            var sm = QG.precioSugerido(co.total, F.margenMay), sn = QG.precioSugerido(co.total, F.margenMin);
            var gm = co.total ? (num(p.precioMayorista) - co.total) / co.total * 100 : 0, gn = co.total ? (num(p.precioMinorista) - co.total) / co.total * 100 : 0;
            return '<div class="pres-item"><div class="pres-top"><span><b>' + esc(p.nombre) + '</b> <span class="muted">' + esc(p.presentacion) + '</span></span>' +
              '<button class="btn icono chico peligro" type="button" data-quitar-p="' + n + '" aria-label="Quitar">' + ic('x') + '</button></div>' +
              '<div class="fila" style="gap:8px"><label class="campo" style="width:92px"><span>Litros</span><input class="in num" data-p="' + n + '" data-k="litros" inputmode="decimal" value="' + pr.litros + '"></label>' +
              '<div class="campo" style="flex:1;min-width:0"><span>Envase</span><div class="fila" style="gap:6px">' + (pr.envases || []).map(function (e, k) {
                var ins = insumoPorId(e.insumoId);
                return '<span class="chip plano envase-chip">' + (num(e.cantidad) !== 1 ? cant(e.cantidad) + ' × ' : '') + esc(ins ? ins.nombre : '—') + '<button type="button" data-quitar-e="' + n + '|' + k + '" aria-label="Quitar">×</button></span>';
              }).join('') + (envases.length ? '<select class="in chico-sel" data-agregar-e="' + n + '" aria-label="Agregar envase"><option value="">+ envase</option>' + envases.map(function (i) { return '<option value="' + i.id + '">' + esc(i.nombre) + '</option>'; }).join('') + '</select>' : '') + '</div></div></div>' +
              '<div class="pres-nums"><span>Costo <b>' + pesos(Math.round(co.total)) + '</b></span>' +
              '<span class="' + (gm < F.margenMay - 0.5 ? 'mal' : 'bien') + '">May. ' + pesos(p.precioMayorista) + ' · ' + Math.round(gm) + ' %<small>sugerido ' + pesos(sm) + '</small></span>' +
              '<span class="' + (gn < F.margenMin - 0.5 ? 'mal' : 'bien') + '">Min. ' + pesos(p.precioMinorista) + ' · ' + Math.round(gn) + ' %<small>sugerido ' + pesos(sn) + '</small></span></div></div>';
          }).join('') : '<p class="muted" style="margin:0;font-size:.85rem">Conectá los productos que salen de esta fórmula para que su costo se calcule solo.</p>';
        };
        var todo = function () { pintarIng(); pintarResumen(); };

        // buscador de insumos
        var inp = $('#fo-buscar', r), res = $('#fo-res', r);
        var buscar = function () {
          var q = normal(inp.value);
          var lista = (D.insumos || []).filter(function (i) { return i.activo === 'si' && (!q || normal(i.nombre).indexOf(q) >= 0); }).slice(0, 10);
          res.hidden = false;
          res.innerHTML = lista.map(function (i, k) {
            return '<button type="button" data-ins="' + i.id + '"' + (k === 0 ? ' class="act"' : '') + '><span>' + esc(i.nombre) + ' <small>' + TIPO_INSUMO[i.tipo] + '</small></span><small class="num">' + pesos(costoUnit(i)) + ' / ' + i.unidad + '</small></button>';
          }).join('') || '<p class="vacio">No hay insumos con ese nombre. Crealo en la pestaña Insumos.</p>';
        };
        inp.addEventListener('input', buscar);
        inp.addEventListener('focus', buscar);
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); var a = $('[data-ins]', res); if (a) a.click(); } });
        res.addEventListener('click', function (e) {
          var b = e.target.closest('[data-ins]');
          if (!b) return;
          var ins = insumoPorId(b.getAttribute('data-ins'));
          F.ingredientes.push({ insumoId: ins.id, cantidad: 0, unidad: ins.unidad === 'u' ? 'u' : ins.unidad });
          inp.value = ''; res.hidden = true;
          todo();
          var q = $('[data-i="' + (F.ingredientes.length - 1) + '"][data-k="cantidad"]', r);
          if (q) { q.focus(); q.select(); }
        });
        // buscador de productos para conectar
        var bp = $('#fo-bprod', r), rp = $('#fo-rprod', r);
        var buscarProd = function () {
          var q = normal(bp.value), ya = {};
          F.presentaciones.forEach(function (p) { ya[p.productoId] = 1; });
          var base = normal(String(F.nombre).split(' ')[0]);
          var lista = D.productos.filter(function (p) { return p.activo === 'si' && !ya[p.id] && (q ? normal(p.nombre + ' ' + p.presentacion + ' ' + p.codigo).indexOf(q) >= 0 : base && normal(p.nombre).indexOf(base) >= 0); }).slice(0, 8);
          rp.hidden = false;
          rp.innerHTML = lista.map(function (p, k) {
            return '<button type="button" data-prod="' + p.id + '"' + (k === 0 ? ' class="act"' : '') + '><span>' + esc(p.nombre) + ' <small>' + esc(p.presentacion) + '</small></span><small class="num">' + pesos(p.precioMayorista) + '</small></button>';
          }).join('') || '<p class="vacio">Escribí el nombre del producto.</p>';
        };
        bp.addEventListener('input', buscarProd);
        bp.addEventListener('focus', buscarProd);
        bp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); var a = $('[data-prod]', rp); if (a) a.click(); } });
        rp.addEventListener('click', function (e) {
          var b = e.target.closest('[data-prod]');
          if (!b) return;
          var p = IDX.prod[b.getAttribute('data-prod')];
          var litros = QG.litrosDeTexto(p.presentacion) || QG.litrosDeTexto(p.nombre) || 1;
          // envase sugerido: bidón/botella del tamaño + tapa + etiqueta (si existen como insumos)
          var env = [];
          if (litros >= 0.2 && !/por litro|suelt|granel/i.test(p.presentacion + ' ' + p.nombre)) {
            (D.insumos || []).forEach(function (i) {
              if (i.tipo === 'materia') return;
              var l = QG.litrosDeTexto(i.nombre);
              if (l && Math.abs(l - litros) < 0.01) env.push({ insumoId: i.id, cantidad: 1 });
              else if (/tapa|etiqueta/i.test(i.nombre)) env.push({ insumoId: i.id, cantidad: 1 });
            });
          }
          F.presentaciones.push({ productoId: p.id, litros: litros, envases: env });
          bp.value = ''; rp.hidden = true;
          pintarPres();
        });
        r.addEventListener('click', function (e) {
          if (!e.target.closest('.dropdown')) { res.hidden = true; rp.hidden = true; }
          var qi = e.target.closest('[data-quitar-i]');
          if (qi) { F.ingredientes.splice(Number(qi.getAttribute('data-quitar-i')), 1); todo(); return; }
          var qp = e.target.closest('[data-quitar-p]');
          if (qp) { F.presentaciones.splice(Number(qp.getAttribute('data-quitar-p')), 1); pintarPres(); return; }
          var qe = e.target.closest('[data-quitar-e]');
          if (qe) { var k = qe.getAttribute('data-quitar-e').split('|'); F.presentaciones[k[0]].envases.splice(Number(k[1]), 1); pintarPres(); }
        });
        r.addEventListener('change', function (e) {
          var ae = e.target.getAttribute('data-agregar-e');
          if (ae !== null && e.target.value) { F.presentaciones[ae].envases.push({ insumoId: e.target.value, cantidad: 1 }); pintarPres(); return; }
          if (e.target.getAttribute('data-k') === 'unidad') { F.ingredientes[e.target.getAttribute('data-i')].unidad = e.target.value; todo(); }
        });
        r.addEventListener('input', function (e) {
          var el = e.target;
          if (el.getAttribute('data-i') !== null && el.getAttribute('data-k') === 'cantidad') {
            F.ingredientes[el.getAttribute('data-i')].cantidad = num(el.value);
            var c = QG.costoFormula(F, D.insumos, dolar());
            $$('[data-costo]', r).forEach(function (td) {
              var n = td.getAttribute('data-costo'), cc = c.detalle[n] ? c.detalle[n].costo : 0, pct = c.tanda ? cc / c.tanda * 100 : 0;
              td.innerHTML = pesos(cc) + '<br><small class="muted">' + Math.round(pct) + ' %</small>';
              var barra = td.parentNode.querySelector('.barra-pct i'); if (barra) barra.style.width = Math.min(100, pct).toFixed(1) + '%';
            });
            pintarResumen();
            return;
          }
          if (el.getAttribute('data-p') !== null) { F.presentaciones[el.getAttribute('data-p')].litros = num(el.value); pintarPres(); var x = $('[data-p="' + el.getAttribute('data-p') + '"]', r); if (x) { x.focus(); try { x.setSelectionRange(x.value.length, x.value.length); } catch (er) { /* */ } } return; }
          if (/^fo-(nombre|rinde|min|vh|otros|mmay|mmin|notas)$/.test(el.id)) { leerExtras(); pintarResumen(); }
        });
        $('[data-cerrar2]', r).onclick = function () { cerrarModal(m); };
        var fb = $('#fo-borrar', r);
        if (fb) fb.onclick = function () {
          confirmar('¿Eliminar la fórmula "' + F.nombre + '"? Los productos conservan su último costo.', 'Eliminar fórmula', function () {
            accion(null, 'borrarFormula', { id: id }).then(function () { cerrarModal(m); }, function () {});
          }, true);
        };
        var guardar = function (btn, aplicar) {
          leerExtras();
          F.actualizarCosto = $('#fo-auto', r).checked ? 'si' : 'no';
          if (id) F.activo = $('#fo-activo', r).checked ? 'si' : 'no';
          accion(btn, 'guardarFormula', F).then(function (res) {
            if (aplicar) return accion(btn, 'aplicarPreciosFormula', { id: res.resultado.id });
          }).then(function () { cerrarModal(m); }, function () {});
        };
        $('#fo-ok', r).onclick = function () { guardar(this, false); };
        $('#fo-ok-precios', r).onclick = function () { guardar(this, true); };
        todo();
      }
    });
  };

  /* ----- Registrar producción (o ver receta escalada) ----- */
  ACT.producir = function (id) { modalProduccion(id, false); };
  function modalProduccion(formulaId, soloReceta) {
    var activas = (D.formulas || []).filter(function (f) { return f.activo === 'si'; });
    if (!activas.length) { toast('Primero creá una fórmula.', true); return; }
    var f = formulaPorId(formulaId) || activas[0];
    var litros = num(f.rinde), salidas = {};
    abrirModal({
      tam: 'md', titulo: soloReceta ? 'Receta · ' + esc(f.nombre) : 'Nueva producción',
      cuerpo: function () {
        return '<div class="grid3"><label class="campo" style="grid-column:span 2"><span>Fórmula</span><select class="in" id="pr-f">' + activas.map(function (x) { return '<option value="' + x.id + '"' + (x.id === f.id ? ' selected' : '') + '>' + esc(x.nombre) + ' (rinde ' + cant(x.rinde) + ' L)</option>'; }).join('') + '</select></label>' +
          '<label class="campo"><span>Litros a fabricar</span><input class="in num" id="pr-l" inputmode="decimal" value="' + litros + '"></label></div>' +
          '<div class="fila" id="pr-mult"></div>' +
          '<div id="pr-receta"></div>' +
          (soloReceta ? '' : '<div id="pr-envasado"></div>' +
            '<div class="grid3"><label class="campo"><span>Fecha</span><input class="in" id="pr-fecha" type="date" value="' + D.hoy + '"></label>' +
            '<label class="campo"><span>Lote</span><input class="in mono" id="pr-lote" placeholder="Automático"></label>' +
            '<label class="campo"><span>Notas</span><input class="in" id="pr-notas" placeholder="Opcional"></label></div>');
      },
      pie: function () { return soloReceta ? '<button class="btn" type="button" data-cerrar2>Cerrar</button>' : '<button class="btn" type="button" data-cerrar2>Cancelar</button><button class="btn ok" type="button" id="pr-ok">' + ic('matraz') + 'Registrar producción</button>'; },
      alAbrir: function (r, m) {
        var pintar = function () {
          var plan = QG.planProduccion(f, litros, Object.keys(salidas).map(function (k) { return { productoId: k, cantidad: salidas[k] }; }), D.insumos, D.productos, dolar());
          $('#pr-mult', r).innerHTML = '<span class="muted" style="font-size:.84rem">Tandas:</span>' + [0.5, 1, 2, 3, 4].map(function (k) {
            return '<button class="btn chico' + (Math.abs(litros - k * f.rinde) < 0.01 ? ' pri' : '') + '" type="button" data-mult="' + k + '">' + (k === 0.5 ? '½' : '×' + k) + ' · ' + cant(k * f.rinde) + ' L</button>';
          }).join('');
          var ingredientes = plan.consumos.filter(function (c) { var i = insumoPorId(c.insumoId); return i && i.tipo === 'materia'; });
          var envases = plan.consumos.filter(function (c) { var i = insumoPorId(c.insumoId); return i && i.tipo !== 'materia'; });
          var fila = function (c) {
            var falta = c.cantidad > c.stock + 1e-9;
            return '<tr><td>' + esc(c.nombre) + '</td><td class="der num"><b>' + cantInsumo(c.cantidad, c.unidad) + '</b></td><td class="der num muted">' + cantInsumo(c.stock, c.unidad) + '</td>' +
              '<td>' + (falta ? '<span class="chip pg-pendiente">Falta ' + cantInsumo(c.cantidad - c.stock, c.unidad) + '</span>' : '<span class="chip pg-pagado">OK</span>') + '</td>' +
              (verCostos() && !soloReceta ? '<td class="der num">' + pesos(c.costo) + '</td>' : '') + '</tr>';
          };
          $('#pr-receta', r).innerHTML = '<h3 class="sub">Ingredientes para ' + cant(litros) + ' L</h3><div class="tabla-wrap"><table class="t"><thead><tr><th>Insumo</th><th class="der">Usar</th><th class="der">Hay</th><th></th>' + (verCostos() && !soloReceta ? '<th class="der">Costo</th>' : '') + '</tr></thead><tbody>' +
            ingredientes.map(fila).join('') + (envases.length ? '<tr><td colspan="5" class="muted" style="font-size:.75rem;text-transform:uppercase;letter-spacing:.06em;background:var(--surface-2)">Envases</td></tr>' + envases.map(fila).join('') : '') + '</tbody></table></div>' +
            (f.notas ? '<div class="aviso azul" style="margin-top:10px"><b>Procedimiento:</b> ' + esc(f.notas) + '</div>' : '');
          if (soloReceta) return;
          var tanque = QG.tanqueDeFormula(f, D.productos);
          var pres = (f.presentaciones || []).filter(function (p) { return IDX.prod[p.productoId] && IDX.prod[p.productoId].modoStock !== 'tanque'; });
          var pct = litros ? Math.min(100, plan.litrosEnvasados / litros * 100) : 0, pasado = plan.litrosEnvasados > litros * 1.02 + 0.01;
          $('#pr-envasado', r).innerHTML = '<h3 class="sub">¿Cómo lo envasaste?</h3>' + (pres.length ? '<div class="env-grid">' + pres.map(function (p) {
            var prod = IDX.prod[p.productoId];
            return '<label class="env-item"><span><b>' + esc(prod.presentacion || prod.nombre) + '</b><small class="muted">' + cant(p.litros) + ' L c/u · stock ' + cant(prod.stock) + '</small></span>' +
              '<input class="in num" data-sal="' + p.productoId + '" inputmode="numeric" value="' + (salidas[p.productoId] || '') + '" placeholder="0"></label>';
          }).join('') + '</div>' +
            '<div class="progreso' + (pasado ? ' pasado' : '') + '"><i style="width:' + pct.toFixed(1) + '%"></i></div>' +
            '<p class="muted" style="margin:4px 0 0;font-size:.85rem">' + (pasado ? '<b class="bajo">Envasaste ' + cant(plan.litrosEnvasados) + ' L y la tanda es de ' + cant(litros) + ' L.</b>' :
              cant(plan.litrosEnvasados) + ' de ' + cant(litros) + ' L envasados' + (litros - plan.litrosEnvasados > 0.05 ? (tanque ? ' · <b style="color:var(--st-listo)">' + cant(litros - plan.litrosEnvasados) + ' L van al tanque ' + esc(tanque.nombre) + '</b> (hay ' + cant(tanque.stock) + ' L)' : ' · quedan ' + cant(litros - plan.litrosEnvasados) + ' L a granel <span title="Marcá el producto suelto de esta fórmula como Tanque para que esos litros sumen stock">(sin tanque)</span>') : ' · ¡completo!')) +
            (verCostos() ? ' · costo de la tanda <b>' + pesos(plan.costoTotal) + '</b> (' + pesos(plan.costoTotal / Math.max(1, litros)) + '/L)' : '') + '</p>'
            : (tanque ? '<p class="muted">Los ' + cant(litros) + ' L van al tanque <b>' + esc(tanque.nombre) + '</b> (hay ' + cant(tanque.stock) + ' L). Después envasás desde Productos o desde el pedido.</p>' : '<p class="muted">Esta fórmula no tiene productos conectados: se registra a granel, sin sumar stock de productos.</p>'));
        };
        $('#pr-f', r).onchange = function () { f = formulaPorId(this.value); litros = num(f.rinde); salidas = {}; $('#pr-l', r).value = litros; pintar(); };
        $('#pr-l', r).addEventListener('input', function () { litros = num(this.value); pintar(); });
        r.addEventListener('click', function (e) {
          var b = e.target.closest('[data-mult]');
          if (b) { litros = num(b.getAttribute('data-mult')) * num(f.rinde); $('#pr-l', r).value = litros; pintar(); }
        });
        r.addEventListener('change', function (e) {
          var s = e.target.getAttribute('data-sal');
          if (s) { salidas[s] = Math.max(0, Math.round(num(e.target.value))); pintar(); var x = $('[data-sal="' + s + '"]', r); if (x) x.blur(); }
        });
        $('[data-cerrar2]', r).onclick = function () { cerrarModal(m); };
        var ok = $('#pr-ok', r);
        if (ok) ok.onclick = function () {
          $$('[data-sal]', r).forEach(function (i) { salidas[i.getAttribute('data-sal')] = Math.max(0, Math.round(num(i.value))); });
          var lista = Object.keys(salidas).filter(function (k) { return salidas[k] > 0; }).map(function (k) { return { productoId: k, cantidad: salidas[k] }; });
          accion(this, 'registrarProduccion', { formulaId: f.id, litros: litros, salidas: lista, fecha: $('#pr-fecha', r).value, lote: $('#pr-lote', r).value, notas: $('#pr-notas', r).value })
            .then(function (res) {
              cerrarModal(m);
              S.prod.tab = 'historial';
              render();
              var lote = res.resultado && res.resultado.lote;
              var ultima = (D.producciones || []).filter(function (x) { return x.lote === lote; })[0];
              if (ultima && (ultima.salidas || []).length) {
                confirmar('Producción registrada · lote ' + lote + '. ¿Querés imprimir las etiquetas de lo envasado?', 'Ir a etiquetas', function () { irAEtiquetas(ultima.salidas, lote); });
              }
            }, function () {});
        };
        pintar();
      }
    });
  }

  /* ----- Traer insumos y fórmulas desde CosteApp ----- */
  ACT.importarCosteApp = function () {
    var datos = null;
    abrirModal({
      tam: 'md', titulo: 'Traer de CosteApp',
      cuerpo: function () {
        return '<div class="aviso azul"><b>Cómo conseguir el respaldo:</b> en CosteApp andá a <b>Mi Cuenta → Enviar respaldo por email</b>. Te llega un archivo <span class="mono">costeapp-respaldo-….json</span>: descargalo y elegilo acá.<br>' +
          'Si un insumo o fórmula ya existe con el mismo nombre, se actualiza (no se duplica).</div>' +
          '<label class="campo"><span>Archivo de respaldo (.json)</span><input class="in" type="file" id="ca-arch" accept=".json,application/json"></label>' +
          '<label class="check"><input type="checkbox" id="ca-limpieza" checked> Traer solo las fórmulas de limpieza</label>' +
          '<div id="ca-prev"></div>';
      },
      pie: function () { return '<button class="btn" type="button" data-cerrar2>Cancelar</button><button class="btn pri" type="button" id="ca-ok" disabled>Importar</button>'; },
      alAbrir: function (r, m) {
        var mostrar = function () {
          if (!datos) return;
          var forms = datos.formulas.filter(function (f) { return !$('#ca-limpieza', r).checked || f.categoria === 'limpieza'; });
          $('#ca-prev', r).innerHTML = '<div class="card" style="box-shadow:none"><b>' + datos.materias.length + ' materias primas</b> y <b>' + forms.length + ' fórmulas</b>' +
            (forms.length ? ': ' + forms.slice(0, 8).map(function (f) { return esc(f.nombre); }).join(', ') + (forms.length > 8 ? '…' : '') : '') + '</div>';
          $('#ca-ok', r).disabled = !(datos.materias.length || forms.length);
        };
        $('#ca-arch', r).onchange = function () {
          var file = this.files[0];
          if (!file) return;
          var lector = new FileReader();
          lector.onload = function () {
            try {
              var j = JSON.parse(String(lector.result));
              var d = j.datos || j;
              datos = { materias: Array.isArray(d.materias) ? d.materias : [], formulas: Array.isArray(d.formulas) ? d.formulas : [] };
              if (!datos.materias.length && !datos.formulas.length) throw new Error('vacío');
              mostrar();
            } catch (e) { datos = null; $('#ca-prev', r).innerHTML = '<div class="aviso rojo">Ese archivo no es un respaldo de CosteApp. Elegí el .json que te llegó por email.</div>'; $('#ca-ok', r).disabled = true; }
          };
          lector.readAsText(file);
        };
        $('#ca-limpieza', r).onchange = mostrar;
        $('[data-cerrar2]', r).onclick = function () { cerrarModal(m); };
        $('#ca-ok', r).onclick = function () {
          var forms = datos.formulas.filter(function (f) { return !$('#ca-limpieza', r).checked || f.categoria === 'limpieza'; });
          var usadas = {};
          forms.forEach(function (f) { (f.ingredientes || []).forEach(function (i) { usadas[i.materiaId] = 1; }); });
          var mats = $('#ca-limpieza', r).checked ? datos.materias.filter(function (x) { return usadas[x.id]; }) : datos.materias;
          accion(this, 'importarCosteApp', { materias: mats, formulas: forms }).then(function () { cerrarModal(m); S.prod.tab = 'formulas'; render(); }, function () {});
        };
      }
    });
  };

  /* ============================================================
   * 15. ETIQUETAS PARA LOS ENVASES
   * Una etiqueta por tipo de producto (sin litros): sirve igual
   * para 1 L y para bidón de 5 L. Siempre lleva el logo.
   * ============================================================ */
  /* Tamaños según el envase. Usable de la hoja A4: 200 × 287 mm. */
  var TAM_ETQ = {
    bidon5: { t: 'Bidón 5 L', w: 95, h: 90, f: 1.12 },
    env25: { t: 'Envase 2,5 L', w: 66, h: 71, f: .78 },
    env1: { t: 'Botella 1 L', w: 66, h: 57, f: .7 },
    perf250: { t: 'Perfumina 250 cc', w: 49, h: 57, f: .62, sinTextos: true },
    pers: { t: 'Personalizada', w: 70, h: 60 }
  };
  function medidaEtq(tam) {
    var m = TAM_ETQ[tam] || TAM_ETQ.bidon5;
    if (tam !== 'pers') return m;
    var w = Math.min(190, Math.max(35, num(leerLocal('ac_etq_w')) || 70));
    var h = Math.min(270, Math.max(35, num(leerLocal('ac_etq_h')) || 60));
    var f = Math.max(.55, Math.min(1.3, Math.min(w / 95, h / 90)));
    return { t: 'Personalizada', w: w, h: h, f: f, sinTextos: h < 50 || w < 45 };
  }
  function porHoja(m) { return Math.max(1, Math.floor(200 / m.w)) * Math.max(1, Math.floor(287 / m.h)); }
  function textoSobre(hex) {
    var n = parseInt(String(hex || '#1e40af').slice(1), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#111111' : '#ffffff';
  }
  /* Ilustraciones de aroma para las perfuminas (100 × 100), estilo realista:
     volumen con degradés, brillos, sombras y texturas. Hechas a mano, sin internet. */
  var ILUS = (function () {
    var azar = function (s) { return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; };
    var st = function (l) { return l.map(function (s) { return '<stop offset="' + s[0] + '%" stop-color="' + s[1] + '"' + (s[2] !== undefined ? ' stop-opacity="' + s[2] + '"' : '') + '/>'; }).join(''); };
    var rg = function (id, l, cx, cy, r, fx, fy) { return '<radialGradient id="' + id + '" cx="' + cx + '%" cy="' + cy + '%" r="' + r + '%"' + (fx !== undefined ? ' fx="' + fx + '%" fy="' + fy + '%"' : '') + '>' + st(l) + '</radialGradient>'; };
    var lg = function (id, l, x1, y1, x2, y2) { return '<linearGradient id="' + id + '" x1="' + x1 + '%" y1="' + y1 + '%" x2="' + x2 + '%" y2="' + y2 + '%">' + st(l) + '</linearGradient>'; };
    // comunes: sombra en el piso, brillo, hojas
    var COMUN = rg('sh', [[0, '#000', .32], [60, '#000', .12], [100, '#000', 0]], 50, 50, 50) +
      rg('br', [[0, '#fff', .95], [45, '#fff', .45], [100, '#fff', 0]], 50, 50, 50) +
      lg('hj', [[0, '#a6d96a'], [45, '#5ea83a'], [100, '#24601a']], 0, 0, 100, 100) +
      lg('hj2', [[0, '#7cc25a'], [50, '#3d8a2a'], [100, '#17470f']], 0, 100, 100, 0);
    var sombra = function (cx, cy, rx, ry) { return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="url(#sh)"/>'; };
    var brillo = function (cx, cy, rx, ry, rot, op) { return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="url(#br)"' + (op ? ' opacity="' + op + '"' : '') + (rot ? ' transform="rotate(' + rot + ' ' + cx + ' ' + cy + ')"' : '') + '/>'; };
    /** Hoja con nervaduras. Apunta a la derecha; largo 40 × escala. */
    var hoja = function (x, y, rot, s, g, dentada) {
      var borde;
      if (dentada) {
        var arriba = [], abajo = [];
        for (var i = 0; i <= 12; i++) {
          var t = i / 12, px = t * 40, w = Math.sin(Math.PI * Math.pow(t, .8)) * 13;
          var d = i % 2 ? 1.6 : 0;
          arriba.push((px).toFixed(1) + ' ' + (-(w + d)).toFixed(1));
          abajo.unshift((px).toFixed(1) + ' ' + (w + d).toFixed(1));
        }
        borde = 'M0 0L' + arriba.join('L') + 'L' + abajo.join('L') + 'Z';
      } else borde = 'M0 0C7-12 25-14 40 0C25 13 7 12 0 0Z';
      return '<g transform="translate(' + x + ' ' + y + ') rotate(' + rot + ') scale(' + s + ')"><path d="' + borde + '" fill="url(#' + (g || 'hj') + ')"' + (dentada ? ' stroke-linejoin="round" stroke="#2c6b1c" stroke-width=".4"' : '') + '/>' +
        '<path d="M0 0C10 0 22-1 39 0" fill="none" stroke="#1d4d12" stroke-width="1" opacity=".55"/>' +
        '<path d="M9 0l6-6M17 0l6-7M25 0l6-6M9 0l6 6M17 0l6 7M25 0l6 6" fill="none" stroke="#1d4d12" stroke-width=".55" opacity=".4"/>' +
        '<path d="M4-3C12-9 24-10 34-4" fill="none" stroke="#e9f7c9" stroke-width="1.2" opacity=".35" stroke-linecap="round"/></g>';
    };
    var D = {};

    D.coco = function () {
      var r = azar(7), fibras = '';
      for (var i = 0; i < 70; i++) {
        var a = r() * Math.PI * 2, rr = 14 + r() * 13, x = 62 + Math.cos(a) * rr, y = 36 + Math.sin(a) * rr * .95;
        fibras += '<path d="M' + x.toFixed(1) + ' ' + y.toFixed(1) + 'l' + (r() * 5 - 2.5).toFixed(1) + ' ' + (r() * 5 - 2.5).toFixed(1) + '" stroke="' + (r() > .5 ? '#3b2210' : '#a77a4c') + '" stroke-width=".7" opacity=".6"/>';
      }
      return '<defs>' + rg('c1', [[0, '#a8794a'], [55, '#6b4423'], [100, '#2e1a0b']], 40, 35, 65) +
        rg('c2', [[0, '#ffffff'], [70, '#fbf6ea'], [100, '#e3d6bb']], 45, 40, 60) +
        lg('c3', [[0, '#7a4e2a'], [100, '#2e1a0b']], 0, 0, 0, 100) + rg('c4', [[0, '#d9ccb0'], [100, '#fffaf0']], 50, 30, 70) + '</defs>' +
        sombra(52, 86, 42, 7) +
        '<circle cx="62" cy="36" r="27" fill="url(#c1)"/>' + fibras +
        '<circle cx="56" cy="27" r="2.6" fill="#24140a"/><circle cx="64" cy="25" r="2.6" fill="#24140a"/><circle cx="60" cy="33" r="2.6" fill="#24140a"/>' +
        brillo(52, 22, 8, 4, -30, .5) +
        '<path d="M6 58a38 30 0 0 0 76 0Z" fill="url(#c3)"/>' +
        '<path d="M10 58a34 25 0 0 0 68 0Z" fill="url(#c2)"/>' +
        '<ellipse cx="44" cy="58" rx="38" ry="9" fill="url(#c3)"/><ellipse cx="44" cy="58" rx="35" ry="7.4" fill="#fffdf6"/>' +
        '<ellipse cx="44" cy="58.6" rx="26" ry="4.8" fill="url(#c4)"/><ellipse cx="38" cy="57.4" rx="10" ry="1.4" fill="#fff" opacity=".9"/>' +
        brillo(26, 70, 9, 4, 25, .55);
    };
    D.vainilla = function () {
      var vaina = function (d, g) { return '<path d="' + d + '" fill="none" stroke="url(#' + g + ')" stroke-width="6" stroke-linecap="round"/>'; };
      var petalo = function (rot) { return '<path d="M0 0C-6-8-5-22 0-27C5-22 6-8 0 0Z" fill="url(#v3)" stroke="#d8c98a" stroke-width=".5" transform="rotate(' + rot + ')"/>'; };
      return '<defs>' + lg('v1', [[0, '#5a3720'], [50, '#2b170a'], [100, '#140a03']], 0, 0, 100, 100) + lg('v2', [[0, '#6b4528'], [100, '#1a0d05']], 0, 0, 100, 100) +
        lg('v3', [[0, '#fffbe6'], [60, '#f6ecb8'], [100, '#e2cf78']], 0, 0, 0, 100) + rg('v4', [[0, '#ffe36b'], [60, '#f2b705'], [100, '#c58a00']], 45, 40, 60) + '</defs>' +
        sombra(52, 88, 40, 6) +
        vaina('M14 84C30 62 52 40 86 16', 'v1') + vaina('M20 88C40 66 60 46 92 26', 'v2') + vaina('M10 76C28 58 46 38 74 10', 'v1') +
        '<path d="M16 80C32 61 52 41 82 18M22 84C41 64 61 46 88 28" fill="none" stroke="#c69b6d" stroke-width=".9" opacity=".55"/>' +
        hoja(48, 66, 25, .8, 'hj') +
        '<g transform="translate(34 36)">' + [0, 72, 144, 216, 288].map(petalo).join('') +
        '<path d="M0 2C-7 2-9 10-4 14C0 16 4 15 6 11C8 6 5 2 0 2Z" fill="#f3e08f" stroke="#cfae3c" stroke-width=".6"/><circle r="4.2" fill="url(#v4)"/>' + brillo(-1.5, -1.5, 1.8, 1.2) + '</g>';
    };
    D.lavanda = function () {
      var r = azar(11), o = '<defs>' + lg('l1', [[0, '#c7b3f0'], [50, '#8b67d1'], [100, '#4d2f91']], 0, 0, 100, 100) + lg('l2', [[0, '#7da35a'], [100, '#3b5f22']], 0, 0, 100, 0) +
        lg('l3', [[0, '#a789e0'], [100, '#5e3aa8']], 0, 0, 100, 100) + lg('l4', [[0, '#e6d6ff'], [100, '#9d7fe0']], 0, 0, 0, 100) + '</defs>' + sombra(50, 92, 30, 4);
      var tallos = [[28, 22, -8], [42, 12, -3], [56, 10, 3], [70, 20, 9], [50, 26, 0]];
      tallos.forEach(function (t) { o += '<path d="M50 92Q' + ((50 + t[0]) / 2) + ' 60 ' + t[0] + ' ' + (t[1] + 30) + '" fill="none" stroke="url(#l2)" stroke-width="1.8" stroke-linecap="round"/>'; });
      tallos.forEach(function (t) {
        for (var i = 0; i < 9; i++) {
          var y = t[1] + i * 3.4, x = t[0] + t[2] * i / 30, w = 3.2 - i * .1;
          o += '<ellipse cx="' + (x - 2).toFixed(1) + '" cy="' + y.toFixed(1) + '" rx="' + w.toFixed(1) + '" ry="2.4" fill="url(#' + (r() > .5 ? 'l1' : 'l3') + ')" transform="rotate(-30 ' + (x - 2).toFixed(1) + ' ' + y.toFixed(1) + ')"/>' +
            '<ellipse cx="' + (x + 2).toFixed(1) + '" cy="' + (y + 1.4).toFixed(1) + '" rx="' + w.toFixed(1) + '" ry="2.4" fill="url(#' + (r() > .5 ? 'l1' : 'l3') + ')" transform="rotate(30 ' + (x + 2).toFixed(1) + ' ' + (y + 1.4).toFixed(1) + ')"/>' +
            (r() > .55 ? '<circle cx="' + (x + (r() - .5) * 3).toFixed(1) + '" cy="' + (y - .6).toFixed(1) + '" r=".9" fill="url(#l4)"/>' : '');
        }
      });
      return o + '<path d="M40 78C44 74 56 74 60 78L58 84C54 81 46 81 42 84Z" fill="#7a5bb8"/><path d="M42 80C46 77 54 77 58 80" stroke="#c8b6ee" stroke-width=".8" fill="none"/>' +
        '<path d="M44 82C38 88 34 92 30 94M56 82C62 88 68 90 72 92" stroke="#7a5bb8" stroke-width="2" fill="none" stroke-linecap="round"/>';
    };
    D.rosa = function () {
      var p = function (d, g) { return '<path d="' + d + '" fill="url(#' + g + ')" stroke="#6e0820" stroke-width=".35" stroke-opacity=".45"/>'; };
      var borde = function (d, op) { return '<path d="' + d + '" fill="none" stroke="#ffc2d1" stroke-width="1" stroke-linecap="round" opacity="' + (op || .75) + '"/>'; };
      return '<defs>' + lg('r1', [[0, '#ff86a3'], [45, '#e2335f'], [100, '#99102f']], 0, 0, 0, 100) + rg('r2', [[0, '#ff9fb7'], [60, '#e8416b'], [100, '#a8143c']], 50, 30, 70) +
        lg('r3', [[0, '#b8163f'], [100, '#5c0619']], 0, 0, 0, 100) + lg('r4', [[0, '#d42353'], [100, '#7a0b26']], 0, 0, 100, 100) + lg('r5', [[0, '#4f8a32'], [100, '#2a521a']], 0, 0, 100, 0) + '</defs>' +
        sombra(52, 93, 24, 3.5) +
        '<path d="M50 60C49 72 51 84 50 93" stroke="url(#r5)" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M50 74l-3.5-2.5M51 84l3.5-2.5" stroke="#2a521a" stroke-width="1.6" stroke-linecap="round"/>' +
        hoja(50, 80, 195, .75, 'hj2', true) + hoja(51, 70, -28, .7, 'hj', true) +
        p('M28 30C26 16 42 8 50 12C58 8 74 16 72 30Z', 'r3') +
        p('M30 24C16 28 16 50 30 58C27 46 29 36 36 30Z', 'r4') + p('M70 24C84 28 84 50 70 58C73 46 71 36 64 30Z', 'r4') +
        '<ellipse cx="50" cy="34" rx="22" ry="13" fill="url(#r3)"/>' +
        p('M30 30C30 46 40 55 50 55C60 55 70 46 70 30C64 36 58 38 50 38C42 38 36 36 30 30Z', 'r2') +
        p('M37 28C37 18 44 13 50 13C56 13 63 18 63 28C59 32 55 33 50 33C45 33 41 32 37 28Z', 'r1') +
        '<ellipse cx="50" cy="21" rx="9" ry="4.6" fill="#6e0820"/>' +
        '<path d="M42 22C43 17 50 15 55 18C58 20 56 24 52 24C49 24 48 22 50 21" fill="none" stroke="#ff8fab" stroke-width="1.1" stroke-linecap="round"/>' +
        p('M37 28C38 21 45 18 50 20C45 22 42 27 42 33C39 32 37 30 37 28Z', 'r2') + p('M63 28C62 21 55 18 51 19C56 22 58 27 58 33C61 32 63 30 63 28Z', 'r1') +
        p('M22 36C21 29 26 25 31 27C31 36 35 43 40 48C30 48 23 43 22 36Z', 'r1') + p('M78 36C79 29 74 25 69 27C69 36 65 43 60 48C70 48 77 43 78 36Z', 'r4') +
        p('M24 38C25 56 37 65 50 65C63 65 75 56 76 38C70 48 60 53 50 53C40 53 30 48 24 38Z', 'r1') +
        borde('M26 40C32 49 42 53 50 53C58 53 68 49 74 40') + borde('M38 28C40 20 46 16 50 16C54 16 60 20 62 28', .6) + borde('M30 31C35 36 42 38 50 38C58 38 65 36 70 31', .45) +
        brillo(34, 56, 7, 2.2, 25, .4) + brillo(43, 18, 4, 1.4, -15, .45);
    };
    D.jazmin = function () {
      var flor = function (x, y, s, rot) {
        var o = '<g transform="translate(' + x + ' ' + y + ') rotate(' + rot + ') scale(' + s + ')">';
        for (var i = 0; i < 5; i++) o += '<path d="M0 0C-5-4-7-14-2-19C1-21 4-19 4-15C5-9 3-4 0 0Z" fill="url(#j1)" stroke="#d9d2bf" stroke-width=".5" transform="rotate(' + i * 72 + ')"/>';
        return o + '<circle r="3" fill="url(#j2)"/><circle r="1.2" fill="#c9a227"/></g>';
      };
      return '<defs>' + lg('j1', [[0, '#ffffff'], [70, '#f7f3e8'], [100, '#e6dcc4']], 0, 100, 0, 0) + rg('j2', [[0, '#fff7c2'], [100, '#e3c25a']], 50, 50, 50) +
        lg('j3', [[0, '#ffe3ea'], [100, '#f2a7b8']], 0, 0, 0, 100) + '</defs>' + sombra(50, 90, 36, 5) +
        '<path d="M14 86C34 70 56 56 88 48" stroke="#4d6b2a" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
        hoja(30, 76, -150, .8, 'hj2') + hoja(44, 66, 20, .85, 'hj') + hoja(64, 56, -150, .7, 'hj2') + hoja(70, 54, 10, .8, 'hj') +
        flor(36, 46, 1.1, 10) + flor(66, 30, .95, -20) + flor(80, 62, .7, 30) +
        '<path d="M52 58C50 50 54 44 57 42C59 46 58 52 52 58Z" fill="url(#j3)"/><path d="M22 62C18 56 20 50 23 48C26 52 25 58 22 62Z" fill="url(#j3)"/>';
    };
    D.limon = function () {
      var r = azar(5), poros = '';
      for (var i = 0; i < 45; i++) { var a = r() * 6.28, d = Math.sqrt(r()) * 20; poros += '<circle cx="' + (40 + Math.cos(a) * d * 1.3).toFixed(1) + '" cy="' + (38 + Math.sin(a) * d * .9).toFixed(1) + '" r=".55" fill="#c99a00" opacity=".45"/>'; }
      var gajos = '';
      for (var k = 0; k < 9; k++) gajos += '<path d="M0 0L' + (Math.cos(k * .698) * 15.5).toFixed(1) + ' ' + (Math.sin(k * .698) * 15.5).toFixed(1) + 'A15.5 15.5 0 0 1 ' + (Math.cos((k + 1) * .698 - .08) * 15.5).toFixed(1) + ' ' + (Math.sin((k + 1) * .698 - .08) * 15.5).toFixed(1) + 'Z" fill="url(#m3)" transform="rotate(4)"/>';
      return '<defs>' + rg('m1', [[0, '#fff7a8'], [45, '#f7d81c'], [100, '#c99400']], 35, 30, 75) + rg('m3', [[0, '#fffbd0'], [100, '#f6dc4a']], 0, 0, 100) +
        rg('m4', [[0, '#fffde8'], [100, '#f1e4a0']], 50, 50, 50) + '</defs>' + sombra(52, 88, 42, 6) +
        hoja(50, 26, -18, .85, 'hj') + hoja(52, 27, -80, .62, 'hj2') +
        '<path d="M8 40C8 26 22 18 40 18C58 18 72 26 74 38C76 40 78 42 77 44C74 56 58 62 40 62C22 62 8 54 8 40Z" fill="url(#m1)" transform="rotate(-8 40 40)"/>' + poros +
        brillo(28, 30, 12, 5, -20, .7) +
        '<g transform="translate(66 64)"><circle r="20" fill="#f5cc1a"/><circle r="18.3" fill="url(#m4)"/>' + gajos +
        '<circle r="2.2" fill="#fffbe0"/>' + brillo(-6, -7, 6, 2.5, -40, .7) + '</g>';
    };
    D.naranja = function () {
      var r = azar(9), poros = '';
      for (var i = 0; i < 60; i++) { var a = r() * 6.28, d = Math.sqrt(r()) * 24; poros += '<circle cx="' + (38 + Math.cos(a) * d).toFixed(1) + '" cy="' + (46 + Math.sin(a) * d).toFixed(1) + '" r=".6" fill="#b5480a" opacity=".4"/>'; }
      var gajos = '';
      for (var k = 0; k < 10; k++) gajos += '<path d="M0 0L' + (Math.cos(k * .628) * 15).toFixed(1) + ' ' + (Math.sin(k * .628) * 15).toFixed(1) + 'A15 15 0 0 1 ' + (Math.cos((k + 1) * .628 - .07) * 15).toFixed(1) + ' ' + (Math.sin((k + 1) * .628 - .07) * 15).toFixed(1) + 'Z" fill="url(#n3)"/>';
      return '<defs>' + rg('n1', [[0, '#ffd08a'], [40, '#ff9a1f'], [100, '#c2500a']], 35, 30, 75) + rg('n3', [[0, '#ffe0a8'], [100, '#ff9d2e']], 0, 0, 100) + '</defs>' +
        sombra(54, 88, 42, 6) + '<circle cx="38" cy="46" r="28" fill="url(#n1)"/>' + poros +
        '<path d="M38 19C37 17 37 15 39 13" stroke="#5a3a1c" stroke-width="2" fill="none" stroke-linecap="round"/>' + hoja(39, 16, -12, .75, 'hj') +
        brillo(28, 34, 10, 6, -30, .65) +
        '<g transform="translate(70 66)"><circle r="19" fill="#ff8c1a"/><circle r="17.4" fill="#fff4dc"/>' + gajos + '<circle r="2" fill="#fff4dc"/>' + brillo(-5, -6, 6, 2.4, -40, .7) + '</g>';
    };
    D.frutilla = function () {
      var fruta = function (x, y, s, rot, sem) {
        var r = azar(sem), semillas = '';
        for (var i = 0; i < 26; i++) {
          var u = r(), v = r(), py = -14 + u * 34, w = 16 * Math.sin(Math.PI * (u * .85 + .1)), px = (v - .5) * 2 * w * .85;
          semillas += '<ellipse cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" rx="1.5" ry="2" fill="#8c0f1c" opacity=".5"/><ellipse cx="' + px.toFixed(1) + '" cy="' + (py - .2).toFixed(1) + '" rx=".75" ry="1.15" fill="#ffe58a"/>';
        }
        return '<g transform="translate(' + x + ' ' + y + ') rotate(' + rot + ') scale(' + s + ')"><path d="M0 22C-14 14-20 2-19-8C-18-16-10-18 0-16C10-18 18-16 19-8C20 2 14 14 0 22Z" fill="url(#f1)"/>' + semillas +
          brillo(-8, -6, 5, 8, 20, .55) +
          '<path d="M0-16L-12-20L-6-14L-16-12L-5-11L-8-5L0-10L8-5L5-11L16-12L6-14L12-20Z" fill="url(#hj)" stroke="#2a5d18" stroke-width=".5"/><path d="M0-15C0-20 1-24 3-27" stroke="#3d7a22" stroke-width="2" fill="none" stroke-linecap="round"/></g>';
      };
      return '<defs>' + rg('f1', [[0, '#ff7b7b'], [45, '#e3202f'], [100, '#8a0a14']], 35, 30, 80) + '</defs>' + sombra(50, 90, 40, 5) +
        fruta(66, 52, 1.15, 18, 3) + fruta(34, 58, 1.35, -12, 8);
    };
    D.frutosrojos = function () {
      var o = '<defs>' + rg('b1', [[0, '#7d8ad6'], [45, '#2f3c8f'], [100, '#121a4a']], 35, 30, 75) + rg('b2', [[0, '#ff6f9a'], [50, '#c1123f'], [100, '#5e0619']], 35, 30, 75) +
        rg('b3', [[0, '#5a3a6e'], [60, '#24102e'], [100, '#0c0410']], 35, 30, 75) + '</defs>' + sombra(50, 90, 42, 6);
      o += hoja(18, 30, -30, 1, 'hj2', true) + hoja(30, 26, 20, .9, 'hj', true);
      var arandano = function (x, y, rr) { return '<circle cx="' + x + '" cy="' + y + '" r="' + rr + '" fill="url(#b1)"/><circle cx="' + x + '" cy="' + y + '" r="' + rr + '" fill="#b8c2ee" opacity=".12"/>' + brillo(x - rr * .35, y - rr * .4, rr * .35, rr * .2, -30, .55) +
        '<path d="M' + x + ' ' + (y - rr * .62) + 'l-2 -1.5m2 1.5l2 -1.5m-2 1.5l0 -2.4" stroke="#0d1338" stroke-width="1.1" stroke-linecap="round"/>'; };
      var drupas = function (cx, cy, n, rr, g, sem) {
        var r = azar(sem), s = '';
        for (var i = 0; i < n; i++) { var a = r() * 6.28, d = Math.sqrt(r()) * rr; var x = cx + Math.cos(a) * d * 1.05, y = cy + Math.sin(a) * d * 1.2; s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3.1" fill="url(#' + g + ')"/><circle cx="' + (x - .9).toFixed(1) + '" cy="' + (y - 1).toFixed(1) + '" r=".8" fill="#fff" opacity=".7"/>'; }
        return s;
      };
      o += drupas(70, 40, 34, 11, 'b2', 4) + drupas(38, 62, 30, 10, 'b3', 6);
      o += arandano(60, 70, 13) + arandano(80, 66, 9.5) + arandano(22, 74, 9);
      return o;
    };
    D.manzana = function () {
      return '<defs>' + rg('a1', [[0, '#e8ff9e'], [40, '#9fd23c'], [100, '#3e7d14']], 35, 30, 75) + rg('a2', [[0, '#ff8a6b', .75], [100, '#e2412c', 0]], 70, 40, 45) +
        rg('a3', [[0, '#ff7b6b'], [45, '#d1202c'], [100, '#6d0711']], 35, 30, 75) + '</defs>' + sombra(52, 90, 42, 6) +
        '<path d="M72 30C64 24 52 26 52 40C52 58 62 72 68 72C70 72 72 71 74 71C76 71 78 72 80 72C86 72 94 58 94 44C94 30 84 24 76 30Z" fill="url(#a3)"/>' + brillo(62, 38, 4, 7, 20, .55) +
        '<path d="M42 28C30 20 10 24 10 46C10 68 26 86 34 86C38 86 40 84 43 84C46 84 48 86 52 86C60 86 76 68 76 46C76 24 56 20 44 28Z" fill="url(#a1)"/>' +
        '<path d="M42 28C30 20 10 24 10 46C10 68 26 86 34 86C38 86 40 84 43 84C46 84 48 86 52 86C60 86 76 68 76 46C76 24 56 20 44 28Z" fill="url(#a2)"/>' +
        '<path d="M38 30C40 32 46 32 48 30" stroke="#5c8a1c" stroke-width="1.2" fill="none" opacity=".6"/>' +
        '<path d="M43 30C43 24 45 19 48 15" stroke="#5a3a1c" stroke-width="2.6" fill="none" stroke-linecap="round"/>' + hoja(47, 17, -8, .72, 'hj') +
        brillo(24, 44, 6, 11, 15, .75) + brillo(56, 40, 3, 5, 0, .4);
    };
    D.durazno = function () {
      return '<defs>' + rg('d1', [[0, '#ffe6b8'], [40, '#ffb07a'], [100, '#e2603b']], 30, 30, 80) + rg('d2', [[0, '#e8394a', .7], [100, '#e8394a', 0]], 70, 65, 50) + '</defs>' +
        sombra(52, 90, 40, 6) + '<circle cx="50" cy="54" r="32" fill="url(#d1)"/><circle cx="50" cy="54" r="32" fill="url(#d2)"/>' +
        '<path d="M50 23C42 36 41 66 50 86" stroke="#c9483a" stroke-width="2.2" fill="none" opacity=".45"/><path d="M52 24C46 38 46 64 53 84" stroke="#fff1d8" stroke-width="1" fill="none" opacity=".4"/>' +
        '<path d="M50 24C50 20 52 17 55 15" stroke="#5a3a1c" stroke-width="2.4" fill="none" stroke-linecap="round"/>' + hoja(54, 16, -6, .8, 'hj') + hoja(53, 17, -150, .6, 'hj2') +
        '<circle cx="50" cy="54" r="32" fill="#fff" opacity=".06"/>' + brillo(36, 40, 9, 6, -30, .6);
    };
    D.uva = function () {
      var o = '<defs>' + rg('u1', [[0, '#b58cd6'], [40, '#6b2f8e'], [100, '#2a0b3d']], 35, 30, 75) + rg('u2', [[0, '#9a6cc0'], [45, '#57207a'], [100, '#1f072e']], 35, 30, 75) + '</defs>' + sombra(50, 92, 30, 4);
      o += '<path d="M50 20C50 14 52 10 56 6" stroke="#5a3a1c" stroke-width="2.6" fill="none" stroke-linecap="round"/>';
      o += '<g transform="translate(56 14) rotate(-5) scale(.85)"><path d="M0 0C-4-6 2-12 6-10C8-16 16-16 17-10C23-12 27-5 22-1C27 3 22 10 17 7C15 13 6 13 6 7C1 9-3 5 0 0Z" fill="url(#hj)" stroke="#2a5d18" stroke-width=".5"/><path d="M0 0L17-10M8 0L22-1M6 0L6-10M8 0L17 7" stroke="#1d4d12" stroke-width=".6" opacity=".5"/></g>';
      var filas = [[3, 26], [4, 36], [5, 46], [4, 56], [3, 66], [2, 75], [1, 83]], k = 0;
      filas.forEach(function (f) {
        for (var i = 0; i < f[0]; i++) {
          var x = 50 + (i - (f[0] - 1) / 2) * 11, y = f[1];
          o += '<ellipse cx="' + x + '" cy="' + y + '" rx="6.3" ry="6.8" fill="url(#' + (k++ % 3 ? 'u1' : 'u2') + ')"/><ellipse cx="' + x + '" cy="' + y + '" rx="6.3" ry="6.8" fill="#d9c6f0" opacity=".1"/>' + brillo(x - 2.2, y - 2.6, 2, 1.2, -35, .65);
        }
      });
      return o;
    };
    D.sandia = function () {
      var r = azar(4), sem = '';
      for (var i = 0; i < 11; i++) { var a = Math.PI * (.15 + r() * .7), d = 14 + r() * 16, x = 50 + Math.cos(a) * d * 1.25, y = 34 + Math.sin(a) * d; sem += '<path d="M' + x.toFixed(1) + ' ' + y.toFixed(1) + 'c-1.6 1.4-1.4 4 0 5c1.4-1 1.6-3.6 0-5Z" fill="#1a1a1a" transform="rotate(' + ((a - Math.PI / 2) * 57).toFixed(0) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')"/><circle cx="' + (x - .4).toFixed(1) + '" cy="' + (y + 1.3).toFixed(1) + '" r=".5" fill="#fff" opacity=".6"/>'; }
      var rayas = '';
      for (var k = 0; k < 9; k++) { var aa = Math.PI * (k + .5) / 9, x1 = 50 + Math.cos(aa) * 48 * 1.0, y1 = 34 + Math.sin(aa) * 44; rayas += '<path d="M' + (50 + Math.cos(aa) * 44).toFixed(1) + ' ' + (34 + Math.sin(aa) * 40).toFixed(1) + 'L' + x1.toFixed(1) + ' ' + y1.toFixed(1) + '" stroke="#153d12" stroke-width="2.6"/>'; }
      return '<defs>' + rg('s1', [[0, '#ff8a94'], [50, '#f0384d'], [100, '#b8142a']], 50, 0, 100) + lg('s2', [[0, '#3f8f2a'], [100, '#1d5a16']], 0, 0, 0, 100) + '</defs>' + sombra(50, 84, 46, 5) +
        '<path d="M2 34A48 44 0 0 0 98 34Z" fill="url(#s2)"/>' + rayas +
        '<path d="M6 34A44 40 0 0 0 94 34Z" fill="#e9f5c8"/><path d="M9 34A41 37 0 0 0 91 34Z" fill="url(#s1)"/>' + sem +
        '<ellipse cx="50" cy="34" rx="48" ry="3" fill="#ff9aa4"/><ellipse cx="50" cy="34" rx="41" ry="2" fill="#ffb3ba" opacity=".7"/>' + brillo(30, 40, 10, 3, 15, .4);
    };
    D.cereza = function () {
      var c = function (x, y) { return '<circle cx="' + x + '" cy="' + y + '" r="15" fill="url(#k1)"/><path d="M' + (x - 1) + ' ' + (y - 14) + 'c1 2 3 2 4 0" stroke="#3a0008" stroke-width="1.2" fill="none"/>' + brillo(x - 6, y - 5, 4.5, 3, -35, .8) + brillo(x + 6, y + 6, 3, 1.5, -35, .25); };
      return '<defs>' + rg('k1', [[0, '#ff5a6e'], [40, '#c0102e'], [100, '#4a0010']], 35, 30, 75) + '</defs>' + sombra(52, 92, 38, 5) +
        '<path d="M34 64C36 44 44 26 62 12M66 66C64 46 62 28 62 12" stroke="#5b7a2a" stroke-width="2.4" fill="none" stroke-linecap="round"/>' + hoja(62, 14, 2, .9, 'hj') +
        c(32, 74) + c(66, 74);
    };
    D.tropical = function () {
      var o = '<defs>' + lg('t1', [[0, '#ffe066'], [50, '#f2a516'], [100, '#a85d0a']], 0, 0, 100, 100) + lg('t2', [[0, '#8fd16a'], [100, '#2a6b2a']], 0, 100, 0, 0) + '</defs>' + sombra(50, 94, 26, 4);
      [[20, 16, -1], [80, 16, 1], [30, 8, -1], [70, 8, 1], [40, 3, -1], [60, 3, 1], [50, 1, 0], [36, 16, -1], [64, 16, 1], [50, 12, 0]].forEach(function (t) {
        var bx = 50 + (t[0] - 50) * .12, w = 4;
        o += '<path d="M' + (bx - w) + ' 44Q' + ((bx + t[0]) / 2 - w * 1.4) + ' ' + ((44 + t[1]) / 2) + ' ' + t[0] + ' ' + t[1] + 'Q' + ((bx + t[0]) / 2 + w * 1.4) + ' ' + ((44 + t[1]) / 2 + 2) + ' ' + (bx + w) + ' 44Z" fill="url(#t2)" stroke="#1f5520" stroke-width=".5"/>' +
          '<path d="M' + bx + ' 43Q' + ((bx + t[0]) / 2) + ' ' + ((44 + t[1]) / 2) + ' ' + t[0] + ' ' + t[1] + '" stroke="#c8f0a8" stroke-width=".5" fill="none" opacity=".6"/>';
      });
      o += '<ellipse cx="50" cy="66" rx="20" ry="27" fill="url(#t1)"/>';
      for (var y = 0; y < 8; y++) for (var x = 0; x < 6; x++) {
        var cx = 33 + x * 7 + (y % 2) * 3.5, cy = 44 + y * 6;
        if (Math.pow((cx - 50) / 19, 2) + Math.pow((cy - 66) / 26, 2) > .9) continue;
        o += '<path d="M' + cx + ' ' + (cy - 3) + 'L' + (cx + 3.5) + ' ' + cy + 'L' + cx + ' ' + (cy + 3) + 'L' + (cx - 3.5) + ' ' + cy + 'Z" fill="none" stroke="#8a4a08" stroke-width=".8" opacity=".7"/><circle cx="' + cx + '" cy="' + cy + '" r=".9" fill="#5a2e04"/>';
      }
      return o + brillo(42, 58, 5, 12, 10, .45);
    };
    D.talco = function () {
      var r = azar(12), polvo = '';
      for (var i = 0; i < 40; i++) polvo += '<circle cx="' + (62 + r() * 32).toFixed(1) + '" cy="' + (10 + r() * 30).toFixed(1) + '" r="' + (.4 + r() * 1.3).toFixed(1) + '" fill="#fff" opacity="' + (.5 + r() * .5).toFixed(2) + '"/>';
      return '<defs>' + lg('p1', [[0, '#ffffff'], [55, '#eef4fb'], [100, '#c6d6ea']], 0, 0, 100, 0) + lg('p2', [[0, '#a9cdf5'], [100, '#4f86c9']], 0, 0, 100, 0) +
        rg('p3', [[0, '#ffe8ef'], [60, '#f7c1d2'], [100, '#e28aa6']], 40, 35, 65) + rg('p4', [[0, '#eaf3ff', .9], [100, '#cfe2f7', 0]], 50, 50, 50) + '</defs>' +
        sombra(46, 92, 36, 5) + '<ellipse cx="78" cy="24" rx="20" ry="14" fill="url(#p4)"/>' + polvo +
        '<rect x="22" y="30" width="40" height="58" rx="12" fill="url(#p1)" stroke="#b9c9dd" stroke-width=".8"/>' +
        '<path d="M28 22h28a4 4 0 0 1 4 4v6H24v-6a4 4 0 0 1 4-4Z" fill="url(#p2)"/><rect x="30" y="16" width="24" height="7" rx="3" fill="url(#p2)"/>' +
        '<circle cx="36" cy="19" r=".9" fill="#2f5f9e"/><circle cx="42" cy="19" r=".9" fill="#2f5f9e"/><circle cx="48" cy="19" r=".9" fill="#2f5f9e"/>' +
        '<rect x="28" y="48" width="28" height="22" rx="4" fill="#fff" stroke="#d6e2f0"/><path d="M42 56c-2-3-7-1-5 3l5 4 5-4c2-4-3-6-5-3Z" fill="#f2a7bd"/>' +
        brillo(28, 56, 2.4, 18, 0, .9) +
        '<ellipse cx="66" cy="80" rx="18" ry="9" fill="url(#p3)"/><ellipse cx="66" cy="77" rx="18" ry="8" fill="url(#p3)"/><path d="M60 72c4-3 10-3 14 0" stroke="#fff" stroke-width="1.6" fill="none" opacity=".7"/><ellipse cx="66" cy="73" rx="5" ry="2" fill="#d97898"/>';
    };
    D.algodon = function () {
      var bola = function (x, y, rr) { return '<circle cx="' + x + '" cy="' + y + '" r="' + rr + '" fill="url(#g1)"/>'; };
      return '<defs>' + rg('g1', [[0, '#ffffff'], [60, '#f7f7f4'], [100, '#cfcfc8']], 40, 35, 65) + lg('g2', [[0, '#9a6b43'], [100, '#4a2d16']], 0, 0, 100, 100) + '</defs>' +
        sombra(50, 92, 34, 5) + '<path d="M50 92C50 78 48 70 50 60" stroke="url(#g2)" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
        '<path d="M50 70C42 70 30 64 26 56C34 58 42 62 50 66ZM50 70C58 70 70 64 74 56C66 58 58 62 50 66Z" fill="url(#g2)"/>' +
        '<path d="M30 58L22 66L34 62ZM70 58L78 66L66 62ZM50 62L46 72L54 72Z" fill="#5c3a1d"/>' +
        bola(34, 44, 15) + bola(66, 44, 15) + bola(50, 30, 16) + bola(42, 54, 13) + bola(58, 54, 13) + bola(50, 46, 14) +
        '<path d="M50 32C47 40 47 48 50 56M38 44C42 48 46 50 50 50M62 44C58 48 54 50 50 50" stroke="#d9d9d0" stroke-width="1.2" fill="none" opacity=".8"/>' +
        brillo(44, 24, 6, 3, -20, .9) + brillo(28, 38, 5, 3, -30, .7);
    };
    D.marina = function () {
      var r = azar(21), spray = '';
      for (var i = 0; i < 26; i++) spray += '<circle cx="' + (40 + r() * 46).toFixed(1) + '" cy="' + (8 + r() * 22).toFixed(1) + '" r="' + (.5 + r() * 1.6).toFixed(1) + '" fill="#fff" opacity="' + (.6 + r() * .4).toFixed(2) + '"/>';
      return '<defs>' + lg('o1', [[0, '#7fe0f0'], [45, '#1a9ccc'], [100, '#0a3f73']], 0, 0, 0, 100) + lg('o2', [[0, '#bff2fb'], [100, '#2ab3d9']], 0, 0, 100, 100) +
        lg('o3', [[0, '#0e5d93'], [100, '#062a4f']], 0, 0, 0, 100) + lg('o4', [[0, '#ffe9d6'], [100, '#e9b48e']], 0, 0, 100, 100) + '</defs>' +
        sombra(50, 94, 46, 4) +
        '<path d="M2 86C12 70 22 40 48 26C70 14 92 22 94 40C86 30 70 28 60 36C48 46 58 62 72 60C62 72 40 76 26 86Z" fill="url(#o1)"/>' +
        '<path d="M60 36C70 28 86 30 94 40C90 34 80 32 72 34C66 36 62 40 62 46Z" fill="url(#o2)"/>' +
        '<path d="M48 26C70 14 92 22 94 40C96 36 94 26 86 20C76 14 60 16 48 26Z" fill="#fff"/>' +
        '<path d="M94 40C90 36 84 34 80 36C84 38 88 42 90 46C92 44 94 42 94 40Z" fill="#fff"/>' + spray +
        '<path d="M2 86C20 82 40 84 60 80C76 77 88 78 98 82L98 94H2Z" fill="url(#o3)"/>' +
        '<path d="M6 86C22 82 42 84 60 81C74 78 86 79 96 83" stroke="#fff" stroke-width="1.6" fill="none" opacity=".75"/>' +
        '<path d="M20 60C24 52 36 46 46 46" stroke="#d9f6ff" stroke-width="1.4" fill="none" opacity=".6"/>' +
        '<g transform="translate(78 84)"><path d="M0 4C-10 4-12-6-8-10C-4-14 4-14 8-10C12-6 10 4 0 4Z" fill="url(#o4)"/>' +
        '<path d="M0 4L-6-10M0 4L-2-12M0 4L2-12M0 4L6-10" stroke="#c98a62" stroke-width=".9"/></g>';
    };
    D.menta = function () {
      return '<defs>' + lg('e1', [[0, '#6aa84f'], [100, '#2f5f1f']], 0, 0, 0, 100) + lg('e2', [[0, '#b6ec9a'], [45, '#4fb86a'], [100, '#1a6b3a']], 0, 0, 100, 100) + lg('e3', [[0, '#8be0a0'], [50, '#2f9a58'], [100, '#0f4d26']], 0, 100, 100, 0) + '</defs>' +
        sombra(50, 94, 26, 4) + '<path d="M50 94C50 70 49 40 50 12" stroke="url(#e1)" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        hoja(50, 76, 200, 1.05, 'e3', true) + hoja(50, 74, -20, 1.05, 'e2', true) +
        hoja(50, 52, 205, .92, 'e2', true) + hoja(50, 50, -25, .92, 'e3', true) +
        hoja(50, 30, 215, .72, 'e3', true) + hoja(50, 28, -35, .72, 'e2', true) +
        hoja(50, 14, 240, .45, 'e2', true) + hoja(50, 14, -60, .45, 'e3', true) +
        '<circle cx="74" cy="40" r="1.3" fill="#fff" opacity=".9"/><circle cx="30" cy="62" r="1.1" fill="#fff" opacity=".9"/>';
    };
    D.cafe = function () {
      var grano = function (x, y, rot, s) {
        return '<g transform="translate(' + x + ' ' + y + ') rotate(' + rot + ') scale(' + s + ')"><ellipse rx="13" ry="17" fill="url(#q1)"/><path d="M-2-16C5-8-6 2 2 16" stroke="#1c0d04" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
          '<path d="M0-16C6-8-4 2 3 16" stroke="#8a5a34" stroke-width=".8" fill="none" opacity=".7"/>' + brillo(-6, -6, 3, 6, 15, .45) + '</g>';
      };
      return '<defs>' + rg('q1', [[0, '#a8724a'], [50, '#5e3519'], [100, '#24120a']], 35, 30, 75) + lg('q2', [[0, '#6b3e22'], [100, '#2b140a']], 0, 0, 100, 100) + lg('q3', [[0, '#8a5634'], [100, '#4a2512']], 0, 0, 0, 100) + '</defs>' +
        sombra(50, 90, 44, 6) +
        '<g transform="translate(58 50) rotate(-12)"><rect x="0" y="0" width="34" height="26" rx="2" fill="url(#q2)"/>' +
        '<rect x="2" y="2" width="14" height="10" rx="1.5" fill="url(#q3)"/><rect x="18" y="2" width="14" height="10" rx="1.5" fill="url(#q3)"/><rect x="2" y="14" width="14" height="10" rx="1.5" fill="url(#q3)"/><rect x="18" y="14" width="14" height="10" rx="1.5" fill="url(#q3)"/>' +
        '<path d="M3 3h12M19 3h12M3 15h12M19 15h12" stroke="#c48a5e" stroke-width=".7" opacity=".7"/></g>' +
        grano(28, 50, -25, 1.15) + grano(50, 72, 35, .95) + grano(22, 78, 70, .8);
    };
    D.canela = function () {
      var rama = function (x, y, rot, l) {
        return '<g transform="translate(' + x + ' ' + y + ') rotate(' + rot + ')"><rect x="0" y="-5" width="' + l + '" height="10" rx="2" fill="url(#w1)"/>' +
          '<path d="M4-5V5M' + (l * .35) + '-5V5M' + (l * .7) + '-5V5" stroke="#5a2a0c" stroke-width=".6" opacity=".4"/><path d="M0-2.5H' + l + '" stroke="#e6a46a" stroke-width="1" opacity=".5"/>' +
          '<ellipse cx="' + l + '" cy="0" rx="2.6" ry="5" fill="#c97b3e"/><path d="M' + l + ' 0m-.2-3.2c-1.6 1-1.6 4 0 5c1-1 1.2-2.6.2-3.4" stroke="#6a3410" stroke-width=".8" fill="none"/></g>';
      };
      var anis = '';
      for (var i = 0; i < 8; i++) anis += '<path d="M0 0C-3-4-3-12 0-15C3-12 3-4 0 0Z" fill="url(#w2)" stroke="#3d1a06" stroke-width=".5" transform="rotate(' + i * 45 + ')"/><ellipse cx="0" cy="-9" rx="1.3" ry="2" fill="#c98a4a" transform="rotate(' + i * 45 + ')"/>';
      return '<defs>' + lg('w1', [[0, '#d88b4c'], [40, '#a8582a'], [100, '#5c2a0c']], 0, 0, 0, 100) + lg('w2', [[0, '#8a4a20'], [100, '#3d1a06']], 0, 0, 100, 100) + '</defs>' +
        sombra(50, 88, 44, 6) + rama(10, 62, -18, 66) + rama(16, 74, -10, 68) + rama(8, 52, -26, 58) +
        '<g transform="translate(72 30) scale(1.15)">' + anis + '<circle r="3" fill="#5a2a0c"/></g>';
    };
    D.madera = function () {
      var anillos = '';
      for (var i = 0; i < 6; i++) anillos += '<ellipse cx="44" cy="52" rx="' + (6 + i * 5.2) + '" ry="' + (5.4 + i * 4.8) + '" fill="none" stroke="#a87444" stroke-width="' + (1 - i * .08) + '" opacity=".65"/>';
      return '<defs>' + lg('x1', [[0, '#8a5a32'], [100, '#3e230f']], 0, 0, 100, 0) + rg('x2', [[0, '#f4d6a8'], [60, '#dfb27a'], [100, '#b98048']], 45, 45, 60) +
        rg('x3', [[0, '#ffe08a'], [40, '#f59e0b'], [100, '#9a4a05']], 35, 30, 75) + '</defs>' + sombra(52, 88, 44, 6) +
        '<path d="M14 52C14 34 26 20 44 20L60 20C78 20 90 34 90 52C90 70 78 84 60 84L44 84C26 84 14 70 14 52Z" fill="url(#x1)"/>' +
        '<path d="M60 20C78 20 90 34 90 52C90 70 78 84 60 84" fill="none" stroke="#2b170a" stroke-width="1" opacity=".5"/>' +
        '<path d="M62 30h18M64 44h22M62 60h24M60 74h18" stroke="#2b170a" stroke-width=".8" opacity=".35"/>' +
        '<ellipse cx="44" cy="52" rx="30" ry="32" fill="url(#x2)"/>' + anillos +
        '<path d="M44 52L60 34" stroke="#8a5a32" stroke-width="1" opacity=".5"/><circle cx="44" cy="52" r="2" fill="#7a4a24"/>' +
        '<path d="M80 74C76 80 78 90 86 90C94 90 96 80 90 74C88 70 86 66 85 62C84 66 82 70 80 74Z" fill="url(#x3)"/>' + brillo(83, 78, 2, 4, 20, .8);
    };
    D.floral = function () {
      var flor = function (x, y, s, n, rot) {
        var o = '<g transform="translate(' + x + ' ' + y + ') rotate(' + rot + ') scale(' + s + ')">';
        for (var i = 0; i < n; i++) o += '<path d="M0 0C-5-6-6-20 0-27C6-20 5-6 0 0Z" fill="url(#z1)" stroke="#c23f7e" stroke-width=".4" stroke-opacity=".5" transform="rotate(' + (i * 360 / n) + ')"/>' +
          '<path d="M0-4L0-22" stroke="#fff" stroke-width=".6" opacity=".35" transform="rotate(' + (i * 360 / n) + ')"/>';
        for (var j = 0; j < n; j++) o += '<path d="M0 0C-3-4-4-13 0-17C4-13 3-4 0 0Z" fill="url(#z2)" transform="rotate(' + (j * 360 / n + 180 / n) + ')"/>';
        var r = azar(n), pts = '';
        for (var k = 0; k < 30; k++) { var a = r() * 6.28, d = Math.sqrt(r()) * 6; pts += '<circle cx="' + (Math.cos(a) * d).toFixed(1) + '" cy="' + (Math.sin(a) * d).toFixed(1) + '" r=".7" fill="' + (r() > .5 ? '#7a4a05' : '#ffd84a') + '"/>'; }
        return o + '<circle r="7" fill="url(#z3)"/>' + pts + '</g>';
      };
      return '<defs>' + lg('z1', [[0, '#fbd3e6'], [55, '#ef7fb6'], [100, '#c23f7e']], 0, 0, 0, 100) + lg('z2', [[0, '#ffe4f0'], [100, '#f29cc4']], 0, 0, 0, 100) +
        rg('z3', [[0, '#ffdf6b'], [60, '#e0a100'], [100, '#8a5a00']], 40, 35, 65) + lg('z4', [[0, '#5c8a32'], [100, '#2b521a']], 0, 0, 100, 0) + '</defs>' +
        sombra(50, 92, 30, 4) +
        '<path d="M44 92C44 74 42 60 40 46M58 92C60 80 64 72 70 64" stroke="url(#z4)" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
        hoja(43, 80, 200, .8, 'hj2') + hoja(46, 72, -25, .75, 'hj') +
        flor(40, 38, 1.1, 12, 0) + flor(72, 58, .62, 10, 15) +
        '<path d="M26 66C22 58 24 52 28 50C32 54 30 62 26 66Z" fill="url(#z1)"/><path d="M26 66C26 72 28 78 32 82" stroke="url(#z4)" stroke-width="1.6" fill="none"/>';
    };
    D.chicle = function () {
      var cara = function (x, y, rot) {
        return '<g transform="translate(' + x + ' ' + y + ') rotate(' + rot + ')"><path d="M-12-7L-22-12L-20 0L-22 12L-12 7Z" fill="url(#h2)"/><path d="M12-7L22-12L20 0L22 12L12 7Z" fill="url(#h2)"/>' +
          '<ellipse rx="13" ry="9" fill="url(#h2)"/><path d="M-6-8C-8-2-8 2-6 8M0-9V9M6-8C8-2 8 2 6 8" stroke="#fff" stroke-width="1.6" opacity=".55"/>' + brillo(-4, -4, 6, 2, 0, .8) + '</g>';
      };
      return '<defs>' + rg('h1', [[0, '#ffe0f0'], [35, '#ff8cc6'], [100, '#c2367e']], 35, 30, 75) + lg('h2', [[0, '#a8e6ff'], [50, '#4bb4e6'], [100, '#1a6fa8']], 0, 0, 100, 100) + '</defs>' +
        sombra(50, 92, 42, 5) + '<circle cx="56" cy="40" r="30" fill="url(#h1)"/>' +
        brillo(44, 26, 11, 6, -35, .9) + brillo(72, 58, 6, 3, -35, .35) +
        '<path d="M46 68C50 72 56 72 60 70" stroke="#c2367e" stroke-width="1.2" fill="none" opacity=".5"/>' +
        cara(28, 78, -15);
    };
    D.perfume = function () {
      return '<defs>' + lg('y1', [[0, '#f3eefe'], [35, '#cdbff5'], [70, '#9b86e0'], [100, '#6a54b8']], 0, 0, 100, 0) + lg('y2', [[0, '#fff1b8'], [40, '#e7b93c'], [100, '#9a6a08']], 0, 0, 100, 0) +
        lg('y3', [[0, '#b9a8f0', .9], [100, '#5a43a8', .95]], 0, 0, 0, 100) + rg('y4', [[0, '#fff', .9], [100, '#fff', 0]], 50, 50, 50) + '</defs>' +
        sombra(50, 92, 32, 5) +
        '<path d="M26 40C26 34 30 32 34 32H66C70 32 74 34 74 40V82C74 87 70 90 66 90H34C30 90 26 87 26 82Z" fill="url(#y1)" stroke="#8e7bd6" stroke-width=".8"/>' +
        '<path d="M28 52H72V82C72 86 69 88 66 88H34C31 88 28 86 28 82Z" fill="url(#y3)"/>' +
        '<path d="M28 52C40 55 60 49 72 52" stroke="#e8e0ff" stroke-width="1" fill="none" opacity=".8"/>' +
        '<path d="M32 36V84" stroke="#fff" stroke-width="3" opacity=".7" stroke-linecap="round"/><path d="M68 40V82" stroke="#fff" stroke-width="1.2" opacity=".35"/>' +
        '<rect x="36" y="60" width="28" height="16" rx="1.5" fill="#fffdf6" opacity=".92"/><path d="M40 66H60M44 71H56" stroke="#9a6a08" stroke-width="1"/>' +
        '<rect x="44" y="24" width="12" height="9" fill="url(#y2)"/><rect x="38" y="10" width="24" height="15" rx="3" fill="url(#y2)"/>' +
        '<path d="M41 12V23M59 12V23" stroke="#fff6cf" stroke-width="1.2" opacity=".7"/>' +
        '<ellipse cx="80" cy="18" rx="10" ry="7" fill="url(#y4)"/><circle cx="84" cy="14" r="1.2" fill="#fff"/><circle cx="88" cy="20" r=".9" fill="#fff"/><circle cx="78" cy="10" r=".8" fill="#fff"/>' +
        '<path d="M16 22l1.6 3.4 3.4 1.6-3.4 1.6L16 32l-1.6-3.4L11 27l3.4-1.6Z" fill="#e7b93c"/>';
    };
    var cache = {}, n = 0;
    /** Ilustración lista para insertar; los id internos se renombran para que no choquen entre etiquetas. */
    return function (k, clase) {
      if (!D[k]) k = 'perfume';
      if (!cache[k]) cache[k] = '<defs>' + COMUN + '</defs>' + D[k]();
      var suf = 'a' + (++n);
      return '<svg class="aroma-svg ' + (clase || '') + '" viewBox="0 0 100 100" aria-hidden="true">' +
        cache[k].replace(/id="([\w-]+)"/g, 'id="$1' + suf + '"').replace(/url\(#([\w-]+)\)/g, 'url(#$1' + suf + ')') + '</svg>';
    };
  })();
  /** Dibujo de un aroma, listo para insertar. Si no existe, el frasco de perfume. */
  function svgAroma(k, extra) { return ILUS(k, extra); }
  /** ¿Va con el diseño de perfumina? Toda etiqueta de 250 cc, y las de perfume en cualquier tamaño. */
  function esDePerfume(e) { return /perfum|aromatiz|fragancia/i.test((e.nombre || '') + ' ' + (e.subtitulo || '')); }
  function esPerfumina(e, tam) { return tam === 'perf250' || esDePerfume(e); }
  /** Las etiquetas que se ven en el tamaño elegido: en 250 cc, solo las perfuminas. */
  function etiquetasDelTam(tam) {
    return D.etiquetas.filter(function (e) { return tam !== 'perf250' || esDePerfume(e); })
      .sort(function (a, b) { return (a.nombre + a.subtitulo).localeCompare(b.nombre + b.subtitulo); });
  }
  function htmlPerfumina(e, m) {
    var cfg = D.config;
    var dib = QG.dibujosEtiqueta(e);
    var aroma = e.subtitulo || '';
    var color = e.color || QG.colorAroma(dib[0]);
    var largo = aroma.length;
    var cAroma = largo > 24 ? ' n-xl' : largo > 16 ? ' n-l' : largo > 11 ? ' n-m' : '';
    var imagen = /^data:image\//.test(e.imagen || '') ? '<img class="pf-foto" src="' + esc(e.imagen) + '" alt="">' : dib.map(function (k) { return svgAroma(k); }).join('');
    return '<div class="etq perfu' + (m.w < 60 ? ' chica' : '') + '" style="width:' + m.w + 'mm;height:' + m.h + 'mm;--f:' + m.f + ';--etq-c:' + esc(color) + ';--etq-t:' + textoSobre(color) + '">' +
      '<div class="pf-marco"></div>' +
      '<div class="pf-top"><img class="pf-logo" src="' + LOGO_URL + '" alt=""><div class="pf-tit"><b>' + esc(e.nombre || 'Perfumina Textil') + '</b><span>' + esc(cfg.empresa || 'Akuma Clean') + '</span></div></div>' +
      '<div class="pf-dib n' + (/^data:image/.test(e.imagen || '') ? 1 : dib.length) + '">' + imagen + '</div>' +
      (aroma ? '<div class="pf-aroma' + cAroma + '">' + esc(aroma) + '</div>' : '') +
      '<div class="pf-orn"><i></i><span>✦</span><i></i></div>' +
      '<div class="pf-uso">Agitar y rociar a 30 cm sobre ropa y ambientes</div>' +
      '<div class="pf-alerta"><b>MANTENER FUERA DEL ALCANCE DE LOS NIÑOS</b><span>Intoxicaciones: 0800-333-0160</span></div>' +
      '<div class="pf-pie"><span>' + (cfg.telefono ? 'Tel. ' + esc(cfg.telefono) : esc(cfg.empresa || 'Akuma Clean')) + '</span>' + (S.etq.lote ? '<span>Lote ' + esc(S.etq.lote) + '</span>' : '') + '</div>' +
      (cfg.legalEtiqueta && m.w >= 60 ? '<div class="etq-legal">' + esc(cfg.legalEtiqueta) + '</div>' : '') +
      '</div>';
  }
  function htmlEtiqueta(e, tam) {
    var m = medidaEtq(tam);
    if (esPerfumina(e, tam)) return htmlPerfumina(e, m);
    var largo = (e.nombre || '').length;
    var claseNombre = largo > 22 ? ' n-xl' : largo > 14 ? ' n-l' : largo > 10 ? ' n-m' : '';
    var clases = (m.sinTextos ? ' sin-textos' : '') + (m.w < 72 ? ' angosta' : '') + (m.f < .8 ? ' compacta' : '');
    var lineas = Math.max(3, Math.round((m.h - 50 * m.f) / (m.w < 72 ? 9 : 4.2) / m.f));
    var cfg = D.config;
    return '<div class="etq' + clases + '" style="width:' + m.w + 'mm;height:' + m.h + 'mm;--f:' + m.f + ';--lc:' + lineas + ';--etq-c:' + esc(e.color || '#1e40af') + ';--etq-t:' + textoSobre(e.color) + '">' +
      '<img class="etq-logo" src="' + LOGO_URL + '" alt="">' +
      '<div class="etq-banda"><div class="etq-nombre' + claseNombre + '">' + esc(e.nombre) + '</div>' + (e.subtitulo ? '<div class="etq-sub">' + esc(e.subtitulo) + '</div>' : '') + '</div>' +
      '<div class="etq-textos"><div class="etq-sec"><b>Modo de uso</b><p>' + esc(e.uso) + '</p></div>' +
      '<div class="etq-sec"><b>Precauciones</b><p>' + esc(e.precauciones) + '</p></div></div>' +
      '<div class="etq-alerta"><b>⚠ MANTENER FUERA DEL ALCANCE DE LOS NIÑOS · NO INGERIR</b><span><i class="etq-cons">Conservar en su envase original, bien cerrado. </i>Intoxicaciones: 0800-333-0160</span></div>' +
      '<div class="etq-pie"><span>' + esc(cfg.empresa || 'Akuma Clean') + (cfg.telefono ? ' · Tel. ' + esc(cfg.telefono) : '') + '</span><span class="etq-lote">' + (S.etq.lote ? 'Lote ' + esc(S.etq.lote) : 'Lote ____') + ' Venc. ____</span></div>' +
      (cfg.legalEtiqueta ? '<div class="etq-legal">' + esc(cfg.legalEtiqueta) + '</div>' : '') +
      '</div>';
  }
  S.etq = { tam: TAM_ETQ[leerLocal('ac_etq_tam')] ? leerLocal('ac_etq_tam') : 'env1', bn: leerLocal('ac_etq_bn') === '1', cant: {} };
  function etiquetasAImprimir() {
    var lista = [];
    etiquetasDelTam(S.etq.tam).forEach(function (e) { for (var i = 0; i < (S.etq.cant[e.id] || 0); i++) lista.push(e); });
    return lista;
  }
  RENDER.etiquetas = function () {
    var adm = esAdmin();
    var tam = S.etq.tam, lista = etiquetasDelTam(tam), info = medidaEtq(tam), xHoja = porHoja(info);
    var zoom = Math.min(1, 250 / (info.w * 3.78));
    var total = etiquetasAImprimir().length;
    var html = '<div class="fila"><div class="seg" role="group" aria-label="Tamaño">' + Object.keys(TAM_ETQ).map(function (k) {
      return '<button type="button" data-act="etqTam" data-id="' + k + '" aria-pressed="' + (k === tam) + '">' + TAM_ETQ[k].t + '</button>';
    }).join('') + '</div>' +
      (tam === 'pers' ? '<span class="fila"><label class="campo" style="width:90px"><span>Ancho (mm)</span><input class="in num" id="etq-w" type="number" min="35" max="190" value="' + info.w + '"></label>' +
        '<label class="campo" style="width:90px"><span>Alto (mm)</span><input class="in num" id="etq-h" type="number" min="35" max="270" value="' + info.h + '"></label></span>' : '') +
      '<label class="check"><input type="checkbox" id="etq-bn"' + (S.etq.bn ? ' checked' : '') + '> Blanco y negro (ahorra tinta)</label>' +
      '<label class="campo" style="width:150px"><span>Lote (opcional)</span><input class="in mono" id="etq-lote" value="' + esc(S.etq.lote || '') + '" placeholder="L261019-001"></label>' +
      '<span class="fila" style="margin-left:auto">' + (adm ? '<button class="btn" type="button" data-act="etqGenerar">' + ic('repetir') + 'Crear desde productos</button><button class="btn" type="button" data-act="etqAromas">' + ic('mas') + 'Perfuminas por aroma</button><button class="btn" type="button" data-act="etqEditar">' + ic('mas') + 'Etiqueta</button>' : '') +
      '<button class="btn pri" type="button" data-act="etqImprimir"' + (total ? '' : ' disabled') + '>' + ic('imprimir') + (total ? 'Imprimir ' + total + ' (' + Math.ceil(total / xHoja) + ' hoja' + (Math.ceil(total / xHoja) > 1 ? 's' : '') + ')' : 'Elegí cuántas imprimir') + '</button></span></div>' +
      '<p class="muted" style="margin:0;font-size:.85rem">' + info.t + ': etiqueta de ' + cant(info.w / 10) + ' × ' + cant(info.h / 10) + ' cm · entran ' + xHoja + ' por hoja A4. Poné la cantidad debajo de cada etiqueta e imprimí en papel autoadhesivo A4.</p>';
    if (!lista.length && tam === 'perf250') {
      return html + '<div class="card vacio"><p style="margin:0 0 10px">Todavía no hay etiquetas de perfumina.</p>' +
        (adm ? '<button class="btn pri" type="button" data-act="etqAromas">Crear perfuminas por aroma</button>' : '<p style="margin:0">Pedile al administrador que las cree.</p>') + '</div>';
    }
    if (tam === 'perf250') html += '<p class="muted" style="margin:0;font-size:.85rem">En 250 cc se muestran solo las perfuminas. El dibujo sale solo según el aroma: "Coco Vainilla" lleva coco y vainilla. Con el lápiz podés elegir otro.</p>';
    if (!lista.length) {
      return html + '<div class="card vacio"><p style="margin:0 0 10px">Todavía no hay etiquetas.</p>' +
        (adm ? '<button class="btn pri" type="button" data-act="etqGenerar">Crear etiquetas desde mis productos de limpieza</button>' : '<p style="margin:0">Pedile al administrador que las cree.</p>') + '</div>';
    }
    html += '<div class="etq-grid' + (S.etq.bn ? ' bn' : '') + '" style="--z:' + zoom.toFixed(2) + '">' + lista.map(function (e) {
      var n = S.etq.cant[e.id] || 0;
      return '<div class="etq-card' + (e.activo !== 'si' ? ' inactiva' : '') + '"><div class="etq-prev">' + htmlEtiqueta(e, tam) + '</div>' +
        '<div class="fila"><label class="campo" style="flex:1"><span>Cantidad a imprimir</span><input class="in num" type="number" min="0" max="500" data-etq="' + e.id + '" value="' + (n || '') + '" placeholder="0"></label>' +
        '<button class="btn chico" type="button" data-act="etqHoja" data-id="' + e.id + '" title="Llenar una hoja entera">Hoja</button>' +
        (adm ? '<button class="btn chico icono" type="button" data-act="etqEditar" data-id="' + e.id + '" aria-label="Editar">' + ic('editar') + '</button>' : '') + '</div></div>';
    }).join('') + '</div>';
    return html;
  };
  ALABRIR.etiquetas = function (r) {
    var bn = $('#etq-bn', r);
    bn.onchange = function () { S.etq.bn = bn.checked; guardarLocal('ac_etq_bn', bn.checked ? '1' : '0'); render(); };
    var lt = $('#etq-lote', r);
    if (lt) lt.addEventListener('change', function () { S.etq.lote = lt.value.trim(); render(); });
    ['w', 'h'].forEach(function (k) {
      var el = $('#etq-' + k, r);
      if (el) el.addEventListener('change', function () { guardarLocal('ac_etq_' + k, String(num(el.value))); render(); });
    });
    $$('[data-etq]', r).forEach(function (inp) {
      inp.addEventListener('change', function () { S.etq.cant[inp.getAttribute('data-etq')] = Math.max(0, Math.min(500, Math.round(num(inp.value)))); render(); });
    });
  };
  ACT.etqTam = function (t) { S.etq.tam = t; guardarLocal('ac_etq_tam', t); render(); };
  ACT.etqHoja = function (id) { S.etq.cant[id] = (S.etq.cant[id] || 0) + porHoja(medidaEtq(S.etq.tam)); render(); };
  ACT.etqGenerar = function (id, btn) { accion(btn, 'generarEtiquetas', {}).catch(function () {}); };
  ACT.etqImprimir = function () {
    var lista = etiquetasAImprimir();
    if (!lista.length) return;
    var html = '<div class="hoja-etq' + (S.etq.bn ? ' bn' : '') + '">' + lista.map(function (e) { return htmlEtiqueta(e, S.etq.tam); }).join('') + '</div>';
    imprimir(html, 'etiquetas');
  };
  /** Recorta la foto al cuadrado y la achica para que entre en una celda de la planilla (menos de 46.000 caracteres). */
  function achicarFoto(archivo) {
    return new Promise(function (ok, mal) {
      if (!/^image\/(jpeg|png|webp)$/.test(archivo.type)) return mal(new Error('Elegí una foto JPG, PNG o WEBP.'));
      var lector = new FileReader();
      lector.onerror = function () { mal(new Error('No se pudo leer la foto.')); };
      lector.onload = function () {
        var img = new Image();
        img.onerror = function () { mal(new Error('No se pudo abrir la foto.')); };
        img.onload = function () {
          var lado = Math.min(img.naturalWidth, img.naturalHeight), sx = (img.naturalWidth - lado) / 2, sy = (img.naturalHeight - lado) / 2;
          for (var px = 420; px >= 220; px -= 50) {
            var c = document.createElement('canvas');
            c.width = c.height = px;
            var g = c.getContext('2d');
            g.fillStyle = '#fff'; g.fillRect(0, 0, px, px);
            g.imageSmoothingQuality = 'high';
            g.drawImage(img, sx, sy, lado, lado, 0, 0, px, px);
            for (var q = .86; q >= .5; q -= .06) {
              var url = c.toDataURL('image/jpeg', q);
              if (url.length < 46000) return ok(url);
            }
          }
          mal(new Error('La foto tiene demasiado detalle. Probá con otra.'));
        };
        img.src = lector.result;
      };
      lector.readAsDataURL(archivo);
    });
  }
  ACT.etqAromas = function () {
    abrirModal({
      tam: 'md', titulo: 'Perfuminas por aroma',
      cuerpo: function () {
        return '<p class="muted" style="margin:0">Escribí un aroma por renglón. Se crea una etiqueta por cada uno, con su dibujo y su color elegidos solos (después podés cambiarlos con el lápiz).</p>' +
          '<div class="grid2"><label class="campo"><span>Nombre del producto</span><input class="in" id="ar-nombre" value="Perfumina Textil"></label><span></span></div>' +
          '<label class="campo"><span>Aromas</span><textarea class="in" id="ar-lista" rows="7" placeholder="Coco Vainilla\nLavanda\nAlgodón\nFrutos Rojos\nBrisa Marina" autofocus></textarea></label>' +
          '<div id="ar-prev" class="dib-grid" style="max-height:none"></div>';
      },
      pie: function () { return '<button class="btn" type="button" data-cerrar2>Cancelar</button><button class="btn pri" type="button" id="ar-ok">Crear etiquetas</button>'; },
      alAbrir: function (r, m) {
        var lista = function () { return $('#ar-lista', r).value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean); };
        var ver = function () {
          $('#ar-prev', r).innerHTML = lista().slice(0, 40).map(function (a) {
            return '<div class="dib-op" style="cursor:default">' + QG.dibujosEtiqueta({ subtitulo: a }).map(function (k) { return svgAroma(k); }).join('') + esc(a) + '</div>';
          }).join('');
        };
        $('#ar-lista', r).addEventListener('input', ver);
        $('[data-cerrar2]', r).onclick = function () { cerrarModal(m); };
        $('#ar-ok', r).onclick = function () {
          if (!lista().length) return toast('Escribí al menos un aroma.', true);
          accion(this, 'crearPerfuminas', { nombre: $('#ar-nombre', r).value, aromas: lista() }).then(function () {
            cerrarModal(m);
            if (S.etq.tam !== 'perf250') { S.etq.tam = 'perf250'; guardarLocal('ac_etq_tam', 'perf250'); render(); }
          }, function () {});
        };
      }
    });
  };
  ACT.etqEditar = function (id) {
    var nuevaPerf = !id && S.etq.tam === 'perf250';
    var e = id ? D.etiquetas.filter(function (x) { return x.id === id; })[0] : { nombre: nuevaPerf ? 'Perfumina Textil' : '', subtitulo: '', uso: nuevaPerf ? QG.TEXTOS_PERFUMINA.uso : '', precauciones: nuevaPerf ? QG.TEXTOS_PERFUMINA.prec : '', color: nuevaPerf ? QG.colorAroma('perfume') : '#1e40af', activo: 'si', dibujo: '' };
    var b = JSON.parse(JSON.stringify(e));
    b.dibujo = b.dibujo || '';
    var colorTocado = !!id;
    var COLORES = ['#1e63d6', '#7c4dcc', '#f2c200', '#0f9d58', '#d93025', '#ef7d00', '#d63384', '#0e9fb4', '#6d4c41', '#111111'];
    abrirModal({
      tam: 'md', titulo: id ? 'Editar etiqueta' : 'Nueva etiqueta',
      cuerpo: function () {
        return '<div class="pe" style="grid-template-columns:minmax(0,1fr) 250px"><div class="pe-lado">' +
          '<div class="grid2"><label class="campo"><span>Producto (grande en la etiqueta)</span><input class="in" id="et-nombre" value="' + esc(b.nombre) + '" placeholder="Jabón Líquido" autofocus></label>' +
          '<label class="campo"><span>Variedad o aroma</span><input class="in" id="et-sub" value="' + esc(b.subtitulo) + '" placeholder="' + (nuevaPerf ? 'Coco Vainilla' : 'Verde Clásico') + '"></label></div>' +
          '<div class="campo" id="et-dib-box"><span>Dibujo de la perfumina <small class="muted">· se elige solo según el aroma, o tocá hasta 3 para elegirlos vos</small></span>' +
          '<div class="fila" style="margin-bottom:6px"><button type="button" class="btn chico" id="et-dib-auto"></button></div>' +
          '<div class="dib-grid">' + QG.AROMAS.map(function (a) {
            return '<button type="button" class="dib-op" data-dib="' + a.k + '" title="' + esc(a.n) + '">' + svgAroma(a.k) + esc(a.n.split(' / ')[0]) + '</button>';
          }).join('') + '</div>' +
          '<div class="fila" style="margin-top:8px"><label class="btn chico" style="cursor:pointer"><input type="file" id="et-foto" accept="image/jpeg,image/png,image/webp" hidden>' + ic('subir') + 'Usar una foto propia</label>' +
          '<button type="button" class="btn chico" id="et-foto-quitar">Quitar la foto</button><small class="muted">Va en lugar del dibujo. Se recorta y achica sola. Usá fotos propias o con licencia de uso.</small></div></div>' +
          '<div class="campo"><span>Color de la franja</span><div class="fila">' + COLORES.map(function (c) {
            return '<button type="button" class="swatch" data-color="' + c + '" style="background:' + c + '" aria-label="Color ' + c + '"' + (c === b.color ? ' aria-pressed="true"' : '') + '></button>';
          }).join('') + '<input type="color" id="et-color" value="' + esc(b.color) + '" aria-label="Otro color"></div></div>' +
          '<label class="campo"><span>Modo de uso</span><textarea class="in" id="et-uso" rows="3">' + esc(b.uso) + '</textarea></label>' +
          '<label class="campo"><span>Precauciones</span><textarea class="in" id="et-prec" rows="3">' + esc(b.precauciones) + '</textarea></label>' +
          '<div class="fila"><button class="btn chico" type="button" id="et-sug">Completar con textos sugeridos</button>' +
          (id ? '<label class="check"><input type="checkbox" id="et-activo"' + (b.activo !== 'no' ? ' checked' : '') + '> Activa</label>' : '') + '</div>' +
          '<p class="muted" style="margin:0;font-size:.8rem">El aviso "Mantener fuera del alcance de los niños", el teléfono de intoxicaciones, el logo y los datos de la empresa se agregan solos.</p>' +
          '</div><div class="etq-grid' + (S.etq.bn ? ' bn' : '') + '" style="--z:' + Math.min(1, 240 / (medidaEtq(S.etq.tam).w * 3.78)).toFixed(2) + ';display:block"><div class="etq-prev" id="et-prev"></div><p class="muted" style="font-size:.78rem;text-align:center">' + medidaEtq(S.etq.tam).t + '</p></div></div>';
      },
      pie: function () {
        return (id ? '<button class="btn peligro" type="button" id="et-borrar" style="margin-right:auto">' + ic('basura') + 'Eliminar</button>' : '') +
          '<button class="btn" type="button" data-cerrar2>Cancelar</button><button class="btn pri" type="button" id="et-ok">Guardar etiqueta</button>';
      },
      alAbrir: function (r, m) {
        var leer = function () {
          b.nombre = $('#et-nombre', r).value; b.subtitulo = $('#et-sub', r).value; b.uso = $('#et-uso', r).value;
          b.precauciones = $('#et-prec', r).value; b.color = $('#et-color', r).value;
        };
        var elegidos = function () { return b.dibujo ? b.dibujo.split(',') : []; };
        var pintarDibujos = function () {
          var perf = esPerfumina(b, S.etq.tam);
          $('#et-dib-box', r).hidden = !perf;
          if (!perf) return;
          var man = elegidos(), auto = QG.dibujosEtiqueta({ subtitulo: b.subtitulo, nombre: b.nombre });
          $$('[data-dib]', r).forEach(function (o) { o.setAttribute('aria-pressed', String(!b.imagen && man.indexOf(o.getAttribute('data-dib')) >= 0)); });
          $('#et-foto-quitar', r).hidden = !b.imagen;
          var ba = $('#et-dib-auto', r);
          ba.innerHTML = '<span class="dib-auto">' + (man.length ? 'Volver a automático' : 'Automático:') + ' ' + auto.map(function (k) { return svgAroma(k); }).join('') + '</span>';
          ba.setAttribute('aria-pressed', String(!man.length));
          // color de la franja según el aroma, salvo que lo hayan elegido a mano
          if (!colorTocado) { var c = QG.colorAroma((man.length ? man : auto)[0]); $('#et-color', r).value = c; b.color = c; }
        };
        var prev = function () { leer(); pintarDibujos(); $('#et-prev', r).innerHTML = htmlEtiqueta(b, S.etq.tam); };
        $$('[data-dib]', r).forEach(function (o) {
          o.onclick = function () {
            var k = o.getAttribute('data-dib'), man = elegidos(), i = man.indexOf(k);
            if (i >= 0) man.splice(i, 1); else { if (man.length >= 3) man.shift(); man.push(k); }
            b.dibujo = man.join(','); b.imagen = ''; prev();
          };
        });
        $('#et-dib-auto', r).onclick = function () { b.dibujo = ''; b.imagen = ''; prev(); };
        $('#et-foto-quitar', r).onclick = function () { b.imagen = ''; prev(); };
        $('#et-foto', r).onchange = function () {
          var f = this.files && this.files[0];
          if (!f) return;
          achicarFoto(f).then(function (url) { b.imagen = url; prev(); }, function (e) { toast(e.message, true); });
          this.value = '';
        };
        $('#et-color', r).addEventListener('input', function () { colorTocado = true; });
        $$('input, textarea', r).forEach(function (el) { el.addEventListener('input', prev); });
        $$('[data-color]', r).forEach(function (s) {
          s.onclick = function () {
            $('#et-color', r).value = s.getAttribute('data-color'); colorTocado = true;
            $$('[data-color]', r).forEach(function (o) { o.removeAttribute('aria-pressed'); });
            s.setAttribute('aria-pressed', 'true'); prev();
          };
        });
        $('#et-sug', r).onclick = function () {
          var sg = QG.sugerirEtiqueta(($('#et-nombre', r).value + ' ' + $('#et-sub', r).value).trim());
          $('#et-uso', r).value = sg.uso; $('#et-prec', r).value = sg.precauciones; $('#et-color', r).value = sg.color; prev();
        };
        $('[data-cerrar2]', r).onclick = function () { cerrarModal(m); };
        var borrar = $('#et-borrar', r);
        if (borrar) borrar.onclick = function () {
          confirmar('¿Eliminar la etiqueta "' + b.nombre + (b.subtitulo ? ' ' + b.subtitulo : '') + '"?', 'Eliminar', function () {
            accion(null, 'borrarEtiqueta', { id: id }, 'Etiqueta eliminada.').then(function () { cerrarModal(m); }, function () {});
          }, true);
        };
        $('#et-ok', r).onclick = function () {
          leer();
          accion(this, 'guardarEtiqueta', { id: id, nombre: b.nombre, subtitulo: b.subtitulo, uso: b.uso, precauciones: b.precauciones, color: b.color, dibujo: b.dibujo, imagen: b.imagen || '', activo: id ? $('#et-activo', r).checked : true }, 'Etiqueta guardada.')
            .then(function () { cerrarModal(m); }, function () {});
        };
        prev();
      }
    });
  };

  ACT.mpGuardar = function (id, btn) {
    var t = $('#mp-token').value.trim();
    if (!t) return toast('Pegá el Access Token.', true);
    accion(btn, 'guardarTokenMP', { token: t }).then(function () { var i = $('#mp-token'); if (i) i.value = ''; }, function () {});
  };
  ACT.mpProbar = function (id, btn) { accion(btn, 'probarMP', {}).catch(function () {}); };
  RENDER.ajustes = function () {
    var html = '<section class="card"><h2>Mi usuario</h2><div class="fila"><span><b>' + esc(D.yo.nombre) + '</b> · ' + ROL[rol()] + ' · usuario <span class="mono">' + esc(D.yo.usuario) + '</span></span>' +
      '<button class="btn" type="button" data-act="miPin" style="margin-left:auto">Cambiar mi PIN</button><button class="btn peligro" type="button" data-salir>' + ic('salir') + 'Cerrar sesión</button></div>' +
      '<p class="muted" style="margin:12px 0 0;font-size:.8rem">Akuma Clean v' + esc(D.app) + ' · Desarrollado por AkumaNet · Autor: Juan Carlos Ojeda · Tel. 11 6033-1552</p></section>';
    if (!esAdmin()) return html;
    var c = D.config;
    html += '<section class="card"><h2>Datos de la empresa (salen en remitos y WhatsApp)</h2><form id="f-cfg" class="modal-body" style="padding:0">' +
      '<div class="grid3"><label class="campo"><span>Nombre de la empresa</span><input class="in" id="cf-empresa" value="' + esc(c.empresa || '') + '"></label>' +
      '<label class="campo"><span>Teléfono</span><input class="in" id="cf-telefono" value="' + esc(c.telefono || '') + '"></label>' +
      '<label class="campo"><span>CUIT</span><input class="in" id="cf-cuit" value="' + esc(c.cuit || '') + '"></label></div>' +
      '<div class="grid3"><label class="campo"><span>Dirección</span><input class="in" id="cf-direccion" value="' + esc(c.direccion || '') + '"></label>' +
      '<label class="campo"><span>Alias para transferencias</span><input class="in" id="cf-alias" value="' + esc(c.alias || '') + '"></label>' +
      '<label class="campo"><span>CBU / CVU</span><input class="in" id="cf-cbu" value="' + esc(c.cbu || '') + '"></label></div>' +
      '<div class="grid3"><label class="campo"><span>Punto de venta del remito</span><input class="in" id="cf-puntoVenta" value="' + esc(c.puntoVenta || '0001') + '"></label>' +
      '<label class="campo"><span>Formato de remito</span><select class="in" id="cf-formatoRemito"><option value="a4">Hoja A4</option><option value="ticket"' + (c.formatoRemito === 'ticket' ? ' selected' : '') + '>Ticket 80 mm</option></select></label>' +
      '<label class="campo"><span>Pie del remito</span><input class="in" id="cf-pieRemito" value="' + esc(c.pieRemito || '') + '" placeholder="Documento no válido como factura"></label></div>' +
      '<div class="grid3"><label class="campo"><span>Dólar en remitos y WhatsApp</span><select class="in" id="cf-mostrarUsd"><option value="si">Mostrar el total en dólares</option><option value="no"' + (c.mostrarUsd === 'no' ? ' selected' : '') + '>No mostrar</option></select></label>' +
      '<label class="campo"><span>Cotización manual del dólar (vacío = oficial automático)</span><input class="in num" id="cf-dolarManual" inputmode="decimal" value="' + esc(c.dolarManual || '') + '" placeholder="Automático"></label>' +
      '<div class="campo"><span>Cotización que se está usando</span><b style="padding-top:8px">' + (D.dolar ? pesos(D.dolar.valor) + ' · ' + esc(D.dolar.fuente === 'manual' ? 'manual' : 'oficial BNA') : 'Sin cotización') + '</b></div></div>' +
      '<label class="campo"><span>Texto legal de las etiquetas (opcional: N° de registro ANMAT/RNPUD, elaborador, dirección)</span><input class="in" id="cf-legalEtiqueta" value="' + esc(c.legalEtiqueta || '') + '" placeholder="Elaborado por Akuma Clean · RNE N° … · RNPUD N° …"></label>' +
      '<div class="fila fin"><button class="btn pri" type="submit">Guardar datos</button></div></form></section>';
    var ti = D.tienda || {}, si_ = function (k) { return c[k] !== 'no'; };
    var linkT = ti.url || '';
    html += '<section class="card" id="tienda-cfg"><h2>' + ic('carrito') + 'Tienda online para clientes</h2>' +
      '<p class="muted" style="margin:0 0 10px;font-size:.86rem">Los clientes ven solo el <b>precio minorista</b> de los productos tildados en "Mostrar en la tienda". Los pedidos entran acá como <b>Nuevo · Web</b>. Los productos a granel (tanque o suelto) se ofrecen solo con retiro en el local.</p>' +
      (linkT ? '<div class="fila" style="margin-bottom:10px"><input class="in mono" readonly value="' + esc(linkT) + '" style="flex:1;min-width:0" aria-label="Link de la tienda"><button class="btn" type="button" data-copiar-link="' + esc(linkT) + '">Copiar link</button><a class="btn" href="' + esc(linkT) + '" target="_blank" rel="noopener">Abrir tienda</a></div>' : '<div class="aviso azul" style="margin-bottom:10px">El link de la tienda es el link <b>/exec</b> de la app con <span class="mono">?tienda</span> al final.</div>') +
      '<form id="f-tienda" class="modal-body" style="padding:0">' +
      '<div class="fila"><label class="check"><input type="checkbox" id="tf-tiendaActiva"' + (si_('tiendaActiva') ? ' checked' : '') + '> Tienda abierta</label>' +
      '<label class="check"><input type="checkbox" id="tf-tiendaMp"' + (si_('tiendaMp') ? ' checked' : '') + '> Mercado Pago</label>' +
      '<label class="check"><input type="checkbox" id="tf-tiendaTransferencia"' + (si_('tiendaTransferencia') ? ' checked' : '') + '> Transferencia (usa el alias de arriba)</label>' +
      '<label class="check"><input type="checkbox" id="tf-tiendaEfectivo"' + (si_('tiendaEfectivo') ? ' checked' : '') + '> Efectivo</label></div>' +
      '<div class="grid3"><label class="campo"><span>Envío gratis en CABA desde $</span><input class="in num" id="tf-tiendaGratisCaba" inputmode="numeric" value="' + esc(c.tiendaGratisCaba || '50000') + '"></label>' +
      '<label class="campo"><span>Compra mínima fuera de CABA $</span><input class="in num" id="tf-tiendaMinimoInterior" inputmode="numeric" value="' + esc(c.tiendaMinimoInterior || '80000') + '"></label>' +
      '<label class="campo"><span>WhatsApp de ventas</span><input class="in" id="tf-tiendaWhatsapp" value="' + esc(c.tiendaWhatsapp || c.telefono || '') + '"></label></div>' +
      '<div class="grid2"><label class="campo"><span>Dirección para retirar</span><input class="in" id="tf-tiendaDireccion" value="' + esc(c.tiendaDireccion || c.direccion || '') + '"></label>' +
      '<label class="campo"><span>Horario de retiro</span><input class="in" id="tf-tiendaHorario" value="' + esc(c.tiendaHorario || '') + '" placeholder="Lunes a viernes de 9 a 18"></label></div>' +
      '<label class="campo"><span>Mensaje de bienvenida</span><input class="in" id="tf-tiendaMensaje" value="' + esc(c.tiendaMensaje || '') + '" placeholder="Fabricamos nuestros productos: calidad de fábrica a precio justo."></label>' +
      '<label class="campo"><span>Link propio de la tienda (opcional, si la publicás con tu dominio)</span><input class="in mono" id="tf-tiendaUrl" value="' + esc(c.tiendaUrl || '') + '" placeholder="https://akumaclean.com.ar/tienda.html"></label>' +
      '<div class="fila fin"><button class="btn pri" type="submit">Guardar tienda</button></div></form>' +
      '<h3 class="sub" style="margin-top:16px">Mercado Pago</h3>' +
      '<div class="fila"><span class="chip ' + (ti.mpListo ? 'pg-pagado' : 'pg-pendiente') + '">' + (ti.mpListo ? (ti.mpPrueba ? 'Conectado (modo prueba)' : 'Access Token cargado') : 'Sin configurar') + '</span>' +
      '<input class="in mono" id="mp-token" type="password" autocomplete="off" placeholder="' + (ti.mpListo ? 'Pegá uno nuevo para reemplazarlo' : 'APP_USR-…') + '" style="flex:1;min-width:200px" aria-label="Access Token de Mercado Pago">' +
      '<button class="btn" type="button" data-act="mpGuardar">Guardar token</button>' + (ti.mpListo ? '<button class="btn" type="button" data-act="mpProbar">Probar conexión</button>' : '') + '</div>' +
      '<p class="muted" style="margin:6px 0 0;font-size:.8rem">Usá el mismo Access Token de producción que en CosteApp (Mercado Pago → Tus integraciones → Credenciales). Se guarda en el servidor: nadie lo puede ver, ni siquiera desde esta pantalla. El pago se confirma solo y queda registrado en el pedido.</p></section>';
    html += '<section class="card"><h2>' + ic('subir') + 'Respaldo de la información</h2><div class="fila"><span>Todos los domingos a las 3 AM se guarda una copia completa de la planilla en tu Google Drive, en la carpeta <b>Akuma Clean - Respaldos</b> (quedan las últimas 12).<br>' +
      '<span class="muted">Último respaldo: ' + (D.config.ultimoRespaldo ? fechaHora(D.config.ultimoRespaldo) : 'todavía no se hizo') + '</span></span>' +
      '<button class="btn" type="button" data-act="respaldo" style="margin-left:auto">Hacer un respaldo ahora</button></div></section>';
    html += '<div class="dos-col"><section class="card"><h2>Zonas y costos de envío</h2>' +
      '<p class="muted" style="margin:0 0 10px;font-size:.84rem">Envío = costo fijo de la zona + precio por km × distancia. Si la compra supera el monto de "gratis desde", el envío es $ 0.</p>' +
      '<div class="tabla-wrap"><table class="t"><thead><tr><th>Zona</th><th class="der">Fijo</th><th class="der">Por km</th><th class="der">Gratis desde</th><th></th></tr></thead><tbody>' +
      (D.zonas.length ? D.zonas.map(function (z) {
        return '<tr' + (z.activo !== 'si' ? ' style="opacity:.55"' : '') + '><td>' + esc(z.nombre) + '</td><td class="der num">' + pesos(z.costoBase) + '</td><td class="der num">' + pesos(z.costoKm) + '</td><td class="der num">' + (num(z.gratisDesde) ? pesos(z.gratisDesde) : '—') + '</td>' +
          '<td class="acc"><button class="btn chico icono" type="button" data-act="editarZona" data-id="' + z.id + '" aria-label="Editar">' + ic('editar') + '</button></td></tr>';
      }).join('') : '<tr><td colspan="5" class="vacio">Sin zonas. Creá la primera.</td></tr>') + '</tbody></table></div>' +
      '<div class="fila fin" style="margin-top:10px"><button class="btn" type="button" data-act="editarZona">' + ic('mas') + 'Nueva zona</button></div></section>' +
      '<section class="card"><h2>Usuarios del equipo</h2><div class="tabla-wrap"><table class="t"><thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th></th></tr></thead><tbody>' +
      D.usuarios.map(function (u) {
        return '<tr' + (u.activo !== 'si' ? ' style="opacity:.55"' : '') + '><td>' + esc(u.nombre) + '</td><td class="mono">' + esc(u.usuario) + '</td><td>' + ROL[u.rol] + (u.activo !== 'si' ? ' · inactivo' : '') + ((u.permisos || []).length ? '<br><small class="muted">+ ' + u.permisos.map(function (p) { return PERMISO_TXT[p] ? PERMISO_TXT[p][0] : p; }).join(', ') + '</small>' : '') + '</td>' +
          '<td class="acc"><button class="btn chico icono" type="button" data-act="editarUsuario" data-id="' + u.id + '" aria-label="Editar">' + ic('editar') + '</button></td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<p class="muted" style="font-size:.8rem;margin:10px 0 0"><b>Ventas</b>: pedidos, clientes y cobros. <b>Depósito</b>: prepara pedidos y ajusta stock, no ve precios ni recetas. <b>Reparto</b>: lleva pedidos, marca entregas y cobra. Las <b>recetas, costos y ganancias</b> son solo del administrador; con el lápiz podés darle a un empleado puntual el permiso de Producción o de Costos.</p>' +
      '<div class="fila fin" style="margin-top:10px"><button class="btn" type="button" data-act="editarUsuario">' + ic('mas') + 'Nuevo usuario</button></div></section></div>';
    return html;
  };
  ALABRIR.ajustes = function (r) {
    var ft = $('#f-tienda', r);
    if (ft) ft.onsubmit = function (ev) {
      ev.preventDefault();
      var d = {};
      ['tiendaActiva', 'tiendaMp', 'tiendaTransferencia', 'tiendaEfectivo'].forEach(function (k) { d[k] = $('#tf-' + k, r).checked ? 'si' : 'no'; });
      ['tiendaGratisCaba', 'tiendaMinimoInterior', 'tiendaWhatsapp', 'tiendaDireccion', 'tiendaHorario', 'tiendaMensaje', 'tiendaUrl'].forEach(function (k) { d[k] = $('#tf-' + k, r).value.trim(); });
      d.tiendaGratisCaba = String(num(leerNumero(d.tiendaGratisCaba))); d.tiendaMinimoInterior = String(num(leerNumero(d.tiendaMinimoInterior)));
      accion($('button[type=submit]', ft), 'guardarConfig', d, 'Tienda guardada.').catch(function () {});
    };
    $$('[data-copiar-link]', r).forEach(function (b) {
      b.onclick = function () { var v = b.getAttribute('data-copiar-link'); try { navigator.clipboard.writeText(v).then(function () { toast('Link copiado.'); }); } catch (e) { toast(v); } };
    });
    var f = $('#f-cfg', r);
    if (!f) return;
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = {};
      ['empresa', 'telefono', 'cuit', 'direccion', 'alias', 'cbu', 'puntoVenta', 'formatoRemito', 'pieRemito', 'legalEtiqueta', 'mostrarUsd', 'dolarManual'].forEach(function (k) { d[k] = $('#cf-' + k, r).value; });
      accion($('button[type=submit]', f), 'guardarConfig', d, 'Datos de la empresa guardados.').catch(function () {});
    });
  };
  function editorZona(id) {
    var z = id ? IDX.zona[id] : { activo: 'si' };
    abrirModal({
      titulo: id ? 'Editar zona' : 'Nueva zona de envío',
      cuerpo: function () {
        return '<label class="campo"><span>Nombre de la zona</span><input class="in" id="z-nombre" value="' + esc(z.nombre || '') + '" placeholder="Zona Norte" autofocus></label>' +
          '<div class="grid3"><label class="campo"><span>Costo fijo $</span><input class="in num" id="z-base" inputmode="decimal" value="' + (z.costoBase || '') + '"></label>' +
          '<label class="campo"><span>Precio por km $</span><input class="in num" id="z-km" inputmode="decimal" value="' + (z.costoKm || '') + '"></label>' +
          '<label class="campo"><span>Gratis desde $</span><input class="in num" id="z-gratis" inputmode="decimal" value="' + (z.gratisDesde || '') + '" placeholder="Nunca"></label></div>' +
          '<label class="check"><input type="checkbox" id="z-activo"' + (z.activo !== 'no' ? ' checked' : '') + '> Zona activa</label>';
      },
      pie: function () { return '<button class="btn" type="button" data-cerrar2>Cancelar</button><button class="btn pri" type="button" id="z-ok">Guardar zona</button>'; },
      alAbrir: function (r, m) {
        $('[data-cerrar2]', r).onclick = function () { cerrarModal(m); };
        $('#z-ok', r).onclick = function () {
          accion(this, 'guardarZona', { id: id, nombre: $('#z-nombre', r).value, costoBase: num($('#z-base', r).value), costoKm: num($('#z-km', r).value), gratisDesde: num($('#z-gratis', r).value), activo: $('#z-activo', r).checked }, 'Zona guardada.')
            .then(function () { cerrarModal(m); }, function () {});
        };
      }
    });
  }
  function editorUsuario(id) {
    var u = id ? IDX.usr[id] : { rol: 'ventas', activo: 'si' };
    abrirModal({
      titulo: id ? 'Editar usuario' : 'Nuevo usuario',
      cuerpo: function () {
        return '<div class="grid2"><label class="campo"><span>Nombre</span><input class="in" id="u-nombre" value="' + esc(u.nombre || '') + '" autofocus></label>' +
          '<label class="campo"><span>Usuario (para ingresar)</span><input class="in" id="u-usuario" autocapitalize="none" value="' + esc(u.usuario || '') + '"></label></div>' +
          '<div class="grid2"><label class="campo"><span>Rol</span><select class="in" id="u-rol">' + QG.ROLES.map(function (r) { return '<option value="' + r + '"' + (u.rol === r ? ' selected' : '') + '>' + ROL[r] + '</option>'; }).join('') + '</select></label>' +
          '<label class="campo"><span>' + (id ? 'PIN nuevo (dejalo vacío para no cambiarlo)' : 'PIN (4 a 8 números)') + '</span><input class="in" id="u-pin" inputmode="numeric" autocomplete="off"></label></div>' +
          '<div class="campo" id="u-perm-box"><span>Permisos</span><div id="u-perm" class="permisos"></div></div>' +
          (id ? '<label class="check"><input type="checkbox" id="u-activo"' + (u.activo !== 'no' ? ' checked' : '') + '> Puede ingresar (desmarcá para bloquear su acceso)</label>' : '');
      },
      pie: function () { return '<button class="btn" type="button" data-cerrar2>Cancelar</button><button class="btn pri" type="button" id="u-ok">Guardar usuario</button>'; },
      alAbrir: function (r, m) {
        var extra = (u.permisos || []).slice();
        var pintarPerm = function () {
          var rl = $('#u-rol', r).value, base = QG.PERMISOS_ROL[rl] || [];
          $('#u-perm', r).innerHTML = rl === 'admin' ? '<p class="muted" style="margin:0;font-size:.85rem">El administrador tiene acceso a todo.</p>' : QG.PERMISOS.map(function (p) {
            var delRol = base.indexOf(p) >= 0, on = delRol || extra.indexOf(p) >= 0;
            return '<label class="permiso' + (p === 'produccion' || p === 'costos' ? ' sensible' : '') + '"><input type="checkbox" data-perm="' + p + '"' + (on ? ' checked' : '') + (delRol ? ' disabled' : '') + '>' +
              '<span><b>' + PERMISO_TXT[p][0] + '</b><small>' + PERMISO_TXT[p][1] + (delRol ? ' · incluido en el rol' : '') + '</small></span></label>';
          }).join('');
        };
        $('#u-rol', r).onchange = pintarPerm;
        $('#u-perm', r).addEventListener('change', function (e) {
          var p = e.target.getAttribute('data-perm');
          if (!p) return;
          extra = extra.filter(function (x) { return x !== p; });
          if (e.target.checked) extra.push(p);
        });
        pintarPerm();
        $('[data-cerrar2]', r).onclick = function () { cerrarModal(m); };
        $('#u-ok', r).onclick = function () {
          accion(this, 'guardarUsuario', { id: id, nombre: $('#u-nombre', r).value, usuario: $('#u-usuario', r).value, rol: $('#u-rol', r).value, pin: $('#u-pin', r).value, permisos: extra, activo: id ? $('#u-activo', r).checked : true }, 'Usuario guardado.')
            .then(function () { cerrarModal(m); }, function () {});
        };
      }
    });
  }
  function modalMiPin() {
    abrirModal({
      titulo: 'Cambiar mi PIN',
      cuerpo: function () {
        return '<div class="grid2"><label class="campo"><span>PIN actual</span><input class="in" id="m-act" type="password" inputmode="numeric" autofocus></label>' +
          '<label class="campo"><span>PIN nuevo (4 a 8 números)</span><input class="in" id="m-nue" type="password" inputmode="numeric"></label></div>';
      },
      pie: function () { return '<button class="btn" type="button" data-cerrar2>Cancelar</button><button class="btn pri" type="button" id="m-ok">Cambiar PIN</button>'; },
      alAbrir: function (r, m) {
        $('[data-cerrar2]', r).onclick = function () { cerrarModal(m); };
        $('#m-ok', r).onclick = function () {
          accion(this, 'cambiarMiPin', { actual: $('#m-act', r).value, nuevo: $('#m-nue', r).value }, 'PIN cambiado.').then(function () { cerrarModal(m); }, function () {});
        };
      }
    });
  }

  /* ============================================================
   * 18. CAJA DEL REPARTIDOR (rendición de cobros)
   * ============================================================ */
  function pendientesDe(uid) { return (D.cajaPendiente || []).filter(function (x) { return x.usuarioId === uid; }); }
  function chipDiferencia(dif, moneda) {
    dif = Math.round(num(dif) * 100) / 100;
    if (Math.abs(dif) < 0.5) return '<span class="chip pg-pagado">Cierra justo</span>';
    var m = moneda === 'USD' ? 'US$ ' + fmtUsd.format(Math.abs(dif)) : pesos(Math.abs(dif));
    return dif < 0 ? '<span class="chip pg-pendiente">Faltan ' + m + '</span>' : '<span class="chip pg-parcial">Sobran ' + m + '</span>';
  }
  function tarjetasCaja(r) {
    var otros = Object.keys(r.otros).map(function (k) { return MEDIO[k] + ' ' + pesos(r.otros[k]); }).join(' · ');
    return '<div class="kpis">' +
      '<div class="kpi"><small>Efectivo a rendir</small><b>' + pesos(r.efectivoArs) + '</b><em>' + r.cantidad + ' cobro' + (r.cantidad === 1 ? '' : 's') + '</em></div>' +
      '<div class="kpi"><small>Dólares a rendir</small><b>US$ ' + fmtUsd.format(r.efectivoUsd) + '</b><em>Billetes cobrados</em></div>' +
      '<div class="kpi"><small>Ya en la cuenta</small><b>' + pesos(Object.keys(r.otros).reduce(function (t, k) { return t + r.otros[k]; }, 0)) + '</b><em>' + (otros || 'Transferencias y Mercado Pago') + '</em></div></div>';
  }
  RENDER.caja = function () {
    var adm = esAdmin();
    var html = '';
    if (adm) {
      var porPersona = {};
      (D.cajaPendiente || []).forEach(function (x) { (porPersona[x.usuarioId] = porPersona[x.usuarioId] || []).push(x); });
      var aConfirmar = (D.rendiciones || []).filter(function (x) { return x.estado === 'pendiente'; });
      html += '<section class="card"><h2>' + ic('caja') + 'Plata en mano de cada uno</h2>' + (Object.keys(porPersona).length ? '<div class="cajas">' + Object.keys(porPersona).map(function (uid) {
        var r = QG.resumenCaja(porPersona[uid]), nombre = (IDX.usr[uid] || {}).nombre || '—';
        return '<div class="caja-persona"><div><b>' + esc(nombre) + '</b><small class="muted">' + r.cantidad + ' cobro' + (r.cantidad === 1 ? '' : 's') + ' sin rendir</small></div>' +
          '<div class="num"><b>' + pesos(r.efectivoArs) + '</b>' + (r.efectivoUsd ? '<small>+ US$ ' + fmtUsd.format(r.efectivoUsd) + '</small>' : '<small class="muted">en efectivo</small>') + '</div>' +
          '<button class="btn chico" type="button" data-act="rendir" data-id="' + uid + '">' + (uid === D.yo.id ? 'Cerrar mi caja' : 'Recibir rendición') + '</button></div>';
      }).join('') + '</div>' : '<p class="vacio">Nadie tiene cobros sin rendir.</p>') + '</section>';
      if (aConfirmar.length) {
        html += '<section class="card"><h2>' + ic('pesos') + 'Rendiciones para confirmar</h2><div class="lista-simple">' + aConfirmar.map(function (x) {
          return '<div><span><b>N° ' + x.numero + ' · ' + esc(x.usuarioNombre) + '</b> <span class="muted">' + fechaCorta(x.fecha) + ' · entregó ' + pesos(x.entregadoArs) + (x.entregadoUsd ? ' + US$ ' + fmtUsd.format(x.entregadoUsd) : '') + (x.gastos ? ' · gastos ' + pesos(x.gastos) : '') + '</span></span>' +
            '<span class="fila">' + chipDiferencia(x.diferenciaArs) + (x.diferenciaUsd ? chipDiferencia(x.diferenciaUsd, 'USD') : '') + '<button class="btn chico ok" type="button" data-act="confirmarRend" data-id="' + x.id + '">Recibí</button></span></div>';
        }).join('') + '</div></section>';
      }
    } else {
      var mios = pendientesDe(D.yo.id), r = QG.resumenCaja(mios);
      html += tarjetasCaja(r);
      html += '<div class="fila"><span class="muted">Lo que cobraste desde tu última rendición.</span><button class="btn pri" type="button" data-act="rendir" data-id="' + D.yo.id + '" style="margin-left:auto"' + (mios.length ? '' : ' disabled') + '>' + ic('caja') + 'Rendir caja</button></div>';
      html += mios.length ? '<div class="tabla-wrap"><table class="t"><thead><tr><th>Fecha</th><th>Cliente</th><th>Pedido</th><th>Medio</th><th class="der">Monto</th></tr></thead><tbody>' + mios.map(function (x) {
        return '<tr><td class="num">' + fechaCorta(x.fecha) + '</td><td>' + esc((IDX.cli[x.clienteId] || {}).nombre || '—') + '</td><td class="mono">' + nroPedido((IDX.pedido[x.pedidoId] || {}).numero) + '</td><td>' + MEDIO[x.medio] + (x.moneda === 'USD' ? ' US$' : '') + '</td>' +
          '<td class="der num"><b>' + (x.moneda === 'USD' ? 'US$ ' + fmtUsd.format(num(x.montoMoneda)) : pesos(x.monto)) + '</b></td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="card vacio">No tenés cobros sin rendir. 👌</div>';
    }
    var hist = (D.rendiciones || []).filter(function (x) { return adm || x.usuarioId === D.yo.id; }).sort(function (a, b) { return b.numero - a.numero; });
    html += '<section class="card" style="padding:0;overflow:hidden"><h2 style="padding:14px 16px 0">Rendiciones</h2>' + (hist.length ? '<div class="tabla-wrap" style="border:0;border-radius:0"><table class="t"><thead><tr><th>N°</th><th>Fecha</th><th>Quién</th><th class="der">Efectivo esperado</th><th class="der">Entregó</th><th>Resultado</th><th>Estado</th></tr></thead><tbody>' + hist.map(function (x) {
      var e = x.esperado || {};
      return '<tr><td class="mono">' + x.numero + '</td><td class="num">' + fechaCorta(x.fecha) + '</td><td>' + esc(x.usuarioNombre) + '</td>' +
        '<td class="der num">' + pesos(e.efectivoArs) + (num(e.efectivoUsd) ? '<br><small>US$ ' + fmtUsd.format(num(e.efectivoUsd)) + '</small>' : '') + '</td>' +
        '<td class="der num">' + pesos(x.entregadoArs) + (num(x.entregadoUsd) ? '<br><small>US$ ' + fmtUsd.format(num(x.entregadoUsd)) + '</small>' : '') + (num(x.gastos) ? '<br><small class="muted">gastos ' + pesos(x.gastos) + '</small>' : '') + '</td>' +
        '<td>' + chipDiferencia(x.diferenciaArs) + (num(x.diferenciaUsd) ? ' ' + chipDiferencia(x.diferenciaUsd, 'USD') : '') + '</td>' +
        '<td>' + (x.estado === 'confirmada' ? '<span class="chip plano pg-pagado">Recibida</span>' : '<span class="chip plano pg-parcial">Por confirmar</span>') + '</td></tr>';
    }).join('') + '</tbody></table></div>' : '<p class="vacio">Todavía no hay rendiciones.</p>') + '</section>';
    return html;
  };
  ACT.confirmarRend = function (id, btn) { accion(btn, 'confirmarRendicion', { id: id }).catch(function () {}); };
  ACT.rendir = function (uid) {
    var pagos = pendientesDe(uid), r = QG.resumenCaja(pagos), nombre = (IDX.usr[uid] || {}).nombre || '';
    if (!pagos.length) { toast('No hay cobros pendientes de rendir.', true); return; }
    abrirModal({
      titulo: 'Rendir caja · ' + esc(nombre),
      cuerpo: function () {
        return '<div class="resumen"><div class="r"><span>Cobros incluidos</span><span>' + r.cantidad + '</span></div>' +
          '<div class="r" style="font-weight:600"><span>Efectivo en pesos</span><span>' + pesos(r.efectivoArs) + '</span></div>' +
          (r.efectivoUsd ? '<div class="r" style="font-weight:600"><span>Efectivo en dólares</span><span>US$ ' + fmtUsd.format(r.efectivoUsd) + '</span></div>' : '') +
          Object.keys(r.otros).map(function (k) { return '<div class="r usd"><span>' + MEDIO[k] + ' (ya en la cuenta)</span><span>' + pesos(r.otros[k]) + '</span></div>'; }).join('') + '</div>' +
          '<div class="grid2"><label class="campo"><span>Efectivo que entrega ($)</span><input class="in num" id="rc-ars" inputmode="decimal" value="' + r.efectivoArs + '" autofocus></label>' +
          '<label class="campo"><span>Dólares que entrega (US$)</span><input class="in num" id="rc-usd" inputmode="decimal" value="' + r.efectivoUsd + '"' + (r.efectivoUsd ? '' : ' placeholder="0"') + '></label></div>' +
          '<div class="grid2"><label class="campo"><span>Gastos pagados con lo cobrado ($)</span><input class="in num" id="rc-gastos" inputmode="decimal" placeholder="0"></label>' +
          '<label class="campo"><span>¿En qué?</span><input class="in" id="rc-gdet" placeholder="Nafta, peaje…"></label></div>' +
          '<label class="campo"><span>Nota (opcional)</span><input class="in" id="rc-nota"></label>' +
          '<div id="rc-dif" class="fila"></div>';
      },
      pie: function () { return '<button class="btn" type="button" data-cerrar2>Cancelar</button><button class="btn ok" type="button" id="rc-ok">' + ic('caja') + 'Registrar rendición</button>'; },
      alAbrir: function (rt, m) {
        var calc = function () {
          var dif = num($('#rc-ars', rt).value) + num($('#rc-gastos', rt).value) - r.efectivoArs, du = num($('#rc-usd', rt).value) - r.efectivoUsd;
          $('#rc-dif', rt).innerHTML = '<span class="muted">Resultado:</span>' + chipDiferencia(dif) + (r.efectivoUsd || num($('#rc-usd', rt).value) ? chipDiferencia(du, 'USD') : '');
        };
        $$('input', rt).forEach(function (i) { i.addEventListener('input', calc); });
        calc();
        $('[data-cerrar2]', rt).onclick = function () { cerrarModal(m); };
        $('#rc-ok', rt).onclick = function () {
          accion(this, 'rendirCaja', { usuarioId: uid, entregadoArs: num($('#rc-ars', rt).value), entregadoUsd: num($('#rc-usd', rt).value), gastos: num($('#rc-gastos', rt).value), gastosDetalle: $('#rc-gdet', rt).value, nota: $('#rc-nota', rt).value })
            .then(function () { cerrarModal(m); }, function () {});
        };
      }
    });
  };

  /* ============================================================
   * 19. COMPRAS Y PROVEEDORES
   * ============================================================ */
  S.compras = { tab: 'compras' };
  function montoMon(n, moneda) { return moneda === 'USD' ? 'US$ ' + fmtUsd.format(num(n)) : pesos(n); }
  function deudaProveedor(pid) {
    var r = { ARS: 0, USD: 0 };
    (D.compras || []).forEach(function (c) { if (c.proveedorId === pid) r[c.moneda] += QG.pendienteCompra(c); });
    return r;
  }
  RENDER.compras = function () {
    var deuda = { ARS: 0, USD: 0 }, mes = D.hoy.slice(0, 7), compradoMes = 0;
    (D.compras || []).forEach(function (c) {
      deuda[c.moneda] += QG.pendienteCompra(c);
      if (c.estado !== 'anulada' && String(c.fecha).slice(0, 7) === mes) compradoMes += num(c.total) * (c.moneda === 'USD' ? dolar() : 1);
    });
    var html = '<div class="kpis">' +
      '<div class="kpi' + (deuda.ARS ? ' alerta' : '') + '"><small>Le debés a proveedores</small><b>' + pesos(deuda.ARS) + '</b><em>' + (deuda.USD ? '+ US$ ' + fmtUsd.format(deuda.USD) + ' en dólares' : 'En pesos') + '</em></div>' +
      '<div class="kpi"><small>Comprado este mes</small><b>' + pesos(compradoMes) + '</b><em>' + (dolar() ? usd(compradoMes) : '') + '</em></div>' +
      '<div class="kpi"><small>Proveedores</small><b>' + (D.proveedores || []).length + '</b><em>' + (D.proveedores || []).filter(function (p) { var d = deudaProveedor(p.id); return d.ARS || d.USD; }).length + ' con deuda</em></div></div>';
    html += '<div class="fila"><div class="seg" role="tablist"><button type="button" data-act="compTab" data-id="compras" aria-pressed="' + (S.compras.tab === 'compras') + '">Compras</button>' +
      '<button type="button" data-act="compTab" data-id="proveedores" aria-pressed="' + (S.compras.tab === 'proveedores') + '">Proveedores</button></div>' +
      '<span class="fila" style="margin-left:auto"><button class="btn" type="button" data-act="editarProveedor">' + ic('mas') + 'Proveedor</button><button class="btn pri" type="button" data-act="nuevaCompra">' + ic('carrito') + 'Nueva compra</button></span></div>';
    if (S.compras.tab === 'proveedores') {
      var provs = (D.proveedores || []).slice().sort(function (a, b) { return a.nombre.localeCompare(b.nombre); });
      html += provs.length ? '<div class="tabla-wrap"><table class="t"><thead><tr><th>Proveedor</th><th>Teléfono</th><th>CUIT</th><th class="der">Le debés</th><th></th></tr></thead><tbody>' + provs.map(function (p) {
        var d = deudaProveedor(p.id);
        return '<tr><td><b style="font-weight:500">' + esc(p.nombre) + '</b>' + (p.notas ? '<br><small class="muted">' + esc(p.notas) + '</small>' : '') + '</td><td class="num">' + esc(p.telefono) + '</td><td class="num">' + esc(p.cuit) + '</td>' +
          '<td class="der num' + (d.ARS || d.USD ? ' bajo' : '') + '">' + (d.ARS ? pesos(d.ARS) : '') + (d.ARS && d.USD ? '<br>' : '') + (d.USD ? 'US$ ' + fmtUsd.format(d.USD) : '') + (!d.ARS && !d.USD ? '—' : '') + '</td>' +
          '<td class="acc">' + (d.ARS || d.USD ? '<button class="btn chico" type="button" data-act="pagarProv" data-id="' + p.id + '">' + ic('pesos') + 'Pagar</button> ' : '') +
          '<button class="btn chico icono" type="button" data-act="editarProveedor" data-id="' + p.id + '" aria-label="Editar">' + ic('editar') + '</button></td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="card vacio">Cargá tus proveedores para registrar compras y saber cuánto les debés.</div>';
      return html;
    }
    var compras = (D.compras || []).slice().sort(function (a, b) { return b.numero - a.numero; });
    html += compras.length ? '<div class="tabla-wrap"><table class="t"><thead><tr><th>N°</th><th>Fecha</th><th>Proveedor</th><th>Detalle</th><th class="der">Total</th><th class="der">Saldo</th><th>Estado</th><th></th></tr></thead><tbody>' + compras.map(function (c) {
      var pend = QG.pendienteCompra(c), an = c.estado === 'anulada';
      return '<tr' + (an ? ' style="opacity:.5"' : '') + '><td class="mono">' + c.numero + '</td><td class="num">' + fechaCorta(c.fecha) + '</td><td>' + esc(c.proveedorNombre) + (c.factura ? '<br><small class="muted mono">' + esc(c.factura) + '</small>' : '') + '</td>' +
        '<td style="font-size:.84rem">' + (c.items || []).slice(0, 3).map(function (it) { return cant(it.cantidad) + ' ' + esc(it.unidad || '') + ' ' + esc(it.nombre); }).join('<br>') + ((c.items || []).length > 3 ? '<br><small class="muted">+ ' + (c.items.length - 3) + ' más</small>' : '') + '</td>' +
        '<td class="der num">' + montoMon(c.total, c.moneda) + '</td><td class="der num' + (pend ? ' bajo' : '') + '">' + (pend ? montoMon(pend, c.moneda) : '—') + '</td>' +
        '<td>' + (an ? '<span class="chip plano st-anulado">Anulada</span>' : pend ? '<span class="chip pg-pendiente">Debés</span>' : '<span class="chip pg-pagado">Pagada</span>') + '</td>' +
        '<td class="acc">' + (!an && pend ? '<button class="btn chico" type="button" data-act="pagarProv" data-id="' + c.proveedorId + '|' + c.id + '">Pagar</button> ' : '') +
        (!an && !num(c.pagado) ? '<button class="btn chico icono peligro" type="button" data-act="anularCompra" data-id="' + c.id + '" aria-label="Anular">' + ic('basura') + '</button>' : '') + '</td></tr>';
    }).join('') + '</tbody></table></div>' : '<div class="card vacio">Registrá tus compras: se suma el stock de insumos y productos, y se actualizan sus costos solos.</div>';
    return html;
  };
  ACT.compTab = function (t) { S.compras.tab = t; render(); };
  ACT.anularCompra = function (id) {
    var c = (D.compras || []).filter(function (x) { return x.id === id; })[0];
    confirmar('¿Anular la compra N° ' + c.numero + ' a ' + c.proveedorNombre + '? Se descuenta del stock lo que había sumado.', 'Anular compra', function () { accion(null, 'anularCompra', { id: id }).catch(function () {}); }, true);
  };
  ACT.editarProveedor = function (id, btn, alGuardar) {
    var p = id ? (D.proveedores || []).filter(function (x) { return x.id === id; })[0] : {};
    abrirModal({
      titulo: id ? 'Editar proveedor' : 'Nuevo proveedor',
      cuerpo: function () {
        return '<label class="campo"><span>Nombre o razón social</span><input class="in" id="pv-nombre" value="' + esc(p.nombre || '') + '" autofocus></label>' +
          '<div class="grid2"><label class="campo"><span>Teléfono</span><input class="in" id="pv-tel" value="' + esc(p.telefono || '') + '"></label><label class="campo"><span>CUIT</span><input class="in" id="pv-cuit" value="' + esc(p.cuit || '') + '"></label></div>' +
          '<label class="campo"><span>Notas</span><input class="in" id="pv-notas" value="' + esc(p.notas || '') + '" placeholder="Días de entrega, forma de pago…"></label>';
      },
      pie: function () { return '<button class="btn" type="button" data-cerrar2>Cancelar</button><button class="btn pri" type="button" id="pv-ok">Guardar proveedor</button>'; },
      alAbrir: function (r, m) {
        $('[data-cerrar2]', r).onclick = function () { cerrarModal(m); };
        $('#pv-ok', r).onclick = function () {
          accion(this, 'guardarProveedor', { id: id, nombre: $('#pv-nombre', r).value, telefono: $('#pv-tel', r).value, cuit: $('#pv-cuit', r).value, notas: $('#pv-notas', r).value })
            .then(function (res) { cerrarModal(m); if (alGuardar) alGuardar(res.resultado.id); }, function () {});
        };
      }
    });
  };
  ACT.pagarProv = function (dato) {
    var partes = String(dato).split('|'), pid = partes[0], compraId = partes[1] || '';
    var prov = (D.proveedores || []).filter(function (x) { return x.id === pid; })[0];
    var d = deudaProveedor(pid), moneda = compraId ? ((D.compras || []).filter(function (c) { return c.id === compraId; })[0] || {}).moneda || 'ARS' : (d.ARS ? 'ARS' : 'USD');
    abrirModal({
      titulo: 'Pagar a ' + esc(prov.nombre),
      cuerpo: function () {
        return '<div class="aviso azul">Le debés ' + (d.ARS ? '<b>' + pesos(d.ARS) + '</b>' : '') + (d.ARS && d.USD ? ' y ' : '') + (d.USD ? '<b>US$ ' + fmtUsd.format(d.USD) + '</b>' : '') + '. El pago se aplica primero a la compra elegida y después a las más viejas.</div>' +
          (d.ARS && d.USD ? '<div class="seg"><button type="button" data-mon="ARS" aria-pressed="' + (moneda === 'ARS') + '">Pesos</button><button type="button" data-mon="USD" aria-pressed="' + (moneda === 'USD') + '">Dólares</button></div>' : '') +
          '<div class="grid2"><label class="campo"><span id="pp-etq">Monto</span><input class="in num" id="pp-monto" inputmode="decimal" value="' + d[moneda] + '" autofocus></label>' +
          '<label class="campo"><span>Medio</span><select class="in" id="pp-medio">' + QG.MEDIOS.map(function (x) { return '<option value="' + x + '"' + (x === 'transferencia' ? ' selected' : '') + '>' + MEDIO[x] + '</option>'; }).join('') + '</select></label></div>' +
          '<div class="grid2"><label class="campo"><span>Fecha</span><input class="in" id="pp-fecha" type="date" value="' + D.hoy + '"></label><label class="campo"><span>Nota</span><input class="in" id="pp-nota" placeholder="N° de transferencia…"></label></div>';
      },
      pie: function () { return '<button class="btn" type="button" data-cerrar2>Cancelar</button><button class="btn ok" type="button" id="pp-ok">Registrar pago</button>'; },
      alAbrir: function (r, m) {
        var etq = function () { $('#pp-etq', r).textContent = 'Monto (' + (moneda === 'USD' ? 'US$' : '$') + ')'; };
        $$('[data-mon]', r).forEach(function (b) { b.onclick = function () { moneda = b.getAttribute('data-mon'); $$('[data-mon]', r).forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); }); $('#pp-monto', r).value = d[moneda]; etq(); }; });
        etq();
        $('[data-cerrar2]', r).onclick = function () { cerrarModal(m); };
        $('#pp-ok', r).onclick = function () {
          accion(this, 'pagarProveedor', { proveedorId: pid, compraId: compraId, moneda: moneda, monto: num($('#pp-monto', r).value), medio: $('#pp-medio', r).value, fecha: $('#pp-fecha', r).value, nota: $('#pp-nota', r).value })
            .then(function () { cerrarModal(m); }, function () {});
        };
      }
    });
  };
  ACT.nuevaCompra = function () {
    var C = { proveedorId: '', moneda: 'ARS', items: [] };
    var catalogo = function () {
      return (D.insumos || []).filter(function (i) { return i.activo === 'si'; }).map(function (i) { return { tipo: 'insumo', id: i.id, nombre: i.nombre, unidad: i.unidad, ref: i.moneda === C.moneda ? num(QG.costoUnitInsumo(i, i.moneda === 'USD' ? 1 : 1)) : 0, etq: TIPO_INSUMO[i.tipo] }; })
        .concat(D.productos.filter(function (p) { return p.activo === 'si'; }).map(function (p) { return { tipo: 'producto', id: p.id, nombre: p.nombre + (p.presentacion ? ' ' + p.presentacion : ''), unidad: p.unidad || 'u', ref: C.moneda === 'ARS' ? num(p.costo) : 0, etq: 'Producto (reventa)' }; }));
    };
    abrirModal({
      tam: 'lg', titulo: 'Nueva compra',
      cuerpo: function () {
        return '<div class="grid3"><label class="campo"><span>Proveedor</span><div class="fila" style="flex-wrap:nowrap"><select class="in" id="cm-prov"><option value="">Elegí…</option>' + (D.proveedores || []).filter(function (p) { return p.activo === 'si'; }).map(function (p) { return '<option value="' + p.id + '">' + esc(p.nombre) + '</option>'; }).join('') + '</select>' +
          '<button class="btn icono" type="button" id="cm-nprov" aria-label="Nuevo proveedor">' + ic('mas') + '</button></div></label>' +
          '<label class="campo"><span>Fecha</span><input class="in" id="cm-fecha" type="date" value="' + D.hoy + '"></label>' +
          '<label class="campo"><span>N° de factura o remito</span><input class="in mono" id="cm-fac" placeholder="A-0001-00001234"></label></div>' +
          '<div class="campo"><span>Moneda de la compra</span><div class="seg"><button type="button" data-mon="ARS" aria-pressed="true">Pesos $</button><button type="button" data-mon="USD" aria-pressed="false"' + (dolar() ? '' : ' disabled') + '>Dólares US$</button></div></div>' +
          '<div class="dropdown"><label class="campo"><span>Agregar insumo o producto</span><label class="buscar" style="max-width:none">' + ic('buscar') + '<input class="in" id="cm-buscar" type="search" placeholder="Pasta, bidón, esencia, termo…" autocomplete="off"></label></label><div class="resultados" id="cm-res" hidden></div></div>' +
          '<div class="tabla-wrap"><table class="t items"><thead><tr><th>Ítem</th><th class="der">Cantidad</th><th class="der" id="cm-th-precio">Precio unit. $</th><th class="der">Subtotal</th><th></th></tr></thead><tbody id="cm-items"></tbody></table></div>' +
          '<div class="pe" style="grid-template-columns:minmax(0,1fr) 300px"><div class="pe-lado">' +
          '<label class="check"><input type="checkbox" id="cm-act" checked> Actualizar el costo de los insumos y productos con estos precios</label>' +
          '<label class="check"><input type="checkbox" id="cm-pagada"> La pagué en el momento</label>' +
          '<label class="campo" id="cm-medio-box" hidden><span>Medio de pago</span><select class="in" id="cm-medio">' + QG.MEDIOS.map(function (x) { return '<option value="' + x + '">' + MEDIO[x] + '</option>'; }).join('') + '</select></label>' +
          '<label class="campo"><span>Notas</span><input class="in" id="cm-notas"></label></div>' +
          '<div class="resumen" id="cm-total"></div></div>';
      },
      pie: function () { return '<button class="btn" type="button" data-cerrar2>Cancelar</button><button class="btn pri" type="button" id="cm-ok">' + ic('carrito') + 'Registrar compra</button>'; },
      alAbrir: function (r, m) {
        var total = function () { return C.items.reduce(function (s, it) { return s + num(it.cantidad) * num(it.precio); }, 0); };
        var pintarTotal = function () {
          var t = total();
          $('#cm-total', r).innerHTML = '<div class="r total"><span>Total</span><span>' + montoMon(t, C.moneda) + '</span></div>' +
            (C.moneda === 'USD' && dolar() ? '<div class="r usd"><span>En pesos (oficial ' + pesos(dolar()) + ')</span><span>' + pesos(t * dolar()) + '</span></div>' : dolar() ? '<div class="r usd"><span>En dólares</span><span>' + usd(t) + '</span></div>' : '');
          $$('[data-sub]', r).forEach(function (td) { var it = C.items[td.getAttribute('data-sub')]; if (it) td.textContent = montoMon(num(it.cantidad) * num(it.precio), C.moneda); });
        };
        var pintar = function () {
          $('#cm-th-precio', r).textContent = 'Precio unit. ' + (C.moneda === 'USD' ? 'US$' : '$');
          $('#cm-items', r).innerHTML = C.items.length ? C.items.map(function (it, n) {
            return '<tr><td><b style="font-weight:500">' + esc(it.nombre) + '</b><br><small class="muted">' + (it.tipo === 'insumo' ? 'Insumo · precio por ' + it.unidad : 'Producto · por unidad') + '</small></td>' +
              '<td class="cant"><div class="fila" style="flex-wrap:nowrap;gap:4px"><input class="in num" data-n="' + n + '" data-k="cantidad" inputmode="decimal" value="' + (it.cantidad || '') + '"><small class="muted">' + esc(it.unidad) + '</small></div></td>' +
              '<td class="precio"><input class="in num" data-n="' + n + '" data-k="precio" inputmode="decimal" value="' + (it.precio || '') + '"></td>' +
              '<td class="der num" data-sub="' + n + '"></td><td class="acc"><button class="btn icono chico peligro" type="button" data-quitar="' + n + '" aria-label="Quitar">' + ic('x') + '</button></td></tr>';
          }).join('') : '<tr><td colspan="5" class="vacio">Buscá arriba lo que compraste.</td></tr>';
          pintarTotal();
        };
        var inp = $('#cm-buscar', r), res = $('#cm-res', r);
        var buscar = function () {
          var q = normal(inp.value);
          if (!q) { res.hidden = true; return; }
          var lista = catalogo().filter(function (x) { return q.split(/\s+/).every(function (w) { return normal(x.nombre).indexOf(w) >= 0; }); }).slice(0, 10);
          res.hidden = false;
          res.innerHTML = lista.map(function (x, k) { return '<button type="button" data-it="' + x.tipo + '|' + x.id + '"' + (k ? '' : ' class="act"') + '><span>' + esc(x.nombre) + '</span><small>' + x.etq + '</small></button>'; }).join('') || '<p class="vacio">No encontré "' + esc(inp.value) + '".</p>';
        };
        inp.addEventListener('input', buscar);
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); var a = $('[data-it]', res); if (a) a.click(); } });
        res.addEventListener('click', function (e) {
          var b = e.target.closest('[data-it]');
          if (!b) return;
          var k = b.getAttribute('data-it').split('|'), x = catalogo().filter(function (c) { return c.tipo === k[0] && c.id === k[1]; })[0];
          var precio = 0;
          if (x.tipo === 'insumo') { var ins = insumoPorId(x.id); precio = ins.moneda === C.moneda ? num(ins.precioEnvase) / Math.max(0.000001, num(ins.cantidadEnvase)) : 0; }
          else precio = C.moneda === 'ARS' ? num((IDX.prod[x.id] || {}).costo) : 0;
          C.items.push({ tipo: x.tipo, id: x.id, nombre: x.nombre, unidad: x.unidad, cantidad: 0, precio: Math.round(precio * 100) / 100 });
          inp.value = ''; res.hidden = true; pintar();
          var q = $('[data-n="' + (C.items.length - 1) + '"][data-k="cantidad"]', r); if (q) q.focus();
        });
        r.addEventListener('click', function (e) {
          if (!e.target.closest('.dropdown')) res.hidden = true;
          var qb = e.target.closest('[data-quitar]');
          if (qb) { C.items.splice(Number(qb.getAttribute('data-quitar')), 1); pintar(); }
        });
        $('#cm-items', r).addEventListener('input', function (e) { var n = e.target.getAttribute('data-n'); if (n !== null) { C.items[n][e.target.getAttribute('data-k')] = num(e.target.value); pintarTotal(); } });
        $$('[data-mon]', r).forEach(function (b) { b.onclick = function () { C.moneda = b.getAttribute('data-mon'); $$('[data-mon]', r).forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); }); pintar(); }; });
        $('#cm-pagada', r).onchange = function () { $('#cm-medio-box', r).hidden = !this.checked; };
        $('#cm-nprov', r).onclick = function () { ACT.editarProveedor(null, null, function (nid) { var s = $('#cm-prov', r); s.insertAdjacentHTML('beforeend', '<option value="' + nid + '">' + esc((D.proveedores.filter(function (p) { return p.id === nid; })[0] || {}).nombre) + '</option>'); s.value = nid; }); };
        $('[data-cerrar2]', r).onclick = function () { cerrarModal(m); };
        $('#cm-ok', r).onclick = function () {
          accion(this, 'registrarCompra', {
            proveedorId: $('#cm-prov', r).value, fecha: $('#cm-fecha', r).value, factura: $('#cm-fac', r).value, moneda: C.moneda,
            items: C.items, actualizarCostos: $('#cm-act', r).checked, pagadaAhora: $('#cm-pagada', r).checked, medio: $('#cm-medio', r).value, notas: $('#cm-notas', r).value
          }).then(function () { cerrarModal(m); S.compras.tab = 'compras'; render(); }, function () {});
        };
        pintar();
      }
    });
  };

  /* ============================================================
   * 20. REPORTES (ventas, productos, clientes y actividad)
   * ============================================================ */
  S.rep = { periodo: 'mes', tab: 'productos', datos: null, clave: '', actividad: null, filtroAct: { usuarioId: '', texto: '' } };
  function rangoPeriodo(p) {
    var h = D.hoy, y = Number(h.slice(0, 4)), mo = Number(h.slice(5, 7));
    var f = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    if (p === 'mes') return [h.slice(0, 8) + '01', h];
    if (p === 'pasado') return [f(new Date(y, mo - 2, 1)), f(new Date(y, mo - 1, 0))];
    if (p === 'tres') return [f(new Date(y, mo - 3, 1)), h];
    if (p === 'anio') return [y + '-01-01', h];
    return ['2000-01-01', h];
  }
  function cargarReporte() {
    var rg = rangoPeriodo(S.rep.periodo), clave = rg.join('|') + '|' + D.version;
    if (S.rep.clave === clave || S.rep.cargando) return;
    S.rep.cargando = true;
    llamar('reporte', { desde: rg[0], hasta: rg[1] }).then(function (res) {
      S.rep.cargando = false; S.rep.datos = res.reporte; S.rep.clave = clave;
      if (S.vista === 'reportes') render();
    }, function (e) { S.rep.cargando = false; toast(e.message, true); });
  }
  function cargarActividad() {
    if (S.rep.cargandoAct) return;
    S.rep.cargandoAct = true;
    llamar('actividad', S.rep.filtroAct).then(function (res) { S.rep.cargandoAct = false; S.rep.actividad = res.actividad; if (S.vista === 'reportes') render(); },
      function (e) { S.rep.cargandoAct = false; toast(e.message, true); });
  }
  function plataCorta(n) {
    n = num(n);
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toLocaleString('es-AR', { maximumFractionDigits: 1 }) + ' M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + ' mil';
    return '$' + Math.round(n);
  }
  var MES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  /** Barras agrupadas: vendido y ganancia por mes (una sola escala en pesos). */
  function graficoMeses(meses) {
    var W = 760, H = 260, izq = 64, der = 12, arriba = 16, abajo = 30;
    var max = Math.max.apply(null, meses.map(function (m) { return Math.max(m.vendido, m.ganancia); }).concat([1]));
    var paso = Math.pow(10, Math.floor(Math.log10(max))), tope = Math.ceil(max / paso) * paso;
    if (tope / paso < 4) { paso = paso / 2; tope = Math.ceil(max / paso) * paso; }
    var y = function (v) { return arriba + (H - arriba - abajo) * (1 - v / tope); };
    var ancho = (W - izq - der) / meses.length, bw = Math.max(6, Math.min(22, ancho / 2 - 5));
    var svg = '<svg class="graf" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Vendido y ganancia de los últimos 12 meses">';
    for (var v = 0; v <= tope + 0.0001; v += paso) {
      svg += '<line class="g-grid" x1="' + izq + '" x2="' + (W - der) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text class="g-eje" x="' + (izq - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + plataCorta(v) + '</text>';
    }
    meses.forEach(function (m, i) {
      var cx = izq + ancho * i + ancho / 2, mm = Number(m.mes.slice(5, 7)) - 1;
      var barra = function (val, x, cls) {
        var h = Math.max(0, y(0) - y(Math.max(0, val)));
        if (!h) return '';
        var r = Math.min(4, bw / 2, h);
        return '<path class="' + cls + '" d="M' + x + ',' + y(0) + 'V' + (y(0) - h + r) + 'Q' + x + ',' + (y(0) - h) + ' ' + (x + r) + ',' + (y(0) - h) + 'H' + (x + bw - r) + 'Q' + (x + bw) + ',' + (y(0) - h) + ' ' + (x + bw) + ',' + (y(0) - h + r) + 'V' + y(0) + 'Z"/>';
      };
      svg += '<g class="g-mes" tabindex="0" data-tip="' + esc(MES_CORTO[mm] + ' ' + m.mes.slice(0, 4) + '|' + pesos(m.vendido) + '|' + pesos(m.ganancia) + '|' + m.pedidos + '|' + pesos(m.cobrado)) + '">' +
        '<rect class="g-hit" x="' + (izq + ancho * i) + '" y="' + arriba + '" width="' + ancho + '" height="' + (H - arriba - abajo) + '"/>' +
        barra(m.vendido, cx - bw - 1, 'g-s1') + barra(m.ganancia, cx + 1, 'g-s2') +
        '<text class="g-eje" x="' + cx + '" y="' + (H - 10) + '" text-anchor="middle">' + MES_CORTO[mm] + '</text></g>';
    });
    svg += '<line class="g-base" x1="' + izq + '" x2="' + (W - der) + '" y1="' + y(0) + '" y2="' + y(0) + '"/></svg>';
    return '<div class="graf-wrap">' + svg + '<div class="graf-tip" hidden></div></div>';
  }
  RENDER.reportes = function () {
    cargarReporte();
    var R = S.rep.datos;
    var periodos = [['mes', 'Este mes'], ['pasado', 'Mes pasado'], ['tres', 'Últimos 3 meses'], ['anio', 'Este año'], ['todo', 'Todo']];
    var html = '<div class="fila"><div class="seg seg-scroll" role="group" aria-label="Período">' + periodos.map(function (p) {
      return '<button type="button" data-act="repPeriodo" data-id="' + p[0] + '" aria-pressed="' + (S.rep.periodo === p[0]) + '">' + p[1] + '</button>';
    }).join('') + '</div>' + (S.rep.cargando ? '<span class="muted">Calculando…</span>' : '') + '</div>';
    if (!R) return html + '<div class="card vacio">Calculando el reporte…</div>';
    var t = R.totales;
    html += '<div class="kpis">' +
      '<div class="kpi"><small>Vendido</small><b>' + pesos(Math.round(t.vendido)) + '</b><em>' + (dolar() ? usd(t.vendido) + ' · ' : '') + 'sin envíos</em></div>' +
      '<div class="kpi"><small>Ganancia</small><b>' + pesos(Math.round(t.ganancia)) + '</b><em>' + (t.costo ? Math.round(t.ganancia / t.costo * 100) + ' % sobre el costo' : '—') + '</em></div>' +
      '<div class="kpi"><small>Pedidos</small><b>' + t.pedidos + '</b><em>Ticket promedio ' + pesos(Math.round(R.ticket)) + ' · ' + R.clientesActivos + ' clientes</em></div>' +
      '<div class="kpi"><small>Cobrado</small><b>' + pesos(Math.round(t.cobrado)) + '</b><em>Compras ' + pesos(Math.round(R.compras)) + '</em></div></div>';
    html += '<section class="card"><div class="fila" style="margin-bottom:6px"><h2 style="margin:0">Últimos 12 meses</h2><span class="leyenda" style="margin-left:auto"><i class="g-s1"></i>Vendido <i class="g-s2"></i>Ganancia</span></div>' +
      graficoMeses(R.meses) +
      '<details style="margin-top:8px"><summary class="muted" style="cursor:pointer;font-size:.85rem">Ver como tabla</summary><div class="tabla-wrap" style="margin-top:8px"><table class="t"><thead><tr><th>Mes</th><th class="der">Vendido</th><th class="der">Ganancia</th><th class="der">Pedidos</th><th class="der">Cobrado</th></tr></thead><tbody>' +
      R.meses.slice().reverse().map(function (m) { return '<tr><td>' + MES_CORTO[Number(m.mes.slice(5, 7)) - 1] + ' ' + m.mes.slice(0, 4) + '</td><td class="der num">' + pesos(Math.round(m.vendido)) + '</td><td class="der num">' + pesos(Math.round(m.ganancia)) + '</td><td class="der num">' + m.pedidos + '</td><td class="der num">' + pesos(Math.round(m.cobrado)) + '</td></tr>'; }).join('') +
      '</tbody></table></div></details></section>';
    var tabs = [['productos', 'Productos'], ['clientes', 'Clientes']].concat(esAdmin() ? [['actividad', 'Actividad del equipo']] : []);
    html += '<div class="seg" role="tablist">' + tabs.map(function (x) { return '<button type="button" data-act="repTab" data-id="' + x[0] + '" aria-pressed="' + (S.rep.tab === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>';
    if (S.rep.tab === 'actividad' && esAdmin()) return html + vistaActividad();
    if (S.rep.tab === 'clientes') {
      var maxC = Math.max.apply(null, R.clientes.map(function (c) { return c.facturado; }).concat([1]));
      return html + (R.clientes.length ? '<div class="tabla-wrap"><table class="t"><thead><tr><th>Cliente</th><th class="der">Pedidos</th><th class="der">Comprado</th><th class="der">Ganancia</th><th class="der">Debe</th></tr></thead><tbody>' + R.clientes.map(function (c) {
        return '<tr class="clic" data-act="verCliente" data-id="' + c.clienteId + '"><td><b style="font-weight:500">' + esc(c.nombre) + '</b><div class="barra-pct"><i style="width:' + (c.facturado / maxC * 100).toFixed(1) + '%"></i></div></td><td class="der num">' + c.pedidos + '</td><td class="der num">' + pesos(Math.round(c.facturado)) + '</td><td class="der num">' + pesos(Math.round(c.ganancia)) + '</td><td class="der num' + (c.deuda ? ' bajo' : '') + '">' + (c.deuda ? pesos(c.deuda) : '—') + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="card vacio">Sin ventas en este período.</div>');
    }
    var maxP = Math.max.apply(null, R.productos.map(function (p) { return p.facturado; }).concat([1]));
    return html + (R.productos.length ? '<div class="tabla-wrap"><table class="t"><thead><tr><th>Producto</th><th class="der">Unidades</th><th class="der">Facturado</th><th class="der">Ganancia</th><th class="der">% s/costo</th></tr></thead><tbody>' + R.productos.map(function (p) {
      var pct = p.costo ? Math.round(p.ganancia / p.costo * 100) : 0;
      return '<tr><td><b style="font-weight:500">' + esc(p.nombre) + '</b> <span class="muted">' + esc(p.presentacion) + '</span><div class="barra-pct"><i style="width:' + (p.facturado / maxP * 100).toFixed(1) + '%"></i></div></td>' +
        '<td class="der num">' + cant(p.unidades) + '</td><td class="der num">' + pesos(Math.round(p.facturado)) + '</td><td class="der num">' + pesos(Math.round(p.ganancia)) + '</td><td class="der num' + (p.costo && pct < 20 ? ' bajo' : '') + '">' + (p.costo ? pct + ' %' : '—') + '</td></tr>';
    }).join('') + '</tbody></table></div>' : '<div class="card vacio">Sin ventas en este período.</div>');
  };
  ALABRIR.reportes = function (r) {
    var wrap = $('.graf-wrap', r);
    if (wrap) {
      var tip = $('.graf-tip', wrap);
      var mostrar = function (g) {
        var d = g.getAttribute('data-tip').split('|');
        tip.innerHTML = '<b>' + esc(d[0]) + '</b><span><i class="g-s1"></i>Vendido ' + esc(d[1]) + '</span><span><i class="g-s2"></i>Ganancia ' + esc(d[2]) + '</span><span class="muted">' + esc(d[3]) + ' pedidos · cobrado ' + esc(d[4]) + '</span>';
        tip.hidden = false;
        var bw = wrap.getBoundingClientRect(), bg = g.getBoundingClientRect();
        var x = bg.left - bw.left + bg.width / 2;
        tip.style.left = Math.min(Math.max(8, x - tip.offsetWidth / 2), bw.width - tip.offsetWidth - 8) + 'px';
        $$('.g-mes', wrap).forEach(function (o) { o.classList.toggle('activo', o === g); });
      };
      $$('.g-mes', wrap).forEach(function (g) {
        g.addEventListener('mouseenter', function () { mostrar(g); });
        g.addEventListener('focus', function () { mostrar(g); });
        g.addEventListener('click', function () { mostrar(g); });
      });
      wrap.addEventListener('mouseleave', function () { tip.hidden = true; $$('.g-mes', wrap).forEach(function (o) { o.classList.remove('activo'); }); });
    }
    var fu = $('#act-usr', r), ft = $('#act-txt', r);
    if (fu) fu.onchange = function () { S.rep.filtroAct.usuarioId = fu.value; cargarActividad(); };
    if (ft) ft.addEventListener('change', function () { S.rep.filtroAct.texto = ft.value; cargarActividad(); });
  };
  ACT.repPeriodo = function (p) { S.rep.periodo = p; S.rep.clave = ''; render(); };
  ACT.repTab = function (t) { S.rep.tab = t; if (t === 'actividad') cargarActividad(); render(); };
  var ICONO_ACT = { login: 'salir', loginFallido: 'x', guardarPedido: 'pedidos', cambiarEstado: 'camion', registrarPago: 'pesos', borrarPago: 'basura', guardarProducto: 'productos', borrarProductos: 'basura',
    ajustarPrecios: 'productos', guardarUsuario: 'clientes', tiendaPedido: 'carrito', pagoMP: 'pesos', arrepentimiento: 'x', envasar: 'matraz', editarCampoProducto: 'editar', registrarProduccion: 'matraz', rendirCaja: 'caja', confirmarRendicion: 'caja', registrarCompra: 'carrito', pagarProveedor: 'pesos' };
  function vistaActividad() {
    var lista = S.rep.actividad;
    if (!lista) { cargarActividad(); return '<div class="card vacio">Cargando la actividad…</div>'; }
    var html = '<div class="fila"><select class="in" id="act-usr" style="width:auto"><option value="">Todo el equipo</option>' + D.usuarios.map(function (u) { return '<option value="' + u.id + '"' + (S.rep.filtroAct.usuarioId === u.id ? ' selected' : '') + '>' + esc(u.nombre) + '</option>'; }).join('') + '</select>' +
      '<label class="buscar">' + ic('buscar') + '<input class="in" id="act-txt" type="search" placeholder="Buscar: precio, borró, pedido #0012…" value="' + esc(S.rep.filtroAct.texto) + '"></label></div>';
    if (!lista.length) return html + '<div class="card vacio">No hay movimientos con ese filtro.</div>';
    var dia = '';
    html += '<div class="card actividad">' + lista.map(function (a) {
      var d = String(a.fecha).slice(0, 10), cab = '';
      if (d !== dia) { dia = d; cab = '<div class="act-dia">' + (d === D.hoy ? 'Hoy' : fechaCorta(d)) + '</div>'; }
      var alerta = /Fallido|borrar|anular|Elimin|Anuló/i.test(a.accion + ' ' + a.detalle);
      return cab + '<div class="act-item' + (alerta ? ' alerta' : '') + '"><span class="act-ic">' + ic(ICONO_ACT[a.accion] || 'editar') + '</span><div><b>' + esc(a.usuarioNombre) + '</b> ' + esc(a.detalle) + '</div>' +
        '<span class="muted num">' + new Date(a.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + '</span></div>';
    }).join('') + '</div>';
    return html;
  }

  /* ============================================================
   * 21. LISTA DE PRECIOS PARA CLIENTES (PDF / WhatsApp)
   * ============================================================ */
  ACT.listaPrecios = function () {
    var cats = {};
    D.productos.forEach(function (p) { if (p.activo === 'si') cats[p.categoria] = 1; });
    var op = { lista: 'mayorista', cats: Object.keys(cats).sort(), usd: false, stock: false };
    var elegidos = function () {
      return D.productos.filter(function (p) { return p.activo === 'si' && op.cats.indexOf(p.categoria) >= 0 && (!op.stock || num(p.stock) > 0); })
        .sort(function (a, b) { return (a.categoria + a.nombre + a.presentacion).localeCompare(b.categoria + b.nombre + b.presentacion); });
    };
    var titulo = function () { return 'Lista de precios ' + (op.lista === 'ambas' ? '' : op.lista) + ' · ' + fechaCorta(D.hoy); };
    var doc = function () {
      var porCat = {};
      elegidos().forEach(function (p) { (porCat[p.categoria] = porCat[p.categoria] || []).push(p); });
      var cfg = D.config;
      return '<div class="doc lista-doc"><div class="enc"><div class="enc-marca"><img class="doc-logo" src="' + LOGO_URL + '" alt=""><div><h1>' + esc(cfg.empresa || 'Akuma Clean') + '</h1>' + esc(cfg.telefono ? 'Tel. ' + cfg.telefono : '') + (cfg.direccion ? ' · ' + esc(cfg.direccion) : '') + '</div></div>' +
        '<div style="text-align:right"><b style="font-size:15px">LISTA DE PRECIOS</b><br>' + (op.lista === 'ambas' ? 'Mayorista y minorista' : op.lista === 'mayorista' ? 'Mayorista' : 'Minorista') + '<br>Vigente al ' + fechaCorta(D.hoy) + '</div></div>' +
        Object.keys(porCat).map(function (c) {
          return '<h3 class="lista-cat">' + esc(c) + '</h3><table><thead><tr><th>Producto</th><th>Presentación</th>' +
            (op.lista !== 'minorista' ? '<th class="der">Mayorista</th>' : '') + (op.lista !== 'mayorista' ? '<th class="der">Minorista</th>' : '') + (op.usd && dolar() ? '<th class="der">US$</th>' : '') + '</tr></thead><tbody>' +
            porCat[c].map(function (p) {
              var ref = op.lista === 'minorista' ? p.precioMinorista : p.precioMayorista;
              return '<tr><td>' + esc(p.nombre) + (num(p.minMayorista) && op.lista !== 'mayorista' ? ' <small>(mayorista desde ' + cant(p.minMayorista) + ' u.)</small>' : '') + '</td><td>' + esc(p.presentacion) + '</td>' +
                (op.lista !== 'minorista' ? '<td class="der">' + pesos(p.precioMayorista) + '</td>' : '') + (op.lista !== 'mayorista' ? '<td class="der">' + pesos(p.precioMinorista) + '</td>' : '') +
                (op.usd && dolar() ? '<td class="der">' + usd(ref) + '</td>' : '') + '</tr>';
            }).join('') + '</tbody></table>';
        }).join('') +
        '<p class="pie">Precios sujetos a cambio sin previo aviso.' + (cfg.alias ? ' Alias para transferir: ' + esc(cfg.alias) + '.' : '') + (op.usd && dolar() ? ' Dólar oficial de referencia ' + pesos(dolar()) + '.' : '') + '</p></div>';
    };
    var texto = function () {
      var porCat = {}, l = ['*' + (D.config.empresa || 'Akuma Clean') + '*', '_' + titulo() + '_', ''];
      elegidos().forEach(function (p) { (porCat[p.categoria] = porCat[p.categoria] || []).push(p); });
      Object.keys(porCat).forEach(function (c) {
        l.push('*' + c.toUpperCase() + '*');
        porCat[c].forEach(function (p) {
          var precios = op.lista === 'ambas' ? 'May. ' + pesos(p.precioMayorista) + ' / Min. ' + pesos(p.precioMinorista) : pesos(op.lista === 'mayorista' ? p.precioMayorista : p.precioMinorista);
          l.push('• ' + p.nombre + (p.presentacion ? ' ' + p.presentacion : '') + ': ' + precios + (num(p.minMayorista) && op.lista === 'minorista' ? ' (may. desde ' + cant(p.minMayorista) + ' u.)' : ''));
        });
        l.push('');
      });
      l.push('Precios sujetos a cambio sin previo aviso.');
      if (D.config.telefono) l.push('Pedidos: ' + D.config.telefono);
      return l.join('\n');
    };
    abrirModal({
      tam: 'lg', titulo: 'Lista de precios para clientes', sinFoco: true, refrescable: false,
      cuerpo: function () {
        return '<div class="fila"><div class="seg"><button type="button" data-lp="mayorista" aria-pressed="' + (op.lista === 'mayorista') + '">Mayorista</button><button type="button" data-lp="minorista" aria-pressed="' + (op.lista === 'minorista') + '">Minorista</button><button type="button" data-lp="ambas" aria-pressed="' + (op.lista === 'ambas') + '">Las dos</button></div>' +
          '<label class="check"><input type="checkbox" id="lp-usd"' + (op.usd ? ' checked' : '') + (dolar() ? '' : ' disabled') + '> Mostrar en dólares</label><label class="check"><input type="checkbox" id="lp-stock"' + (op.stock ? ' checked' : '') + '> Solo con stock</label></div>' +
          '<div class="fila">' + Object.keys(cats).sort().map(function (c) { return '<label class="check chip-check"><input type="checkbox" data-cat="' + esc(c) + '"' + (op.cats.indexOf(c) >= 0 ? ' checked' : '') + '> ' + esc(c) + '</label>'; }).join('') + '</div>' +
          '<p class="muted" style="margin:0;font-size:.84rem">' + elegidos().length + ' productos en la lista.</p>' +
          '<div class="vista-previa">' + doc() + '</div>';
      },
      pie: function () {
        return '<button class="btn" type="button" data-lpc>' + ic('copiar') + 'Copiar texto</button><a class="btn wa" target="_blank" rel="noopener" href="' + esc('https://wa.me/?text=' + encodeURIComponent(texto())) + '">' + ic('wa') + 'Enviar por WhatsApp</a>' +
          '<button class="btn pri" type="button" data-lpi>' + ic('imprimir') + 'Imprimir / PDF</button>';
      },
      alAbrir: function (r, m) {
        $$('[data-lp]', r).forEach(function (b) { b.onclick = function () { op.lista = b.getAttribute('data-lp'); pintarModal(m); }; });
        $('#lp-usd', r).onchange = function () { op.usd = this.checked; pintarModal(m); };
        $('#lp-stock', r).onchange = function () { op.stock = this.checked; pintarModal(m); };
        $$('[data-cat]', r).forEach(function (c) { c.onchange = function () { var k = c.getAttribute('data-cat'); op.cats = op.cats.filter(function (x) { return x !== k; }); if (c.checked) op.cats.push(k); pintarModal(m); }; });
        $('[data-lpc]', r).onclick = function () { copiarTexto(texto()); };
        $('[data-lpi]', r).onclick = function () { imprimir(doc(), 'a4'); };
      }
    });
  };

  /* ============================================================
   * 22. CELULAR: barra con 4 accesos + "Más", botón "+" y tablas como tarjetas
   * ============================================================ */
  var PRIORIDAD_MOVIL = {
    admin: ['inicio', 'pedidos', 'cobranzas', 'produccion'],
    ventas: ['inicio', 'pedidos', 'clientes', 'cobranzas'],
    deposito: ['pedidos', 'produccion', 'productos', 'etiquetas'],
    reparto: ['pedidos', 'cobranzas', 'caja', 'clientes']
  };
  function vistasMovil() {
    var perm = vistasPermitidas(), prio = (PRIORIDAD_MOVIL[rol()] || []).filter(function (v) { return perm.indexOf(v) >= 0; });
    perm.forEach(function (v) { if (prio.length < 4 && prio.indexOf(v) < 0 && v !== 'ajustes') prio.push(v); });
    return prio.slice(0, 4);
  }
  ACT.menuMas = function () {
    var principales = vistasMovil(), extras = vistasPermitidas().filter(function (v) { return principales.indexOf(v) < 0; });
    abrirModal({
      titulo: 'Más secciones', sinFoco: true,
      cuerpo: function () {
        return '<div class="menu-mas">' + extras.map(function (v) {
          return '<button type="button" class="menu-item" data-ir="' + v + '"' + (S.vista === v ? ' aria-current="page"' : '') + '>' + ic(VISTAS[v].ic) + '<span>' + VISTAS[v].t + '</span></button>';
        }).join('') + '</div><div class="fila" style="border-top:1px solid var(--border);padding-top:12px"><span><b>' + esc(D.yo.nombre) + '</b> <span class="muted">· ' + ROL[rol()] + '</span></span>' +
          '<button class="btn peligro chico" type="button" data-salir style="margin-left:auto">' + ic('salir') + 'Cerrar sesión</button></div>';
      },
      alAbrir: function (r, m) {
        $$('[data-ir]', r).forEach(function (b) { b.onclick = function () { cerrarModal(m); S.vista = b.getAttribute('data-ir'); render(); window.scrollTo(0, 0); }; });
      }
    });
  };
  /** En el celular las tablas se muestran como tarjetas: cada celda lleva el título de su columna. */
  function tarjetizar(raiz) {
    $$('table.t', raiz).forEach(function (t) {
      if (t.closest('.modal') || t.classList.contains('items')) return;
      var tit = $$('thead th', t).map(function (th) { return th.textContent.trim(); });
      // la columna que hace de título de la tarjeta (nombre del producto, cliente, insumo…)
      var principal = ['Producto', 'Cliente', 'Insumo', 'Proveedor', 'Quién', 'Fórmula'];
      var iTit = -1;
      principal.some(function (n) { iTit = tit.indexOf(n); return iTit >= 0; });
      if (iTit < 0) iTit = tit.findIndex(function (x) { return x; });
      t.classList.add('resp');
      $$('tbody tr', t).forEach(function (tr) {
        Array.prototype.forEach.call(tr.children, function (td, i) {
          if (td.hasAttribute('colspan')) return;
          td.setAttribute('data-label', tit[i] || '');
          if (i === iTit) td.classList.add('td-titulo');
          if (td.children.length === 1 && td.firstElementChild.matches('input[type="checkbox"]') && !td.textContent.trim()) td.classList.add('td-check');
        });
      });
    });
  }

  /* ============================================================
   * 17. ARRANQUE
   * ============================================================ */
  function iniciar() {
    if (!S.token) { pantallaLogin(); return; }
    document.getElementById('raiz').innerHTML = '<div class="login"><p style="color:#c7d2fe">Cargando Akuma Clean…</p></div>' + baseFlotante();
    llamar('sync').then(armarApp, function (e) {
      if (S.token) {
        // sin conexión pero con sesión: reintentar
        document.getElementById('raiz').innerHTML = '<div class="login"><div class="login-card"><b>No se pudo conectar</b><p class="muted" style="margin:0">' + esc(e.message) +
          '</p><button class="btn pri" type="button" onclick="location.reload()">Reintentar</button></div></div>' + baseFlotante();
      }
    });
  }
  iniciar();
})();
// FIN DE app.js · Akuma Clean by AkumaNet · Autor: Juan Carlos Ojeda · Tel. 11 6033-1552
