(() => {
  'use strict';

  const konami = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
  const step = 1000 / 60;
  const maxSpeed = 30;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarsePointer = window.matchMedia('(pointer: coarse)');
  const directions = {
    arrowup: { x: 0, y: -1, name: 'up' },
    arrowdown: { x: 0, y: 1, name: 'down' },
    arrowleft: { x: -1, y: 0, name: 'left' },
    arrowright: { x: 1, y: 0, name: 'right' },
  };
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

  async function requestPermission(sensor) {
    if (!window.isSecureContext || !sensor) return false;
    try {
      if (typeof sensor.requestPermission === 'function') {
        return await sensor.requestPermission() === 'granted';
      }
      return true;
    } catch {
      // Sensor access is optional; keep normal gravity if permission is blocked.
      return false;
    }
  }

  async function requestSensorAccess() {
    // Safari uses one permission for both sensors, so motion is only asked
    // for once orientation is granted and does not prompt a second time.
    const orientation = await requestPermission(window.DeviceOrientationEvent);
    const motion = orientation && await requestPermission(window.DeviceMotionEvent);
    return { orientation, motion };
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
      const sensorAccess = requestSensorAccess();
      const [matter, sensors] = await Promise.all([loadPhysics(), sensorAccess]);
      playground = createPlayground(matter, sensors);
      playground.start();
      announce('Gravity unlocked. Drag and throw the pieces, or use the arrow keys to change the direction of gravity. Tap a link to open it. Press Escape or Restore to return to the site.');
    } catch (error) {
      playground?.restore(true);
      announce('Gravity could not load. Please try the code or two taps again.');
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
    if (event.ctrlKey || event.metaKey || event.altKey ||
        target.isContentEditable || target.closest('input, textarea, select')) return;
    const key = event.key.toLowerCase();
    if (playground && key === ' ') {
      // Takes priority over the focused button, which starts as Restore.
      event.preventDefault();
      if (!event.repeat) playground.toggleFloat();
      return;
    }
    if (playground && directions[key]) {
      event.preventDefault();
      playground.steer(directions[key]);
    }
    if (event.repeat) return;
    const now = performance.now();
    if (now - lastKey > 4000) keys = [];
    lastKey = now;
    keys.push(key);
    // Keep the longest suffix that is a prefix, including overlapping attempts.
    while (keys.length && !keys.every((entry, index) => entry === konami[index])) keys.shift();
    if (keys.length > 1 && event.key.startsWith('Arrow')) event.preventDefault();
    if (keys.length === konami.length) {
      keys = [];
      void toggleGravity();
    }
  });

  // Some browsers activate a focused button on keyup, so cancel that too.
  document.addEventListener('keyup', event => {
    if (playground && event.key === ' ') event.preventDefault();
  });

  document.addEventListener('click', event => {
    if (!event.target.closest('.brand-mark')) return;
    const now = performance.now();
    if (now - firstTap > 4000 || now - lastTap > 1200) taps = 0;
    if (!taps) firstTap = now;
    lastTap = now;
    if (++taps === 2) {
      taps = 0;
      void toggleGravity();
    }
  });

  // The visible content edge, so a clone with extra padding can line up with its original.
  function contentBox(element) {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const left = rect.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
    const right = rect.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight);
    const top = rect.top + parseFloat(style.borderTopWidth) + parseFloat(style.paddingTop);
    return { left, top, center: (left + right) / 2, rect };
  }

  function pieceKind(element) {
    if (element.closest('a.row')) {
      if (element.matches('img')) return 'project-icon';
      return element.matches('.text') ? 'project-text' : 'project-host';
    }
    if (element.matches('.brand')) return 'brand';
    if (element.matches('.header-btn')) return 'button';
    if (element.matches('h1')) return 'title';
    if (element.matches('h2')) return 'heading';
    return 'footer';
  }

  // Width of the piece's content; `home` is the width it returns to on restore.
  function pieceWidth(kind, element, home = false) {
    const { width } = element.getBoundingClientRect();
    switch (kind) {
      case 'project-text': return width + 24;
      case 'project-host': return width + 26;
      case 'brand': return width + 20;
      case 'heading': return home ? width : Math.min(width, Math.max(320, window.innerWidth * 0.4));
      case 'footer': return Math.min(width, 420);
      case 'title': {
        const range = document.createRange();
        range.selectNodeContents(element);
        return range.getBoundingClientRect().width + 4;
      }
      default: return width;
    }
  }

  function createPlayground({ Bodies, Body, Composite, Constraint, Engine, Events, Query, Sleeping }, sensors) {
    const abort = new AbortController();
    const eventOptions = { signal: abort.signal };
    const root = document.documentElement;
    const scroll = { x: window.scrollX, y: window.scrollY };
    const focus = document.activeElement;
    const gutter = root.style.scrollbarGutter;
    const originals = [...document.querySelectorAll('body > header, body > main, body > .site-note')]
      .map(element => ({ element, inert: element.inert }));
    const sources = [...document.querySelectorAll('.brand, .header-btn, main h1, main h2, .row img, .row .text, .row .host, .site-note p')]
      .filter(element => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      })
      .map(element => ({ element, box: contentBox(element) }));
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
        </div>
        <button type="button" data-action="shake">Shake it up</button>
        <button type="button" data-action="float" aria-pressed="false">Zero G</button>
        <button type="button" data-action="restore" class="gravity-restore">Restore</button>
      </div>
      <p class="gravity-hint" id="gravity-hint"></p>`;
    const restoreButton = stage.querySelector('[data-action="restore"]');
    const floatButton = stage.querySelector('[data-action="float"]');
    const hint = stage.querySelector('#gravity-hint');
    // Empty copies of the header bar and the card, which fade as the page collapses.
    const ghosts = originals.filter(({ element }) => element.matches('header, main')).map(({ element }) => {
      const ghost = element.cloneNode(false);
      ghost.removeAttribute('id');
      ghost.classList.add('gravity-ghost');
      ghost.setAttribute('aria-hidden', 'true');
      return { ghost, element };
    });
    const pieces = [];
    const pieceByElement = new Map();
    const grabs = new Map();
    const canBuzz = coarsePointer.matches && typeof navigator.vibrate === 'function';
    let walls = [];
    let view;
    let manual = directions.arrowdown;
    let zeroG = false;
    let tilt;
    let tiltEnabled = sensors.orientation;
    let sceneScale = 1;
    let roof = -10000;
    let startTime = 0;
    let entering = true;
    let frameId = 0;
    let previousTime = 0;
    let accumulator = 0;
    let suppressClickUntil = 0;
    let shakeReadyAt = 0;
    let buzzReadyAt = 0;
    let finishTimer = 0;
    let restoring = false;
    let finished = false;

    function viewport() {
      const { width, height } = stage.getBoundingClientRect();
      const floor = hint.getBoundingClientRect().top - 16;
      stage.style.setProperty('--gravity-floor-gap', `${height - floor}px`);
      return { width, height, floor };
    }

    function updateHint() {
      const touch = coarsePointer.matches;
      const parts = ['Drag & fling', touch ? 'Tap empty space to blast' : 'Click empty space to blast'];
      if (tilt) parts.push('Tilt to steer');
      else if (!touch) parts.push('Arrow keys steer gravity');
      if (!touch) parts.push('Space for Zero G');
      if (sensors.motion && touch) parts.push('Shake to mix it up');
      if (!touch) parts.push('Esc to restore');
      hint.textContent = parts.join(' · ');
    }

    function scaleFor(width, height) {
      return Math.max(0.1, Math.min(sceneScale, view.width < 600 ? 0.76 : 1,
        (view.width - 24) / width, (view.floor - 100) / height));
    }

    function fitScene() {
      const area = pieces.reduce((total, piece) => total + piece.width * piece.height, 0);
      // Leave enough empty space to tumble even on a small phone or short window.
      sceneScale = Math.min(1, Math.sqrt(view.width * view.floor * 0.35 / area));
    }

    function homeOf(piece, box) {
      const left = piece.align === 'center' ? box.center - piece.offset.center : box.left - piece.offset.x;
      return { left, top: box.top - piece.offset.y };
    }

    function createPiece({ element, box }, index) {
      const kind = pieceKind(element);
      const node = document.createElement('div');
      node.className = `gravity-piece gravity-${kind}`;
      const content = document.createElement('div');
      content.className = 'gravity-piece-content';
      const clone = element.cloneNode(true);
      clone.removeAttribute('id');
      clone.querySelectorAll('[id]').forEach(child => child.removeAttribute('id'));
      const link = element.closest('a.row');
      if (link) {
        const anchor = document.createElement('a');
        anchor.className = 'gravity-link';
        anchor.href = link.href;
        anchor.setAttribute('aria-label', link.querySelector('.name').textContent);
        anchor.append(clone);
        content.append(anchor);
      } else {
        content.append(clone);
      }
      const width = pieceWidth(kind, element);
      content.style.width = `${width}px`;
      content.querySelectorAll('img').forEach(image => { image.draggable = false; });
      node.append(content);
      stage.append(node);
      const height = content.offsetHeight;
      const nodeRect = node.getBoundingClientRect();
      const inner = contentBox(clone);
      const piece = {
        node, content, element, kind, width, height,
        align: kind === 'footer' ? 'center' : 'left',
        offset: { x: inner.left - nodeRect.left, y: inner.top - nodeRect.top, center: inner.center - nodeRect.left },
        scale: 1,
        targetScale: 1,
        drawnScale: 0,
        released: false,
        rain: box.rect.top + box.rect.height / 2 > view.floor,
        releaseAt: 0,
        phase: Math.random() * Math.PI * 2,
        lastTransform: '',
      };
      // Start exactly where the original sits, so the page looks intact until it breaks.
      const home = homeOf(piece, box);
      piece.body = Bodies.rectangle(home.left + width / 2,
        Math.min(home.top + height / 2, view.floor - height / 2 - 2), width, height, {
          restitution: reducedMotion.matches ? 0.12 : 0.42,
          friction: 0.55,
          frictionStatic: 0.8,
          frictionAir: 0.012,
          density: 0.001,
          sleepThreshold: 90,
          label: `Site fragment ${index}`,
        });
      piece.spawnX = home.left + width / 2;
      if (piece.rain) {
        // Content below the fold rains in from above once the rest has fallen.
        piece.releaseAt = (reducedMotion.matches ? 0 : 760) + (box.rect.top - view.floor) * 0.4;
      } else if (!reducedMotion.matches) {
        // Lower pieces drop first so nothing falls through a piece still in place.
        const depth = Math.max(0, Math.min(1, box.rect.bottom / view.floor));
        piece.releaseAt = 220 + (1 - depth) * 480 + Math.random() * 60;
      }
      pieces.push(piece);
      pieceByElement.set(node, piece);
    }

    function setScale(piece, scale) {
      Body.scale(piece.body, scale / piece.scale, scale / piece.scale);
      piece.scale = scale;
    }

    function halfSize({ body }) {
      return {
        x: (body.bounds.max.x - body.bounds.min.x) / 2,
        y: (body.bounds.max.y - body.bounds.min.y) / 2,
      };
    }

    function releasePiece(piece) {
      if (piece.released) return;
      piece.released = true;
      if (!reducedMotion.matches) {
        Body.setVelocity(piece.body, { x: (Math.random() - 0.5) * 4, y: piece.rain ? 4 : 0 });
        Body.setAngularVelocity(piece.body, (Math.random() - 0.5) * 0.05);
      }
      Composite.add(engine.world, piece.body);
    }

    function placeRain(piece, force = false) {
      const half = halfSize(piece);
      piece.spawnX = Math.max(half.x + 2, Math.min(view.width - half.x - 2, piece.spawnX));
      Body.setPosition(piece.body, { x: piece.spawnX, y: -half.y - 4 });
      if (force) return true;
      const others = pieces.filter(other => other.released).map(other => other.body);
      if (!Query.region(others, piece.body.bounds).length) return true;
      // Try another spot next time rather than dropping onto a piece still near the top.
      piece.spawnX = half.x + 2 + Math.random() * Math.max(0, view.width - half.x * 2 - 4);
      return false;
    }

    function advanceEntrance(now) {
      const elapsed = now - startTime;
      let waiting = false;
      pieces.forEach(piece => {
        if (piece.released) {
          if (piece.rain && piece.body.bounds.min.y < 0) waiting = true;
          return;
        }
        waiting = true;
        if (elapsed < piece.releaseAt) return;
        if (piece.rain && !placeRain(piece, elapsed - piece.releaseAt > 2000)) return;
        releasePiece(piece);
      });
      if (!waiting || elapsed > 6000) endEntrance();
    }

    function endEntrance() {
      if (!entering) return;
      entering = false;
      pieces.forEach(piece => {
        if (piece.released) return;
        if (piece.rain) placeRain(piece, true);
        releasePiece(piece);
      });
      // Close the ceiling and bring every piece inside before gravity can change direction.
      roof = 0;
      pieces.forEach(contain);
      buildWalls();
      updateGravity(true);
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

    function render(now) {
      const elapsed = now - startTime;
      pieces.forEach(piece => {
        const { body, node, content, width, height, scale } = piece;
        if (piece.drawnScale !== scale) {
          content.style.transform = `scale(${scale})`;
          node.style.width = `${width * scale}px`;
          node.style.height = `${height * scale}px`;
          piece.drawnScale = scale;
        }
        let angle = body.angle;
        if (!piece.released && !piece.rain && piece.releaseAt > 0) {
          // A growing tremble before each piece lets go.
          angle += Math.sin(elapsed / 28 + piece.phase) * 0.016 * Math.min(1, elapsed / piece.releaseAt);
        }
        const transform = `translate3d(${(body.position.x - width * scale / 2).toFixed(2)}px, ${(body.position.y - height * scale / 2).toFixed(2)}px, 0) rotate(${angle.toFixed(4)}rad)`;
        if (transform !== piece.lastTransform) {
          node.style.transform = transform;
          piece.lastTransform = transform;
        }
      });
    }

    function frame(now) {
      frameId = 0;
      accumulator += Math.min(now - previousTime, 50);
      previousTime = now;
      while (accumulator >= step) {
        if (entering) advanceEntrance(now);
        grabs.forEach(({ piece }) => Sleeping.set(piece.body, false));
        pieces.forEach(piece => {
          if (!piece.released) return;
          const { body } = piece;
          if (piece.scale !== piece.targetScale) {
            // Ease into the fitted size so pieces shrink as they fall instead of jumping.
            let scale = piece.targetScale + (piece.scale - piece.targetScale) * 0.88;
            if (Math.abs(scale - piece.targetScale) < 0.002) scale = piece.targetScale;
            setScale(piece, scale);
            Sleeping.set(body, false);
          }
          // Cap very fast throws to keep thin pieces from tunnelling through walls.
          if (body.speed > maxSpeed) Body.setVelocity(body, { x: body.velocity.x * maxSpeed / body.speed, y: body.velocity.y * maxSpeed / body.speed });
          if (Math.abs(body.angularVelocity) > 0.2) Body.setAngularVelocity(body, Math.sign(body.angularVelocity) * 0.2);
        });
        Engine.update(engine, step);
        accumulator -= step;
      }
      render(now);
      if (entering || grabs.size || pieces.some(({ body }) => !body.isSleeping)) frameId = requestAnimationFrame(frame);
    }

    function wake() {
      if (frameId || restoring || document.hidden) return;
      previousTime = performance.now();
      accumulator = 0;
      frameId = requestAnimationFrame(frame);
    }

    function contain(piece) {
      const { body } = piece;
      let { x: halfWidth, y: halfHeight } = halfSize(piece);
      if (halfWidth * 2 > view.width - 4 || halfHeight * 2 > view.floor - 4) {
        Body.setAngle(body, 0);
        halfWidth = piece.width * piece.scale / 2;
        halfHeight = piece.height * piece.scale / 2;
      }
      Body.setPosition(body, {
        x: Math.max(halfWidth + 2, Math.min(view.width - halfWidth - 2, body.position.x)),
        y: Math.max(halfHeight + 2 + roof, Math.min(view.floor - halfHeight - 2, body.position.y)),
      });
      Sleeping.set(body, false);
    }

    function shake(gentle = reducedMotion.matches) {
      if (restoring) return;
      if (entering) endEntrance();
      // Throw against gravity, whichever way it points.
      const { x, y } = engine.gravity;
      const length = Math.hypot(x, y);
      const up = length > 0.1 ? { x: -x / length, y: -y / length } : { x: 0, y: -1 };
      pieces.forEach(({ body }) => {
        const lift = (gentle ? 4 : 8) + Math.random() * (gentle ? 3 : 10);
        const side = (Math.random() - 0.5) * (gentle ? 6 : 18);
        Sleeping.set(body, false);
        Body.setVelocity(body, { x: up.x * lift - up.y * side, y: up.y * lift + up.x * side });
        Body.setAngularVelocity(body, (Math.random() - 0.5) * (gentle ? 0.03 : 0.18));
      });
      wake();
    }

    function blast(point) {
      const radius = Math.max(180, Math.min(view.width, view.height) * 0.45);
      const strength = reducedMotion.matches ? 6 : 18;
      pieces.forEach(({ body, released }) => {
        if (!released) return;
        const dx = body.position.x - point.x;
        const dy = body.position.y - point.y;
        const distance = Math.hypot(dx, dy);
        if (distance > radius) return;
        const falloff = 1 - distance / radius;
        const push = strength * falloff / Math.max(distance, 1);
        Sleeping.set(body, false);
        Body.setVelocity(body, { x: body.velocity.x + dx * push, y: body.velocity.y + dy * push });
        Body.setAngularVelocity(body, body.angularVelocity + (Math.random() - 0.5) * 0.12 * falloff);
      });
      if (!reducedMotion.matches) {
        const ring = document.createElement('div');
        ring.className = 'gravity-ripple';
        ring.style.left = `${point.x}px`;
        ring.style.top = `${point.y}px`;
        ring.style.setProperty('--size', `${radius * 2}px`);
        ring.addEventListener('animationend', () => ring.remove());
        stage.append(ring);
      }
      wake();
    }

    function updateGravity(force = false) {
      if (restoring || entering) return;
      let { x, y } = manual;
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

    function steer(direction) {
      if (restoring) return;
      if (entering) endEntrance();
      // The keyboard takes over from the tilt sensor, for laptops that report one.
      tiltEnabled = false;
      tilt = undefined;
      manual = direction;
      if (zeroG) toggleFloat();
      else updateGravity(true);
      announce(`Gravity points ${direction.name}.`);
    }

    function orient(event) {
      if (!tiltEnabled || document.hidden || !Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return;
      const firstReading = !tilt;
      tilt = { beta: event.beta * Math.PI / 180, gamma: event.gamma * Math.PI / 180 };
      if (firstReading) {
        updateHint();
        resize();
        if (!zeroG) announce('Device tilt enabled. Tilt your device to steer gravity.');
      }
      updateGravity(firstReading);
    }

    function motion(event) {
      const now = performance.now();
      if (document.hidden || restoring || now < shakeReadyAt) return;
      let force;
      const { acceleration: linear, accelerationIncludingGravity: total } = event;
      if (linear && Number.isFinite(linear.x)) {
        force = Math.hypot(linear.x, linear.y ?? 0, linear.z ?? 0);
      } else if (total && Number.isFinite(total.x)) {
        force = Math.abs(Math.hypot(total.x, total.y ?? 0, total.z ?? 0) - 9.81);
      } else return;
      // Well above walking or turning the device, but easy to reach with a deliberate shake.
      if (force < 17) return;
      shakeReadyAt = now + 900;
      shake();
    }

    function buzz({ pairs }) {
      const now = performance.now();
      if (now < buzzReadyAt || reducedMotion.matches) return;
      const hard = pairs.some(({ bodyA, bodyB }) =>
        Math.hypot(bodyA.velocity.x - bodyB.velocity.x, bodyA.velocity.y - bodyB.velocity.y) > 12);
      if (!hard) return;
      buzzReadyAt = now + 90;
      navigator.vibrate(10);
    }

    function toggleFloat() {
      if (restoring) return;
      if (entering) endEntrance();
      zeroG = !zeroG;
      updateGravity(true);
      pieces.forEach(({ body }) => {
        body.frictionAir = zeroG ? 0.002 : 0.012;
        if (zeroG) Body.setVelocity(body, { x: (Math.random() - 0.5) * 5, y: -2 - Math.random() * 3 });
      });
      floatButton.setAttribute('aria-pressed', String(zeroG));
      stage.querySelector('#gravity-title').textContent = zeroG ? 'Gravity optional' : 'Gravity unlocked';
      announce(zeroG ? 'Zero gravity. The pieces are floating.' : 'Gravity restored. Watch your head.');
      wake();
    }

    function drop(id, event, cancel = false) {
      const grab = grabs.get(id);
      if (!grab) return;
      grabs.delete(id);
      Composite.remove(engine.world, grab.constraint);
      if (![...grabs.values()].some(other => other.piece === grab.piece)) grab.piece.node.classList.remove('is-grabbed');
      if (grab.moved) {
        suppressClickUntil = performance.now() + 500;
        contain(grab.piece);
        if (!cancel && event) {
          const end = { x: event.clientX, y: event.clientY, time: performance.now() };
          const start = grab.samples.find(sample => end.time - sample.time < 100) || end;
          const elapsed = Math.max(16, end.time - start.time);
          Body.setVelocity(grab.piece.body, {
            x: Math.max(-maxSpeed, Math.min(maxSpeed, (end.x - start.x) * step / elapsed)),
            y: Math.max(-maxSpeed, Math.min(maxSpeed, (end.y - start.y) * step / elapsed)),
          });
        }
      }
      if (stage.hasPointerCapture(id)) stage.releasePointerCapture(id);
      wake();
    }

    function dropAll() {
      [...grabs.keys()].forEach(id => drop(id, undefined, true));
    }

    function resize() {
      if (restoring) return;
      dropAll();
      view = viewport();
      fitScene();
      pieces.forEach(piece => {
        piece.targetScale = scaleFor(piece.width, piece.height);
        if (piece.released) contain(piece);
      });
      buildWalls();
      ghosts.forEach(placeGhost);
      wake();
    }

    function placeGhost({ ghost, element }) {
      const rect = element.getBoundingClientRect();
      ghost.style.left = `${rect.left}px`;
      ghost.style.top = `${rect.top}px`;
      ghost.style.width = `${rect.width}px`;
      ghost.style.height = `${rect.height}px`;
    }

    // Fly every piece back to its place before handing the page back.
    function restore(immediately = false) {
      if (finished) return;
      if (restoring || immediately || reducedMotion.matches || !stage.isConnected) {
        finish();
        return;
      }
      dropAll();
      restoring = true;
      abort.abort();
      cancelAnimationFrame(frameId);
      frameId = 0;
      window.scrollTo(scroll.x, scroll.y);
      pieces.forEach(piece => {
        // Unwind full turns so the return trip does not spin.
        const angle = Math.atan2(Math.sin(piece.body.angle), Math.cos(piece.body.angle));
        const { x, y } = piece.body.position;
        piece.node.style.transform = `translate3d(${x - piece.width * piece.scale / 2}px, ${y - piece.height * piece.scale / 2}px, 0) rotate(${angle}rad)`;
      });
      void stage.offsetWidth;
      ghosts.forEach(placeGhost);
      stage.classList.remove('is-collapsed');
      stage.classList.add('is-restoring');
      pieces.forEach(piece => {
        const width = pieceWidth(piece.kind, piece.element, true);
        const home = homeOf(piece, contentBox(piece.element));
        const delay = `${Math.round(Math.random() * 90)}ms`;
        piece.node.style.transitionDelay = delay;
        piece.content.style.transitionDelay = delay;
        piece.content.style.width = `${width}px`;
        piece.content.style.transform = 'scale(1)';
        piece.node.style.width = `${width}px`;
        piece.node.style.height = `${piece.height}px`;
        piece.node.style.transform = `translate3d(${home.left}px, ${home.top}px, 0) rotate(0rad)`;
      });
      finishTimer = setTimeout(finish, 680);
    }

    function finish() {
      if (finished) return;
      finished = true;
      restoring = true;
      abort.abort();
      clearTimeout(finishTimer);
      cancelAnimationFrame(frameId);
      Events.off(engine);
      Composite.clear(engine.world, false);
      Engine.clear(engine);
      document.body.append(announcement);
      stage.remove();
      root.classList.remove('gravity-active');
      root.style.scrollbarGutter = gutter;
      originals.forEach(({ element, inert }) => { element.inert = inert; });
      window.scrollTo(scroll.x, scroll.y);
      if (focus?.isConnected) focus.focus({ preventScroll: true });
      playground = undefined;
      taps = 0;
      keys = [];
      announce('Site restored. Everything is back where it belongs.');
    }

    function start() {
      // Keep the scrollbar's space while scrolling is locked, so nothing shifts sideways.
      if (window.innerWidth > root.clientWidth) root.style.scrollbarGutter = 'stable';
      document.body.append(stage);
      stage.append(announcement);
      ghosts.forEach(({ ghost }) => stage.prepend(ghost));
      ghosts.forEach(placeGhost);
      updateHint();
      view = viewport();
      sources.forEach(createPiece);
      fitScene();
      pieces.forEach(piece => {
        piece.targetScale = scaleFor(piece.width, piece.height);
        if (piece.rain) {
          setScale(piece, piece.targetScale);
          placeRain(piece, true);
        }
      });
      buildWalls();
      originals.forEach(({ element }) => { element.inert = true; });
      root.classList.add('gravity-active');
      restoreButton.focus({ preventScroll: true });
      startTime = performance.now();
      render(startTime);
      void stage.offsetWidth;
      stage.classList.add('is-collapsed');
      if (canBuzz) Events.on(engine, 'collisionStart', buzz);

      stage.addEventListener('pointerdown', event => {
        if (event.button !== 0 || restoring) return;
        const piece = pieceByElement.get(event.target.closest('.gravity-piece'));
        if (!piece) {
          if (event.target === stage) blast({ x: event.clientX, y: event.clientY });
          return;
        }
        releasePiece(piece);
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
        grabs.set(event.pointerId, { piece, constraint, start: point, moved: false,
          samples: [{ ...point, time: performance.now() }] });
        piece.node.classList.add('is-grabbed');
        wake();
      }, eventOptions);
      stage.addEventListener('pointermove', event => {
        const grab = grabs.get(event.pointerId);
        if (!grab) return;
        grab.constraint.pointA = { x: event.clientX, y: event.clientY };
        if (!grab.moved && Math.hypot(event.clientX - grab.start.x, event.clientY - grab.start.y) > 6) {
          grab.moved = true;
          stage.setPointerCapture(event.pointerId);
        }
        const now = performance.now();
        grab.samples.push({ x: event.clientX, y: event.clientY, time: now });
        grab.samples = grab.samples.filter(sample => now - sample.time <= 120);
      }, eventOptions);
      window.addEventListener('pointerup', event => drop(event.pointerId, event), eventOptions);
      window.addEventListener('pointercancel', event => drop(event.pointerId, event, true), eventOptions);
      window.addEventListener('blur', dropAll, eventOptions);
      stage.addEventListener('lostpointercapture', event => {
        // Touch starts with implicit capture on the link; transferring it to the
        // stage must not end the drag when that link loses its capture.
        if (event.target === stage) drop(event.pointerId, event, true);
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
      if (sensors.orientation) {
        window.addEventListener('deviceorientation', orient, eventOptions);
        if (window.screen.orientation) {
          window.screen.orientation.addEventListener('change', () => updateGravity(), eventOptions);
        } else {
          window.addEventListener('orientationchange', () => updateGravity(), eventOptions);
        }
      }
      if (sensors.motion) window.addEventListener('devicemotion', motion, eventOptions);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          dropAll();
          cancelAnimationFrame(frameId);
          frameId = 0;
        } else wake();
      }, eventOptions);
      wake();
    }

    return { start, restore, steer, toggleFloat };
  }
})();
