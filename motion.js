/* ============================================================
   Velo Consultoria — camada de motion (GSAP + ScrollTrigger + Lenis)
   Progressive enhancement: sem GSAP (CDN bloqueado) ou com
   prefers-reduced-motion, o fade-up original do script.js assume.
   Regras: só transform/opacity, nenhuma propriedade de layout,
   triggers once:true, máscaras via overflow:clip. Zero layout shift.
   ============================================================ */
(function () {
  'use strict';

  // override de teste: ?motion=1 força as animações, ?motion=0 desliga
  var q = new URLSearchParams(location.search).get('motion');
  var reduced = q === '1' ? false
              : q === '0' ? true
              : matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ready = !!(window.gsap && window.ScrollTrigger && window.Lenis) && !reduced;

  // script.js lê esta flag para decidir se mantém o fallback de fades
  window.VELO_MOTION_ACTIVE = ready;
  if (!ready) return;

  gsap.registerPlugin(ScrollTrigger);
  document.documentElement.classList.add('velo-motion');

  // curva-assinatura de todo o site: um expo-out longo
  // (power4.out ≈ cubic-bezier(.19,1,.22,1) — desaceleração assintótica)
  var EASE = 'power4.out';

  /* ---------- smooth scroll (Lenis dirigido pelo ticker do GSAP) ---------- */
  function initLenis() {
    var lenis = new Lenis({
      duration: 1.1,                                       // "peso" da rolagem
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,                                   // touch permanece nativo
      autoRaf: false
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
    return lenis;
  }

  /* ---------- split do título preservando <em> e <br> ---------- */
  function splitTitle(el) {
    var label = (el.innerText || el.textContent).replace(/\s+/g, ' ').trim();
    var lines = [];

    function newLine() {
      var l = document.createElement('span');
      l.className = 'tr-line';
      l.setAttribute('aria-hidden', 'true');
      lines.push(l);
      return l;
    }
    function addWords(text, parent) {
      text.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/\s/.test(part)) { parent.appendChild(document.createTextNode(' ')); return; }
        var w = document.createElement('span');
        w.className = 'tr-word';
        w.textContent = part;
        parent.appendChild(w);
      });
    }

    var line = newLine();
    Array.prototype.slice.call(el.childNodes).forEach(function (node) {
      if (node.nodeName === 'BR') { line = newLine(); }
      else if (node.nodeType === Node.TEXT_NODE) { addWords(node.textContent, line); }
      else { // <em> e afins: clona o wrapper para manter itálico/cor
        var wrap = node.cloneNode(false);
        addWords(node.textContent, wrap);
        line.appendChild(wrap);
      }
    });

    el.setAttribute('aria-label', label); // leitores de tela ignoram o split
    el.textContent = '';
    lines.forEach(function (l) { el.appendChild(l); });
    return el.querySelectorAll('.tr-word');
  }

  /* ---------- abertura do hero: 4 tempos, um único easing ---------- */
  function initHeroIntro() {
    var hero = document.querySelector('.hero');
    if (!hero) return;

    var header   = document.querySelector('.header');
    var title    = hero.querySelector('.hero__title');
    var overline = hero.querySelector('.overline');
    var lead     = hero.querySelector('.hero__lead');
    var actions  = hero.querySelector('.hero__actions');
    var buttons  = actions ? actions.querySelectorAll('.btn') : [];
    var chart    = hero.querySelector('.hero__chart');
    var facts    = hero.querySelector('.hero__facts');
    var items    = facts ? facts.querySelectorAll('li') : [];
    var words    = title ? splitTitle(title) : [];

    // estados iniciais definidos antes do splash sair de cena — sem flash
    if (title)   gsap.set(title,   { autoAlpha: 1, y: 0 });
    if (actions) gsap.set(actions, { autoAlpha: 1, y: 0 });
    if (facts)   gsap.set(facts,   { autoAlpha: 1, y: 0 });
    if (header)  gsap.set(header,  { autoAlpha: 0, y: -12 });
    // rotação leve com origem no pé esquerdo: as palavras "aterrissam"
    gsap.set(words, { yPercent: 112, rotationZ: 5, transformOrigin: '0% 100%' });

    // delay 1.0s: começa ainda sob o splash (sai aos 0.9s + fade 0.5s),
    // então o título "atravessa" a cortina — troca de cena sem vazio
    var tl = gsap.timeline({ delay: 1.0, defaults: { ease: EASE } });

    if (header) tl.to(header, { autoAlpha: 1, y: 0, duration: 0.7 }, 0);
    if (overline) tl.fromTo(overline,
      { autoAlpha: 0, x: -10 }, { autoAlpha: 1, x: 0, duration: 0.7 }, 0.05);
    tl.to(words, { yPercent: 0, rotationZ: 0, duration: 1.1, stagger: 0.07 }, 0.12);
    if (chart) tl.fromTo(chart,
      { autoAlpha: 0, scale: 0.965, transformOrigin: '62% 72%' },
      { autoAlpha: 1, scale: 1, duration: 1.2 }, 0.3);
    if (lead) tl.fromTo(lead,
      { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.9 }, 0.5);
    if (buttons.length) tl.fromTo(buttons,
      { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.09 }, 0.62);
    if (facts) {
      gsap.set(items, { autoAlpha: 0, y: 14 });
      tl.to(facts, { '--rule': 1, duration: 1.1, ease: 'power3.inOut' }, 0.75); // régua desenha
      tl.to(items, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.08 }, 0.95);
      // contadores: os números sobem de zero junto com a revelação
      items.forEach(function (li, idx) {
        var strong = li.querySelector('strong');
        var m = strong && strong.textContent.match(/^(\d+)(.*)$/);
        if (!m) return;
        var end = +m[1], suf = m[2], obj = { v: 0 };
        tl.to(obj, {
          v: end, duration: 1.3, ease: 'power2.out',
          onUpdate: function () { strong.textContent = Math.round(obj.v) + suf; }
        }, 1.0 + idx * 0.08);
      });
    }
  }

  /* ---------- títulos de seção: mesma máscara por palavra do hero ---------- */
  var HEADING_POOL = [];
  function initHeadings() {
    gsap.utils.toArray('.section__head h2').forEach(function (h) {
      var words = splitTitle(h);
      gsap.set(words, { yPercent: 110 });
      HEADING_POOL.push({ el: h, words: words });
      ScrollTrigger.create({
        trigger: h, start: 'top 86%', once: true,
        onEnter: function () {
          gsap.to(words, { yPercent: 0, duration: 0.9, ease: EASE, stagger: 0.05 });
        }
      });
    });
  }

  /* ---------- spotlight: brilho radial que segue o cursor ---------- */
  function initSpotlight() {
    var els = document.querySelectorAll('.btn--primary, .btn--ghost, .btn--light, .card');
    els.forEach(function (el) {
      el.classList.add('spot');
      el.classList.add(el.classList.contains('btn--primary') ? 'spot--light' : 'spot--tint');
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--sx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--sy', (e.clientY - r.top) + 'px');
      }, { passive: true });
    });
  }

  /* ---------- tilt 3D nos cards: segue o cursor, solta com mola ---------- */
  function initTilt() {
    if (!matchMedia('(pointer: fine)').matches) return;
    gsap.utils.toArray('.card').forEach(function (card) {
      gsap.set(card, { transformPerspective: 900 });
      var rx = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3.out' });
      var ry = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3.out' });
      var yy = gsap.quickTo(card, 'y', { duration: 0.4, ease: 'power3.out' });
      card.addEventListener('pointerenter', function () { yy(-4); });
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var nx = (e.clientX - r.left) / r.width - 0.5;
        var ny = (e.clientY - r.top) / r.height - 0.5;
        rx(-ny * 6); ry(nx * 7);
      }, { passive: true });
      card.addEventListener('pointerleave', function () {
        gsap.to(card, {
          rotationX: 0, rotationY: 0, y: 0,
          duration: 0.9, ease: 'elastic.out(1, 0.45)', overwrite: 'auto'
        });
      });
    });
  }

  /* ---------- botões magnéticos (desktop, ponteiro fino) ---------- */
  function initMagnetic() {
    if (!matchMedia('(pointer: fine)').matches) return;
    var els = document.querySelectorAll(
      '.hero__actions .btn, .header__wa, .cta .btn, #simCta, #guideCta'
    );
    els.forEach(function (el) {
      el.setAttribute('data-magnetic', '');
      // quickTo: um único tween reciclado por eixo — nada de new tween por mousemove
      var xTo = gsap.quickTo(el, 'x', { duration: 0.35, ease: 'power3.out' });
      var yTo = gsap.quickTo(el, 'y', { duration: 0.35, ease: 'power3.out' });
      var rect = null;

      el.addEventListener('pointerenter', function () {
        rect = el.getBoundingClientRect();
      });
      el.addEventListener('pointermove', function (e) {
        if (!rect) rect = el.getBoundingClientRect();
        var dx = e.clientX - (rect.left + rect.width / 2);
        var dy = e.clientY - (rect.top + rect.height / 2);
        xTo(dx * 0.3);   // segue o cursor a 30% da distância ao centro
        yTo(dy * 0.36);  // um pouco mais no eixo Y: botões são baixos
      });
      el.addEventListener('pointerleave', function () {
        rect = null;
        // "solta" com física de mola subamortecida: 1 overshoot e assenta
        gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.38)', overwrite: 'auto' });
      });
    });
  }

  /* ---------- lanterna: a luz segue o cursor com inércia; parada, varre sozinha ---------- */
  function initLanterna() {
    var field = document.querySelector('.dark-field');
    var dim = field && field.querySelector('.dark-field__dim');
    if (!dim) return;
    var lit = dim.cloneNode(true);
    lit.className = 'dark-field__lit';
    lit.setAttribute('aria-hidden', 'true');
    field.appendChild(lit);
    field.classList.add('is-live');

    var hint = document.querySelector('.dark-field__hint');
    if (hint && !matchMedia('(pointer: fine)').matches) {
      hint.lastChild.textContent = 'arraste o dedo para iluminar';
    }

    var fx = 50, fy = 42, txx = 50, tyy = 42, lastMove = -1e9, visible = false;
    function aim(clientX, clientY) {
      var r = field.getBoundingClientRect();
      txx = (clientX - r.left) / r.width * 100;
      tyy = (clientY - r.top) / r.height * 100;
      lastMove = performance.now();
    }
    field.addEventListener('pointermove', function (e) { aim(e.clientX, e.clientY); }, { passive: true });
    field.addEventListener('pointerdown', function (e) { aim(e.clientX, e.clientY); }, { passive: true });

    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; },
      { rootMargin: '10%' }).observe(field);

    gsap.ticker.add(function (time) {
      if (!visible) return;
      // cursor em repouso: a luz varre o campo numa lissajous lenta
      if (performance.now() - lastMove > 2600) {
        txx = 50 + 40 * Math.sin(time * 0.5);
        tyy = 50 + 34 * Math.sin(time * 0.33 + 1.4);
      }
      var k = 0.09 * gsap.ticker.deltaRatio(); // lerp exponencial ~180ms
      fx += (txx - fx) * k;
      fy += (tyy - fy) * k;
      field.style.setProperty('--fx', fx + '%');
      field.style.setProperty('--fy', fy + '%');
    });
  }

  /* ---------- comparador: divisa arrastável no desktop, alternância no mobile
     (texto recortado ao meio é ilegível em 360px de largura) ---------- */
  function initComparador() {
    var cmp = document.querySelector('.cmp');
    var sem = cmp && cmp.querySelector('.cmp__panel--sem');
    var com = cmp && cmp.querySelector('.cmp__panel--com');
    var handle = cmp && cmp.querySelector('.cmp__handle');
    if (!sem || !com || !handle) return;

    if (matchMedia('(max-width: 639px)').matches) buildToggle();
    else buildDrag();

    // a camada de cima é absoluta: o container precisa da altura da maior
    function syncHeight() {
      sem.style.minHeight = '';
      sem.style.minHeight = Math.max(sem.offsetHeight, com.scrollHeight) + 'px';
    }
    syncHeight();
    window.addEventListener('resize', syncHeight);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncHeight);

    function buildToggle() {
      cmp.classList.add('cmp--toggle');
      var lead = document.querySelector('#doisfuturos .section__lead');
      if (lead) lead.textContent = 'Toque para alternar entre os dois cenários.';

      var bar = document.createElement('div');
      bar.className = 'cmp__switch';
      bar.innerHTML =
        '<span class="cmp__thumb" aria-hidden="true"></span>' +
        '<button type="button" class="is-on" aria-pressed="true">Sem plano</button>' +
        '<button type="button" aria-pressed="false">Com a Velo</button>';
      cmp.parentNode.insertBefore(bar, cmp);
      var thumb = bar.querySelector('.cmp__thumb');
      var btns = bar.querySelectorAll('button');
      var panels = [sem, com];
      var current = 0;
      gsap.set(com, { xPercent: 24, autoAlpha: 0 });

      function moveThumb(btn, instant) {
        gsap.to(thumb, {
          x: btn.offsetLeft - 4, width: btn.offsetWidth,
          duration: instant ? 0 : 0.45, ease: 'power3.out'
        });
      }
      moveThumb(btns[0], true);

      btns.forEach(function (btn, i) {
        btn.addEventListener('click', function () {
          if (i === current) return;
          var dir = i > current ? 1 : -1;
          gsap.to(panels[current], {
            xPercent: -18 * dir, autoAlpha: 0,
            duration: 0.35, ease: 'power2.in', overwrite: 'auto'
          });
          gsap.fromTo(panels[i],
            { xPercent: 24 * dir, autoAlpha: 0 },
            { xPercent: 0, autoAlpha: 1, duration: 0.55, ease: EASE, overwrite: 'auto' });
          btns[current].classList.remove('is-on');
          btns[current].setAttribute('aria-pressed', 'false');
          btn.classList.add('is-on');
          btn.setAttribute('aria-pressed', 'true');
          moveThumb(btn);
          current = i;
        });
      });
    }

    function buildDrag() {
      cmp.classList.add('cmp--live');
      var pos = { cut: 58 };
      function clampCut(v) { return Math.max(0, Math.min(100, v)); }
      function apply() {
        // recorte duplo: cada painel só existe do seu lado da divisa —
        // nenhum glifo vaza, e a divisa fecha 100% para qualquer lado
        com.style.clipPath = 'inset(0 0 0 ' + pos.cut + '%)';
        sem.style.clipPath = 'inset(0 ' + (100 - pos.cut) + '% 0 0)';
        handle.style.left = pos.cut + '%';
        handle.setAttribute('aria-valuenow', Math.round(pos.cut));
      }
      apply();

      var dragging = false, lastX = 0, lastT = 0, vel = 0;
      cmp.addEventListener('pointerdown', function (e) {
        // no toque, só a alça inicia o arrasto (não sequestra o scroll)
        if (e.pointerType !== 'mouse' && !e.target.closest('.cmp__handle')) return;
        dragging = true; vel = 0; lastX = e.clientX; lastT = performance.now();
        gsap.killTweensOf(pos);
        cmp.setPointerCapture(e.pointerId);
        var r = cmp.getBoundingClientRect();
        pos.cut = clampCut((e.clientX - r.left) / r.width * 100);
        apply();
      });
      cmp.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        var r = cmp.getBoundingClientRect();
        var now = performance.now(), ms = (now - lastT) || 16;
        vel = (e.clientX - lastX) / r.width * 100 / ms * 1000; // %/s
        lastX = e.clientX; lastT = now;
        pos.cut = clampCut((e.clientX - r.left) / r.width * 100);
        apply();
      });
      function release() {
        if (!dragging) return;
        dragging = false;
        // inércia + ímã nas bordas: perto do fim, fecha de vez —
        // nunca estaciona com letras decepadas pelo recorte
        var target = clampCut(pos.cut + vel * 0.15);
        if (target < 12) target = 0;
        else if (target > 88) target = 100;
        gsap.to(pos, { cut: target, duration: 0.8, ease: 'power3.out', onUpdate: apply });
      }
      cmp.addEventListener('pointerup', release);
      cmp.addEventListener('pointercancel', release);

      handle.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowLeft' ? -7 : e.key === 'ArrowRight' ? 7 : 0;
        if (!d) return;
        e.preventDefault();
        gsap.to(pos, { cut: clampCut(pos.cut + d), duration: 0.45, ease: 'power3.out', onUpdate: apply });
      });
    }
  }

  /* ---------- como funciona: jornada pinada — o scroll ativa os passos ---------- */
  function initJourney() {
    var steps = document.querySelector('#como .steps');
    if (!steps || !matchMedia('(min-width: 980px)').matches) return false;
    var lis = gsap.utils.toArray(steps.querySelectorAll('li'));
    if (lis.length < 2) return false;

    steps.classList.add('steps--journey');
    var track = document.createElement('span');
    track.className = 'steps__track';
    track.setAttribute('aria-hidden', 'true');
    var bar = document.createElement('span');
    bar.className = 'steps__bar';
    track.appendChild(bar);
    steps.appendChild(track);

    gsap.set(lis, { opacity: 0.25, y: 18 });

    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#como', start: 'top 72px', end: '+=130%',
        pin: true, scrub: 0.5, anticipatePin: 1
      }
    });
    tl.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: 3.8, ease: 'none' }, 0.2);
    lis.forEach(function (li, i) {
      tl.to(li, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, i + 0.2);
      tl.to(li.querySelector('span'), {
        backgroundColor: '#9000D0', color: '#ffffff', borderColor: '#9000D0', duration: 0.4
      }, i + 0.3);
    });
    return true;
  }

  /* ---------- delícias: pop no simulador + pulso das partículas no logo ---------- */
  function initDelights() {
    var out = document.getElementById('simOut');
    if (out) {
      new MutationObserver(function () {
        if (!out.hidden) {
          gsap.fromTo(out.querySelectorAll('.sim__row, .btn'),
            { y: 10, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.5, ease: EASE, stagger: 0.06, overwrite: 'auto' });
        }
      }).observe(out, { attributes: true, attributeFilter: ['hidden'] });
      var renda = document.getElementById('simRenda');
      if (renda) renda.addEventListener('input', function () {
        if (!out.hidden) gsap.fromTo(out.querySelectorAll('strong'),
          { scale: 1.06 }, { scale: 1, duration: 0.35, ease: 'power2.out', overwrite: 'auto' });
      });
    }
    // clique na marca: onda de choque no campo de partículas do hero
    var brand = document.querySelector('.brand');
    if (brand) brand.addEventListener('click', function () {
      if (window.veloBurst) window.veloBurst();
    });
  }

  /* ---------- revelações por scroll: opacidade + escala + y ---------- */
  var PARALLAX_SEL = '.sim, .guide, .quote';
  var REVEAL_POOL = []; // tudo que os batches controlam, para a rede de segurança

  /* rede de segurança: se um trigger falhar (salto por hash, restauração de
     scroll), nada pode ficar invisível dentro do viewport */
  function sweepStuckReveals() {
    var vh = window.innerHeight;
    REVEAL_POOL.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0 && Number(gsap.getProperty(el, 'opacity')) < 0.9) {
        gsap.to(el, { autoAlpha: 1, y: 0, scale: 1, duration: 0.7, ease: EASE, overwrite: 'auto' });
      }
    });
    HEADING_POOL.forEach(function (o) {
      var r = o.el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0 && Number(gsap.getProperty(o.words[0], 'yPercent')) > 1) {
        gsap.to(o.words, { yPercent: 0, duration: 0.8, ease: EASE, stagger: 0.04, overwrite: 'auto' });
      }
    });
  }

  function initReveals(journeyOn) {
    var parallaxEls = gsap.utils.toArray(PARALLAX_SEL);
    var items = gsap.utils.toArray('.fade').filter(function (el) {
      return !el.closest('.hero') && parallaxEls.indexOf(el) === -1
          && !el.classList.contains('chips')
          && !(journeyOn && el.matches('.steps li')); // a jornada pinada assume os passos
    });

    // chips de seguradoras: onda rápida, um a um
    var chips = document.querySelector('.chips');
    if (chips) {
      var chipItems = chips.querySelectorAll('li');
      REVEAL_POOL.push.apply(REVEAL_POOL, chipItems);
      gsap.set(chips, { autoAlpha: 1, y: 0 });
      gsap.set(chipItems, { autoAlpha: 0, y: 12, scale: 0.92 });
      ScrollTrigger.create({
        trigger: chips, start: 'top 88%', once: true,
        onEnter: function () {
          gsap.to(chipItems, {
            autoAlpha: 1, y: 0, scale: 1,
            duration: 0.6, ease: EASE, stagger: 0.018
          });
        }
      });
    }

    REVEAL_POOL.push.apply(REVEAL_POOL, items);
    REVEAL_POOL.push.apply(REVEAL_POOL, parallaxEls);

    if (items.length) {
      gsap.set(items, { autoAlpha: 0, y: 34, scale: 0.97 });
      ScrollTrigger.batch(items, {
        start: 'top 88%',
        once: true,
        onEnter: function (batch) {
          gsap.to(batch, {
            autoAlpha: 1, y: 0, scale: 1,
            duration: 1.05, ease: EASE, stagger: 0.09, overwrite: 'auto'
          });
        }
      });
    }

    // blocos com parallax revelam só com alpha+escala: o eixo Y é do scrub
    if (parallaxEls.length) {
      gsap.set(parallaxEls, { autoAlpha: 0, scale: 0.97 });
      ScrollTrigger.batch(parallaxEls, {
        start: 'top 88%',
        once: true,
        onEnter: function (batch) {
          gsap.to(batch, {
            autoAlpha: 1, scale: 1,
            duration: 1.15, ease: EASE, stagger: 0.1, overwrite: 'auto'
          });
        }
      });
    }
  }

  /* ---------- parallax sutil (scrub, ease none: quem dita é o dedo) ---------- */
  function initParallax() {
    var chart = document.querySelector('.hero__chart');
    if (chart) {
      gsap.to(chart, {
        yPercent: -6, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
      });
    }
    gsap.utils.toArray(PARALLAX_SEL).forEach(function (el) {
      gsap.fromTo(el, { y: 28 }, {
        y: -28, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
    var mark = document.querySelector('.cta__mark');
    if (mark) {
      gsap.fromTo(mark, { yPercent: -6 }, {
        yPercent: 6, ease: 'none',
        scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'bottom top', scrub: true }
      });
    }
  }

  /* ---------- âncoras internas passam pelo Lenis (offset do header) ---------- */
  function initAnchors(lenis) {
    document.querySelectorAll('a[href^="#"]:not(.skip-link)').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (id.length < 2) return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        history.pushState(null, '', id);
        lenis.scrollTo(target, {
          offset: -84, duration: 1.2,
          easing: function (t) { return 1 - Math.pow(1 - t, 4); }
        });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var lenis = initLenis();
    initHeroIntro();
    initHeadings();
    var journeyOn = initJourney();
    initMagnetic();
    initSpotlight();
    initTilt();
    initLanterna();
    initComparador();
    initDelights();
    initReveals(journeyOn);
    initParallax();
    initAnchors(lenis);

    // reposiciona triggers quando a fonte serif carrega ou o FAQ abre/fecha
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    }
    document.addEventListener('toggle', function () {
      requestAnimationFrame(function () { ScrollTrigger.refresh(); });
    }, true);

    // hash inicial (#secao na URL): splits, pins e fontes mudam o layout
    // depois do salto nativo — reposiciona quando cada etapa assentar
    function goHash() {
      var t = location.hash.length > 1 && document.getElementById(location.hash.slice(1));
      if (!t) return;
      ScrollTrigger.refresh();
      lenis.scrollTo(t, { offset: -84, immediate: true });
      requestAnimationFrame(function () {
        ScrollTrigger.refresh();
        sweepStuckReveals();
      });
    }
    window.addEventListener('load', function () {
      goHash();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(goHash);
      setTimeout(sweepStuckReveals, 1500); // rede de segurança geral
    });
  });
})();
