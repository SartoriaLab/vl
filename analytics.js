/* Velo Consultoria — instrumentação de eventos (leve, sem dependências)
   Para ativar o GA4: preencha o ID abaixo (ex.: 'G-XXXXXXXXXX').
   Sem ID, os eventos são apenas registrados em console.debug — o site
   não carrega nenhum script de terceiros nem grava cookies. */
(function () {
  'use strict';

  var GA4_ID = ''; // PLACEHOLDER: ID de medição do GA4

  var send;
  if (GA4_ID) {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', GA4_ID, { anonymize_ip: true });
    send = function (name, params) { gtag('event', name, params || {}); };
  } else {
    send = function (name, params) {
      if (window.console && console.debug) console.debug('[velo-analytics]', name, params || {});
    };
  }

  var fired = {};
  function once(key, name, params) {
    if (fired[key]) return;
    fired[key] = true;
    send(name, params);
  }

  document.addEventListener('DOMContentLoaded', function () {
    // conversão principal: qualquer clique para o WhatsApp, com a seção de origem
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href*="wa.me"]');
      if (!a) return;
      var sec = a.closest('section[id]');
      send('whatsapp_click', { origem: sec ? sec.id : (a.closest('header') ? 'header' : 'outro') });
    });

    // engajamento nas peças interativas (1x por sessão cada)
    var sim = document.getElementById('simRenda');
    if (sim) sim.addEventListener('input', function () { once('sim', 'simulador_usado'); });

    var guide = document.getElementById('guide');
    if (guide) guide.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('button[data-when]')) once('guide', 'guia_concluido');
    });

    var cmp = document.querySelector('.cmp');
    if (cmp) cmp.addEventListener('pointerdown', function () { once('cmp', 'comparador_usado'); });

    var dark = document.querySelector('.dark-field');
    if (dark) dark.addEventListener('pointermove', function () { once('dark', 'lanterna_usada'); }, { passive: true });

    var mail = document.querySelector('a[href^="mailto:"]');
    if (mail) document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a[href^="mailto:"]')) send('email_click');
    });
  });
})();
