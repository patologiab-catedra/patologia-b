/* Trae de la hoja Config los datos de la cátedra (nombre, color, Instagram, contacto)
   y guarda una copia en el celular, así la página se ve bien aunque no haya señal.
   El color (clave COLOR) pinta toda la app: los demás tonos salen solos (tema.css). */
var CATEDRA = (function () { try { return JSON.parse(localStorage.getItem("catedra")) || {}; } catch (e) { return {}; } })();

function temaCatedra(c) {
  var col = String((c && c.COLOR) || "").trim();
  if (!/^#[0-9a-f]{6}$/i.test(col)) { return; }
  document.documentElement.style.setProperty("--base", col);
  var m = document.querySelector('meta[name="theme-color"]');
  if (m) { m.setAttribute("content", col); }
}
temaCatedra(CATEDRA);

function cargarCatedra(aplicar) {
  if (CATEDRA.CATEDRA_NOMBRE) { aplicar(CATEDRA); }
  fetch(URL_API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ accion: "config" }) })
    .then(function (r) { return r.json(); })
    .then(function (c) {
      if (!c || c.error || !c.CATEDRA_NOMBRE) { return; }
      CATEDRA = c;
      try { localStorage.setItem("catedra", JSON.stringify(c)); } catch (e) {}
      temaCatedra(c);
      aplicar(c);
    })
    .catch(function () {});
}

/* Se mantiene por compatibilidad con páginas viejas */
function colorCatedra(c) { temaCatedra(c); }

/* Íconos: coolicons (Kryston Schwarze), estilo Line. Toman el color del texto. */
var ICONOS = {
  inicio: '<path d="M12 20.9987H6C4.89543 20.9987 4 20.1033 4 18.9987V10.9063C4 10.3295 4.24896 9.78087 4.68299 9.40109L10.683 4.15109C11.437 3.4913 12.563 3.4913 13.317 4.15109L19.317 9.40109C19.751 9.78087 20 10.3295 20 10.9063V18.9987C20 20.1033 19.1046 20.9987 18 20.9987H12Z"/>',
  qr: '<path d="M14 14H17M20 14H20.01M14 18V20M18 18H20V20M4 5C4 4.44772 4.44772 4 5 4H9C9.55228 4 10 4.44772 10 5V9C10 9.55228 9.55228 10 9 10H5C4.44772 10 4 9.55228 4 9V5ZM14 5C14 4.44772 14.4477 4 15 4H19C19.5523 4 20 4.44772 20 5V9C20 9.55228 19.5523 10 19 10H15C14.4477 10 14 9.55228 14 9V5ZM4 15C4 14.4477 4.44772 14 5 14H9C9.55228 14 10 14.4477 10 15V19C10 19.5523 9.55228 20 9 20H5C4.44772 20 4 19.5523 4 19V15Z"/>',
  asistencia: '<path d="M8 3V5M16 3V5M4 9H20M9 15L11 17L15 13M4 7C4 5.89543 4.89543 5 6 5H18C19.1046 5 20 5.89543 20 7V19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19V7Z"/>',
  notas: '<path d="M19 9L13 3H7C5.89543 3 5 3.89543 5 5V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V9ZM13 3V7C13 8.10457 13.8954 9 15 9H19M9 13H15M9 17H15"/>',
  novedades: '<path d="M11 7.99883L19 3.99883C19.9189 3.53939 21 4.07996 21 4.99883V16.9988C21 17.9177 19.9189 18.4583 19 17.9988L11 13.9988M11 7.99883V13.9988M11 7.99883H5C3.89543 7.99883 3 8.89426 3 9.99883V11.9988C3 13.1034 3.89543 13.9988 5 13.9988M11 13.9988H9M5 13.9988H9M5 13.9988V18.9988C5 20.1034 5.89543 20.9988 7 20.9988C8.10457 20.9988 9 20.1034 9 18.9988V13.9988"/>',
  usuario: '<path d="M17 20C17 18.3431 14.7614 17 12 17C9.23858 17 7 18.3431 7 20M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12ZM12 14C10.3431 14 9 12.6569 9 11C9 9.34315 10.3431 8 12 8C13.6569 8 15 9.34315 15 11C15 12.6569 13.6569 14 12 14Z"/>',
  calendario: '<path d="M4 8H20M4 8V16.8C4 17.92 4 18.48 4.218 18.908C4.41 19.284 4.716 19.59 5.092 19.782C5.52 20 6.08 20 7.2 20H16.8C17.92 20 18.48 20 18.908 19.782C19.284 19.59 19.59 19.284 19.782 18.908C20 18.48 20 17.92 20 16.8V8M4 8V7.2C4 6.08 4 5.52 4.218 5.092C4.41 4.716 4.716 4.41 5.092 4.218C5.52 4 6.08 4 7.2 4H8M20 8V7.2C20 6.08 20 5.52 19.782 5.092C19.59 4.716 19.284 4.41 18.908 4.218C18.48 4 17.92 4 16.8 4H16M8 4H16M8 4V2M16 4V2"/>',
  mail: '<path d="M4 6L10.108 10.612C11.21 11.443 12.79 11.443 13.892 10.612L20 6M5 19H19C20.105 19 21 18.105 21 17V7C21 5.895 20.105 5 19 5H5C3.895 5 3 5.895 3 7V17C3 18.105 3.895 19 5 19Z"/>',
  instagram: '<path d="M16.5 7.5H16.51M7 3H17C19.209 3 21 4.791 21 7V17C21 19.209 19.209 21 17 21H7C4.791 21 3 19.209 3 17V7C3 4.791 4.791 3 7 3ZM12 16C9.791 16 8 14.209 8 12C8 9.791 9.791 8 12 8C14.209 8 16 9.791 16 12C16 14.209 14.209 16 12 16Z"/>',
  info: '<path d="M12 11V16M12 21C7.029 21 3 16.971 3 12C3 7.029 7.029 3 12 3C16.971 3 21 7.029 21 12C21 16.971 16.971 21 12 21ZM12.05 8V8.1H11.95V8H12.05Z"/>',
  salir: '<path d="M12 15L15 12M15 12L12 9M15 12H4M9 7.249V7.2C9 6.08 9 5.52 9.218 5.092C9.41 4.716 9.716 4.41 10.092 4.218C10.52 4 11.08 4 12.2 4H16.8C17.92 4 18.48 4 18.908 4.218C19.284 4.41 19.59 4.716 19.782 5.092C20 5.52 20 6.08 20 7.2V16.8C20 17.92 20 18.48 19.782 18.908C19.59 19.284 19.284 19.59 18.908 19.782C18.48 20 17.92 20 16.8 20H12.2C11.08 20 10.52 20 10.092 19.782C9.716 19.59 9.41 19.284 9.218 18.908C9 18.48 9 17.92 9 16.8V16.75"/>',
  clip: '<path d="M8 7V15C8 17.209 9.791 19 12 19C14.209 19 16 17.209 16 15V6C16 4.343 14.657 3 13 3C11.343 3 10 4.343 10 6V15C10 16.105 10.895 17 12 17C13.105 17 14 16.105 14 15V7"/>',
  web: '<path d="M3 12H21M3 12C3 16.971 7.029 21 12 21M3 12C3 7.029 7.029 3 12 3M21 12C21 16.971 16.971 21 12 21M21 12C21 7.029 16.971 3 12 3M12 21C14.21 21 16 16.971 16 12C16 7.029 14.21 3 12 3M12 21C9.79 21 8 16.971 8 12C8 7.029 9.79 3 12 3"/>',
  lugar: '<path d="M5 9.923C5 14.777 9.247 18.79 11.127 20.33C11.396 20.551 11.532 20.662 11.733 20.718C11.889 20.762 12.111 20.762 12.267 20.718C12.468 20.662 12.603 20.552 12.873 20.331C14.753 18.79 19 14.777 19 9.924C19 8.087 18.263 6.326 16.95 5.027C15.637 3.728 13.857 3 12 3C10.143 3 8.363 3.73 7.05 5.028C5.737 6.327 5 8.087 5 9.923ZM10 9C10 10.105 10.895 11 12 11C13.105 11 14 10.105 14 9C14 7.895 13.105 7 12 7C10.895 7 10 7.895 10 9Z"/>',
  estrella: '<path d="M2.331 9.668C2.044 9.39 2.204 8.904 2.6 8.849L8.198 8.072C8.355 8.05 8.491 7.952 8.561 7.81L11.065 2.758C11.242 2.4 11.758 2.4 11.935 2.758L14.439 7.81C14.509 7.952 14.645 8.05 14.802 8.072L20.4 8.849C20.796 8.904 20.956 9.39 20.669 9.668L16.619 13.598C16.505 13.708 16.453 13.867 16.48 14.022L17.436 19.573C17.504 19.966 17.087 20.266 16.733 20.081L11.726 17.459C11.586 17.386 11.414 17.386 11.274 17.459L6.267 20.081C5.913 20.266 5.496 19.966 5.564 19.573L6.52 14.022C6.547 13.867 6.495 13.708 6.381 13.598L2.331 9.668Z"/>',
  campana: '<path d="M9 17V18C9 19.6568 10.3432 21 12 21C13.6568 21 15 19.6568 15 18V17M12 17H6C4.89543 17 4 16.1046 4 15C4 14 5 14 5 13V10C5 6.13401 8.13401 3 12 3C15.866 3 19 6.13401 19 10V13C19 14 20 14 20 15C20 16.1046 19.1046 17 18 17H12Z"/>'
};
function icono(nombre) {
  return '<svg class="ico" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONOS[nombre] || "") + "</svg>";
}

/* Barra de docentes (Asistencia / Notas / Avisos): mismos íconos que la app del alumno */
document.addEventListener("DOMContentLoaded", function () {
  [].forEach.call(document.querySelectorAll(".dnav a"), function (a) {
    var t = a.textContent.replace(/^[^A-Za-zÁÉÍÓÚáéíóúÑñ]+/, "").trim();
    var n = /asist/i.test(t) ? "asistencia" : /nota/i.test(t) ? "notas" : /aviso/i.test(t) ? "novedades" : "";
    if (!n) { return; }
    a.innerHTML = icono(n) + "<span>" + t + "</span>";
    a.style.display = "flex"; a.style.alignItems = "center"; a.style.justifyContent = "center"; a.style.gap = "6px";
    var s = a.querySelector("svg"); s.setAttribute("width", "18"); s.setAttribute("height", "18");
  });
});

/* ===== Notificaciones de la cátedra (avisos de la secretaría para los docentes) =====
   Campanita en la barra violeta de las páginas de docentes, con el número de avisos nuevos.
   Al tocarla se despliega la lista; lo leído deja de contar como nuevo. Si el docente lo permite,
   también aparece una notificación del celular cuando abre la app y hay avisos nuevos. */
function avisosSecretaria(cod) {
  cod = String(cod || "").trim();
  var barra = document.querySelector(".barra-cat");
  if (!cod || !barra || !document.querySelector(".dnav") || typeof URL_API === "undefined") { return; }
  fetch(URL_API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ accion: "n_av_docentes", cod: cod }) })
    .then(function (r) { return r.json(); })
    .then(function (r) { if (r && !r.error) { campana(barra, r.avisos || []); } })
    .catch(function () {});
}
function campana(barra, avisos) {
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var vistos = {}; try { vistos = JSON.parse(localStorage.getItem("pb_av_vistos") || "{}"); } catch (e) {}
  var nuevos = avisos.filter(function (a) { return !vistos[a.id]; });
  var b = document.getElementById("campana");
  if (!b) {
    b = document.createElement("button"); b.id = "campana"; b.type = "button";
    b.style.cssText = "position:relative;flex:none;background:rgba(255,255,255,.14);border:0;color:#fff;width:44px;height:44px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;margin-left:4px";
    barra.appendChild(b);
    var info = barra.querySelector(".info"); if (info) { info.style.marginLeft = "auto"; }
  }
  b.setAttribute("aria-label", "Notificaciones de la cátedra" + (nuevos.length ? ": " + nuevos.length + " nuevas" : ""));
  b.innerHTML = icono("campana").replace('class="ico"', 'class="ico" style="width:24px;height:24px"') +
    (nuevos.length ? '<span style="position:absolute;top:2px;right:2px;min-width:19px;height:19px;padding:0 5px;border-radius:99px;background:#e5484d;color:#fff;font:700 11px/19px sans-serif;text-align:center;box-shadow:0 0 0 2px var(--primario,#8528dd)">' + (nuevos.length > 9 ? "9+" : nuevos.length) + "</span>" : "");
  var p = document.getElementById("campana-panel");
  if (!p) {
    p = document.createElement("section"); p.id = "campana-panel"; p.setAttribute("aria-label", "Notificaciones de la cátedra");
    p.style.cssText = "display:none;background:var(--carta,#fff);border-bottom:1px solid var(--borde,#e6e1da);box-shadow:0 8px 20px rgba(40,20,60,.12);padding:6px 18px 12px;font-size:15px;line-height:1.45";
    barra.parentNode.insertBefore(p, barra.nextSibling);
  }
  var tarjeta = function (a) {
    return '<div style="padding:10px 0;border-top:1px solid var(--borde,#e6e1da)"><div style="font-size:12.5px;color:var(--texto-2,#6a6470)">' + esc(a.fecha) + (vistos[a.id] ? "" : ' · <b style="color:var(--primario,#8528dd)">Nuevo</b>') + "</div>" +
      (a.titulo ? '<div style="font-weight:700">' + esc(a.titulo) + "</div>" : "") + '<div style="white-space:pre-wrap">' + esc(a.texto) + "</div></div>";
  };
  var permiso = ("Notification" in window) && Notification.permission === "default"
    ? '<button id="campana-permiso" type="button" style="background:none;border:0;color:var(--primario,#8528dd);font:inherit;font-weight:600;padding:8px 0 0;cursor:pointer">Avisarme también con una notificación del celular</button>' : "";
  p.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0"><b style="color:var(--primario,#8528dd)">Notificaciones de la cátedra</b><button id="campana-cerrar" type="button" aria-label="Cerrar" style="background:none;border:0;font-size:22px;line-height:1;color:var(--texto-2,#6a6470);cursor:pointer">×</button></div>' +
    (avisos.length ? avisos.map(tarjeta).join("") : '<div style="padding:10px 0;border-top:1px solid var(--borde,#e6e1da);color:var(--texto-2,#6a6470)">No hay avisos de la secretaría.</div>') + permiso;
  var marcarLeidos = function () {
    avisos.forEach(function (a) { vistos[a.id] = 1; });
    try { localStorage.setItem("pb_av_vistos", JSON.stringify(vistos)); } catch (e) {}
    var badge = b.querySelector("span"); if (badge) { badge.remove(); }
    b.setAttribute("aria-label", "Notificaciones de la cátedra");
  };
  b.onclick = function () { var abrir = p.style.display === "none"; p.style.display = abrir ? "block" : "none"; if (abrir) { marcarLeidos(); } };
  document.getElementById("campana-cerrar").onclick = function () { p.style.display = "none"; };
  var bp = document.getElementById("campana-permiso");
  if (bp) { bp.onclick = function () { Notification.requestPermission().then(function () { bp.remove(); }); }; }
  /* Notificación del celular (solo si el docente la permitió) para los avisos que todavía no vio */
  if (nuevos.length && ("Notification" in window) && Notification.permission === "granted") {
    var yaAvisados = {}; try { yaAvisados = JSON.parse(localStorage.getItem("pb_av_notif") || "{}"); } catch (e) {}
    var pend = nuevos.filter(function (a) { return !yaAvisados[a.id]; });
    if (pend.length) {
      var t = pend.length === 1 ? (pend[0].titulo || "Aviso de la secretaría") : pend.length + " avisos nuevos de la secretaría";
      var cuerpo = pend.length === 1 ? pend[0].texto : pend.map(function (a) { return a.titulo || a.texto; }).join(" · ");
      try {
        var logo = new URL("alumno/icon-192.png", document.querySelector('link[rel="manifest"]').href).href;
        if (navigator.serviceWorker && navigator.serviceWorker.ready) { navigator.serviceWorker.ready.then(function (reg) { reg.showNotification(t, { body: cuerpo, icon: logo, tag: "avisos-catedra" }); }); }
        else { new Notification(t, { body: cuerpo, icon: logo }); }
      } catch (e) {}
      pend.forEach(function (a) { yaAvisados[a.id] = 1; });
      try { localStorage.setItem("pb_av_notif", JSON.stringify(yaAvisados)); } catch (e) {}
    }
  }
}
