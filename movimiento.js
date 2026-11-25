/* Mora · movimiento de la interfaz: aparición escalonada al entrar en pantalla y paralaje de fotos.
   Sin IntersectionObserver o con movimiento reducido no hace nada y todo queda visible. */
(function () {
  'use strict';
  var raiz = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  if (!('IntersectionObserver' in window) || (mq && mq.matches)) return;

  var BLANCOS = '.seccion-cabeza, .plato, .paso, .foto, .mapa, .pie-bloque, .pasos-precio';
  raiz.classList.add('mov');

  var pendientes = [];
  function marcar(el, tanda) {
    el.style.setProperty('--i', Math.min(tanda, 6));
    el.classList.add('visto');
    vistos.unobserve(el);
    var i = pendientes.indexOf(el);
    if (i > -1) pendientes.splice(i, 1);
  }
  var vistos = new IntersectionObserver(function (entradas) {
    var tanda = 0;
    entradas.forEach(function (e) { if (e.isIntersecting) marcar(e.target, tanda++); });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  /* Respaldo: algunos navegadores atrasan o no disparan el observador; nada debe quedar invisible. */
  function revisar() {
    var alto = window.innerHeight || 1, tanda = 0;
    pendientes.slice().forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < alto * 0.94 && r.bottom > 0) marcar(el, tanda++);
    });
  }

  var fotos = [], enPantalla = new Set();
  var mirarFotos = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (e) { if (e.isIntersecting) enPantalla.add(e.target); else enPantalla.delete(e.target); });
    pedir();
  }, { rootMargin: '10% 0px' });

  function escanear() {
    fotos.forEach(function (f) { mirarFotos.unobserve(f); });
    enPantalla.clear();
    document.querySelectorAll(BLANCOS).forEach(function (el) {
      if (el.classList.contains('visto') || el.classList.contains('rv')) return;
      el.classList.add('rv');
      pendientes.push(el);
      vistos.observe(el);
    });
    requestAnimationFrame(revisar);
    fotos = Array.prototype.slice.call(document.querySelectorAll('.foto-marco'));
    fotos.forEach(function (f) { mirarFotos.observe(f); });
  }

  var pendiente = false;
  function pedir() { if (!pendiente) { pendiente = true; requestAnimationFrame(paralaje); } }
  function paralaje() {
    pendiente = false;
    if (pendientes.length) revisar();
    var alto = window.innerHeight || 1;
    enPantalla.forEach(function (f) {
      var r = f.getBoundingClientRect();
      var centro = (r.top + r.height / 2) / alto - 0.5;          /* -0.5 arriba … 0.5 abajo */
      f.style.setProperty('--py', (Math.max(-0.7, Math.min(0.7, centro)) * -18).toFixed(1) + 'px');
    });
  }

  window.addEventListener('scroll', pedir, { passive: true });
  window.addEventListener('resize', function () {
    var a = document.querySelector('#nav a.activo'), ul = document.querySelector('#nav ul');
    if (a && ul) { ul.style.setProperty('--ind-x', a.offsetLeft + 'px'); ul.style.setProperty('--ind-w', a.offsetWidth + 'px'); }
    pedir();
  });
  document.addEventListener('mora:render', escanear);
  if (mq && mq.addEventListener) mq.addEventListener('change', function (e) {
    if (e.matches) { raiz.classList.remove('mov'); pendientes = []; vistos.disconnect(); mirarFotos.disconnect(); }
  });
  escanear();
})();
