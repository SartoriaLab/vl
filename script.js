/* Velo Consultoria — interações mínimas */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    // abertura de marca: o logo recebe o visitante e sai de cena
    const splash = document.getElementById('splash');
    if (splash) {
      setTimeout(() => {
        splash.classList.add('out');
        setTimeout(() => splash.remove(), 600);
      }, 900);
    }

    // ano do rodapé
    const y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();

    // fade-up ao entrar na tela (fallback — motion.js assume quando GSAP está ativo)
    const fades = Array.from(document.querySelectorAll('.fade'));
    if (window.VELO_MOTION_ACTIVE) {
      // GSAP/ScrollTrigger controlam todas as revelações
    } else if (!('IntersectionObserver' in window)) {
      fades.forEach(el => el.classList.add('in'));
    } else {
      const io = new IntersectionObserver((entries, obs) => {
        entries.forEach(e => {
          if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
      fades.forEach(el => io.observe(el));
    }

    // curva de patrimônio — narrativa em 4 atos:
    // o traço desenha por etapas, pausando em cada marco do método (badge pinga),
    // a área varre junto, e o ponto final pulsa no encerramento. Replay disponível.
    const chart = document.querySelector('.hero__chart');
    if (chart) {
      const line = chart.querySelector('.chart__line');
      const area = chart.querySelector('.chart__area');
      const replay = chart.querySelector('.chart__replay');
      const VB_W = 520, VB_H = 320;
      const STOPS = [
        { p: 0.24, n: '01', t: 'Diagnóstico' },
        { p: 0.50, n: '02', t: 'Estratégia' },
        { p: 0.76, n: '03', t: 'Implementação' },
        { p: 1.00, n: '04', t: 'Acompanhamento' }
      ];
      let len = 900;
      try { len = line.getTotalLength(); } catch (e) {}
      line.style.strokeDasharray = String(len);

      // cria os badges nas posições exatas da curva
      const marks = STOPS.map(s => {
        let pt = { x: VB_W * s.p, y: VB_H * (1 - s.p) };
        try { pt = line.getPointAtLength(len * s.p); } catch (e) {}
        const el = document.createElement('div');
        el.className = 'mark' + (pt.x / VB_W > 0.85 ? ' mark--end' : '');
        el.setAttribute('aria-hidden', 'true');
        el.innerHTML = '<b>' + s.n + '</b>' + s.t;
        el.style.left = (pt.x / VB_W * 100) + '%';
        el.style.top = (pt.y / VB_H * 100) + '%';
        chart.appendChild(el);
        return el;
      });

      const easeIO = p => p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      const SEG = 850, PAUSE = 430, LOOP = 5000;
      let playing = false, loopTimer = null, hovering = false, visible = true;
      const setP = p => {
        line.style.strokeDashoffset = String(len * (1 - p));
        if (area) area.style.clipPath = 'inset(0 ' + ((1 - p) * 100) + '% 0 0)';
      };
      // loop automático: reinicia 5s após terminar — mas nunca com o mouse
      // sobre o gráfico nem com o hero fora da tela
      const scheduleLoop = wait => {
        clearTimeout(loopTimer);
        loopTimer = setTimeout(() => {
          if (!playing && visible && !hovering) play();
          else scheduleLoop(1200);
        }, wait);
      };
      const play = () => {
        if (playing) return;
        playing = true;
        clearTimeout(loopTimer);
        chart.classList.remove('is-drawn', 'is-done');
        marks.forEach(m => m.classList.remove('on'));
        setP(0);
        let i = 0, from = 0;
        const seg = () => {
          const to = STOPS[i].p, t0 = performance.now();
          const step = now => {
            const k = Math.min((now - t0) / SEG, 1);
            setP(from + (to - from) * easeIO(k));
            if (k < 1) requestAnimationFrame(step);
            else {
              marks[i].classList.add('on');
              from = to; i++;
              if (i < STOPS.length) setTimeout(seg, PAUSE);
              else {
                chart.classList.add('is-drawn', 'is-done');
                playing = false;
                scheduleLoop(LOOP);
              }
            }
          };
          requestAnimationFrame(step);
        };
        seg();
      };
      chart.addEventListener('mouseenter', () => { hovering = true; });
      chart.addEventListener('mouseleave', () => { hovering = false; });
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; }), { threshold: 0.25 }).observe(chart);
      }
      setTimeout(play, 1150); // espera a abertura de marca sair de cena
      if (replay) replay.addEventListener('click', play);
    }

    // FAQ: um item aberto por vez
    const faq = document.getElementById('faqList');
    if (faq) {
      const items = Array.from(faq.querySelectorAll('details'));
      items.forEach(d => d.addEventListener('toggle', () => {
        if (d.open) items.forEach(o => { if (o !== d && o.open) o.open = false; });
      }));
    }

    // header: sombra ao rolar
    const header = document.querySelector('.header');
    if (header) {
      const onScroll = () => header.classList.toggle('header--scrolled', scrollY > 8);
      onScroll();
      addEventListener('scroll', onScroll, { passive: true });
    }

    // scrollspy: marca o link da seção visível
    const navLinks = Array.from(document.querySelectorAll('.header__nav a'));
    if (navLinks.length && 'IntersectionObserver' in window) {
      const map = new Map();
      navLinks.forEach(l => {
        const s = document.getElementById(l.getAttribute('href').slice(1));
        if (s) map.set(s, l);
      });
      const spy = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) {
          navLinks.forEach(l => l.removeAttribute('aria-current'));
          const lk = map.get(e.target); if (lk) lk.setAttribute('aria-current', 'true');
        }
      }), { rootMargin: '-35% 0px -60% 0px' });
      map.forEach((_, s) => spy.observe(s));
    }

    // menu mobile
    const btn = document.getElementById('menuBtn');
    const nav = document.getElementById('mobileNav');
    if (btn && nav) {
      const close = () => { nav.hidden = true; btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-label', 'Abrir menu'); };
      const open = () => { nav.hidden = false; btn.setAttribute('aria-expanded', 'true'); btn.setAttribute('aria-label', 'Fechar menu'); };
      btn.addEventListener('click', e => {
        e.stopPropagation();
        btn.getAttribute('aria-expanded') === 'true' ? close() : open();
      });
      nav.addEventListener('click', e => { if (e.target.tagName === 'A') close(); });
      document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
      document.addEventListener('click', e => { if (!nav.hidden && !nav.contains(e.target)) close(); });
    }

    // simulador PGBL: 12% da renda bruta, economia estimada a 27,5%
    const simRenda = document.getElementById('simRenda');
    if (simRenda) {
      const out = document.getElementById('simOut');
      const elAporte = document.getElementById('simAporte');
      const elEco = document.getElementById('simEconomia');
      const cta = document.getElementById('simCta');
      const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
      simRenda.addEventListener('input', () => {
        const digits = simRenda.value.replace(/\D/g, '').slice(0, 10);
        const renda = parseInt(digits || '0', 10);
        simRenda.value = digits ? new Intl.NumberFormat('pt-BR').format(renda) : '';
        if (renda >= 10000) {
          const aporte = renda * 0.12;
          const economia = aporte * 0.275;
          elAporte.textContent = brl.format(aporte);
          elEco.textContent = 'até ' + brl.format(economia) + '/ano';
          const msg = `Olá! Simulei no site: com renda anual de ${brl.format(renda)}, posso aportar ${brl.format(aporte)} em PGBL e economizar até ${brl.format(economia)} de IR. Quero entender meu caso.`;
          cta.href = 'https://wa.me/5519971100435?text=' + encodeURIComponent(msg);
          out.hidden = false;
        } else {
          out.hidden = true;
        }
      });
    }

    // guia rápido: 2 perguntas -> recomendação + CTA contextual
    const guide = document.getElementById('guide');
    if (guide) {
      const q1 = guide.querySelector('[data-q="1"]');
      const q2 = guide.querySelector('[data-q="2"]');
      const result = guide.querySelector('.guide__result');
      const answer = document.getElementById('guideAnswer');
      const gCta = document.getElementById('guideCta');
      const MAP = {
        vida: { nome: 'Seguros de Vida', extra: 'com o Vida Resgatável, a proteção também vira reserva' },
        prev: { nome: 'Previdência Privada', extra: 'PGBL ou VGBL, conforme sua declaração de IR' },
        inv:  { nome: 'Investimentos & Crédito', extra: 'do consórcio sem juros às aplicações diversificadas' },
        elem: { nome: 'Seguros Elementares', extra: 'proteção predial, residencial e de condomínio' },
        agro: { nome: 'Agronegócio', extra: 'seguro pecuário, agrícola e penhor rural' }
      };
      const WHEN = {
        curto: 'Como você precisa de resultado agora, começamos pelo diagnóstico e priorizamos o que dá efeito imediato.',
        medio: 'Com horizonte de alguns anos, dá para combinar proteção e acumulação com calma.',
        longo: 'Pensando no longo prazo, a estratégia ganha força — juros compostos e sucessão bem desenhada.'
      };
      let goal = null;
      q1.addEventListener('click', e => {
        const b = e.target.closest('button[data-goal]'); if (!b) return;
        goal = b.dataset.goal;
        q1.querySelectorAll('button').forEach(x => x.classList.toggle('is-sel', x === b));
        q2.hidden = false;
        q2.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
      q2.addEventListener('click', e => {
        const b = e.target.closest('button[data-when]'); if (!b) return;
        q2.querySelectorAll('button').forEach(x => x.classList.toggle('is-sel', x === b));
        const m = MAP[goal] || MAP.inv;
        answer.innerHTML = `<strong>${m.nome}</strong> — ${m.extra}. ${WHEN[b.dataset.when]}`;
        gCta.href = 'https://wa.me/5519971100435?text=' + encodeURIComponent(`Olá! Fiz o guia do site e minha prioridade é ${m.nome}. Quero conversar sobre isso.`);
        result.hidden = false;
        result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
      document.getElementById('guideRestart').addEventListener('click', () => {
        goal = null;
        guide.querySelectorAll('.is-sel').forEach(x => x.classList.remove('is-sel'));
        q2.hidden = true; result.hidden = true;
      });
    }

    // cursor de leitura da curva (desktop): linha + ponto seguem o mouse sobre o gráfico
    const chartBox = document.querySelector('.hero__chart');
    if (chartBox && matchMedia('(pointer: fine)').matches) {
      const svg = chartBox.querySelector('svg');
      const path = chartBox.querySelector('.chart__line');
      const cur = chartBox.querySelector('.chart__cursor');
      const reader = chartBox.querySelector('.chart__reader');
      if (svg && path && cur && reader) {
        let pts = null;
        const sample = () => {
          let len = 0;
          try { len = path.getTotalLength(); } catch (e) { return; }
          pts = [];
          for (let i = 0; i <= 120; i++) pts.push(path.getPointAtLength(len * i / 120));
        };
        chartBox.addEventListener('mousemove', e => {
          if (!pts) sample();
          if (!pts || !pts.length) return;
          const r = svg.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width * 520; // largura do viewBox
          let best = pts[0];
          for (const p of pts) if (Math.abs(p.x - x) < Math.abs(best.x - x)) best = p;
          cur.setAttribute('x1', best.x); cur.setAttribute('x2', best.x);
          reader.setAttribute('cx', best.x); reader.setAttribute('cy', best.y);
          cur.setAttribute('opacity', '1'); reader.setAttribute('opacity', '1');
        });
        chartBox.addEventListener('mouseleave', () => {
          cur.setAttribute('opacity', '0'); reader.setAttribute('opacity', '0');
        });
      }
    }
  });
})();
