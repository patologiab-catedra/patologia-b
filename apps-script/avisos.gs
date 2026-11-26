// ===== Avisos (Novedades de la app del alumno) desde GitHub Pages =====
// Archivo NUEVO en el Apps Script de la cátedra: "+" junto a Archivos > Secuencia de comandos > avisos
// Usa funciones que ya existen: ss_() y notasEstado(cod) (devuelve { nombre, comisiones }).
// Se llama desde notasApi_ (notasweb.gs) con las acciones n_av_estado, n_av_publicar y n_av_retirar.
//
// Quién publica:
//   - Secretaría: avisos para TODAS las comisiones. Entra con la clave de secretaría.
//   - Docente: avisos solo para SUS comisiones. Entra con su código personal (el mismo de notas y asistencia).
// Los avisos se guardan en la hoja "Avisos", que es la que lee la app del alumno (aluAvisos_ en alumno.gs).

var AV_MAX_TEXTO = 2000, AV_MAX_TITULO = 120;
var AV_COLS = ['Fecha', 'Alcance', 'Título', 'Texto', 'Autor', 'Estado', 'ID'];

// ---------- Ejecutar UNA vez a mano ----------
// Crea la hoja Avisos (si no está) y genera la clave de la secretaría. La clave aparece en el registro de ejecución.
// Si se vuelve a ejecutar, genera una clave NUEVA y la anterior deja de servir.
function prepararAvisos() {
  avHoja_();
  var abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', clave = 'SEC-';
  for (var i = 0; i < 10; i++) { clave += abc.charAt(Math.floor(Math.random() * abc.length)); }
  PropertiesService.getScriptProperties().setProperty('AV_CLAVE_SECRETARIA', clave);
  Logger.log('Hoja Avisos lista. Clave de la secretaría para publicar avisos: ' + clave);
}

// ---------- Entrada ----------
function avisosApi_(d) {
  var u = avUsuario_(d.cod);
  if (d.accion === 'n_av_estado') { return avEstado_(u); }
  if (d.accion === 'n_av_publicar') { return avPublicar_(u, d.alcance, d.titulo, d.texto); }
  if (d.accion === 'n_av_retirar') { return avRetirar_(u, d.id); }
  return { error: 'Acción desconocida' };
}

// ---------- Quién es ----------
function avUsuario_(cod) {
  cod = String(cod || '').trim().toUpperCase();
  if (!cod) { throw new Error('Falta el código personal.'); }
  var clave = PropertiesService.getScriptProperties().getProperty('AV_CLAVE_SECRETARIA');
  if (clave && cod === clave) { return { rol: 'secretaria', nombre: 'Secretaría', comisiones: [] }; }
  var e = notasEstado(cod); // tira error si el código no es válido
  return { rol: 'docente', nombre: e.nombre, comisiones: (e.comisiones || []).map(String) };
}

// ---------- Hoja ----------
function avHoja_() {
  var ss = ss_(), sh = ss.getSheetByName('Avisos');
  if (!sh) {
    sh = ss.insertSheet('Avisos');
    sh.getRange(1, 1, 1, AV_COLS.length).setValues([AV_COLS]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange('B:B').setNumberFormat('@');
    return sh;
  }
  // Si la hoja ya existía, agrega al final las columnas que le falten
  var ult = Math.max(sh.getLastColumn(), 1);
  var t = sh.getRange(1, 1, 1, ult).getDisplayValues()[0].map(aluTxt_);
  AV_COLS.forEach(function (c) {
    if (t.indexOf(aluTxt_(c)) < 0) { ult++; sh.getRange(1, ult).setValue(c).setFontWeight('bold'); t.push(aluTxt_(c)); }
  });
  return sh;
}
function avColumnas_(sh) {
  var t = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0].map(aluTxt_), m = {};
  AV_COLS.forEach(function (c) { m[c] = t.indexOf(aluTxt_(c)); });
  return m;
}

// ---------- Lista de avisos que esta persona puede ver y retirar ----------
function avEstado_(u) {
  var sh = avHoja_(), m = avColumnas_(sh), v = sh.getDataRange().getDisplayValues(), out = [];
  for (var i = 1; i < v.length; i++) {
    var r = v[i], alc = aluTxt_(r[m['Alcance']]), general = alc.indexOf('toda') >= 0, com = aluNorm_(alc);
    if (u.rol === 'docente' && (general || u.comisiones.indexOf(com) < 0)) { continue; }
    if (u.rol === 'secretaria' && !general) { continue; }
    var est = aluTxt_(r[m['Estado']]);
    out.push({
      id: r[m['ID']], fecha: r[m['Fecha']], general: general, com: com,
      titulo: r[m['Título']], texto: r[m['Texto']], autor: r[m['Autor']],
      retirado: est.indexOf('retirad') >= 0
    });
  }
  return { rol: u.rol, nombre: u.nombre, comisiones: u.comisiones, avisos: out.reverse().slice(0, 50) };
}

// ---------- Publicar ----------
function avPublicar_(u, alcance, titulo, texto) {
  titulo = String(titulo || '').trim(); texto = String(texto || '').trim();
  if (!texto) { throw new Error('Escribí el texto del aviso.'); }
  if (texto.length > AV_MAX_TEXTO) { throw new Error('El aviso es muy largo (máximo ' + AV_MAX_TEXTO + ' letras).'); }
  if (titulo.length > AV_MAX_TITULO) { throw new Error('El título es muy largo (máximo ' + AV_MAX_TITULO + ' letras).'); }
  var alc;
  if (u.rol === 'secretaria') {
    alc = 'Todas';
  } else {
    alc = aluNorm_(alcance);
    if (!alc || u.comisiones.indexOf(alc) < 0) { throw new Error('Solo podés mandar avisos a tus comisiones.'); }
  }
  // Evita que una fórmula escrita en el aviso se ejecute en la planilla
  function seguro(s) { return /^[=+\-@]/.test(s) ? "'" + s : s; }
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = avHoja_(), m = avColumnas_(sh), fila = [];
    for (var c = 0; c < sh.getLastColumn(); c++) { fila.push(''); }
    var tz = Session.getScriptTimeZone();
    fila[m['Fecha']] = Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy HH:mm');
    fila[m['Alcance']] = alc;
    fila[m['Título']] = seguro(titulo);
    fila[m['Texto']] = seguro(texto);
    fila[m['Autor']] = u.nombre;
    fila[m['Estado']] = 'Publicado';
    fila[m['ID']] = Utilities.getUuid().slice(0, 8);
    var n = sh.getLastRow() + 1;
    sh.getRange(n, 1, 1, fila.length).setNumberFormat('@').setValues([fila]);
  } finally { lock.releaseLock(); }
  return avEstado_(u);
}

// ---------- Retirar (deja de verse en la app; queda en la hoja) ----------
function avRetirar_(u, id) {
  id = String(id || '').trim();
  if (!id) { throw new Error('Falta el aviso.'); }
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = avHoja_(), m = avColumnas_(sh), v = sh.getDataRange().getDisplayValues();
    for (var i = 1; i < v.length; i++) {
      if (String(v[i][m['ID']]) !== id) { continue; }
      var alc = aluTxt_(v[i][m['Alcance']]), general = alc.indexOf('toda') >= 0;
      var puede = u.rol === 'secretaria' ? general : (!general && u.comisiones.indexOf(aluNorm_(alc)) >= 0);
      if (!puede) { throw new Error('Este aviso no es tuyo para retirar.'); }
      sh.getRange(i + 1, m['Estado'] + 1).setValue('Retirado');
      return avEstado_(u);
    }
  } finally { lock.releaseLock(); }
  throw new Error('No encontré ese aviso. Recargá la página.');
}
