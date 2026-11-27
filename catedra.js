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
