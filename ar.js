/*
 * Mora Bistró · «Ver en su mesa»
 * Hoja a pantalla completa con <model-viewer>: el plato en 3D y, en el teléfono,
 * apoyado sobre la mesa con realidad aumentada (WebXR / Scene Viewer / Quick Look).
 *
 *   MoraAR.abrir({ src, iosSrc, titulo, nota, enlace })  -> Promise
 *     enlace: dirección de este plato; en la computadora (sin RA) se muestra como QR para el teléfono
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
      arFallo: 'Este dispositivo no pudo abrir la realidad aumentada.',
      qr: 'Escanee para verlo sobre su mesa'
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
      arFallo: 'This device could not start augmented reality.',
      qr: 'Scan to see it on your table'
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
      arFallo: 'Este dispositivo não conseguiu abrir a realidade aumentada.',
      qr: 'Escaneie para vê-lo sobre a sua mesa'
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
    var qr = el('div', 'mora-ar__qr', { hidden: '' });
    qr.innerHTML = '<div class="mora-ar__qr-codigo"></div><p class="mora-ar__qr-texto"></p>';
    pie.appendChild(qr);
    pie.appendChild(aviso);
    pie.appendChild(nota);

    raiz.appendChild(cabecera);
    raiz.appendChild(escena);
    raiz.appendChild(pie);
    raiz.addEventListener('keydown', alTeclear);
    document.body.appendChild(raiz);

    hoja = { raiz: raiz, titulo: titulo, cerrar: cerrarBtn, escena: escena, estado: estado, aviso: aviso, nota: nota, qr: qr, qrHecho: '', enlace: '', mv: null, arBtn: null, barra: null };
  }

  function construirVisor() {
    var mv = document.createElement('model-viewer');
    mv.className = 'mora-ar__visor';
    var attrs = {
      'camera-controls': '',
      'touch-action': 'pan-y',
      'interaction-prompt': 'none',
      ar: '',
      'ar-modes': 'scene-viewer quick-look webxr',
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
    // En la computadora no hay mesa que filmar: un QR lleva el mismo plato al teléfono.
    var conQR = !puede && !!hoja.enlace && !(window.matchMedia && matchMedia('(pointer: coarse)').matches);
    if (conQR && hoja.qrHecho !== hoja.enlace) {
      hoja.qr.firstChild.innerHTML = qrSVG(hoja.enlace);
      hoja.qrHecho = hoja.enlace;
    }
    hoja.qr.hidden = !conQR;
    hoja.qr.lastChild.textContent = t('qr');
    hoja.aviso.textContent = puede || conQR ? t('gesto') : t('sinAR');
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
    hoja.enlace = opciones.enlace || '';
    hoja.qr.hidden = true;
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

  /* ---------- QR (modo byte, corrección M, versiones 1–10), sin dependencias ---------- */
  // [codewords totales, bloques, corrección por bloque]
  var QR_M = [null, [26, 1, 10], [44, 1, 16], [70, 1, 26], [100, 2, 18], [134, 2, 24],
    [172, 4, 16], [196, 4, 18], [242, 4, 22], [292, 5, 22], [346, 5, 26]];
  var QR_ALIN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];

  function gfMul(x, y) {
    var z = 0;
    for (var i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11D);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  }

  function rsDivisor(grado) {
    var r = [], raiz = 1, i, j;
    for (i = 0; i < grado; i++) r.push(0);
    r[grado - 1] = 1;
    for (i = 0; i < grado; i++) {
      for (j = 0; j < r.length; j++) {
        r[j] = gfMul(r[j], raiz);
        if (j + 1 < r.length) r[j] ^= r[j + 1];
      }
      raiz = gfMul(raiz, 2);
    }
    return r;
  }

  function rsResto(datos, divisor) {
    var r = divisor.map(function () { return 0; });
    datos.forEach(function (b) {
      var f = b ^ r.shift();
      r.push(0);
      divisor.forEach(function (c, i) { r[i] ^= gfMul(c, f); });
    });
    return r;
  }

  function qrCodewords(bytes) {
    var v, info, datosCap;
    for (v = 1; v <= 10; v++) {
      info = QR_M[v];
      datosCap = info[0] - info[1] * info[2];
      if (4 + (v < 10 ? 8 : 16) + bytes.length * 8 <= datosCap * 8) break;
    }
    if (v > 10) return null;
    var bits = [];
    function poner(val, n) { for (var i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); }
    poner(4, 4);
    poner(bytes.length, v < 10 ? 8 : 16);
    bytes.forEach(function (b) { poner(b, 8); });
    poner(0, Math.min(4, datosCap * 8 - bits.length));
    while (bits.length % 8) bits.push(0);
    var datos = [], i;
    for (i = 0; i < bits.length; i += 8) {
      var b = 0;
      for (var k = 0; k < 8; k++) b = (b << 1) | bits[i + k];
      datos.push(b);
    }
    for (i = 0; datos.length < datosCap; i++) datos.push(i % 2 ? 0x11 : 0xEC);

    var total = info[0], nb = info[1], ec = info[2];
    var cortos = nb - total % nb, largoCorto = Math.floor(total / nb), div = rsDivisor(ec);
    var bloques = [], pos = 0;
    for (i = 0; i < nb; i++) {
      var d = datos.slice(pos, pos + largoCorto - ec + (i < cortos ? 0 : 1));
      pos += d.length;
      var resto = rsResto(d, div);
      if (i < cortos) d.push(0);
      bloques.push(d.concat(resto));
    }
    var salida = [];
    for (i = 0; i < bloques[0].length; i++) {
      bloques.forEach(function (bl, j) {
        if (i !== largoCorto - ec || j >= cortos) salida.push(bl[i]);
      });
    }
    return { version: v, datos: salida };
  }

  function qrMatriz(texto) {
    var bytes = Array.prototype.slice.call(new TextEncoder().encode(texto));
    var cw = qrCodewords(bytes);
    if (!cw) return null;
    var v = cw.version, n = v * 4 + 17, m = [], fn = [], x, y, i;
    for (y = 0; y < n; y++) { m.push([]); fn.push([]); for (x = 0; x < n; x++) { m[y].push(false); fn[y].push(false); } }
    function fijar(x, y, oscuro) { m[y][x] = oscuro; fn[y][x] = true; }
    function bit(val, i) { return ((val >>> i) & 1) !== 0; }

    for (i = 0; i < n; i++) { fijar(6, i, i % 2 === 0); fijar(i, 6, i % 2 === 0); }
    [[3, 3], [n - 4, 3], [3, n - 4]].forEach(function (c) {
      for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
        var d = Math.max(Math.abs(dx), Math.abs(dy)), xx = c[0] + dx, yy = c[1] + dy;
        if (xx >= 0 && xx < n && yy >= 0 && yy < n) fijar(xx, yy, d !== 2 && d !== 4);
      }
    });
    var al = QR_ALIN[v], ult = al.length - 1;
    al.forEach(function (a, ia) {
      al.forEach(function (b, ib) {
        if ((ia === 0 && ib === 0) || (ia === 0 && ib === ult) || (ia === ult && ib === 0)) return;
        for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) fijar(a + dx, b + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      });
    });
    function formato(mascara) {
      var dato = mascara, r = dato; // nivel M = 00
      for (var i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      var b = ((dato << 10) | r) ^ 0x5412;
      for (i = 0; i <= 5; i++) fijar(8, i, bit(b, i));
      fijar(8, 7, bit(b, 6)); fijar(8, 8, bit(b, 7)); fijar(7, 8, bit(b, 8));
      for (i = 9; i < 15; i++) fijar(14 - i, 8, bit(b, i));
      for (i = 0; i < 8; i++) fijar(n - 1 - i, 8, bit(b, i));
      for (i = 8; i < 15; i++) fijar(8, n - 15 + i, bit(b, i));
      fijar(8, n - 8, true);
    }
    formato(0);
    if (v >= 7) {
      var r = v;
      for (i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25);
      var vb = (v << 12) | r;
      for (i = 0; i < 18; i++) {
        var a = n - 11 + i % 3, b2 = Math.floor(i / 3);
        fijar(a, b2, bit(vb, i)); fijar(b2, a, bit(vb, i));
      }
    }
    var k = 0, datos = cw.datos;
    for (var der = n - 1; der >= 1; der -= 2) {
      if (der === 6) der = 5;
      for (var vert = 0; vert < n; vert++) for (var j = 0; j < 2; j++) {
        x = der - j;
        y = ((der + 1) & 2) === 0 ? n - 1 - vert : vert;
        if (!fn[y][x] && k < datos.length * 8) { m[y][x] = bit(datos[k >>> 3], 7 - (k & 7)); k++; }
      }
    }
    var MASCARAS = [
      function (x, y) { return (x + y) % 2 === 0; },
      function (x, y) { return y % 2 === 0; },
      function (x) { return x % 3 === 0; },
      function (x, y) { return (x + y) % 3 === 0; },
      function (x, y) { return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; },
      function (x, y) { return x * y % 2 + x * y % 3 === 0; },
      function (x, y) { return (x * y % 2 + x * y % 3) % 2 === 0; },
      function (x, y) { return ((x + y) % 2 + x * y % 3) % 2 === 0; }
    ];
    function enmascarar(q) {
      for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) if (!fn[y][x] && MASCARAS[q](x, y)) m[y][x] = !m[y][x];
    }
    var mejor = 0, menor = Infinity;
    for (var q = 0; q < 8; q++) {
      enmascarar(q); formato(q);
      var p = penalidad(m, n);
      if (p < menor) { menor = p; mejor = q; }
      enmascarar(q); // XOR: deshace
    }
    enmascarar(mejor); formato(mejor);
    return m;
  }

  function penalidad(m, n) {
    var p = 0, x, y, oscuros = 0;
    function linea(get) {
      var tot = 0, corrida = 1, i, s = [];
      for (i = 0; i < n; i++) s.push(get(i) ? 1 : 0);
      for (i = 1; i <= n; i++) {
        if (i < n && s[i] === s[i - 1]) corrida++;
        else { if (corrida >= 5) tot += corrida - 2; corrida = 1; }
      }
      var A = '10111010000', B = '00001011101', txt = s.join('');
      for (i = 0; i + 11 <= n; i++) { var seg = txt.substr(i, 11); if (seg === A || seg === B) tot += 40; }
      return tot;
    }
    for (y = 0; y < n; y++) p += linea(function (i) { return m[y][i]; });
    for (x = 0; x < n; x++) p += linea(function (i) { return m[i][x]; });
    for (y = 0; y < n - 1; y++) for (x = 0; x < n - 1; x++) {
      var c = m[y][x];
      if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3;
    }
    for (y = 0; y < n; y++) for (x = 0; x < n; x++) if (m[y][x]) oscuros++;
    var tot = n * n;
    p += (Math.ceil(Math.abs(oscuros * 20 - tot * 10) / tot) - 1) * 10;
    return p;
  }

  function qrSVG(texto) {
    var m = qrMatriz(texto);
    if (!m) return '';
    var n = m.length, borde = 4, d = '';
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) if (m[y][x]) d += 'M' + (x + borde) + ' ' + (y + borde) + 'h1v1h-1z';
    var lado = n + borde * 2;
    return '<svg viewBox="0 0 ' + lado + ' ' + lado + '" width="' + lado * 4 + '" height="' + lado * 4 + '" role="img" aria-label="QR" shape-rendering="crispEdges">' +
      '<rect width="' + lado + '" height="' + lado + '" fill="#FAF7F1"/><path fill="#17100F" d="' + d + '"/></svg>';
  }

  window.MoraAR = { abrir: abrir, cerrar: cerrar, precargar: precargar };
})();
