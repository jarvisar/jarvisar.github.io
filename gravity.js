(() => {
  'use strict';

  const konami = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
  const step = 1000 / 60;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let keys = [];
  let lastKey = 0;
  let taps = 0;
  let firstTap = 0;
  let lastTap = 0;
  let library;
  let loading = false;
  let playground;

  const announcement = document.createElement('div');
  announcement.className = 'gravity-announcement';
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  document.body.append(announcement);

  function announce(message) {
    announcement.textContent = message;
  }

  // Load the locally bundled engine only when someone discovers the secret.
  function loadPhysics() {
    if (window.Matter) return Promise.resolve(window.Matter);
    if (!library) {
      library = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/vendor/matter-0.20.0.min.js';
        script.onload = () => window.Matter ? resolve(window.Matter) : reject(new Error('Physics engine unavailable'));
        script.onerror = () => {
          script.remove();
          reject(new Error('Physics engine could not load'));
        };
        document.head.append(script);
      }).catch(error => {
        library = undefined;
        throw error;
      });
    }
    return library;
  }

  async function requestOrientationAccess() {
    const orientationEvent = window.DeviceOrientationEvent;
    if (!window.isSecureContext || !orientationEvent) return false;
    try {
      if (typeof orientationEvent.requestPermission === 'function') {
        return await orientationEvent.requestPermission() === 'granted';
      }
      return true;
    } catch {
      // Sensor access is optional; keep normal gravity if permission is blocked.
      return false;
    }
  }

  async function toggleGravity() {
    if (playground) {
      playground.restore();
      return;
    }
    if (loading) return;
    loading = true;
    announcement.classList.remove('gravity-error');
    try {
      // Request permission during the unlocking gesture, before loading physics.
      const orientationAccess = requestOrientationAccess();
      const [matter, orientationAllowed] = await Promise.all([loadPhysics(), orientationAccess]);
      playground = createPlayground(matter, orientationAllowed);
      playground.start();
      announce('Gravity unlocked. Drag and throw the pieces. Tap a link to open it. Press Escape or Restore to return to the site.');
    } catch (error) {
      playground?.restore();
      announce('Gravity could not load. Please try the code or six taps again.');
      announcement.classList.add('gravity-error');
      console.error('Gravity playground:', error);
    } finally {
      loading = false;
    }
  }

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      keys = [];
      playground?.restore();
      return;
    }
    const target = event.target;
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey ||
        target.isContentEditable || target.closest('input, textarea, select')) return;
    const now = performance.now();
    if (now - lastKey > 4000) keys = [];
    lastKey = now;
    keys.push(event.key.toLowerCase());
    // Keep the longest suffix that is a prefix, including overlapping attempts.
    while (keys.length && !keys.every((key, index) => key === konami[index])) keys.shift();
    if (keys.length > 1 && event.key.startsWith('Arrow')) event.preventDefault();
    if (keys.length === konami.length) {
      keys = [];
      void toggleGravity();
    }
  });

  document.addEventListener('click', event => {
    if (!event.target.closest('.brand-mark')) return;
    const now = performance.now();
    if (now - firstTap > 4000 || now - lastTap > 1200) taps = 0;
    if (!taps) firstTap = now;
    lastTap = now;
    if (++taps === 6) {
      taps = 0;
      void toggleGravity();
    }
  });

  function createPlayground({ Bodies, Body, Composite, Constraint, Engine, Sleeping }, orientationAllowed) {
    const abort = new AbortController();
    const eventOptions = { signal: abort.signal };
    const scroll = { x: window.scrollX, y: window.scrollY };
    const focus = document.activeElement;
    const originals = [...document.querySelectorAll('body > header, body > main, body > .site-note')]
      .map(element => ({ element, inert: element.inert }));
    const sources = [...document.querySelectorAll('.brand, .header-btn, main h1, main h2, .row img, .row .text, .row .host, .site-note p')]
      .map(element => ({ element, rect: element.getBoundingClientRect() }))
      .filter(({ rect }) => rect.width > 0 && rect.height > 0);
    const engine = Engine.create({ enableSleeping: true, positionIterations: 8, velocityIterations: 8 });
    const stage = document.createElement('div');
    stage.className = 'gravity-stage';
    stage.setAttribute('role', 'dialog');
    stage.setAttribute('aria-modal', 'true');
    stage.setAttribute('aria-labelledby', 'gravity-title');
    stage.setAttribute('aria-describedby', 'gravity-hint');
    stage.innerHTML = `
      <div class="gravity-toolbar">
        <div class="gravity-caption">
          <h2 id="gravity-title">Gravity unlocked</h2>
          <p>Turns out these links have mass.</p>
        </div>
        <button type="button" data-action="shake">Shake it up</button>
        <button type="button" data-action="float" aria-pressed="false">Zero G</button>
        <button type="button" data-action="restore" class="gravity-restore">Restore</button>
      </div>
      <p class="gravity-hint" id="gravity-hint">Drag &amp; fling · Tap links to visit · Esc to restore</p>`;
    const restoreButton = stage.querySelector('[data-action="restore"]');
    const floatButton = stage.querySelector('[data-action="float"]');
    const hint = stage.querySelector('#gravity-hint');
    const pieces = [];
    const pieceByElement = new Map();
    let walls = [];
    let view;
    let grab;
    let zeroG = false;
    let tilt;
    let sceneScale = 1;
    let roof = -10000;
    let frameId = 0;
    let previousTime = 0;
    let accumulator = 0;
    let suppressClickUntil = 0;
    let restored = false;

    function viewport() {
      const { width, height } = stage.getBoundingClientRect();
      const hint = stage.querySelector('.gravity-hint').getBoundingClientRect();
      const floor = hint.top - 16;
      stage.style.setProperty('--gravity-floor-gap', `${height - floor}px`);
      return { width, height, floor };
    }

    function scaleFor(width, height) {
      return Math.max(0.1, Math.min(sceneScale, view.width < 600 ? 0.76 : 1,
        (view.width - 24) / width, (view.floor - 100) / height));
    }

    function createPiece({ element, rect }, index) {
      const node = document.createElement('div');
      node.className = 'gravity-piece';
      const content = document.createElement('div');
      content.className = 'gravity-piece-content';
      const clone = element.cloneNode(true);
      clone.removeAttribute('id');
      clone.querySelectorAll('[id]').forEach(child => child.removeAttribute('id'));
      const link = element.closest('a.row');
      let width = rect.width;
      if (link) {
        const anchor = document.createElement('a');
        anchor.className = 'gravity-link';
        anchor.href = link.href;
        anchor.setAttribute('aria-label', link.querySelector('.name').textContent);
        anchor.append(clone);
        content.append(anchor);
        if (element.matches('img')) {
          node.classList.add('gravity-project-icon');
        } else if (element.matches('.text')) {
          node.classList.add('gravity-project-text');
          width = Math.min(width + 24, 340);
        } else {
          node.classList.add('gravity-project-host');
          width += 26;
        }
      } else {
        content.append(clone);
        if (element.matches('.brand')) {
          node.classList.add('gravity-brand');
          width += 20;
        } else if (element.matches('h2')) {
          node.classList.add('gravity-heading');
          width = Math.min(width, 320);
        } else if (element.matches('h1')) {
          const range = document.createRange();
          range.selectNodeContents(element);
          width = range.getBoundingClientRect().width + 4;
        } else if (element.matches('p')) {
          node.classList.add('gravity-footer');
          width = Math.min(width, 420);
        }
      }
      content.style.width = `${width}px`;
      content.querySelectorAll('img').forEach(image => { image.draggable = false; });
      node.append(content);
      stage.append(node);
      const height = content.offsetHeight;
      const scale = scaleFor(width, height);
      content.style.transform = `scale(${scale})`;
      node.style.width = `${width * scale}px`;
      node.style.height = `${height * scale}px`;
      // Content below the fold rains in from above, so every project joins in.
      const y = rect.top > view.floor ? -80 - (rect.top - view.floor) : rect.top + rect.height / 2;
      const x = Math.max(width * scale / 2 + 2,
        Math.min(view.width - width * scale / 2 - 2, rect.left + rect.width / 2));
      const body = Bodies.rectangle(x, y, width * scale, height * scale, {
        restitution: reducedMotion.matches ? 0.12 : 0.42,
        friction: 0.55,
        frictionStatic: 0.8,
        frictionAir: 0.012,
        density: 0.001,
        sleepThreshold: 90,
        label: `Site fragment ${index}`,
      });
      if (!reducedMotion.matches) {
        Body.setVelocity(body, { x: (Math.random() - 0.5) * 12, y: 0 });
        Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.08);
      }
      const piece = { node, content, body, width, height, scale, lastTransform: '' };
      pieces.push(piece);
      pieceByElement.set(node, piece);
      Composite.add(engine.world, body);
    }

    function buildWalls() {
      walls.forEach(wall => Composite.remove(engine.world, wall));
      walls = [
        Bodies.rectangle(view.width / 2, view.floor + 100, view.width + 400, 200, { isStatic: true }),
        Bodies.rectangle(-100, (roof + view.floor) / 2, 200, view.floor - roof + 400, { isStatic: true }),
        Bodies.rectangle(view.width + 100, (roof + view.floor) / 2, 200, view.floor - roof + 400, { isStatic: true }),
        Bodies.rectangle(view.width / 2, roof - 100, view.width + 400, 200, { isStatic: true }),
      ];
      Composite.add(engine.world, walls);
    }

    function render() {
      pieces.forEach(piece => {
        const { body, width, height, scale } = piece;
        const transform = `translate3d(${(body.position.x - width * scale / 2).toFixed(2)}px, ${(body.position.y - height * scale / 2).toFixed(2)}px, 0) rotate(${body.angle.toFixed(4)}rad)`;
        if (transform !== piece.lastTransform) {
          piece.node.style.transform = transform;
          piece.lastTransform = transform;
        }
      });
    }

    function frame(now) {
      frameId = 0;
      accumulator += Math.min(now - previousTime, 50);
      previousTime = now;
      while (accumulator >= step) {
        if (grab) Sleeping.set(grab.piece.body, false);
        // Cap very fast throws to keep thin pieces from tunnelling through walls.
        pieces.forEach(({ body }) => {
          if (body.speed > 24) Body.setVelocity(body, { x: body.velocity.x * 24 / body.speed, y: body.velocity.y * 24 / body.speed });
          if (Math.abs(body.angularVelocity) > 0.2) Body.setAngularVelocity(body, Math.sign(body.angularVelocity) * 0.2);
        });
        Engine.update(engine, step);
        accumulator -= step;
      }
      render();
      if (grab || pieces.some(({ body }) => !body.isSleeping)) frameId = requestAnimationFrame(frame);
    }

    function wake() {
      if (frameId || restored || document.hidden) return;
      previousTime = performance.now();
      accumulator = 0;
      frameId = requestAnimationFrame(frame);
    }

    function contain(piece) {
      const { body } = piece;
      let halfWidth = (body.bounds.max.x - body.bounds.min.x) / 2;
      let halfHeight = (body.bounds.max.y - body.bounds.min.y) / 2;
      if (halfWidth * 2 > view.width - 4 || halfHeight * 2 > view.floor - 4) {
        Body.setAngle(body, 0);
        halfWidth = piece.width * piece.scale / 2;
        halfHeight = piece.height * piece.scale / 2;
      }
      Body.setPosition(body, {
        x: Math.max(halfWidth + 2, Math.min(view.width - halfWidth - 2, body.position.x)),
        y: Math.max(halfHeight + 2, Math.min(view.floor - halfHeight - 2, body.position.y)),
      });
      Sleeping.set(body, false);
    }

    function shake() {
      pieces.forEach(({ body }) => {
        Sleeping.set(body, false);
        Body.setVelocity(body, {
          x: (Math.random() - 0.5) * (reducedMotion.matches ? 6 : 18),
          y: -(reducedMotion.matches ? 4 : 8) - Math.random() * (reducedMotion.matches ? 3 : 10),
        });
        Body.setAngularVelocity(body, (Math.random() - 0.5) * (reducedMotion.matches ? 0.03 : 0.18));
      });
      wake();
    }

    function updateGravity(force = false) {
      if (restored) return;
      let x = 0;
      let y = 1;
      if (tilt) {
        // Project physical gravity onto the screen, then account for rotation.
        const deviceX = Math.cos(tilt.beta) * Math.sin(tilt.gamma);
        const deviceY = Math.sin(tilt.beta);
        const angle = (window.screen.orientation?.angle ?? window.orientation ?? 0) * Math.PI / 180;
        x = deviceX * Math.cos(angle) + deviceY * Math.sin(angle);
        y = deviceY * Math.cos(angle) - deviceX * Math.sin(angle);
      }
      if (zeroG) x = y = 0;
      // Ignore sensor jitter so resting pieces can still sleep.
      if (!force && Math.hypot(x - engine.gravity.x, y - engine.gravity.y) < 0.02) return;
      engine.gravity.x = x;
      engine.gravity.y = y;
      pieces.forEach(({ body }) => Sleeping.set(body, false));
      wake();
    }

    function orient(event) {
      if (document.hidden || !Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return;
      const firstReading = !tilt;
      tilt = { beta: event.beta * Math.PI / 180, gamma: event.gamma * Math.PI / 180 };
      if (firstReading) {
        hint.textContent = 'Tilt your device · Drag & fling · Tap links to visit · Esc to restore';
        // Close the ceiling and bring incoming pieces inside before gravity reverses.
        resize();
        if (!zeroG) announce('Device tilt enabled. Tilt your device to steer gravity.');
      }
      updateGravity(firstReading);
    }

    function toggleFloat() {
      zeroG = !zeroG;
      updateGravity(true);
      // In zero G all pieces need to be inside the room, including incoming ones.
      roof = zeroG ? 0 : roof;
      buildWalls();
      pieces.forEach(piece => {
        contain(piece);
        piece.body.frictionAir = zeroG ? 0.002 : 0.012;
        if (zeroG) {
          Body.setVelocity(piece.body, { x: (Math.random() - 0.5) * 5, y: -2 - Math.random() * 3 });
        }
      });
      floatButton.setAttribute('aria-pressed', String(zeroG));
      stage.querySelector('#gravity-title').textContent = zeroG ? 'Gravity optional' : 'Gravity unlocked';
      announce(zeroG ? 'Zero gravity. The pieces are floating.' : 'Gravity restored. Watch your head.');
      wake();
    }

    function release(event, cancel = false) {
      if (!grab || (event && event.pointerId !== grab.id)) return;
      const current = grab;
      grab = undefined;
      Composite.remove(engine.world, current.constraint);
      current.piece.node.classList.remove('is-grabbed');
      if (current.moved) {
        suppressClickUntil = performance.now() + 500;
        contain(current.piece);
        if (!cancel && event) {
          const end = { x: event.clientX, y: event.clientY, time: performance.now() };
          const start = current.samples.find(sample => end.time - sample.time < 100) || end;
          const elapsed = Math.max(16, end.time - start.time);
          Body.setVelocity(current.piece.body, {
            x: Math.max(-22, Math.min(22, (end.x - start.x) * step / elapsed)),
            y: Math.max(-22, Math.min(22, (end.y - start.y) * step / elapsed)),
          });
        }
      }
      if (stage.hasPointerCapture(current.id)) stage.releasePointerCapture(current.id);
      wake();
    }

    function resize() {
      release(undefined, true);
      view = viewport();
      fitScene();
      pieces.forEach(piece => {
        const scale = scaleFor(piece.width, piece.height);
        Body.scale(piece.body, scale / piece.scale, scale / piece.scale);
        piece.scale = scale;
        piece.content.style.transform = `scale(${scale})`;
        piece.node.style.width = `${piece.width * scale}px`;
        piece.node.style.height = `${piece.height * scale}px`;
        contain(piece);
      });
      roof = 0;
      buildWalls();
      wake();
    }

    function fitScene() {
      const area = pieces.reduce((total, piece) => total + piece.width * piece.height, 0);
      // Leave enough empty space to tumble even on a small phone or short window.
      sceneScale = Math.min(1, Math.sqrt(view.width * view.floor * 0.35 / area));
    }

    function restore() {
      if (restored) return;
      restored = true;
      abort.abort();
      cancelAnimationFrame(frameId);
      Composite.clear(engine.world, false);
      Engine.clear(engine);
      document.body.append(announcement);
      stage.remove();
      document.documentElement.classList.remove('gravity-active');
      originals.forEach(({ element, inert }) => { element.inert = inert; });
      window.scrollTo(scroll.x, scroll.y);
      if (focus?.isConnected) focus.focus({ preventScroll: true });
      playground = undefined;
      taps = 0;
      keys = [];
      announce('Site restored. Everything is back where it belongs.');
    }

    function start() {
      document.body.append(stage);
      stage.append(announcement);
      view = viewport();
      sources.forEach(createPiece);
      fitScene();
      pieces.forEach(piece => {
        const scale = scaleFor(piece.width, piece.height);
        Body.scale(piece.body, scale / piece.scale, scale / piece.scale);
        piece.scale = scale;
        piece.content.style.transform = `scale(${scale})`;
        piece.node.style.width = `${piece.width * scale}px`;
        piece.node.style.height = `${piece.height * scale}px`;
      });
      buildWalls();
      originals.forEach(({ element }) => { element.inert = true; });
      document.documentElement.classList.add('gravity-active');
      restoreButton.focus({ preventScroll: true });
      render();

      stage.addEventListener('pointerdown', event => {
        if (event.button !== 0 || grab) return;
        const piece = pieceByElement.get(event.target.closest('.gravity-piece'));
        if (!piece) return;
        Sleeping.set(piece.body, false);
        const point = { x: event.clientX, y: event.clientY };
        const constraint = Constraint.create({
          pointA: point,
          bodyB: piece.body,
          pointB: { x: point.x - piece.body.position.x, y: point.y - piece.body.position.y },
          length: 0,
          stiffness: 0.2,
          damping: 0.12,
        });
        Composite.add(engine.world, constraint);
        grab = { id: event.pointerId, piece, constraint, start: point, moved: false,
          samples: [{ ...point, time: performance.now() }] };
        piece.node.classList.add('is-grabbed');
        wake();
      }, eventOptions);
      stage.addEventListener('pointermove', event => {
        if (!grab || event.pointerId !== grab.id) return;
        grab.constraint.pointA = { x: event.clientX, y: event.clientY };
        if (!grab.moved && Math.hypot(event.clientX - grab.start.x, event.clientY - grab.start.y) > 6) {
          grab.moved = true;
          stage.setPointerCapture(event.pointerId);
        }
        const now = performance.now();
        grab.samples.push({ x: event.clientX, y: event.clientY, time: now });
        grab.samples = grab.samples.filter(sample => now - sample.time <= 120);
      }, eventOptions);
      window.addEventListener('pointerup', event => release(event), eventOptions);
      window.addEventListener('pointercancel', event => release(event, true), eventOptions);
      window.addEventListener('blur', () => release(undefined, true), eventOptions);
      stage.addEventListener('lostpointercapture', event => {
        // Touch starts with implicit capture on the link; transferring it to the
        // stage must not end the drag when that link loses its capture.
        if (event.target === stage) release(event, true);
      }, eventOptions);
      stage.addEventListener('dragstart', event => event.preventDefault(), eventOptions);
      stage.addEventListener('click', event => {
        if (performance.now() < suppressClickUntil &&
            (event.target === stage || event.target.closest('.gravity-piece'))) {
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }
        const action = event.target.closest('[data-action]')?.dataset.action;
        if (action === 'restore') restore();
        else if (action === 'shake') shake();
        else if (action === 'float') toggleFloat();
      }, { ...eventOptions, capture: true });
      stage.addEventListener('keydown', event => {
        if (event.key !== 'Tab') return;
        const controls = [...stage.querySelectorAll('a[href], button')];
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }, eventOptions);
      window.addEventListener('resize', resize, eventOptions);
      window.visualViewport?.addEventListener('resize', resize, eventOptions);
      if (orientationAllowed) {
        window.addEventListener('deviceorientation', orient, eventOptions);
        if (window.screen.orientation) {
          window.screen.orientation.addEventListener('change', () => updateGravity(), eventOptions);
        } else {
          window.addEventListener('orientationchange', () => updateGravity(), eventOptions);
        }
      }
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          release(undefined, true);
          cancelAnimationFrame(frameId);
          frameId = 0;
        } else wake();
      }, eventOptions);
      wake();
    }

    return { start, restore };
  }
})();
