// ===== App del alumno: ingreso con código por mail y datos del alumno =====
// Archivo NUEVO en el Apps Script de la cátedra: "+" junto a Archivos > Secuencia de comandos > alumno
// Usa funciones que ya existen en el proyecto: ss_(), getRoster(com) y json_().
//
// Columnas que lee (planilla de prueba):
//   Alumnos:  A Legajo | B Apellido | C Nombre | D Comisión | E Email
//   Config:   A Clave  | B Valor
//   Resumen, Notas y Avisos: busca las columnas por el título, así que tolera cambios de orden.

var ALU_CODIGO_MIN = 10;      // minutos que dura el código
var ALU_INTENTOS = 5;         // intentos por código
var ALU_REENVIO_SEG = 60;     // segundos mínimos entre dos pedidos de código
var ALU_SESION_DIAS = 365;    // días que el celular queda con la sesión abierta

// ---------- Ejecutar UNA vez a mano ----------
// Crea las hojas Códigos y Sesiones y pide el permiso para mandar mails.
function prepararAppAlumno() {
  aluHoja_('Códigos', ['Legajo', 'Código (cifrado)', 'Vence', 'Intentos', 'Enviado']);
  aluHoja_('Sesiones', ['Sesión (cifrada)', 'Legajo', 'Creada', 'Vence']);
  Logger.log('Hojas Códigos y Sesiones listas.');
  Logger.log('Mails que puede mandar hoy esta cuenta: ' + MailApp.getRemainingDailyQuota());
}

// ---------- Entrada (se llama desde doPost en api.gs) ----------
function alumnoApi_(d) {
  try {
    if (d.accion === 'alu_pedir') { return aluPedirCodigo_(d.legajo); }
    if (d.accion === 'alu_validar') { return aluValidar_(d.legajo, d.codigo); }
    var leg = aluLegajoDeSesion_(d.sesion);
    if (!leg) { return { error: 'SESION' }; }
    if (d.accion === 'alu_datos') { return aluDatos_(leg); }
    if (d.accion === 'alu_salir') { aluBorrarSesion_(d.sesion); return { ok: true }; }
    return { error: 'Acción desconocida' };
  } catch (err) {
    return { error: String(err) };
  }
}

// ---------- Utilidades ----------
function aluNorm_(s) { return String(s || '').replace(/[^0-9]/g, ''); }
function aluTxt_(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}
function aluHash_(s) {
  var props = PropertiesService.getScriptProperties();
  var sal = props.getProperty('ALU_SAL');
  if (!sal) { sal = Utilities.getUuid(); props.setProperty('ALU_SAL', sal); }
  var b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, sal + '|' + s, Utilities.Charset.UTF_8);
  return Utilities.base64EncodeWebSafe(b);
}
function aluHoja_(nombre, titulos) {
  var ss = ss_();
  var sh = ss.getSheetByName(nombre);
  if (!sh) {
    sh = ss.insertSheet(nombre);
    sh.getRange(1, 1, 1, titulos.length).setValues([titulos]).setFontWeight('bold');
    sh.getRange('A:B').setNumberFormat('@');
    sh.setFrozenRows(1);
  }
  return sh;
}
function aluMascara_(mail) {
  var p = String(mail).split('@');
  if (p.length !== 2) { return 'tu mail'; }
  return p[0].substring(0, 2) + '•••@' + p[1];
}
function aluBuscarAlumno_(legajo) {
  var n = aluNorm_(legajo);
  if (!n) { return null; }
  var v = ss_().getSheetByName('Alumnos').getDataRange().getDisplayValues();
  for (var i = 1; i < v.length; i++) {
    if (aluNorm_(v[i][0]) === n) {
      return { legajo: v[i][0], apellido: v[i][1], nombre: v[i][2], com: String(v[i][3]).trim(), mail: String(v[i][4]).trim() };
    }
  }
  return null;
}
// Devuelve la fila de una hoja (como objeto título -> valor) cuyo legajo coincide
function aluFilaPorLegajo_(nombreHoja, legajo) {
  var sh = ss_().getSheetByName(nombreHoja);
  if (!sh) { return null; }
  var v = sh.getDataRange().getDisplayValues();
  if (v.length < 2) { return null; }
  var col = -1;
  for (var c = 0; c < v[0].length; c++) { if (aluTxt_(v[0][c]).indexOf('legajo') === 0) { col = c; break; } }
  if (col < 0) { return null; }
  var n = aluNorm_(legajo);
  for (var i = 1; i < v.length; i++) {
    if (aluNorm_(v[i][col]) === n) {
      var o = {};
      for (var k = 0; k < v[0].length; k++) { if (v[0][k]) { o[v[0][k]] = v[i][k]; } }
      return o;
    }
  }
  return null;
}

// ---------- 1. Pedir código ----------
function aluPedirCodigo_(legajo) {
  var a = aluBuscarAlumno_(legajo);
  if (!a) { return { error: 'No encontramos ese legajo en las listas de la cátedra. Revisalo o escribí a la secretaría.' }; }
  if (!a.mail || a.mail.indexOf('@') < 0) { return { error: 'No tenemos un mail registrado para tu legajo. Escribí a la secretaría.' }; }

  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = aluHoja_('Códigos', ['Legajo', 'Código (cifrado)', 'Vence', 'Intentos', 'Enviado']);
    var v = sh.getDataRange().getValues();
    var ahora = Date.now();
    var n = aluNorm_(a.legajo);
    for (var i = v.length - 1; i >= 1; i--) {
      if (aluNorm_(v[i][0]) === n) {
        var enviado = Number(v[i][4]) || 0;
        if (ahora - enviado < ALU_REENVIO_SEG * 1000) {
          return { error: 'Ya te mandamos un código hace instantes. Esperá un minuto antes de pedir otro.' };
        }
        sh.deleteRow(i + 1);
      }
    }
    var codigo = String(Math.floor(100000 + Math.random() * 900000));
    sh.appendRow([n, aluHash_(n + '|' + codigo), ahora + ALU_CODIGO_MIN * 60000, 0, ahora]);
  } finally { lock.releaseLock(); }

  MailApp.sendEmail({
    to: a.mail,
    name: 'Cátedra B de Patología',
    subject: 'Tu código para la app de Patología B: ' + codigo,
    body: 'Hola, ' + a.nombre + ':\n\n' +
      'Tu código para entrar a la app de la Cátedra B de Patología es: ' + codigo + '\n\n' +
      'Vence en ' + ALU_CODIGO_MIN + ' minutos. Si no lo pediste vos, ignorá este mail.\n\n' +
      'Cátedra B de Patología · FCM-UNLP',
    htmlBody: aluMailHtml_(a.nombre, codigo)
  });
  return { ok: true, mail: aluMascara_(a.mail) };
}

// Mail con el código grande y fácil de copiar
function aluMailHtml_(nombre, codigo) {
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  return '' +
    '<div style="background:#f4f5f7;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#1b1b1b">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e3e5ea">' +
    '<tr><td style="background:#16325c;color:#ffffff;padding:18px 24px">' +
    '<div style="font-size:17px;font-weight:bold">Cátedra B de Patología</div>' +
    '<div style="font-size:13px;opacity:.8">FCM · UNLP</div></td></tr>' +
    '<tr><td style="padding:28px 24px 8px">' +
    '<p style="margin:0 0 6px;font-size:16px">Hola, ' + esc(nombre) + ':</p>' +
    '<p style="margin:0 0 22px;font-size:15px;color:#5b6270">Este es tu código para entrar a la app de la cátedra.</p>' +
    '<div style="background:#eef2fb;border:2px solid #1a56db;border-radius:14px;padding:20px 10px;text-align:center">' +
    '<div style="font-family:\'Courier New\',Courier,monospace;font-size:42px;font-weight:bold;letter-spacing:10px;color:#16325c">' + codigo + '</div>' +
    '</div>' +
    '<p style="margin:18px 0 0;font-size:14px;color:#5b6270;text-align:center">Vence en <b>' + ALU_CODIGO_MIN + ' minutos</b>. Escribilo en la app tal cual aparece.</p>' +
    '</td></tr>' +
    '<tr><td style="padding:20px 24px 24px">' +
    '<p style="margin:0;font-size:13px;color:#8a909c;border-top:1px solid #e3e5ea;padding-top:14px">Si no lo pediste vos, ignorá este mail: nadie puede entrar sin este código.</p>' +
    '</td></tr></table></div>';
}

// ---------- 2. Validar código y abrir sesión ----------
function aluValidar_(legajo, codigo) {
  var n = aluNorm_(legajo);
  var cod = aluNorm_(codigo);
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = aluHoja_('Códigos', ['Legajo', 'Código (cifrado)', 'Vence', 'Intentos', 'Enviado']);
    var v = sh.getDataRange().getValues();
    for (var i = v.length - 1; i >= 1; i--) {
      if (aluNorm_(v[i][0]) !== n) { continue; }
      var intentos = Number(v[i][3]) || 0;
      if (Date.now() > Number(v[i][2])) { sh.deleteRow(i + 1); return { error: 'El código venció. Pedí uno nuevo.' }; }
      if (intentos >= ALU_INTENTOS) { sh.deleteRow(i + 1); return { error: 'Demasiados intentos. Pedí un código nuevo.' }; }
      if (aluHash_(n + '|' + cod) !== v[i][1]) {
        sh.getRange(i + 1, 4).setValue(intentos + 1);
        var quedan = ALU_INTENTOS - intentos - 1;
        return { error: quedan > 0 ? ('Código incorrecto. Te quedan ' + quedan + ' intentos.') : 'Código incorrecto. Pedí uno nuevo.' };
      }
      sh.deleteRow(i + 1);
      var sesion = Utilities.getUuid() + Utilities.getUuid();
      var ses = aluHoja_('Sesiones', ['Sesión (cifrada)', 'Legajo', 'Creada', 'Vence']);
      var ahora = new Date();
      ses.appendRow([aluHash_('S|' + sesion), n, ahora, new Date(ahora.getTime() + ALU_SESION_DIAS * 86400000)]);
      return { ok: true, sesion: sesion };
    }
    return { error: 'No hay un código pendiente para ese legajo. Pedí uno nuevo.' };
  } finally { lock.releaseLock(); }
}

function aluLegajoDeSesion_(sesion) {
  if (!sesion) { return ''; }
  var h = aluHash_('S|' + sesion);
  var cache = CacheService.getScriptCache();
  var c = cache.get('ses_' + h);
  if (c) { return c; }
  var sh = ss_().getSheetByName('Sesiones');
  if (!sh) { return ''; }
  var v = sh.getDataRange().getValues();
  for (var i = 1; i < v.length; i++) {
    if (v[i][0] === h) {
      if (new Date(v[i][3]).getTime() < Date.now()) { return ''; }
      cache.put('ses_' + h, String(v[i][1]), 21600);
      return String(v[i][1]);
    }
  }
  return '';
}

function aluBorrarSesion_(sesion) {
  var h = aluHash_('S|' + sesion);
  CacheService.getScriptCache().remove('ses_' + h);
  var sh = ss_().getSheetByName('Sesiones');
  if (!sh) { return; }
  var v = sh.getDataRange().getValues();
  for (var i = v.length - 1; i >= 1; i--) { if (v[i][0] === h) { sh.deleteRow(i + 1); } }
}

// ---------- 3. Datos del alumno ----------
function aluDatos_(legajo) {
  var a = aluBuscarAlumno_(legajo);
  if (!a) { return { error: 'SESION' }; }

  // QR: el mismo que valida el escáner, sacado de la lista de su comisión
  var qr = '';
  var ros = getRoster(a.com) || [];
  for (var i = 0; i < ros.length; i++) { if (aluNorm_(ros[i].l) === aluNorm_(a.legajo)) { qr = ros[i].c; break; } }

  // Config (clave -> valor)
  var config = {};
  var shc = ss_().getSheetByName('Config');
  if (shc) { shc.getDataRange().getDisplayValues().forEach(function (r, k) { if (k > 0 && r[0]) { config[r[0]] = r[1]; } }); }

  return {
    alumno: { legajo: a.legajo, apellido: a.apellido, nombre: a.nombre, com: a.com },
    qr: qr,
    resumen: aluFilaPorLegajo_('Resumen', a.legajo),
    notas: aluFilaPorLegajo_('Notas', a.legajo),
    avisos: aluAvisos_(a.com),
    config: config,
    actualizado: Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'dd/MM HH:mm')
  };
}

// Avisos publicados para todas las comisiones o para la del alumno (los más nuevos primero)
function aluAvisos_(com) {
  var sh = ss_().getSheetByName('Avisos');
  if (!sh) { return []; }
  var v = sh.getDataRange().getDisplayValues();
  if (v.length < 2) { return []; }
  var t = v[0].map(aluTxt_);
  function col(re) { for (var c = 0; c < t.length; c++) { if (re.test(t[c])) { return c; } } return -1; }
  var cAlc = col(/alcance/), cEst = col(/^estado/), cFec = col(/fecha/), cTit = col(/titulo|asunto/);
  var cTxt = col(/^texto|mensaje|^aviso|contenido/), cAut = col(/autor|enviado por|docente|quien/);
  var nCom = aluNorm_(com), out = [];
  for (var i = 1; i < v.length; i++) {
    var r = v[i];
    var est = cEst >= 0 ? aluTxt_(r[cEst]) : 'publicado';
    if (est.indexOf('retirad') >= 0 || (est && est.indexOf('publicad') < 0 && est.indexOf('editad') < 0)) { continue; }
    var alc = cAlc >= 0 ? aluTxt_(r[cAlc]) : 'todas';
    if (alc.indexOf('toda') < 0 && aluNorm_(alc) !== nCom) { continue; }
    var texto = cTxt >= 0 ? r[cTxt] : '';
    if (!texto && cTit < 0) { continue; }
    out.push({
      fecha: cFec >= 0 ? r[cFec] : '',
      titulo: cTit >= 0 ? r[cTit] : '',
      texto: texto,
      autor: cAut >= 0 ? r[cAut] : '',
      general: alc.indexOf('toda') >= 0,
      editado: est.indexOf('editad') >= 0
    });
  }
  return out.reverse().slice(0, 30);
}
