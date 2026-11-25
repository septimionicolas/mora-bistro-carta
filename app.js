/* Mora Bistró Argentino · render de la carta. Sin dependencias, sin fetch. Lee los globales de menu.js y mapa.js. */
(function () {
  'use strict';

  var IDIOMAS = ['es', 'en', 'pt'];
  var params = new URLSearchParams(location.search);
  var estado = { lang: 'es', tema: 'oscuro', filtros: [], depto: null };

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
  var $ = function (sel) { return document.querySelector(sel); };

  /* ---------- idioma ---------- */
  function detectarIdioma() {
    var q = params.get('lang');
    if (IDIOMAS.indexOf(q) >= 0) return q;
    var g = leer('mora-lang');
    if (IDIOMAS.indexOf(g) >= 0) return g;
    var langs = navigator.languages || [navigator.language || 'es'];
    for (var i = 0; i < langs.length; i++) {
      var base = String(langs[i]).slice(0, 2).toLowerCase();
      if (IDIOMAS.indexOf(base) >= 0) return base;
    }
    return 'es';
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

  function foto(src, mini, alt, clase) {
    if (!src) return '';
    return '<figure class="foto ' + (clase || '') + '">' +
      '<span class="foto-marco"><img src="' + esc(mini || src) + '"' + (mini ? ' srcset="' + esc(mini) + ' 600w, ' + esc(src) + ' 1400w" sizes="(min-width: 720px) 640px, 100vw"' : '') +
      ' width="1400" height="1050" loading="lazy" decoding="async" alt="' + esc(alt) + '"' +
      ' onerror="this.closest(\'figure\').hidden=true"></span>' +
      '<figcaption>' + esc(t('ilustrativa')) + '</figcaption></figure>';
  }

  function botonAR(item, titulo) {
    if (!item.modelo || !window.MoraAR) return '';
    return '<button type="button" class="btn-ar" data-modelo="' + esc(item.modelo) + '" data-ios="' + esc(item.modeloIos || '') +
      '" data-titulo="' + esc(titulo) + '">' + esc(t('verEnSuMesa')) + '</button>';
  }

  function nombresOrigen(ids) {
    return ids.map(function (id) { return NOMBRES_DEPTO[id]; }).join(' · ');
  }

  function etiquetas(item) {
    return (item.tags || []).map(function (tag) {
      return '<li class="tag tag-' + tag + '">' + esc(t(tag)) + '</li>';
    }).join('');
  }

  function plato(item) {
    var nombre = tr(item.nombre), desc = tr(item.desc);
    var origen = item.origen && !item.origen_confirmar
      ? '<p class="origen">' + esc(t('origen')) + ': <a href="#mapa" data-depto="' + esc(item.origen[0]) + '">' + esc(nombresOrigen(item.origen)) + '</a></p>' : '';
    var maridaje = item.maridaje ? '<p class="maridaje">' + esc(t('maridaje')) + ': ' + esc(tr(item.maridaje)) + '</p>' : '';
    var tags = etiquetas(item);
    return '<li class="plato" id="plato-' + esc(item.id) + '" data-tags="' + esc((item.tags || []).join(' ')) + '">' +
      '<div class="plato-linea"><h3 class="plato-nombre">' + esc(nombre) + '</h3>' +
      '<span class="puntos" aria-hidden="true"></span><span class="precio">' + precio(item.precio) + '</span></div>' +
      (desc ? '<p class="plato-desc">' + esc(desc) + '</p>' : '') +
      (tags ? '<ul class="tags">' + tags + '</ul>' : '') + origen + maridaje +
      foto(item.foto, item.fotoMini, nombre) + botonAR(item, nombre) + '</li>';
  }

  function seccion(s) {
    return '<section class="seccion" id="' + s.id + '" aria-labelledby="t-' + s.id + '">' +
      '<header class="seccion-cabeza">' + ornamento() + '<h2 id="t-' + s.id + '" class="titulo-script">' + esc(tr(s.titulo)) + '</h2></header>' +
      '<ul class="platos">' + s.items.map(plato).join('') + '</ul>' +
      '<p class="sin-resultados" hidden>' + esc(t('filtroVacio')) + '</p></section>';
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

  function proximamente() {
    return '<section class="seccion proximamente" id="proximamente" aria-labelledby="t-prox">' +
      '<header class="seccion-cabeza">' + ornamento() + '<h2 id="t-prox" class="titulo-script">' + esc(t('prox')) + '</h2></header>' +
      '<p class="nota-centro">' + esc(t('proxTexto')) + '</p><ul class="prox-lista">' +
      PROXIMAMENTE.map(function (p) { return '<li id="prox-' + p.id + '">' + esc(p[estado.lang]) + '</li>'; }).join('') +
      '</ul></section>';
  }

  /* ---------- Tucumán a la carta ---------- */
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
    var mp = MENU_PASOS;
    var pasos = mp.pasos.map(function (p, i) {
      return '<li class="paso" id="' + p.id + '"><span class="paso-num" aria-hidden="true">' + ROMANOS[i] + '</span>' +
        '<div class="paso-cuerpo"><h3 class="paso-titulo">' + esc(t('paso')) + ' ' + ROMANOS[i] + '</h3>' +
        '<p>' + esc(p[estado.lang]) + '</p>' +
        '<p class="origen">' + esc(t('origen')) + ': ' + p.origen.map(function (d) {
          return '<a href="#mapa" data-depto="' + d + '">' + esc(NOMBRES_DEPTO[d]) + '</a>';
        }).join(' · ') + '</p>' + foto(p.foto, p.fotoMini, ROMANOS[i]) + botonAR(p, t('paso') + ' ' + ROMANOS[i]) + '</div></li>';
    }).join('');
    var chips = Object.keys(ORIGENES).map(function (id) {
      return '<li><button type="button" class="chip" data-depto="' + id + '" aria-pressed="' + (estado.depto === id) + '">' +
        esc(NOMBRES_DEPTO[id]) + '</button></li>';
    }).join('');
    return '<section class="seccion tucuman" id="tucuman" aria-labelledby="t-tucuman">' +
      foto(mp.fotoAmbiente, mp.fotoAmbiente.replace('.jpg', '-s.jpg'), 'Cerros de Tucumán', 'foto-ancha') +
      '<header class="seccion-cabeza">' + ornamento() +
      '<p class="sobretitulo">' + esc(t('tucumanBajada')) + '</p>' +
      '<h2 id="t-tucuman" class="titulo-script titulo-grande">' + esc(t('tucumanTitulo')) + '</h2>' +
      '<p class="nota-centro">' + esc(t('tucumanIntro')) + '</p></header>' +
      '<ol class="pasos">' + pasos + '</ol>' +
      '<div class="pasos-precio"><span class="precio precio-grande">' + precio(mp.precio) + '</span> <span class="por-persona">' + esc(t('porPersona')) + '</span></div>' +
      '<p class="incluye" id="pasos-incluye">' + esc(mp.incluye[estado.lang]) + '</p>' +
      foto(mp.fotoCopa, mp.fotoCopa.replace('.jpg', '-s.jpg'), '', 'foto-chica') +
      '<div class="mapa" id="mapa"><h3 class="subtitulo">' + esc(t('mapaTitulo')) + '</h3>' +
      '<p class="mapa-ayuda">' + esc(t('mapaAyuda')) + '</p>' +
      '<div class="mapa-cuerpo"><div class="mapa-dibujo">' + mapaSVG() + '</div>' +
      '<div class="mapa-lado"><ul class="chips" aria-label="' + esc(t('mapaLista')) + '">' + chips + '</ul>' +
      '<div class="panel" id="panel-depto" aria-live="polite">' + panelDepto() + '</div></div></div>' +
      '<p class="mapa-nota">' + esc(t('sinDepto')) + '</p></div></section>';
  }

  function elegirDepto(id, mover) {
    estado.depto = estado.depto === id && !mover ? null : id;
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
      return '<span class="ahora-etiqueta">' + esc(t('ahora')) + ':</span> ' + esc(nombre.toLowerCase()) + ' · ' + esc(t('hasta')) + ' ' + a.hasta +
        ' <a class="ahora-link" href="#' + a.s.seccion + '">' + esc(t('verServicio')) + '</a>';
    }
    return '<span class="ahora-etiqueta">' + esc(t('cerrado')) + '</span> · ' + esc(t('abre')) + ' ' + esc(nombre.toLowerCase()) + ' ' + a.s.desde;
  }

  function navItems() {
    var items = [{ id: 'tucuman', txt: t('navTucuman') }];
    SECCIONES.forEach(function (s) { items.push({ id: s.id, txt: tr(s.titulo) }); });
    items.push({ id: 'bebidas', txt: t('navBebidas') }, { id: 'proximamente', txt: t('navProx') });
    return items.map(function (i) { return '<li><a href="#' + i.id + '" data-nav="' + i.id + '">' + esc(i.txt) + '</a></li>'; }).join('');
  }

  function filtros() {
    return '<div class="filtros" role="group" aria-label="' + esc(t('filtros')) + '">' +
      ['sintacc', 'vegano', 'compartir'].map(function (f) {
        return '<button type="button" class="filtro" data-filtro="' + f + '" aria-pressed="' + (estado.filtros.indexOf(f) >= 0) + '">' + esc(t(f)) + '</button>';
      }).join('') + '<span class="filtro-cuenta" aria-live="polite"></span></div>';
  }

  function aplicarFiltros() {
    var total = 0, activos = estado.filtros;
    document.querySelectorAll('.seccion').forEach(function (sec) {
      var platos = sec.querySelectorAll('.platos:not(.platos-simples) > .plato');
      if (!platos.length) return;
      var visibles = 0;
      platos.forEach(function (p) {
        var tags = (p.getAttribute('data-tags') || '').split(' ');
        var ok = activos.every(function (f) { return tags.indexOf(f) >= 0; });
        p.hidden = !ok;
        if (ok) visibles++;
      });
      total += visibles;
      var vacio = sec.querySelector('.sin-resultados');
      if (vacio) vacio.hidden = !(activos.length && visibles === 0);
    });
    var cuenta = $('.filtro-cuenta');
    if (cuenta) cuenta.innerHTML = activos.length ? esc(t('resultados')(total)) + ' · <button type="button" class="limpiar">' + esc(t('limpiar')) + '</button>' : '';
  }

  /* ---------- pie ---------- */
  function enlaceOAviso(url, texto, clase) {
    if (url) return '<a class="btn ' + clase + '" href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(texto) + '</a>';
    return '<button type="button" class="btn ' + clase + '" data-pendiente>' + esc(texto) + '</button>';
  }

  function pie() {
    var r = CONFIG.resenas, g = CONFIG.gerente;
    var mail = g.email ? 'mailto:' + g.email : '', wa = g.whatsapp ? 'https://wa.me/' + g.whatsapp.replace(/\D/g, '') : '';
    var hs = function (a, b) { return a + '–' + b; };
    return '<span class="logo logo-pie" role="img" aria-label="Mora Bistró Argentino"></span>' +
      '<div class="pie-bloque resenas"><h2 class="titulo-script">' + esc(t('resenasTitulo')) + '</h2>' +
      '<p>' + esc(t('resenasTexto')) + '</p><div class="botones">' +
      enlaceOAviso(r.google, t('google'), 'btn-resena') + enlaceOAviso(r.tripadvisor, t('tripadvisor'), 'btn-resena') + '</div>' +
      '<h3 class="subtitulo">' + esc(t('gerenteTitulo')) + '</h3><p>' + esc(t('gerenteTexto')) + '</p><div class="botones">' +
      enlaceOAviso(mail, t('email'), 'btn-gerente') + enlaceOAviso(wa, t('whatsapp'), 'btn-gerente') + '</div>' +
      '<p class="aviso" role="status" aria-live="polite" hidden>' + esc(t('pendiente')) + '</p></div>' +
      ornamento() +
      '<div class="pie-bloque"><h3 class="subtitulo">' + esc(t('horarios')) + '</h3><dl class="horarios">' +
      '<dt>' + esc(t('servicios').desayuno) + '</dt><dd>' + esc(t('lav')) + ' ' + hs('06:30', '10:30') + '<br>' + esc(t('finde')) + ' ' + hs('06:30', '11:00') + '</dd>' +
      '<dt>' + esc(t('servicios').almuerzo) + '</dt><dd>' + hs('12:30', '16:00') + '</dd>' +
      '<dt>' + esc(t('servicios').cena) + '</dt><dd>' + hs('20:00', '00:30') + '</dd>' +
      '<dt>' + esc(t('servicios').lobby) + '</dt><dd>' + hs('08:00', '02:00') + '</dd>' +
      '<dt>' + esc(t('servicios').room) + '</dt><dd>' + hs('16:00', '03:00') + ' (' + esc(t('aprox')) + ')</dd></dl></div>' +
      '<div class="pie-bloque"><h3 class="subtitulo">' + esc(t('direccion')) + '</h3><address>Mora Bistró Argentino<br>Sheraton Tucumán · Av. Soldati 440<br>San Miguel de Tucumán</address>' +
      '<p><a href="https://www.instagram.com/' + esc(CONFIG.instagram) + '/" target="_blank" rel="noopener">' + esc(t('instagram')) + ' @' + esc(CONFIG.instagram) + '</a></p>' +
      '<p class="falasco">' + esc(t('falasco')) + '</p></div>' +
      '<p class="pie-tema"><button type="button" class="btn-tema" id="btn-tema" aria-label="' + esc(t('tema')) + '">' +
      '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><circle cx="10" cy="10" r="6.5" /><path d="M10 3.5 A6.5 6.5 0 0 1 10 16.5 Z" /></svg>' +
      '<span></span></button></p>' +
      '<p class="legal">' + esc(t('legal')) + '</p>' +
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
    $('#filtros').innerHTML = filtros();
    $('#carta').innerHTML = tucuman() + SECCIONES.map(seccion).join('') + bebidas() + proximamente();
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
    document.querySelectorAll('#carta > .seccion').forEach(function (s) { observador.observe(s); });
  }

  /* ---------- eventos ---------- */
  function eventos() {
    document.addEventListener('click', function (ev) {
      var el = ev.target.closest('button, a, path[data-depto]');
      if (!el) return;
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
      if (el.hasAttribute('data-depto')) {
        var desdeFuera = el.tagName === 'A';
        if (desdeFuera) { ev.preventDefault(); $('#mapa').scrollIntoView({ behavior: reducido() ? 'auto' : 'smooth', block: 'start' }); }
        elegirDepto(el.getAttribute('data-depto'), desdeFuera); return;
      }
      if (el.hasAttribute('data-pendiente')) {
        var aviso = el.closest('.pie-bloque').querySelector('.aviso');
        aviso.hidden = false; aviso.textContent = t('pendiente'); return;
      }
      if (el.matches('.btn-ar') && window.MoraAR) {
        var src = el.getAttribute('data-modelo');
        window.MoraAR.abrir({
          src: src, iosSrc: el.getAttribute('data-ios') || src.replace(/\.glb$/i, '.usdz'),
          titulo: el.getAttribute('data-titulo'), nota: 'Modelo ilustrativo'
        });
      }
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

  /* Ganchos para la portada (portada.js). */
  window.MoraCarta = { lang: function () { return estado.lang; }, t: t, elegirDepto: elegirDepto, reducido: reducido };

  estado.lang = detectarIdioma();
  var temaGuardado = leer('mora-tema');
  estado.tema = temaGuardado === 'claro' ? 'claro' : 'oscuro';
  render();
  eventos();
})();
