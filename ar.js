/*
 * Mora Bistró · «Ver en su mesa»
 * Hoja a pantalla completa con <model-viewer>: el plato en 3D y, en el teléfono,
 * apoyado sobre la mesa con realidad aumentada (WebXR / Scene Viewer / Quick Look).
 *
 *   MoraAR.abrir({ src, iosSrc, titulo, nota })  -> Promise
 *   MoraAR.cerrar()
 *   MoraAR.precargar()                           -> Promise (opcional)
 *
 * <model-viewer> se carga desde la CDN recién en el primer uso.
 */
(function () {
  'use strict';

  var MV_URL = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js';
  var MV_SRI = 'sha384-Ftcjj/GNLxPvzNDftO/oryXB9aGxsGZY9JGqsXG0uUKgQDl9RfDgsx9NJ/4IVNPe';

  var TEXTOS = {
    es: {
      dialogo: 'Vista 3D del plato',
      cerrar: 'Cerrar',
      verEnMesa: 'Ver en su mesa',
      sinAR: 'Abra la carta en su teléfono para verlo sobre la mesa',
      gesto: 'Arrastre para girar, pellizque para acercar',
      nota: 'Modelo ilustrativo',
      cargando: 'Cargando modelo',
      error: 'No se pudo cargar el modelo.',
      arFallo: 'Este dispositivo no pudo abrir la realidad aumentada.'
    },
    en: {
      dialogo: '3D view of the dish',
      cerrar: 'Close',
      verEnMesa: 'View on your table',
      sinAR: 'Open the menu on your phone to see it on your table',
      gesto: 'Drag to rotate, pinch to zoom',
      nota: 'Illustrative model',
      cargando: 'Loading model',
      error: 'The model could not be loaded.',
      arFallo: 'This device could not start augmented reality.'
    },
    pt: {
      dialogo: 'Visualização 3D do prato',
      cerrar: 'Fechar',
      verEnMesa: 'Ver na sua mesa',
      sinAR: 'Abra o cardápio no seu celular para vê-lo sobre a mesa',
      gesto: 'Arraste para girar, pince para aproximar',
      nota: 'Modelo ilustrativo',
      cargando: 'Carregando modelo',
      error: 'Não foi possível carregar o modelo.',
      arFallo: 'Este dispositivo não conseguiu abrir a realidade aumentada.'
    }
  };

  var FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), model-viewer';

  var mvPromise = null;
  var hoja = null;      // elementos de la hoja, creados una sola vez
  var abierta = false;
  var focoPrevio = null;

  function idioma() {
    var lang = (document.documentElement.lang || 'es').slice(0, 2).toLowerCase();
    return TEXTOS[lang] ? lang : 'es';
  }

  function t(clave) {
    return TEXTOS[idioma()][clave];
  }

  function reducirMovimiento() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function precargar() {
    if (mvPromise) return mvPromise;
    if (window.customElements && window.customElements.get('model-viewer')) {
      mvPromise = Promise.resolve();
      return mvPromise;
    }
    mvPromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.type = 'module';
      s.src = MV_URL;
      s.integrity = MV_SRI;
      s.crossOrigin = 'anonymous';
      s.onerror = function () {
        mvPromise = null; // permite reintentar si falló la red
        s.remove();
        reject(new Error('model-viewer no cargó'));
      };
      document.head.appendChild(s);
      window.customElements.whenDefined('model-viewer').then(resolve);
    });
    return mvPromise;
  }

  function el(tag, clase, attrs) {
    var n = document.createElement(tag);
    if (clase) n.className = clase;
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }

  function construirHoja() {
    var raiz = el('div', 'mora-ar', {
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'mora-ar-titulo',
      hidden: ''
    });

    var cabecera = el('header', 'mora-ar__cabecera');
    var titulo = el('h2', 'mora-ar__titulo', { id: 'mora-ar-titulo' });
    var cerrarBtn = el('button', 'mora-ar__cerrar', { type: 'button' });
    cerrarBtn.innerHTML =
      '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">' +
      '<path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg>';
    cerrarBtn.addEventListener('click', cerrar);
    var marca = el('div', 'mora-ar__marca');
    marca.appendChild(el('span', 'mora-ar__logo', { 'aria-hidden': 'true' }));
    marca.appendChild(titulo);
    cabecera.appendChild(marca);
    cabecera.appendChild(cerrarBtn);

    var escena = el('div', 'mora-ar__escena');
    var estado = el('p', 'mora-ar__estado', { role: 'status', 'aria-live': 'polite' });
    escena.appendChild(estado);

    var pie = el('footer', 'mora-ar__pie');
    var aviso = el('p', 'mora-ar__aviso');
    var nota = el('p', 'mora-ar__nota');
    pie.appendChild(aviso);
    pie.appendChild(nota);

    raiz.appendChild(cabecera);
    raiz.appendChild(escena);
    raiz.appendChild(pie);
    raiz.addEventListener('keydown', alTeclear);
    document.body.appendChild(raiz);

    hoja = { raiz: raiz, titulo: titulo, cerrar: cerrarBtn, escena: escena, estado: estado, aviso: aviso, nota: nota, mv: null, arBtn: null, barra: null };
  }

  function construirVisor() {
    var mv = document.createElement('model-viewer');
    mv.className = 'mora-ar__visor';
    var attrs = {
      'camera-controls': '',
      'touch-action': 'pan-y',
      'interaction-prompt': 'none',
      ar: '',
      'ar-modes': 'webxr scene-viewer quick-look',
      'ar-scale': 'fixed',
      'ar-placement': 'floor',
      'shadow-intensity': '1',
      'shadow-softness': '1',
      exposure: '1',
      'environment-image': 'neutral',
      'camera-orbit': '30deg 65deg auto',
      'min-camera-orbit': 'auto 0deg auto',
      'max-camera-orbit': 'auto 90deg auto',
      'rotation-per-second': '12deg',
      'auto-rotate-delay': '0',
      loading: 'eager',
      reveal: 'auto'
    };
    Object.keys(attrs).forEach(function (k) { mv.setAttribute(k, attrs[k]); });

    var arBtn = el('button', 'mora-ar__boton-ar', { slot: 'ar-button', type: 'button' });
    mv.appendChild(arBtn);

    var barra = el('div', 'mora-ar__barra', { slot: 'progress-bar', 'aria-hidden': 'true' });
    barra.appendChild(el('span', 'mora-ar__barra-relleno'));
    mv.appendChild(barra);

    mv.addEventListener('progress', function (e) {
      var p = e.detail.totalProgress;
      barra.firstChild.style.transform = 'scaleX(' + p + ')';
      barra.classList.toggle('es-completa', p >= 1);
    });
    mv.addEventListener('load', function () {
      hoja.estado.textContent = '';
      hoja.raiz.classList.remove('es-error');
      actualizarSoporteAR();
      setTimeout(actualizarSoporteAR, 800); // WebXR responde asíncrono
    });
    mv.addEventListener('error', function () {
      hoja.estado.textContent = t('error');
      hoja.raiz.classList.add('es-error');
    });
    mv.addEventListener('ar-status', function (e) {
      if (e.detail.status === 'failed') hoja.aviso.textContent = t('arFallo');
    });

    hoja.escena.insertBefore(mv, hoja.estado);
    hoja.mv = mv;
    hoja.arBtn = arBtn;
    hoja.barra = barra;
  }

  function actualizarSoporteAR() {
    var puede = !!(hoja.mv && hoja.mv.canActivateAR);
    hoja.raiz.classList.toggle('sin-ar', !puede);
    hoja.aviso.textContent = puede ? t('gesto') : t('sinAR');
  }

  function aplicarTextos(opciones) {
    hoja.raiz.setAttribute('lang', idioma());
    hoja.raiz.setAttribute('aria-label', t('dialogo'));
    hoja.titulo.textContent = opciones.titulo || '';
    hoja.cerrar.setAttribute('aria-label', t('cerrar'));
    hoja.nota.textContent = opciones.nota || t('nota');
    hoja.aviso.textContent = t('gesto');
  }

  function abrir(opciones) {
    opciones = opciones || {};
    if (!opciones.src) return Promise.reject(new Error('MoraAR.abrir: falta src'));
    if (!hoja) construirHoja();

    if (!abierta) focoPrevio = document.activeElement;
    aplicarTextos(opciones);
    hoja.raiz.classList.remove('es-error');
    hoja.raiz.hidden = false;
    document.documentElement.classList.add('mora-ar-abierta');
    abierta = true;
    hoja.cerrar.focus();

    if (!hoja.mv) hoja.estado.textContent = t('cargando');

    return precargar().then(function () {
      if (!abierta) return;
      if (!hoja.mv) construirVisor();
      var mv = hoja.mv;
      hoja.arBtn.textContent = t('verEnMesa');
      mv.setAttribute('alt', opciones.titulo || t('dialogo'));
      if (reducirMovimiento()) mv.removeAttribute('auto-rotate');
      else mv.setAttribute('auto-rotate', '');
      if (opciones.iosSrc) mv.setAttribute('ios-src', opciones.iosSrc);
      else mv.removeAttribute('ios-src');
      if (mv.getAttribute('src') !== opciones.src) {
        hoja.estado.textContent = t('cargando');
        mv.setAttribute('src', opciones.src);
      } else {
        hoja.estado.textContent = '';
        mv.resetTurntableRotation && mv.resetTurntableRotation();
        actualizarSoporteAR();
      }
    }, function () {
      hoja.estado.textContent = t('error');
      hoja.raiz.classList.add('es-error');
    });
  }

  function cerrar() {
    if (!hoja || !abierta) return;
    abierta = false;
    hoja.raiz.hidden = true;
    document.documentElement.classList.remove('mora-ar-abierta');
    if (focoPrevio && typeof focoPrevio.focus === 'function') focoPrevio.focus();
    focoPrevio = null;
  }

  function alTeclear(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      cerrar();
      return;
    }
    if (e.key !== 'Tab') return;
    var lista = Array.prototype.filter.call(hoja.raiz.querySelectorAll(FOCUSABLE), function (n) {
      return n.offsetParent !== null || n === document.activeElement;
    });
    if (!lista.length) return;
    var primero = lista[0];
    var ultimo = lista[lista.length - 1];
    if (e.shiftKey && (document.activeElement === primero || !hoja.raiz.contains(document.activeElement))) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  }

  // Si el foco se escapa de la hoja (clic afuera no hay, pero sí lectores de pantalla), lo devolvemos.
  document.addEventListener('focusin', function (e) {
    if (abierta && hoja && !hoja.raiz.contains(e.target)) hoja.cerrar.focus();
  });

  window.MoraAR = { abrir: abrir, cerrar: cerrar, precargar: precargar };
})();
