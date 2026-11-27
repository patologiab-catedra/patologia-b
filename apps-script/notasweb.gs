// ===== Carga de notas, QR de prueba y pedidos de código desde GitHub Pages =====
// Archivo NUEVO en el Apps Script de la cátedra: "+" junto a Archivos > Secuencia de comandos > notasweb
// Usa las funciones que ya están en Código.gs (notasEstado, getNotas, guardarNota, confirmarParcial,
// reabrirParcial, pdfNotas, comisionesPublicas, pedirCodigoDocente, buscarPedido_, resolverPedido, qrData).
// Se llama desde doPost (api.gs) para las acciones que empiezan con n_ o ped_.

function notasApi_(d) {
  try {
    var a = String(d.accion || '');

    // ---- Carga de notas (piden el código personal del docente) ----
    if (a === 'n_estado') { return notasEstado(d.cod); }
    if (a === 'n_notas') { return getNotas(d.cod, d.com); }
    if (a === 'n_guardar') { return guardarNota(d.cod, d.com, d.l, d.parcial, d.fecha, d.valor); }
    if (a === 'n_confirmar') { return confirmarParcial(d.cod, d.com, d.parcial, d.fecha); }
    if (a === 'n_reabrir') { reabrirParcial(d.cod, d.com, d.parcial, d.fecha); return { ok: true }; }
    if (a === 'n_pdf') { return { pdf: pdfNotas(d.cod, d.com) }; }

    // ---- Quitar un presente equivocado (escáner) ----
    if (a === 'n_quitar_presente') { return quitarPresente_(d); }

    // ---- Avisos para la app del alumno (avisos.gs) ----
    if (a.indexOf('n_av_') === 0) { return avisosApi_(d); }

    // ---- Pedido de código (sin código) ----
    if (a === 'n_comisiones') { return { comisiones: comisionesPublicas() }; }
    if (a === 'n_pedir') { pedirCodigoDocente(d.nombre, d.com, d.contacto); return { ok: true }; }

    // ---- QR de prueba: solo los de las comisiones del docente ----
    if (a === 'n_qrs') {
      COD_ = d.cod;
      var coms = permitidas_();
      return { qrs: qrData().filter(function (q) { return coms.indexOf(Number(q.k)) >= 0; }) };
    }

    // ---- Botones Aprobar / Rechazar del mail ----
    if (a === 'ped_ver') {
      var id = String(d.id || ''), ac = d.a === 'no' ? 'no' : 'ok', f = String(d.f || '');
      var p = (f && f === firmaPedido_(id, ac)) ? buscarPedido_(id) : null;
      if (!p) { return { error: 'Este link no es válido.' }; }
      return { nombre: p.nombre, com: p.com, contacto: p.contacto, estado: p.estado, pendiente: p.estado.indexOf('Pendiente') === 0, a: ac };
    }
    if (a === 'ped_resolver') { return { html: resolverPedido(String(d.id || ''), d.a === 'no' ? 'no' : 'ok', String(d.f || '')) }; }

    return { error: 'Acción desconocida' };
  } catch (err) {
    return { error: (err && err.message) ? err.message : String(err) };
  }
}

// ===== Quitar un presente equivocado (desde el escáner) =====
// Borra la fila de Asistencia de ese alumno, esa fecha, esa comisión y ese tipo de clase,
// y deja anotado en Cambios quién lo quitó. Solo para comisiones del docente.
function quitarPresente_(d) {
  var who = quienDeToken_(d.cod);
  if (!who) { return { error: 'El código no es válido. Revisalo o pedile uno nuevo a la secretaría.' }; }
  var com = Number(d.com), l = String(d.l || '').trim(), fecha = String(d.fecha || '').trim(), tipo = String(d.tipo || '').trim();
  if (!com || !l || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) { return { error: 'Faltan datos para quitar el presente.' }; }
  if (who.comisiones.length && who.comisiones.indexOf(com) < 0) { return { error: 'Solo podés corregir la asistencia de tus comisiones.' }; }
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = ss_().getSheetByName('Asistencia');
    var v = sh.getDataRange().getDisplayValues();
    var t = v[0].map(function (x) { return String(x).toLowerCase().trim(); });
    function col(n) { return t.indexOf(n); }
    var cF = col('fecha'), cC = col('comisión'), cL = col('legajo'), cT = col('tipo');
    if (cF < 0 || cC < 0 || cL < 0) { return { error: 'La hoja Asistencia no tiene las columnas Fecha, Comisión y Legajo.' }; }
    var borradas = 0;
    for (var i = v.length - 1; i >= 1; i--) {
      var r = v[i];
      if (r[cF] !== fecha || Number(r[cC]) !== com || String(r[cL]).trim() !== l) { continue; }
      if (cT >= 0 && tipo && String(r[cT]).trim() !== tipo) { continue; }
      sh.deleteRow(i + 1); borradas++;
    }
    if (borradas) {
      var cuando = Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd HH:mm:ss');
      ss_().getSheetByName('Cambios').appendRow([cuando, who.nombre, com, l, 'Asistencia ' + fecha + (tipo ? ' ' + tipo : ''), 'presente', 'quitado']);
    }
    return { ok: true, borradas: borradas };
  } finally { lock.releaseLock(); }
}
