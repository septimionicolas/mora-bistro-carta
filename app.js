/* Mora Bistró Argentino · render de la carta. Sin dependencias, sin fetch. Lee los globales de menu.js y mapa.js. */
(function () {
  'use strict';

  var IDIOMAS = ['es', 'en', 'pt'];
  var params = new URLSearchParams(location.search);
  var estado = { lang: 'es', tema: 'oscuro', filtros: [], depto: null, mapaAbierto: false };

  /* ---------- utilidades ---------- */
  function guardar(clave, valor) { try { localStorage.setItem(clave, valor); } catch (e) { /* modo privado */ } }
  function leer(clave) { try { return localStorage.getItem(clave); } catch (e) { return null; } }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function t(clave) { return TEXTOS[estado.lang][clave]; }
  function tr(obj) { return obj ? (obj[estado.lang] || obj.es || '') : ''; }
  function precio(n) {
    var sep = estado.lang === 'en' ? ',' : '.';
    return '$' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  }
  function aMin(hhmm) { var p = hhmm.split(':'); return +p[0] * 60 + +p[1]; }
  var ROMANOS = ['I', 'II', 'III', 'IV'];
  /* Textos del índice «La carta» (la interfaz; los datos de menu.js no se tocan). */
  var TEXTOS_INDICE = {
    es: { navCarta: 'Carta', titulo: 'La carta', bajada: 'Elija por dónde empezar', saltar: 'Ir a la carta', pasos: '4 pasos',
      en: 'en', tresD: 'Algunos platos se pueden ver en 3D sobre su mesa: busque la marca 3D.',
      platos: function (n) { return n === 1 ? '1 plato' : n + ' platos'; }, bebidas: function (n) { return n + ' bebidas'; } },
    en: { navCarta: 'Menu', titulo: 'The menu', bajada: 'Choose where to begin', saltar: 'Skip to the menu', pasos: '4 courses',
      en: 'at', tresD: 'Some dishes can be viewed in 3D on your table: look for the 3D mark.',
      platos: function (n) { return n === 1 ? '1 dish' : n + ' dishes'; }, bebidas: function (n) { return n + ' drinks'; } },
    pt: { navCarta: 'Cardápio', titulo: 'O cardápio', bajada: 'Escolha por onde começar', saltar: 'Ir ao cardápio', pasos: '4 etapas',
      en: 'no', tresD: 'Alguns pratos podem ser vistos em 3D na sua mesa: procure a marca 3D.',
      platos: function (n) { return n === 1 ? '1 prato' : n + ' pratos'; }, bebidas: function (n) { return n + ' bebidas'; } }
  };
  function ti(clave) { return TEXTOS_INDICE[estado.lang][clave]; }
  /* Textos de la ficha del plato y de los filtros. */
  var TEXTOS_FICHA = {
    es: { cerrar: 'Cerrar', tresD: 'Disponible en 3D', dialogo: 'Detalle del plato',
      sinCoincidencias: 'Ningún plato coincide con los filtros elegidos.' },
    en: { cerrar: 'Close', tresD: 'Available in 3D', dialogo: 'Dish details',
      sinCoincidencias: 'No dish matches the selected filters.' },
    pt: { cerrar: 'Fechar', tresD: 'Disponível em 3D', dialogo: 'Detalhes do prato',
      sinCoincidencias: 'Nenhum prato corresponde aos filtros escolhidos.' }
  };
  function tf(clave) { return TEXTOS_FICHA[estado.lang][clave]; }
  var $ = function (sel) { return document.querySelector(sel); };

  /* ---------- idioma ---------- */
  function detectarIdioma() {
    var q = params.get('lang');
    if (IDIOMAS.indexOf(q) >= 0) return q;
    var g = leer('mora-lang');
    if (IDIOMAS.indexOf(g) >= 0) return g;
    return 'es'; /* español por defecto: no se mira el idioma del navegador */
  }

  /* ---------- hora de Tucumán ---------- */
  function ahoraTucuman() {
    var h, m, dia;
    try {
      var partes = new Intl.DateTimeFormat('en-US', {
        timeZone: CONFIG.zonaHoraria, hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false
      }).formatToParts(new Date());
      partes.forEach(function (p) {
        if (p.type === 'hour') h = +p.value % 24;
        if (p.type === 'minute') m = +p.value;
        if (p.type === 'weekday') dia = p.value.toLowerCase();
      });
    } catch (e) {
      var d = new Date(); h = d.getHours(); m = d.getMinutes(); dia = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][d.getDay()];
    }
    var qh = params.get('hora');
    if (qh && /^\d{1,2}:\d{2}$/.test(qh)) { h = +qh.split(':')[0] % 24; m = +qh.split(':')[1]; }
    var qd = params.get('dia');
    if (qd) dia = { lun: 'mon', mar: 'tue', mie: 'wed', jue: 'thu', vie: 'fri', sab: 'sat', dom: 'sun' }[qd] || dia;
    return { min: h * 60 + m, hora: h, finde: dia === 'sat' || dia === 'sun' };
  }

  function abierto(s, ahora) {
    var desde = aMin(s.desde), hasta = aMin(ahora.finde && s.hastaFinde ? s.hastaFinde : s.hasta);
    return desde < hasta ? (ahora.min >= desde && ahora.min < hasta) : (ahora.min >= desde || ahora.min < hasta);
  }
  function hastaDe(s, ahora) { return ahora.finde && s.hastaFinde ? s.hastaFinde : s.hasta; }

  /* Prioridad: comida principal, después lobby bar, después room service. */
  function servicioActual() {
    var ahora = ahoraTucuman();
    var orden = ['desayuno', 'almuerzo', 'cena', 'lobby', 'room'];
    for (var i = 0; i < orden.length; i++) {
      var s = HORARIOS.filter(function (x) { return x.id === orden[i]; })[0];
      if (abierto(s, ahora)) return { abierto: true, s: s, hasta: hastaDe(s, ahora) };
    }
    var prox = null, dif = 1e9;
    HORARIOS.forEach(function (s) {
      var d = (aMin(s.desde) - ahora.min + 1440) % 1440;
      if (d < dif) { dif = d; prox = s; }
    });
    return { abierto: false, s: prox };
  }

  /* ---------- tema ---------- */
  function temaEfectivo() {
    var q = params.get('tema');
    if (q === 'oscuro' || q === 'claro') return q;
    /* Oscuro a toda hora; marfil sólo si se elige. */
    return estado.tema === 'claro' ? 'claro' : 'oscuro';
  }
  function aplicarTema() {
    var efectivo = temaEfectivo();
    document.documentElement.setAttribute('data-theme', efectivo === 'oscuro' ? 'dark' : 'light');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', efectivo === 'oscuro' ? '#0E0C0B' : '#F3EEE4');
    var btn = $('#btn-tema');
    if (btn) {
      var nombre = efectivo === 'oscuro' ? t('temaOscuro') : t('temaClaro');
      btn.querySelector('span').textContent = nombre;
      btn.setAttribute('aria-label', t('tema') + ': ' + nombre);
    }
  }

  /* ---------- piezas ---------- */
  function ornamento() {
    return '<svg class="ornamento" viewBox="0 0 160 12" aria-hidden="true" focusable="false">' +
      '<path d="M0 6 H68 M92 6 H160" /><path d="M80 1 L85 6 L80 11 L75 6 Z" />' +
      '<circle cx="70" cy="6" r="1" /><circle cx="90" cy="6" r="1" /></svg>';
  }

  function foto(src, mini, alt) {
    if (!src) return '';
    return '<figure class="foto">' +
      '<span class="foto-marco"><img src="' + esc(mini || src) + '"' + (mini ? ' srcset="' + esc(mini) + ' 640w, ' + esc(src) + ' 1200w" sizes="(min-width: 720px) 640px, 100vw"' : '') +
      ' width="1200" height="900" loading="lazy" decoding="async" alt="' + esc(alt) + '"' +
      ' onerror="this.closest(\'figure\').hidden=true"></span>' +
      '<figcaption>' + esc(t('ilustrativa')) + '</figcaption></figure>';
  }

  function botonAR(item, titulo, frag) {
    if (!item.modelo || !window.MoraAR) return '';
    return '<button type="button" class="btn-ar" data-modelo="' + esc(item.modelo) + '" data-ios="' + esc(item.modeloIos || '') +
      '" data-titulo="' + esc(titulo) + '" data-frag="' + esc(frag || item.id || '') + '">' + esc(t('verEnSuMesa')) + '</button>';
  }

  function etiquetas(item) {
    return (item.tags || []).map(function (tag) {
      return '<li class="tag tag-' + tag + '">' + esc(t(tag)) + '</li>';
    }).join('');
  }

  /* Fila de la lista: el nombre es un botón que se estira sobre toda la fila y abre la ficha. */
  function plato(item) {
    var nombre = tr(item.nombre), desc = tr(item.desc);
    var tags = etiquetas(item);
    var marca = item.modelo ? '<span class="marca-3d"><span aria-hidden="true">3D</span><span class="vh">' + esc(tf('tresD')) + '</span></span>' : '';
    var mini = item.fotoMini ? '<img class="plato-mini" src="' + esc(item.fotoMini) + '" alt="" width="160" height="160" loading="lazy" decoding="async" onerror="this.remove()">' : '';
    return '<li class="plato plato-fila" id="plato-' + esc(item.id) + '" data-tags="' + esc((item.tags || []).join(' ')) + '">' +
      '<div class="plato-texto"><div class="plato-linea"><h3 class="plato-nombre"><button type="button" class="plato-btn" data-plato="' + esc(item.id) +
      '" aria-haspopup="dialog">' + esc(nombre) + '</button></h3>' + marca +
      '<span class="puntos" aria-hidden="true"></span><span class="precio">' + precio(item.precio) + '</span></div>' +
      (desc ? '<p class="plato-desc">' + esc(desc) + '</p>' : '') +
      (tags ? '<ul class="tags">' + tags + '</ul>' : '') + '</div>' + mini + '</li>';
  }

  function seccion(s) {
    return '<section class="seccion" id="' + s.id + '" aria-labelledby="t-' + s.id + '">' +
      '<header class="seccion-cabeza">' + ornamento() + '<h2 id="t-' + s.id + '" class="titulo-script">' + esc(tr(s.titulo)) + '</h2></header>' +
      '<ul class="platos platos-carta">' + s.items.map(plato).join('') + '</ul></section>';
  }

  /* ---------- ficha del plato ---------- */
  var PLATOS = {};
  SECCIONES.forEach(function (s) { s.items.forEach(function (it) { PLATOS[it.id] = it; }); });
  var ficha = null, fichaId = null, fichaFoco = null, fichaTimer = 0;
  var FOCO_FICHA = 'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

  function construirFicha() {
    var raiz = document.createElement('div');
    raiz.className = 'ficha';
    raiz.hidden = true;
    raiz.innerHTML = '<div class="ficha-fondo" data-cerrar-ficha></div>' +
      '<div class="ficha-panel" role="dialog" aria-modal="true" aria-labelledby="ficha-titulo" tabindex="-1">' +
      '<div class="ficha-asa" aria-hidden="true"></div>' +
      '<button type="button" class="ficha-cerrar" data-cerrar-ficha><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">' +
      '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/></svg></button>' +
      '<div class="ficha-cuerpo"></div></div>';
    document.body.appendChild(raiz);
    ficha = { raiz: raiz, panel: raiz.querySelector('.ficha-panel'), cuerpo: raiz.querySelector('.ficha-cuerpo'), cerrar: raiz.querySelector('.ficha-cerrar') };
    raiz.addEventListener('keydown', teclaFicha);
    arrastreFicha(ficha.panel);
  }

  function contenidoFicha(item) {
    var nombre = tr(item.nombre), desc = tr(item.desc), tags = etiquetas(item);
    var fotoHtml = item.foto ? '<figure class="ficha-foto"><img src="' + esc(item.fotoMini || item.foto) + '"' +
      (item.fotoMini ? ' srcset="' + esc(item.fotoMini) + ' 640w, ' + esc(item.foto) + ' 1200w" sizes="(min-width: 820px) 560px, 100vw"' : '') +
      ' width="1200" height="900" decoding="async" alt="' + esc(nombre) + '" onerror="var f=this.closest(\'.ficha-cuerpo\');' +
      'f.querySelectorAll(\'.ficha-foto, .ficha-ilustrativa\').forEach(function(n){n.remove()})"></figure>' : '';
    return fotoHtml + '<div class="ficha-texto"><div class="plato-linea"><h2 class="ficha-nombre" id="ficha-titulo">' + esc(nombre) + '</h2>' +
      '<span class="puntos" aria-hidden="true"></span><span class="precio">' + precio(item.precio) + '</span></div>' +
      (desc ? '<p class="ficha-desc">' + esc(desc) + '</p>' : '') +
      (tags ? '<ul class="tags">' + tags + '</ul>' : '') +
      (item.maridaje ? '<p class="maridaje"><span class="maridaje-etiqueta">' + esc(t('maridaje')) + '</span> ' + esc(tr(item.maridaje)) + '</p>' : '') +
      botonAR(item, nombre, 'plato-' + item.id) +
      (item.foto ? '<p class="ficha-ilustrativa">' + esc(t('ilustrativa')) + '</p>' : '') + '</div>';
  }

  function abrirFicha(id, desde) {
    var item = PLATOS[id];
    if (!item) return false;
    if (!ficha) construirFicha();
    clearTimeout(fichaTimer);
    if (!fichaId) fichaFoco = desde || document.activeElement;
    fichaId = id;
    ficha.panel.setAttribute('lang', estado.lang);
    ficha.panel.setAttribute('aria-label', tf('dialogo'));
    ficha.cerrar.setAttribute('aria-label', tf('cerrar'));
    ficha.cuerpo.innerHTML = contenidoFicha(item);
    ficha.cuerpo.scrollTop = 0;
    ficha.panel.style.transform = '';
    ficha.raiz.hidden = false;
    document.documentElement.classList.add('ficha-abierta');
    fondoInerte(true);
    requestAnimationFrame(function () { requestAnimationFrame(function () { if (fichaId) ficha.raiz.classList.add('abierta'); }); });
    ficha.cerrar.focus({ preventScroll: true });
    if (location.hash !== '#plato-' + id) history.replaceState(null, '', '#plato-' + id);
    return true;
  }

  function cerrarFicha() {
    if (!ficha || !fichaId) return;
    var id = fichaId;
    fichaId = null;
    ficha.raiz.classList.remove('abierta');
    ficha.panel.classList.remove('arrastrando');
    ficha.panel.style.transform = ''; /* desde donde quedó el arrastre, la transición la lleva hasta abajo */
    document.documentElement.classList.remove('ficha-abierta');
    fondoInerte(false);
    fichaTimer = setTimeout(function () { ficha.raiz.hidden = true; }, reducido() ? 0 : 280);
    if (/^#plato-/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
    var volver = fichaFoco && document.contains(fichaFoco) ? fichaFoco : document.querySelector('#plato-' + id + ' .plato-btn');
    fichaFoco = null;
    if (volver && volver.focus) volver.focus({ preventScroll: true });
  }

  function fondoInerte(si) {
    document.querySelectorAll('main, #nav, .cabecera, #pie, .saltar').forEach(function (n) {
      if (si) n.setAttribute('inert', ''); else n.removeAttribute('inert');
    });
  }

  function teclaFicha(e) {
    if (document.documentElement.classList.contains('mora-ar-abierta')) return;
    if (e.key === 'Escape') { e.preventDefault(); cerrarFicha(); return; }
    if (e.key !== 'Tab') return;
    var lista = Array.prototype.filter.call(ficha.panel.querySelectorAll(FOCO_FICHA), function (n) { return n.offsetParent !== null; });
    if (!lista.length) return;
    var primero = lista[0], ultimo = lista[lista.length - 1];
    if (e.shiftKey && (document.activeElement === primero || document.activeElement === ficha.panel)) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
  }

  /* Hoja del teléfono: se cierra arrastrando hacia abajo desde el asa o la foto. */
  function arrastreFicha(panel) {
    var y0 = 0, t0 = 0, dy = 0, activo = false;
    panel.addEventListener('pointerdown', function (e) {
      if (window.innerWidth >= 820 || !e.target.closest('.ficha-asa, .ficha-foto')) return;
      activo = true; y0 = e.clientY; t0 = Date.now(); dy = 0;
      panel.classList.add('arrastrando');
      try { panel.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
    });
    panel.addEventListener('pointermove', function (e) {
      if (!activo) return;
      dy = Math.max(0, e.clientY - y0);
      panel.style.transform = 'translateY(' + dy + 'px)';
    });
    function soltar() {
      if (!activo) return;
      activo = false;
      panel.classList.remove('arrastrando');
      var rapido = dy > 40 && dy / Math.max(1, Date.now() - t0) > 0.6;
      if (dy > 100 || rapido) cerrarFicha();
      else panel.style.transform = '';
    }
    panel.addEventListener('pointerup', soltar);
    panel.addEventListener('pointercancel', soltar);
  }

  function fichaDesdeHash() {
    var m = /^#plato-(.+)$/.exec(location.hash);
    if (m && PLATOS[m[1]]) { if (fichaId !== m[1]) abrirFicha(m[1]); }
    else if (fichaId) cerrarFicha();
  }

  function bebidas() {
    var b = BEBIDAS;
    return '<section class="seccion" id="bebidas" aria-labelledby="t-bebidas">' +
      '<header class="seccion-cabeza">' + ornamento() + '<h2 id="t-bebidas" class="titulo-script">' + esc(tr(b.titulo)) + '</h2></header>' +
      b.grupos.map(function (g) {
        return '<h3 class="subtitulo">' + esc(tr(g.titulo)) + '</h3><ul class="platos platos-simples">' +
          g.items.map(function (it) {
            return '<li class="plato"><div class="plato-linea"><span class="plato-nombre">' + esc(tr(it.nombre)) + '</span>' +
              '<span class="puntos" aria-hidden="true"></span><span class="precio">' + precio(it.precio) + '</span></div></li>';
          }).join('') + '</ul>';
      }).join('') + '</section>';
  }

  /* ---------- Menú de pasos «Tucumán a la carta» ---------- */
  function platosDeDepto(id) {
    var lista = [];
    SECCIONES.forEach(function (s) {
      s.items.forEach(function (it) {
        if (it.origen && !it.origen_confirmar && it.origen.indexOf(id) >= 0) lista.push(it);
      });
    });
    return lista;
  }
  function pasosDeDepto(id) {
    return MENU_PASOS.pasos.map(function (p, i) { return { p: p, i: i }; })
      .filter(function (x) { return x.p.origen.indexOf(id) >= 0; });
  }

  function mapaSVG() {
    var deptos = MAPA_TUCUMAN.deptos, partes = [], etiquetasTxt = [];
    Object.keys(deptos).forEach(function (id) {
      var d = deptos[id], activo = !!ORIGENES[id];
      if (activo) {
        partes.push('<path class="depto depto-activo" data-depto="' + id + '" d="' + d.d + '" role="button" tabindex="0" ' +
          'aria-pressed="false" aria-label="' + esc(NOMBRES_DEPTO[id]) + '"><title>' + esc(NOMBRES_DEPTO[id]) + '</title></path>');
        etiquetasTxt.push('<text class="depto-nombre" x="' + d.c[0] + '" y="' + d.c[1] + '" aria-hidden="true">' + esc(NOMBRES_DEPTO[id]) + '</text>');
      } else {
        partes.push('<path class="depto" d="' + d.d + '" aria-hidden="true"></path>');
      }
    });
    return '<svg class="mapa-svg" viewBox="' + MAPA_TUCUMAN.viewBox + '" role="group" aria-label="' + esc(t('mapaTitulo')) + '">' +
      '<g class="mapa-trama">' + partes.join('') + '</g><g class="mapa-etiquetas">' + etiquetasTxt.join('') + '</g>' +
      '<g class="rosa" transform="translate(372 560)" aria-hidden="true"><path d="M0 -22 L4 0 L0 22 L-4 0 Z M-14 0 H14" />' +
      '<text x="0" y="-27">N</text></g></svg>';
  }

  function panelDepto() {
    var id = estado.depto;
    if (!id) return '<p class="panel-vacio">' + esc(t('mapaVacio')) + '</p>';
    var o = ORIGENES[id];
    var prods = o.productos.map(function (p) {
      return '<li>' + esc(p[estado.lang] || p.es) + (p.lugar ? ' <span class="lugar">(' + esc(p.lugar) + ')</span>' : '') +
        (p.ig ? ' <abbr class="ig" title="' + esc(t('igLargo')) + '">' + esc(t('ig')) + '</abbr>' : '') + '</li>';
    }).join('');
    var pasos = pasosDeDepto(id).map(function (x) {
      return '<li><a href="#' + x.p.id + '">' + esc(t('paso')) + ' ' + ROMANOS[x.i] + '</a></li>';
    }).join('');
    var platos = platosDeDepto(id).map(function (it) {
      return '<li><a href="#plato-' + it.id + '">' + esc(tr(it.nombre)) + '</a></li>';
    }).join('');
    return '<h4 class="panel-titulo">' + esc(NOMBRES_DEPTO[id]) + '</h4><ul class="panel-productos">' + prods + '</ul>' +
      (pasos ? '<p class="panel-etiqueta">' + esc(t('mapaPasos')) + '</p><ul class="panel-links">' + pasos + '</ul>' : '') +
      (platos ? '<p class="panel-etiqueta">' + esc(t('mapaPlatos')) + '</p><ul class="panel-links">' + platos + '</ul>' : '');
  }

  function tucuman() {
    var mp = MENU_PASOS, abierto = estado.mapaAbierto;
    var pasos = mp.pasos.map(function (p, i) {
      return '<li class="paso" id="' + p.id + '"><span class="paso-num" aria-hidden="true">' + ROMANOS[i] + '</span>' +
        '<div class="paso-cuerpo"><h3 class="paso-titulo">' + esc(t('paso')) + ' ' + ROMANOS[i] + '</h3>' +
        '<p>' + esc(p[estado.lang]) + '</p>' + foto(p.foto, p.fotoMini, ROMANOS[i]) + botonAR(p, t('paso') + ' ' + ROMANOS[i]) + '</div></li>';
    }).join('');
    var chips = Object.keys(ORIGENES).map(function (id) {
      return '<li><button type="button" class="chip" data-depto="' + id + '" aria-pressed="' + (estado.depto === id) + '">' +
        esc(NOMBRES_DEPTO[id]) + '</button></li>';
    }).join('');
    return '<section class="seccion tucuman" id="tucuman" aria-labelledby="t-tucuman">' +
      '<header class="seccion-cabeza">' + ornamento() +
      '<h2 id="t-tucuman" class="titulo-script">' + esc(t('tucumanTitulo')) + '</h2>' +
      '<p class="sobretitulo">' + esc(t('tucumanBajada')) + '</p>' +
      '<p class="nota-centro">' + esc(t('tucumanIntro')) + '</p></header>' +
      '<ol class="pasos">' + pasos + '</ol>' +
      '<div class="pasos-precio"><span class="precio precio-grande">' + precio(mp.precio) + '</span> <span class="por-persona">' + esc(t('porPersona')) + '</span></div>' +
      '<p class="incluye" id="pasos-incluye">' + esc(mp.incluye[estado.lang]) + '</p>' +
      '<p class="mapa-abrir"><button type="button" class="mapa-toggle" aria-expanded="' + !!abierto + '" aria-controls="mapa">' +
      esc(t('origenToggle')) + '<span class="mapa-flecha" aria-hidden="true"></span></button></p>' +
      '<div class="mapa" id="mapa"' + (abierto ? '' : ' hidden') + '><h3 class="subtitulo">' + esc(t('mapaTitulo')) + '</h3>' +
      '<p class="mapa-ayuda">' + esc(t('mapaAyuda')) + '</p>' +
      '<div class="mapa-cuerpo"><div class="mapa-dibujo">' + mapaSVG() + '</div>' +
      '<div class="mapa-lado"><ul class="chips" aria-label="' + esc(t('mapaLista')) + '">' + chips + '</ul>' +
      '<div class="panel" id="panel-depto" aria-live="polite">' + panelDepto() + '</div></div></div>' +
      '<p class="mapa-nota">' + esc(t('sinDepto')) + '</p></div></section>';
  }

  function elegirDepto(id) {
    estado.depto = estado.depto === id ? null : id;
    document.querySelectorAll('[data-depto].depto-activo, .chip[data-depto]').forEach(function (el) {
      var sel = el.getAttribute('data-depto') === estado.depto;
      el.setAttribute('aria-pressed', sel ? 'true' : 'false');
      el.classList.toggle('seleccionado', sel);
    });
    $('#panel-depto').innerHTML = panelDepto();
  }

  /* ---------- cabecera, ahora, nav, filtros ---------- */
  function lineaAhora() {
    var a = servicioActual(), nombre = t('servicios')[a.s.id];
    if (a.abierto) {
      var destino = a.s.seccion ? ' <a class="ahora-link" href="#' + a.s.seccion + '">' + esc(t('verServicio')) + '</a>' : '';
      return '<span class="ahora-etiqueta">' + esc(t('ahora')) + ':</span> ' + esc(nombre.toLowerCase()) + ' · ' + esc(t('hasta')) + ' ' + a.hasta + destino;
    }
    return '<span class="ahora-etiqueta">' + esc(t('cerrado')) + '</span> · ' + esc(t('abre')) + ' ' + esc(nombre.toLowerCase()) + ' ' + a.s.desde;
  }

  function navItems() {
    var items = [{ id: 'menu', txt: ti('navCarta') }];
    SECCIONES.forEach(function (s) { items.push({ id: s.id, txt: tr(s.titulo) }); });
    items.push({ id: 'tucuman', txt: t('navTucuman') }, { id: 'bebidas', txt: t('navBebidas') });
    return items.map(function (i) { return '<li><a href="#' + i.id + '" data-nav="' + i.id + '">' + esc(i.txt) + '</a></li>'; }).join('');
  }

  /* ---------- índice «La carta»: tarjetas que llevan a cada sección ---------- */
  function primeraFoto(items) {
    for (var i = 0; i < items.length; i++) if (items[i].fotoMini) return items[i].fotoMini;
    return '';
  }
  function tarjeta(href, nombre, cuenta, mini, clase) {
    var img = mini ? '<img src="' + esc(mini) + '" alt="" width="640" height="480" loading="lazy" decoding="async" onerror="this.parentNode.classList.remove(\'con-foto\');this.remove()">' : '';
    return '<li class="' + (clase || '') + '"><a class="indice-tarjeta' + (mini ? ' con-foto' : '') + '" href="' + href + '">' + img +
      '<span class="indice-nombre">' + esc(nombre) + '</span><span class="indice-cuenta">' + esc(cuenta) + '</span></a></li>';
  }
  function indice() {
    var nBebidas = BEBIDAS.grupos.reduce(function (n, g) { return n + g.items.length; }, 0);
    var html = SECCIONES.map(function (s) { return tarjeta('#' + s.id, tr(s.titulo), ti('platos')(s.items.length), primeraFoto(s.items)); }).join('');
    html += tarjeta('#tucuman', t('tucumanTitulo'), ti('pasos') + ' · ' + precio(MENU_PASOS.precio), primeraFoto(MENU_PASOS.pasos));
    html += tarjeta('#bebidas', tr(BEBIDAS.titulo), ti('bebidas')(nBebidas), BEBIDAS.fotoMini || '');
    return '<header class="seccion-cabeza indice-cabeza">' + ornamento() + '<h2 id="t-menu" class="titulo-script">' + esc(ti('titulo')) + '</h2>' +
      '<p class="indice-bajada">' + esc(ti('bajada')) + '</p></header><ul class="indice-grilla">' + html + '</ul>' +
      '<p class="indice-3d"><span class="indice-3d-marca" aria-hidden="true">3D</span> ' + esc(ti('tresD')) + '</p>';
  }

  function filtros() {
    return '<div class="filtros" role="group" aria-label="' + esc(t('filtros')) + '">' +
      ['sintacc', 'vegano', 'compartir'].map(function (f) {
        return '<button type="button" class="filtro" data-filtro="' + f + '" aria-pressed="' + (estado.filtros.indexOf(f) >= 0) + '">' + esc(t(f)) + '</button>';
      }).join('') + '</div><div class="filtro-estado" aria-live="polite"></div>';
  }

  function aplicarFiltros() {
    var total = 0, activos = estado.filtros;
    document.querySelectorAll('#carta > .seccion').forEach(function (sec) {
      var platos = sec.querySelectorAll('.platos-carta > .plato');
      if (!platos.length) { sec.hidden = !!activos.length; return; } /* pasos y bebidas no se filtran: se ocultan */
      var visibles = 0;
      platos.forEach(function (p) {
        var tags = (p.getAttribute('data-tags') || '').split(' ');
        var ok = activos.every(function (f) { return tags.indexOf(f) >= 0; });
        p.hidden = !ok;
        if (ok) visibles++;
      });
      total += visibles;
      sec.hidden = !!(activos.length && visibles === 0); /* sección sin coincidencias: se oculta entera */
    });
    var caja = $('.filtro-estado');
    if (!caja) return;
    caja.innerHTML = activos.length ? '<p class="filtro-cuenta">' + esc(t('resultados')(total)) + '</p>' +
      (total ? '' : '<p class="filtro-vacio">' + esc(tf('sinCoincidencias')) + '</p>') +
      '<button type="button" class="limpiar">' + esc(t('limpiar')) + '</button>' : '';
  }

  /* ---------- pie ---------- */
  function enlace(url, texto, clase) {
    if (!url) return '';
    return '<a class="btn ' + clase + '" href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(texto) + '</a>';
  }

  function pie() {
    var r = CONFIG.resenas, g = CONFIG.gerente;
    var mail = g.email ? 'mailto:' + g.email : '', wa = g.whatsapp ? 'https://wa.me/' + g.whatsapp.replace(/\D/g, '') : '';
    var hs = function (a, b) { return a + '–' + b; };
    return '<span class="logo logo-pie" role="img" aria-label="Mora Bistró Argentino"></span>' +
      '<div class="pie-bloque resenas"><h2 class="titulo-script">' + esc(t('resenasTitulo')) + '</h2>' +
      '<p>' + esc(t('resenasTexto')) + '</p><div class="botones">' +
      enlace(r.google, t('google'), 'btn-resena') + enlace(r.tripadvisor, t('tripadvisor'), 'btn-resena') + '</div>' +
      (mail || wa ? '<h3 class="subtitulo">' + esc(t('gerenteTitulo')) + '</h3><p>' + esc(t('gerenteTexto')) + '</p><div class="botones">' +
        enlace(mail, t('email'), 'btn-gerente') + enlace(wa, t('whatsapp'), 'btn-gerente') + '</div>' : '') + '</div>' +
      ornamento() +
      '<div class="pie-bloque"><h3 class="subtitulo">' + esc(t('horarios')) + '</h3><dl class="horarios">' +
      '<dt>' + esc(t('servicios').desayuno) + '</dt><dd>' + esc(t('lav')) + ' ' + hs('06:30', '10:30') + '<br>' + esc(t('finde')) + ' ' + hs('06:30', '11:00') + '</dd>' +
      '<dt>' + esc(t('servicios').almuerzo) + '</dt><dd>' + hs('12:30', '16:00') + '</dd>' +
      '<dt>' + esc(t('servicios').cena) + '</dt><dd>' + hs('20:00', '00:30') + '</dd>' +
      '<dt>' + esc(t('servicios').lobby) + '</dt><dd>' + hs('08:00', '02:00') + '</dd>' +
      '<dt>' + esc(t('servicios').room) + '</dt><dd>' + hs('16:00', '03:00')+ '</dd></dl></div>' +
      '<div class="pie-bloque"><h3 class="subtitulo">' + esc(t('direccion')) + '</h3><address>Mora Bistró Argentino<br>Sheraton Tucumán · Av. Soldati 440<br>San Miguel de Tucumán</address>' +
      '<p><a href="https://www.instagram.com/' + esc(CONFIG.instagram) + '/" target="_blank" rel="noopener">' + esc(t('instagram')) + ' @' + esc(CONFIG.instagram) + '</a></p>' +
      '<p class="falasco">' + esc(t('falasco')) + '</p></div>' +
      '<p class="pie-tema"><button type="button" class="btn-tema" id="btn-tema" aria-label="' + esc(t('tema')) + '">' +
      '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><circle cx="10" cy="10" r="6.5" /><path d="M10 3.5 A6.5 6.5 0 0 1 10 16.5 Z" /></svg>' +
      '<span></span></button></p>' +
      '<p class="legal">' + esc(t('legal')) + '</p>' +
      '<p class="legal"><a href="creditos.html?lang=' + estado.lang + '">' + esc(t('creditos')) + '</a></p>' +
      '<p class="arriba"><a href="#inicio">' + esc(t('volverArriba')) + '</a></p>';
  }

  /* ---------- render ---------- */
  function render() {
    var L = estado.lang;
    document.documentElement.lang = L;
    document.title = t('titulo');
    var md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute('content', t('descripcion'));

    $('#ahora').innerHTML = lineaAhora();
    $('#idiomas').setAttribute('aria-label', t('idioma'));
    document.querySelectorAll('#idiomas button').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-lang') === L ? 'true' : 'false');
    });
    $('#nav').setAttribute('aria-label', t('navegacion'));
    $('#nav ul').innerHTML = navItems();
    $('#menu').innerHTML = indice();
    $('.portada-bajada').textContent = ti('en') + ' Sheraton Tucumán';
    $('.saltar').textContent = ti('saltar');
    $('#filtros').innerHTML = filtros();
    $('#carta').innerHTML = SECCIONES.map(seccion).join('') + tucuman() + bebidas();
    $('#pie').innerHTML = pie();
    aplicarTema();
    aplicarFiltros();
    if (estado.depto) elegirDepto(estado.depto, true);
    observarSecciones();
    document.dispatchEvent(new CustomEvent('mora:render'));
  }

  /* ---------- sección activa en la nav ---------- */
  var observador = null;
  function marcarNav(id) {
    document.querySelectorAll('#nav a').forEach(function (a) {
      var act = a.getAttribute('data-nav') === id;
      a.classList.toggle('activo', act);
      if (act) {
        a.setAttribute('aria-current', 'true');
        var nav = $('#nav ul'), izq = a.offsetLeft - (nav.clientWidth - a.offsetWidth) / 2;
        nav.style.setProperty('--ind-x', a.offsetLeft + 'px');
        nav.style.setProperty('--ind-w', a.offsetWidth + 'px');
        nav.classList.add('con-indicador');
        nav.scrollTo({ left: Math.max(0, izq), behavior: reducido() ? 'auto' : 'smooth' });
      } else a.removeAttribute('aria-current');
    });
  }
  function reducido() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function observarSecciones() {
    if (observador) observador.disconnect();
    if (!('IntersectionObserver' in window)) return;
    observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) { if (e.isIntersecting) marcarNav(e.target.id); });
    }, { rootMargin: '-35% 0px -60% 0px' });
    document.querySelectorAll('#menu, #carta > .seccion').forEach(function (s) { observador.observe(s); });
  }

  /* ---------- eventos ---------- */
  function eventos() {
    document.addEventListener('click', function (ev) {
      var el = ev.target.closest('button, a, path[data-depto], [data-cerrar-ficha]');
      if (!el) return;
      if (el.hasAttribute('data-cerrar-ficha')) { cerrarFicha(); return; }
      if (el.matches('.plato-btn')) { abrirFicha(el.getAttribute('data-plato'), el); return; }
      if (el.matches('a[href^="#plato-"]') && PLATOS[el.getAttribute('href').slice(7)]) {
        ev.preventDefault(); abrirFicha(el.getAttribute('href').slice(7), el); return;
      }
      if (el.matches('.indice-tarjeta') && !reducido()) {
        el.classList.remove('brilla'); void el.offsetWidth; el.classList.add('brilla');
      }
      if (el.matches('#idiomas button')) {
        estado.lang = el.getAttribute('data-lang'); guardar('mora-lang', estado.lang); render(); return;
      }
      if (el.id === 'btn-tema') {
        estado.tema = temaEfectivo() === 'claro' ? 'oscuro' : 'claro';
        params.delete('tema');
        guardar('mora-tema', estado.tema); aplicarTema(); return;
      }
      if (el.matches('.filtro')) {
        var f = el.getAttribute('data-filtro'), i = estado.filtros.indexOf(f);
        if (i >= 0) estado.filtros.splice(i, 1); else estado.filtros.push(f);
        el.setAttribute('aria-pressed', i < 0 ? 'true' : 'false');
        aplicarFiltros(); return;
      }
      if (el.matches('.limpiar')) {
        estado.filtros = [];
        document.querySelectorAll('.filtro').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
        aplicarFiltros(); return;
      }
      if (el.matches('.mapa-toggle')) {
        estado.mapaAbierto = !estado.mapaAbierto;
        el.setAttribute('aria-expanded', String(estado.mapaAbierto));
        $('#mapa').hidden = !estado.mapaAbierto; return;
      }
      if (el.hasAttribute('data-depto')) { elegirDepto(el.getAttribute('data-depto')); return; }
      if (el.matches('.btn-ar') && window.MoraAR) {
        var frag = el.getAttribute('data-frag');
        window.MoraAR.abrir({
          src: el.getAttribute('data-modelo'), iosSrc: el.getAttribute('data-ios'),
          titulo: el.getAttribute('data-titulo'), nota: t('modeloIlustrativo'),
          enlace: location.origin + location.pathname + (estado.lang !== 'es' ? '?lang=' + estado.lang : '') + (frag ? '#' + frag : '')
        });
      }
    });
    window.addEventListener('hashchange', fichaDesdeHash);
    document.addEventListener('focusin', function (e) {
      if (fichaId && !ficha.raiz.contains(e.target) && !e.target.closest('.mora-ar')) ficha.cerrar.focus({ preventScroll: true });
    });
    document.addEventListener('keydown', function (ev) {
      var el = ev.target;
      if (el.matches && el.matches('path[data-depto]') && (ev.key === 'Enter' || ev.key === ' ')) {
        ev.preventDefault(); elegirDepto(el.getAttribute('data-depto'));
      }
    });
    /* Cambio de franja horaria sin recargar (tema automático y línea «Ahora»). */
    setInterval(function () { $('#ahora').innerHTML = lineaAhora(); aplicarTema(); }, 60000);
  }

  /* El logo chico de la nav aparece cuando el grande de la portada sale de pantalla. */
  function logoEnNav() {
    var grande = $('.portada-logo'), nav = $('#nav');
    if (!grande || !nav || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (e) { nav.classList.toggle('con-logo', !e[0].isIntersecting); }).observe(grande);
  }

  estado.lang = detectarIdioma();
  var temaGuardado = leer('mora-tema');
  estado.tema = temaGuardado === 'claro' ? 'claro' : 'oscuro';
  render();
  eventos();
  logoEnNav();
  fichaDesdeHash();
})();
