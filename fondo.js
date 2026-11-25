/*
 * Mora Bistró · fondo animado. WebGL 1 puro, sin dependencias.
 *   Capa A: fluido mora/vino (ruido con domain warping), a baja resolución y con dither.
 *   Capa B: relieve de cerros con curvas de nivel doradas, niebla y cámara que avanza.
 *   Capa C: polvo de luz.
 * Reacciona al scroll (sube, gira y cambia de tono por sección), al puntero y a la inclinación.
 * Si no hay WebGL o se pide menos movimiento, queda el degradado quieto de .fondo-quieto.
 * El texto nunca depende de este lienzo.
 */
(function () {
  'use strict';

  var lienzo = document.getElementById('fondo');
  var raiz = document.documentElement;
  if (!lienzo) return;

  var mqReducido = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function quieto(motivo) {
    raiz.setAttribute('data-fondo', 'quieto');
    if (motivo) raiz.setAttribute('data-fondo-motivo', motivo);
    detener();
    if (lienzo.parentNode) lienzo.parentNode.removeChild(lienzo);
  }
  if (mqReducido && mqReducido.matches) { quieto('reducido'); return; }

  /* ---------- calidad ---------- */
  var NIVELES = [
    { dpr: 1.5, filas: 150, cols: 120, fluido: 0.34, part: 90 },
    { dpr: 1.0, filas: 105, cols: 84, fluido: 0.28, part: 60 },
    { dpr: 0.75, filas: 72, cols: 58, fluido: 0.22, part: 36 }
  ];
  var gamaBaja = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 3;

  /* ---------- shaders ---------- */
  var PREC = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';
  var RUIDO =
    'float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }\n' +
    'float ruido(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);\n' +
    '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }\n';

  var V_PLANO = 'attribute vec2 aP; void main(){ gl_Position = vec4(aP, 0.0, 1.0); }';

  /* Capa A: fluido. Paleta oscura (negro cálido, mora, vino) o clara (marfil). */
  var F_FLUIDO = PREC + RUIDO +
    'uniform vec2 uRes; uniform float uT, uTono, uClaro;\n' +
    'float fbm(vec2 p){ float v = 0.0, a = 0.5; mat2 r = mat2(0.8, -0.6, 0.6, 0.8);\n' +
    '  for (int i = 0; i < 4; i++){ v += a * ruido(p); p = r * p * 2.02 + 7.3; a *= 0.5; } return v; }\n' +
    'void main(){\n' +
    '  vec2 uv = gl_FragCoord.xy / uRes;\n' +
    '  vec2 p = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0) * 2.4;\n' +
    '  float t = uT * 0.03;\n' +
    '  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - t * 0.7));\n' +
    '  vec2 r = vec2(fbm(p + 3.2 * q + vec2(1.7, 9.2) + t * 0.5), fbm(p + 3.2 * q + vec2(8.3, 2.8) - t * 0.4));\n' +
    '  float f = fbm(p + 2.8 * r);\n' +
    '  vec3 negro = vec3(0.055, 0.047, 0.043);\n' +
    '  vec3 mora = vec3(0.294, 0.114, 0.227);\n' +
    '  vec3 vino = vec3(0.690, 0.271, 0.498);\n' +
    '  vec3 laton = vec3(0.659, 0.545, 0.353);\n' +
    '  vec3 tinte = mix(mora, mix(mora, vino, 0.55), uTono);\n' +
    '  vec3 o = mix(negro, tinte * 0.62, smoothstep(0.32, 0.72, f));\n' +
    '  o = mix(o, tinte * 0.95, smoothstep(0.6, 0.9, length(q)) * 0.5);\n' +
    '  o += laton * 0.035 * smoothstep(0.62, 0.95, r.x);\n' +
    '  o *= 1.0 - 0.45 * pow(length(uv - vec2(0.5, 0.55)) * 1.25, 2.0);\n' +
    '  vec3 marfil = vec3(0.953, 0.933, 0.894);\n' +
    '  vec3 c = mix(marfil, vec3(0.925, 0.871, 0.886), smoothstep(0.3, 0.95, f) * 0.6);\n' +
    '  c = mix(c, vec3(0.929, 0.886, 0.812), smoothstep(0.6, 1.1, length(q)) * 0.45);\n' +
    '  gl_FragColor = vec4(mix(max(o, negro * 0.8), c, uClaro), 1.0);\n' +
    '}';

  /* Cielo: el fluido a pantalla completa, con un resplandor tenue en el horizonte y dither contra las bandas. */
  var F_CIELO = PREC + RUIDO +
    'uniform sampler2D uFluido; uniform vec2 uRes; uniform float uHorizonte, uClaro, uT; uniform vec3 uOro2;\n' +
    'void main(){\n' +
    '  vec2 uv = gl_FragCoord.xy / uRes;\n' +
    '  vec3 c = texture2D(uFluido, uv).rgb;\n' +
    '  float h = exp(-pow((uv.y - uHorizonte) * 5.0, 2.0));\n' +
    '  c += uOro2 * h * 0.07 * (1.0 - uClaro);\n' +
    '  c += (hash(gl_FragCoord.xy + fract(uT)) - 0.5) / 160.0;\n' +
    '  gl_FragColor = vec4(c, 1.0);\n' +
    '}';

  /* Capa B: relieve. La malla es un trapecio que acompaña al cono de visión: vértices parejos en pantalla. */
  var V_RELIEVE = RUIDO +
    'attribute vec2 aR; uniform mat4 uVP; uniform float uViaje, uAbre, uProf;\n' +
    'varying float vH, vDist, vLuz; varying vec2 vMundo;\n' +
    'float cerros(vec2 p){ float h = 0.0, a = 0.55; mat2 r = mat2(0.8, -0.6, 0.6, 0.8);\n' +
    '  for (int i = 0; i < 5; i++){ float n = 1.0 - abs(ruido(p) * 2.0 - 1.0); h += n * n * a; a *= 0.5; p = r * p * 2.0 + 3.1; }\n' +
    '  return h; }\n' +
    'float altura(float x, float z){\n' +
    '  float d = -z;\n' +
    '  float lejos = smoothstep(1.5, 18.0, d);\n' +
    '  float valle = mix(0.35 + 0.65 * smoothstep(0.8, 5.0, abs(x)), 1.0, lejos);\n' +
    '  return cerros(vec2(x, z - uViaje) * 0.16) * (0.9 + 3.2 * lejos) * valle;\n' +
    '}\n' +
    'void main(){\n' +
    '  float d = 0.4 + uProf * pow(aR.y, 1.35);\n' +
    '  float x = aR.x * (d * uAbre + 2.0);\n' +
    '  float z = -d;\n' +
    '  float h = altura(x, z);\n' +
    '  float e = 0.12;\n' +
    '  vec3 n = normalize(vec3(-(altura(x + e, z) - h), e, altura(x, z - e) - h));\n' +
    '  vLuz = clamp(dot(n, normalize(vec3(-0.5, 0.75, -0.3))), 0.0, 1.0);\n' +
    '  vH = h; vDist = d; vMundo = vec2(x, z - uViaje);\n' +
    '  gl_Position = uVP * vec4(x, h - 1.2, z, 1.0);\n' +
    '}';

  function fRelieve(deriv) {
    return (deriv ? '#extension GL_OES_standard_derivatives : enable\n#define DERIV 1\n' : '') + PREC + RUIDO +
      'uniform sampler2D uFluido; uniform vec2 uRes; uniform vec3 uOro, uOro2; uniform float uClaro, uNiebla;\n' +
      'varying float vH, vDist, vLuz; varying vec2 vMundo;\n' +
      'float linea(float v, float grosor){\n' +
      '#ifdef DERIV\n  float w = fwidth(v);\n#else\n  float w = 0.03 + vDist * 0.01;\n#endif\n' +
      '  float g = abs(fract(v - 0.5) - 0.5) / max(w, 1e-4);\n' +
      '  return (1.0 - smoothstep(grosor - 0.5, grosor + 0.5, g)) * (1.0 - smoothstep(0.22, 0.55, w));\n' +
      '}\n' +
      'void main(){\n' +
      '  vec2 uv = gl_FragCoord.xy / uRes;\n' +
      '  vec3 cielo = texture2D(uFluido, uv).rgb;\n' +
      '  vec3 base = mix(cielo * mix(0.5, 1.05, vLuz) * 0.85, cielo * mix(0.93, 1.01, vLuz), uClaro);\n' +
      '  float curva = linea(vH / 0.16, 1.0);\n' +
      '  float mayor = linea(vH / 0.8, 1.5);\n' +
      '  float red = max(linea(vMundo.x / 1.1, 0.7), linea(vMundo.y / 1.1, 0.7)) * 0.16;\n' +
      '  float niebla = 1.0 - exp(-pow(vDist * uNiebla, 1.6));\n' +
      '  float cerca = smoothstep(0.4, 2.4, vDist);\n' +
      '  float a = clamp(curva * 0.42 + mayor * 0.36 + red, 0.0, 1.0) * (1.0 - niebla) * cerca;\n' +
      '  vec3 oro = mix(uOro, uOro2, smoothstep(1.2, 3.6, vH) * 0.7);\n' +
      '  vec3 c = mix(base, oro, a * mix(0.9, 0.55, uClaro));\n' +
      '  c += uOro2 * 0.05 * smoothstep(2.0, 3.6, vH) * (1.0 - niebla) * (1.0 - uClaro);\n' +
      '  c = mix(c, cielo, niebla);\n' +
      '  c += (hash(gl_FragCoord.xy) - 0.5) / 160.0;\n' +
      '  gl_FragColor = vec4(c, 1.0);\n' +
      '}';
  }

  /* Capa C: polvo de luz. Las semillas fijan todo; el movimiento sale del tiempo, sin tocar buffers. */
  var V_POLVO =
    'attribute vec3 aS; uniform mat4 uVP; uniform float uT, uViaje, uPx;\n' +
    'varying float vA;\n' +
    'void main(){\n' +
    '  float z = -0.6 - mod(aS.z * 22.0 - uViaje * 0.9, 22.0);\n' +
    '  float y = mod(aS.y * 4.5 + uT * (0.03 + 0.05 * aS.x), 4.5) - 1.0;\n' +
    '  float x = (aS.x - 0.5) * (2.0 - z * 0.9) + sin(uT * 0.25 + aS.z * 40.0) * 0.15;\n' +
    '  gl_Position = uVP * vec4(x, y, z, 1.0);\n' +
    '  gl_PointSize = clamp(uPx * (1.4 + 2.2 * aS.y) * 4.0 / gl_Position.w, 1.0, 9.0 * uPx);\n' +
    '  float borde = smoothstep(-0.6, -2.0, z) * (1.0 - smoothstep(-14.0, -22.0, z));\n' +
    '  float edad = smoothstep(-1.0, -0.4, y) * (1.0 - smoothstep(2.6, 3.5, y));\n' +
    '  vA = borde * edad * (0.45 + 0.55 * sin(uT * (0.6 + aS.z) + aS.x * 30.0) * 0.5 + 0.275);\n' +
    '}';
  var F_POLVO = PREC +
    'uniform vec3 uColor; uniform float uAlfa; varying float vA;\n' +
    'void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); a *= a;\n' +
    '  gl_FragColor = vec4(uColor, a * vA * uAlfa); }';

  /* ---------- matrices (columna mayor) ---------- */
  function perspectiva(fovy, asp, cerca, lejos) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (cerca - lejos);
    return [f / asp, 0, 0, 0, 0, f, 0, 0, 0, 0, (lejos + cerca) * nf, -1, 0, 0, 2 * lejos * cerca * nf, 0];
  }
  function mirar(o, c) {
    var zx = o[0] - c[0], zy = o[1] - c[1], zz = o[2] - c[2], l = Math.hypot(zx, zy, zz);
    zx /= l; zy /= l; zz /= l;
    var xx = zz, xy = 0, xz = -zx; l = Math.hypot(xx, xz); xx /= l; xz /= l;   // arriba = (0,1,0)
    var yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return [xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0,
      -(xx * o[0] + xy * o[1] + xz * o[2]), -(yx * o[0] + yy * o[1] + yz * o[2]), -(zx * o[0] + zy * o[1] + zz * o[2]), 1];
  }
  function mult(a, b) {
    var o = new Array(16);
    for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  }

  /* ---------- estado ---------- */
  var gl = null, deriv = false, P = {}, B = {}, fbo = null, tex = null;
  var nivel = gamaBaja ? 1 : 0, fps30 = false, ancho = 0, alto = 0, anchoF = 0, altoF = 0, dpr = 1;
  var nIndices = 0, nPolvo = 0, PROF = 30;
  var raf = 0, corriendo = false, ultimo = 0, acum = 0, tiempo = 0, viaje = 0;
  var calentando = 40, suma = 0, cuenta = 0, primerCuadro = true, redimensionar = true;
  var ap = { x: 0, y: 0 }, apMeta = { x: 0, y: 0 };
  var claro = 0, claroMeta = 0, tono = 0, tonoMeta = 0, subida = 0, giro = 0, scrollVisto = -1;

  function crearPrograma(vs, fs) {
    function sh(tipo, src) {
      var s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    var p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) { var nom = gl.getActiveUniform(p, i).name; u[nom] = gl.getUniformLocation(p, nom); }
    return { p: p, u: u };
  }

  function iniciarGL() {
    var opc = { antialias: false, alpha: false, depth: true, stencil: false, premultipliedAlpha: false, powerPreference: 'low-power' };
    opc.failIfMajorPerformanceCaveat = true;
    gl = lienzo.getContext('webgl', opc);
    if (!gl) {  // render por software: anda, pero arranca en la calidad más baja
      opc.failIfMajorPerformanceCaveat = false;
      gl = lienzo.getContext('webgl', opc) || lienzo.getContext('experimental-webgl', opc);
      if (gl) nivel = 2;
    }
    if (!gl) return false;
    deriv = !!gl.getExtension('OES_standard_derivatives');
    P.fluido = crearPrograma(V_PLANO, F_FLUIDO);
    P.cielo = crearPrograma(V_PLANO, F_CIELO);
    P.relieve = crearPrograma(V_RELIEVE, fRelieve(deriv));
    P.polvo = crearPrograma(V_POLVO, F_POLVO);
    B.plano = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, B.plano);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    B.rejilla = gl.createBuffer(); B.indices = gl.createBuffer(); B.polvo = gl.createBuffer();
    tex = gl.createTexture(); fbo = gl.createFramebuffer();
    aplicarNivel();
    return true;
  }

  function construirMalla(cols, filas) {
    var v = new Float32Array((cols + 1) * (filas + 1) * 2), k = 0;
    for (var j = 0; j <= filas; j++) for (var i = 0; i <= cols; i++) { v[k++] = i / cols * 2 - 1; v[k++] = j / filas; }
    var idx = new Uint16Array(cols * filas * 6); k = 0;
    for (j = 0; j < filas; j++) for (i = 0; i < cols; i++) {
      var a = j * (cols + 1) + i, b = a + 1, c = a + cols + 1, d = c + 1;
      idx[k++] = a; idx[k++] = c; idx[k++] = b; idx[k++] = b; idx[k++] = c; idx[k++] = d;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, B.rejilla); gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, B.indices); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    nIndices = idx.length;
  }

  function construirPolvo(n) {
    var s = new Float32Array(n * 3), semilla = 7;
    function azar() { semilla = (semilla * 16807) % 2147483647; return semilla / 2147483647; }
    for (var i = 0; i < s.length; i++) s[i] = azar();
    gl.bindBuffer(gl.ARRAY_BUFFER, B.polvo); gl.bufferData(gl.ARRAY_BUFFER, s, gl.STATIC_DRAW);
    nPolvo = n;
  }

  function aplicarNivel() {
    var N = NIVELES[nivel];
    construirMalla(N.cols, N.filas);
    construirPolvo(N.part);
    raiz.setAttribute('data-fondo', 'webgl-' + nivel + (fps30 ? '-30' : ''));
    raiz.classList.toggle('fondo-bajo', nivel >= 2);
    redimensionar = true;
  }

  function ajustarTamano() {
    var N = NIVELES[nivel];
    dpr = Math.min(window.devicePixelRatio || 1, gamaBaja ? Math.min(1, N.dpr) : N.dpr);
    var cw = lienzo.clientWidth || window.innerWidth, ch = lienzo.clientHeight || window.innerHeight;
    ancho = Math.max(1, Math.round(cw * dpr)); alto = Math.max(1, Math.round(ch * dpr));
    lienzo.width = ancho; lienzo.height = alto;
    anchoF = Math.max(48, Math.round(cw * N.fluido)); altoF = Math.max(48, Math.round(ch * N.fluido));
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, anchoF, altoF, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    redimensionar = false;
  }

  /* ---------- entradas: scroll, puntero, inclinación ---------- */
  function lerp(a, b, k) { return a + (b - a) * k; }
  function limitar(v) { return Math.max(-1, Math.min(1, v)); }

  function leerScroll() {
    var y = window.scrollY || window.pageYOffset || 0;
    if (y === scrollVisto) return;
    scrollVisto = y;
    var vh = window.innerHeight || 1, total = Math.max(1, document.documentElement.scrollHeight - vh);
    subida = Math.min(1, y / vh);
    giro = Math.sin(y / total * Math.PI * 2) * 0.1;
    var secs = document.querySelectorAll('#carta > .seccion'), idx = -1;
    for (var i = 0; i < secs.length; i++) { if (secs[i].getBoundingClientRect().top < vh * 0.5) idx = i; }
    tonoMeta = idx < 0 || secs.length < 2 ? 0 : (idx % 4) / 3;
  }

  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'mouse') { apMeta.x = limitar(e.clientX / window.innerWidth * 2 - 1); apMeta.y = limitar(e.clientY / window.innerHeight * 2 - 1); }
  }, { passive: true });
  window.addEventListener('touchmove', function (e) {
    var t = e.touches && e.touches[0];
    if (t) { apMeta.x = limitar(t.clientX / window.innerWidth * 2 - 1) * 0.5; }
  }, { passive: true });
  /* Inclinación solo donde no hay que pedir permiso (iOS lo pide: ahí alcanza con scroll y toque). */
  if ('DeviceOrientationEvent' in window && typeof window.DeviceOrientationEvent.requestPermission !== 'function') {
    window.addEventListener('deviceorientation', function (e) {
      if (e.gamma == null || e.beta == null) return;
      apMeta.x = limitar(e.gamma / 30); apMeta.y = limitar((e.beta - 45) / 30);
    }, { passive: true });
  }
  window.addEventListener('resize', function () { redimensionar = true; }, { passive: true });

  /* ---------- dibujo ---------- */
  var ORO = [0.851, 0.706, 0.424], ORO_ROSA = [0.88, 0.62, 0.56], VINO_LUZ = [0.69, 0.27, 0.5];
  var LATON_OSC = [0.47, 0.37, 0.2], MORA_CLARO = [0.45, 0.2, 0.34];

  function mezcla(a, b, k) { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }

  function plano(prog) {
    gl.bindBuffer(gl.ARRAY_BUFFER, B.plano);
    var loc = gl.getAttribLocation(prog.p, 'aP');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disableVertexAttribArray(loc);
  }

  function dibujar() {
    if (redimensionar) ajustarTamano();
    var asp = ancho / alto, fov = 55 * Math.PI / 180;
    var abre = Math.tan(fov / 2) * asp * 1.3 + 0.25;

    /* cámara: avanza sola; el scroll la sube y la gira; puntero e inclinación dan parallax */
    var camY = 0.55 + subida * 1.1 - ap.y * 0.15;
    var ojo = [ap.x * 0.6, camY, 0.6];
    var mira = [ap.x * 0.25 + giro * 14, 0.15 + subida * 0.2 - ap.y * 0.35, -14];
    var vp = mult(perspectiva(fov, asp, 0.1, 80), mirar(ojo, mira));

    /* horizonte en pantalla, para el resplandor del cielo */
    var lejano = [0, 1.6, -PROF * 0.85, 1], hz = 0;
    var cy = vp[1] * lejano[0] + vp[5] * lejano[1] + vp[9] * lejano[2] + vp[13];
    var cw = vp[3] * lejano[0] + vp[7] * lejano[1] + vp[11] * lejano[2] + vp[15];
    hz = cw > 0 ? (cy / cw) * 0.5 + 0.5 : 0.6;

    var oro = mezcla(mezcla(ORO, ORO_ROSA, tono * 0.6), LATON_OSC, claro);
    var oro2 = mezcla(VINO_LUZ, MORA_CLARO, claro);

    /* A: fluido a baja resolución */
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, anchoF, altoF);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
    gl.useProgram(P.fluido.p);
    gl.uniform2f(P.fluido.u.uRes, anchoF, altoF);
    gl.uniform1f(P.fluido.u.uT, tiempo);
    gl.uniform1f(P.fluido.u.uTono, tono);
    gl.uniform1f(P.fluido.u.uClaro, claro);
    plano(P.fluido);

    /* cielo */
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, ancho, alto);
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.useProgram(P.cielo.p);
    gl.uniform1i(P.cielo.u.uFluido, 0);
    gl.uniform2f(P.cielo.u.uRes, ancho, alto);
    gl.uniform1f(P.cielo.u.uHorizonte, hz);
    gl.uniform1f(P.cielo.u.uClaro, claro);
    gl.uniform1f(P.cielo.u.uT, tiempo);
    gl.uniform3fv(P.cielo.u.uOro2, oro2);
    plano(P.cielo);

    /* B: relieve */
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true);
    var R = P.relieve;
    gl.useProgram(R.p);
    gl.uniformMatrix4fv(R.u.uVP, false, vp);
    gl.uniform1f(R.u.uViaje, viaje);
    gl.uniform1f(R.u.uAbre, abre);
    gl.uniform1f(R.u.uProf, PROF);
    gl.uniform1i(R.u.uFluido, 0);
    gl.uniform2f(R.u.uRes, ancho, alto);
    gl.uniform3fv(R.u.uOro, oro);
    gl.uniform3fv(R.u.uOro2, oro2);
    gl.uniform1f(R.u.uClaro, claro);
    gl.uniform1f(R.u.uNiebla, 0.055);
    gl.bindBuffer(gl.ARRAY_BUFFER, B.rejilla);
    var la = gl.getAttribLocation(R.p, 'aR');
    gl.enableVertexAttribArray(la);
    gl.vertexAttribPointer(la, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, B.indices);
    gl.drawElements(gl.TRIANGLES, nIndices, gl.UNSIGNED_SHORT, 0);
    gl.disableVertexAttribArray(la);

    /* C: polvo de luz */
    gl.depthMask(false);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    var Q = P.polvo;
    gl.useProgram(Q.p);
    gl.uniformMatrix4fv(Q.u.uVP, false, vp);
    gl.uniform1f(Q.u.uT, tiempo);
    gl.uniform1f(Q.u.uViaje, viaje);
    gl.uniform1f(Q.u.uPx, dpr);
    gl.uniform3fv(Q.u.uColor, mezcla([1.0, 0.86, 0.6], LATON_OSC, claro));
    gl.uniform1f(Q.u.uAlfa, lerp(0.85, 0.45, claro));
    gl.bindBuffer(gl.ARRAY_BUFFER, B.polvo);
    var ls = gl.getAttribLocation(Q.p, 'aS');
    gl.enableVertexAttribArray(ls);
    gl.vertexAttribPointer(ls, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.POINTS, 0, nPolvo);
    gl.disableVertexAttribArray(ls);
    gl.depthMask(true);
  }

  /* ---------- bucle, medición y pausa ---------- */
  function medir(dt) {
    if (calentando > 0) { calentando--; return; }
    if (dt > 0.25) return;   // un tirón aislado (cambio de pestaña, GC) no cuenta
    suma += dt; cuenta++;
    if (cuenta < 45) return;
    var promedio = suma / cuenta * 1000;
    suma = 0; cuenta = 0;
    if (promedio <= 24) return;
    if (nivel < NIVELES.length - 1) { nivel++; aplicarNivel(); calentando = 30; }
    else if (!fps30) { fps30 = true; raiz.setAttribute('data-fondo', 'webgl-' + nivel + '-30'); calentando = 30; }
  }

  function cuadro(ts) {
    raf = window.requestAnimationFrame(cuadro);
    if (!ultimo) { ultimo = ts; return; }
    var dt = (ts - ultimo) / 1000; ultimo = ts;
    if (fps30) { acum += dt; if (acum < 1 / 32) return; dt = acum; acum = 0; }
    medir(dt);
    var paso = Math.min(dt, 0.1);
    tiempo += paso;
    viaje += paso * 0.22;
    if (tiempo > 3600) { tiempo -= 3600; viaje = viaje % 400; }
    leerScroll();
    var k = 1 - Math.exp(-paso * 2.2);
    ap.x = lerp(ap.x, apMeta.x, k); ap.y = lerp(ap.y, apMeta.y, k);
    claro = lerp(claro, claroMeta, 1 - Math.exp(-paso * 3));
    tono = lerp(tono, tonoMeta, 1 - Math.exp(-paso * 0.9));
    dibujar();
    if (primerCuadro) { primerCuadro = false; lienzo.classList.add('listo'); }
  }

  function debeCorrer() {
    return gl && !document.hidden && !raiz.classList.contains('mora-ar-abierta') && !(mqReducido && mqReducido.matches);
  }
  function arrancar() {
    if (corriendo || !debeCorrer()) return;
    corriendo = true; ultimo = 0; calentando = Math.max(calentando, 20);
    raf = window.requestAnimationFrame(cuadro);
  }
  function detener() {
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0; corriendo = false;
  }
  function revisar() { if (debeCorrer()) arrancar(); else detener(); }

  function leerTema() {
    claroMeta = raiz.getAttribute('data-theme') === 'light' ? 1 : 0;
  }

  /* ---------- arranque ---------- */
  try {
    if (!iniciarGL()) { quieto('sin-webgl'); return; }
  } catch (err) {
    if (window.console) console.warn('Mora · fondo: ' + err.message);
    quieto('error'); return;
  }
  leerTema(); claro = claroMeta;
  leerScroll(); tono = tonoMeta;

  document.addEventListener('visibilitychange', revisar);
  new MutationObserver(function () { leerTema(); revisar(); })
    .observe(raiz, { attributes: true, attributeFilter: ['data-theme', 'class'] });
  if (mqReducido) {
    var alCambiar = function () { if (mqReducido.matches) quieto('reducido'); };
    if (mqReducido.addEventListener) mqReducido.addEventListener('change', alCambiar);
    else if (mqReducido.addListener) mqReducido.addListener(alCambiar);
  }
  lienzo.addEventListener('webglcontextlost', function (e) { e.preventDefault(); detener(); lienzo.classList.remove('listo'); });
  lienzo.addEventListener('webglcontextrestored', function () {
    try { iniciarGL(); primerCuadro = true; revisar(); } catch (err) { quieto('error'); }
  });
  arrancar();
})();
