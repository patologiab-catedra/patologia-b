/* Trae de la hoja Config los datos de la cátedra (nombre, color, Instagram, contacto)
   y guarda una copia en el celular, así la página se ve bien aunque no haya señal. */
var CATEDRA = (function () { try { return JSON.parse(localStorage.getItem("catedra")) || {}; } catch (e) { return {}; } })();

function cargarCatedra(aplicar) {
  if (CATEDRA.CATEDRA_NOMBRE) { aplicar(CATEDRA); }
  fetch(URL_API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ accion: "config" }) })
    .then(function (r) { return r.json(); })
    .then(function (c) {
      if (!c || c.error || !c.CATEDRA_NOMBRE) { return; }
      CATEDRA = c;
      try { localStorage.setItem("catedra", JSON.stringify(c)); } catch (e) {}
      aplicar(c);
    })
    .catch(function () {});
}

function colorCatedra(c) {
  if (!c.COLOR) { return; }
  var m = document.querySelector('meta[name="theme-color"]');
  if (m) { m.setAttribute("content", c.COLOR); }
}
