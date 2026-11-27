/* ===== Cartel "Instalá la app" =====
   Android/Chrome: botón Instalar (usa el aviso nativo del navegador).
   iPhone/iPad: explica los dos toques de Compartir > Agregar a inicio (Safari no tiene botón automático).
   No aparece si la app ya está instalada o si la persona tocó "Ahora no" en los últimos 14 días.
   Uso: <script src="instalar.js" data-nombre="..." data-sw="sw-docentes.js"></script>  (data-sw es opcional) */
(function () {
  var yo = document.currentScript || {};
  var nombre = (yo.dataset && yo.dataset.nombre) || "la app";
  var base = (yo.src || "").replace(/[^\/]*$/, "");
  if (yo.dataset && yo.dataset.sw && "serviceWorker" in navigator) {
    navigator.serviceWorker.register(base + yo.dataset.sw, { scope: base }).catch(function () {});
  }
  var instalada = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  if (instalada) { return; }
  var CLAVE = "pb_instalar_no";
  try { var no = Number(localStorage.getItem(CLAVE) || 0); if (no && Date.now() - no < 14 * 864e5) { return; } } catch (e) {}

  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var aviso = null;

  function cartel(html) {
    if (document.getElementById("pb-instalar")) { return document.getElementById("pb-instalar"); }
    var d = document.createElement("div");
    d.id = "pb-instalar";
    d.setAttribute("role", "region"); d.setAttribute("aria-label", "Instalar la app");
    d.style.cssText = "background:var(--v-50,#f6f0fd);border:1px solid var(--v-200,#d9c4f4);border-radius:12px;padding:12px 14px;margin:0 0 12px;font-size:15px;line-height:1.4;color:#1b1b1b";
    d.innerHTML = html;
    var donde = document.querySelector("main") || document.querySelector(".w") || document.body;
    donde.insertBefore(d, donde.firstChild);
    var x = d.querySelector("[data-no]");
    if (x) { x.onclick = function () { try { localStorage.setItem(CLAVE, String(Date.now())); } catch (e) {} d.remove(); }; }
    return d;
  }
  var boton = "display:inline-block;border:0;border-radius:8px;padding:10px 16px;font-size:15px;cursor:pointer;margin:8px 8px 0 0;";

  if (ios) {
    var mostrarIos = function () {
      cartel('<b>Instalá ' + nombre + ' en tu iPhone</b>' +
        '<ol style="margin:6px 0 0;padding-left:20px">' +
        '<li>Tocá el botón <b>Compartir</b> de Safari (el cuadrado con la flecha hacia arriba).</li>' +
        '<li>Bajá y tocá <b>Agregar a inicio</b>.</li>' +
        '<li>Tocá <b>Agregar</b>. Va a quedar el ícono en tu pantalla.</li></ol>' +
        '<p style="margin:6px 0 0;color:#5b6270;font-size:13px">Si no ves Compartir, abrí este link en Safari.</p>' +
        '<button data-no style="' + boton + 'background:#fff;color:var(--primario,#8528dd);border:1px solid var(--primario,#8528dd)">Entendido</button>');
    };
    if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", mostrarIos); } else { mostrarIos(); }
    return;
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault(); aviso = e;
    var d = cartel('<b>Instalá ' + nombre + ' en tu celular</b>' +
      '<div style="color:#5b6270;font-size:14px">Queda el ícono en la pantalla de inicio y abre directo, sin buscar el link.</div>' +
      '<button data-si style="' + boton + 'background:var(--primario,#8528dd);color:#fff">Instalar</button>' +
      '<button data-no style="' + boton + 'background:#fff;color:#5b6270;border:1px solid #cbd5e1">Ahora no</button>');
    d.querySelector("[data-si]").onclick = function () {
      if (!aviso) { return; }
      aviso.prompt();
      aviso.userChoice.then(function () { aviso = null; d.remove(); });
    };
  });
  window.addEventListener("appinstalled", function () { var d = document.getElementById("pb-instalar"); if (d) { d.remove(); } });
})();
