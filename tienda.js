/* ============================================================
 * Akuma Clean · tienda.js (tienda online para clientes)
 * Catálogo con precio minorista, carrito, compra con retiro o envío,
 * pago con Mercado Pago / transferencia / efectivo, seguimiento del
 * pedido y botón de arrepentimiento. Los pedidos entran al panel.
 * Desarrollado por AkumaNet · Autor: Juan Carlos Ojeda · Tel. 11 6033-1552
 * ============================================================ */
/* Si la tienda se publica aparte (GitHub Pages / dominio propio), la URL /exec va en config.js. */
var API_URL = (typeof AKUMA_API_URL !== 'undefined' && AKUMA_API_URL) || '';
var LOGO_URL = 'logo.png';
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var MODO = window.google && google.script && google.script.run ? 'gas' : API_URL ? 'url' : 'demo';

  /* ---------- Utilidades ---------- */
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  function pesos(n) { return '$ ' + Math.round(num(n)).toLocaleString('es-AR'); }
  function normal(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function guardar(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* modo privado */ } }
  function nro(n) { return '#' + String(n || 0).padStart(4, '0'); }
  function fecha(iso) { try { return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  function linkWa(tel, texto) {
    var d = String(tel || '').replace(/\D/g, '').replace(/^0/, '');
    if (d && d.indexOf('54') !== 0) d = '549' + d.replace(/^(11)15/, '$1');
    return 'https://wa.me/' + d + '?text=' + encodeURIComponent(texto || '');
  }
  function toast(msg, error) {
    var t = document.createElement('div');
    t.className = 'toast' + (error ? ' error' : '');
    t.setAttribute('role', 'status');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, error ? 5200 : 2600);
  }
  var IC = {
    carrito: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2.5 3.5h2.6l2.3 11.2a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.6-1.2l1.6-6.8H6.1"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4 5.2 5.2 0 0 0 3.2.7 2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z"/></svg>',
    buscar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    atras: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    camion: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6h11v10H2zM13 9h4.5l3.5 3.6V16h-8"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>',
    local: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10 5 4h14l2 6M4 10v10h16V10M3 10h18M9 20v-5h6v5"/></svg>',
    gota: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11Z"/></svg>',
    escudo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6Z"/><path d="m8.5 12 2.4 2.4 4.6-4.8" stroke-linecap="round"/></svg>',
    ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>'
  };

  /* ---------- Servidor ---------- */
  function llamar(accion, datos) {
    var req = { accion: accion, datos: datos || {} };
    var p;
    if (MODO === 'gas') {
      p = new Promise(function (ok, mal) { google.script.run.withSuccessHandler(ok).withFailureHandler(mal).tienda(req); });
    } else if (MODO === 'url') {
      p = fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(req) })
        .then(function (r) { if (!r.ok) throw new Error('Sin conexión con la tienda.'); return r.json(); });
    } else {
      p = new Promise(function (ok) { setTimeout(function () { ok(window.QGDemo.atender(req)); }, 160); });
    }
    return p.then(function (r) {
      if (!r || !r.ok) { var e = new Error((r && r.error) || 'No se pudo completar.'); e.codigo = r && r.codigo; throw e; }
      return r;
    }, function (e) { var x = new Error(e && e.message ? e.message : 'Sin conexión. Probá de nuevo.'); throw x; });
  }

  /* ---------- Estado ---------- */
  var E = {
    tienda: null, productos: [], idx: {}, q: '', cat: '', panel: null, paso: 'carrito', vista: 'catalogo', ocupado: false,
    carrito: (function () { try { return JSON.parse(leer('ac_tienda_carrito') || '{}') || {}; } catch (e) { return {}; } })(),
    datos: (function () { try { return JSON.parse(leer('ac_tienda_datos') || '{}') || {}; } catch (e) { return {}; } })(),
    entrega: '', pago: '', seg: null, codigo: ''
  };
  function guardarCarrito() { guardar('ac_tienda_carrito', JSON.stringify(E.carrito)); }
  function itemsCarrito() {
    return Object.keys(E.carrito).map(function (id) { return { p: E.idx[id], cant: E.carrito[id] }; })
      .filter(function (x) { return x.p && x.cant > 0; });
  }
  function subtotal() { return itemsCarrito().reduce(function (s, x) { return s + x.p.precio * x.cant; }, 0); }
  function unidades() { return itemsCarrito().reduce(function (s, x) { return s + x.cant; }, 0); }
  function hayGranel() { return itemsCarrito().some(function (x) { return x.p.granel; }); }

  /* ---------- Dibujo del envase (no hay fotos: se dibuja según la presentación) ---------- */
  var COLORES = ['#1e63d6', '#0d9488', '#7c4dcc', '#d97706', '#d63384', '#0f9d58', '#0e9fb4', '#c2410c', '#4f46e5'];
  function colorCat(c) { var h = 0; String(c || '').split('').forEach(function (ch) { h = (h * 31 + ch.charCodeAt(0)) >>> 0; }); return COLORES[h % COLORES.length]; }
  function dibujo(p) {
    var c = colorCat(p.categoria), t = normal(p.nombre + ' ' + p.presentacion + ' ' + p.categoria);
    var tapa = '#1f2937', vidrio = '#ffffff', borde = 'rgba(15,23,42,.28)';
    if (p.granel) {
      return '<svg viewBox="0 0 60 80" aria-hidden="true"><rect x="10" y="10" width="40" height="56" rx="6" fill="' + vidrio + '" stroke="' + borde + '" stroke-width="1.5"/><rect x="11" y="30" width="38" height="35" rx="5" fill="' + c + '" opacity=".85"/>' +
        '<rect x="22" y="4" width="16" height="7" rx="2" fill="' + tapa + '"/><path d="M50 50h5v6h-3" fill="none" stroke="' + tapa + '" stroke-width="2.5"/><path d="M53 60c0 0-2 3-2 4.5a2 2 0 0 0 4 0c0-1.5-2-4.5-2-4.5Z" fill="' + c + '"/><rect x="16" y="68" width="28" height="6" rx="2" fill="' + borde + '"/></svg>';
    }
    if (/perfum|aromatiz|fragancia/.test(t)) {
      return '<svg viewBox="0 0 60 80" aria-hidden="true"><path d="M22 8h12v8h-4l-2 6h-6z" fill="' + tapa + '"/><path d="M34 10h8l3 3" fill="none" stroke="' + tapa + '" stroke-width="2.5" stroke-linecap="round"/><rect x="16" y="22" width="24" height="52" rx="8" fill="' + vidrio + '" stroke="' + borde + '" stroke-width="1.5"/>' +
        '<rect x="17" y="36" width="22" height="37" rx="7" fill="' + c + '" opacity=".75"/><rect x="19" y="42" width="18" height="16" rx="3" fill="#fff"/><path d="M46 6l2 2M48 12h3M46 17l2-2" stroke="' + c + '" stroke-width="2" stroke-linecap="round"/></svg>';
    }
    if (/kg|balde|granulad|polvo/.test(t)) {
      return '<svg viewBox="0 0 60 80" aria-hidden="true"><path d="M10 26h40l-4 48H14z" fill="' + c + '"/><rect x="8" y="20" width="44" height="8" rx="3" fill="' + tapa + '"/><path d="M14 22c0-14 32-14 32 0" fill="none" stroke="' + tapa + '" stroke-width="2.5"/><rect x="17" y="38" width="26" height="18" rx="3" fill="#fff"/></svg>';
    }
    var litros = (function () { var m = t.match(/(\d+(?:[.,]\d+)?)\s*(l|lt|litros?)\b/); return m ? Number(m[1].replace(',', '.')) : /(\d+)\s*(ml|cc)/.test(t) ? 0.5 : 1; })();
    if (litros >= 4) {
      return '<svg viewBox="0 0 60 80" aria-hidden="true"><path d="M12 22h28l8 10v38a6 6 0 0 1-6 6H12a6 6 0 0 1-6-6V28a6 6 0 0 1 6-6Z" fill="' + vidrio + '" stroke="' + borde + '" stroke-width="1.5"/>' +
        '<path d="M7 40h40v30a5 5 0 0 1-5 5H12a5 5 0 0 1-5-5Z" fill="' + c + '" opacity=".85"/><path d="M36 22v-6a4 4 0 0 1 4-4h4" fill="none" stroke="' + borde + '" stroke-width="5" stroke-linecap="round"/>' +
        '<rect x="14" y="12" width="12" height="10" rx="2" fill="' + tapa + '"/><rect x="12" y="46" width="30" height="18" rx="3" fill="#fff"/><rect x="12" y="46" width="30" height="5" rx="2" fill="' + c + '"/></svg>';
    }
    return '<svg viewBox="0 0 60 80" aria-hidden="true"><rect x="24" y="4" width="12" height="9" rx="2" fill="' + tapa + '"/><path d="M25 13h10v6l7 8v42a6 6 0 0 1-6 6H24a6 6 0 0 1-6-6V27l7-8Z" fill="' + vidrio + '" stroke="' + borde + '" stroke-width="1.5"/>' +
      '<path d="M19 38h22v31a5 5 0 0 1-5 5H24a5 5 0 0 1-5-5Z" fill="' + c + '" opacity=".85"/><rect x="21" y="44" width="18" height="16" rx="3" fill="#fff"/><rect x="21" y="44" width="18" height="4" rx="2" fill="' + c + '"/></svg>';
  }

  /* ---------- Pantalla principal ---------- */
  function encabezado() {
    var t = E.tienda || {}, n = unidades();
    return '<header class="top"><div class="cont"><a class="marca" href="#" data-ir="catalogo"><img src="' + LOGO_URL + '" alt=""><span><b>' + esc(t.empresa || 'Akuma Clean') + '</b><small>Productos de limpieza · Tienda online</small></span></a>' +
      '<div class="top-acc">' + (t.whatsapp ? '<a class="btn wa" target="_blank" rel="noopener" href="' + esc(linkWa(t.whatsapp, 'Hola! Tengo una consulta sobre la tienda online.')) + '">' + IC.wa + '<span class="txt-wa">Consultas</span></a>' : '') +
      '<button class="btn pri btn-carrito" type="button" data-abrir="carrito" aria-label="Ver carrito (' + n + ' productos)">' + IC.carrito + '<span>Carrito</span>' + (n ? '<span class="cuenta num">' + n + '</span>' : '') + '</button></div></div></header>';
  }
  function pie() {
    var t = E.tienda || {};
    return '<footer class="pie"><div class="cont"><div><b>' + esc(t.empresa || 'Akuma Clean') + '</b><p>Productos de limpieza de fabricación propia.</p>' + (t.telefono ? '<p>Tel. ' + esc(t.telefono) + '</p>' : '') + '</div>' +
      '<div><b>Retiro en el local</b>' + (t.direccion ? '<p>' + esc(t.direccion) + '</p>' : '') + (t.horario ? '<p>' + esc(t.horario) + '</p>' : '') + '</div>' +
      '<div><b>Envíos</b><p>CABA: gratis desde ' + pesos(t.gratisCaba) + '.</p><p>Fuera de CABA: compra mínima ' + pesos(t.minimoInterior) + ', flete a coordinar.</p><p>Granel: solo retiro, con tu envase.</p></div>' +
      '<div><b>Tus derechos</b><p>Podés arrepentirte de la compra dentro de los 10 días.</p><button class="btn-arrep" type="button" data-abrir="arrepentimiento">Botón de arrepentimiento</button></div>' +
      '<div class="firma">© ' + new Date().getFullYear() + ' ' + esc(t.empresa || 'Akuma Clean') + ' · Desarrollado por AkumaNet · Juan Carlos Ojeda · Tel. 11 6033-1552</div></div></footer>';
  }
  function categorias() {
    var c = {};
    E.productos.forEach(function (p) { c[p.categoria] = (c[p.categoria] || 0) + 1; });
    return Object.keys(c).sort();
  }
  function tarjeta(p) {
    var en = E.carrito[p.id] || 0, sin = p.disponible <= 0, pocas = !sin && p.disponible <= 5;
    return '<article class="prod' + (sin ? ' agotado' : '') + '" style="--c:' + colorCat(p.categoria) + '"><div class="foto">' + dibujo(p) +
      '<div class="etiq">' + (p.granel ? '<span class="badge granel">A granel · traé tu envase</span>' : '') + (sin ? '<span class="badge sin">Sin stock</span>' : pocas ? '<span class="badge pocas">Últimas ' + p.disponible + '</span>' : '') + '</div></div>' +
      '<div class="prod-info"><span class="cat">' + esc(p.categoria) + '</span><h3>' + esc(p.nombre) + '</h3><span class="pres">' + esc(p.presentacion) + '</span></div>' +
      '<div class="prod-pie"><div class="precio num">' + pesos(p.precio) + (p.granel && /litro|^l$/i.test(p.presentacion + ' ' + p.unidad) ? ' <small>/ litro</small>' : '') + '</div>' +
      (sin ? '<button class="btn" type="button" disabled>Sin stock</button>' :
        '<div class="agregar"><span class="paso"><button type="button" data-menos="' + p.id + '" aria-label="Uno menos">−</button><input type="number" min="1" max="' + p.disponible + '" value="1" inputmode="numeric" data-cant="' + p.id + '" aria-label="Cantidad"><button type="button" data-mas="' + p.id + '" aria-label="Uno más">+</button></span>' +
        '<button class="btn pri" type="button" data-agregar="' + p.id + '">' + IC.carrito + 'Agregar</button></div>') +
      (en ? '<span class="en-carrito">' + IC.ok.replace('<svg', '<svg width="14" height="14"') + en + ' en el carrito</span>' : '') + '</div></article>';
  }
  function vistaCatalogo() {
    var t = E.tienda;
    if (!t.activa) return '<div class="cont"><div class="hoja"><div class="tarjeta"><h1>La tienda está cerrada por el momento</h1><p class="muted">Escribinos por WhatsApp y te tomamos el pedido.</p>' +
      (t.whatsapp ? '<a class="btn wa grande" target="_blank" rel="noopener" href="' + esc(linkWa(t.whatsapp, 'Hola! Quiero hacer un pedido.')) + '">' + IC.wa + 'Escribir por WhatsApp</a>' : '') + '</div></div></div>';
    var q = normal(E.q);
    var lista = E.productos.filter(function (p) {
      return (!E.cat || p.categoria === E.cat) && (!q || normal(p.nombre + ' ' + p.presentacion + ' ' + p.categoria).indexOf(q) >= 0);
    }).sort(function (a, b) { return (b.disponible > 0) - (a.disponible > 0) || (a.categoria + a.nombre + a.presentacion).localeCompare(b.categoria + b.nombre + b.presentacion); });
    return '<section class="hero cont"><h1>Limpieza de fábrica, directo a tu casa</h1><p>' + esc(t.mensaje || 'Hacé tu pedido online: retirás en el local o te lo llevamos.') + '</p>' +
      '<div class="beneficios"><div class="benef"><span class="ico">' + IC.camion + '</span><span><b>Envío gratis en CABA</b><span>en compras desde ' + pesos(t.gratisCaba) + '</span></span></div>' +
      '<div class="benef"><span class="ico">' + IC.camion + '</span><span><b>Fuera de CABA</b><span>compra mínima ' + pesos(t.minimoInterior) + ' · flete a coordinar</span></span></div>' +
      '<div class="benef"><span class="ico">' + IC.gota + '</span><span><b>Granel con tu envase</b><span>más barato · retirás en el local</span></span></div>' +
      '<div class="benef"><span class="ico">' + IC.escudo + '</span><span><b>Pagá como quieras</b><span>' + [t.pagos.mp && t.mpListo ? 'Mercado Pago' : '', t.pagos.transferencia ? 'transferencia' : '', t.pagos.efectivo ? 'efectivo' : ''].filter(Boolean).join(' · ') + '</span></span></div></div></section>' +
      '<div class="filtros cont"><label class="buscar">' + IC.buscar + '<input id="q" type="search" placeholder="Buscar: suavizante, lavandina, perfumina…" value="' + esc(E.q) + '" aria-label="Buscar productos"></label>' +
      '<div class="chips" role="group" aria-label="Categorías"><button class="chip" type="button" data-cat="" aria-pressed="' + !E.cat + '">Todo</button>' +
      categorias().map(function (c) { return '<button class="chip" type="button" data-cat="' + esc(c) + '" aria-pressed="' + (E.cat === c) + '">' + esc(c) + '</button>'; }).join('') + '</div></div>' +
      '<main class="cont">' + (lista.length ? '<div class="grilla">' + lista.map(tarjeta).join('') + '</div>' : '<p class="vacio">No encontramos productos con esa búsqueda.</p>') + '</main>';
  }

  /* ---------- Panel: carrito y compra ---------- */
  function progresoEnvio() {
    var t = E.tienda, st = subtotal();
    if (!st) return '';
    if (hayGranel()) return '<div class="aviso azul">' + IC.gota.replace('<svg', '<svg width="16" height="16" style="vertical-align:-3px"') + ' Tenés productos a granel: el pedido se <b>retira en el local</b> con tus envases.</div>';
    if (st >= t.gratisCaba) return '<div class="progreso"><b>🎉 ¡Tenés envío gratis en CABA!</b><div class="barra"><i style="width:100%"></i></div></div>';
    var pct = Math.min(100, st / t.gratisCaba * 100);
    return '<div class="progreso lejos"><span>Te faltan <b>' + pesos(t.gratisCaba - st) + '</b> para el <b>envío gratis en CABA</b></span><div class="barra"><i style="width:' + pct.toFixed(1) + '%"></i></div></div>';
  }
  function filaItem(x) {
    var p = x.p;
    return '<div class="item" style="--c:' + colorCat(p.categoria) + '"><span class="mini">' + dibujo(p) + '</span><div><b>' + esc(p.nombre) + '</b><span class="det">' + esc(p.presentacion) + ' · ' + pesos(p.precio) + (p.granel ? ' · granel' : '') + '</span></div>' +
      '<div class="der"><b class="num">' + pesos(p.precio * x.cant) + '</b><span class="paso"><button type="button" data-cmenos="' + p.id + '" aria-label="Uno menos">−</button><input type="number" min="0" max="' + p.disponible + '" value="' + x.cant + '" data-ccant="' + p.id + '" inputmode="numeric" aria-label="Cantidad"><button type="button" data-cmas="' + p.id + '" aria-label="Uno más">+</button></span>' +
      '<button class="quitar" type="button" data-quitar="' + p.id + '">Quitar</button></div></div>';
  }
  /** Reglas de envío (las mismas que controla el servidor). */
  function reglaEnvio(entrega) {
    var t = E.tienda, st = subtotal();
    if (!entrega) return { ok: false, texto: '' };
    if (hayGranel() && entrega !== 'retiro') return { ok: false, texto: 'Los productos a granel son solo para retirar en el local.' };
    if (entrega === 'retiro') return { ok: true, texto: 'Sin costo.' };
    if (entrega === 'caba') return st >= t.gratisCaba ? { ok: true, gratis: true, texto: 'GRATIS' } : { ok: true, coordinar: true, texto: 'Te faltan ' + pesos(t.gratisCaba - st) + ' para el envío gratis. Si no, el costo lo coordinás con el vendedor.' };
    return st >= t.minimoInterior ? { ok: true, coordinar: true, texto: 'El flete se coordina con el vendedor.' } : { ok: false, texto: 'Compra mínima ' + pesos(t.minimoInterior) + ' (te faltan ' + pesos(t.minimoInterior - st) + ').' };
  }
  function panelCarrito() {
    var items = itemsCarrito(), st = subtotal();
    var cuerpo = !items.length ? '<div class="vacio"><p style="font-size:2rem;margin:0">🧺</p><p>Tu carrito está vacío.</p><button class="btn pri" type="button" data-cerrar>Ver productos</button></div>' :
      progresoEnvio() + '<div style="display:grid;gap:14px">' + items.map(filaItem).join('') + '</div>';
    return panel('Tu carrito', cuerpo, items.length ? '<div class="resumen"><div class="r total"><span>Subtotal</span><span class="num">' + pesos(st) + '</span></div></div>' +
      '<button class="btn pri grande" type="button" data-paso="datos">Continuar compra</button>' : '', 1);
  }
  function opcion(nombre, valor, titulo, detalle, apagada, extra) {
    var sel = (nombre === 'entrega' ? E.entrega : E.pago) === valor;
    return '<label class="opcion' + (apagada ? ' off' : '') + '"><input type="radio" name="' + nombre + '" value="' + valor + '"' + (sel && !apagada ? ' checked' : '') + (apagada ? ' disabled' : '') + '><b>' + titulo + (extra || '') + '</b><small>' + detalle + '</small></label>';
  }
  function panelDatos() {
    var t = E.tienda, d = E.datos, st = subtotal(), granel = hayGranel();
    if (granel) E.entrega = 'retiro';
    var rc = reglaEnvio('caba'), ri = reglaEnvio('interior');
    if (E.entrega && !reglaEnvio(E.entrega).ok) E.entrega = '';
    var pagos = [];
    if (t.pagos.mp && t.mpListo) pagos.push(opcion('pago', 'mp', 'Mercado Pago', 'Tarjeta de crédito, débito o dinero en cuenta. Te llevamos a Mercado Pago para pagar seguro.'));
    if (t.pagos.transferencia) pagos.push(opcion('pago', 'transferencia', 'Transferencia', t.alias ? 'Alias ' + esc(t.alias) + '. Mandanos el comprobante por WhatsApp.' : 'Te pasamos los datos por WhatsApp.'));
    if (t.pagos.efectivo) pagos.push(opcion('pago', 'efectivo', 'Efectivo', 'Pagás al retirar o cuando recibís el pedido.'));
    var re = reglaEnvio(E.entrega);
    var cuerpo = '<form id="f-compra" novalidate style="display:grid;gap:18px">' +
      '<fieldset><legend>Tus datos</legend><label class="campo"><span>Nombre y apellido</span><input class="in" name="nombre" autocomplete="name" required value="' + esc(d.nombre || '') + '"></label>' +
      '<div class="dos"><label class="campo"><span>Teléfono / WhatsApp</span><input class="in" name="telefono" type="tel" autocomplete="tel" inputmode="tel" placeholder="11 2345-6789" required value="' + esc(d.telefono || '') + '"></label>' +
      '<label class="campo"><span>Email (opcional)</span><input class="in" name="email" type="email" autocomplete="email" value="' + esc(d.email || '') + '"></label></div></fieldset>' +
      '<fieldset><legend>¿Cómo lo recibís?</legend>' +
      opcion('entrega', 'retiro', 'Retiro en el local', esc([t.direccion, t.horario].filter(Boolean).join(' · ') || 'Sin costo.'), false, ' <span class="gratis">· sin costo</span>') +
      opcion('entrega', 'caba', 'Envío a domicilio en CABA', granel ? 'No disponible con productos a granel.' : rc.texto === 'GRATIS' ? 'Tu compra supera ' + pesos(t.gratisCaba) + '.' : rc.texto, granel, rc.gratis && !granel ? ' <span class="gratis">· GRATIS</span>' : '') +
      opcion('entrega', 'interior', 'Envío fuera de CABA', granel ? 'No disponible con productos a granel.' : ri.ok ? 'Compra mínima ' + pesos(t.minimoInterior) + ' ✓ · el flete se coordina con el vendedor.' : ri.texto, granel || !ri.ok) +
      '<div id="dir" style="display:grid;gap:8px"' + (E.entrega === 'caba' || E.entrega === 'interior' ? '' : ' hidden') + '><div class="dos"><label class="campo"><span>Dirección</span><input class="in" name="direccion" autocomplete="street-address" placeholder="Calle y número, piso" value="' + esc(d.direccion || '') + '"></label>' +
      '<label class="campo"><span>Barrio / localidad</span><input class="in" name="localidad" autocomplete="address-level2" value="' + esc(d.localidad || '') + '"></label></div></div></fieldset>' +
      '<fieldset><legend>¿Cómo pagás?</legend>' + (pagos.join('') || '<p class="muted">Coordinamos el pago por WhatsApp.</p>') + '</fieldset>' +
      '<label class="campo"><span>¿Algo más? (opcional)</span><textarea class="in" name="notas" rows="2" maxlength="200" placeholder="Horario para recibir, aroma preferido…">' + esc(d.notas || '') + '</textarea></label></form>';
    var pie = '<div class="resumen"><div class="r"><span>Productos (' + unidades() + ')</span><span class="num">' + pesos(st) + '</span></div>' +
      '<div class="r"><span>Envío</span><span>' + (!E.entrega ? '—' : E.entrega === 'retiro' ? 'Retirás' : re.gratis ? '<b style="color:var(--ok)">Gratis</b>' : 'A coordinar') + '</span></div>' +
      '<div class="r total"><span>Total</span><span class="num">' + pesos(st) + '</span></div></div>' +
      (re.coordinar ? '<div class="aviso" style="font-size:.8rem">El envío no está incluido: lo coordinás con el vendedor por WhatsApp.</div>' : '') +
      '<button class="btn pri grande" type="button" id="confirmar"' + (E.ocupado ? ' disabled' : '') + '>' + (E.ocupado ? 'Enviando…' : E.pago === 'mp' ? 'Confirmar y pagar ' + pesos(st) : 'Confirmar pedido · ' + pesos(st)) + '</button>';
    return panel('Finalizar compra', cuerpo, pie, 2);
  }
  function panel(titulo, cuerpo, pie, paso) {
    var anim = E.animar ? ' anim' : '';
    return '<div class="velo' + anim + '" data-cerrar></div><aside class="panel' + anim + '" role="dialog" aria-modal="true" aria-label="' + esc(titulo) + '"><div class="panel-top">' +
      (paso === 2 ? '<button class="volver" type="button" data-paso="carrito" aria-label="Volver al carrito">' + IC.atras + '</button>' : '') + '<h2>' + esc(titulo) + '</h2>' +
      '<button class="cerrar" type="button" data-cerrar aria-label="Cerrar">' + IC.x + '</button></div>' +
      '<div class="panel-cuerpo">' + (paso ? '<div class="pasos-compra"><span class="si">1. Carrito</span><span class="' + (paso >= 2 ? 'si' : '') + '">2. Datos y entrega</span><span>3. Listo</span></div>' : '') + cuerpo + '</div>' +
      (pie ? '<div class="panel-pie">' + pie + '</div>' : '') + '</aside>';
  }
  function panelArrepentimiento() {
    var cuerpo = '<p style="margin:0">Si compraste online, tenés <b>10 días corridos</b> desde la compra o desde que recibiste el pedido para arrepentirte, sin dar explicaciones (Ley 24.240, art. 34 y Res. 424/2020).</p>' +
      (E.codigo ? '<p class="aviso azul" style="margin:0">Pedido ' + nro(E.seg && E.seg.numero) + '</p>' :
        '<div class="dos"><label class="campo"><span>Número de pedido</span><input class="in" id="ar-num" inputmode="numeric" placeholder="12"></label><label class="campo"><span>Teléfono con el que compraste</span><input class="in" id="ar-tel" type="tel" inputmode="tel"></label></div>') +
      '<label class="campo"><span>Motivo (opcional)</span><textarea class="in" id="ar-mot" rows="2" maxlength="150"></textarea></label><div id="ar-res"></div>';
    return panel('Botón de arrepentimiento', cuerpo, '<button class="btn grande" type="button" id="ar-ok" style="border-color:var(--danger);color:var(--danger)">Quiero arrepentirme de mi compra</button>', 0);
  }

  /* ---------- Seguimiento del pedido ---------- */
  var PASOS = [['nuevo', 'Recibido'], ['preparacion', 'Preparando'], ['listo', 'Listo / en camino'], ['entregado', 'Entregado']];
  function vistaSeguimiento() {
    var s = E.seg, t = E.tienda || {};
    if (!s) return '<div class="cargando">Buscando tu pedido…</div>';
    var orden = { nuevo: 0, preparacion: 1, listo: 2, encamino: 2, entregado: 3 }[s.estado];
    var link = linkSeguimiento(E.codigo);
    var recien = E.recien;
    return '<div class="cont"><div class="hoja">' +
      (recien ? '<div class="tarjeta" style="justify-items:start"><span class="listo-ico">' + IC.ok + '</span><h1>¡Gracias, ' + esc(s.nombre) + '! Recibimos tu pedido ' + nro(s.numero) + '</h1>' +
        '<p class="muted" style="margin:0">' + esc(recien.envioTexto || '') + ' Guardá este link para ver cómo va tu pedido:</p>' +
        '<div class="copiar" style="width:100%"><input class="in" readonly value="' + esc(link) + '" aria-label="Link de seguimiento"><button class="btn" type="button" data-copiar="' + esc(link) + '">Copiar</button></div>' +
        (recien.mpError ? '<div class="aviso rojo">' + esc(recien.mpError) + '</div>' : '') +
        (t.whatsapp ? '<a class="btn wa grande" target="_blank" rel="noopener" href="' + esc(linkWa(t.whatsapp, 'Hola! Hice el pedido ' + nro(s.numero) + ' en la tienda online' + (recien.coordinar ? ' y quiero coordinar el envío' : '') + '. Seguimiento: ' + link)) + '">' + IC.wa + (recien.coordinar ? 'Coordinar el envío por WhatsApp' : 'Avisar por WhatsApp') + '</a>' : '') + '</div>' : '') +
      '<div class="tarjeta"><div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline;flex-wrap:wrap"><h2>Pedido ' + nro(s.numero) + '</h2><span class="muted" style="font-size:.85rem">' + fecha(s.creado) + '</span></div>' +
      (s.estado === 'anulado' ? '<div class="aviso rojo">Este pedido fue anulado.</div>' : '<div class="linea">' + PASOS.map(function (p, i) {
        return '<div class="p' + (i <= orden ? ' si' : '') + (i === orden ? ' ahora' : '') + '"><i>' + (i < orden || orden === 3 ? '✓' : i + 1) + '</i>' + (i === 2 && s.estado === 'encamino' ? 'En camino' : p[1]) + '</div>';
      }).join('') + '</div>') +
      (s.pagoMP === 'aprobado' ? '<div class="aviso verde"><b>¡Pago aprobado!</b> Mercado Pago confirmó tu pago.</div>' : s.pagoMP && s.pagoMP !== 'yaRegistrado' && s.saldo > 0 ? '<div class="aviso">Mercado Pago todavía no confirmó el pago (' + esc(s.pagoMP) + '). Si ya pagaste, en unos minutos se actualiza.</div>' : '') +
      (s.arrepentimiento ? '<div class="aviso rojo">Pediste arrepentirte de esta compra · trámite <b>' + esc(s.arrepentimiento) + '</b>. Te vamos a contactar.</div>' : '') +
      '<div class="tabla-items">' + s.items.map(function (i) { return '<div class="r"><span>' + i.cantidad + ' × ' + esc(i.nombre) + ' <span class="muted">' + esc(i.presentacion) + '</span></span><span class="num">' + pesos(i.precio * i.cantidad) + '</span></div>'; }).join('') + '</div>' +
      '<div class="resumen" style="border-top:1px solid var(--border);padding-top:8px">' + (s.envio ? '<div class="r"><span>Envío</span><span class="num">' + pesos(s.envio) + '</span></div>' : '') +
      '<div class="r total"><span>Total</span><span class="num">' + pesos(s.total) + '</span></div>' +
      '<div class="r"><span>' + (s.saldo > 0 ? 'Falta pagar' : 'Pagado') + '</span><span class="num" style="font-weight:700;color:' + (s.saldo > 0 ? 'var(--danger)' : 'var(--ok)') + '">' + (s.saldo > 0 ? pesos(s.saldo) : '✓ ' + pesos(s.pagado)) + '</span></div></div>' +
      '<p class="muted" style="margin:0;font-size:.85rem">' + esc([s.entrega, s.pago].filter(Boolean).join(' · ')) + '</p>' +
      (s.retiro ? '<div class="aviso azul"><b>Retirás en:</b> ' + esc(s.retiro.direccion || '') + (s.retiro.horario ? '<br>' + esc(s.retiro.horario) : '') + '</div>' : '') +
      (s.saldo > 0 && s.alias ? '<div class="dato-pago"><span>Alias</span><b>' + esc(s.alias) + '</b><button class="btn" type="button" data-copiar="' + esc(s.alias) + '">Copiar</button>' +
        (s.cbu ? '<span>CBU</span><b>' + esc(s.cbu) + '</b><button class="btn" type="button" data-copiar="' + esc(s.cbu) + '">Copiar</button>' : '') + '</div><p class="muted" style="margin:0;font-size:.82rem">Después de transferir, mandanos el comprobante por WhatsApp.</p>' : '') +
      (s.puedePagarMP ? '<button class="btn mp grande" type="button" id="pagar-mp">Pagar ' + pesos(s.saldo) + ' con Mercado Pago</button>' : '') + '</div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:space-between"><button class="btn" type="button" data-ir="catalogo">Seguir comprando</button>' +
      (s.estado !== 'anulado' && !s.arrepentimiento ? '<button class="btn-arrep" type="button" data-abrir="arrepentimiento">Botón de arrepentimiento</button>' : '') + '</div></div></div>';
  }
  function linkSeguimiento(codigo) {
    var base = (E.tienda && E.tienda.url) || String(location.href).split('#')[0].replace(/[?&](seguimiento|payment_id|collection_id|status|collection_status|external_reference|preference_id|merchant_order_id|site_id|processing_mode|merchant_account_id|payment_type)=[^&]*/g, '');
    return base + (base.indexOf('?') >= 0 ? '&' : '?') + 'seguimiento=' + codigo;
  }
  function cargarSeguimiento(codigo, paymentId) {
    E.vista = 'seguimiento'; E.codigo = codigo; E.seg = null; pintar();
    return llamar('tiendaSeguimiento', { codigo: codigo, paymentId: paymentId || '' }).then(function (r) { E.seg = r; pintar(); },
      function (e) { E.vista = 'catalogo'; pintar(); toast(e.message, true); });
  }
  function irAPagar(url, codigo) {
    if (/^#mpdemo=/.test(url)) return mpSimulado(url.split('=')[1], codigo);
    try { window.top.location.href = url; } catch (e) { window.open(url, '_blank', 'noopener'); }
  }
  /* Solo en la demostración: una pantalla que imita a Mercado Pago. */
  function mpSimulado(pid, codigo) {
    var monto = E.seg ? E.seg.saldo : E.recien ? E.recien.total : 0;
    var d = document.createElement('div');
    d.className = 'mp-demo';
    d.innerHTML = '<div class="mp-caja"><span class="mp-logo">mercado pago</span><p style="margin:0">Estás pagando a <b>' + esc(E.tienda.empresa) + '</b></p><p style="margin:0;font-size:1.8rem;font-weight:700">' + pesos(monto) + '</p>' +
      '<p style="margin:0;font-size:.82rem;color:#777">Simulación de la demostración: no se cobra nada.</p><button class="btn mp grande" type="button" id="mp-pagar">Pagar</button><button class="btn" type="button" id="mp-volver">Volver sin pagar</button></div>';
    document.body.appendChild(d);
    $('#mp-pagar', d).onclick = function () { window.QGDemo.mpAprobar(pid); d.remove(); cargarSeguimiento(codigo, pid); };
    $('#mp-volver', d).onclick = function () { d.remove(); cargarSeguimiento(codigo, pid); };
  }

  /* ---------- Pintado y eventos ---------- */
  function pintar() {
    var raiz = $('#raiz');
    var foco = document.activeElement && document.activeElement.id, pos = foco && document.activeElement.selectionStart;
    var scroll = $('.panel-cuerpo') ? $('.panel-cuerpo').scrollTop : 0;
    var cuerpo = !E.tienda ? '<div class="cargando">Cargando productos…</div>' : E.vista === 'seguimiento' ? vistaSeguimiento() : vistaCatalogo();
    var n = unidades();
    raiz.innerHTML = encabezado() + cuerpo + (E.tienda ? pie() : '') +
      (E.vista === 'catalogo' && n ? '<div class="flotante hay"><button class="btn pri" type="button" data-abrir="carrito"><span>' + IC.carrito.replace('<svg', '<svg width="20" height="20"') + ' ' + n + ' producto' + (n > 1 ? 's' : '') + '</span><b class="num">' + pesos(subtotal()) + ' →</b></button></div>' : '') +
      (E.panel === 'carrito' ? (E.paso === 'datos' && itemsCarrito().length ? panelDatos() : panelCarrito()) : E.panel === 'arrepentimiento' ? panelArrepentimiento() : '');
    E.animar = false;
    document.body.classList.toggle('con-flotante', E.vista === 'catalogo' && n > 0);
    document.body.style.overflow = E.panel ? 'hidden' : '';
    if (foco && $('#' + foco)) { var el = $('#' + foco); el.focus(); try { if (pos !== null && pos !== undefined) el.setSelectionRange(pos, pos); } catch (e) { /* */ } }
    if ($('.panel-cuerpo')) $('.panel-cuerpo').scrollTop = scroll;
    enlazar();
  }
  function ponerEnCarrito(id, cant) {
    var p = E.idx[id];
    if (!p) return;
    cant = Math.max(0, Math.min(p.disponible, Math.round(num(cant))));
    if (cant) E.carrito[id] = cant; else delete E.carrito[id];
    guardarCarrito();
  }
  function leerForm() {
    var f = $('#f-compra');
    if (!f) return;
    ['nombre', 'telefono', 'email', 'direccion', 'localidad', 'notas'].forEach(function (k) { if (f.elements[k]) E.datos[k] = f.elements[k].value.trim(); });
    guardar('ac_tienda_datos', JSON.stringify({ nombre: E.datos.nombre, telefono: E.datos.telefono, email: E.datos.email, direccion: E.datos.direccion, localidad: E.datos.localidad }));
  }
  function enlazar() {
    var r = $('#raiz');
    var q = $('#q', r);
    if (q) q.oninput = function () { E.q = q.value; pintar(); };
    $$('[data-cat]', r).forEach(function (b) { b.onclick = function () { E.cat = b.getAttribute('data-cat'); pintar(); }; });
    $$('[data-mas],[data-menos]', r).forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-mas') || b.getAttribute('data-menos'), inp = $('[data-cant="' + id + '"]', r), p = E.idx[id];
        inp.value = Math.max(1, Math.min(p.disponible, num(inp.value) + (b.hasAttribute('data-mas') ? 1 : -1)));
      };
    });
    $$('[data-agregar]', r).forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-agregar'), p = E.idx[id], c = Math.max(1, Math.round(num($('[data-cant="' + id + '"]', r).value)));
        var total = (E.carrito[id] || 0) + c;
        if (total > p.disponible) { toast('Hay ' + p.disponible + ' disponibles de ' + p.nombre + '.', true); total = p.disponible; }
        ponerEnCarrito(id, total);
        toast('✓ ' + c + ' × ' + p.nombre + ' al carrito');
        pintar();
      };
    });
    $$('[data-cmas],[data-cmenos]', r).forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-cmas') || b.getAttribute('data-cmenos');
        var n = (E.carrito[id] || 0) + (b.hasAttribute('data-cmas') ? 1 : -1);
        if (b.hasAttribute('data-cmas') && n > E.idx[id].disponible) toast('No hay más disponibles.', true);
        ponerEnCarrito(id, n); pintar();
      };
    });
    $$('[data-ccant]', r).forEach(function (i) { i.onchange = function () { ponerEnCarrito(i.getAttribute('data-ccant'), i.value); pintar(); }; });
    $$('[data-quitar]', r).forEach(function (b) { b.onclick = function () { ponerEnCarrito(b.getAttribute('data-quitar'), 0); pintar(); }; });
    $$('[data-abrir]', r).forEach(function (b) { b.onclick = function () { E.panel = b.getAttribute('data-abrir'); E.animar = true; if (E.panel === 'carrito') E.paso = 'carrito'; pintar(); }; });
    $$('[data-cerrar]', r).forEach(function (b) { b.onclick = function () { leerForm(); E.panel = null; pintar(); }; });
    $$('[data-paso]', r).forEach(function (b) { b.onclick = function () { leerForm(); E.paso = b.getAttribute('data-paso'); pintar(); }; });
    $$('[data-ir]', r).forEach(function (b) { b.onclick = function (ev) { ev.preventDefault(); E.vista = 'catalogo'; E.recien = null; E.codigo = ''; E.seg = null; window.scrollTo(0, 0); pintar(); recargar(); }; });
    $$('[data-copiar]', r).forEach(function (b) {
      b.onclick = function () {
        var v = b.getAttribute('data-copiar');
        try { navigator.clipboard.writeText(v).then(function () { toast('Copiado'); }, function () { toast(v); }); } catch (e) { toast(v); }
      };
    });
    $$('input[name="entrega"],input[name="pago"]', r).forEach(function (i) {
      i.onchange = function () { leerForm(); if (i.name === 'entrega') E.entrega = i.value; else E.pago = i.value; pintar(); };
    });
    var conf = $('#confirmar', r);
    if (conf) conf.onclick = confirmarCompra;
    var pm = $('#pagar-mp', r);
    if (pm) pm.onclick = function () {
      pm.disabled = true;
      llamar('tiendaPagar', { codigo: E.codigo }).then(function (x) { irAPagar(x.mpUrl, E.codigo); pm.disabled = false; }, function (e) { pm.disabled = false; toast(e.message, true); });
    };
    var ar = $('#ar-ok', r);
    if (ar) ar.onclick = function () {
      var datos = E.codigo ? { codigo: E.codigo, motivo: $('#ar-mot', r).value } : { numero: $('#ar-num', r).value, telefono: $('#ar-tel', r).value, motivo: $('#ar-mot', r).value };
      if (!E.codigo && (!datos.numero || String(datos.telefono).replace(/\D/g, '').length < 8)) return toast('Completá el número de pedido y el teléfono.', true);
      ar.disabled = true;
      llamar('tiendaArrepentimiento', datos).then(function (x) {
        $('#ar-res', r).innerHTML = '<div class="aviso verde"><b>Recibimos tu pedido de arrepentimiento.</b><br>Código de trámite: <b>' + esc(x.tramite) + '</b>. Guardalo: te vamos a contactar para la devolución.</div>';
        ar.hidden = true;
        if (E.seg) E.seg.arrepentimiento = x.tramite;
      }, function (e) { ar.disabled = false; toast(e.message, true); });
    };
  }
  function confirmarCompra() {
    leerForm();
    var d = E.datos, t = E.tienda;
    var falta = !d.nombre || d.nombre.length < 3 ? 'Escribí tu nombre y apellido.' : String(d.telefono || '').replace(/\D/g, '').length < 8 ? 'Escribí tu teléfono con código de área.' :
      !E.entrega ? 'Elegí cómo recibís el pedido.' : !reglaEnvio(E.entrega).ok ? reglaEnvio(E.entrega).texto : E.entrega !== 'retiro' && (!d.direccion || d.direccion.length < 4) ? 'Escribí la dirección de entrega.' :
      !E.pago && (t.pagos.mp || t.pagos.transferencia || t.pagos.efectivo) ? 'Elegí cómo pagás.' : '';
    if (falta) return toast(falta, true);
    E.ocupado = true; pintar();
    var st = subtotal();
    llamar('tiendaPedido', {
      cliente: { nombre: d.nombre, telefono: d.telefono, email: d.email, direccion: E.entrega === 'retiro' ? '' : d.direccion, localidad: E.entrega === 'retiro' ? '' : d.localidad, notas: d.notas },
      entrega: E.entrega, pago: E.pago, totalVisto: st,
      items: itemsCarrito().map(function (x) { return { productoId: x.p.id, cantidad: x.cant }; })
    }).then(function (r) {
      E.ocupado = false; E.carrito = {}; guardarCarrito(); E.panel = null; E.datos.notas = '';
      E.recien = r;
      window.scrollTo(0, 0);
      cargarSeguimiento(r.codigo).then(function () {
        if (r.mpUrl) { toast('Te llevamos a Mercado Pago…'); setTimeout(function () { irAPagar(r.mpUrl, r.codigo); }, 900); }
      });
    }, function (e) {
      E.ocupado = false;
      toast(e.message, true);
      if (e.codigo === 'PRECIO' || e.codigo === 'SIN_STOCK') recargar(); else pintar();
    });
  }
  function recargar() {
    return llamar('tiendaCatalogo').then(function (r) {
      E.tienda = r.tienda; E.productos = r.productos; E.idx = {};
      r.productos.forEach(function (p) { E.idx[p.id] = p; });
      Object.keys(E.carrito).forEach(function (id) { var p = E.idx[id]; if (!p || p.disponible <= 0) delete E.carrito[id]; else if (E.carrito[id] > p.disponible) E.carrito[id] = p.disponible; });
      guardarCarrito();
      document.title = (r.tienda.empresa || 'Akuma Clean') + ' · Tienda online';
      pintar();
    }, function (e) { $('#raiz').innerHTML = '<div class="cargando"><p>' + esc(e.message) + '</p><button class="btn pri" type="button" onclick="location.reload()">Reintentar</button></div>'; });
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && E.panel) { leerForm(); E.panel = null; pintar(); } });

  /* ---------- Arranque: catálogo, o seguimiento si vino con ?seguimiento= (también al volver de Mercado Pago) ---------- */
  function parametros(cb) {
    if (MODO === 'gas' && google.script.url) google.script.url.getLocation(function (l) { cb(l.parameter || {}); });
    else { var p = {}; new URLSearchParams(location.search).forEach(function (v, k) { p[k] = v; }); cb(p); }
  }
  pintar();
  recargar().then(function () {
    parametros(function (p) {
      if (p.seguimiento) cargarSeguimiento(p.seguimiento, p.payment_id || p.collection_id || '');
    });
  });
  window.AkumaTienda = { estado: E };
})();
// FIN DE tienda.js · Akuma Clean
