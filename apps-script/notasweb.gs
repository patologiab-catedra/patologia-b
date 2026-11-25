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
