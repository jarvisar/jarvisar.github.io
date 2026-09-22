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
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: 'low-power'
    });
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.Camera();

    // Each contour is a thin strip, giving consistent, softly antialiased lines
    // without multisampling, textures, or post-processing. All strips share one draw.
    const columns = lightweight ? 96 : 144;
    const rows = lightweight ? 28 : 44;
    const vertices = [];
    const indices = [];
    for (let row = 0; row < rows; row++) {
        for (let column = 0; column <= columns; column++) {
            const u = column / columns;
            const v = row / (rows - 1);
            vertices.push(u, v, -1, u, v, 1);
            if (column < columns) {
                const index = (row * (columns + 1) + column) * 2;
                indices.push(index, index + 2, index + 1, index + 1, index + 2, index + 3);
            }
        }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);

    const time = { value: 0 };
    const uniforms = {
        time,
        resolution: { value: new THREE.Vector2(1, 1) },
        compact: { value: 0 },
        lineWidth: { value: 1.2 },
        ink: { value: new THREE.Color(0x9db6ac) },
        mist: { value: new THREE.Color(0x627f75) }
    };
    const material = new THREE.ShaderMaterial({
        transparent: true,
        depthTest: false,
        depthWrite: false,
        uniforms,
        vertexShader: `
            uniform float time;
            uniform float compact;
            uniform float lineWidth;
            uniform vec2 resolution;
            varying float edgeDistance;
            varying vec2 contour;
            varying vec2 screenPoint;

            vec2 wave(float u, float v) {
                float x = mix(-0.12, 1.12, u);
                // Two traveling swells create a rolling surface. Row spacing
                // stays positive, so the contours never cross into a grid.
                float swell = sin(x * 5.6 + v * 2.0 - time * 0.48) * 0.115;
                float ripple = sin(x * 10.0 - v * 2.4 + time * 0.30) * 0.038;
                float y = -0.12 + v * 0.62 + swell + ripple;
                y += smoothstep(0.15, 0.95, x) * 0.10;
                y = y * (1.0 - compact * 0.32) - compact * 0.04;
                return vec2(x, y) * 2.0 - 1.0;
            }

            void main() {
                vec2 point = wave(position.x, position.y);
                vec2 next = wave(position.x + 0.001, position.y);
                vec2 tangent = normalize((next - point) * resolution);
                vec2 normal = vec2(-tangent.y, tangent.x);
                float halfWidth = lineWidth * 0.5 + 0.8;
                screenPoint = point * 0.5 + 0.5;
                point += normal * position.z * halfWidth * 2.0 / resolution;
                edgeDistance = position.z * halfWidth;
                contour = vec2(position.x, position.y);
                gl_Position = vec4(point, 0.0, 1.0);
            }
        `,
        fragmentShader: `
            uniform float lineWidth;
            uniform vec3 ink;
            uniform vec3 mist;
            varying float edgeDistance;
            varying vec2 contour;
            varying vec2 screenPoint;
            void main() {
                float coverage = 1.0 - smoothstep(
                    max(0.0, lineWidth * 0.5 - 0.6),
                    lineWidth * 0.5 + 0.6,
                    abs(edgeDistance)
                );
                // Fade the ends and outer contours into the background.
                float ends = smoothstep(0.04, 0.30, contour.x)
                    * (1.0 - smoothstep(0.91, 1.0, contour.x));
                float edges = smoothstep(0.0, 0.16, contour.y)
                    * (1.0 - smoothstep(0.80, 1.0, contour.y));
                float textSpace = smoothstep(0.26, 0.54, screenPoint.y)
                    * (1.0 - smoothstep(0.28, 0.66, screenPoint.x));
                vec3 color = mix(ink, mist, contour.y * 0.65);
                gl_FragColor = vec4(color, coverage * ends * edges * (1.0 - textSpace * 0.85) * 0.66);
            }
        `
    });
    const waves = new THREE.Mesh(geometry, material);
    // Positions are composed in clip space, independently of the camera.
    waves.frustumCulled = false;
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
        renderer.getDrawingBufferSize(uniforms.resolution.value);
        // Centered text needs room in landscape as well as portrait layouts.
        uniforms.compact.value = width <= 992 ? 1 :
            Math.min(1, Math.max(0, (1.25 - width / height) / 0.55));
        uniforms.lineWidth.value = 1.2 * scale;
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
