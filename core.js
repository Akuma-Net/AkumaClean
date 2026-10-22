/**
 * ============================================================
 * Akuma Clean · Core (lógica de negocio compartida)
 * Pedidos, preparación, reparto, cobranzas y cuentas corrientes.
 *
 * Este MISMO archivo se usa en dos lugares:
 *   - Google Apps Script (Core.gs) → servidor real con Google Sheets.
 *   - La app web (core.js) → modo demostración sin servidor.
 * No usa nada propio de Google ni del navegador: todo pasa por el
 * "adaptador" db que recibe manejar().
 *
 * Desarrollado por AkumaNet. Todos los derechos reservados.
 * Autor: Juan Carlos Ojeda · Tel. 11 6033-1552.
 * ============================================================
 */
var QG = (function () {
  'use strict';

  var VERSION = '1.4.0';
  var SESION_DIAS = 30;
  var DIAS_HISTORIAL = 120; // pedidos cerrados que se envían a la app

  /* ---------- Esquema de las tablas (una hoja por tabla) ---------- */
  var SCHEMA = {
    Usuarios: { cols: ['id', 'nombre', 'usuario', 'pinHash', 'rol', 'activo', 'creado', 'permisos'], json: ['permisos'] },
    Sesiones: { cols: ['id', 'usuarioId', 'creado', 'expira'] },
    Productos: {
      cols: ['id', 'codigo', 'nombre', 'categoria', 'presentacion', 'unidad', 'costo', 'precioMayorista', 'precioMinorista', 'stock', 'stockMinimo', 'activo', 'actualizado', 'minMayorista', 'modoStock', 'granelId', 'contenido', 'web'],
      num: ['costo', 'precioMayorista', 'precioMinorista', 'stock', 'stockMinimo', 'minMayorista', 'contenido']
    },
    Clientes: {
      cols: ['id', 'nombre', 'telefono', 'direccion', 'localidad', 'zonaId', 'distanciaKm', 'tipoPrecio', 'limiteCredito', 'notas', 'activo', 'creado', 'email', 'origen'],
      num: ['distanciaKm', 'limiteCredito']
    },
    Zonas: {
      cols: ['id', 'nombre', 'costoBase', 'costoKm', 'gratisDesde', 'activo'],
      num: ['costoBase', 'costoKm', 'gratisDesde']
    },
    Pedidos: {
      cols: ['id', 'numero', 'clienteId', 'clienteNombre', 'tipoPrecio', 'items', 'subtotal', 'descuentoPct', 'descuento', 'envio', 'envioManual', 'total', 'costoTotal', 'pagado', 'estado', 'stockDescontado', 'zonaId', 'distanciaKm', 'fechaEntrega', 'notas', 'creadoPor', 'creado', 'actualizado', 'historial', 'cotizacion', 'origen', 'seguimiento', 'entrega', 'pagoWeb', 'arrepentimiento'],
      num: ['numero', 'subtotal', 'descuentoPct', 'descuento', 'envio', 'total', 'costoTotal', 'pagado', 'distanciaKm', 'cotizacion'],
      json: ['items', 'historial']
    },
    Pagos: {
      cols: ['id', 'pedidoId', 'clienteId', 'monto', 'medio', 'fecha', 'usuarioId', 'nota', 'creado', 'moneda', 'montoMoneda', 'cotizacion', 'rendicionId', 'referencia'],
      num: ['monto', 'montoMoneda', 'cotizacion']
    },
    Config: { cols: ['id', 'valor'] },
    Etiquetas: { cols: ['id', 'nombre', 'subtitulo', 'uso', 'precauciones', 'color', 'activo', 'actualizado', 'dibujo', 'imagen'] },
    Insumos: {
      cols: ['id', 'nombre', 'tipo', 'unidad', 'precioEnvase', 'cantidadEnvase', 'moneda', 'densidad', 'stock', 'stockMinimo', 'proveedor', 'activo', 'actualizado'],
      num: ['precioEnvase', 'cantidadEnvase', 'densidad', 'stock', 'stockMinimo']
    },
    Formulas: {
      cols: ['id', 'nombre', 'ingredientes', 'rinde', 'extras', 'presentaciones', 'margenMay', 'margenMin', 'actualizarCosto', 'notas', 'activo', 'creado', 'actualizado', 'modo', 'densidad'],
      num: ['rinde', 'margenMay', 'margenMin', 'densidad'], json: ['ingredientes', 'extras', 'presentaciones']
    },
    Actividad: { cols: ['id', 'fecha', 'usuarioId', 'usuarioNombre', 'accion', 'detalle'] },
    Rendiciones: {
      cols: ['id', 'numero', 'usuarioId', 'usuarioNombre', 'fecha', 'pagos', 'esperado', 'entregadoArs', 'entregadoUsd', 'gastos', 'gastosDetalle', 'diferenciaArs', 'diferenciaUsd', 'estado', 'recibidoPor', 'confirmado', 'nota', 'creado'],
      num: ['numero', 'entregadoArs', 'entregadoUsd', 'gastos', 'diferenciaArs', 'diferenciaUsd'], json: ['pagos', 'esperado']
    },
    Proveedores: { cols: ['id', 'nombre', 'telefono', 'cuit', 'email', 'notas', 'activo', 'creado'] },
    Compras: {
      cols: ['id', 'numero', 'proveedorId', 'proveedorNombre', 'fecha', 'factura', 'moneda', 'items', 'total', 'pagado', 'notas', 'usuarioId', 'estado', 'creado'],
      num: ['numero', 'total', 'pagado'], json: ['items']
    },
    PagosProveedor: {
      cols: ['id', 'compraId', 'proveedorId', 'monto', 'moneda', 'medio', 'fecha', 'usuarioId', 'nota', 'creado'],
      num: ['monto']
    },
    Producciones: {
      cols: ['id', 'numero', 'formulaId', 'formulaNombre', 'litros', 'consumos', 'salidas', 'litrosEnvasados', 'costoTotal', 'lote', 'fecha', 'usuarioId', 'notas', 'estado', 'creado'],
      num: ['numero', 'litros', 'litrosEnvasados', 'costoTotal'], json: ['consumos', 'salidas']
    }
  };

  var ROLES = ['admin', 'ventas', 'deposito', 'reparto'];
  var ESTADOS = ['nuevo', 'preparacion', 'listo', 'encamino', 'entregado', 'anulado'];
  var MEDIOS = ['efectivo', 'transferencia', 'mercadopago', 'cheque', 'otro'];
  var CONFIG_CLAVES = ['empresa', 'telefono', 'direccion', 'cuit', 'alias', 'cbu', 'puntoVenta', 'pieRemito', 'formatoRemito', 'legalEtiqueta', 'dolarManual', 'mostrarUsd',
    'tiendaActiva', 'tiendaWhatsapp', 'tiendaDireccion', 'tiendaHorario', 'tiendaMensaje', 'tiendaGratisCaba', 'tiendaMinimoInterior', 'tiendaUrl', 'tiendaMp', 'tiendaTransferencia', 'tiendaEfectivo'];

  /** Cambios de estado permitidos para cada rol (admin y ventas: todos). */
  var TRANSICIONES = {
    deposito: { nuevo: ['preparacion'], preparacion: ['nuevo', 'listo'], listo: ['preparacion'] },
    reparto: { listo: ['encamino'], encamino: ['listo', 'entregado'] }
  };
  var ESTADOS_CON_STOCK = ['listo', 'encamino', 'entregado'];

  /* ---------- Utilidades ---------- */
  function err(codigo, msg) { var e = new Error(msg); e.codigo = codigo; return e; }
  function txt(v, max) { return String(v === null || v === undefined ? '' : v).trim().slice(0, max || 120); }
  function num(v, min, max) {
    var n = Number(String(v === null || v === undefined ? '' : v).replace(',', '.'));
    if (!isFinite(n)) n = 0;
    if (min !== undefined && n < min) n = min;
    if (max !== undefined && n > max) n = max;
    return n;
  }
  function redondear(n) { return Math.round(n * 100) / 100; }
  function fecha(v) { return /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : ''; }
  function si(v) { return v === true || v === 'si' ? 'si' : 'no'; }
  function nuevoId(db) { return db.uuid().replace(/-/g, '').slice(0, 20); }
  function porId(lista, id) { for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i]; return null; }
  function pendiente(p) { return p.estado === 'anulado' ? 0 : Math.max(0, redondear(num(p.total) - num(p.pagado))); }
  function estadoPago(p) {
    if (p.estado === 'anulado') return 'anulado';
    if (num(p.pagado) <= 0) return num(p.total) > 0 ? 'pendiente' : 'pagado';
    return pendiente(p) > 0 ? 'parcial' : 'pagado';
  }

  /* ---------- Cálculos (también los usa la pantalla para mostrar en vivo) ---------- */
  function calcularEnvio(zona, km, subtotal) {
    if (!zona) return 0;
    if (num(zona.gratisDesde) > 0 && subtotal >= num(zona.gratisDesde)) return 0;
    return Math.round(num(zona.costoBase) + num(km) * num(zona.costoKm));
  }
  function calcularTotales(items, descuentoPct, envio) {
    var subtotal = 0, costo = 0;
    items.forEach(function (it) {
      subtotal += num(it.cantidad) * num(it.precio);
      costo += num(it.cantidad) * num(it.costo);
    });
    subtotal = redondear(subtotal);
    var descuento = Math.round(subtotal * num(descuentoPct, 0, 100) / 100);
    return {
      subtotal: subtotal, descuento: descuento, envio: num(envio, 0),
      total: redondear(subtotal - descuento + num(envio, 0)), costoTotal: redondear(costo)
    };
  }

  /* ---------- Dólar oficial ----------
   * El adaptador trae la cotización (Apps Script: dolarapi.com con respaldo
   * en bluelytics, guardada 15 minutos). Si en Ajustes hay una cotización
   * manual, se usa esa. */
  function dolarActual(db) {
    var manual = 0;
    db.all('Config').forEach(function (c) { if (c.id === 'dolarManual') manual = num(c.valor); });
    if (manual > 0) return { valor: manual, fuente: 'manual', fecha: '' };
    try { return db.dolar ? db.dolar() : null; } catch (e) { return null; }
  }

  /* ---------- Sesiones y permisos ---------- */
  /**
   * Permisos. El administrador tiene todos. Cada rol trae los suyos y el
   * administrador puede darle permisos extra a un empleado puntual.
   *  produccion: recetas, stock de insumos y registrar producciones
   *  costos: costos de insumos y productos, ganancias y márgenes
   */
  var PERMISOS = ['pedidos', 'clientes', 'pagos', 'precios', 'produccion', 'costos'];
  var PERMISOS_ROL = {
    ventas: ['pedidos', 'clientes', 'pagos', 'precios'],
    reparto: ['pagos', 'precios'],
    deposito: []
  };
  function puede(u, permiso) {
    if (!u) return false;
    if (u.rol === 'admin') return true;
    if ((PERMISOS_ROL[u.rol] || []).indexOf(permiso) >= 0) return true;
    return Array.isArray(u.permisos) && u.permisos.indexOf(permiso) >= 0;
  }
  function exigir(u, permiso) {
    if (!puede(u, permiso)) throw err('SIN_PERMISO', 'Tu usuario no tiene permiso para hacer esto.');
  }
  function usuarioDeToken(db, token) {
    if (!token || String(token).length < 20) throw err('AUTH', 'Iniciá sesión nuevamente.');
    var ses = porId(db.all('Sesiones'), db.hash(token));
    if (!ses || ses.expira < db.now()) throw err('AUTH', 'Tu sesión expiró. Ingresá nuevamente.');
    var u = porId(db.all('Usuarios'), ses.usuarioId);
    if (!u || u.activo !== 'si') throw err('AUTH', 'Tu usuario está desactivado. Hablá con el administrador.');
    return u;
  }

  /* ---------- Datos que recibe la pantalla (según el rol) ---------- */
  function sincronizar(db, u) {
    var verPrecios = puede(u, 'precios'), verCostos = puede(u, 'costos'), verProd = puede(u, 'produccion');
    var limite = new Date(Date.parse(db.now()) - DIAS_HISTORIAL * 86400000).toISOString();
    var pedidos = db.all('Pedidos').filter(function (p) {
      return pendiente(p) > 0 || ['entregado', 'anulado'].indexOf(p.estado) < 0 || p.actualizado >= limite;
    });
    var ids = {};
    pedidos.forEach(function (p) { ids[p.id] = true; });
    var pagos = verPrecios ? db.all('Pagos').filter(function (x) { return ids[x.pedidoId] || x.creado >= limite; }) : [];

    var config = {};
    db.all('Config').forEach(function (c) { config[c.id] = c.valor; });

    return {
      version: db.getVersion(),
      hoy: db.today(),
      dolar: dolarActual(db),
      app: VERSION,
      yo: { id: u.id, nombre: u.nombre, usuario: u.usuario, rol: u.rol, permisos: Array.isArray(u.permisos) ? u.permisos : [] },
      config: config,
      tienda: u.rol === 'admin' ? { mpListo: !!db.secreto('MP_ACCESS_TOKEN'), mpPrueba: /^TEST-/.test(db.secreto('MP_ACCESS_TOKEN')), url: urlTienda(db, cfgTienda(db)) } : null,
      usuarios: db.all('Usuarios').map(function (x) {
        var o = { id: x.id, nombre: x.nombre, rol: x.rol, activo: x.activo };
        if (u.rol === 'admin') { o.usuario = x.usuario; o.creado = x.creado; o.permisos = Array.isArray(x.permisos) ? x.permisos : []; }
        return o;
      }),
      productos: db.all('Productos').map(function (p) {
        var o = copiar(p);
        if (!verCostos) delete o.costo;
        if (!verPrecios) { delete o.precioMayorista; delete o.precioMinorista; }
        return o;
      }),
      clientes: db.all('Clientes'),
      etiquetas: db.all('Etiquetas'),
      insumos: verProd ? db.all('Insumos').map(function (i) {
        var o = copiar(i);
        if (!verCostos) { delete o.precioEnvase; delete o.moneda; }
        return o;
      }) : [],
      formulas: verProd ? db.all('Formulas').map(function (f) {
        var o = copiar(f);
        if (!verCostos) { delete o.extras; delete o.margenMay; delete o.margenMin; }
        return o;
      }) : [],
      producciones: verProd ? db.all('Producciones').filter(function (x) { return x.creado >= limite; }).map(function (x) {
        var o = copiar(x);
        if (!verCostos) { delete o.costoTotal; o.consumos = (x.consumos || []).map(function (c) { var k = copiar(c); delete k.costo; return k; }); }
        return o;
      }) : [],
      zonas: db.all('Zonas'),
      pedidos: pedidos.map(function (p) {
        var o = copiar(p);
        o.items = (p.items || []).map(function (it) {
          var i = copiar(it);
          if (!verCostos) delete i.costo;
          if (!verPrecios) delete i.precio;
          return i;
        });
        if (!verCostos) delete o.costoTotal;
        if (!verPrecios) { ['subtotal', 'descuento', 'descuentoPct', 'envio', 'total', 'pagado'].forEach(function (k) { delete o[k]; }); }
        return o;
      }),
      pagos: pagos,
      rendiciones: puede(u, 'pagos') ? db.all('Rendiciones').filter(function (x) { return (u.rol === 'admin' || x.usuarioId === u.id) && (x.estado === 'pendiente' || x.creado >= limite); }) : [],
      cajaPendiente: puede(u, 'pagos') ? db.all('Pagos').filter(function (x) { return !x.rendicionId && (u.rol === 'admin' || x.usuarioId === u.id); }) : [],
      proveedores: u.rol === 'admin' ? db.all('Proveedores') : [],
      compras: u.rol === 'admin' ? db.all('Compras').filter(function (c) { return pendienteCompra(c) > 0 || c.creado >= limite; }) : [],
      pagosProveedor: u.rol === 'admin' ? db.all('PagosProveedor').filter(function (x) { return x.creado >= limite; }) : [],
      config2: { ultimoRespaldo: config.ultimoRespaldo || '' }
    };
  }
  function copiar(o) { var r = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k]; return r; }

  /* ---------- Stock ---------- */
  /*
   * STOCK EN DOS NIVELES
   *  - 'tanque':   el líquido a granel. Su stock está en LITROS.
   *  - 'envasado': unidades ya envasadas (botellas, bidones). Tienen su propio
   *                stock y se llenan desde un tanque con "Envasar".
   *  - 'granel':   se vende suelto (el cliente trae el envase): no tiene stock
   *                propio, descuenta litros del tanque directamente.
   *  - '' (normal): stock en unidades, como cualquier producto (bazar, etc.).
   * Mayorista y minorista son listas de precios, no tipos de stock.
   */
  var MODOS_STOCK = ['', 'tanque', 'envasado', 'granel'];
  /** A qué producto y cuánto descuenta vender `cantidad` de p. */
  function destinoStock(productos, p, cantidad) {
    if (p.modoStock === 'granel' && p.granelId) {
      var t = porId(productos, p.granelId);
      if (t) return { producto: t, cantidad: num(cantidad) * (num(p.contenido) || 1) };
    }
    return { producto: p, cantidad: num(cantidad) };
  }
  function moverStock(db, items, signo) {
    var productos = db.all('Productos');
    items.forEach(function (it) {
      var p = porId(productos, it.productoId);
      if (!p) return;
      var d = destinoStock(productos, p, it.cantidad);
      d.producto.stock = redondear(num(d.producto.stock) + signo * d.cantidad);
      d.producto.actualizado = db.now();
      db.put('Productos', d.producto);
    });
  }
  /** Litros que lleva una unidad de un producto envasado/granel. */
  function contenidoDe(p) { return num(p.contenido) || litrosDeTexto(p.presentacion) || 1; }
  /** La presentación de fórmula de un producto (para saber qué envases usa). */
  function presentacionDe(formulas, productoId) {
    for (var i = 0; i < formulas.length; i++) {
      var pr = (formulas[i].presentaciones || []).filter(function (x) { return x.productoId === productoId; })[0];
      if (pr) return { formula: formulas[i], pres: pr };
    }
    return null;
  }
  /** Tanque de una fórmula: el producto "tanque" que está entre sus presentaciones, o el que usan sus envasados. */
  function tanqueDeFormula(f, productos) {
    var pres = f.presentaciones || [], i, p;
    for (i = 0; i < pres.length; i++) { p = porId(productos, pres[i].productoId); if (p && p.modoStock === 'tanque') return p; }
    for (i = 0; i < pres.length; i++) {
      p = porId(productos, pres[i].productoId);
      if (p && p.granelId) { var t = porId(productos, p.granelId); if (t && t.modoStock === 'tanque') return t; }
    }
    return null;
  }

  /* ---------- Acciones ---------- */
  var acciones = {};

  acciones.login = function (db, req) {
    var usuario = txt(req.datos && req.datos.usuario, 40).toLowerCase();
    var pin = txt(req.datos && req.datos.pin, 12);
    if (!usuario || !pin) throw err('VALIDACION', 'Ingresá usuario y PIN.');
    if (db.intentos('login:' + usuario, 0) >= 6) throw err('BLOQUEO', 'Demasiados intentos. Esperá 10 minutos y probá de nuevo.');
    var u = db.all('Usuarios').filter(function (x) { return String(x.usuario).toLowerCase() === usuario; })[0];
    if (!u || u.pinHash !== db.hash(u.id + '|' + pin)) {
      db.intentos('login:' + usuario, 1);
      try { db.lock(function () { registrarActividad(db, null, 'loginFallido', 'Intento de ingreso con PIN incorrecto para el usuario "' + usuario + '"'); }); } catch (e) { /* */ }
      throw err('LOGIN', 'Usuario o PIN incorrecto.');
    }
    if (u.activo !== 'si') throw err('LOGIN', 'Tu usuario está desactivado. Hablá con el administrador.');
    var token = (db.uuid() + db.uuid()).replace(/-/g, '');
    return db.lock(function () {
      // limpia sesiones vencidas
      var ahora = db.now();
      db.all('Sesiones').filter(function (s) { return s.expira < ahora; }).forEach(function (s) { db.del('Sesiones', s.id); });
      registrarActividad(db, u, 'login', 'Ingresó a la app');
      db.put('Sesiones', {
        id: db.hash(token), usuarioId: u.id, creado: ahora,
        expira: new Date(Date.parse(ahora) + SESION_DIAS * 86400000).toISOString()
      });
      var r = sincronizar(db, u);
      r.token = token;
      return r;
    });
  };

  acciones.logout = function (db, req) {
    try {
      var id = db.hash(req.token || '');
      db.lock(function () { if (porId(db.all('Sesiones'), id)) db.del('Sesiones', id); });
    } catch (e) { /* sin sesión: nada que cerrar */ }
    return { ok: true };
  };

  acciones.ping = function (db) { return { version: db.getVersion() }; };
  acciones.sync = function (db, req, u) { return sincronizar(db, u); };

  /* ----- Productos ----- */
  function limpiarProducto(db, x, previo) {
    var nombre = txt(x.nombre, 80);
    if (!nombre) throw err('VALIDACION', 'El producto necesita un nombre.');
    return {
      id: previo ? previo.id : nuevoId(db),
      codigo: txt(x.codigo, 30),
      nombre: nombre,
      categoria: txt(x.categoria, 40) || 'Otros',
      presentacion: txt(x.presentacion, 40),
      unidad: txt(x.unidad, 12) || 'u',
      costo: x.costo === undefined && previo ? previo.costo : num(x.costo, 0),
      precioMayorista: num(x.precioMayorista, 0),
      precioMinorista: num(x.precioMinorista, 0),
      stock: x.stock === undefined && previo ? previo.stock : num(x.stock),
      stockMinimo: num(x.stockMinimo, 0),
      activo: x.activo === undefined ? 'si' : si(x.activo),
      actualizado: db.now(),
      minMayorista: x.minMayorista === undefined && previo ? num(previo.minMayorista) : num(x.minMayorista, 0),
      modoStock: x.modoStock === undefined ? (previo ? previo.modoStock || '' : '') : (MODOS_STOCK.indexOf(x.modoStock) >= 0 ? x.modoStock : ''),
      granelId: x.granelId === undefined ? (previo ? previo.granelId || '' : '') : txt(x.granelId, 40),
      contenido: x.contenido === undefined ? (previo ? num(previo.contenido) : 0) : num(x.contenido, 0, 1000),
      web: x.web === undefined ? (previo ? previo.web || 'si' : 'si') : si(x.web)
    };
  }
  /** Revisa que el tanque elegido tenga sentido (existe, es tanque y no es el mismo producto). */
  function validarModoStock(db, p) {
    if (p.modoStock === 'envasado' || p.modoStock === 'granel') {
      var t = p.granelId ? porId(db.all('Productos'), p.granelId) : null;
      if (!t || t.id === p.id || t.modoStock !== 'tanque') throw err('VALIDACION', 'Elegí de qué tanque sale "' + p.nombre + '" (un producto marcado como tanque).');
      if (!(num(p.contenido) > 0)) p.contenido = litrosDeTexto(p.presentacion) || 1;
    } else p.granelId = '';
    if (p.modoStock === 'tanque') p.contenido = 1;
  }
  /** Precio de un producto según la lista del cliente y la cantidad (mayorista desde X unidades). */
  function precioItem(p, tipoPrecio, cantidad) {
    if (tipoPrecio !== 'minorista') return num(p.precioMayorista);
    return num(p.minMayorista) > 0 && num(cantidad) >= num(p.minMayorista) ? num(p.precioMayorista) : num(p.precioMinorista);
  }
  acciones.guardarProducto = function (db, req, u) {
    exigir(u, 'productos');
    var x = req.datos || {};
    var previo = x.id ? porId(db.all('Productos'), x.id) : null;
    var p = limpiarProducto(db, x, previo);
    validarModoStock(db, p);
    if (previo && previo.modoStock === 'tanque' && p.modoStock !== 'tanque' && db.all('Productos').some(function (o) { return o.granelId === p.id && o.activo === 'si'; })) {
      throw err('VALIDACION', 'Hay productos que se llenan desde este tanque. Cambiales el tanque primero.');
    }
    db.put('Productos', p);
    var cambios = [];
    if (previo) {
      [['precioMayorista', 'mayorista'], ['precioMinorista', 'minorista'], ['costo', 'costo']].forEach(function (c) {
        if (num(previo[c[0]]) !== num(p[c[0]])) cambios.push(c[1] + ' ' + plata(previo[c[0]]) + ' → ' + plata(p[c[0]]));
      });
    }
    return { log: (previo ? 'Editó' : 'Creó') + ' el producto ' + p.nombre + ' ' + p.presentacion + (cambios.length ? ' · ' + cambios.join(' · ') : '') };
  };
  /**
   * Edición rápida desde la tabla: cambia UN solo campo del producto
   * (así no pisa lo que otro compañero haya cambiado en otro campo).
   */
  var CAMPOS_RAPIDOS = {
    nombre: 'productos', presentacion: 'productos', codigo: 'productos',
    precioMayorista: 'precios', precioMinorista: 'precios', minMayorista: 'precios', costo: 'costos',
    stock: 'stock', stockMinimo: 'stock'
  };
  acciones.editarCampoProducto = function (db, req, u) {
    var d = req.datos || {};
    var tipo = CAMPOS_RAPIDOS[d.campo];
    if (!tipo) throw err('VALIDACION', 'Ese dato no se puede cambiar desde la tabla.');
    if (tipo === 'stock') {
      if (u.rol !== 'admin' && u.rol !== 'deposito') throw err('SIN_PERMISO', 'Solo administración o depósito cambian el stock.');
    } else if (tipo === 'costos') {
      exigir(u, 'productos'); exigir(u, 'costos');
    } else exigir(u, 'productos');
    var previo = porId(db.all('Productos'), d.id);
    if (!previo) throw err('NO_EXISTE', 'El producto ya no existe.');
    var x = JSON.parse(JSON.stringify(previo));
    var texto = d.campo === 'nombre' || d.campo === 'presentacion' || d.campo === 'codigo';
    if (texto) x[d.campo] = String(d.valor === undefined ? '' : d.valor);
    else {
      var crudo = String(d.valor === undefined || d.valor === null ? '' : d.valor).replace(',', '.').trim();
      var v = Number(crudo);
      if (crudo === '' || !isFinite(v) || v < 0) throw err('VALIDACION', 'Escribí un número válido (0 o más).');
      x[d.campo] = v;
    }
    var p = limpiarProducto(db, x, previo);
    db.put('Productos', p);
    var antes = texto ? '"' + previo[d.campo] + '"' : /precio|costo/.test(d.campo) ? plata(previo[d.campo]) : String(num(previo[d.campo]));
    var ahora = texto ? '"' + p[d.campo] + '"' : /precio|costo/.test(d.campo) ? plata(p[d.campo]) : String(num(p[d.campo]));
    return { log: 'Cambió ' + d.campo + ' de ' + p.nombre + ' ' + p.presentacion + ': ' + antes + ' → ' + ahora };
  };
  function norm(t) {
    return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }
  /**
   * Importa una planilla. Un producto que ya existe se ACTUALIZA (no se duplica):
   *  1) mismo código, 2) mismo nombre y presentación (sin importar mayúsculas,
   *  acentos ni espacios), 3) mismo nombre si la planilla no trae presentación.
   */
  acciones.importarProductos = function (db, req, u) {
    exigir(u, 'productos');
    var filas = (req.datos && req.datos.filas) || [];
    if (!filas.length) throw err('VALIDACION', 'No hay filas para importar.');
    if (filas.length > 3000) throw err('VALIDACION', 'Máximo 3000 productos por importación.');
    var porCodigo = {}, porNombrePres = {}, porNombre = {};
    var indexar = function (p) {
      if (p.codigo) porCodigo[norm(p.codigo)] = p;
      porNombrePres[norm(p.nombre) + '|' + norm(p.presentacion)] = p;
      var k = norm(p.nombre);
      porNombre[k] = porNombre[k] && porNombre[k] !== p ? 'varios' : p;
    };
    db.all('Productos').forEach(indexar);
    var nuevos = 0, actualizados = 0, vistos = {};
    filas.forEach(function (f) {
      var cod = norm(f.codigo), nom = norm(f.nombre), pres = norm(f.presentacion);
      if (!nom) return;
      var previo = (cod && porCodigo[cod]) || porNombrePres[nom + '|' + pres] || null;
      if (!previo && !pres && porNombre[nom] && porNombre[nom] !== 'varios') previo = porNombre[nom];
      var p = limpiarProducto(db, f, previo);
      if (previo) {
        // conserva lo que la planilla no trae
        ['codigo', 'categoria', 'presentacion', 'unidad', 'costo', 'stock', 'stockMinimo', 'precioMayorista', 'precioMinorista', 'minMayorista'].forEach(function (k) {
          if (f[k] === undefined || f[k] === '' || f[k] === null) p[k] = previo[k];
        });
        if (!vistos[previo.id]) actualizados++;
      } else nuevos++;
      vistos[p.id] = true;
      db.put('Productos', p);
      indexar(p);
    });
    var desactivados = 0;
    if (req.datos.desactivarFaltantes) {
      db.all('Productos').forEach(function (p) {
        if (!vistos[p.id] && p.activo === 'si') { p.activo = 'no'; p.actualizado = db.now(); db.put('Productos', p); desactivados++; }
      });
    }
    return { mensaje: nuevos + ' productos nuevos y ' + actualizados + ' actualizados' + (desactivados ? ', ' + desactivados + ' marcados como "no se vende"' : '') + '.' };
  };
  acciones.borrarProductos = function (db, req, u) {
    exigir(u, 'productos');
    var ids = ((req.datos && req.datos.ids) || []).filter(function (id) { return porId(db.all('Productos'), id); });
    if (!ids.length) throw err('VALIDACION', 'Elegí al menos un producto.');
    var nombres = ids.map(function (id) { var p = porId(db.all('Productos'), id); return p.nombre + ' ' + p.presentacion; });
    if (db.delMany) db.delMany('Productos', ids);
    else ids.forEach(function (id) { db.del('Productos', id); });
    return { mensaje: ids.length === 1 ? 'Producto eliminado.' : ids.length + ' productos eliminados.', log: 'Eliminó ' + ids.length + ' producto(s): ' + nombres.slice(0, 15).join(', ') + (nombres.length > 15 ? '…' : '') };
  };
  acciones.ajustarPrecios = function (db, req, u) {
    exigir(u, 'productos');
    var d = req.datos || {};
    var pct = num(d.pct, -90, 500);
    if (!pct) throw err('VALIDACION', 'Indicá un porcentaje distinto de cero.');
    var campos = (d.campos || []).filter(function (c) { return ['costo', 'precioMayorista', 'precioMinorista'].indexOf(c) >= 0; });
    if (!campos.length) throw err('VALIDACION', 'Elegí qué precios ajustar.');
    var n = 0;
    db.all('Productos').forEach(function (p) {
      if (d.categoria && p.categoria !== d.categoria) return;
      campos.forEach(function (c) { p[c] = Math.round(num(p[c]) * (1 + pct / 100)); });
      p.actualizado = db.now();
      db.put('Productos', p);
      n++;
    });
    return { mensaje: n + ' productos actualizados.' };
  };
  acciones.ajustarStock = function (db, req, u) {
    if (u.rol !== 'admin' && u.rol !== 'deposito') throw err('SIN_PERMISO', 'Solo administración o depósito ajustan stock.');
    var d = req.datos || {};
    var p = porId(db.all('Productos'), d.id);
    if (!p) throw err('NO_EXISTE', 'El producto ya no existe.');
    p.stock = redondear(num(p.stock) + num(d.cantidad));
    p.actualizado = db.now();
    db.put('Productos', p);
  };

  /**
   * Envasar: pasa litros del tanque a unidades envasadas.
   * Descuenta los envases (botella, tapa, etiqueta) si el producto está en una fórmula.
   */
  acciones.envasar = function (db, req, u) {
    if (u.rol !== 'admin' && u.rol !== 'deposito' && !puede(u, 'produccion')) throw err('SIN_PERMISO', 'Solo administración, depósito o producción pueden envasar.');
    var d = req.datos || {};
    var cant = Math.round(num(d.cantidad, 0));
    if (!(cant > 0) || cant > 100000) throw err('VALIDACION', 'Indicá cuántas unidades envasaste.');
    return db.lock(function () {
      var productos = db.all('Productos');
      var p = porId(productos, d.productoId);
      if (!p || p.modoStock !== 'envasado') throw err('VALIDACION', 'Ese producto no se envasa desde un tanque. Configuralo con el lápiz.');
      var t = porId(productos, p.granelId);
      if (!t) throw err('VALIDACION', 'El tanque de este producto ya no existe.');
      var litros = redondear(cant * contenidoDe(p));
      if (litros > num(t.stock) + 0.001 && !d.forzar) {
        throw err('SIN_STOCK', 'En el tanque de ' + t.nombre + ' hay ' + num(t.stock) + ' L y para ' + cant + ' × ' + p.presentacion + ' hacen falta ' + litros + ' L.');
      }
      t.stock = redondear(num(t.stock) - litros); t.actualizado = db.now(); db.put('Productos', t);
      p.stock = redondear(num(p.stock) + cant); p.actualizado = db.now(); db.put('Productos', p);
      var envases = [];
      var pf = presentacionDe(db.all('Formulas'), p.id);
      if (pf) {
        var insumos = db.all('Insumos');
        (pf.pres.envases || []).forEach(function (e) {
          var ins = porId(insumos, e.insumoId);
          if (!ins) return;
          var c = num(e.cantidad) * cant;
          ins.stock = redondear(num(ins.stock) - c); ins.actualizado = db.now(); db.put('Insumos', ins);
          envases.push(c + ' ' + ins.nombre);
        });
      }
      return {
        mensaje: 'Envasaste ' + cant + ' × ' + p.nombre + ' ' + p.presentacion + '. Quedan ' + num(t.stock) + ' L en el tanque.',
        log: 'Envasó ' + cant + ' × ' + p.nombre + ' ' + p.presentacion + ' (' + litros + ' L del tanque ' + t.nombre + (envases.length ? '; usó ' + envases.join(', ') : '') + ')'
      };
    });
  };

  /* ----- Clientes ----- */
  acciones.guardarCliente = function (db, req, u) {
    exigir(u, 'clientes');
    var x = req.datos || {};
    var nombre = txt(x.nombre, 80);
    if (!nombre) throw err('VALIDACION', 'El cliente necesita un nombre.');
    var previo = x.id ? porId(db.all('Clientes'), x.id) : null;
    var c = {
      id: previo ? previo.id : nuevoId(db),
      nombre: nombre,
      telefono: txt(x.telefono, 30),
      direccion: txt(x.direccion, 120),
      localidad: txt(x.localidad, 60),
      zonaId: txt(x.zonaId, 32),
      distanciaKm: num(x.distanciaKm, 0, 2000),
      tipoPrecio: x.tipoPrecio === 'minorista' ? 'minorista' : 'mayorista',
      limiteCredito: num(x.limiteCredito, 0),
      notas: txt(x.notas, 300),
      activo: x.activo === undefined ? 'si' : si(x.activo),
      creado: previo ? previo.creado : db.now(),
      email: x.email === undefined ? (previo ? previo.email || '' : '') : txt(x.email, 80),
      origen: previo ? previo.origen || '' : ''
    };
    db.put('Clientes', c);
    return { id: c.id };
  };

  /* ----- Zonas de envío ----- */
  acciones.guardarZona = function (db, req, u) {
    exigir(u, 'config');
    var x = req.datos || {};
    if (!txt(x.nombre)) throw err('VALIDACION', 'La zona necesita un nombre.');
    var previo = x.id ? porId(db.all('Zonas'), x.id) : null;
    db.put('Zonas', {
      id: previo ? previo.id : nuevoId(db), nombre: txt(x.nombre, 60),
      costoBase: num(x.costoBase, 0), costoKm: num(x.costoKm, 0), gratisDesde: num(x.gratisDesde, 0),
      activo: x.activo === undefined ? 'si' : si(x.activo)
    });
  };

  /* ----- Pedidos ----- */
  acciones.guardarPedido = function (db, req, u) {
    exigir(u, 'pedidos');
    var x = req.datos || {};
    var previo = x.id ? porId(db.all('Pedidos'), x.id) : null;
    if (previo && (previo.estado === 'entregado' || previo.estado === 'anulado') && u.rol !== 'admin') {
      throw err('SIN_PERMISO', 'Solo el administrador puede editar un pedido entregado o anulado.');
    }
    var cliente = porId(db.all('Clientes'), x.clienteId);
    if (!cliente) throw err('VALIDACION', 'Elegí un cliente.');
    recalcularSiCambioDolar(db); // costos de productos fabricados al dólar del día
    var productos = db.all('Productos');
    var items = (Array.isArray(x.items) ? x.items : []).slice(0, 200).map(function (it) {
      var p = porId(productos, it.productoId);
      if (!p) throw err('VALIDACION', 'Un producto del pedido ya no existe. Quitalo y volvé a agregarlo.');
      var cantidad = num(it.cantidad, 0);
      var lista = x.tipoPrecio === 'minorista' ? p.precioMinorista : p.precioMayorista;
      return {
        productoId: p.id, nombre: p.nombre, presentacion: p.presentacion, unidad: p.unidad,
        cantidad: cantidad,
        precio: it.precio === '' || it.precio === undefined ? precioItem(p, x.tipoPrecio, cantidad) : num(it.precio, 0),
        costo: num(p.costo)
      };
    }).filter(function (it) { return it.cantidad > 0; });
    if (!items.length) throw err('VALIDACION', 'Agregá al menos un producto con cantidad.');

    var zona = porId(db.all('Zonas'), x.zonaId);
    var km = num(x.distanciaKm, 0, 2000);
    var parcial = calcularTotales(items, x.descuentoPct, 0);
    var envioManual = si(x.envioManual);
    var envio = envioManual === 'si' ? num(x.envio, 0) : calcularEnvio(zona, km, parcial.subtotal - parcial.descuento);
    var t = calcularTotales(items, x.descuentoPct, envio);
    var ahora = db.now();

    return db.lock(function () {
      var p = previo ? porId(db.all('Pedidos'), previo.id) : null;
      if (p && p.stockDescontado === 'si') moverStock(db, p.items, +1); // devuelve lo anterior
      var pedido = {
        id: p ? p.id : nuevoId(db),
        numero: p ? p.numero : db.siguienteNumero(),
        clienteId: cliente.id, clienteNombre: cliente.nombre,
        tipoPrecio: x.tipoPrecio === 'minorista' ? 'minorista' : 'mayorista',
        items: items,
        subtotal: t.subtotal, descuentoPct: num(x.descuentoPct, 0, 100), descuento: t.descuento,
        envio: t.envio, envioManual: envioManual, total: t.total, costoTotal: t.costoTotal,
        pagado: p ? num(p.pagado) : 0,
        estado: p ? p.estado : 'nuevo',
        stockDescontado: p ? p.stockDescontado : 'no',
        zonaId: zona ? zona.id : '', distanciaKm: km,
        fechaEntrega: fecha(x.fechaEntrega), notas: txt(x.notas, 400),
        creadoPor: p ? p.creadoPor : u.id,
        creado: p ? p.creado : ahora, actualizado: ahora,
        historial: (p ? p.historial || [] : []).concat([{ f: ahora, u: u.nombre, a: p ? 'Editó el pedido' : 'Creó el pedido' }]).slice(-40),
        cotizacion: (dolarActual(db) || {}).valor || (p ? num(p.cotizacion) : 0),
        origen: p ? p.origen || '' : '', seguimiento: p ? p.seguimiento || '' : '', entrega: p ? p.entrega || '' : '', pagoWeb: p ? p.pagoWeb || '' : '', arrepentimiento: p ? p.arrepentimiento || '' : ''
      };
      if (pedido.pagado > pedido.total) throw err('VALIDACION', 'El total quedaría por debajo de lo ya cobrado. Revisá los pagos primero.');
      if (pedido.stockDescontado === 'si') moverStock(db, pedido.items, -1);
      db.put('Pedidos', pedido);
      return { id: pedido.id, numero: pedido.numero };
    });
  };

  acciones.cambiarEstado = function (db, req, u) {
    var d = req.datos || {};
    var nuevo = d.estado;
    if (ESTADOS.indexOf(nuevo) < 0) throw err('VALIDACION', 'Estado inválido.');
    return db.lock(function () {
      var p = porId(db.all('Pedidos'), d.id);
      if (!p) throw err('NO_EXISTE', 'El pedido ya no existe.');
      if (p.estado === nuevo) return;
      var tabla = TRANSICIONES[u.rol];
      if (tabla && (tabla[p.estado] || []).indexOf(nuevo) < 0) {
        throw err('SIN_PERMISO', 'Tu usuario no puede pasar este pedido a ese estado.');
      }
      if (nuevo === 'anulado' && num(p.pagado) > 0) throw err('VALIDACION', 'El pedido tiene pagos. Eliminá los pagos antes de anularlo.');
      var antes = p.estado;
      var debeDescontar = ESTADOS_CON_STOCK.indexOf(nuevo) >= 0;
      if (debeDescontar && p.stockDescontado !== 'si') { moverStock(db, p.items, -1); p.stockDescontado = 'si'; }
      if (!debeDescontar && p.stockDescontado === 'si') { moverStock(db, p.items, +1); p.stockDescontado = 'no'; }
      p.estado = nuevo;
      p.actualizado = db.now();
      p.historial = (p.historial || []).concat([{ f: p.actualizado, u: u.nombre, a: 'Estado: ' + antes + ' → ' + nuevo }]).slice(-40);
      db.put('Pedidos', p);
    });
  };

  /* ----- Pagos ----- */
  acciones.registrarPago = function (db, req, u) {
    exigir(u, 'pagos');
    var d = req.datos || {};
    var enUsd = d.moneda === 'USD', cot = 0;
    if (enUsd) {
      cot = num((dolarActual(db) || {}).valor);
      if (!cot) throw err('VALIDACION', 'No hay cotización del dólar disponible. Cargá una cotización manual en Ajustes.');
    }
    var monto = enUsd ? redondear(num(d.montoMoneda, 0) * cot) : redondear(num(d.monto, 0));
    if (monto <= 0) throw err('VALIDACION', 'Ingresá un monto mayor a cero.');
    var medio = MEDIOS.indexOf(d.medio) >= 0 ? d.medio : 'efectivo';
    return db.lock(function () {
      var pedidos = db.all('Pedidos');
      var cliente = d.clienteId;
      var primero = d.pedidoId ? porId(pedidos, d.pedidoId) : null;
      if (primero) cliente = primero.clienteId;
      if (!cliente) throw err('VALIDACION', 'Elegí el cliente o el pedido que paga.');
      // Primero el pedido elegido, después los más viejos del cliente
      var cola = pedidos.filter(function (p) { return p.clienteId === cliente && pendiente(p) > 0 && (!primero || p.id !== primero.id); })
        .sort(function (a, b) { return a.creado < b.creado ? -1 : 1; });
      if (primero && pendiente(primero) > 0) cola.unshift(primero);
      var deuda = cola.reduce(function (s, p) { return s + pendiente(p); }, 0);
      if (enUsd && monto > deuda && monto - deuda < cot / 100 + 1) monto = redondear(deuda); // diferencia de centavos al convertir
      if (monto > redondear(deuda) + 0.01) {
        throw err('VALIDACION', 'El pago ($' + monto + (enUsd ? ' = US$ ' + num(d.montoMoneda) : '') + ') supera lo que debe el cliente ($' + redondear(deuda) + (enUsd ? ' = US$ ' + redondear(deuda / cot) : '') + ').');
      }
      var resto = monto, ahora = db.now(), aplicados = 0;
      cola.forEach(function (p) {
        if (resto <= 0) return;
        var parte = Math.min(resto, pendiente(p));
        resto = redondear(resto - parte);
        p.pagado = redondear(num(p.pagado) + parte);
        p.actualizado = ahora;
        p.historial = (p.historial || []).concat([{ f: ahora, u: u.nombre, a: 'Pago ' + medio + ' $' + parte + (enUsd ? ' (US$ ' + redondear(parte / cot) + ' a $' + cot + ')' : '') }]).slice(-40);
        db.put('Pedidos', p);
        db.put('Pagos', {
          id: nuevoId(db), pedidoId: p.id, clienteId: cliente, monto: parte, medio: medio,
          fecha: fecha(d.fecha) || db.today(), usuarioId: u.id, nota: txt(d.nota, 200), creado: ahora,
          moneda: enUsd ? 'USD' : 'ARS', montoMoneda: enUsd ? redondear(parte / cot) : parte, cotizacion: enUsd ? cot : 0
        });
        aplicados++;
      });
      return { mensaje: aplicados > 1 ? 'Pago repartido en ' + aplicados + ' pedidos.' : 'Pago registrado.' };
    });
  };
  acciones.borrarPago = function (db, req, u) {
    if (u.rol !== 'admin') throw err('SIN_PERMISO', 'Solo el administrador puede eliminar pagos.');
    return db.lock(function () {
      var pago = porId(db.all('Pagos'), req.datos && req.datos.id);
      if (!pago) return;
      if (pago.rendicionId) throw err('VALIDACION', 'Ese cobro ya fue rendido en una caja. No se puede eliminar.');
      var p = porId(db.all('Pedidos'), pago.pedidoId);
      if (p) {
        p.pagado = Math.max(0, redondear(num(p.pagado) - num(pago.monto)));
        p.actualizado = db.now();
        p.historial = (p.historial || []).concat([{ f: p.actualizado, u: u.nombre, a: 'Eliminó pago $' + pago.monto }]).slice(-40);
        db.put('Pedidos', p);
      }
      db.del('Pagos', pago.id);
      return { log: 'Eliminó un cobro de ' + plata(pago.monto) + ' del pedido ' + nroP(p ? p.numero : 0) + (p ? ' (' + p.clienteNombre + ')' : '') };
    });
  };

  /* ----- Etiquetas para los envases (una por tipo de producto, sin litros) ----- */
  var TIPOS_ETIQUETA = [
    { re: /jab[oó]n (l[ií]quido )?(para |de )?pies/i, nombre: 'Jabón para Pies', color: '#0e9fb4',
      uso: 'Aplicar sobre los pies húmedos, masajear y enjuagar con abundante agua. Secar bien entre los dedos.',
      prec: 'Uso externo. Evitar el contacto con los ojos. Si ocurre, enjuagar con abundante agua.' },
    { re: /jab[oó]n (l[ií]quido )?(para|de) manos/i, nombre: 'Jabón para Manos', color: '#0e9fb4',
      uso: 'Aplicar sobre las manos húmedas, frotar durante 20 segundos y enjuagar con abundante agua.',
      prec: 'Evitar el contacto con los ojos. Si ocurre, enjuagar con abundante agua.' },
    { re: /jab[oó]n (l[ií]quido( para ropa)?|para ropa)/i, nombre: 'Jabón Líquido', color: '#1e63d6',
      uso: 'Lavarropas: 1 medida (100 ml) por carga. Lavado a mano: media medida cada 10 litros de agua. Agitar antes de usar.',
      prec: 'Evitar el contacto con los ojos. Si ocurre, enjuagar con abundante agua durante 15 minutos.' },
    { re: /(suavizante (de ropa )?en )?perlas( perfumadas)?/i, nombre: 'Perlas Perfumadas para Ropa', color: '#7c4dcc',
      uso: 'Colocar 1 medida de perlas en el tambor del lavarropas, junto con la ropa, antes de iniciar el lavado.',
      prec: 'Mantener el envase cerrado. No ingerir: puede confundirse con golosinas.' },
    { re: /suavizante/i, nombre: 'Suavizante', color: '#7c4dcc',
      uso: 'Agregar 1 medida (50 ml) en el último enjuague o en el compartimento del lavarropas. No volcar directamente sobre la ropa.',
      prec: 'Evitar el contacto con los ojos. No mezclar con lavandina.' },
    { re: /^cloro( l[ií]quido)?$/i, nombre: 'Cloro', color: '#f2c200',
      uso: 'Superficies: 1 cucharada (10 ml) por litro de agua, dejar actuar 10 minutos y enjuagar.',
      prec: 'NO MEZCLAR con detergentes, amoníaco, vinagre ni otros productos: libera gases tóxicos. Usar guantes y ventilar el ambiente. Mancha la ropa de color.' },
    { re: /lavandina/i, nombre: 'Lavandina', color: '#f2c200',
      uso: 'Superficies: 1 cucharada (10 ml) por litro de agua, dejar actuar 10 minutos y enjuagar. Ropa blanca: medio pocillo en el lavado.',
      prec: 'NO MEZCLAR con detergentes, amoníaco, vinagre ni otros productos: libera gases tóxicos. Usar guantes y ventilar el ambiente. Mancha la ropa de color.' },
    { re: /desengrasante/i, nombre: 'Desengrasante', color: '#d93025',
      uso: 'Aplicar puro o diluido sobre la superficie, dejar actuar unos minutos y retirar con un paño húmedo.',
      prec: 'Producto alcalino: usar guantes y evitar el contacto con piel y ojos. No aplicar sobre aluminio ni superficies calientes. No mezclar con lavandina.' },
    { re: /detergente/i, nombre: 'Detergente', color: '#0f9d58',
      uso: 'Colocar unas gotas sobre la esponja húmeda. Para mayor rendimiento, diluir en agua.',
      prec: 'Evitar el contacto con los ojos. No mezclar con lavandina.' },
    { re: /(desodorantes?|limpiador(es)?) de pisos?/i, nombre: 'Desodorante de Pisos', color: '#ef7d00',
      uso: 'Diluir medio pocillo (50 ml) en un balde con 5 litros de agua. Pasar el trapo y dejar secar.',
      prec: 'Evitar el contacto con los ojos. No mezclar con lavandina.' },
    { re: /perfuminas? textil(es)?|perfuminas?/i, nombre: 'Perfumina Textil', color: '#d63384',
      uso: 'Agitar y rociar a 30 cm sobre telas, cortinas y ambientes. Probar antes en una zona poco visible.',
      prec: 'No rociar sobre la piel ni hacia los ojos. No usar cerca del fuego.' },
    { re: /cipermetrina|insecticida/i, nombre: 'Insecticida Cipermetrina', color: '#6d4c41',
      uso: 'Diluir según la indicación del fabricante y aplicar en zócalos, rincones y lugares de paso de insectos.',
      prec: 'TÓXICO. No aplicar sobre alimentos, personas, mascotas ni utensilios de cocina. Usar guantes y barbijo. Lavarse las manos después de usar.' }
  ];
  var CATEGORIA_LIMPIEZA = /limpi|suaviz|deterg|jab|lavandin|desengras|desodor|perfumin|insectic/i;
  var NO_ENVASADO = /trapo|rejilla|papel|bols[oó]n|esponja|guante|balde|escoba|secador|envase|vac[ií]o|mopa/i;
  function nombreBase(n) {
    return String(n || '')
      .replace(/\b\d+([.,]\d+)?\s*g\s*\/\s*l\b/gi, '')
      .replace(/\b(x\s*)?\d+([.,]\d+)?\s*(lts?|litros?|l|ml|cc|kg|grs?|g)\b/gi, '')
      .replace(/\b(suelt[oa]s?|por litro|a granel)\b/gi, '')
      .replace(/\s+/g, ' ').trim();
  }
  /** Sugiere nombre, subtítulo, textos y color para la etiqueta de un producto. */
  function sugerirEtiqueta(nombreProducto) {
    var base = nombreBase(nombreProducto);
    for (var i = 0; i < TIPOS_ETIQUETA.length; i++) {
      var t = TIPOS_ETIQUETA[i], m = base.match(t.re);
      if (m) {
        var resto = (base.slice(0, m.index) + ' ' + base.slice(m.index + m[0].length)).replace(/\s+/g, ' ').trim().replace(/^(de|del|para)\s+/i, '');
        resto = resto.charAt(0).toUpperCase() + resto.slice(1);
        return { nombre: t.nombre, subtitulo: resto, uso: t.uso, precauciones: t.prec, color: t.color };
      }
    }
    return { nombre: base, subtitulo: '', uso: 'Usar según las indicaciones.', precauciones: 'Evitar el contacto con los ojos. No mezclar con otros productos.', color: '#1e40af' };
  }
  /** Etiquetas nuevas para los productos de limpieza que todavía no tienen una. */
  function etiquetasDesdeProductos(productos, existentes) {
    var ya = {}, nuevas = [];
    (existentes || []).forEach(function (e) { ya[(e.nombre + '|' + e.subtitulo).toLowerCase()] = true; });
    productos.forEach(function (p) {
      if (p.activo !== 'si' || !CATEGORIA_LIMPIEZA.test(p.categoria + ' ' + p.nombre) || NO_ENVASADO.test(p.nombre)) return;
      var e = sugerirEtiqueta(p.nombre);
      var k = (e.nombre + '|' + e.subtitulo).toLowerCase();
      if (!e.nombre || ya[k]) return;
      ya[k] = true;
      e.activo = 'si';
      nuevas.push(e);
    });
    return nuevas;
  }
  /* ----- Perfuminas: dibujo automático según el aroma ----- */
  /**
   * Cada aroma tiene un dibujo (en la pantalla) y un color. Se buscan las
   * palabras en el nombre del aroma: "Coco Vainilla" → coco + vainilla.
   * El orden importa: lo de más de una palabra va primero ("algodón de
   * azúcar" es un dulce, no algodón; "frutos rojos" no es "rojo").
   */
  var AROMAS = [
    { k: 'chicle', n: 'Chicle / dulce', c: '#e8559b', re: /algodon\s+(de\s+)?azucar|chicle|tutti|bubble|caramel|dulce de leche|dulce|golosina|marshmallow/ },
    { k: 'frutosrojos', n: 'Frutos rojos', c: '#9c2a5a', re: /frutos? rojos?|frutos del bosque|berr(y|ies)|arandano|moras?\b|frambues|grosella/ },
    { k: 'marina', n: 'Marina / brisa', c: '#1c8ccf', re: /brisa marina|marin|ocean|\bmar\b|brisa|\baqua|acqua|\bagua\b|fresh|lluvia|cielo/ },
    { k: 'menta', n: 'Menta / hierbas', c: '#2a9d6f', re: /te verde|menta|eucalipt|hierba|herbal|\bverde\b|bambu|aloe|\bpino|citronela|romero|albahaca|limon ?grass/ },
    { k: 'coco', n: 'Coco', c: '#7a4a2a', re: /\bcoco\b|coconut/ },
    { k: 'vainilla', n: 'Vainilla', c: '#c8902c', re: /vainill|vanill/ },
    { k: 'lavanda', n: 'Lavanda', c: '#8a67c7', re: /lavand|lavender|lila\b/ },
    { k: 'rosa', n: 'Rosa', c: '#d9416f', re: /\brosas?\b|\brose\b|rosa mosqueta/ },
    { k: 'jazmin', n: 'Jazmín', c: '#b39b2e', re: /jazmin|jasmin/ },
    { k: 'limon', n: 'Limón / cítricos', c: '#d4a90f', re: /limon|lemon|\blima\b|citric|citrus/ },
    { k: 'naranja', n: 'Naranja', c: '#ee7d12', re: /naranj|mandarin|orange|azahar|pomelo/ },
    { k: 'frutilla', n: 'Frutilla', c: '#e0313f', re: /frutill|fresa|strawberr/ },
    { k: 'manzana', n: 'Manzana', c: '#4f9e2c', re: /manzan|apple/ },
    { k: 'durazno', n: 'Durazno', c: '#ef8355', re: /durazn|melocot|peach|damasco/ },
    { k: 'uva', n: 'Uva', c: '#73358a', re: /\buvas?\b|grape|\bvino/ },
    { k: 'sandia', n: 'Sandía / melón', c: '#e0435a', re: /sandia|melon|watermelon/ },
    { k: 'cereza', n: 'Cereza', c: '#bf1e3a', re: /cerez|cherry|guinda/ },
    { k: 'tropical', n: 'Tropical', c: '#e99a0f', re: /tropical|anana|\bpina\b|mango|maracuy|pineapple|papaya|banana|kiwi/ },
    { k: 'talco', n: 'Talco / bebé', c: '#6e9fd9', re: /talco|bebe|baby|bebito|johnson/ },
    { k: 'algodon', n: 'Algodón / ropa limpia', c: '#5f8fcf', re: /algodon|cotton|ropa limpia|limpi|suaviz|nube|blanc/ },
    { k: 'cafe', n: 'Café / chocolate', c: '#6b4226', re: /\bcafe|coffee|chocolat|cacao|capuch/ },
    { k: 'canela', n: 'Canela / especias', c: '#b0602a', re: /canela|cinnamon|especia|clavo|jengibre|anis/ },
    { k: 'madera', n: 'Maderas / ámbar', c: '#86643f', re: /sandalo|madera|amader|cedro|wood|ambar|oriental|almizcle|musk|patchouli|vetiver|tabaco|cuero/ },
    { k: 'floral', n: 'Floral', c: '#cc4f9f', re: /flor|floral|primavera|jardin|magnolia|lirio|violeta|gardenia|orquid|peonia|nardo|tulipan|fresia|camelia|margarita/ },
    { k: 'perfume', n: 'Perfume (frasco)', c: '#6650c8', re: /perfume|fragancia|inspirad|eau de|parfum|212|carolina|paco|million|invictus|good girl|chanel|olympea|dior|versace|lacoste|kenzo|cher\b|ricci|moschino/ }
  ];
  var CLAVES_AROMA = AROMAS.map(function (a) { return a.k; });
  /**
   * Devuelve los aromas que se reconocen en un texto (máximo 3, en el
   * orden en que aparecen). Si no reconoce ninguno, devuelve [].
   */
  function aromasDe(texto) {
    var t = ' ' + norm(texto).replace(/\bperfumin\w*|\btextil\w*|\baromatizante\w*|\bambiental\w*|\bpara ropa\b|\bde\b|\by\b|\bcon\b/g, ' ') + ' ';
    var hallados = [];
    AROMAS.forEach(function (a) {
      var m = t.match(a.re);
      if (!m) return;
      hallados.push({ k: a.k, i: m.index });
      // lo ya reconocido no se vuelve a usar ("algodon de azucar" no da también "algodon")
      t = t.slice(0, m.index) + new Array(m[0].length + 1).join(' ') + t.slice(m.index + m[0].length);
    });
    hallados.sort(function (a, b) { return a.i - b.i; });
    return hallados.slice(0, 3).map(function (h) { return h.k; });
  }
  /** Dibujos de una etiqueta: los elegidos a mano o los automáticos por aroma. */
  function dibujosEtiqueta(e) {
    var elegidos = String((e && e.dibujo) || '').split(',').filter(function (k) { return CLAVES_AROMA.indexOf(k) >= 0; });
    if (elegidos.length) return elegidos.slice(0, 3);
    var auto = aromasDe((e && e.subtitulo) || '');
    if (!auto.length) auto = aromasDe((e && e.nombre) || '');
    return auto.length ? auto : ['perfume'];
  }
  function colorAroma(k) {
    for (var i = 0; i < AROMAS.length; i++) if (AROMAS[i].k === k) return AROMAS[i].c;
    return '#6650c8';
  }
  var TEXTOS_PERFUMINA = {
    uso: 'Agitar antes de usar. Rociar a 30 cm sobre ropa, cortinas, sillones y ambientes. Probar antes en una parte que no se vea.',
    prec: 'No aplicar sobre la piel ni cerca del fuego. Evitar el contacto con los ojos. No usar en prendas de seda o cuero.'
  };
  /** Crea de una vez varias perfuminas: una etiqueta por aroma (no repite las que ya existen). */
  acciones.crearPerfuminas = function (db, req, u) {
    exigir(u, 'productos');
    var d = req.datos || {};
    var nombre = txt(d.nombre, 60) || 'Perfumina Textil';
    var aromas = (Array.isArray(d.aromas) ? d.aromas : String(d.aromas || '').split(/\n|;/))
      .map(function (a) { return txt(a, 60); }).filter(Boolean).slice(0, 80);
    if (!aromas.length) throw err('VALIDACION', 'Escribí al menos un aroma.');
    var ya = {};
    db.all('Etiquetas').forEach(function (e) { ya[norm(e.nombre) + '|' + norm(e.subtitulo)] = true; });
    var creadas = 0;
    aromas.forEach(function (a) {
      var k = norm(nombre) + '|' + norm(a);
      if (ya[k]) return;
      ya[k] = true;
      var dib = dibujosEtiqueta({ subtitulo: a });
      db.put('Etiquetas', { id: nuevoId(db), nombre: nombre, subtitulo: a, uso: TEXTOS_PERFUMINA.uso, precauciones: TEXTOS_PERFUMINA.prec,
        color: colorAroma(dib[0]), activo: 'si', actualizado: db.now(), dibujo: '', imagen: '' });
      creadas++;
    });
    return { mensaje: creadas ? creadas + ' perfumina' + (creadas > 1 ? 's' : '') + ' creada' + (creadas > 1 ? 's' : '') + '.' : 'Esos aromas ya tenían etiqueta.',
      log: 'Creó ' + creadas + ' etiquetas de perfumina (' + aromas.slice(0, 5).join(', ') + (aromas.length > 5 ? '…' : '') + ')' };
  };
  acciones.generarEtiquetas = function (db, req, u) {
    exigir(u, 'productos');
    var nuevas = etiquetasDesdeProductos(db.all('Productos'), db.all('Etiquetas'));
    nuevas.forEach(function (e) { e.id = nuevoId(db); e.actualizado = db.now(); db.put('Etiquetas', e); });
    return { mensaje: nuevas.length ? nuevas.length + ' etiquetas creadas desde tus productos de limpieza.' : 'Todos tus productos de limpieza ya tienen etiqueta.' };
  };
  acciones.guardarEtiqueta = function (db, req, u) {
    exigir(u, 'productos');
    var x = req.datos || {};
    var nombre = txt(x.nombre, 60);
    if (!nombre) throw err('VALIDACION', 'La etiqueta necesita el nombre del producto.');
    var previo = x.id ? porId(db.all('Etiquetas'), x.id) : null;
    var e = {
      id: previo ? previo.id : nuevoId(db), nombre: nombre, subtitulo: txt(x.subtitulo, 60),
      uso: txt(x.uso, 400), precauciones: txt(x.precauciones, 400),
      color: /^#[0-9a-f]{6}$/i.test(String(x.color || '')) ? x.color : '#1e40af',
      activo: x.activo === undefined ? 'si' : si(x.activo), actualizado: db.now(),
      dibujo: String(x.dibujo || '').split(',').filter(function (k) { return CLAVES_AROMA.indexOf(k) >= 0; }).slice(0, 3).join(','),
      imagen: imagenEtiqueta(x.imagen === undefined && previo ? previo.imagen : x.imagen)
    };
    db.put('Etiquetas', e);
    return { id: e.id };
  };
  /** Foto propia de la etiqueta: imagen chica (la achica la pantalla) que entra en una celda de la planilla. */
  function imagenEtiqueta(v) {
    v = String(v || '');
    if (!v) return '';
    if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/.test(v)) throw err('VALIDACION', 'La foto tiene que ser JPG, PNG o WEBP.');
    if (v.length > 48000) throw err('VALIDACION', 'La foto es muy pesada. Probá con otra más chica.');
    return v;
  }
  acciones.borrarEtiqueta = function (db, req, u) {
    exigir(u, 'productos');
    var id = req.datos && req.datos.id;
    if (porId(db.all('Etiquetas'), id)) db.del('Etiquetas', id);
  };

  /* ============================================================
   * CENTRO DE PRODUCCIÓN: insumos, fórmulas y producción
   * - Los insumos tienen precio en pesos o en dólares (se convierte
   *   al dólar oficial del día).
   * - Cada fórmula se conecta a las presentaciones que se venden
   *   (bidón 5 L, botella 1 L, suelto por litro) con sus envases.
   * - El costo de esos productos se recalcula solo.
   * ============================================================ */
  var UNIDADES_INSUMO = ['kg', 'L', 'u'];
  var TIPOS_INSUMO = ['materia', 'envase', 'otro'];
  var FACTOR_UNIDAD = { g: { f: 0.001, d: 'masa' }, kg: { f: 1, d: 'masa' }, ml: { f: 0.001, d: 'vol' }, L: { f: 1, d: 'vol' }, u: { f: 1, d: 'u' } };

  /** Costo de 1 unidad base del insumo (1 kg, 1 L o 1 u) en pesos. */
  function costoUnitInsumo(ins, dolar) {
    var precio = num(ins.precioEnvase) * (ins.moneda === 'USD' ? num(dolar) : 1);
    return num(ins.cantidadEnvase) > 0 ? precio / num(ins.cantidadEnvase) : 0;
  }
  /** Pasa una cantidad (g, kg, ml, L, u) a la unidad base del insumo, usando la densidad si hace falta. */
  function aUnidadInsumo(cantidad, unidad, ins) {
    var u = FACTOR_UNIDAD[unidad] || FACTOR_UNIDAD[ins.unidad] || FACTOR_UNIDAD.u;
    var c = num(cantidad) * u.f, dens = num(ins.densidad) || 1;
    if (ins.unidad === 'kg') return u.d === 'vol' ? c * dens : c;
    if (ins.unidad === 'L') return u.d === 'masa' ? c / dens : c;
    return num(cantidad);
  }
  /**
   * FÓRMULAS EN PORCENTAJE (modo 'pct'): cada ingrediente es un % del peso
   * total de la tanda (18 g en 1 kg = 1,8 %). Los gramos salen de:
   *   tanda (L) × densidad del producto terminado (kg/L, 1 si no se sabe) × 1000 × % / 100
   * Un ingrediente puede ser "resto" (el agua): completa lo que falta para 100 %.
   * Los insumos que se cuentan por unidad (u) siguen con su cantidad fija.
   * Se guardan los gramos calculados, así costos y producción funcionan igual.
   */
  function gramosTanda(f) { return num(f.rinde) * (num(f.densidad) || 1) * 1000; }
  function resolverPorcentajes(f) {
    if (!f || f.modo !== 'pct') return { total: 0, fijos: 0, resto: null };
    var total = gramosTanda(f), fijos = 0, resto = null;
    (f.ingredientes || []).forEach(function (it) {
      if (it.unidad === 'u') return;
      if (it.resto && !resto) resto = it; else { it.resto = false; fijos += num(it.pct); }
    });
    if (resto) resto.pct = Math.max(0, Math.round((100 - fijos) * 10000) / 10000);
    (f.ingredientes || []).forEach(function (it) {
      if (it.unidad === 'u') return;
      it.cantidad = Math.round(num(it.pct) * total / 100 * 100) / 100;
      it.unidad = 'g';
    });
    return { total: Math.round((fijos + (resto ? resto.pct : 0)) * 10000) / 10000, fijos: fijos, resto: resto };
  }
  /** Gramos de un ingrediente cargado en otra unidad (para pasar una fórmula vieja a %). */
  function aGramos(cantidad, unidad, ins) {
    var u = FACTOR_UNIDAD[unidad];
    if (!u || u.d === 'u') return 0;
    var c = num(cantidad) * u.f; // kg o L
    return (u.d === 'vol' ? c * (num(ins && ins.densidad) || 1) : c) * 1000;
  }
  /** Costo completo de una fórmula: tanda, por litro y detalle por ingrediente. */
  function costoFormula(f, insumos, dolar) {
    var idx = {};
    (insumos || []).forEach(function (i) { idx[i.id] = i; });
    var faltaDolar = false, detalle = [], ingredientes = 0;
    (f.ingredientes || []).forEach(function (it) {
      var ins = idx[it.insumoId];
      if (!ins) { detalle.push({ insumoId: it.insumoId, base: 0, costo: 0, falta: true }); return; }
      if (ins.moneda === 'USD' && !num(dolar)) faltaDolar = true;
      var base = aUnidadInsumo(it.cantidad, it.unidad, ins);
      var costo = base * costoUnitInsumo(ins, dolar);
      ingredientes += costo;
      detalle.push({ insumoId: ins.id, base: base, costo: costo });
    });
    var ex = f.extras || {};
    var manoObra = num(ex.minutos) / 60 * num(ex.valorHora);
    var tanda = ingredientes + manoObra + num(ex.otros);
    var rinde = num(f.rinde);
    return { ingredientes: ingredientes, manoObra: manoObra, otros: num(ex.otros), tanda: tanda,
      porLitro: rinde > 0 ? tanda / rinde : 0, detalle: detalle, faltaDolar: faltaDolar };
  }
  /** Costo de una presentación: litros × costo por litro + envases (bidón, tapa, etiqueta…). */
  function costoPresentacion(pres, porLitro, insumos, dolar) {
    var idx = {};
    (insumos || []).forEach(function (i) { idx[i.id] = i; });
    var envases = 0;
    (pres.envases || []).forEach(function (e) {
      var ins = idx[e.insumoId];
      if (ins) envases += num(e.cantidad) * costoUnitInsumo(ins, dolar);
    });
    var liquido = num(pres.litros) * num(porLitro);
    return { liquido: liquido, envases: envases, total: liquido + envases };
  }
  /** Precio sugerido: costo + % de ganancia, redondeado hacia arriba a $10. */
  function precioSugerido(costo, pct) { return costo > 0 ? Math.ceil(costo * (1 + num(pct) / 100) / 10) * 10 : 0; }
  /** Litros de una presentación a partir de su texto ("Bidón 5 L", "Por litro", "500 ml"). */
  function litrosDeTexto(t) {
    t = String(t || '').toLowerCase().replace(',', '.');
    if (/por litro|suelto|granel/.test(t)) return 1;
    var m = t.match(/(\d+(?:\.\d+)?)\s*(ml|cc|cm3)/);
    if (m) return Number(m[1]) / 1000;
    m = t.match(/(\d+(?:\.\d+)?)\s*(l|lt|lts|litros?|kg)\b/);
    return m ? Number(m[1]) : 0;
  }

  /** Actualiza el costo de los productos conectados a fórmulas. Devuelve cuántos cambiaron. */
  function recalcularCostos(db) {
    var dolar = num((dolarActual(db) || {}).valor);
    var insumos = db.all('Insumos'), productos = db.all('Productos'), n = 0;
    db.all('Formulas').forEach(function (f) {
      if (f.activo !== 'si' || f.actualizarCosto === 'no') return;
      var c = costoFormula(f, insumos, dolar);
      if (c.faltaDolar) return;
      (f.presentaciones || []).forEach(function (pr) {
        var p = porId(productos, pr.productoId);
        if (!p) return;
        var costo = redondear(costoPresentacion(pr, c.porLitro, insumos, dolar).total);
        if (Math.abs(num(p.costo) - costo) >= 0.5) { p.costo = costo; p.actualizado = db.now(); db.put('Productos', p); n++; }
      });
    });
    if (dolar) db.put('Config', { id: 'dolarCostos', valor: String(dolar) });
    return n;
  }
  /** Si el dólar se movió más de 0,5 % desde el último recálculo, actualiza los costos. */
  function recalcularSiCambioDolar(db) {
    var dolar = num((dolarActual(db) || {}).valor), ultimo = 0;
    if (!dolar || !db.all('Formulas').length) return;
    db.all('Config').forEach(function (c) { if (c.id === 'dolarCostos') ultimo = num(c.valor); });
    if (!ultimo || Math.abs(dolar - ultimo) / ultimo > 0.005) recalcularCostos(db);
  }
  function exigirProduccion(u) {
    if (!puede(u, 'produccion')) throw err('SIN_PERMISO', 'Tu usuario no tiene permiso de producción. Pedíselo al administrador.');
  }
  function exigirAdmin(u) { if (u.rol !== 'admin') throw err('SIN_PERMISO', 'Solo el administrador puede hacer esto.'); }

  /* ----- Insumos ----- */
  function limpiarInsumo(db, x, previo) {
    var nombre = txt(x.nombre, 80);
    if (!nombre) throw err('VALIDACION', 'El insumo necesita un nombre.');
    var unidad = UNIDADES_INSUMO.indexOf(x.unidad) >= 0 ? x.unidad : 'kg';
    return {
      id: previo ? previo.id : nuevoId(db), nombre: nombre,
      tipo: TIPOS_INSUMO.indexOf(x.tipo) >= 0 ? x.tipo : 'materia',
      unidad: unidad,
      precioEnvase: num(x.precioEnvase, 0), cantidadEnvase: num(x.cantidadEnvase, 0) || 1,
      moneda: x.moneda === 'USD' ? 'USD' : 'ARS',
      densidad: num(x.densidad, 0) || 1,
      stock: x.stock === undefined && previo ? num(previo.stock) : redondear(num(x.stock)),
      stockMinimo: num(x.stockMinimo, 0), proveedor: txt(x.proveedor, 80),
      activo: x.activo === undefined ? 'si' : si(x.activo), actualizado: db.now()
    };
  }
  acciones.guardarInsumo = function (db, req, u) {
    exigirAdmin(u);
    var x = req.datos || {};
    var previo = x.id ? porId(db.all('Insumos'), x.id) : null;
    var ins = limpiarInsumo(db, x, previo);
    db.put('Insumos', ins);
    var n = recalcularCostos(db);
    return { id: ins.id, mensaje: 'Insumo guardado.' + (n ? ' Se actualizó el costo de ' + n + ' producto' + (n > 1 ? 's' : '') + '.' : '') };
  };
  acciones.borrarInsumo = function (db, req, u) {
    exigirAdmin(u);
    var id = req.datos && req.datos.id;
    var usan = db.all('Formulas').filter(function (f) {
      return (f.ingredientes || []).some(function (i) { return i.insumoId === id; }) ||
        (f.presentaciones || []).some(function (p) { return (p.envases || []).some(function (e) { return e.insumoId === id; }); });
    });
    if (usan.length) throw err('VALIDACION', 'Lo usan estas fórmulas: ' + usan.map(function (f) { return f.nombre; }).join(', ') + '. Quitalo de ahí primero.');
    if (porId(db.all('Insumos'), id)) db.del('Insumos', id);
    return { mensaje: 'Insumo eliminado.' };
  };
  /** Compra o ajuste de stock de un insumo. Opcionalmente actualiza el precio. */
  acciones.movimientoInsumo = function (db, req, u) {
    exigirProduccion(u);
    var d = req.datos || {};
    var ins = porId(db.all('Insumos'), d.id);
    if (!ins) throw err('NO_EXISTE', 'El insumo ya no existe.');
    var cant = num(d.cantidad);
    if (!cant) throw err('VALIDACION', 'Ingresá una cantidad distinta de cero.');
    ins.stock = redondear(num(ins.stock) + cant);
    var cambioPrecio = false;
    if (u.rol === 'admin' && num(d.precioEnvase) > 0) {
      ins.precioEnvase = num(d.precioEnvase);
      if (num(d.cantidadEnvase) > 0) ins.cantidadEnvase = num(d.cantidadEnvase);
      if (d.moneda === 'USD' || d.moneda === 'ARS') ins.moneda = d.moneda;
      cambioPrecio = true;
    }
    ins.actualizado = db.now();
    db.put('Insumos', ins);
    var n = cambioPrecio ? recalcularCostos(db) : 0;
    return { mensaje: (cant > 0 ? 'Entrada' : 'Salida') + ' registrada.' + (n ? ' Costo actualizado en ' + n + ' productos.' : '') };
  };

  /* ----- Fórmulas ----- */
  acciones.guardarFormula = function (db, req, u) {
    exigirAdmin(u);
    var x = req.datos || {};
    var nombre = txt(x.nombre, 80);
    if (!nombre) throw err('VALIDACION', 'La fórmula necesita un nombre.');
    if (!(num(x.rinde) > 0)) throw err('VALIDACION', 'Indicá cuántos litros rinde la tanda.');
    var insumos = db.all('Insumos'), productos = db.all('Productos');
    var previo = x.id ? porId(db.all('Formulas'), x.id) : null;
    var modo = x.modo === 'pct' ? 'pct' : 'cant';
    var f = {
      id: previo ? previo.id : nuevoId(db), nombre: nombre, modo: modo, densidad: num(x.densidad, 0, 3) || 1,
      ingredientes: (Array.isArray(x.ingredientes) ? x.ingredientes : []).slice(0, 60).map(function (i) {
        var o = { insumoId: txt(i.insumoId, 32), cantidad: num(i.cantidad, 0), unidad: FACTOR_UNIDAD[i.unidad] ? i.unidad : 'kg' };
        if (modo === 'pct' && o.unidad !== 'u') { o.pct = num(i.pct, 0, 100); o.resto = i.resto === true; }
        return o;
      }).filter(function (i) { return porId(insumos, i.insumoId) && (i.unidad === 'u' || modo !== 'pct' ? i.cantidad > 0 : i.pct > 0 || i.resto); }),
      rinde: num(x.rinde, 0),
      extras: { minutos: num((x.extras || {}).minutos, 0), valorHora: num((x.extras || {}).valorHora, 0), otros: num((x.extras || {}).otros, 0) },
      presentaciones: (Array.isArray(x.presentaciones) ? x.presentaciones : []).slice(0, 20).map(function (p) {
        return {
          productoId: txt(p.productoId, 32), litros: num(p.litros, 0),
          envases: (p.envases || []).slice(0, 10).map(function (e) { return { insumoId: txt(e.insumoId, 32), cantidad: num(e.cantidad, 0) }; })
            .filter(function (e) { return porId(insumos, e.insumoId) && e.cantidad > 0; })
        };
      }).filter(function (p) { return porId(productos, p.productoId) && p.litros > 0; }),
      margenMay: num(x.margenMay, 0, 1000), margenMin: num(x.margenMin, 0, 1000),
      actualizarCosto: x.actualizarCosto === false || x.actualizarCosto === 'no' ? 'no' : 'si',
      notas: txt(x.notas, 600), activo: x.activo === undefined ? 'si' : si(x.activo),
      creado: previo ? previo.creado : db.now(), actualizado: db.now()
    };
    if (!f.ingredientes.length) throw err('VALIDACION', 'Agregá al menos un ingrediente.');
    if (modo === 'pct') {
      var r = resolverPorcentajes(f);
      if (r.fijos > 100.0001) throw err('VALIDACION', 'Los porcentajes suman ' + redondear(r.fijos) + ' %: se pasan del 100 %. Revisalos.');
      if (Math.abs(r.total - 100) > 0.05) throw err('VALIDACION', 'Los porcentajes suman ' + redondear(r.total) + ' % y tienen que sumar 100 %. Marcá el agua como "completa al 100 %" o corregí los valores.');
      f.ingredientes = f.ingredientes.filter(function (i) { return i.cantidad > 0; });
    }
    db.put('Formulas', f);
    var n = recalcularCostos(db);
    return { id: f.id, mensaje: 'Fórmula guardada.' + (n ? ' Costo actualizado en ' + n + ' producto' + (n > 1 ? 's' : '') + '.' : '') };
  };
  acciones.borrarFormula = function (db, req, u) {
    exigirAdmin(u);
    var id = req.datos && req.datos.id;
    if (porId(db.all('Formulas'), id)) db.del('Formulas', id);
    return { mensaje: 'Fórmula eliminada. Los productos conservan su último costo.' };
  };
  /** Pone en los productos de la fórmula el precio sugerido según sus % de ganancia. */
  acciones.aplicarPreciosFormula = function (db, req, u) {
    exigirAdmin(u);
    var f = porId(db.all('Formulas'), req.datos && req.datos.id);
    if (!f) throw err('NO_EXISTE', 'La fórmula ya no existe.');
    var dolar = num((dolarActual(db) || {}).valor), insumos = db.all('Insumos'), productos = db.all('Productos');
    var c = costoFormula(f, insumos, dolar), n = 0;
    if (c.faltaDolar) throw err('VALIDACION', 'Hay insumos en dólares y no hay cotización. Cargá una cotización manual en Ajustes.');
    (f.presentaciones || []).forEach(function (pr) {
      var p = porId(productos, pr.productoId);
      if (!p) return;
      var costo = costoPresentacion(pr, c.porLitro, insumos, dolar).total;
      if (num(f.margenMay) > 0) p.precioMayorista = precioSugerido(costo, f.margenMay);
      if (num(f.margenMin) > 0) p.precioMinorista = precioSugerido(costo, f.margenMin);
      p.costo = redondear(costo); p.actualizado = db.now();
      db.put('Productos', p); n++;
    });
    return { mensaje: 'Precios actualizados en ' + n + ' producto' + (n === 1 ? '' : 's') + '.' };
  };
  acciones.recalcularCostos = function (db, req, u) {
    exigirAdmin(u);
    var n = recalcularCostos(db);
    return { mensaje: n ? 'Costo actualizado en ' + n + ' productos.' : 'Los costos ya estaban al día.' };
  };

  /* ----- Producción ----- */
  /** Calcula qué insumos consume y qué productos salen de una tanda (sin guardar nada). */
  function planProduccion(f, litros, salidas, insumos, productos, dolar) {
    var factor = num(f.rinde) > 0 ? num(litros) / num(f.rinde) : 0;
    var idxIns = {}, consumo = {};
    insumos.forEach(function (i) { idxIns[i.id] = i; });
    var sumar = function (insumoId, cant) { consumo[insumoId] = (consumo[insumoId] || 0) + cant; };
    var pctDe = {};
    (f.ingredientes || []).forEach(function (it) {
      var ins = idxIns[it.insumoId];
      if (!ins) return;
      sumar(ins.id, aUnidadInsumo(it.cantidad, it.unidad, ins) * factor);
      if (f.modo === 'pct' && it.unidad !== 'u') pctDe[ins.id] = (pctDe[ins.id] || 0) + num(it.pct);
    });
    var litrosEnvasados = 0, sal = [];
    (salidas || []).forEach(function (s) {
      var cant = num(s.cantidad, 0);
      if (!cant) return;
      var pr = (f.presentaciones || []).filter(function (p) { return p.productoId === s.productoId; })[0];
      var prod = porId(productos, s.productoId);
      if (!pr || !prod) return;
      litrosEnvasados += cant * num(pr.litros);
      (pr.envases || []).forEach(function (e) { if (idxIns[e.insumoId]) sumar(e.insumoId, num(e.cantidad) * cant); });
      sal.push({ productoId: prod.id, nombre: prod.nombre, presentacion: prod.presentacion, cantidad: cant, litros: num(pr.litros) });
    });
    var consumos = Object.keys(consumo).map(function (id) {
      var ins = idxIns[id];
      return { insumoId: id, nombre: ins.nombre, unidad: ins.unidad, cantidad: redondear(consumo[id] * 1000) / 1000,
        costo: redondear(consumo[id] * costoUnitInsumo(ins, dolar)), stock: num(ins.stock),
        pct: pctDe[id] !== undefined ? Math.round(pctDe[id] * 10000) / 10000 : null,
        gramos: ins.unidad === 'u' ? null : Math.round(consumo[id] * (ins.unidad === 'L' ? (num(ins.densidad) || 1) : 1) * 1000 * 10) / 10 };
    });
    var costoTotal = consumos.reduce(function (s, c) { return s + c.costo; }, 0) +
      (num(f.rinde) > 0 ? factor * (num((f.extras || {}).minutos) / 60 * num((f.extras || {}).valorHora) + num((f.extras || {}).otros)) : 0);
    return { factor: factor, consumos: consumos, salidas: sal, litrosEnvasados: redondear(litrosEnvasados), costoTotal: redondear(costoTotal) };
  }
  acciones.registrarProduccion = function (db, req, u) {
    exigirProduccion(u);
    var d = req.datos || {};
    var f = porId(db.all('Formulas'), d.formulaId);
    if (!f) throw err('VALIDACION', 'Elegí una fórmula.');
    var litros = num(d.litros, 0);
    if (!(litros > 0)) throw err('VALIDACION', 'Indicá cuántos litros fabricaste.');
    var dolar = num((dolarActual(db) || {}).valor);
    return db.lock(function () {
      var insumos = db.all('Insumos'), productos = db.all('Productos');
      var plan = planProduccion(f, litros, d.salidas, insumos, productos, dolar);
      if (plan.litrosEnvasados > litros * 1.02 + 0.01) {
        throw err('VALIDACION', 'Envasaste ' + plan.litrosEnvasados + ' L pero la tanda es de ' + litros + ' L. Revisá las cantidades.');
      }
      plan.consumos.forEach(function (c) {
        var ins = porId(insumos, c.insumoId);
        ins.stock = redondear(num(ins.stock) - c.cantidad); ins.actualizado = db.now();
        db.put('Insumos', ins);
      });
      // lo que no se envasó queda en el tanque (si la fórmula tiene uno)
      var tanque = d.tanqueId ? porId(productos, d.tanqueId) : tanqueDeFormula(f, productos);
      var sobrante = redondear(litros - plan.litrosEnvasados);
      if (tanque && tanque.modoStock === 'tanque' && sobrante > 0 && !plan.salidas.some(function (s) { return s.productoId === tanque.id; })) {
        plan.salidas.push({ productoId: tanque.id, nombre: tanque.nombre, presentacion: tanque.presentacion, cantidad: sobrante, litros: 1, tanque: true });
      }
      plan.salidas.forEach(function (s) {
        var p = porId(productos, s.productoId);
        p.stock = redondear(num(p.stock) + s.cantidad); p.actualizado = db.now();
        db.put('Productos', p);
      });
      var numero = 1;
      db.all('Producciones').forEach(function (x) { numero = Math.max(numero, num(x.numero) + 1); });
      var hoy = fecha(d.fecha) || db.today();
      var lote = txt(d.lote, 30) || ('L' + hoy.slice(2).replace(/-/g, '') + '-' + String(numero).padStart(3, '0'));
      db.put('Producciones', {
        id: nuevoId(db), numero: numero, formulaId: f.id, formulaNombre: f.nombre, litros: litros,
        consumos: plan.consumos, salidas: plan.salidas, litrosEnvasados: plan.litrosEnvasados, costoTotal: plan.costoTotal,
        lote: lote, fecha: hoy, usuarioId: u.id, notas: txt(d.notas, 300), estado: 'ok', creado: db.now()
      });
      var faltantes = plan.consumos.filter(function (c) { return c.stock - c.cantidad < 0; }).length;
      var alTanque = plan.salidas.filter(function (s) { return s.tanque; })[0];
      return { lote: lote, mensaje: 'Producción registrada · lote ' + lote + (alTanque ? ' · ' + alTanque.cantidad + ' L al tanque' : '') + (faltantes ? '. Ojo: ' + faltantes + ' insumo(s) quedaron con stock negativo.' : '.') };
    });
  };
  acciones.anularProduccion = function (db, req, u) {
    exigirAdmin(u);
    return db.lock(function () {
      var pr = porId(db.all('Producciones'), req.datos && req.datos.id);
      if (!pr || pr.estado === 'anulada') return;
      (pr.consumos || []).forEach(function (c) {
        var ins = porId(db.all('Insumos'), c.insumoId);
        if (ins) { ins.stock = redondear(num(ins.stock) + num(c.cantidad)); db.put('Insumos', ins); }
      });
      (pr.salidas || []).forEach(function (s) {
        var p = porId(db.all('Productos'), s.productoId);
        if (p) { p.stock = redondear(num(p.stock) - num(s.cantidad)); db.put('Productos', p); }
      });
      pr.estado = 'anulada';
      db.put('Producciones', pr);
      return { mensaje: 'Producción anulada: el stock volvió a como estaba.' };
    });
  };

  /* ----- Importar desde el respaldo de CosteApp ----- */
  acciones.importarCosteApp = function (db, req, u) {
    exigirAdmin(u);
    var d = req.datos || {};
    var materias = Array.isArray(d.materias) ? d.materias : [], formulas = Array.isArray(d.formulas) ? d.formulas : [];
    if (!materias.length && !formulas.length) throw err('VALIDACION', 'El respaldo no tiene materias primas ni fórmulas.');
    var existentes = db.all('Insumos'), porNombre = {}, mapa = {}, nuevosI = 0, actI = 0, nuevasF = 0, actF = 0;
    existentes.forEach(function (i) { porNombre[norm(i.nombre)] = i; });
    materias.forEach(function (m) {
      var u0 = String(m.unidad || 'kg'), cant = num(m.cantidad) || 1;
      var unidad = u0 === 'g' || u0 === 'kg' ? 'kg' : u0 === 'ml' || u0 === 'L' ? 'L' : 'u';
      if (u0 === 'g' || u0 === 'ml') cant = cant / 1000;
      var previo = porNombre[norm(m.nombre)] || null;
      var ins = limpiarInsumo(db, {
        nombre: m.nombre, tipo: /envase|bid[oó]n|botella|tapa|etiqueta|gatillo|pico/i.test(m.nombre) ? 'envase' : 'materia',
        unidad: unidad, precioEnvase: m.precioPaquete, cantidadEnvase: cant, moneda: m.moneda, densidad: m.densidad
      }, previo);
      if (previo) { ins.stock = previo.stock; ins.stockMinimo = previo.stockMinimo; ins.proveedor = previo.proveedor; actI++; } else nuevosI++;
      db.put('Insumos', ins);
      porNombre[norm(ins.nombre)] = ins;
      mapa[m.id] = ins.id;
    });
    var fPorNombre = {};
    db.all('Formulas').forEach(function (f) { fPorNombre[norm(f.nombre)] = f; });
    formulas.forEach(function (fo) {
      var ex = fo.extras || {};
      var ing = (fo.ingredientes || []).map(function (i) {
        return { insumoId: mapa[i.materiaId] || '', cantidad: num(i.cantidad), unidad: FACTOR_UNIDAD[i.unidad] ? i.unidad : 'kg' };
      }).filter(function (i) { return i.insumoId && i.cantidad > 0; });
      if (!ing.length || !(num(fo.rinde) > 0)) return;
      var previo = fPorNombre[norm(fo.nombre)] || null;
      var f = {
        id: previo ? previo.id : nuevoId(db), nombre: txt(fo.nombre, 80), ingredientes: ing, rinde: num(fo.rinde),
        extras: { minutos: num(ex.minutos), valorHora: num(ex.valorHora), otros: num(ex.gas) + num(ex.packaging) + num(ex.transporte) + num(ex.otros) },
        presentaciones: previo ? previo.presentaciones : [], margenMay: num(fo.gananciaPct), margenMin: previo ? previo.margenMin : num(fo.gananciaPct),
        actualizarCosto: previo ? previo.actualizarCosto : 'si', notas: previo ? previo.notas : 'Importada de CosteApp',
        activo: 'si', creado: previo ? previo.creado : db.now(), actualizado: db.now()
      };
      if (previo) actF++; else nuevasF++;
      db.put('Formulas', f);
    });
    recalcularCostos(db);
    return { mensaje: 'De CosteApp: ' + nuevosI + ' insumos nuevos, ' + actI + ' actualizados · ' + nuevasF + ' fórmulas nuevas, ' + actF + ' actualizadas.' };
  };

  /* ============================================================
   * REGISTRO DE ACTIVIDAD
   * Cada cambio queda anotado: quién, cuándo y qué hizo.
   * ============================================================ */
  function nroP(n) { return '#' + String(n || 0).padStart(4, '0'); }
  function plata(n, moneda) { return (moneda === 'USD' ? 'US$ ' : '$ ') + redondear(num(n)).toLocaleString('es-AR'); }
  function registrarActividad(db, u, accion, detalle) {
    try {
      db.put('Actividad', {
        id: nuevoId(db), fecha: db.now(), usuarioId: u ? u.id : '', usuarioNombre: u ? u.nombre : '—',
        accion: txt(accion, 40), detalle: txt(detalle, 400)
      });
    } catch (e) { /* el registro nunca frena una operación */ }
  }
  /** Texto legible de cada acción para el registro. */
  function textoActividad(db, accion, d, res) {
    d = d || {}; res = res || {};
    var ped = function (id) { return porId(db.all('Pedidos'), id) || {}; };
    var cli = function (id) { return (porId(db.all('Clientes'), id) || {}).nombre || ''; };
    switch (accion) {
      case 'guardarPedido': var p = ped(res.id); return (d.id ? 'Editó' : 'Creó') + ' el pedido ' + nroP(p.numero) + ' de ' + (p.clienteNombre || '') + ' por ' + plata(p.total);
      case 'cambiarEstado': var pe = ped(d.id); return 'Pedido ' + nroP(pe.numero) + ' (' + (pe.clienteNombre || '') + ') pasó a "' + d.estado + '"';
      case 'registrarPago': return 'Cobró ' + (d.moneda === 'USD' ? plata(d.montoMoneda, 'USD') : plata(d.monto)) + ' en ' + (d.medio || 'efectivo') + ' a ' + cli(d.clienteId || ped(d.pedidoId).clienteId);
      case 'borrarPago': return res.log || 'Eliminó un pago';
      case 'guardarCliente': return (d.id ? 'Editó' : 'Creó') + ' el cliente ' + txt(d.nombre, 80);
      case 'guardarProducto': return res.log || ((d.id ? 'Editó' : 'Creó') + ' el producto ' + txt(d.nombre, 80));
      case 'borrarProductos': return res.log || res.mensaje;
      case 'ajustarStock': var pr = porId(db.all('Productos'), d.id) || {}; return 'Ajustó stock de ' + pr.nombre + ' ' + (pr.presentacion || '') + ': ' + (num(d.cantidad) > 0 ? '+' : '') + num(d.cantidad);
      case 'ajustarPrecios': return 'Actualizó precios ' + (num(d.pct) > 0 ? '+' : '') + num(d.pct) + ' % en ' + (d.categoria || 'todas las categorías') + ' (' + (d.campos || []).join(', ') + ')';
      case 'guardarUsuario': return (d.id ? 'Editó' : 'Creó') + ' el usuario ' + txt(d.nombre, 60) + ' (' + d.rol + (d.permisos && d.permisos.length ? ' + ' + d.permisos.join(', ') : '') + ')' + (d.pin ? ' · cambió el PIN' : '');
      case 'cambiarMiPin': return 'Cambió su PIN';
      case 'guardarConfig': return 'Cambió los datos de la empresa';
      case 'guardarZona': return 'Guardó la zona de envío ' + txt(d.nombre, 60);
      case 'guardarInsumo': return (d.id ? 'Editó' : 'Creó') + ' el insumo ' + txt(d.nombre, 80);
      case 'borrarInsumo': return 'Eliminó un insumo';
      case 'movimientoInsumo': var ins = porId(db.all('Insumos'), d.id) || {}; return (num(d.cantidad) > 0 ? 'Entrada' : 'Salida') + ' de ' + Math.abs(num(d.cantidad)) + ' ' + (ins.unidad || '') + ' de ' + (ins.nombre || '');
      case 'guardarFormula': return (d.id ? 'Editó' : 'Creó') + ' la fórmula ' + txt(d.nombre, 80);
      case 'registrarProduccion': return 'Registró producción ' + (res.lote || '') + ' (' + num(d.litros) + ' L)';
      default: return res.log || res.mensaje || accion;
    }
  }

  /* ============================================================
   * CAJA DEL REPARTIDOR (rendición de cobros)
   * Lo cobrado queda "en mano" de quien lo cobró hasta que lo rinde.
   * ============================================================ */
  function resumenCaja(pagos) {
    var r = { efectivoArs: 0, efectivoUsd: 0, otros: {}, cantidad: pagos.length, totalArs: 0 };
    pagos.forEach(function (x) {
      r.totalArs += num(x.monto);
      if (x.medio === 'efectivo') {
        if (x.moneda === 'USD') r.efectivoUsd += num(x.montoMoneda); else r.efectivoArs += num(x.monto);
      } else r.otros[x.medio] = (r.otros[x.medio] || 0) + num(x.monto);
    });
    r.efectivoArs = redondear(r.efectivoArs); r.efectivoUsd = redondear(r.efectivoUsd); r.totalArs = redondear(r.totalArs);
    return r;
  }
  acciones.rendirCaja = function (db, req, u) {
    exigir(u, 'pagos');
    var d = req.datos || {};
    var quien = u.rol === 'admin' && d.usuarioId ? d.usuarioId : u.id;
    var persona = porId(db.all('Usuarios'), quien);
    if (!persona) throw err('NO_EXISTE', 'El usuario no existe.');
    var pagos = db.all('Pagos').filter(function (x) { return x.usuarioId === quien && !x.rendicionId; });
    if (!pagos.length) throw err('VALIDACION', 'No hay cobros pendientes de rendir.');
    var esp = resumenCaja(pagos);
    var gastos = num(d.gastos, 0), entArs = num(d.entregadoArs, 0), entUsd = num(d.entregadoUsd, 0);
    var numero = 1;
    db.all('Rendiciones').forEach(function (x) { numero = Math.max(numero, num(x.numero) + 1); });
    var id = nuevoId(db), ahora = db.now();
    var confirmada = u.rol === 'admin';
    db.put('Rendiciones', {
      id: id, numero: numero, usuarioId: quien, usuarioNombre: persona.nombre, fecha: db.today(),
      pagos: pagos.map(function (x) { return x.id; }), esperado: esp,
      entregadoArs: entArs, entregadoUsd: entUsd, gastos: gastos, gastosDetalle: txt(d.gastosDetalle, 200),
      diferenciaArs: redondear(entArs + gastos - esp.efectivoArs), diferenciaUsd: redondear(entUsd - esp.efectivoUsd),
      estado: confirmada ? 'confirmada' : 'pendiente', recibidoPor: confirmada ? u.id : '', confirmado: confirmada ? ahora : '',
      nota: txt(d.nota, 300), creado: ahora
    });
    pagos.forEach(function (x) { x.rendicionId = id; db.put('Pagos', x); });
    var dif = redondear(entArs + gastos - esp.efectivoArs);
    return {
      mensaje: 'Rendición N° ' + numero + ' registrada' + (dif ? (dif < 0 ? ': faltan ' : ': sobran ') + plata(Math.abs(dif)) : ': cierra justo') + '.',
      log: 'Rindió caja N° ' + numero + ' de ' + persona.nombre + ': efectivo esperado ' + plata(esp.efectivoArs) + ', entregó ' + plata(entArs) + (gastos ? ' + gastos ' + plata(gastos) : '') + (esp.efectivoUsd || entUsd ? ' · US$ esperado ' + esp.efectivoUsd + ', entregó ' + entUsd : '')
    };
  };
  acciones.confirmarRendicion = function (db, req, u) {
    exigirAdmin(u);
    var r = porId(db.all('Rendiciones'), req.datos && req.datos.id);
    if (!r) throw err('NO_EXISTE', 'La rendición ya no existe.');
    r.estado = 'confirmada'; r.recibidoPor = u.id; r.confirmado = db.now();
    if (req.datos.nota) r.nota = txt((r.nota ? r.nota + ' · ' : '') + req.datos.nota, 300);
    db.put('Rendiciones', r);
    return { mensaje: 'Recibiste la rendición N° ' + r.numero + '.', log: 'Confirmó la rendición N° ' + r.numero + ' de ' + r.usuarioNombre };
  };

  /* ============================================================
   * COMPRAS Y PROVEEDORES
   * ============================================================ */
  function pendienteCompra(c) { return c.estado === 'anulada' ? 0 : Math.max(0, redondear(num(c.total) - num(c.pagado))); }
  acciones.guardarProveedor = function (db, req, u) {
    exigirAdmin(u);
    var x = req.datos || {};
    if (!txt(x.nombre)) throw err('VALIDACION', 'El proveedor necesita un nombre.');
    var previo = x.id ? porId(db.all('Proveedores'), x.id) : null;
    var p = {
      id: previo ? previo.id : nuevoId(db), nombre: txt(x.nombre, 80), telefono: txt(x.telefono, 30), cuit: txt(x.cuit, 20),
      email: txt(x.email, 80), notas: txt(x.notas, 300), activo: x.activo === undefined ? 'si' : si(x.activo), creado: previo ? previo.creado : db.now()
    };
    db.put('Proveedores', p);
    return { id: p.id, mensaje: 'Proveedor guardado.' };
  };
  /**
   * Registra una compra: suma stock de insumos y productos, actualiza su precio
   * de costo (opcional) y deja la deuda con el proveedor.
   */
  acciones.registrarCompra = function (db, req, u) {
    exigirAdmin(u);
    var d = req.datos || {};
    var prov = porId(db.all('Proveedores'), d.proveedorId);
    if (!prov) throw err('VALIDACION', 'Elegí el proveedor.');
    var moneda = d.moneda === 'USD' ? 'USD' : 'ARS';
    var dolar = num((dolarActual(db) || {}).valor);
    if (moneda === 'USD' && !dolar) throw err('VALIDACION', 'No hay cotización del dólar para una compra en dólares.');
    var insumos = db.all('Insumos'), productos = db.all('Productos');
    var items = (Array.isArray(d.items) ? d.items : []).slice(0, 100).map(function (it) {
      var obj = it.tipo === 'producto' ? porId(productos, it.id) : porId(insumos, it.id);
      if (!obj) return null;
      return { tipo: it.tipo === 'producto' ? 'producto' : 'insumo', id: obj.id, nombre: obj.nombre + (obj.presentacion ? ' ' + obj.presentacion : ''),
        unidad: it.tipo === 'producto' ? (obj.unidad || 'u') : obj.unidad, cantidad: num(it.cantidad, 0), precio: num(it.precio, 0) };
    }).filter(function (it) { return it && it.cantidad > 0; });
    if (!items.length) throw err('VALIDACION', 'Agregá al menos un ítem con cantidad.');
    var total = redondear(items.reduce(function (s, it) { return s + it.cantidad * it.precio; }, 0));
    return db.lock(function () {
      var actualizar = d.actualizarCostos !== false;
      items.forEach(function (it) {
        if (it.tipo === 'insumo') {
          var ins = porId(db.all('Insumos'), it.id);
          ins.stock = redondear(num(ins.stock) + it.cantidad);
          if (actualizar && it.precio > 0) { ins.precioEnvase = it.precio; ins.cantidadEnvase = 1; ins.moneda = moneda; }
          if (!ins.proveedor) ins.proveedor = prov.nombre;
          ins.actualizado = db.now();
          db.put('Insumos', ins);
        } else {
          var p = porId(db.all('Productos'), it.id);
          p.stock = redondear(num(p.stock) + it.cantidad);
          if (actualizar && it.precio > 0) p.costo = redondear(it.precio * (moneda === 'USD' ? dolar : 1));
          p.actualizado = db.now();
          db.put('Productos', p);
        }
      });
      var numero = 1;
      db.all('Compras').forEach(function (x) { numero = Math.max(numero, num(x.numero) + 1); });
      var compra = {
        id: nuevoId(db), numero: numero, proveedorId: prov.id, proveedorNombre: prov.nombre, fecha: fecha(d.fecha) || db.today(),
        factura: txt(d.factura, 40), moneda: moneda, items: items, total: total, pagado: 0, notas: txt(d.notas, 300),
        usuarioId: u.id, estado: 'ok', creado: db.now()
      };
      db.put('Compras', compra);
      if (d.pagadaAhora) {
        compra.pagado = total; db.put('Compras', compra);
        db.put('PagosProveedor', { id: nuevoId(db), compraId: compra.id, proveedorId: prov.id, monto: total, moneda: moneda, medio: d.medio || 'efectivo', fecha: compra.fecha, usuarioId: u.id, nota: 'Pagada al comprar', creado: db.now() });
      }
      var n = recalcularCostos(db);
      return {
        id: compra.id,
        mensaje: 'Compra N° ' + numero + ' registrada: se sumó el stock' + (actualizar ? ' y se actualizaron los costos' : '') + (n ? ' (' + n + ' productos recalculados)' : '') + '.',
        log: 'Registró la compra N° ' + numero + ' a ' + prov.nombre + ' por ' + plata(total, moneda) + (d.pagadaAhora ? ' (pagada)' : '')
      };
    });
  };
  acciones.anularCompra = function (db, req, u) {
    exigirAdmin(u);
    return db.lock(function () {
      var c = porId(db.all('Compras'), req.datos && req.datos.id);
      if (!c || c.estado === 'anulada') return;
      if (num(c.pagado) > 0) throw err('VALIDACION', 'La compra tiene pagos. Eliminá los pagos antes de anularla.');
      (c.items || []).forEach(function (it) {
        var o = porId(db.all(it.tipo === 'producto' ? 'Productos' : 'Insumos'), it.id);
        if (o) { o.stock = redondear(num(o.stock) - num(it.cantidad)); db.put(it.tipo === 'producto' ? 'Productos' : 'Insumos', o); }
      });
      c.estado = 'anulada';
      db.put('Compras', c);
      return { mensaje: 'Compra anulada: se descontó el stock que había sumado.', log: 'Anuló la compra N° ' + c.numero + ' a ' + c.proveedorNombre };
    });
  };
  acciones.pagarProveedor = function (db, req, u) {
    exigirAdmin(u);
    var d = req.datos || {};
    var monto = redondear(num(d.monto, 0));
    if (monto <= 0) throw err('VALIDACION', 'Ingresá un monto mayor a cero.');
    var moneda = d.moneda === 'USD' ? 'USD' : 'ARS';
    return db.lock(function () {
      var prov = porId(db.all('Proveedores'), d.proveedorId);
      if (!prov) throw err('VALIDACION', 'Elegí el proveedor.');
      var cola = db.all('Compras').filter(function (c) { return c.proveedorId === prov.id && c.moneda === moneda && pendienteCompra(c) > 0; })
        .sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; });
      if (d.compraId) cola.sort(function (a, b) { return a.id === d.compraId ? -1 : b.id === d.compraId ? 1 : 0; });
      var deuda = redondear(cola.reduce(function (s, c) { return s + pendienteCompra(c); }, 0));
      if (monto > deuda + 0.01) throw err('VALIDACION', 'El pago (' + plata(monto, moneda) + ') supera lo que le debés a ' + prov.nombre + ' (' + plata(deuda, moneda) + ').');
      var resto = monto;
      cola.forEach(function (c) {
        if (resto <= 0) return;
        var parte = Math.min(resto, pendienteCompra(c));
        resto = redondear(resto - parte);
        c.pagado = redondear(num(c.pagado) + parte);
        db.put('Compras', c);
        db.put('PagosProveedor', { id: nuevoId(db), compraId: c.id, proveedorId: prov.id, monto: parte, moneda: moneda, medio: d.medio || 'efectivo', fecha: fecha(d.fecha) || db.today(), usuarioId: u.id, nota: txt(d.nota, 200), creado: db.now() });
      });
      return { mensaje: 'Pago a ' + prov.nombre + ' registrado.', log: 'Pagó ' + plata(monto, moneda) + ' a ' + prov.nombre + ' (' + (d.medio || 'efectivo') + ')' };
    });
  };
  acciones.borrarPagoProveedor = function (db, req, u) {
    exigirAdmin(u);
    return db.lock(function () {
      var pg = porId(db.all('PagosProveedor'), req.datos && req.datos.id);
      if (!pg) return;
      var c = porId(db.all('Compras'), pg.compraId);
      if (c) { c.pagado = Math.max(0, redondear(num(c.pagado) - num(pg.monto))); db.put('Compras', c); }
      db.del('PagosProveedor', pg.id);
      return { mensaje: 'Pago eliminado.', log: 'Eliminó un pago a proveedor de ' + plata(pg.monto, pg.moneda) };
    });
  };

  /* ============================================================
   * REPORTES (se calculan con TODOS los pedidos, no solo los recientes)
   * ============================================================ */
  acciones.reporte = function (db, req, u) {
    exigir(u, 'costos');
    var d = req.datos || {};
    var desde = fecha(d.desde) || '2000-01-01', hasta = fecha(d.hasta) || '2999-12-31';
    var meses = {}, productos = {}, clientes = {};
    var tot = { vendido: 0, ganancia: 0, costo: 0, pedidos: 0, envios: 0, cobrado: 0, unidades: 0 };
    var hoy = db.today();
    // últimos 12 meses para el gráfico
    for (var i = 11; i >= 0; i--) {
      var dt = new Date(Number(hoy.slice(0, 4)), Number(hoy.slice(5, 7)) - 1 - i, 1);
      var k = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0');
      meses[k] = { mes: k, vendido: 0, ganancia: 0, cobrado: 0, pedidos: 0 };
    }
    db.all('Pedidos').forEach(function (p) {
      if (p.estado === 'anulado') return;
      var f = String(p.creado).slice(0, 10), mk = f.slice(0, 7);
      var neto = num(p.subtotal) - num(p.descuento), gan = neto - num(p.costoTotal);
      if (meses[mk]) { meses[mk].vendido += neto; meses[mk].ganancia += gan; meses[mk].pedidos++; }
      if (f < desde || f > hasta) return;
      tot.vendido += neto; tot.ganancia += gan; tot.costo += num(p.costoTotal); tot.pedidos++; tot.envios += num(p.envio);
      var factor = 1 - num(p.descuentoPct) / 100;
      (p.items || []).forEach(function (it) {
        var k2 = it.productoId;
        var o = productos[k2] || (productos[k2] = { productoId: k2, nombre: it.nombre, presentacion: it.presentacion, unidades: 0, facturado: 0, costo: 0 });
        o.unidades += num(it.cantidad); o.facturado += num(it.cantidad) * num(it.precio) * factor; o.costo += num(it.cantidad) * num(it.costo);
        tot.unidades += num(it.cantidad);
      });
      var c = clientes[p.clienteId] || (clientes[p.clienteId] = { clienteId: p.clienteId, nombre: p.clienteNombre, pedidos: 0, facturado: 0, ganancia: 0, deuda: 0 });
      c.pedidos++; c.facturado += neto; c.ganancia += gan;
    });
    db.all('Pedidos').forEach(function (p) { if (clientes[p.clienteId] && p.estado === 'entregado') clientes[p.clienteId].deuda += pendiente(p); });
    db.all('Pagos').forEach(function (x) {
      var f = String(x.fecha).slice(0, 10);
      if (meses[f.slice(0, 7)]) meses[f.slice(0, 7)].cobrado += num(x.monto);
      if (f >= desde && f <= hasta) tot.cobrado += num(x.monto);
    });
    var lista = function (o) { return Object.keys(o).map(function (k) { return o[k]; }); };
    var prods = lista(productos).map(function (p) { p.ganancia = p.facturado - p.costo; return p; }).sort(function (a, b) { return b.facturado - a.facturado; });
    var clis = lista(clientes).sort(function (a, b) { return b.facturado - a.facturado; });
    var compras = 0;
    db.all('Compras').forEach(function (c) { if (c.estado !== 'anulada' && c.fecha >= desde && c.fecha <= hasta) compras += num(c.total) * (c.moneda === 'USD' ? num((dolarActual(db) || {}).valor) : 1); });
    return {
      reporte: {
        desde: desde, hasta: hasta, totales: tot, compras: redondear(compras),
        ticket: tot.pedidos ? tot.vendido / tot.pedidos : 0, clientesActivos: clis.length,
        meses: lista(meses), productos: prods.slice(0, 60), clientes: clis.slice(0, 60)
      }
    };
  };

  /* ============================================================
   * RESPALDO (copia de la planilla en Google Drive)
   * ============================================================ */
  acciones.respaldoAhora = function (db, req, u) {
    exigirAdmin(u);
    if (!db.respaldo) throw err('VALIDACION', 'En la demostración no se hacen respaldos: funciona en la versión instalada con Google.');
    var r = db.respaldo();
    db.lock(function () { registrarActividad(db, u, 'respaldoAhora', 'Hizo un respaldo manual: ' + r.nombre); db.bumpVersion(); });
    return { mensaje: 'Respaldo creado en tu Google Drive: ' + r.nombre };
  };
  acciones.actividad = function (db, req, u) {
    exigirAdmin(u);
    var d = req.datos || {};
    var lista = db.all('Actividad').filter(function (a) {
      return (!d.usuarioId || a.usuarioId === d.usuarioId) && (!d.desde || a.fecha >= d.desde) && (!d.texto || String(a.detalle + ' ' + a.usuarioNombre).toLowerCase().indexOf(String(d.texto).toLowerCase()) >= 0);
    });
    return { actividad: lista.slice(-500).reverse() };
  };

  /* ----- Configuración y usuarios ----- */
  acciones.guardarConfig = function (db, req, u) {
    exigir(u, 'config');
    var d = req.datos || {};
    CONFIG_CLAVES.forEach(function (k) { if (d[k] !== undefined) db.put('Config', { id: k, valor: txt(d[k], 300) }); });
  };
  acciones.guardarUsuario = function (db, req, u) {
    exigir(u, 'usuarios');
    var x = req.datos || {};
    var lista = db.all('Usuarios');
    var previo = x.id ? porId(lista, x.id) : null;
    var usuario = txt(x.usuario, 40).toLowerCase().replace(/\s+/g, '');
    if (!txt(x.nombre) || !usuario) throw err('VALIDACION', 'Completá nombre y usuario.');
    if (lista.some(function (o) { return o.usuario === usuario && (!previo || o.id !== previo.id); })) throw err('VALIDACION', 'Ese usuario ya existe.');
    var pin = txt(x.pin, 12);
    if (!previo && !/^\d{4,8}$/.test(pin)) throw err('VALIDACION', 'El PIN debe tener entre 4 y 8 números.');
    if (pin && !/^\d{4,8}$/.test(pin)) throw err('VALIDACION', 'El PIN debe tener entre 4 y 8 números.');
    var rol = ROLES.indexOf(x.rol) >= 0 ? x.rol : 'ventas';
    var activo = x.activo === undefined ? 'si' : si(x.activo);
    if (previo && previo.rol === 'admin' && (rol !== 'admin' || activo !== 'si')) {
      var admins = lista.filter(function (o) { return o.rol === 'admin' && o.activo === 'si'; });
      if (admins.length <= 1) throw err('VALIDACION', 'Tiene que quedar al menos un administrador activo.');
    }
    var id = previo ? previo.id : nuevoId(db);
    db.put('Usuarios', {
      id: id, nombre: txt(x.nombre, 60), usuario: usuario,
      pinHash: pin ? db.hash(id + '|' + pin) : previo.pinHash,
      rol: rol, activo: activo, creado: previo ? previo.creado : db.now(),
      permisos: rol === 'admin' ? [] : (Array.isArray(x.permisos) ? x.permisos : (previo && previo.permisos) || []).filter(function (p) {
        return PERMISOS.indexOf(p) >= 0 && (PERMISOS_ROL[rol] || []).indexOf(p) < 0;
      })
    });
    if (previo && (pin || activo !== 'si')) cerrarSesionesDe(db, id);
  };
  acciones.cambiarMiPin = function (db, req, u) {
    var d = req.datos || {};
    if (u.pinHash !== db.hash(u.id + '|' + txt(d.actual, 12))) throw err('VALIDACION', 'El PIN actual no es correcto.');
    if (!/^\d{4,8}$/.test(txt(d.nuevo, 12))) throw err('VALIDACION', 'El PIN nuevo debe tener entre 4 y 8 números.');
    u.pinHash = db.hash(u.id + '|' + txt(d.nuevo, 12));
    db.put('Usuarios', u);
  };
  function cerrarSesionesDe(db, usuarioId) {
    db.all('Sesiones').filter(function (s) { return s.usuarioId === usuarioId; }).forEach(function (s) { db.del('Sesiones', s.id); });
  }

  /* ---------- Punto de entrada ---------- */
  var PUBLICAS = { login: 1, logout: 1 };
  // la tienda online es pública: cada acción valida todo por su cuenta
  var TIENDA = { tiendaCatalogo: 1, tiendaPedido: 1, tiendaSeguimiento: 1, tiendaPagar: 1, tiendaArrepentimiento: 1, mpNotificacion: 1 };
  var LECTURA = { ping: 1, sync: 1, reporte: 1, respaldoAhora: 1, actividad: 1 };

  /**
   * Atiende un pedido de la pantalla: { accion, token, datos }.
   * Devuelve { ok: true, ...datos } o { ok: false, codigo, error }.
   * Toda escritura devuelve además los datos actualizados (sync).
   */
  /* ============================================================
   * TIENDA ONLINE (pública, sin usuario)
   * - El público ve SOLO el precio minorista.
   * - Granel (el cliente trae el envase): solo retiro en el local.
   * - CABA: envío gratis desde $ 50.000 (menos: se coordina con el vendedor).
   * - Fuera de CABA: compra mínima $ 80.000; el flete se coordina.
   * - Los precios y el stock SIEMPRE se recalculan acá (nunca se confía
   *   en lo que manda el navegador).
   * - Mercado Pago: el Access Token vive en las propiedades del script,
   *   nunca viaja a la página. El pago se confirma consultando a MP.
   * ============================================================ */
  var WEB = { id: 'web', nombre: 'Tienda online', rol: 'web' };
  var ENTREGAS = {
    retiro: 'Retiro en el local',
    caba: 'Envío a domicilio (CABA)',
    interior: 'Envío fuera de CABA (flete a coordinar)'
  };
  var PAGOS_WEB = { mp: 'Mercado Pago', transferencia: 'Transferencia', efectivo: 'Efectivo al retirar / recibir' };
  function cfgTienda(db) {
    var c = {};
    db.all('Config').forEach(function (x) { c[x.id] = x.valor; });
    var n = function (k, def) { return c[k] === undefined || c[k] === '' ? def : num(c[k]); };
    return {
      activa: c.tiendaActiva !== 'no',
      empresa: c.empresa || 'Akuma Clean', telefono: c.telefono || '', whatsapp: c.tiendaWhatsapp || c.telefono || '',
      direccion: c.tiendaDireccion || c.direccion || '', horario: c.tiendaHorario || '', mensaje: c.tiendaMensaje || '',
      gratisCaba: n('tiendaGratisCaba', 50000), minimoInterior: n('tiendaMinimoInterior', 80000),
      alias: c.alias || '', cbu: c.cbu || '', url: c.tiendaUrl || '',
      pagos: { mp: c.tiendaMp !== 'no', transferencia: c.tiendaTransferencia !== 'no', efectivo: c.tiendaEfectivo !== 'no' }
    };
  }
  /** Lo que ya está comprometido en pedidos que todavía no descontaron stock. */
  function reservado(db, productos) {
    var r = {};
    db.all('Pedidos').forEach(function (p) {
      if (p.estado === 'anulado' || p.estado === 'entregado' || p.stockDescontado === 'si') return;
      (p.items || []).forEach(function (it) {
        var pr = porId(productos, it.productoId);
        if (!pr) return;
        var d = destinoStock(productos, pr, it.cantidad);
        r[d.producto.id] = (r[d.producto.id] || 0) + d.cantidad;
      });
    });
    return r;
  }
  /** Cuántas unidades se pueden vender hoy por la web. */
  function disponibleWeb(productos, p, res) {
    var libre = function (x) { return num(x.stock) - (res[x.id] || 0); };
    var t = p.granelId ? porId(productos, p.granelId) : null;
    if (p.modoStock === 'granel') return t ? Math.floor(libre(t) / (num(p.contenido) || 1) + 1e-9) : 0;
    if (p.modoStock === 'envasado' && t) return Math.max(0, Math.floor(libre(p))) + Math.max(0, Math.floor(libre(t) / contenidoDe(p) + 1e-9));
    return Math.floor(libre(p) + 1e-9);
  }
  function esGranelWeb(p) { return p.modoStock === 'granel' || p.modoStock === 'tanque'; }
  function enLaWeb(p) { return p.activo === 'si' && p.web !== 'no' && num(p.precioMinorista) > 0; }
  /** Reglas de envío de la tienda. Devuelve { ok, envio, texto, falta } */
  function reglaEnvioWeb(cfg, entrega, subtotal, hayGranel) {
    if (hayGranel && entrega !== 'retiro') return { ok: false, texto: 'Los productos a granel (traés tu envase) son solo para retirar en el local.' };
    if (entrega === 'retiro') return { ok: true, envio: 0, texto: 'Retirás en el local' + (cfg.direccion ? ': ' + cfg.direccion : '') + '. Sin costo.' };
    if (entrega === 'caba') {
      if (subtotal >= cfg.gratisCaba) return { ok: true, envio: 0, texto: 'Envío GRATIS en CABA.' };
      return { ok: true, envio: 0, coordinar: true, falta: cfg.gratisCaba - subtotal,
        texto: 'Te faltan ' + plata(cfg.gratisCaba - subtotal) + ' para el envío gratis. Si no, el costo del envío lo coordinás con el vendedor por WhatsApp.' };
    }
    if (entrega === 'interior') {
      if (subtotal < cfg.minimoInterior) return { ok: false, falta: cfg.minimoInterior - subtotal, texto: 'Para envíos fuera de CABA la compra mínima es ' + plata(cfg.minimoInterior) + '. Te faltan ' + plata(cfg.minimoInterior - subtotal) + '.' };
      return { ok: true, envio: 0, coordinar: true, texto: 'El costo del flete fuera de CABA se coordina con el vendedor.' };
    }
    return { ok: false, texto: 'Elegí cómo recibís el pedido.' };
  }
  acciones.tiendaCatalogo = function (db) {
    var cfg = cfgTienda(db);
    var productos = db.all('Productos'), res = reservado(db, productos);
    var lista = cfg.activa ? productos.filter(enLaWeb).map(function (p) {
      var d = disponibleWeb(productos, p, res);
      return { id: p.id, nombre: p.nombre, categoria: p.categoria, presentacion: p.presentacion, unidad: p.unidad,
        precio: num(p.precioMinorista), granel: esGranelWeb(p), disponible: Math.max(0, Math.min(d, 999)) };
    }) : [];
    return {
      tienda: { activa: cfg.activa, empresa: cfg.empresa, telefono: cfg.telefono, whatsapp: cfg.whatsapp, direccion: cfg.direccion, horario: cfg.horario,
        mensaje: cfg.mensaje, gratisCaba: cfg.gratisCaba, minimoInterior: cfg.minimoInterior, pagos: cfg.pagos, mpListo: !!db.secreto('MP_ACCESS_TOKEN'),
        alias: cfg.pagos.transferencia ? cfg.alias : '', cbu: cfg.pagos.transferencia ? cfg.cbu : '', url: urlTienda(db, cfg) },
      productos: lista
    };
  };
  function telefonoNorm(t) { return String(t || '').replace(/\D/g, '').replace(/^54/, '').replace(/^9/, '').replace(/^0/, '').replace(/^(11)15/, '$1').slice(-10); }
  acciones.tiendaPedido = function (db, req) {
    var cfg = cfgTienda(db);
    if (!cfg.activa) throw err('CERRADA', 'La tienda online está cerrada por el momento. Escribinos por WhatsApp.');
    var d = req.datos || {}, c = d.cliente || {};
    var nombre = txt(c.nombre, 80), tel = txt(c.telefono, 30), telN = telefonoNorm(tel);
    if (nombre.length < 3) throw err('VALIDACION', 'Escribí tu nombre y apellido.');
    if (telN.length < 8) throw err('VALIDACION', 'Escribí un teléfono válido (con código de área).');
    var email = txt(c.email, 80);
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw err('VALIDACION', 'El email no parece válido.');
    var entrega = ENTREGAS[d.entrega] ? d.entrega : '';
    var pago = PAGOS_WEB[d.pago] && cfg.pagos[d.pago] ? d.pago : '';
    if (!pago) throw err('VALIDACION', 'Elegí cómo pagás.');
    if (pago === 'mp' && !db.secreto('MP_ACCESS_TOKEN')) throw err('VALIDACION', 'El pago con Mercado Pago no está disponible ahora. Elegí otra forma de pago.');
    if (entrega !== 'retiro' && txt(c.direccion, 120).length < 4) throw err('VALIDACION', 'Escribí la dirección de entrega.');
    // freno anti-abuso: hasta 4 pedidos por teléfono y 40 en total cada 10 minutos
    if (db.intentos('web:' + telN, 0) >= 4 || db.intentos('web:todos', 0) >= 40) throw err('BLOQUEO', 'Recibimos muchos pedidos seguidos. Esperá unos minutos o escribinos por WhatsApp.');
    var hecho = db.lock(function () {
      var productos = db.all('Productos'), res = reservado(db, productos);
      var vistos = {};
      var items = (Array.isArray(d.items) ? d.items : []).slice(0, 40).map(function (it) {
        var p = porId(productos, it && it.productoId);
        if (!p || !enLaWeb(p)) throw err('VALIDACION', 'Un producto del carrito ya no está a la venta. Actualizá la página.');
        if (vistos[p.id]) throw err('VALIDACION', 'Hay un producto repetido en el carrito.');
        vistos[p.id] = 1;
        var cant = Math.round(num(it.cantidad, 0, 999));
        if (cant < 1) return null;
        var disp = disponibleWeb(productos, p, res);
        if (cant > disp) throw err('SIN_STOCK', disp > 0 ? 'De ' + p.nombre + ' ' + p.presentacion + ' quedan ' + disp + '. Cambiá la cantidad.' : p.nombre + ' ' + p.presentacion + ' se agotó. Quitalo del carrito.');
        return { productoId: p.id, nombre: p.nombre, presentacion: p.presentacion, unidad: p.unidad, cantidad: cant, precio: num(p.precioMinorista), costo: num(p.costo), granel: esGranelWeb(p) };
      }).filter(Boolean);
      if (!items.length) throw err('VALIDACION', 'El carrito está vacío.');
      var subtotal = items.reduce(function (s, i) { return s + i.precio * i.cantidad; }, 0);
      var regla = reglaEnvioWeb(cfg, entrega, subtotal, items.some(function (i) { return i.granel; }));
      if (!regla.ok) throw err('VALIDACION', regla.texto);
      if (d.totalVisto !== undefined && Math.abs(num(d.totalVisto) - subtotal) > 1) {
        throw err('PRECIO', 'Los precios se actualizaron mientras armabas el pedido. Revisá el total nuevo y confirmá otra vez.');
      }
      items.forEach(function (i) { delete i.granel; });
      // cliente: si ya existe con ese teléfono, se usa el mismo
      var clientes = db.all('Clientes');
      var cli = clientes.filter(function (x) { return telefonoNorm(x.telefono) === telN; })[0];
      if (!cli) {
        cli = { id: nuevoId(db), nombre: nombre, telefono: tel, direccion: txt(c.direccion, 120), localidad: txt(c.localidad, 60) || (entrega === 'caba' ? 'CABA' : ''),
          zonaId: '', distanciaKm: 0, tipoPrecio: 'minorista', limiteCredito: 0, notas: 'Cliente de la tienda online', activo: 'si', creado: db.now(), email: email, origen: 'web' };
        db.put('Clientes', cli);
      } else if (email && !cli.email) { cli.email = email; db.put('Clientes', cli); }
      var t = calcularTotales(items, 0, regla.envio || 0);
      var ahora = db.now();
      var codigo = db.uuid().replace(/-/g, '').slice(0, 12);
      var notas = ['🛒 Tienda online', ENTREGAS[entrega] + (entrega !== 'retiro' ? ': ' + txt(c.direccion, 120) + (c.localidad ? ', ' + txt(c.localidad, 60) : '') : ''),
        'Pago: ' + PAGOS_WEB[pago], regla.coordinar ? 'ENVÍO A COORDINAR con el cliente' : '', txt(c.notas, 200) ? 'Nota: ' + txt(c.notas, 200) : ''].filter(Boolean).join(' · ');
      var pedido = {
        id: nuevoId(db), numero: db.siguienteNumero(), clienteId: cli.id, clienteNombre: cli.nombre, tipoPrecio: 'minorista', items: items,
        subtotal: t.subtotal, descuentoPct: 0, descuento: 0, envio: t.envio, envioManual: 'si', total: t.total, costoTotal: t.costoTotal, pagado: 0,
        estado: 'nuevo', stockDescontado: 'no', zonaId: '', distanciaKm: 0, fechaEntrega: '', notas: txt(notas, 400), creadoPor: 'web', creado: ahora, actualizado: ahora,
        historial: [{ f: ahora, u: 'Tienda online', a: 'Pedido hecho por ' + nombre + ' desde la tienda (' + PAGOS_WEB[pago] + ')' }],
        cotizacion: (dolarActual(db) || {}).valor || 0, origen: 'web', seguimiento: codigo, entrega: entrega, pagoWeb: pago
      };
      db.put('Pedidos', pedido);
      db.intentos('web:' + telN, 1); db.intentos('web:todos', 1);
      registrarActividad(db, WEB, 'tiendaPedido', 'Pedido web ' + nroP(pedido.numero) + ' de ' + nombre + ' por ' + plata(pedido.total) + ' · ' + ENTREGAS[entrega] + ' · ' + PAGOS_WEB[pago]);
      db.bumpVersion();
      return { pedido: pedido, cli: cli, r: { numero: pedido.numero, codigo: codigo, total: pedido.total, envioTexto: regla.texto, coordinar: !!regla.coordinar } };
    });
    // Mercado Pago fuera del bloqueo: si tarda, no frena al equipo
    if (pago === 'mp') {
      try { hecho.r.mpUrl = crearPreferenciaMP(db, hecho.pedido, hecho.cli, cfg, email); }
      catch (e) { hecho.r.mpError = 'No pudimos abrir Mercado Pago (' + (e.message || e) + '). Tu pedido quedó registrado: podés reintentar el pago desde el seguimiento.'; }
    }
    return hecho.r;
  };
  function urlTienda(db, cfg) { return cfg.url || (db.urlApp() ? db.urlApp() + '?tienda' : ''); }
  function crearPreferenciaMP(db, pedido, cli, cfg, email) {
    var token = db.secreto('MP_ACCESS_TOKEN');
    if (!token) throw err('MP', 'falta el Access Token');
    var vuelta = urlTienda(db, cfg);
    var sep = vuelta.indexOf('?') >= 0 ? '&' : '?';
    var saldo = pendiente(pedido);
    var cuerpo = {
      items: [{ id: pedido.id, title: cfg.empresa + ' · Pedido ' + nroP(pedido.numero), description: pedido.items.map(function (i) { return i.cantidad + ' × ' + i.nombre; }).join(', ').slice(0, 250),
        quantity: 1, unit_price: Math.round(saldo * 100) / 100, currency_id: 'ARS' }],
      external_reference: pedido.id,
      metadata: { seguimiento: pedido.seguimiento },
      payer: { name: cli.nombre, email: email || undefined },
      statement_descriptor: String(cfg.empresa).replace(/[^A-Za-z0-9 ]/g, '').slice(0, 22).toUpperCase(),
      expires: false
    };
    if (vuelta) {
      cuerpo.back_urls = { success: vuelta + sep + 'seguimiento=' + pedido.seguimiento, pending: vuelta + sep + 'seguimiento=' + pedido.seguimiento, failure: vuelta + sep + 'seguimiento=' + pedido.seguimiento };
      cuerpo.auto_return = 'approved';
    }
    if (db.urlApp()) cuerpo.notification_url = db.urlApp() + '?mp=1';
    var r = db.http({ url: 'https://api.mercadopago.com/checkout/preferences', metodo: 'post', token: token, cuerpo: cuerpo });
    if (r.codigo >= 300 || !r.cuerpo || !r.cuerpo.init_point) throw err('MP', 'Mercado Pago respondió ' + r.codigo + (r.cuerpo && r.cuerpo.message ? ': ' + r.cuerpo.message : ''));
    return r.cuerpo.init_point;
  }
  /**
   * Confirma un pago consultando a Mercado Pago (no se confía en el aviso).
   * Es idempotente: el mismo pago nunca se registra dos veces.
   */
  function aplicarPagoMP(db, paymentId) {
    paymentId = String(paymentId || '').replace(/\D/g, '').slice(0, 30);
    if (!paymentId) return { estado: 'invalido' };
    var token = db.secreto('MP_ACCESS_TOKEN');
    if (!token) return { estado: 'sinToken' };
    var r = db.http({ url: 'https://api.mercadopago.com/v1/payments/' + paymentId, metodo: 'get', token: token });
    var mp = r.cuerpo || {};
    if (r.codigo >= 300 || !mp.id) return { estado: 'noEncontrado' };
    var ped = porId(db.all('Pedidos'), String(mp.external_reference || ''));
    if (!ped) return { estado: 'otroPedido', mp: mp.status };
    if (mp.status !== 'approved') return { estado: mp.status || 'pendiente', pedido: ped };
    var ref = 'MP ' + mp.id;
    if (db.all('Pagos').some(function (x) { return x.referencia === ref; })) return { estado: 'yaRegistrado', pedido: ped };
    var monto = redondear(Math.min(num(mp.transaction_amount), pendiente(ped)));
    var ahora = db.now();
    if (monto > 0) {
      ped.pagado = redondear(num(ped.pagado) + monto);
      ped.actualizado = ahora;
      ped.historial = (ped.historial || []).concat([{ f: ahora, u: 'Mercado Pago', a: 'Pago aprobado $' + monto + ' (operación ' + mp.id + ')' }]).slice(-40);
      db.put('Pedidos', ped);
    }
    db.put('Pagos', { id: nuevoId(db), pedidoId: ped.id, clienteId: ped.clienteId, monto: monto, medio: 'mercadopago', fecha: db.today(), usuarioId: 'web',
      nota: 'Mercado Pago · operación ' + mp.id + (num(mp.transaction_amount) > monto ? ' (pagó $' + num(mp.transaction_amount) + ', excedente a revisar)' : ''), creado: ahora,
      moneda: 'ARS', montoMoneda: monto, cotizacion: 0, rendicionId: '', referencia: ref });
    registrarActividad(db, WEB, 'pagoMP', 'Mercado Pago aprobó $' + monto + ' del pedido ' + nroP(ped.numero) + ' (' + ped.clienteNombre + ')');
    db.bumpVersion();
    return { estado: 'aprobado', pedido: ped, monto: monto };
  }
  /** Aviso automático de Mercado Pago (webhook). */
  acciones.mpNotificacion = function (db, req) {
    var d = req.datos || {};
    var id = d.id || (d.data && d.data.id);
    var tipo = d.type || d.topic || '';
    if (!id || (tipo && tipo !== 'payment')) return { ignorado: true };
    return db.lock(function () { return { estado: aplicarPagoMP(db, id).estado }; });
  };
  function pedidoPorCodigo(db, codigo) {
    codigo = String(codigo || '').replace(/[^a-z0-9]/gi, '').slice(0, 20);
    if (codigo.length < 10) return null;
    return db.all('Pedidos').filter(function (p) { return p.seguimiento === codigo; })[0] || null;
  }
  var TEXTO_ESTADO_WEB = { nuevo: 'Recibido', preparacion: 'Preparando tu pedido', listo: 'Listo', encamino: 'En camino', entregado: 'Entregado', anulado: 'Anulado' };
  function vistaSeguimiento(db, p, extra) {
    var cfg = cfgTienda(db);
    var r = {
      numero: p.numero, estado: p.estado, estadoTexto: TEXTO_ESTADO_WEB[p.estado] || p.estado, creado: p.creado, nombre: String(p.clienteNombre || '').split(' ')[0],
      items: (p.items || []).map(function (i) { return { nombre: i.nombre, presentacion: i.presentacion, cantidad: i.cantidad, precio: i.precio }; }),
      subtotal: p.subtotal, envio: p.envio, total: p.total, pagado: p.pagado, saldo: pendiente(p), entrega: ENTREGAS[p.entrega] || '', pago: PAGOS_WEB[p.pagoWeb] || '',
      retiro: p.entrega === 'retiro' ? { direccion: cfg.direccion, horario: cfg.horario } : null,
      alias: p.pagoWeb === 'transferencia' ? cfg.alias : '', cbu: p.pagoWeb === 'transferencia' ? cfg.cbu : '',
      puedePagarMP: p.pagoWeb === 'mp' && pendiente(p) > 0 && p.estado !== 'anulado' && !!db.secreto('MP_ACCESS_TOKEN'),
      arrepentimiento: p.arrepentimiento || '',
      pasos: (p.historial || []).filter(function (h) { return /pasó a|Pago aprobado|Pedido hecho|arrepentimiento/i.test(h.a); }).map(function (h) { return { f: h.f, a: h.a.replace(/^Pasó a /, '') }; })
    };
    for (var k in extra || {}) r[k] = extra[k];
    return r;
  }
  acciones.tiendaSeguimiento = function (db, req) {
    var d = req.datos || {};
    var p = pedidoPorCodigo(db, d.codigo);
    if (!p) throw err('NO_EXISTE', 'No encontramos ese pedido. Revisá el link que te dimos.');
    var extra = {};
    if (d.paymentId && pendiente(p) > 0) {
      var a = db.lock(function () { return aplicarPagoMP(db, d.paymentId); });
      extra.pagoMP = a.estado;
      p = pedidoPorCodigo(db, d.codigo);
    }
    return vistaSeguimiento(db, p, extra);
  };
  acciones.tiendaPagar = function (db, req) {
    var p = pedidoPorCodigo(db, (req.datos || {}).codigo);
    if (!p) throw err('NO_EXISTE', 'No encontramos ese pedido.');
    if (p.estado === 'anulado' || pendiente(p) <= 0) throw err('VALIDACION', 'Este pedido no tiene saldo para pagar.');
    if (db.intentos('mp:' + p.id, 0) >= 8) throw err('BLOQUEO', 'Demasiados intentos. Escribinos por WhatsApp.');
    db.intentos('mp:' + p.id, 1);
    var cli = porId(db.all('Clientes'), p.clienteId) || { nombre: p.clienteNombre };
    return { mpUrl: crearPreferenciaMP(db, p, cli, cfgTienda(db), cli.email) };
  };
  /** Botón de arrepentimiento (Res. 424/2020): el cliente puede revocar la compra dentro de los 10 días. */
  acciones.tiendaArrepentimiento = function (db, req) {
    var d = req.datos || {};
    var p = pedidoPorCodigo(db, d.codigo);
    var tel = telefonoNorm(d.telefono);
    if (!p && d.numero && tel.length >= 8) {
      p = db.all('Pedidos').filter(function (x) {
        if (num(x.numero) !== num(d.numero) || x.origen !== 'web') return false;
        var c = porId(db.all('Clientes'), x.clienteId);
        return c && telefonoNorm(c.telefono) === tel;
      })[0] || null;
    }
    if (!p) throw err('NO_EXISTE', 'No encontramos el pedido. Revisá el número y el teléfono con el que compraste.');
    if (db.intentos('arrep:' + p.id, 0) >= 3) throw err('BLOQUEO', 'Ya recibimos tu pedido de arrepentimiento.');
    var dias = (Date.parse(db.now()) - Date.parse(p.creado)) / 86400000;
    if (dias > 10) throw err('VALIDACION', 'El plazo para arrepentirse es de 10 días corridos desde la compra o la entrega. Escribinos y lo vemos.');
    if (p.arrepentimiento) return { tramite: p.arrepentimiento, yaEstaba: true };
    return db.lock(function () {
      var ped = porId(db.all('Pedidos'), p.id), ahora = db.now();
      var tramite = 'ARR-' + String(ped.numero).padStart(4, '0') + '-' + db.uuid().replace(/-/g, '').slice(0, 5).toUpperCase();
      ped.arrepentimiento = tramite;
      ped.notas = txt('⚠ ARREPENTIMIENTO ' + tramite + (txt(d.motivo, 150) ? ' (' + txt(d.motivo, 150) + ')' : '') + ' · ' + (ped.notas || ''), 400);
      ped.historial = (ped.historial || []).concat([{ f: ahora, u: 'Tienda online', a: 'El cliente usó el botón de arrepentimiento · trámite ' + tramite }]).slice(-40);
      ped.actualizado = ahora;
      db.put('Pedidos', ped);
      db.intentos('arrep:' + p.id, 1);
      registrarActividad(db, WEB, 'arrepentimiento', 'Arrepentimiento del pedido ' + nroP(ped.numero) + ' (' + ped.clienteNombre + ') · trámite ' + tramite);
      db.bumpVersion();
      return { tramite: tramite };
    });
  };
  /* ----- Ajustes de la tienda (administrador) ----- */
  acciones.guardarTokenMP = function (db, req, u) {
    exigirAdmin(u);
    var t = String((req.datos || {}).token || '').trim();
    if (t && !/^(APP_USR|TEST)-[A-Za-z0-9_-]{20,}$/.test(t)) throw err('VALIDACION', 'Eso no parece un Access Token de Mercado Pago (empieza con APP_USR- o TEST-).');
    db.secreto('MP_ACCESS_TOKEN', t || null);
    return { mensaje: t ? 'Access Token guardado en el servidor.' : 'Access Token borrado.', log: t ? 'Cargó el Access Token de Mercado Pago (termina en …' + t.slice(-4) + ')' : 'Borró el Access Token de Mercado Pago' };
  };
  acciones.probarMP = function (db, req, u) {
    exigirAdmin(u);
    var token = db.secreto('MP_ACCESS_TOKEN');
    if (!token) throw err('VALIDACION', 'Todavía no cargaste el Access Token.');
    var r = db.http({ url: 'https://api.mercadopago.com/users/me', metodo: 'get', token: token });
    if (r.codigo >= 300 || !r.cuerpo || !r.cuerpo.id) throw err('MP', 'Mercado Pago rechazó el token (' + r.codigo + '). Revisá que sea el Access Token de producción.');
    return { mensaje: 'Conectado a Mercado Pago: ' + (r.cuerpo.nickname || r.cuerpo.email || r.cuerpo.id) + (/^TEST-/.test(token) ? ' (modo prueba)' : '') };
  };

  function manejar(db, req) {
    try {
      req = req || {};
      var fn = acciones[req.accion];
      if (!fn) throw err('ACCION', 'Acción desconocida.');
      if (PUBLICAS[req.accion]) return ok(fn(db, req));
      if (TIENDA[req.accion]) return ok(fn(db, req));
      var u = usuarioDeToken(db, req.token);
      if (LECTURA[req.accion]) return ok(fn(db, req, u));
      var r = db.lock(function () {
        var res = fn(db, req, u) || {};
        registrarActividad(db, u, req.accion, textoActividad(db, req.accion, req.datos, res));
        db.bumpVersion();
        return res;
      });
      var datos = sincronizar(db, porId(db.all('Usuarios'), u.id) || u);
      datos.resultado = r;
      return ok(datos);
    } catch (e) {
      return { ok: false, codigo: e.codigo || 'ERROR', error: e.codigo ? e.message : 'Error del servidor: ' + (e && e.message || e) };
    }
  }
  function ok(o) { o = o || {}; o.ok = true; return o; }

  return {
    VERSION: VERSION, SCHEMA: SCHEMA, ROLES: ROLES, PERMISOS: PERMISOS, PERMISOS_ROL: PERMISOS_ROL, ESTADOS: ESTADOS, MEDIOS: MEDIOS, TRANSICIONES: TRANSICIONES,
    manejar: manejar, calcularEnvio: calcularEnvio, calcularTotales: calcularTotales,
    pendiente: pendiente, estadoPago: estadoPago, puede: puede, dolarActual: dolarActual,
    sugerirEtiqueta: sugerirEtiqueta, etiquetasDesdeProductos: etiquetasDesdeProductos,
    ENTREGAS: ENTREGAS, PAGOS_WEB: PAGOS_WEB, reglaEnvioWeb: reglaEnvioWeb,
    MODOS_STOCK: MODOS_STOCK, contenidoDe: contenidoDe, tanqueDeFormula: tanqueDeFormula, destinoStock: destinoStock,
    AROMAS: AROMAS, aromasDe: aromasDe, dibujosEtiqueta: dibujosEtiqueta, colorAroma: colorAroma, TEXTOS_PERFUMINA: TEXTOS_PERFUMINA,
    costoUnitInsumo: costoUnitInsumo, aUnidadInsumo: aUnidadInsumo, costoFormula: costoFormula, costoPresentacion: costoPresentacion,
    resolverPorcentajes: resolverPorcentajes, aGramos: aGramos, gramosTanda: gramosTanda,
    precioSugerido: precioSugerido, precioItem: precioItem, resumenCaja: resumenCaja, pendienteCompra: pendienteCompra, litrosDeTexto: litrosDeTexto, planProduccion: planProduccion, recalcularCostos: recalcularCostos
  };
})();
// FIN DE Core.gs · Akuma Clean by AkumaNet · Autor: Juan Carlos Ojeda · Tel. 11 6033-1552
