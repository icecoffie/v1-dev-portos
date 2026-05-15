(function () {
  'use strict';

  var LANG_KEY = 'devpf-lang';
  var THEME_KEY = 'devpf-theme';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function qs(sel, ctx) {
    return (ctx || document).querySelector(sel);
  }
  function qsa(sel, ctx) {
    return [].slice.call((ctx || document).querySelectorAll(sel));
  }

  function getLang() {
    return localStorage.getItem(LANG_KEY) || 'en';
  }

  function getThemeDark() {
    var v = localStorage.getItem(THEME_KEY);
    if (v === 'light') return false;
    if (v === 'dark') return true;
    return true;
  }

  function applyLanguage(lang) {
    var isAr = lang === 'ar';
    document.documentElement.lang = isAr ? 'ar' : 'en';
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
    localStorage.setItem(LANG_KEY, lang);

    qsa('[data-text-en]').forEach(function (el) {
      if (el.closest('.hero-morph-lock')) return;
      var en = el.getAttribute('data-text-en');
      var ar = el.getAttribute('data-text-ar');
      el.textContent = isAr ? ar || en : en;
    });

    qsa('[data-placeholder-en]').forEach(function (el) {
      var en = el.getAttribute('data-placeholder-en');
      var ar = el.getAttribute('data-placeholder-ar');
      el.setAttribute('placeholder', isAr ? ar || en : en);
    });

    var label = qs('.lang-label');
    if (label) label.textContent = isAr ? 'EN' : 'AR';

    if (typeof window.__heroMorphApplyI18n === 'function') window.__heroMorphApplyI18n();

    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
  }

  function applyTheme(isDark) {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    qsa('.theme-toggle').forEach(function (btn) {
      var moon = btn.querySelector('.theme-icon-moon');
      var sun = btn.querySelector('.theme-icon-sun');
      if (moon && sun) {
        moon.classList.toggle('hidden', !isDark);
        sun.classList.toggle('hidden', isDark);
      }
    });
  }

  function initHeroNoise() {
    var canvas = qs('#heroNoise');
    if (!canvas || reduced) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var frame = 0;
    var raf;

    function resize() {
      var section = canvas.closest('section');
      var w = section ? section.offsetWidth : window.innerWidth;
      var h = section ? section.offsetHeight : window.innerHeight;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr * 0.5);
      canvas.height = Math.floor(h * dpr * 0.5);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
    }

    function tick() {
      raf = requestAnimationFrame(tick);
      frame++;
      if (frame % 2 !== 0) return;
      var w = canvas.width;
      var h = canvas.height;
      if (!w || !h) return;
      var imageData = ctx.createImageData(w, h);
      var data = imageData.data;
      var t = frame * 0.02;
      for (var i = 0; i < data.length; i += 4) {
        var x = (i / 4) % w;
        var y = Math.floor(i / 4 / w);
        var n = Math.abs(Math.sin(x * 0.08 + t) * Math.cos(y * 0.08 + t)) * 45 + Math.random() * 25;
        data[i] = data[i + 1] = data[i + 2] = n;
        data[i + 3] = 22;
      }
      ctx.putImageData(imageData, 0, 0);
    }

    resize();
    tick();
    window.addEventListener('resize', resize, { passive: true });
  }

  /* ——— Hero: morphing copy + Three.js wireframe ——— */
  var currentHeroStep = 0;
  var hero3dState = {
    renderer: null,
    scene: null,
    camera: null,
    group: null,
    meshes: [],
    core: null,
    pl1: null,
    pl2: null,
    raf: 0,
    mouse: { x: 0, y: 0 },
    running: true,
  };
  var heroMorphCycle = null;
  var heroMorphPaused = false;

  var HERO_STEPS = [
    {
      signal: 'full_stack.v2',
      lineColor: 0xc084fc,
      coreColor: 0x67e8f9,
      en: {
        name: 'Developer',
        tag: 'Full Stack Developer & UI/UX Designer',
        desc: 'Passionate developer creating exceptional digital experiences with modern technologies.',
        bAt: 'React',
        bAs: 'Redux · Router · Hooks',
        bBt: 'Node.js',
        bBs: 'Express · Socket.io',
      },
      ar: {
        name: 'مطوّر',
        tag: 'مطور Full Stack & مصمم UI/UX',
        desc: 'مطور شغوف بإنشاء تجارب رقمية استثنائية باستخدام التقنيات الحديثة.',
        bAt: 'React',
        bAs: 'Redux · Router · Hooks',
        bBt: 'Node.js',
        bBs: 'Express · Socket.io',
      },
      iconA: 'fab fa-react text-dev-cyan',
      iconB: 'fab fa-node-js text-dev-green',
    },
    {
      signal: 'frontend.turbo',
      lineColor: 0x67e8f9,
      coreColor: 0xa78bfa,
      en: {
        name: 'UI_Architect',
        tag: 'React · TypeScript · Edge performance & motion',
        desc: 'Design systems, atomic components, and Lighthouse-grade UX — shipping interfaces that feel instant on every device.',
        bAt: 'React 19',
        bAs: 'RSC · Suspense · Compiler',
        bBt: 'TypeScript',
        bBs: 'Strict · Generics · Zod',
      },
      ar: {
        name: 'مهندس_واجهات',
        tag: 'React · TypeScript · أداء وحركة في الطرفية',
        desc: 'أنظمة تصميم، مكوّنات ذرية، وتجربة بمعايير Lighthouse — واجهات تبدو لحظية على كل جهاز.',
        bAt: 'React 19',
        bAs: 'RSC · Suspense · Compiler',
        bBt: 'TypeScript',
        bBs: 'Strict · Generics · Zod',
      },
      iconA: 'fab fa-react text-dev-cyan',
      iconB: 'fab fa-js text-dev-accent',
    },
    {
      signal: 'backend.mesh',
      lineColor: 0x86efac,
      coreColor: 0x22d3ee,
      en: {
        name: 'API_Core',
        tag: 'Node · Realtime pipelines · Distributed services',
        desc: 'Resilient APIs, queues, and observability-first delivery — from prototype sketch to production scale without drama.',
        bAt: 'Node.js',
        bAs: 'Streams · Workers · gRPC',
        bBt: 'Realtime',
        bBs: 'WebSockets · Redis · CQRS',
      },
      ar: {
        name: 'نواة_API',
        tag: 'Node · خطوط فورية · خدمات موزعة',
        desc: 'واجهات برمجية مرنة، طوابير، ومراقبة منذ اليوم الأول — من الفكرة إلى الإنتاج بثقة.',
        bAt: 'Node.js',
        bAs: 'Streams · Workers · gRPC',
        bBt: 'فوري',
        bBs: 'WebSockets · Redis · CQRS',
      },
      iconA: 'fab fa-node-js text-dev-green',
      iconB: 'fas fa-bolt text-dev-accent',
    },
  ];

  function heroLocalePack() {
    return getLang() === 'ar' ? 'ar' : 'en';
  }

  function applyHeroMorphDOM(stepIndex) {
    var step = HERO_STEPS[stepIndex];
    if (!step) return;
    var L = step[heroLocalePack()];
    var nameEl = qs('#heroName');
    var tagEl = qs('#heroTagline');
    var descEl = qs('#heroDescription');
    var sigEl = qs('#heroSignalLabel');
    var liveEl = qs('#heroLiveTag');
    if (nameEl) nameEl.textContent = L.name;
    if (tagEl) tagEl.textContent = L.tag;
    if (descEl) descEl.textContent = L.desc;
    if (sigEl) sigEl.textContent = 'signal · ' + step.signal;
    if (liveEl) liveEl.textContent = heroLocalePack() === 'ar' ? 'مباشر' : 'LIVE';

    var tA = qs('#heroBadgeATitle');
    var sA = qs('#heroBadgeASub');
    var tB = qs('#heroBadgeBTitle');
    var sB = qs('#heroBadgeBSub');
    var iA = qs('#heroBadgeAIcon');
    var iB = qs('#heroBadgeBIcon');
    if (tA) tA.textContent = L.bAt;
    if (sA) sA.textContent = L.bAs;
    if (tB) tB.textContent = L.bBt;
    if (sB) sB.textContent = L.bBs;
    if (iA) iA.className = step.iconA + ' text-3xl shrink-0';
    if (iB) iB.className = step.iconB + ' text-3xl shrink-0';

    updateHero3dColors(step.lineColor, step.coreColor);
    setActiveHeroMesh(stepIndex);
    updateHeroDotsUI(stepIndex);
  }

  function updateHeroDotsUI(active) {
    qsa('.hero-dot').forEach(function (d) {
      var on = parseInt(d.getAttribute('data-hero-step'), 10) === active;
      d.classList.toggle('is-active', on);
      d.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }

  function setActiveHeroMesh(index) {
    var meshes = hero3dState.meshes;
    if (!meshes.length) return;
    meshes.forEach(function (m, i) {
      if (!m) return;
      m.visible = i === index;
      if (m.material) m.material.opacity = i === index ? 1 : 0;
    });
  }

  function updateHero3dColors(lineHex, coreHex) {
    var meshes = hero3dState.meshes;
    meshes.forEach(function (m) {
      if (m && m.material) m.material.color.setHex(lineHex);
    });
    if (hero3dState.core && hero3dState.core.material) {
      hero3dState.core.material.color.setHex(coreHex);
    }
    if (hero3dState.pl1) hero3dState.pl1.color.setHex(lineHex);
    if (hero3dState.pl2) hero3dState.pl2.color.setHex(coreHex);
  }

  function wireMesh(geometry, color) {
    var edges = new THREE.EdgesGeometry(geometry);
    var mat = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 1,
    });
    var mesh = new THREE.LineSegments(edges, mat);
    mesh.userData.spin = 0.0015;
    return mesh;
  }

  function goHeroStep(nextIndex, instant) {
    var n = ((nextIndex % 3) + 3) % 3;
    if (n === currentHeroStep && !instant) return;
    currentHeroStep = n;

    if (instant || !window.gsap) {
      applyHeroMorphDOM(n);
      return;
    }

    var targets = qsa('.hero-morph-lock').filter(Boolean);
    gsap
      .timeline()
      .to(targets, {
        opacity: 0,
        duration: 0.3,
        stagger: 0.04,
        ease: 'power2.in',
      })
      .call(function () {
        applyHeroMorphDOM(n);
      })
      .fromTo(
        targets,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, stagger: 0.06, ease: 'power3.out' }
      );

    var g = hero3dState.group;
    if (g && window.gsap) {
      gsap.to(g.rotation, {
        y: g.rotation.y + Math.PI * 0.45,
        duration: 0.85,
        ease: 'power3.inOut',
      });
    }
  }

  function scheduleHeroMorphCycle() {
    if (reduced || heroMorphPaused) return;
    if (heroMorphCycle) heroMorphCycle.kill();
    heroMorphCycle = gsap.delayedCall(6.2, function () {
      if (heroMorphPaused) return;
      goHeroStep(currentHeroStep + 1);
      scheduleHeroMorphCycle();
    });
  }

  function initHeroMorph3D() {
    window.__heroMorphApplyI18n = function () {
      applyHeroMorphDOM(currentHeroStep);
    };

    var canvas = qs('#hero3d');
    if (!canvas || typeof THREE === 'undefined') return;

    var host = canvas.closest('.hero-3d-host') || canvas.parentElement;
    var w = 1;
    var h = 1;

    function measure() {
      w = host.clientWidth || 400;
      h = host.clientHeight || 400;
    }

    measure();

    var renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(48, w / h, 0.1, 200);
    camera.position.z = 26;

    var group = new THREE.Group();
    scene.add(group);

    var c0 = HERO_STEPS[0].lineColor;
    var geoTorus = new THREE.TorusGeometry(8.2, 2.35, 22, 64);
    var geoIco = new THREE.IcosahedronGeometry(10.5, 1);
    var geoOct = new THREE.OctahedronGeometry(9.8, 0);

    var m0 = wireMesh(geoTorus, c0);
    var m1 = wireMesh(geoIco, c0);
    var m2 = wireMesh(geoOct, c0);
    m1.userData.spin = 0.0022;
    m2.userData.spin = 0.0018;

    group.add(m0, m1, m2);
    hero3dState.meshes = [m0, m1, m2];

    var coreGeo = new THREE.SphereGeometry(2.35, 24, 24);
    var coreMat = new THREE.MeshBasicMaterial({
      color: HERO_STEPS[0].coreColor,
      transparent: true,
      opacity: 0.14,
    });
    var core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);
    hero3dState.core = core;

    var pl1 = new THREE.PointLight(HERO_STEPS[0].lineColor, 1.1, 80);
    pl1.position.set(12, 10, 14);
    scene.add(pl1);
    var pl2 = new THREE.PointLight(HERO_STEPS[0].coreColor, 0.85, 70);
    pl2.position.set(-14, -8, 12);
    scene.add(pl2);
    hero3dState.pl1 = pl1;
    hero3dState.pl2 = pl2;

    scene.add(new THREE.AmbientLight(0x404060, 0.35));

    hero3dState.renderer = renderer;
    hero3dState.scene = scene;
    hero3dState.camera = camera;
    hero3dState.group = group;

    setActiveHeroMesh(currentHeroStep);
    applyHeroMorphDOM(currentHeroStep);

    function onMove(ev) {
      var rect = canvas.getBoundingClientRect();
      var x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      var y = ((ev.clientY - rect.top) / rect.height) * 2 - 1;
      hero3dState.mouse.x = x;
      hero3dState.mouse.y = y;
    }

    if (!reduced) {
      canvas.addEventListener('pointermove', onMove, { passive: true });
      canvas.addEventListener(
        'pointerdown',
        function () {
          heroMorphPaused = true;
          if (heroMorphCycle) heroMorphCycle.kill();
        },
        { passive: true }
      );
      canvas.addEventListener(
        'pointerup',
        function () {
          heroMorphPaused = false;
          scheduleHeroMorphCycle();
        },
        { passive: true }
      );
    }

    function onResize() {
      measure();
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
    window.addEventListener('resize', onResize, { passive: true });

    function loop() {
      hero3dState.raf = requestAnimationFrame(loop);
      if (!hero3dState.running) return;
      var g = hero3dState.group;
      var mx = hero3dState.mouse.x;
      var my = hero3dState.mouse.y;
      if (g) {
        g.rotation.y += 0.0011 + mx * 0.0008;
        g.rotation.x += (my * 0.28 - g.rotation.x) * 0.05;
        hero3dState.meshes.forEach(function (m) {
          if (m && m.visible && m.userData.spin) m.rotation.y += m.userData.spin;
        });
        if (hero3dState.core) hero3dState.core.rotation.y += 0.003;
      }
      renderer.render(scene, camera);
    }
    if (reduced) {
      renderer.render(scene, camera);
    } else {
      loop();
    }

    document.addEventListener('visibilitychange', function () {
      hero3dState.running = !document.hidden;
    });

    qsa('.hero-dot').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-hero-step'), 10);
        goHeroStep(idx);
        heroMorphPaused = false;
        scheduleHeroMorphCycle();
      });
    });

    if (!reduced) scheduleHeroMorphCycle();
  }

  function initLoader(next) {
    var loader = qs('#loader');
    var bar = qs('#loaderBar');
    var inner = qs('.loader-minimal-inner');
    if (!loader) {
      if (typeof next === 'function') next();
      return;
    }

    if (reduced) {
      loader.style.display = 'none';
      loader.removeAttribute('aria-busy');
      if (typeof next === 'function') next();
      return;
    }

    if (!window.gsap) {
      loader.style.display = 'none';
      loader.removeAttribute('aria-busy');
      if (typeof next === 'function') next();
      return;
    }

    var done = function () {
      loader.removeAttribute('aria-busy');
      gsap.to(loader, {
        opacity: 0,
        duration: 0.32,
        ease: 'power1.out',
        onComplete: function () {
          loader.style.display = 'none';
          loader.style.opacity = '1';
          if (typeof next === 'function') next();
        },
      });
    };

    var tl = gsap.timeline({ onComplete: done });

    tl.fromTo(
      inner,
      { opacity: 0, y: 6 },
      { opacity: 1, y: 0, duration: 0.38, ease: 'power2.out' }
    ).fromTo(
      bar,
      { width: '0%' },
      {
        width: '100%',
        duration: 0.72,
        ease: 'power1.inOut',
      },
      0.08
    );
  }

  function initScrollAnimations() {
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    if (reduced) return;

    gsap.set('.hero-el', { opacity: 0, y: 48 });
    gsap.set('.hero-visual .hero-card-frame', { opacity: 0, scale: 0.92 });
    gsap.set('.scroll-hint', { opacity: 0, y: 12 });

    gsap.to('.hero-el', {
      y: 0,
      opacity: 1,
      stagger: 0.11,
      duration: 0.95,
      ease: 'power3.out',
      delay: 0.05,
    });

    gsap.to('.hero-visual .hero-card-frame', {
      scale: 1,
      opacity: 1,
      duration: 1,
      ease: 'power3.out',
      delay: 0.35,
    });

    gsap.to('.floating-badge', {
      y: -10,
      duration: 2.4,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      stagger: 0.35,
    });

    gsap.to('.scroll-hint', {
      opacity: 1,
      y: 0,
      duration: 0.8,
      delay: 1.1,
      ease: 'power2.out',
    });

    gsap.to('.hero-glow', {
      scale: 1.05,
      opacity: 0.85,
      duration: 3.5,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });

    qsa('.sec-head').forEach(function (head) {
      var parts = [head.querySelector('.sec-num'), head.querySelector('.sec-title')].filter(Boolean);
      gsap.from(parts, {
        scrollTrigger: { trigger: head, start: 'top 88%', toggleActions: 'play none none none' },
        y: 36,
        opacity: 0,
        stagger: 0.1,
        duration: 0.75,
        ease: 'power3.out',
      });
      var line = head.querySelector('.sec-line');
      if (line) {
        gsap.fromTo(
          line,
          { scaleX: 0, opacity: 0 },
          {
            scaleX: 1,
            opacity: 1,
            transformOrigin: document.documentElement.dir === 'rtl' ? 'right center' : 'left center',
            duration: 0.95,
            ease: 'power2.out',
            scrollTrigger: { trigger: head, start: 'top 88%', toggleActions: 'play none none none' },
          }
        );
      }
    });

    var aboutSec = qs('#about');
    if (aboutSec) {
      var rtlAbout = document.documentElement.dir === 'rtl';
      var aboutTx = rtlAbout ? -38 : 38;
      var eyebrow = aboutSec.querySelector('.about-eyebrow');
      var lead = aboutSec.querySelector('.about-lead-card');
      var chips = aboutSec.querySelectorAll('.about-chip');
      var term = aboutSec.querySelector('.about-code');
      var stats = aboutSec.querySelectorAll('.stat-card');
      var aboutTl = gsap.timeline({
        scrollTrigger: {
          trigger: aboutSec,
          start: 'top 80%',
          toggleActions: 'play none none none',
          once: true,
        },
      });
      if (eyebrow) {
        aboutTl.from(eyebrow, { opacity: 0, y: 12, duration: 0.55, ease: 'power2.out' }, 0);
      }
      if (lead) {
        aboutTl.from(lead, { opacity: 0, y: 40, duration: 0.9, ease: 'power3.out' }, 0.05);
      }
      if (term) {
        aboutTl.from(term, { opacity: 0, x: aboutTx, duration: 0.88, ease: 'power3.out' }, 0.1);
      }
      if (stats.length) {
        aboutTl.from(stats, { opacity: 0, y: 26, stagger: 0.11, duration: 0.68, ease: 'power3.out' }, 0.14);
      }
      if (chips.length) {
        aboutTl.from(chips, { opacity: 0, y: 12, stagger: 0.07, duration: 0.5, ease: 'power2.out' }, 0.22);
      }
    }

    qsa('.stat-num').forEach(function (numEl) {
      if (numEl.getAttribute('data-static')) return;
      var target = parseInt(numEl.getAttribute('data-count'), 10) || 0;
      ScrollTrigger.create({
        trigger: numEl.closest('.stat-card') || numEl,
        start: 'top 85%',
        once: true,
        onEnter: function () {
          var o = { v: 0 };
          gsap.to(o, {
            v: target,
            duration: 2.1,
            ease: 'power2.out',
            onUpdate: function () {
              numEl.textContent = Math.round(o.v) + '+';
            },
          });
        },
      });
    });

    var skillsSec = qs('#skills');
    if (skillsSec) {
      var skillsEyebrow = skillsSec.querySelector('.skills-eyebrow');
      var skillCols = skillsSec.querySelectorAll('.skill-col');
      var skillsTl = gsap.timeline({
        scrollTrigger: {
          trigger: skillsSec,
          start: 'top 78%',
          toggleActions: 'play none none none',
          once: true,
        },
      });
      if (skillsEyebrow) {
        skillsTl.from(skillsEyebrow, { opacity: 0, y: 12, duration: 0.55, ease: 'power2.out' }, 0);
      }
      if (skillCols.length) {
        skillsTl.from(
          skillCols,
          { opacity: 0, y: 48, stagger: 0.14, duration: 0.92, ease: 'power3.out' },
          0.06
        );
      }
      var skillItems = skillsSec.querySelectorAll('.skill-item');
      if (skillItems.length) {
        skillsTl.from(
          skillItems,
          { opacity: 0, x: function () { return document.documentElement.dir === 'rtl' ? 16 : -16; }, stagger: 0.035, duration: 0.45, ease: 'power2.out' },
          0.35
        );
      }
    }

    qsa('.skill-item').forEach(function (item) {
      var bar = item.querySelector('.skill-bar');
      var pct = item.querySelector('.skill-pct');
      var v = parseInt(item.getAttribute('data-percent'), 10) || 0;
      if (!bar) return;
      ScrollTrigger.create({
        trigger: item,
        start: 'top 90%',
        once: true,
        onEnter: function () {
          var p = { n: 0 };
          gsap.to(bar, { width: v + '%', duration: 1.35, ease: 'power2.out' });
          gsap.to(p, {
            n: v,
            duration: 1.35,
            ease: 'power2.out',
            onUpdate: function () {
              if (pct) pct.textContent = Math.round(p.n) + '%';
            },
          });
        },
      });
    });

    qsa('.timeline-item').forEach(function (item, i) {
      var box = item.querySelector('div.p-6');
      if (!box) return;
      gsap.from(box, {
        scrollTrigger: { trigger: item, start: 'top 88%', toggleActions: 'play none none none' },
        opacity: 0,
        x: function () {
          return document.documentElement.dir === 'rtl' ? -44 : 44;
        },
        duration: 0.85,
        delay: i * 0.06,
        ease: 'power3.out',
      });
    });

    qsa('.project-card').forEach(function (card, i) {
      gsap.from(card, {
        scrollTrigger: { trigger: card, start: 'top 88%', toggleActions: 'play none none none' },
        opacity: 0,
        y: 56,
        duration: 0.85,
        delay: i * 0.1,
        ease: 'power3.out',
      });

      card.style.transformStyle = 'preserve-3d';
      card.addEventListener(
        'mousemove',
        function (e) {
          var r = card.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width - 0.5;
          var py = (e.clientY - r.top) / r.height - 0.5;
          gsap.to(card, {
            rotationY: px * 10,
            rotationX: -py * 10,
            transformPerspective: 1000,
            duration: 0.45,
            ease: 'power2.out',
          });
        },
        { passive: true }
      );
      card.addEventListener('mouseleave', function () {
        gsap.to(card, { rotationY: 0, rotationX: 0, duration: 0.65, ease: 'power2.out' });
      });
    });

    gsap.from('.contact-card', {
      scrollTrigger: { trigger: '#contact', start: 'top 75%', toggleActions: 'play none none none' },
      opacity: 0,
      x: function () {
        return document.documentElement.dir === 'rtl' ? 28 : -28;
      },
      stagger: 0.12,
      duration: 0.75,
      ease: 'power3.out',
    });

    gsap.from('#contactForm', {
      scrollTrigger: { trigger: '#contactForm', start: 'top 82%', toggleActions: 'play none none none' },
      opacity: 0,
      y: 36,
      duration: 0.85,
      ease: 'power3.out',
    });

    gsap.from('footer .max-w-7xl > *', {
      scrollTrigger: { trigger: 'footer', start: 'top 95%', toggleActions: 'play none none none' },
      opacity: 0,
      y: 20,
      stagger: 0.1,
      duration: 0.65,
      ease: 'power2.out',
    });

    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: function (self) {
        var header = qs('#header');
        if (!header) return;
        header.classList.toggle('header-scrolled', self.scroll() > 20);
      },
    });

    ScrollTrigger.refresh();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        ScrollTrigger.refresh();
      });
    });
  }

  function initNavInteractions() {
    if (!window.gsap) return;
    qsa('.nav-link').forEach(function (link) {
      link.addEventListener('mouseenter', function () {
        if (reduced) return;
        gsap.to(link, { scale: 1.03, duration: 0.25, ease: 'power2.out' });
      });
      link.addEventListener('mouseleave', function () {
        gsap.to(link, { scale: 1, duration: 0.3, ease: 'power2.out' });
      });
    });

    qsa('.hero-cta, .social-orbit').forEach(function (el) {
      el.addEventListener('mouseenter', function () {
        if (reduced) return;
        gsap.to(el, { scale: 1.04, duration: 0.3, ease: 'back.out(1.6)' });
      });
      el.addEventListener('mouseleave', function () {
        gsap.to(el, { scale: 1, duration: 0.35, ease: 'power2.out' });
      });
    });

    qsa('.about-lead-card, .about-terminal-wrap, .skill-col').forEach(function (el) {
      el.addEventListener('mouseenter', function () {
        if (reduced) return;
        gsap.to(el, { y: -5, duration: 0.4, ease: 'power2.out' });
      });
      el.addEventListener('mouseleave', function () {
        gsap.to(el, { y: 0, duration: 0.45, ease: 'power2.out' });
      });
    });

    qsa('.about-chip').forEach(function (chip) {
      chip.addEventListener('mouseenter', function () {
        if (reduced) return;
        gsap.to(chip, { scale: 1.05, duration: 0.25, ease: 'back.out(2)' });
      });
      chip.addEventListener('mouseleave', function () {
        gsap.to(chip, { scale: 1, duration: 0.3, ease: 'power2.out' });
      });
    });

    qsa('.about-stat-tile').forEach(function (tile) {
      tile.addEventListener('mouseenter', function () {
        if (reduced) return;
        gsap.to(tile, { y: -4, scale: 1.02, duration: 0.3, ease: 'power2.out' });
      });
      tile.addEventListener('mouseleave', function () {
        gsap.to(tile, { y: 0, scale: 1, duration: 0.35, ease: 'power2.out' });
      });
    });
  }

  function initScrollSpy() {
    var sections = qsa('main section[id]');
    var links = qsa('.nav-link[href^="#"]');
    if (!sections.length || !links.length) return;

    function setActive(id) {
      links.forEach(function (l) {
        l.classList.toggle('is-active', l.getAttribute('data-section') === id);
      });
    }

    if (window.ScrollTrigger) {
      sections.forEach(function (sec) {
        var id = sec.id;
        ScrollTrigger.create({
          trigger: sec,
          start: 'top 45%',
          end: 'bottom 45%',
          onToggle: function (self) {
            if (self.isActive) setActive(id);
          },
        });
      });
    }
    setActive('home');
  }

  function initMobileMenu() {
    var toggle = qs('#menuToggle');
    var nav = qs('#navMenu');
    if (!toggle || !nav) return;

    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      document.body.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.classList.toggle('is-open', open);
    });

    qsa('.nav-link').forEach(function (a) {
      a.addEventListener('click', function () {
        if (window.innerWidth < 768) {
          nav.classList.remove('is-open');
          document.body.classList.remove('nav-open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
    });
  }

  function initForm() {
    var form = qs('#contactForm');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!window.gsap) return;
      var btn = form.querySelector('button[type="submit"]');
      gsap.timeline().to(btn, { scale: 0.96, duration: 0.12 }).to(btn, { scale: 1, duration: 0.35, ease: 'elastic.out(1, 0.5)' });
    });
  }

  function bindControls() {
    var langBtn = qs('#langToggle');
    if (langBtn) {
      langBtn.addEventListener('click', function () {
        applyLanguage(getLang() === 'en' ? 'ar' : 'en');
      });
    }

    var themeBtn = qs('#themeToggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', function () {
        applyTheme(!document.documentElement.classList.contains('dark'));
      });
    }
  }

  function boot() {
    applyTheme(getThemeDark());
    applyLanguage(getLang());
    bindControls();
    initMobileMenu();
    initForm();
    initHeroNoise();

    initLoader(function () {
      initScrollAnimations();
      initNavInteractions();
      initScrollSpy();
      initHeroMorph3D();
      if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.addEventListener('load', function () {
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
  });
})();