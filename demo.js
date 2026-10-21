/* ============================================================
   Akuma Clean · demo.js
   Servidor de demostración: usa la MISMA lógica (core.js) que el
   servidor real, pero guarda los datos en este navegador.
   Se usa solo cuando API_URL está vacía.
   Desarrollado por AkumaNet · Autor: Juan Carlos Ojeda · Tel. 11 6033-1552
   ============================================================ */
(function () {
  'use strict';
  var CLAVE = 'ac_demo_v8';
  var memoria = null;

  function hash(s) {
    // hash simple (solo demo; el servidor real usa SHA-256)
    var h1 = 0x811c9dc5, h2 = 0x01000193;
    for (var i = 0; i < s.length; i++) {
      h1 = Math.imul(h1 ^ s.charCodeAt(i), 16777619) >>> 0;
      h2 = Math.imul(h2 ^ s.charCodeAt(i), 2246822519) >>> 0;
    }
    return ('00000000' + h1.toString(16)).slice(-8) + ('00000000' + h2.toString(16)).slice(-8) + s.length.toString(16);
  }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
  }
  function hoyLocal(desplazamiento) {
    var d = new Date(Date.now() + (desplazamiento || 0) * 86400000);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function haceDias(d, horas) { return new Date(Date.now() - d * 86400000 - (horas || 0) * 3600000).toISOString(); }

  function semilla() {
    var t = { Usuarios: [], Sesiones: [], Productos: [], Clientes: [], Zonas: [], Pedidos: [], Pagos: [], Config: [], Etiquetas: [], Insumos: [], Formulas: [], Producciones: [], Actividad: [], Rendiciones: [], Proveedores: [], Compras: [], PagosProveedor: [] };
    [['u1', 'Juan Carlos', 'admin', '1234', 'admin'], ['u2', 'Lucía', 'lucia', '1111', 'ventas'], ['u3', 'Martín', 'martin', '2222', 'deposito'], ['u4', 'Diego', 'diego', '3333', 'reparto']]
      .forEach(function (u) { t.Usuarios.push({ id: u[0], nombre: u[1], usuario: u[2], pinHash: hash(u[0] + '|' + u[3]), rol: u[4], activo: 'si', creado: haceDias(60) }); });

    [['empresa', 'Akuma Clean'], ['telefono', '11 6033-1552'], ['direccion', 'Av. San Martín 1450, Lanús'], ['cuit', '30-71234567-8'],
      ['alias', 'AKUMA.CLEAN.MP'], ['cbu', ''], ['puntoVenta', '0001'], ['pieRemito', 'Productos de alta calidad. Documento no válido como factura.'], ['formatoRemito', 'a4'],
      ['tiendaDireccion', 'Av. San Martín 1450, Lanús'], ['tiendaHorario', 'Lunes a viernes de 9 a 18 · Sábados de 9 a 13'], ['tiendaWhatsapp', '11 6033-1552'], ['tiendaMensaje', 'Fabricamos nuestros productos: calidad de fábrica a precio justo.']]
      .forEach(function (c) { t.Config.push({ id: c[0], valor: c[1] }); });

    [['z1', 'Zona Centro', 1500, 0, 60000], ['z2', 'Zona Norte', 2500, 350, 120000], ['z3', 'Zona Sur', 2000, 300, 100000], ['z4', 'Interior (flete)', 6000, 450, 0]]
      .forEach(function (z) { t.Zonas.push({ id: z[0], nombre: z[1], costoBase: z[2], costoKm: z[3], gratisDesde: z[4], activo: 'si' }); });

    // código, nombre, categoría, presentación, unidad, costo, mayorista, minorista, stock, mínimo
    [
      ['SUA-05', 'Suavizante Brisa', 'Suavizantes', 'Bidón 5 L', 'bidón', 2900, 4600, 5900, 42, 15],
      ['SUA-L', 'Suavizante Brisa suelto', 'Suavizantes', 'Por litro', 'L', 560, 950, 1250, 310, 100],
      ['DET-05', 'Detergente concentrado', 'Detergentes', 'Bidón 5 L', 'bidón', 3400, 5400, 6900, 36, 12],
      ['DET-L', 'Detergente concentrado suelto', 'Detergentes', 'Por litro', 'L', 650, 1100, 1450, 260, 80],
      ['JAB-05', 'Jabón líquido para ropa', 'Jabones', 'Bidón 5 L', 'bidón', 3800, 6100, 7800, 8, 10],
      ['JAB-L', 'Jabón líquido para ropa suelto', 'Jabones', 'Por litro', 'L', 720, 1250, 1650, 150, 60],
      ['LAV-05', 'Lavandina 55 g/L', 'Lavandinas', 'Bidón 5 L', 'bidón', 1500, 2500, 3200, 70, 20],
      ['LAV-L', 'Lavandina 55 g/L suelta', 'Lavandinas', 'Por litro', 'L', 280, 480, 650, 400, 100],
      ['DES-05', 'Desengrasante industrial', 'Limpieza pesada', 'Bidón 5 L', 'bidón', 4200, 6800, 8500, 15, 6],
      ['LPI-05', 'Limpiador de pisos Lavanda', 'Limpiadores', 'Bidón 5 L', 'bidón', 2100, 3500, 4500, 28, 10],
      ['LPI-L', 'Limpiador de pisos Lavanda suelto', 'Limpiadores', 'Por litro', 'L', 420, 760, 990, 220, 80],
      ['ALC-1', 'Alcohol en gel', 'Higiene', 'Botella 1 L', 'u', 1900, 3000, 3900, 24, 10],
      ['CLO-20', 'Cloro granulado piscina', 'Piscina', 'Balde 20 kg', 'u', 38000, 52000, 61000, 4, 3],
      ['ENV-05', 'Bidón vacío', 'Envases', '5 L', 'u', 450, 700, 900, 120, 40]
    ].forEach(function (p, i) {
      t.Productos.push({ id: 'p' + (i + 1), codigo: p[0], nombre: p[1], categoria: p[2], presentacion: p[3], unidad: p[4], costo: p[5], precioMayorista: p[6], precioMinorista: p[7], stock: p[8], stockMinimo: p[9], activo: 'si', actualizado: haceDias(5), modoStock: '', granelId: '', contenido: 0, web: 'si' });
    });
    // stock en dos niveles: el "suelto" es el tanque (litros) y el bidón de 5 L se envasa desde él
    [['p1', 'p2'], ['p3', 'p4'], ['p5', 'p6'], ['p7', 'p8'], ['p10', 'p11']].forEach(function (par) {
      var env = t.Productos.filter(function (x) { return x.id === par[0]; })[0], tq = t.Productos.filter(function (x) { return x.id === par[1]; })[0];
      tq.modoStock = 'tanque'; tq.contenido = 1;
      env.modoStock = 'envasado'; env.granelId = tq.id; env.contenido = 5;
    });
    t.Productos[4].stock = 3; // jabón 5 L: pocas unidades envasadas, pero hay litros en el tanque

    // id, nombre, tel, dirección, localidad, zona, km, lista, límite
    [
      ['c1', 'Pedro Gómez', '11 3456-7788', 'Belgrano 920', 'Lanús', 'z1', 2, 'mayorista', 150000],
      ['c2', 'Lavadero La Burbuja', '11 2233-4455', 'Pasco 1530', 'Banfield', 'z3', 6, 'mayorista', 300000],
      ['c3', 'Almacén Doña Rosa', '11 6677-1122', 'Mitre 345', 'Avellaneda', 'z2', 9, 'mayorista', 80000],
      ['c4', 'Club Atlético Unión', '11 5544-3322', 'Rivadavia 2100', 'Lomas de Zamora', 'z3', 11, 'mayorista', 0],
      ['c5', 'Marta Ruiz', '11 4455-9900', 'Sarmiento 77', 'Lanús', 'z1', 1, 'minorista', 0],
      ['c6', 'Distribuidora Chascomús', '2241 45-6789', 'Ruta 2 km 118', 'Chascomús', 'z4', 95, 'mayorista', 500000]
    ].forEach(function (c) {
      t.Clientes.push({ id: c[0], nombre: c[1], telefono: c[2], direccion: c[3], localidad: c[4], zonaId: c[5], distanciaKm: c[6], tipoPrecio: c[7], limiteCredito: c[8], notas: '', activo: 'si', creado: haceDias(90) });
    });

    QG.etiquetasDesdeProductos(t.Productos, []).forEach(function (e, i) { e.id = 'e' + (i + 1); e.actualizado = haceDias(2); t.Etiquetas.push(e); });
    ['Coco Vainilla', 'Lavanda', 'Algodón', 'Frutos Rojos', 'Brisa Marina', 'Limón y Menta'].forEach(function (a, i) {
      var d = QG.dibujosEtiqueta({ subtitulo: a });
      t.Etiquetas.push({ id: 'ea' + (i + 1), nombre: 'Perfumina Textil', subtitulo: a, uso: QG.TEXTOS_PERFUMINA.uso, precauciones: QG.TEXTOS_PERFUMINA.prec, color: QG.colorAroma(d[0]), activo: 'si', actualizado: haceDias(1), dibujo: '' });
    });

    var prod = {}; t.Productos.forEach(function (p) { prod[p.id] = p; });
    var cli = {}; t.Clientes.forEach(function (c) { cli[c.id] = c; });
    var zon = {}; t.Zonas.forEach(function (z) { zon[z.id] = z; });
    var numero = 0;
    function pedido(cid, items, estado, dias, pagado, entrega, notas, creador) {
      var c = cli[cid];
      var its = items.map(function (x) {
        var p = prod[x[0]];
        return { productoId: p.id, nombre: p.nombre, presentacion: p.presentacion, unidad: p.unidad, cantidad: x[1], precio: c.tipoPrecio === 'minorista' ? p.precioMinorista : p.precioMayorista, costo: p.costo };
      });
      var parcial = QG.calcularTotales(its, 0, 0);
      var envio = QG.calcularEnvio(zon[c.zonaId], c.distanciaKm, parcial.subtotal);
      var tt = QG.calcularTotales(its, 0, envio);
      numero++;
      var id = 'd' + numero;
      var creado = haceDias(dias, 3);
      var hist = [{ f: creado, u: creador === 'u2' ? 'Lucía' : 'Juan Carlos', a: 'Creó el pedido' }];
      var p = {
        id: id, numero: numero, clienteId: cid, clienteNombre: c.nombre, tipoPrecio: c.tipoPrecio, items: its,
        subtotal: tt.subtotal, descuentoPct: 0, descuento: 0, envio: tt.envio, envioManual: 'no', total: tt.total, costoTotal: tt.costoTotal,
        pagado: pagado === true ? tt.total : (pagado || 0), estado: estado,
        stockDescontado: ['listo', 'encamino', 'entregado'].indexOf(estado) >= 0 ? 'si' : 'no',
        zonaId: c.zonaId, distanciaKm: c.distanciaKm, fechaEntrega: entrega, notas: notas || '',
        creadoPor: creador || 'u1', creado: creado, actualizado: haceDias(Math.max(0, dias - 1)), historial: hist, cotizacion: 1450
      };
      t.Pedidos.push(p);
      if (p.pagado) t.Pagos.push({ id: 'pg' + numero, pedidoId: id, clienteId: cid, monto: p.pagado, medio: numero % 2 ? 'transferencia' : 'efectivo', fecha: hoyLocal(-Math.max(0, dias - 2)), usuarioId: 'u4', nota: '', creado: haceDias(Math.max(0, dias - 2)) });
    }
    pedido('c2', [['p3', 6], ['p1', 6], ['p7', 10]], 'entregado', 41, 0, hoyLocal(-39), '', 'u2');
    pedido('c3', [['p1', 3], ['p10', 4], ['p12', 6]], 'entregado', 34, 20000, hoyLocal(-33));
    pedido('c1', [['p1', 4], ['p3', 4], ['p5', 2]], 'entregado', 18, true, hoyLocal(-17));
    pedido('c4', [['p13', 2], ['p7', 12], ['p9', 3]], 'entregado', 12, 0, hoyLocal(-11), 'Entregar en la secretaría del club', 'u2');
    pedido('c6', [['p2', 100], ['p4', 80], ['p8', 120], ['p14', 30]], 'entregado', 8, 150000, hoyLocal(-6), 'Flete compartido');
    pedido('c5', [['p2', 10], ['p8', 5]], 'entregado', 4, true, hoyLocal(-3));
    pedido('c2', [['p3', 8], ['p6', 20], ['p11', 15]], 'encamino', 1, 0, hoyLocal(0), 'Trae 10 bidones vacíos para devolver', 'u2');
    pedido('c3', [['p7', 6], ['p10', 3]], 'listo', 1, 0, hoyLocal(0));
    pedido('c1', [['p1', 10], ['p3', 20], ['p5', 5]], 'preparacion', 0, 0, hoyLocal(1), 'Llamar antes de ir');
    pedido('c4', [['p9', 4], ['p12', 10], ['p7', 8]], 'nuevo', 0, 0, hoyLocal(1), '', 'u2');
    pedido('c5', [['p11', 5], ['p2', 5]], 'nuevo', 0, 0, hoyLocal(2));
    // ---------- Centro de producción ----------
    // id, nombre, tipo, unidad, precio del envase, cantidad del envase, moneda, densidad, stock, mínimo, proveedor
    [
      ['i1', 'Pasta suavizante', 'materia', 'kg', 150000, 20, 'ARS', 1, 34, 20, 'Química Industrial Sur'],
      ['i2', 'Esencia confort', 'materia', 'L', 45000, 1, 'ARS', 1, 2.4, 1, 'Aromas Pilar'],
      ['i3', 'Esencia floral', 'materia', 'kg', 28.89, 1, 'USD', 1, 1.2, 0.5, 'Aromas Pilar'],
      ['i4', 'Conservante Kathon', 'materia', 'kg', 15000, 1, 'ARS', 1, 0.8, 0.5, 'Química Industrial Sur'],
      ['i5', 'Lauril sulfato 70%', 'materia', 'kg', 9800, 1, 'ARS', 1.05, 38, 15, 'Química Industrial Sur'],
      ['i6', 'Sal fina', 'materia', 'kg', 1200, 1, 'ARS', 1, 22, 5, ''],
      ['i7', 'Colorante verde', 'materia', 'kg', 9000, 1, 'ARS', 1, 0.4, 0.1, ''],
      ['i8', 'Agua desmineralizada', 'materia', 'L', 2500, 20, 'ARS', 1, 380, 100, 'Agua Pura SRL'],
      ['i9', 'Hipoclorito de sodio 100 g/L', 'materia', 'L', 9000, 20, 'ARS', 1.2, 60, 40, 'Química Industrial Sur'],
      ['i10', 'Bidón 5 L', 'envase', 'u', 450, 1, 'ARS', 1, 120, 50, 'Plásticos Lanús'],
      ['i11', 'Botella 1 L', 'envase', 'u', 250, 1, 'ARS', 1, 80, 40, 'Plásticos Lanús'],
      ['i12', 'Tapa a rosca', 'envase', 'u', 40, 1, 'ARS', 1, 300, 100, 'Plásticos Lanús'],
      ['i13', 'Etiqueta autoadhesiva', 'envase', 'u', 60, 1, 'ARS', 1, 90, 100, 'Imprenta Banfield']
    ].forEach(function (x) {
      t.Insumos.push({ id: x[0], nombre: x[1], tipo: x[2], unidad: x[3], precioEnvase: x[4], cantidadEnvase: x[5], moneda: x[6], densidad: x[7], stock: x[8], stockMinimo: x[9], proveedor: x[10], activo: 'si', actualizado: haceDias(4) });
    });
    var envase5 = [{ insumoId: 'i10', cantidad: 1 }, { insumoId: 'i12', cantidad: 1 }, { insumoId: 'i13', cantidad: 1 }];
    t.Formulas.push(
      { id: 'f1', nombre: 'Suavizante Brisa', rinde: 50, margenMay: 35, margenMin: 70, actualizarCosto: 'si', activo: 'si', creado: haceDias(30), actualizado: haceDias(4),
        notas: 'Disolver la pasta en agua tibia, agregar el conservante y por último la esencia. Batir 10 minutos.',
        ingredientes: [{ insumoId: 'i1', cantidad: 2.5, unidad: 'kg' }, { insumoId: 'i2', cantidad: 60, unidad: 'ml' }, { insumoId: 'i4', cantidad: 50, unidad: 'g' }, { insumoId: 'i8', cantidad: 47, unidad: 'L' }],
        extras: { minutos: 40, valorHora: 6000, otros: 0 },
        presentaciones: [{ productoId: 'p1', litros: 5, envases: envase5 }, { productoId: 'p2', litros: 1, envases: [] }] },
      { id: 'f2', nombre: 'Detergente concentrado', rinde: 50, margenMay: 40, margenMin: 75, actualizarCosto: 'si', activo: 'si', creado: haceDias(30), actualizado: haceDias(4),
        notas: 'Lauril en el agua, mezclar suave para que no haga espuma. Espesar con la sal al final.',
        ingredientes: [{ insumoId: 'i5', cantidad: 2.5, unidad: 'kg' }, { insumoId: 'i6', cantidad: 1.2, unidad: 'kg' }, { insumoId: 'i3', cantidad: 100, unidad: 'g' }, { insumoId: 'i7', cantidad: 20, unidad: 'g' }, { insumoId: 'i4', cantidad: 50, unidad: 'g' }, { insumoId: 'i8', cantidad: 45, unidad: 'L' }],
        extras: { minutos: 30, valorHora: 6000, otros: 0 },
        presentaciones: [{ productoId: 'p3', litros: 5, envases: envase5 }, { productoId: 'p4', litros: 1, envases: [] }] },
      { id: 'f3', nombre: 'Lavandina 55 g/L', rinde: 50, margenMay: 30, margenMin: 60, actualizarCosto: 'si', activo: 'si', creado: haceDias(30), actualizado: haceDias(4),
        notas: 'Usar guantes y antiparras. Volcar el hipoclorito sobre el agua, nunca al revés.',
        ingredientes: [{ insumoId: 'i9', cantidad: 27.5, unidad: 'L' }, { insumoId: 'i8', cantidad: 22.5, unidad: 'L' }],
        extras: { minutos: 20, valorHora: 6000, otros: 0 },
        presentaciones: [{ productoId: 'p7', litros: 5, envases: envase5 }, { productoId: 'p8', litros: 1, envases: [] }] }
    );
    var pl = QG.planProduccion(t.Formulas[0], 50, [{ productoId: 'p1', cantidad: 6 }, { productoId: 'p2', cantidad: 20 }], t.Insumos, t.Productos, 1450);
    t.Producciones.push({ id: 'pr1', numero: 1, formulaId: 'f1', formulaNombre: 'Suavizante Brisa', litros: 50, consumos: pl.consumos, salidas: pl.salidas,
      litrosEnvasados: pl.litrosEnvasados, costoTotal: pl.costoTotal, lote: 'L' + hoyLocal(-3).slice(2).replace(/-/g, '') + '-001', fecha: hoyLocal(-3), usuarioId: 'u3', notas: '', estado: 'ok', creado: haceDias(3) });
    // mayorista por cantidad: lavandina y suavizante en bidón
    t.Productos.forEach(function (p) { if (p.id === 'p7') p.minMayorista = 10; if (p.id === 'p1') p.minMayorista = 6; });
    // proveedores y compras
    [['v1', 'Química Industrial Sur', '11 4222-3344', '30-70000001-1'], ['v2', 'Plásticos Lanús', '11 4241-5566', '30-70000002-2'], ['v3', 'Aromas Pilar', '230 444-7788', '30-70000003-3']]
      .forEach(function (v) { t.Proveedores.push({ id: v[0], nombre: v[1], telefono: v[2], cuit: v[3], email: '', notas: '', activo: 'si', creado: haceDias(80) }); });
    t.Compras.push(
      { id: 'cp1', numero: 1, proveedorId: 'v1', proveedorNombre: 'Química Industrial Sur', fecha: hoyLocal(-20), factura: 'A-0003-00012345', moneda: 'ARS',
        items: [{ tipo: 'insumo', id: 'i1', nombre: 'Pasta suavizante', unidad: 'kg', cantidad: 40, precio: 7500 }, { tipo: 'insumo', id: 'i5', nombre: 'Lauril sulfato 70%', unidad: 'kg', cantidad: 25, precio: 9800 }],
        total: 545000, pagado: 300000, notas: '', usuarioId: 'u1', estado: 'ok', creado: haceDias(20) },
      { id: 'cp2', numero: 2, proveedorId: 'v2', proveedorNombre: 'Plásticos Lanús', fecha: hoyLocal(-9), factura: 'B-0001-00004521', moneda: 'ARS',
        items: [{ tipo: 'insumo', id: 'i10', nombre: 'Bidón 5 L', unidad: 'u', cantidad: 200, precio: 450 }, { tipo: 'insumo', id: 'i12', nombre: 'Tapa a rosca', unidad: 'u', cantidad: 400, precio: 40 }],
        total: 106000, pagado: 106000, notas: '', usuarioId: 'u1', estado: 'ok', creado: haceDias(9) },
      { id: 'cp3', numero: 3, proveedorId: 'v3', proveedorNombre: 'Aromas Pilar', fecha: hoyLocal(-5), factura: 'C-0002-00000789', moneda: 'USD',
        items: [{ tipo: 'insumo', id: 'i3', nombre: 'Esencia floral', unidad: 'kg', cantidad: 2, precio: 28.89 }],
        total: 57.78, pagado: 0, notas: 'Pagar en dólares', usuarioId: 'u1', estado: 'ok', creado: haceDias(5) });
    t.PagosProveedor.push(
      { id: 'pp1', compraId: 'cp1', proveedorId: 'v1', monto: 300000, moneda: 'ARS', medio: 'transferencia', fecha: hoyLocal(-18), usuarioId: 'u1', nota: '', creado: haceDias(18) },
      { id: 'pp2', compraId: 'cp2', proveedorId: 'v2', monto: 106000, moneda: 'ARS', medio: 'efectivo', fecha: hoyLocal(-9), usuarioId: 'u1', nota: 'Pagada al comprar', creado: haceDias(9) });
    // caja: los cobros más viejos de Diego ya fueron rendidos
    var viejos = t.Pagos.filter(function (x) { return x.fecha < hoyLocal(-15); });
    if (viejos.length) {
      t.Rendiciones.push({ id: 'r1', numero: 1, usuarioId: 'u4', usuarioNombre: 'Diego', fecha: hoyLocal(-14), pagos: viejos.map(function (x) { return x.id; }),
        esperado: QG.resumenCaja(viejos), entregadoArs: QG.resumenCaja(viejos).efectivoArs, entregadoUsd: 0, gastos: 0, gastosDetalle: '',
        diferenciaArs: 0, diferenciaUsd: 0, estado: 'confirmada', recibidoPor: 'u1', confirmado: haceDias(14), nota: '', creado: haceDias(14) });
      viejos.forEach(function (x) { x.rendicionId = 'r1'; });
    }
    // registro de actividad de ejemplo
    [[6, 'u2', 'Lucía', 'login', 'Ingresó a la app'], [6, 'u2', 'Lucía', 'guardarPedido', 'Creó el pedido #0010 de Club Atlético Unión por $ 82.500'],
      [5, 'u1', 'Juan Carlos', 'guardarProducto', 'Editó el producto Detergente concentrado Bidón 5 L · mayorista $ 5.200 → $ 5.400'],
      [4, 'u4', 'Diego', 'registrarPago', 'Cobró $ 17.250 en efectivo a Marta Ruiz'], [3, 'u3', 'Martín', 'cambiarEstado', 'Pedido #0009 (Pedro Gómez) pasó a "preparacion"'],
      [2, null, '—', 'loginFallido', 'Intento de ingreso con PIN incorrecto para el usuario "diego"'], [1, 'u4', 'Diego', 'cambiarEstado', 'Pedido #0007 (Lavadero La Burbuja) pasó a "encamino"']]
      .forEach(function (a, i) { t.Actividad.push({ id: 'a' + i, fecha: haceDias(a[0]), usuarioId: a[1] || '', usuarioNombre: a[2], accion: a[3], detalle: a[4] }); });
    // los pedidos con stock descontado ya restaron del stock inicial
    var memoria0 = { tablas: t, version: 1, ultimo: numero, intentos: {}, secretos: { MP_ACCESS_TOKEN: 'TEST-0000000000000000-demo-akumaclean' }, mpDemo: {} };
    QG.recalcularCostos(adaptador(memoria0)); // costos de productos según sus fórmulas
    return memoria0;
  }

  function cargar() {
    var raw = null;
    try { raw = localStorage.getItem(CLAVE); } catch (e) { raw = null; }
    if (raw) { try { memoria = JSON.parse(raw); } catch (e) { memoria = null; } }
    if (!memoria) { memoria = semilla(); guardar(); }
    return memoria;
  }
  function guardar() { try { localStorage.setItem(CLAVE, JSON.stringify(memoria)); } catch (e) { /* queda en memoria */ } }

  function adaptador(m) {
    return {
      all: function (t) { return m.tablas[t]; },
      put: function (t, o) {
        var l = m.tablas[t];
        for (var i = 0; i < l.length; i++) if (l[i].id === o.id) { l[i] = o; return; }
        l.push(o);
      },
      del: function (t, id) { m.tablas[t] = m.tablas[t].filter(function (o) { return o.id !== id; }); },
      delMany: function (t, ids) { m.tablas[t] = m.tablas[t].filter(function (o) { return ids.indexOf(o.id) < 0; }); },
      dolar: function () { return { valor: 1450, compra: 1400, fecha: new Date().toISOString(), fuente: 'Ejemplo (demo)' }; },
      hash: hash, uuid: uuid,
      now: function () { return new Date().toISOString(); },
      today: function () { return hoyLocal(0); },
      getVersion: function () { return m.version; },
      bumpVersion: function () { m.version++; },
      siguienteNumero: function () { m.ultimo++; return m.ultimo; },
      intentos: function (k, s) { m.intentos[k] = (m.intentos[k] || 0) + (s || 0); return m.intentos[k]; },
      lock: function (fn) { return fn(); },
      secreto: function (n, v) {
        m.secretos = m.secretos || {};
        if (v === undefined) return m.secretos[n] || '';
        if (v === null) delete m.secretos[n]; else m.secretos[n] = v;
      },
      // Mercado Pago simulado: la "página de pago" es parte de la tienda de prueba
      http: function (o) {
        m.mpDemo = m.mpDemo || {};
        if (/checkout\/preferences$/.test(o.url)) {
          var pid = String(Date.now()).slice(-9) + Math.floor(Math.random() * 90 + 10);
          m.mpDemo[pid] = { ref: o.cuerpo.external_reference, monto: o.cuerpo.items[0].unit_price };
          return { codigo: 201, cuerpo: { id: 'pref-' + pid, init_point: '#mpdemo=' + pid } };
        }
        var mm = o.url.match(/payments\/(\d+)$/);
        if (mm) {
          var pg = m.mpDemo[mm[1]];
          return pg ? { codigo: 200, cuerpo: { id: Number(mm[1]), status: pg.aprobado ? 'approved' : 'pending', transaction_amount: pg.monto, external_reference: pg.ref } } : { codigo: 404, cuerpo: {} };
        }
        if (/users\/me$/.test(o.url)) return { codigo: 200, cuerpo: { id: 1, nickname: 'AKUMACLEAN (demo)' } };
        return { codigo: 404, cuerpo: {} };
      },
      urlApp: function () { return ''; }
    };
  }

  window.QGDemo = {
    /** Solo demo: simula que el cliente pagó en Mercado Pago. */
    mpAprobar: function (pid) {
      var m = cargar();
      if (m.mpDemo && m.mpDemo[pid]) { m.mpDemo[pid].aprobado = true; guardar(); return true; }
      return false;
    },
    atender: function (req) {
      var m = cargar(); // relee: así otra pestaña ve los cambios
      var r = QG.manejar(adaptador(m), JSON.parse(JSON.stringify(req)));
      guardar();
      return JSON.parse(JSON.stringify(r));
    },
    reiniciar: function () { memoria = semilla(); guardar(); }
  };
})();
// FIN DE demo.js · Akuma Clean by AkumaNet
