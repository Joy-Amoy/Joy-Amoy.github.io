/* minicorp — tiny progressive-enhancement layer. No dependencies. */
(function () {
  'use strict';

  /* --- sticky nav hairline --- */
  var nav = document.querySelector('.nav');
  if (nav) {
    var onScroll = function () {
      nav.classList.toggle('is-stuck', window.scrollY > 4);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    var toggle = nav.querySelector('.nav-toggle');
    if (toggle) {
      toggle.addEventListener('click', function () {
        var open = nav.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(open));
      });
    }
  }

  /* --- scroll reveal --- */
  var targets = document.querySelectorAll('.rv');
  if (!('IntersectionObserver' in window)) {
    for (var i = 0; i < targets.length; i++) targets[i].classList.add('in');
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var delay = parseInt(el.dataset.rvDelay || '0', 10);
        setTimeout(function () { el.classList.add('in'); }, delay);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    targets.forEach(function (t) { io.observe(t); });
  }

  /* --- orbit: draw hub-and-spoke links from the satellites' own coords --- */
  var orbit = document.querySelector('.orbit');
  if (orbit) {
    var svg = orbit.querySelector('.orbit-links');
    var sats = orbit.querySelectorAll('.sat');
    if (svg && sats.length) {
      var NS = 'http://www.w3.org/2000/svg';
      sats.forEach(function (s, n) {
        var x = parseFloat(s.style.getPropertyValue('--x'));
        var y = parseFloat(s.style.getPropertyValue('--y'));
        var ln = document.createElementNS(NS, 'line');
        ln.setAttribute('x1', 50); ln.setAttribute('y1', 50);
        ln.setAttribute('x2', x);  ln.setAttribute('y2', y);
        ln.style.animation = 'dash 2.4s linear infinite';
        ln.style.animationDelay = (n * -0.4) + 's';
        svg.appendChild(ln);
      });

      /* keyframes for the flowing dashes, injected so the CSS file stays static */
      var st = document.createElement('style');
      st.textContent = '@keyframes dash{to{stroke-dashoffset:-20}}';
      document.head.appendChild(st);
    }

    /* gentle parallax on the whole stage */
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce && window.matchMedia('(min-width: 841px)').matches) {
      var raf = null;
      orbit.addEventListener('mousemove', function (ev) {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = null;
          var r = orbit.getBoundingClientRect();
          var dx = (ev.clientX - r.left) / r.width - 0.5;
          var dy = (ev.clientY - r.top) / r.height - 0.5;
          orbit.querySelectorAll('.sat').forEach(function (s, n) {
            var k = 9 + (n % 3) * 4;
            /* custom properties feed a transform, so this never triggers layout */
            s.style.setProperty('--px', (dx * k).toFixed(2) + 'px');
            s.style.setProperty('--py', (dy * k).toFixed(2) + 'px');
          });
        });
      });
      orbit.addEventListener('mouseleave', function () {
        orbit.querySelectorAll('.sat').forEach(function (s) {
          s.style.setProperty('--px', '0px');
          s.style.setProperty('--py', '0px');
        });
      });
    }
  }

  /* --- click-to-play video in the vision block --- */
  var vbox = document.getElementById('visionVideo');
  if (vbox) {
    var vid = vbox.querySelector('.vid-player');
    var playBtn = vbox.querySelector('.vid-play');

    function startVideo() {
      vid.hidden = false;
      vid.controls = true;                       /* native pause / scrub / volume once playing */
      vbox.classList.add('playing');
      var p = vid.play();
      if (p && p.catch) p.catch(function () { stopVideo(); });
    }
    function stopVideo() {
      vid.pause();
      vid.currentTime = 0;
      vid.controls = false;
      vid.hidden = true;
      vbox.classList.remove('playing');
    }

    playBtn.addEventListener('click', function (e) { e.stopPropagation(); startVideo(); });
    vbox.addEventListener('click', function () {
      if (!vbox.classList.contains('playing')) startVideo();
    });
    vid.addEventListener('ended', stopVideo);     /* back to the poster so it can be replayed */
  }

})();
