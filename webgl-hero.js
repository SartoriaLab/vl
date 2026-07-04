/* ============================================================
   Velo Consultoria — hero imersivo (WebGL puro, zero dependências)

   Campo de partículas GPU "stateless" com narrativa de marca:
   a nuvem converge em espiral e forma o "V" → respira → se
   transforma na curva de patrimônio (a assinatura do site) →
   volta ao "V", em loop. Todo movimento é função pura de
   (tempo, mouse, scroll, morph) no vertex shader — sem FBO,
   sem estado por partícula, um único draw call por frame.

   Física orgânica:
   - mouse suavizado por oscilador amortecido (ζ=0.85, Euler
     semi-implícito, independente de FPS); força ∝ VELOCIDADE;
   - chegada em arco: deslocamento perpendicular ao trajeto
     com envelope sin(πf) — ninguém viaja em linha reta;
   - morph com janelas individuais + bow perpendicular: o "V"
     escorre para a curva como líquido, não como tween;
   - profundidade: parallax por partícula (aRand.z) seguindo a
     posição suavizada do cursor — camadas, não um plano;
   - clique: onda de choque radial gaussiana com decaimento
     exponencial (branchless — o termo morre sozinho);
   - 12% das partículas são "poeira ambiente" que nunca adere
     ao glifo — dá atmosfera ao hero inteiro.

   Degradação: sem WebGL ou com prefers-reduced-motion, nada
   acontece (o glow CSS original permanece). ?motion=1 força.
   ============================================================ */
(function () {
  'use strict';

  // override de teste: ?motion=1 força, ?motion=0 desliga
  var q = new URLSearchParams(location.search).get('motion');
  if (q === '0') return;
  if (q !== '1' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var VERT = [
    'precision mediump float;',
    'attribute vec2 aHome;    // alvo 1: glifo "V" da marca',
    'attribute vec2 aHome2;   // alvo 2: curva de patrimônio',
    'attribute vec2 aScatter; // posição dispersa (nuvem)',
    'attribute vec4 aRand;    // x: ordem/fase (>1.2 = ambiente) · y: variação · z: profundidade · w: janela de morph',
    '',
    'uniform float uTime;',
    'uniform float uForm;   // 0 = nuvem, 1 = glifo formado',
    'uniform float uMorph;  // 0 = "V", 1 = curva',
    'uniform float uLeave;  // saída do hero (scroll)',
    'uniform float uFlow;   // turbulência (velocidade do scroll)',
    'uniform float uAspect;',
    'uniform vec2  uOffset;',
    'uniform float uScale;',
    'uniform float uScale2;  // escala própria da curva (não estoura no portrait)',
    'uniform float uGlobalA; // opacidade global (menor no mobile, texto legível)',
    'uniform vec2  uMouse;',
    'uniform vec2  uMouseVel;',
    'uniform vec2  uPar;    // parallax (posição suavizada do cursor)',
    'uniform vec2  uShock;  // epicentro do clique',
    'uniform float uShockT; // tempo desde o clique',
    'uniform float uDpr;',
    '',
    'varying float vAlpha;',
    'varying vec3  vColor;',
    '',
    '/* simplex noise 2D (Ashima/McEwan) — determinístico, sem textura */',
    'vec3 permute(vec3 x){ return mod(((x*34.0)+1.0)*x, 289.0); }',
    'float snoise(vec2 v){',
    '  const vec4 C = vec4(0.211324865405187, 0.366025403784439,',
    '                     -0.577350269189626, 0.024390243902439);',
    '  vec2 i  = floor(v + dot(v, C.yy));',
    '  vec2 x0 = v - i + dot(i, C.xx);',
    '  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);',
    '  vec4 x12 = x0.xyxy + C.xxzz;',
    '  x12.xy -= i1;',
    '  i = mod(i, 289.0);',
    '  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));',
    '  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);',
    '  m = m*m; m = m*m;',
    '  vec3 x = 2.0 * fract(p * C.www) - 1.0;',
    '  vec3 h = abs(x) - 0.5;',
    '  vec3 ox = floor(x + 0.5);',
    '  vec3 a0 = x - ox;',
    '  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);',
    '  vec3 g;',
    '  g.x  = a0.x  * x0.x  + h.x  * x0.y;',
    '  g.yz = a0.yz * x12.xz + h.yz * x12.yw;',
    '  return 130.0 * dot(m, g);',
    '}',
    '',
    'const float PI = 3.14159265;',
    '',
    'void main(){',
    '  float isAmb = step(1.2, aRand.x); // poeira ambiente nunca adere',
    '',
    '  /* formação em cascata: janela individual por partícula */',
    '  float f = smoothstep(aRand.x * 0.55, aRand.x * 0.55 + 0.45, uForm) * (1.0 - isAmb);',
    '',
    '  /* morph "V" ⇄ curva: janela própria + bow perpendicular —',
    '     o trajeto entre os dois glifos é um arco, não uma reta */',
    '  float mm = smoothstep(aRand.w * 0.5, aRand.w * 0.5 + 0.5, uMorph);',
    '  vec2 h1 = aHome  * uScale  + uOffset;',
    '  vec2 h2 = aHome2 * uScale2 + uOffset;',
    '  vec2 dM = h2 - h1;',
    '  vec2 home = mix(h1, h2, mm)',
    '            + normalize(vec2(-dM.y, dM.x) + 1e-4) * sin(mm * PI) * 0.22 * (aRand.y - 0.5);',
    '',
    '  /* chegada em arco: envelope sin(πf) perpendicular ao trajeto */',
    '  vec2 scatter = aScatter * vec2(uAspect, 1.0) * 1.05;',
    '  vec2 dF = home - scatter;',
    '  vec2 pos = mix(scatter, home, f)',
    '           + normalize(vec2(-dF.y, dF.x) + 1e-4) * sin(f * PI) * 0.16 * (aRand.y - 0.5);',
    '',
    '  /* respiração: dois campos de simplex defasados ≈ pseudo-curl */',
    '  float t   = uTime * (0.12 + aRand.y * 0.10);',
    '  float amp = mix(0.045, 0.010, f) + uFlow * 0.10;',
    '  pos += vec2(',
    '    snoise(pos * 1.6 + t),',
    '    snoise(pos * 1.6 - t + 31.7)',
    '  ) * amp;',
    '',
    '  /* profundidade: parallax por camada segue o cursor suavizado */',
    '  pos += uPar * (aRand.z - 0.5) * 0.06;',
    '',
    '  /* esteira do mouse: só o MOVIMENTO agita o campo */',
    '  vec2  d      = pos - uMouse;',
    '  float mforce = smoothstep(0.55, 0.0, length(d));',
    '  pos += normalize(d + 0.0001) * mforce * length(uMouseVel) * 0.35;',
    '  pos += uMouseVel * mforce * 0.22;',
    '',
    '  /* onda de choque do clique: anel gaussiano em expansão,',
    '     decaimento exponencial — branchless, morre sozinho */',
    '  vec2  dS   = pos - uShock;',
    '  float ring = exp(-pow((length(dS) - uShockT * 0.9) * 6.0, 2.0)) * exp(-uShockT * 1.6);',
    '  pos += normalize(dS + 1e-4) * ring * 0.18;',
    '',
    '  /* saída: dissolve para cima conforme o hero rola */',
    '  pos.y += uLeave * (0.35 + aRand.y * 0.9);',
    '',
    '  gl_Position  = vec4(pos.x / uAspect, pos.y, 0.0, 1.0);',
    '  gl_PointSize = (0.9 + aRand.z * 2.6) * uDpr * (1.0 + mforce * 0.8 + ring * 1.5);',
    '',
    '  /* paleta em dois tons + faíscas raras */',
    '  float spark = step(0.96, aRand.w);',
    '  vColor = mix(vec3(0.416, 0.0, 0.60), vec3(0.565, 0.0, 0.816), aRand.y);',
    '  vColor = mix(vColor, vec3(0.78, 0.49, 1.0), spark);',
    '',
    '  float tw = 0.75 + 0.25 * sin(uTime * (0.6 + aRand.w) + aRand.x * 40.0);',
    '  vAlpha = (0.22 + 0.55 * f) * tw * (1.0 - uLeave)',
    '         * (0.45 + aRand.w * 0.55) * (1.0 - isAmb * 0.45)',
    '         * (1.0 + spark * 0.6) * 0.72 * uGlobalA;',
    '}'
  ].join('\n');

  var FRAG = [
    'precision mediump float;',
    'varying float vAlpha;',
    'varying vec3  vColor;',
    'void main(){',
    '  vec2  p = gl_PointCoord - 0.5;',
    '  float r = dot(p, p);',
    '  if (r > 0.25) discard;',
    '  float soft = smoothstep(0.25, 0.05, r);',
    '  float a = vAlpha * soft;',
    '  gl_FragColor = vec4(vColor * a, a); // alpha pré-multiplicado',
    '}'
  ].join('\n');

  /* glifo "V" da marca (favicon, viewBox 32) e curva de patrimônio (hero, viewBox 520x320) */
  var GLYPH_V = 'M7 9l5 14 4-9M17 9l4 9 4-14';
  var GLYPH_CURVE = 'M10 280 C70 272 95 244 150 238 S230 214 262 176 S345 138 392 104 S468 62 506 40';

  document.addEventListener('DOMContentLoaded', function () {
    var hero = document.querySelector('.hero');
    if (!hero || !window.Path2D) return;

    var canvas = document.createElement('canvas');
    canvas.className = 'hero__gl';
    canvas.setAttribute('aria-hidden', 'true');
    hero.insertBefore(canvas, hero.firstChild);

    var gl = canvas.getContext('webgl', {
      alpha: true, antialias: false, depth: false, stencil: false,
      premultipliedAlpha: true, powerPreference: 'low-power'
    });
    if (!gl) { canvas.remove(); return; }

    var fine = matchMedia('(pointer: fine)').matches;

    /* orçamento de partículas por hardware */
    var COUNT = fine ? 9000 : 3500;
    if (navigator.deviceMemory && navigator.deviceMemory <= 4) COUNT = Math.round(COUNT * 0.6);
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) COUNT = Math.round(COUNT * 0.7);
    var AMBIENT = Math.round(COUNT * 0.12);

    /* ---------- amostragem de um path SVG em pontos normalizados ----------
       targetW OU targetH definem a escala final em unidades de mundo */
    function samplePath(d, vw, vh, lw, targetW, targetH) {
      var MAX = 520;
      var sc = Math.min(MAX / vw, MAX / vh);
      var w = Math.ceil(vw * sc), h = Math.ceil(vh * sc);
      var off = document.createElement('canvas');
      off.width = w; off.height = h;
      var ctx = off.getContext('2d', { willReadFrequently: true });
      ctx.scale(sc, sc);
      ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = '#000';
      ctx.stroke(new Path2D(d));

      var img = ctx.getImageData(0, 0, w, h).data, pts = [];
      for (var y = 0; y < h; y += 2) {
        for (var x = 0; x < w; x += 2) {
          if (img[(y * w + x) * 4 + 3] > 128) pts.push(x, y);
        }
      }
      var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, i;
      for (i = 0; i < pts.length; i += 2) {
        if (pts[i] < minX) minX = pts[i];       if (pts[i] > maxX) maxX = pts[i];
        if (pts[i + 1] < minY) minY = pts[i + 1]; if (pts[i + 1] > maxY) maxY = pts[i + 1];
      }
      var cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
      var k = targetH ? targetH / (maxY - minY) : targetW / (maxX - minX);
      var out = new Float32Array(COUNT * 2), n = pts.length / 2;
      for (i = 0; i < COUNT; i++) {
        var j = (Math.random() * n) | 0;
        out[i * 2]     =  (pts[j * 2]     + Math.random() * 2 - 1 - cx) * k;
        out[i * 2 + 1] = -(pts[j * 2 + 1] + Math.random() * 2 - 1 - cy) * k;
      }
      return out;
    }

    /* ---------- buffer interleaved: aHome(2) aHome2(2) aScatter(2) aRand(4) ---------- */
    var program = null, buffer = null, U = {};

    function build() {
      var vs = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vs, VERT); gl.compileShader(vs);
      var fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fs, FRAG); gl.compileShader(fs);
      program = gl.createProgram();
      gl.attachShader(program, vs); gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.warn('velo/webgl:', gl.getProgramInfoLog(program));
        return false;
      }
      gl.deleteShader(vs); gl.deleteShader(fs);

      var homeV = samplePath(GLYPH_V, 32, 32, 3.1, null, 2);       // "V": altura 2
      var homeC = samplePath(GLYPH_CURVE, 520, 320, 5, 3.0, null); // curva: largura 3
      var data = new Float32Array(COUNT * 10);
      for (var i = 0; i < COUNT; i++) {
        var o = i * 10, amb = i < AMBIENT;
        var a = Math.random() * Math.PI * 2, r = 0.4 + Math.pow(Math.random(), 0.5) * 1.1;
        data[o]     = homeV[i * 2];
        data[o + 1] = homeV[i * 2 + 1];
        data[o + 2] = homeC[i * 2];
        data[o + 3] = homeC[i * 2 + 1];
        if (amb) { // poeira ambiente: retângulo cobrindo o hero inteiro
          data[o + 4] = Math.random() * 2.3 - 1.15;
          data[o + 5] = Math.random() * 2.1 - 1.05;
        } else {   // nuvem: disco com miolo raro
          data[o + 4] = Math.cos(a) * r;
          data[o + 5] = Math.sin(a) * r;
        }
        data[o + 6] = amb ? 1.3 + Math.random() * 0.4 : Math.random(); // ordem (>1.2 = ambiente)
        data[o + 7] = Math.random();                                   // variação
        data[o + 8] = Math.pow(Math.random(), 1.6);                    // profundidade/tamanho
        data[o + 9] = Math.random();                                   // janela de morph / brilho
      }
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

      gl.useProgram(program);
      var stride = 40;
      [['aHome', 2, 0], ['aHome2', 2, 8], ['aScatter', 2, 16], ['aRand', 4, 24]].forEach(function (att) {
        var loc = gl.getAttribLocation(program, att[0]);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, att[1], gl.FLOAT, false, stride, att[2]);
      });
      ['uTime', 'uForm', 'uMorph', 'uLeave', 'uFlow', 'uAspect', 'uOffset', 'uScale',
       'uScale2', 'uGlobalA', 'uMouse', 'uMouseVel', 'uPar', 'uShock', 'uShockT', 'uDpr'].forEach(function (name) {
        U[name] = gl.getUniformLocation(program, name);
      });

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
      return true;
    }

    /* ---------- estado CPU (a física que o shader consome) ---------- */
    var dpr = 1, W = 0, H = 0, aspect = 1, heroTop = 0, heroH = 1;
    var state = { form: 0, morph: 0, leave: 0, flow: 0, shockT: 20 };
    /* mola do mouse: K rigidez, ζ = 0.85 (subamortecido de leve) */
    var K = 70, ZETA = 0.85, C = 2 * ZETA * Math.sqrt(K);
    /* nasce em repouso fora do campo — nenhuma varredura fantasma na carga */
    var mx = 10, my = 10, mvx = 0, mvy = 0, tx = 10, ty = 10;
    var px = 0, py = 0, ptx = 0, pty = 0;       // parallax (posição, alvo)
    var shockX = 0, shockY = 0, offX = 0, offY = 0;
    var lastScroll = window.scrollY, flowTarget = 0;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      W = hero.clientWidth; H = hero.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      aspect = W / H;
      heroTop = hero.getBoundingClientRect().top + window.scrollY;
      heroH = H || 1;
      gl.useProgram(program);
      gl.uniform1f(U.uAspect, aspect);
      gl.uniform1f(U.uDpr, dpr);
      var scale;
      if (aspect > 1.05) {          // desktop: glifo grande à direita
        offX = aspect * 0.46; offY = 0.06; scale = 0.62;
        gl.uniform1f(U.uGlobalA, 1.0);
      } else {                      // mobile: centrado atrás do gráfico, mais discreto
        offX = 0.0; offY = -0.30; scale = 0.42;
        gl.uniform1f(U.uGlobalA, 0.6);
      }
      gl.uniform1f(U.uScale, scale);
      // a curva tem 3 unidades de largura: limita ao viewport (portrait)
      gl.uniform1f(U.uScale2, Math.min(scale, aspect * 0.6));
      gl.uniform2f(U.uOffset, offX, offY);
    }

    /* gancho público: pulso de choque no centro do glifo (usado no clique do logo) */
    window.veloBurst = function () {
      if (!running) return; // hero fora da tela: nada de choque "congelado"
      shockX = offX; shockY = offY;
      state.shockT = 0;
    };

    if (!build()) { canvas.remove(); return; }
    resize();

    function toWorld(clientX, clientY) {
      var lx = clientX, ly = clientY - (heroTop - window.scrollY);
      return [(lx / W * 2 - 1) * aspect, -(ly / H * 2 - 1)];
    }

    if (fine) {
      hero.addEventListener('pointermove', function (e) {
        var wpt = toWorld(e.clientX, e.clientY);
        tx = wpt[0]; ty = wpt[1];
        ptx = Math.max(-1, Math.min(1, wpt[0] / aspect));
        pty = Math.max(-1, Math.min(1, wpt[1]));
      }, { passive: true });
      hero.addEventListener('pointerleave', function () { ptx = 0; pty = 0; });
    }

    /* clique em área livre do hero: onda de choque */
    hero.addEventListener('pointerdown', function (e) {
      if (e.target.closest('a, button, input, label')) return;
      var wpt = toWorld(e.clientX, e.clientY);
      shockX = wpt[0]; shockY = wpt[1];
      state.shockT = 0;
    }, { passive: true });

    /* coreografia: forma o "V", respira, e alterna com a curva em loop */
    if (window.gsap) {
      gsap.to(state, { form: 1, delay: 1.35, duration: 2.4, ease: 'power3.inOut' });
      gsap.to(state, { form: 0.94, delay: 5.6, duration: 5, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      gsap.timeline({ delay: 7.5, repeat: -1, repeatDelay: 6 })
        .to(state, { morph: 1, duration: 2.8, ease: 'power3.inOut' })
        .to(state, { morph: 0, duration: 2.8, ease: 'power3.inOut' }, '+=6');
    } else {
      var t0 = performance.now() / 1000 + 1.35;
      state._fallback = function (now) {
        var p = Math.min(Math.max((now - t0) / 2.4, 0), 1);
        state.form = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      };
    }

    /* ---------- loop: roda só com o hero visível e a aba ativa ---------- */
    var running = false, visible = true, rafId = 0, last = 0;

    function step(nowMs) {
      rafId = requestAnimationFrame(step);
      var now = nowMs / 1000;
      var dt = Math.min(now - last, 1 / 30);
      last = now;

      /* mola do mouse — Euler semi-implícito, independente de FPS */
      mvx += ((tx - mx) * K - C * mvx) * dt;
      mvy += ((ty - my) * K - C * mvy) * dt;
      mx += mvx * dt; my += mvy * dt;

      var ease = 1 - Math.exp(-6 * dt);
      px += (ptx - px) * ease;
      py += (pty - py) * ease;

      var sy = window.scrollY;
      flowTarget = Math.min(Math.abs(sy - lastScroll) / (dt * heroH * 3 + 1), 1.2);
      lastScroll = sy;
      state.flow += (flowTarget - state.flow) * ease;
      var leaveTarget = Math.min(Math.max(sy / (heroH * 0.85), 0), 1);
      state.leave += (leaveTarget - state.leave) * ease;
      state.shockT += dt;

      if (state._fallback) state._fallback(now);

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(U.uTime, now);
      gl.uniform1f(U.uForm, state.form);
      gl.uniform1f(U.uMorph, state.morph);
      gl.uniform1f(U.uLeave, state.leave);
      gl.uniform1f(U.uFlow, state.flow);
      gl.uniform2f(U.uMouse, mx, my);
      gl.uniform2f(U.uMouseVel, mvx * 0.12, mvy * 0.12);
      gl.uniform2f(U.uPar, px, py);
      gl.uniform2f(U.uShock, shockX, shockY);
      gl.uniform1f(U.uShockT, state.shockT);
      gl.drawArrays(gl.POINTS, 0, COUNT);
    }

    function start() {
      if (running || !visible || document.hidden) return;
      running = true;
      last = performance.now() / 1000;
      rafId = requestAnimationFrame(step);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(rafId);
    }

    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      visible ? start() : stop();
    }, { rootMargin: '10%' }).observe(hero);

    document.addEventListener('visibilitychange', function () {
      document.hidden ? stop() : start();
    });

    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); stop(); });
    canvas.addEventListener('webglcontextrestored', function () {
      U = {};
      if (build()) { resize(); start(); }
    });

    var rT;
    window.addEventListener('resize', function () {
      clearTimeout(rT); rT = setTimeout(resize, 150);
    });

    start();
  });
})();
