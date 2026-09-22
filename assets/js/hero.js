const canvas = document.querySelector('.hero-canvas');

// Keep the CSS background if WebGL or the module is unavailable.
if (canvas) {
    import('three').then(THREE => initHero(THREE)).catch(() => {
        canvas.hidden = true;
    });
}

function initHero(THREE) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const lightweight = window.matchMedia('(max-width: 767px)').matches ||
        navigator.hardwareConcurrency <= 4 || navigator.deviceMemory <= 4;
    const frameInterval = 1000 / (lightweight ? 20 : 30);
    const pixelBudget = lightweight ? 650000 : 1400000;
    const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: !lightweight,
        powerPreference: 'low-power'
    });
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 1, 400);
    camera.position.set(0, 50, 580);
    camera.rotation.x = -0.61;

    // Parallel contours form a wave surface without a crossing wireframe grid.
    // The buffer stays static; only a time uniform changes per frame.
    const columns = lightweight ? 64 : 96;
    const rows = lightweight ? 32 : 48;
    const vertices = [];
    const colors = [];
    const indices = [];
    const palette = [0x8eaac7, 0xd6a09a, 0xdfca91, 0xa2b8a0].map(hex => new THREE.Color(hex));
    for (let row = 0; row <= rows; row++) {
        const color = palette[row % palette.length];
        for (let column = 0; column <= columns; column++) {
            vertices.push((column / columns - 0.5) * 900, row / rows * 500 - 650, 0);
            colors.push(color.r, color.g, color.b);
            if (column < columns) {
                const index = row * (columns + 1) + column;
                indices.push(index, index + 1);
            }
        }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();
    // Include the maximum shader displacement in the culling bounds.
    geometry.boundingSphere.radius += 24;

    const time = { value: 0 };
    const material = new THREE.ShaderMaterial({
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        uniforms: {
            time
        },
        vertexShader: `
            uniform float time;
            varying float depth;
            varying vec3 waveColor;
            void main() {
                vec3 p = position;
                p.z += sin(p.x * 0.022 + p.y * 0.009 + time * 0.45) * 14.0;
                p.z += cos(p.x * 0.035 - p.y * 0.006 - time * 0.3) * 7.0;
                vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
                depth = -viewPosition.z;
                waveColor = color;
                gl_Position = projectionMatrix * viewPosition;
            }
        `,
        fragmentShader: `
            varying float depth;
            varying vec3 waveColor;
            void main() {
                float fog = smoothstep(35.0, 330.0, depth);
                gl_FragColor = vec4(waveColor, (1.0 - fog) * 0.65);
            }
        `
    });
    const waves = new THREE.LineSegments(geometry, material);
    waves.rotation.x = -Math.PI * 0.5;
    scene.add(waves);

    let visible = false;
    let contextLost = false;
    let frame = 0;
    let lastFrame = 0;
    let lastTick = 0;

    function draw() {
        renderer.render(scene, camera);
    }

    function animate(now) {
        frame = requestAnimationFrame(animate);
        const elapsed = now - lastFrame;
        if (elapsed < frameInterval) return;
        // Frame-rate independent motion; paused time never jumps the scene.
        time.value += Math.min((now - lastTick) / 1000, 0.1);
        lastTick = now;
        lastFrame = now - elapsed % frameInterval;
        draw();
    }

    function updateAnimation() {
        cancelAnimationFrame(frame);
        frame = 0;
        if (!visible || document.hidden || contextLost) return;
        draw();
        if (!reducedMotion.matches) {
            lastFrame = lastTick = performance.now();
            frame = requestAnimationFrame(animate);
        }
    }

    function resize() {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        if (!width || !height || contextLost) return;
        // Never render at retina resolution; also cap the cost of large monitors.
        const scale = Math.min(1, Math.sqrt(pixelBudget / (width * height)));
        renderer.setSize(Math.floor(width * scale), Math.floor(height * scale), false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        if (visible && !document.hidden) draw();
    }

    if ('ResizeObserver' in window) {
        new ResizeObserver(resize).observe(canvas);
    } else {
        window.addEventListener('resize', resize, { passive: true });
    }
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(entries => {
            visible = entries[0].isIntersecting;
            updateAnimation();
        }).observe(canvas);
    } else {
        visible = true;
    }
    document.addEventListener('visibilitychange', updateAnimation);
    window.addEventListener('pagehide', () => {
        cancelAnimationFrame(frame);
        frame = 0;
    });
    window.addEventListener('pageshow', updateAnimation);
    if (reducedMotion.addEventListener) {
        reducedMotion.addEventListener('change', updateAnimation);
    } else {
        reducedMotion.addListener(updateAnimation);
    }
    canvas.addEventListener('webglcontextlost', event => {
        event.preventDefault();
        contextLost = true;
        canvas.style.visibility = 'hidden';
        updateAnimation();
    });
    canvas.addEventListener('webglcontextrestored', () => {
        contextLost = false;
        canvas.style.visibility = '';
        resize();
        updateAnimation();
    });
    resize();
    updateAnimation();
}
