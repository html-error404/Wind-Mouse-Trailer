// Create particle shapes dynamically as crisp SVG elements
const createParticleIcon = (shape) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '24');
  svg.setAttribute('height', '24');
  svg.setAttribute('viewBox', '0 0 24 24');
  
  // Custom structure adjustments for stroke vs fill shapes
  if (shape === 'ring') {
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '3');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
  } else {
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('stroke', 'none');
  }

  switch(shape) {
    case 'star':
      svg.innerHTML = `<path d="M12 3l3.5 7H23l-6 4.5 2.5 7-7-5-7 5 2.5-7-6-4.5h7.5L12 3z"/>`;
      break;
    case 'sparkle':
      svg.innerHTML = `<path d="M12 0L14.6 9.4L24 12L14.6 14.6L12 24L9.4 14.6L0 12L9.4 9.4Z"/>`;
      break;
    case 'circle':
      svg.innerHTML = `<circle cx="12" cy="12" r="8"/>`;
      break;
    case 'diamond':
      svg.innerHTML = `<rect x="5" y="5" width="14" height="14" rx="2" transform="rotate(45 12 12)"/>`;
      break;
    case 'heart':
      svg.innerHTML = `<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>`;
      break;
    case 'moon':
      svg.innerHTML = `<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>`;
      break;
    case 'ring':
    default:
      svg.innerHTML = `<circle cx="12" cy="12" r="8"/>`;
  }
  return svg;
};

// Conversions for smooth custom colors handling
const hexToRgb = (hex) => {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  const num = parseInt(hex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
};

function initializeTrail() {
  let start = new Date().getTime();
  const originPosition = { x: 0, y: 0 };
  const trailPoints = []; // Stores history of coordinates for smooth ribbon drawing

  const last = {
    starTimestamp: start,
    starPosition: originPosition,
    mousePosition: originPosition
  };

  // HERE IS OUR COOL CONFIG OBJECT! 
  // I put all settings in one place because my mentor said clean code starts with variables.
  const config = {
    starAnimationDuration: 1200, // how long the cute falling stars stay on screen
    minimumTimeBetweenStars: 25, // don't make them spawn too fast or computer goes crazy
    minimumDistanceBetweenStars: 6, // changed this because default is 0.5x now!
    colors: ["255 0 85", "255 221 0", "0 255 170", "0 170 255", "204 0 255", "252 254 255"], // multi-colored preset for rainbow active state
    sizes: ["1.3rem", "0.95rem", "0.6rem"], // small, medium, large particle size choices
    animations: ["fall-1", "fall-2", "fall-3"], // custom keyframe names in style.css
    currentShape: "star", // classic 5-pointed star is my favorite design!
    thickness: 0.5, // start thin at 0.5x as requested by user. Looks so precise!
    opacity: 1.0, // starts fully opaque (1.0)
    isRainbow: true, // defaults to cosmic rainbow spectrum neon glow by default
    enableTrail: true, // I added this so users can easily toggle the colorful lines off if they just want particles!
    enableParticles: true // I put this too to toggle particles separately, my manager will be so proud of this custom feature!
  };

  // Setup the full screen wind trail Canvas
  const canvas = document.getElementById('trailCanvas');
  let ctx = null;
  if (canvas) {
    ctx = canvas.getContext('2d');
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  // --- CONTROL PANEL HOOKS & DOM SELECTORS ---
  // We need to declare these at the top of our function so our functions can access them without any initialization errors!
  // My mentor said declaring DOM elements as early as possible prevents JS from crashing early.
  const controlPanel = document.getElementById('controlPanel');
  const toggleBtn = document.getElementById('toggleBtn');
  const panelHeader = document.getElementById('panelHeader');
  const colorDots = document.querySelectorAll('.color-dot');
  const shapeBtns = document.querySelectorAll('.shape-btn');
  
  const activeShapeText = document.getElementById('activeShapeText');
  const activeColorText = document.getElementById('activeColorText');

  // CHAIKIN'S CORNER CUTTING SECTORS!
  // I found this awesome algorithm online on StackOverflow after searching "how to make canvas line smooth like vector illustrator".
  // It basically slices the harsh corners of our mouse angles repeatedly to create super silky bezier-like ribbon lines!
  // My senior code reviewer said doing 3 iterations is perfect. Doing 4 makes it lag, and 1 or 2 is too edgy!
  function smoothPoints(points, iterations = 3) {
    if (points.length < 3) return points;
    let current = points;
    for (let iter = 0; iter < iterations; iter++) {
      const next = [];
      next.push({ ...current[0] }); // Keep the very first coordinate exact
      for (let i = 0; i < current.length - 1; i++) {
        const p1 = current[i];
        const p2 = current[i + 1];
        
        // Split the segment at 25% and 75% thresholds (corner cutting!)
        const q = {
          x: p1.x * 0.75 + p2.x * 0.25,
          y: p1.y * 0.75 + p2.y * 0.25,
          age: p1.age * 0.75 + p2.age * 0.25,
          maxAge: p1.maxAge
        };
        const r = {
          x: p1.x * 0.25 + p2.x * 0.75,
          y: p1.y * 0.25 + p2.y * 0.75,
          age: p1.age * 0.25 + p2.age * 0.75,
          maxAge: p2.maxAge
        };
        next.push(q, r);
      }
      next.push({ ...current[current.length - 1] }); // Keep the final end coordinate exact
      current = next;
    }
    return current;
  }

  // Draw the smooth flowing ribbon on our canvas using 3 passes for a gorgeous realism glow!
  function drawSmoothTrail() {
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height); // wipe canvas clean every frame
    
    // If the trail is disabled by the user, we just return early so it doesn't draw anything!
    if (!config.enableTrail) return;
    
    if (trailPoints.length < 2) return;
    
    // Increase the age of each point on every animation tick
    for (let i = 0; i < trailPoints.length; i++) {
      trailPoints[i].age += 1;
    }
    
    // Remove expired coordinates from the front of the array (oldest points first)
    while (trailPoints.length > 0 && trailPoints[0].age > trailPoints[0].maxAge) {
      trailPoints.shift();
    }
    
    if (trailPoints.length < 2) return;

    // Apply the corner cutting algorithm to smooth out fast mouse coordinates!
    const smoothed = smoothPoints(trailPoints, 3);
    if (smoothed.length < 2) return;

    // Set additive screen blend mode for high-fidelity glowing overlap and plasma bloom
    ctx.globalCompositeOperation = 'screen';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Loop once for each volumetric pass to completely avoid separate micro-stroke joint overlaps
    
    // Pass 1: Semi-transparent super-broad ambient gas aura
    for (let i = 1; i < smoothed.length; i++) {
      const p1 = smoothed[i - 1];
      const p2 = smoothed[i];
      const ratio = i / smoothed.length;
      const width = 12 * config.thickness * ratio;
      if (width < 0.15) continue;

      let colorStr;
      if (config.isRainbow) {
        const hue = (ratio * 120 + (performance.now() / 6)) % 360;
        colorStr = `hsla(${hue}, 100%, 60%, ${ratio * 0.12 * config.opacity})`;
      } else {
        const currentRgb = document.documentElement.style.getPropertyValue('--glow-rgb') || '249, 146, 253';
        colorStr = `rgba(${currentRgb}, ${ratio * 0.11 * config.opacity})`;
      }

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineWidth = width * 4.2;
      ctx.strokeStyle = colorStr;
      ctx.stroke();
    }

    // Pass 2: Saturated core neon gas body
    for (let i = 1; i < smoothed.length; i++) {
      const p1 = smoothed[i - 1];
      const p2 = smoothed[i];
      const ratio = i / smoothed.length;
      const width = 12 * config.thickness * ratio;
      if (width < 0.15) continue;

      let colorStr;
      if (config.isRainbow) {
        const hue = (ratio * 120 + (performance.now() / 6)) % 360;
        colorStr = `hsla(${hue}, 100%, 65%, ${ratio * 0.42 * config.opacity})`;
      } else {
        const currentRgb = document.documentElement.style.getPropertyValue('--glow-rgb') || '249, 146, 253';
        colorStr = `rgba(${currentRgb}, ${ratio * 0.38 * config.opacity})`;
      }

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineWidth = width * 1.6;
      ctx.strokeStyle = colorStr;
      ctx.stroke();
    }

    // Pass 3: Brilliant white-hot focal filament thread for realistic glow core intensity
    for (let i = 1; i < smoothed.length; i++) {
      const p1 = smoothed[i - 1];
      const p2 = smoothed[i];
      const ratio = i / smoothed.length;
      const width = 12 * config.thickness * ratio;
      if (width < 0.15) continue;

      let colorStr;
      if (config.isRainbow) {
        const hue = (ratio * 120 + (performance.now() / 6)) % 360;
        // Perfectly matches the cycling rainbow hue at peak brightness
        colorStr = `hsla(${hue}, 100%, 63%, ${ratio * 0.98 * config.opacity})`;
      } else {
        const currentRgb = document.documentElement.style.getPropertyValue('--glow-rgb') || '249, 146, 253';
        // Perfectly matches the selected trail color with glowing solid density
        colorStr = `rgba(${currentRgb}, ${ratio * 0.95 * config.opacity})`;
      }

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineWidth = width * 0.45;
      ctx.strokeStyle = colorStr;
      ctx.stroke();
    }
    
    // Reset composite operation & filter to default
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';
  }

  let count = 0;
  let isHoveringPanel = false; // suspend trail triggers when styling options card

  /* --- REAL-TIME TELEMETRY SYSTEM SENSORS --- */
  let mouseSpeed = 0;              // live cursor speed in pixels/second
  let turbulenceScore = 12;        // vector curvature index percent (default baseline)
  let lastMoveTimestamp = performance.now();
  let lastRecordedPos = { x: 0, y: 0 };
  let lastVector = { x: 0, y: 0 };

  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
        selectRandom = items => items[rand(0, items.length - 1)];

  const withUnit = (value, unit) => `${value}${unit}`,
        px = value => withUnit(value, "px"),
        ms = value => withUnit(value, "ms");

  const calcDistance = (a, b) => {
    const diffX = b.x - a.x,
          diffY = b.y - a.y;
    return Math.sqrt(Math.pow(diffX, 2) + Math.pow(diffY, 2));
  };

  const calcElapsedTime = (start, end) => end - start;

  const appendElement = element => document.body.appendChild(element),
        removeElement = (element, delay) => setTimeout(() => {
          if (element && element.parentNode === document.body) {
            document.body.removeChild(element);
          }
        }, delay);

  // Generate a customized celestial particle
  const createStar = position => {
    const star = createParticleIcon(config.currentShape);
    
    star.setAttribute("class", "star");
    
    star.style.left = px(position.x - 12); // center on coordinate
    star.style.top = px(position.y - 12);
    
    // Get random base size and apply dynamic thickness scale from range slider
    const baseSizeStr = selectRandom(config.sizes);
    const numericSize = parseFloat(baseSizeStr);
    const unit = baseSizeStr.replace(/[0-9.]/g, '');
    star.style.fontSize = `${numericSize * config.thickness}${unit}`;
    
    // Set colors and shadows to perfectly match the active trail color setting
    if (config.isRainbow) {
      const hue = (count * 15 + (performance.now() / 6)) % 360;
      const starColor = `hsl(${hue}, 100%, 65%)`;
      star.style.color = starColor;
      star.style.filter = `drop-shadow(0px 0px ${10 * config.thickness}px hsla(${hue}, 100%, 65%, 0.85))`;
    } else {
      const currentRgb = document.documentElement.style.getPropertyValue('--glow-rgb') || '249, 146, 253';
      star.style.color = `rgb(${currentRgb})`;
      star.style.filter = `drop-shadow(0px 0px ${10 * config.thickness}px rgba(${currentRgb.replace(/,/g, '')}, 0.85))`;
    }
    
    star.style.animationName = config.animations[count++ % 3];
    star.style.animationDuration = ms(config.starAnimationDuration);
    
    appendElement(star);
    removeElement(star, config.starAnimationDuration);
  };

  // Generate glowing trailer points
  const createGlowPoint = position => {
    const glow = document.createElement("div");
    glow.className = "glow-point";
    glow.style.left = px(position.x - 1);
    glow.style.top = px(position.y - 1);
    
    appendElement(glow);
    removeElement(glow, config.glowDuration);
  };

  const determinePointQuantity = distance => Math.max(
    Math.floor(distance / config.maximumGlowPointSpacing),
    1
  );

  // Fills holes when cursor is dragged very fast across display
  const createGlow = (lastPos, currentPos) => {
    const distance = calcDistance(lastPos, currentPos),
          quantity = determinePointQuantity(distance);
    
    const dx = (currentPos.x - lastPos.x) / quantity,
          dy = (currentPos.y - lastPos.y) / quantity;
    
    Array.from(Array(quantity)).forEach((_, index) => { 
      const x = lastPos.x + dx * index, 
            y = lastPos.y + dy * index;
      createGlowPoint({ x, y });
    });
  };

  const updateLastStar = position => {
    last.starTimestamp = new Date().getTime();
    last.starPosition = position;
  };

  const updateLastMousePosition = position => last.mousePosition = position;

  const adjustLastMousePosition = position => {
    if(last.mousePosition.x === 0 && last.mousePosition.y === 0) {
      last.mousePosition = position;
    }
  };

  // Main interaction controller
  const handleOnMove = e => {
    // Hide instructions once user starts moving mouse
    const instruction = document.getElementById('instructionText');
    if (instruction && !instruction.classList.contains('fade-out')) {
      instruction.classList.add('fade-out');
    }

    const mousePosition = { x: e.clientX, y: e.clientY };
    const now = performance.now();
    
    // --- TELEMETRY CALCULATORS ---
    const dt = (now - lastMoveTimestamp) / 1000;
    if (dt > 0.01) { // evaluate calculations at small discrete intervals
      const deltaDist = calcDistance(lastRecordedPos, mousePosition);
      const instantSpeed = deltaDist / dt; // yields px/s
      
      // Calculate speed and applies a low-pass filter
      mouseSpeed = mouseSpeed * 0.72 + instantSpeed * 0.28;
      
      // Turbulence Trajectory Calculation (measures cursor angular volatility)
      const dx = mousePosition.x - lastRecordedPos.x;
      const dy = mousePosition.y - lastRecordedPos.y;
      const vecLen = Math.sqrt(dx*dx + dy*dy);
      
      if (vecLen > 4) {
        const dirX = dx / vecLen;
        const dirY = dy / vecLen;
        
        if (lastVector.x !== 0 || lastVector.y !== 0) {
          const dotProduct = dirX * lastVector.x + dirY * lastVector.y;
          // Dot equals 1.0 (straight vector), goes down to -1.0 (complete inverted pivot)
          const pivotCurvature = Math.max(0, 1 - dotProduct); // 0 (flat) to 2 (sharp)
          
          // Elevates turbulence score based on velocity & curvature spikes
          const curveStimulus = pivotCurvature * (55 + Math.min(25, vecLen));
          turbulenceScore = turbulenceScore * 0.88 + curveStimulus * 0.12;
        }
        lastVector = { x: dirX, y: dirY };
      }
      
      lastRecordedPos = mousePosition;
      lastMoveTimestamp = now;
    }

    adjustLastMousePosition(mousePosition);
    
    // Suspend spawning inside the control settings card configuration
    if (isHoveringPanel) {
      updateLastMousePosition(mousePosition);
      return;
    }

    // Register coordinates for smooth canvas glowing wind ribbon
    // But only if the wind trail checkbox is turned on!
    if (config.enableTrail) {
      trailPoints.push({
        x: mousePosition.x,
        y: mousePosition.y,
        age: 0,
        maxAge: 45 // lifespan in animation frames
      });
    }
    
    const timeNow = new Date().getTime(),
          hasMovedFarEnough = calcDistance(last.starPosition, mousePosition) >= config.minimumDistanceBetweenStars,
          hasBeenLongEnough = calcElapsedTime(last.starTimestamp, timeNow) > config.minimumTimeBetweenStars;
    
    // Only spawn cute star shapes if particle sparks toggle is checked!
    if (config.enableParticles && (hasMovedFarEnough || hasBeenLongEnough)) {
      createStar(mousePosition);
      updateLastStar(mousePosition);
    }
    
    // Completely removed createGlow() dots representation as requested.
    updateLastMousePosition(mousePosition);
  };

  // Event bindings for cosmic motion
  window.addEventListener('mousemove', e => handleOnMove(e));
  window.addEventListener('touchmove', e => handleOnMove(e.touches[0]));
  document.body.addEventListener('mouseleave', () => {
    updateLastMousePosition(originPosition);
    mouseSpeed = 0;
  });

  /* --- SYSTEM UPDATES & HUD SCHEDULER LOOP --- */
  function animateTelemetry() {
    const densityPercentElement = document.getElementById('densityPercent');
    const densityBar = document.getElementById('densityBar');
    const densityText = document.getElementById('densityText');
    const densityStatus = document.getElementById('densityStatus');

    const turbulencePercentElement = document.getElementById('turbulencePercent');
    const turbulenceBar = document.getElementById('turbulenceBar');
    const turbulenceText = document.getElementById('turbulenceText');
    const turbulenceStatus = document.getElementById('turbulenceStatus');

    // 1. Density telemetry representation (range: 0 to 1800 px/s standard)
    const densityPct = Math.min(Math.round((mouseSpeed / 1800) * 100), 100);
    if (densityPercentElement) densityPercentElement.innerText = `${densityPct}%`;
    if (densityBar) {
      densityBar.style.width = `${densityPct}%`;
    }
    if (densityText) {
      densityText.innerText = `${Math.round(mouseSpeed).toLocaleString()} px/s`;
    }
    if (densityStatus) {
      if (mouseSpeed < 10) {
        densityStatus.innerText = "STANDBY";
      } else if (mouseSpeed < 400) {
        densityStatus.innerText = "LOW OUTPUT";
      } else if (mouseSpeed < 1000) {
        densityStatus.innerText = "STABLE TRAIL";
      } else if (mouseSpeed < 1600) {
        densityStatus.innerText = "HIGH VELOCITY";
      } else {
        densityStatus.innerText = "PEAK FLUX";
      }
    }

    // 2. Turbulence telemetry representation (decays when static)
    turbulenceScore = Math.max(12, turbulenceScore * 0.965); // natural aerodynamic decay
    const turbPct = Math.min(Math.round(turbulenceScore), 100);
    if (turbulencePercentElement) turbulencePercentElement.innerText = `${turbPct}%`;
    if (turbulenceBar) {
      turbulenceBar.style.width = `${turbPct}%`;
    }
    if (turbulenceText) {
      if (turbPct < 15) {
        turbulenceText.innerText = "STABLE";
      } else if (turbPct < 35) {
        turbulenceText.innerText = "MODERATE";
      } else if (turbPct < 65) {
        turbulenceText.innerText = "VORTEX";
      } else {
        turbulenceText.innerText = "CHAOTIC";
      }
    }
    if (turbulenceStatus) {
      if (turbPct < 15) {
        turbulenceStatus.innerText = "AUTO";
      } else if (turbPct < 35) {
        turbulenceStatus.innerText = "ADAPTIVE";
      } else if (turbPct < 65) {
        turbulenceStatus.innerText = "SENSING";
      } else {
        turbulenceStatus.innerText = "ENGAGED";
      }
    }

    // Smooth inertia decay when user is sitting completely idle
    const inactiveDuration = performance.now() - lastMoveTimestamp;
    if (inactiveDuration > 80) {
      mouseSpeed = Math.max(0, mouseSpeed * 0.88 - 4);
    }

    // Render the smooth glowing wind trail
    drawSmoothTrail();

    requestAnimationFrame(animateTelemetry);
  }

  // Call the update function so our initial color starts as the awesome Rainbow!
  updateTrailerColor("rainbow");

  // Fire the updates loop to redraw the trails and calculate physics
  requestAnimationFrame(animateTelemetry);

  /* --- LIVE REAL-TIME FPS CALCULATOR --- */
  let lastFpsTime = performance.now();
  let frames = 0;
  function updateFps() {
    frames++;
    const now = performance.now();
    if (now >= lastFpsTime + 1000) {
      const fps = (frames * 1000) / (now - lastFpsTime);
      const fpsDisplay = document.getElementById('fpsDisplay');
      if (fpsDisplay) {
        fpsDisplay.innerText = `${fps.toFixed(1)} FPS`;
      }
      frames = 0;
      lastFpsTime = now;
    }
    requestAnimationFrame(updateFps);
  }
  requestAnimationFrame(updateFps);


  // Track panel hover to suspend sparkles
  if (controlPanel) {
    controlPanel.addEventListener('mouseenter', () => {
      isHoveringPanel = true;
    });
    controlPanel.addEventListener('mouseleave', () => {
      isHoveringPanel = false;
    });
  }

  // Minimize toggle triggers
  const togglePanelCollapse = (e) => {
    if (e.target.closest('#toggleBtn') || e.target === toggleBtn || e.target.closest('.panel-header') === panelHeader) {
      controlPanel.classList.toggle('collapsed');
    }
  };

  if (panelHeader) {
    panelHeader.addEventListener('click', togglePanelCollapse);
  }

  const colorNamesMap = {
    '#ffffff': 'Prism White',
    '#ff4e50': 'Solar Flare',
    '#00ffff': 'Nebula Cyan',
    '#f992fd': 'Royal Orchid',
    '#39ff14': 'Quantum Lime',
    '#ffdf00': 'Stardust Gold',
    'rainbow': 'Cosmic Rainbow'
  };

  // Update logic for active primary glow and trail color
  // I changed this to a standard function declaration so it gets hoisted to the top of the scope automatically! 
  // No more "ReferenceError: can't access before initialization" errors!
  function updateTrailerColor(hexCode) {
    if (hexCode === "rainbow") {
      config.isRainbow = true;
      document.documentElement.style.setProperty('--glow-rgb', '255, 255, 255');
      // Create high variety particles colors
      config.colors = ["255 0 85", "255 221 0", "0 255 170", "0 170 255", "204 0 255", "252 254 255"];
      if (activeColorText) {
        activeColorText.innerText = "Cosmic Rainbow";
      }
      return;
    }
    
    config.isRainbow = false;
    const rgb = hexToRgb(hexCode);
    const rgbStr = `${rgb.r} ${rgb.g} ${rgb.b}`;
    
    // Configure CSS property in root context
    document.documentElement.style.setProperty('--glow-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    
    // Update config palette (keep stardust white for celestial variety)
    config.colors = [rgbStr, "252 254 255"];
    
    // Update dashboard labels
    if (activeColorText) {
      const lowerHex = hexCode.toLowerCase();
      const prettyName = colorNamesMap[lowerHex] || `Hex ${hexCode.toUpperCase()}`;
      activeColorText.innerText = prettyName;
    }
  }

  // Register Preset Dots click handlers
  colorDots.forEach(dot => {
    dot.addEventListener('click', () => {
      colorDots.forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      
      const pickedColor = dot.getAttribute('data-color');
      
      // Update trailer color config
      updateTrailerColor(pickedColor);
    });
  });

  // Register Shape button triggers
  shapeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      shapeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const selectedShape = btn.getAttribute('data-shape');
      config.currentShape = selectedShape;

      // Update label representation
      if (activeShapeText) {
        const capitalLabel = selectedShape.charAt(0).toUpperCase() + selectedShape.slice(1);
        activeShapeText.innerText = capitalLabel;
      }
    });
  });

  // Register Trail Thickness slider triggers
  const thicknessSlider = document.getElementById('thicknessSlider');
  const thicknessValueText = document.getElementById('thicknessValueText');

  if (thicknessSlider) {
    thicknessSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      config.thickness = val;
      
      // Keep minimum star generation distance adjusted proportionally with scale 
      // so thicker trails generate perfectly dense lines, thin trails stay close
      config.minimumDistanceBetweenStars = Math.max(6, Math.floor(12 * val));
      
      if (thicknessValueText) {
        thicknessValueText.innerText = `${val.toFixed(2)}x`;
      }
    });
  }

  // Register Trail Opacity slider triggers
  const opacitySlider = document.getElementById('opacitySlider');
  const opacityValueText = document.getElementById('opacityValueText');

  if (opacitySlider) {
    opacitySlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      config.opacity = val;
      
      if (opacityValueText) {
        opacityValueText.innerText = `${Math.round(val * 100)}%`;
      }
    });
  }

  // --- JUNIOR EXPERT VISUAL SWITCHES BINDINGS ---
  // Here we bind our super cool new checkboxes so we can switch off trail or particles anytime!
  const trailToggle = document.getElementById('trailToggle');
  const particlesToggle = document.getElementById('particlesToggle');

  if (trailToggle) {
    trailToggle.addEventListener('change', (e) => {
      config.enableTrail = e.target.checked;
      
      // Wipe canvas clean immediately if turned off so there is no weird frozen line!
      if (!config.enableTrail && canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    });
  }

  if (particlesToggle) {
    particlesToggle.addEventListener('change', (e) => {
      config.enableParticles = e.target.checked;
    });
  }
}

// Spark up the engine
document.addEventListener('DOMContentLoaded', () => {
  initializeTrail();
});
