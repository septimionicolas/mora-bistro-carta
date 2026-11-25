/* Portada: objeto 3D protagonista + carrusel de productos destacados (DESTACADOS, destacados.js).
 * Usa el mismo model-viewer que ar.js (MoraAR.precargar) y los ganchos de app.js (MoraCarta).
 * ?destacado=N (1…) abre en ese producto y deja el carrusel quieto (enlaces directos y capturas).
 */
(function () {
  'use strict';
  var raiz = document.getElementById('destacados');
  if (!raiz || !window.DESTACADOS || !DESTACADOS.length) return;

  var PASO_MS = 7000, VUELTA_MS = 10000, SALIDA_MS = 520;
  var lista = DESTACADOS, n = lista.length;
  var carta = window.MoraCarta || { lang: function () { return 'es'; }, reducido: function () { return false; } };
  function lang() { return carta.lang(); }
  function T(k) { return (TEXTOS_PORTADA[lang()] || TEXTOS_PORTADA.es)[k]; }
  function tr(o) { return o ? (o[lang()] || o.es || '') : ''; }
  function reducido() { return carta.reducido(); }
  function $(s) { return raiz.querySelector(s); }

  var escena = $('.escena'), visor = $('.visor'), ficha = $('.ficha'), puntos = $('.carrusel-puntos');
  /* El loader de index.html espera el primer modelo (o su falta) para irse. */
  function avisarListo() {
    if (window.__moraModeloListo) return;
    window.__moraModeloListo = true;
    document.dispatchEvent(new CustomEvent('mora:modelo-listo'));
  }
  var btnCarta = $('.btn-carta'), btnMesa = $('.btn-mesa'), ilustrativo = $('.ilustrativo');

  var q = parseInt(new URLSearchParams(location.search).get('destacado'), 10);
  var fijo = q >= 1 && q <= n;
  var actual = fijo ? q - 1 : 0;

  /* ---------- visores: dos model-viewer, uno a la vista y otro precargando ---------- */
  var mvs = [], frente = 0, listo = false, timerAR = 0;

  function crearVisor() {
    var mv = document.createElement('model-viewer');
    var attrs = {
      'camera-controls': '', 'disable-zoom': '', 'disable-pan': '', 'touch-action': 'pan-y',
      'interaction-prompt': 'none', 'min-camera-orbit': 'auto auto 60%', 'max-camera-orbit': 'auto auto 300%', 'shadow-intensity': '0.7', 'shadow-softness': '1',
      'environment-image': 'neutral', 'exposure': '1.05', 'loading': 'eager', 'reveal': 'auto',
      'rotation-per-second': '16deg', 'auto-rotate-delay': '0', 'interpolation-decay': '120',
      'ar': '', 'ar-modes': 'webxr scene-viewer quick-look', 'tabindex': '-1', 'aria-hidden': 'true'
    };
    Object.keys(attrs).forEach(function (k) { mv.setAttribute(k, attrs[k]); });
    if (!reducido()) mv.setAttribute('auto-rotate', '');
    /* El AR propio de model-viewer queda oculto: «Ver en su mesa» abre el visor de ar.js con el original. */
    var nada = document.createElement('span'); nada.slot = 'ar-button'; nada.hidden = true; mv.appendChild(nada);
    mv.className = 'mv';
    mv.addEventListener('load', function () {
      mv.dataset.cargado = mv.getAttribute('src');
      if (mv === mvs[frente]) { escena.classList.remove('cargando'); revisarAR(); avisarListo(); }
    });
    mv.addEventListener('error', function () { if (mv === mvs[frente]) { escena.classList.add('sin-modelo'); avisarListo(); } });
    visor.appendChild(mv);
    return mv;
  }

  function preparar(mv, d) {
    var c = d.camara || {};
    mv.setAttribute('camera-orbit', c.orbita || 'auto auto 105%');
    mv.setAttribute('field-of-view', c.fov || 'auto');
    mv.setAttribute('scale', c.escala || '1 1 1');
    if (d.modeloIos) mv.setAttribute('ios-src', d.modeloIos); else mv.removeAttribute('ios-src');
    mv.setAttribute('alt', tr(d.nombre));
    if (mv.getAttribute('src') !== d.modelo) mv.setAttribute('src', d.modelo);
  }
  function cargado(mv, d) { return mv.dataset.cargado === d.modelo; }

  function precargarSiguiente() {
    var atras = mvs[1 - frente];
    if (atras) preparar(atras, lista[(actual + 1) % n]);
  }

  /* «Ver en su mesa» sólo si el teléfono puede: canActivateAR se resuelve tras la carga. */
  function revisarAR() {
    var d = lista[actual], mv = mvs[frente];
    clearTimeout(timerAR);
    var mirar = function () { btnMesa.hidden = !(d.modeloAR && mv && mv.canActivateAR && d === lista[actual]); };
    mirar(); timerAR = setTimeout(mirar, 800);
  }

  function iniciarVisores() {
    if (!window.MoraAR || !window.MoraAR.precargar) { escena.classList.add('sin-modelo'); avisarListo(); return; }
    escena.classList.add('cargando');
    window.MoraAR.precargar().then(function () {
      mvs = [crearVisor(), crearVisor()];
      mvs[1].classList.add('oculto');
      preparar(mvs[0], lista[actual]);
      listo = true;
      /* El siguiente se pide cuando el primero ya está en pantalla, para no competir por la red. */
      var primero = function () { mvs[0].removeEventListener('load', primero); precargarSiguiente(); };
      mvs[0].addEventListener('load', primero);
    }).catch(function () { escena.classList.remove('cargando'); escena.classList.add('sin-modelo'); avisarListo(); });
  }

  /* ---------- textos ---------- */
  function pintarFicha() {
    var d = lista[actual];
    $('.ficha-origen').textContent = tr(d.origen);
    $('.ficha-nombre').textContent = tr(d.nombre);
    $('.ficha-linea').textContent = tr(d.linea);
    btnCarta.textContent = T('verCarta');
    btnCarta.setAttribute('href', '#' + d.destino);
    btnMesa.textContent = T('verMesa');
    ilustrativo.textContent = T('ilustrativo');
    raiz.setAttribute('aria-label', T('region'));
    ficha.setAttribute('aria-label', T('destacado')(actual + 1, n));
    $('.flecha-ant').setAttribute('aria-label', T('anterior'));
    $('.flecha-sig').setAttribute('aria-label', T('siguiente'));
    document.querySelectorAll('.portada-logo .logo, .nav-logo .logo').forEach(function (l) { l.setAttribute('aria-label', T('logo')); });
    puntos.querySelectorAll('button').forEach(function (b, i) {
      b.setAttribute('aria-label', T('destacado')(i + 1, n) + ' · ' + tr(lista[i].nombre));
      b.setAttribute('aria-current', i === actual ? 'true' : 'false');
    });
  }

  function armarPuntos() {
    var html = '';
    for (var i = 0; i < n; i++) html += '<button type="button" class="punto" data-i="' + i + '"><i></i></button>';
    puntos.innerHTML = html;
  }

  /* ---------- cambio de destacado ---------- */
  var cambiando = false;
  function ir(i, dir) {
    i = (i + n) % n;
    if (i === actual || cambiando) return;
    var anterior = actual;
    actual = i;
    dir = dir || (i > anterior ? 1 : -1);

    var suave = !reducido();
    /* El texto cambia junto con el objeto: si el modelo todavía baja, se espera con el anillo de carga. */
    var cambiarTexto = function () {
      if (!suave) { pintarFicha(); return; }
      ficha.classList.add('cambia');
      setTimeout(function () { pintarFicha(); ficha.classList.remove('cambia'); revisarAR(); }, 260);
    };

    if (!listo) { cambiarTexto(); return; }
    cambiando = true;
    var sale = mvs[frente], entra = mvs[1 - frente], d = lista[i], hecho = false, espera = 0;
    preparar(entra, d);
    escena.style.setProperty('--dir', dir);

    var mostrar = function () {
      if (hecho) return;
      hecho = true; clearTimeout(espera);
      entra.removeEventListener('load', mostrar); entra.removeEventListener('error', mostrar);
      cambiarTexto();
      if (suave) {
        /* Entra girando hasta su ángulo; el que sale se lleva media vuelta. */
        var c = (d.camara && d.camara.orbita) || '0deg 75deg 105%';
        var partes = c.split(' ');
        var theta = parseFloat(partes[0]) || 0;
        entra.setAttribute('camera-orbit', (theta - 140 * dir) + 'deg ' + partes.slice(1).join(' '));
        if (entra.jumpCameraToGoal) entra.jumpCameraToGoal();
        requestAnimationFrame(function () { entra.setAttribute('camera-orbit', c); });
        var cs = sale.getAttribute('camera-orbit').split(' ');
        sale.setAttribute('camera-orbit', ((parseFloat(cs[0]) || 0) + 160 * dir) + 'deg ' + cs.slice(1).join(' '));
      }
      sale.classList.add('sale'); entra.classList.remove('oculto'); entra.classList.add('entra');
      frente = 1 - frente;
      escena.classList.remove('sin-modelo');
      /* Si entró por espera vencida, el anillo sigue hasta que el modelo termine de bajar. */
      if (cargado(entra, d)) escena.classList.remove('cargando');
      setTimeout(function () {
        sale.classList.remove('sale'); sale.classList.add('oculto'); entra.classList.remove('entra');
        cambiando = false;
        revisarAR();
        precargarSiguiente();
      }, suave ? SALIDA_MS + 280 : 0);
    };
    if (cargado(entra, d)) mostrar();
    else {
      escena.classList.add('cargando');
      entra.addEventListener('load', mostrar); entra.addEventListener('error', mostrar);
      /* Red lenta: a los 8 s se cambia igual y el objeto aparece cuando termina de bajar. */
      espera = setTimeout(mostrar, 8000);
    }
  }
  function siguiente() { ir(actual + 1, 1); }
  function anteriorD() { ir(actual - 1, -1); }

  /* ---------- reloj del carrusel ---------- */
  var reloj = 0, tocado = 0, visible = true;
  function puedeAvanzar() { return !fijo && !reducido() && !document.hidden && visible && !tocado; }
  function programar() {
    clearTimeout(reloj);
    if (puedeAvanzar()) reloj = setTimeout(function () { siguiente(); programar(); }, PASO_MS);
  }
  function pausarPorToque() {
    clearTimeout(tocado);
    tocado = setTimeout(function () { tocado = 0; programar(); }, VUELTA_MS);
    programar();
  }

  /* ---------- eventos ---------- */
  raiz.addEventListener('click', function (ev) {
    var b = ev.target.closest('button, a');
    if (!b) return;
    if (b.classList.contains('flecha-sig')) { siguiente(); pausarPorToque(); return; }
    if (b.classList.contains('flecha-ant')) { anteriorD(); pausarPorToque(); return; }
    if (b.classList.contains('punto')) { ir(+b.getAttribute('data-i')); pausarPorToque(); return; }
    if (b === btnCarta) { ev.preventDefault(); verEnCarta(lista[actual]); return; }
    if (b === btnMesa && window.MoraAR) {
      var d = lista[actual];
      window.MoraAR.abrir({ src: d.modeloAR, iosSrc: d.modeloIos, titulo: tr(d.nombre), nota: T('ilustrativo') });
    }
  });

  function verEnCarta(d) {
    var dest = document.getElementById(d.destino);
    if (!dest) return;
    if (d.depto && carta.elegirDepto) carta.elegirDepto(d.depto, true);
    dest.scrollIntoView({ behavior: reducido() ? 'auto' : 'smooth', block: 'center' });
    dest.classList.remove('resaltado');
    void dest.offsetWidth;
    dest.classList.add('resaltado');
    setTimeout(function () { dest.classList.remove('resaltado'); }, 2600);
    if (!dest.hasAttribute('tabindex')) dest.setAttribute('tabindex', '-1');
    dest.focus({ preventScroll: true });
  }

  /* Tocar o arrastrar el objeto pausa el carrusel; deslizar sobre el texto cambia de producto. */
  escena.addEventListener('pointerdown', pausarPorToque);
  var x0 = null, y0 = 0;
  ficha.addEventListener('pointerdown', function (ev) { x0 = ev.clientX; y0 = ev.clientY; });
  ficha.addEventListener('pointerup', function (ev) {
    if (x0 === null) return;
    var dx = ev.clientX - x0, dy = ev.clientY - y0; x0 = null;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) { if (dx < 0) siguiente(); else anteriorD(); pausarPorToque(); }
  });
  ficha.addEventListener('pointercancel', function () { x0 = null; });

  document.addEventListener('visibilitychange', programar);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; programar(); }, { threshold: 0.35 }).observe(raiz);
  }
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    var alCambiar = function () {
      mvs.forEach(function (mv) { if (reducido()) mv.removeAttribute('auto-rotate'); else mv.setAttribute('auto-rotate', ''); });
      programar();
    };
    if (mq.addEventListener) mq.addEventListener('change', alCambiar); else if (mq.addListener) mq.addListener(alCambiar);
  }
  document.addEventListener('mora:render', pintarFicha);

  armarPuntos();
  pintarFicha();
  iniciarVisores();
  programar();
})();
