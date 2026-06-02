import { useRef, useEffect, useState, useCallback } from 'react';

// ── Logical coordinate space (scaled to canvas at runtime) ──────────────────
const LW = 360;
const LH = 340;
const GROUND_H = 32;
const PLANE_X = 72;
const PLANE_R = 11;        // hitbox radius — smaller than visual for forgiveness
const GRAVITY = 0.36;
const JUMP_VEL = -8.8;
const GAP_H = 118;
const CLOUD_W = 70;
const INIT_SPEED = 2.3;
const MAX_SPEED = 4.8;
const CLOUD_SPACING = 230;
const SLOW_FRAMES = 100;
const DROP_R = 14;         // raindrop collect radius

type CType = 'grass' | 'tree' | 'weed';
const CTYPES: CType[] = ['grass', 'tree', 'weed'];

const CINFO: Record<CType, { fill: string; border: string; text: string; emoji: string; label: string; facts: string[] }> = {
  grass: {
    fill: '#86efac', border: '#16a34a', text: '#14532d',
    emoji: '🌿', label: 'Grass',
    facts: [
      'Grass pollen peaks between 6–10am on dry, warm mornings.',
      'Grass is the #1 allergen worldwide — affecting 1 in 4 people.',
      "Pollen is a plant's male reproductive cell — essentially plant sperm — carried by wind to fertilize distant flowers.",
    ],
  },
  tree: {
    fill: '#6ee7b7', border: '#0d9488', text: '#134e4a',
    emoji: '🌳', label: 'Tree',
    facts: [
      'Trees pollinate in early spring — often before their leaves even appear.',
      'Tree pollen can travel over 400 miles on the wind.',
      'Oak, birch, and cedar produce the most allergenic pollen of any trees.',
    ],
  },
  weed: {
    fill: '#fde68a', border: '#d97706', text: '#78350f',
    emoji: '🌾', label: 'Weed',
    facts: [
      'One ragweed plant releases up to 1 billion pollen grains per season.',
      'Weed pollen peaks in late summer — just after grass and tree seasons end.',
      'Weed pollen is so light it can drift hundreds of miles from its source.',
    ],
  },
};

const RAIN_FACTS = [
  'Rain washes pollen from the air — counts drop up to 90% after a downpour.',
  'Your immune system mistakes harmless pollen for a threat, releasing histamine and causing sneezing, itching, and inflammation.',
  'Pollen grains are 10–100 micrometers wide — invisible to the naked eye but potent enough to trigger full-body reactions.',
  'Warm, sunny days after cold nights cause plants to release stored pollen all at once — these are the worst days.',
  'Indoor air can have 2× the pollen of outdoor air if windows are left open during high-pollen hours.',
];

interface Cloud { id: number; x: number; cy: number; type: CType; passed: boolean; }
interface Drop  { id: number; x: number; y: number; }
interface GS {
  y: number; vy: number;
  clouds: Cloud[]; drops: Drop[];
  frame: number; score: number; speed: number;
  nextId: number; slowFrames: number;
  distSinceCloud: number;
  dead: boolean; bgX: number;
}

function freshState(): GS {
  return {
    y: LH / 2 - 15, vy: 0,
    clouds: [], drops: [],
    frame: 0, score: 0, speed: INIT_SPEED,
    nextId: 1, slowFrames: 0,
    distSinceCloud: CLOUD_SPACING * 0.55,
    dead: false, bgX: 0,
  };
}

function rnd(a: number, b: number) { return a + Math.random() * (b - a); }

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (w <= 0 || h <= 0) return;
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

type Phase = 'intro' | 'playing' | 'dead';

interface Props {
  onClose: () => void;
  checkInsRemaining: number;
}

export function PollenGame({ onClose, checkInsRemaining }: Props) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const gsRef       = useRef<GS>(freshState());
  const rafRef      = useRef<number>(0);
  const usedFacts   = useRef(new Set<string>());
  const factTimer   = useRef<ReturnType<typeof setTimeout>>();

  const [phase, setPhase]               = useState<Phase>('intro');
  const [displayScore, setDisplayScore] = useState(0);
  const [fact, setFact]                 = useState<{ text: string; emoji: string } | null>(null);

  function pickFact(pool: string[]): string {
    const unseen = pool.filter(f => !usedFacts.current.has(f));
    const src = unseen.length > 0 ? unseen : pool;
    const chosen = src[Math.floor(Math.random() * src.length)];
    usedFacts.current.add(chosen);
    return chosen;
  }

  const showFact = useCallback((text: string, emoji: string) => {
    clearTimeout(factTimer.current);
    setFact({ text, emoji });
    factTimer.current = setTimeout(() => setFact(null), 3800);
  }, []);

  // Stable ref so RAF loop can call latest versions without becoming a dep
  const cbRef = useRef({ pickFact, showFact });
  useEffect(() => { cbRef.current = { pickFact, showFact }; });

  // ── Canvas draw (reads gsRef, never causes re-render) ─────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const gs = gsRef.current;

    const dw = canvas.offsetWidth;
    const dh = canvas.offsetHeight;
    if (dw === 0 || dh === 0) return;
    if (canvas.width !== dw || canvas.height !== dh) {
      canvas.width = dw;
      canvas.height = dh;
    }

    const sx = dw / LW;
    const sy = dh / LH;

    ctx.clearRect(0, 0, dw, dh);

    // Sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, dh);
    skyGrad.addColorStop(0, '#bae6fd');
    skyGrad.addColorStop(1, '#f0f9ff');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, dw, dh);

    // Decorative parallax clouds (half speed)
    const bgDefs = [
      { lx: 20,  ly: 45,  w: 90, h: 28 },
      { lx: 180, ly: 32,  w: 75, h: 22 },
      { lx: 305, ly: 75,  w: 60, h: 18 },
      { lx: 95,  ly: 105, w: 55, h: 16 },
      { lx: 248, ly: 98,  w: 48, h: 14 },
    ];
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    for (const bd of bgDefs) {
      const bx = ((bd.lx - gs.bgX * 0.45) % (LW + 150) + LW + 150) % (LW + 150) - 110;
      rrect(ctx, bx * sx, bd.ly * sy, bd.w * sx, bd.h * sy, 10 * sx);
      ctx.fill();
    }

    // Ground
    const gy = (LH - GROUND_H) * sy;
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(0, gy, dw, dh - gy);
    ctx.fillStyle = '#86efac';
    ctx.fillRect(0, gy, dw, 7 * sy);

    // Pollen obstacle clouds
    for (const c of gs.clouds) {
      const info = CINFO[c.type];
      const cx     = c.x * sx;
      const cw     = CLOUD_W * sx;
      const gapTop = (c.cy - GAP_H / 2) * sy;
      const gapBot = (c.cy + GAP_H / 2) * sy;
      const groundY = (LH - GROUND_H) * sy;

      // Top block
      if (gapTop > 0) {
        rrect(ctx, cx, 0, cw, gapTop, 10 * sx);
        ctx.fillStyle = info.fill + 'dd';
        ctx.fill();
        ctx.strokeStyle = info.border;
        ctx.lineWidth = 1.5 * sx;
        ctx.stroke();
        // Pollen particle dots
        ctx.fillStyle = info.border + '90';
        for (let p = 0; p < 4; p++) {
          ctx.beginPath();
          ctx.arc(
            cx + (10 + p * 16) * sx,
            Math.min(gapTop * 0.5 + p * 9 * sy, gapTop - 5 * sy),
            2.5 * sx, 0, Math.PI * 2,
          );
          ctx.fill();
        }
      }

      // Bottom block
      if (gapBot < groundY) {
        rrect(ctx, cx, gapBot, cw, groundY - gapBot, 10 * sx);
        ctx.fillStyle = info.fill + 'dd';
        ctx.fill();
        ctx.strokeStyle = info.border;
        ctx.lineWidth = 1.5 * sx;
        ctx.stroke();
      }

      // Label above top block
      const labelY = gapTop - 5 * sy;
      if (labelY > 12 * sy) {
        ctx.font = `bold ${11 * sx}px system-ui, sans-serif`;
        ctx.fillStyle = info.text;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`${info.emoji} ${info.label}`, cx + cw / 2, labelY);
      }
    }

    // Raindrops
    ctx.font = `${20 * sx}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const d of gs.drops) {
      ctx.fillText('💧', d.x * sx, d.y * sy);
    }

    // Plane with velocity tilt
    ctx.save();
    ctx.translate(PLANE_X * sx, gs.y * sy);
    ctx.rotate((Math.max(-28, Math.min(28, gs.vy * 2.6)) * Math.PI) / 180);
    ctx.font = `${26 * sx}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✈️', 0, 0);
    ctx.restore();

    // Slow-mo progress bar at top
    if (gs.slowFrames > 0) {
      ctx.fillStyle = 'rgba(56,189,248,0.50)';
      ctx.fillRect(0, 0, (gs.slowFrames / SLOW_FRAMES) * dw, 4);
    }

    // Score
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(12,74,110,0.85)';
    ctx.font = `bold ${13 * sx}px system-ui, sans-serif`;
    ctx.fillText(`${gs.score}`, (LW - 10) * sx, 10 * sy);
    ctx.font = `${9 * sx}px system-ui, sans-serif`;
    ctx.fillText('pts', (LW - 10) * sx, 26 * sy);
  }, []);

  // ── Game loop (runs in RAF, never re-renders React except at phase changes) ─
  const loop = useCallback(() => {
    const gs = gsRef.current;
    if (gs.dead) { draw(); return; }

    const slow = gs.slowFrames > 0 ? 0.45 : 1;
    gs.slowFrames = Math.max(0, gs.slowFrames - 1);
    gs.bgX += gs.speed * 0.3 * slow;

    gs.vy += GRAVITY * slow;
    gs.y  += gs.vy * slow;
    gs.speed = Math.min(INIT_SPEED + gs.frame * 0.0022, MAX_SPEED);
    gs.frame++;
    if (gs.frame % 4 === 0) gs.score++;

    // Ceiling / ground death
    if (gs.y - PLANE_R <= 0 || gs.y + PLANE_R >= LH - GROUND_H) {
      gs.y   = Math.max(PLANE_R, Math.min(LH - GROUND_H - PLANE_R, gs.y));
      gs.dead = true;
      draw();
      setPhase('dead');
      setDisplayScore(gs.score);
      return;
    }

    // Spawn cloud based on distance traveled
    gs.distSinceCloud += gs.speed * slow;
    if (gs.distSinceCloud >= CLOUD_SPACING) {
      gs.distSinceCloud = 0;
      const type = CTYPES[Math.floor(Math.random() * CTYPES.length)];
      const minCY = GAP_H / 2 + 20;
      const maxCY = LH - GROUND_H - GAP_H / 2 - 10;
      const cy = rnd(minCY, maxCY);
      gs.clouds.push({ id: gs.nextId++, x: LW + CLOUD_W / 2, cy, type, passed: false });
      if (Math.random() < 0.45) {
        gs.drops.push({ id: gs.nextId++, x: LW + CLOUD_W / 2, y: cy });
      }
    }

    // Move clouds, check collision and gap passing
    for (const c of gs.clouds) {
      c.x -= gs.speed * slow;

      const withinX = PLANE_X + PLANE_R > c.x + 3 && PLANE_X - PLANE_R < c.x + CLOUD_W - 3;
      if (withinX) {
        const gapTop = c.cy - GAP_H / 2;
        const gapBot = c.cy + GAP_H / 2;
        if (gs.y - PLANE_R < gapTop || gs.y + PLANE_R > gapBot) {
          gs.dead = true;
          draw();
          setPhase('dead');
          setDisplayScore(gs.score);
          return;
        }
      }

      if (!c.passed && c.x + CLOUD_W < PLANE_X - PLANE_R) {
        c.passed = true;
        gs.score += 10;
        const info = CINFO[c.type];
        cbRef.current.showFact(cbRef.current.pickFact(info.facts), info.emoji);
      }
    }
    gs.clouds = gs.clouds.filter(c => c.x + CLOUD_W > -20);

    // Move drops, check collection
    for (const d of gs.drops) {
      d.x -= gs.speed * slow;
      const dx = PLANE_X - d.x;
      const dy = gs.y - d.y;
      if (Math.sqrt(dx * dx + dy * dy) < PLANE_R + DROP_R) {
        gs.drops     = gs.drops.filter(dr => dr.id !== d.id);
        gs.slowFrames = SLOW_FRAMES;
        gs.score     += 8;
        cbRef.current.showFact(cbRef.current.pickFact(RAIN_FACTS), '🌧️');
        break;
      }
    }
    gs.drops = gs.drops.filter(d => d.x > -30);

    if (gs.frame % 20 === 0) setDisplayScore(gs.score);

    draw();
    rafRef.current = requestAnimationFrame(loop);
  }, [draw]);

  const jump = useCallback(() => {
    if (!gsRef.current.dead) gsRef.current.vy = JUMP_VEL;
  }, []);

  function startGame() {
    cancelAnimationFrame(rafRef.current);
    gsRef.current = freshState();
    usedFacts.current.clear();
    clearTimeout(factTimer.current);
    setFact(null);
    setDisplayScore(0);
    setPhase('playing');
  }

  // RAF lifecycle
  useEffect(() => {
    if (phase === 'playing') {
      rafRef.current = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(rafRef.current);
    }
  }, [phase, loop]);

  // Static draw for non-playing phases
  useEffect(() => {
    if (phase !== 'playing') {
      const id = requestAnimationFrame(draw);
      return () => cancelAnimationFrame(id);
    }
  }, [phase, draw]);

  // Keyboard support on desktop
  useEffect(() => {
    if (phase !== 'playing') return;
    function onKey(e: KeyboardEvent) {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        jump();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, jump]);

  // Cleanup
  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    clearTimeout(factTimer.current);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-sky-50 dark:bg-sky-900/30 border-b border-sky-100 dark:border-sky-800">
          <div>
            <div className="font-bold text-sky-900 dark:text-sky-100 text-sm">✈️ Pollen Pilot: The Game</div>
            <div className="text-xs text-sky-600 dark:text-sky-400">
              {checkInsRemaining} check-in{checkInsRemaining !== 1 ? 's' : ''} until your ML model activates
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 w-8 h-8 flex items-center justify-center text-xl"
          >
            ✕
          </button>
        </div>

        {/* Canvas area */}
        <div className="relative bg-sky-100 dark:bg-sky-950" style={{ height: 320 }}>
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ display: 'block', touchAction: 'none' }}
            onClick={phase === 'playing' ? jump : undefined}
            onTouchStart={e => { e.preventDefault(); if (phase === 'playing') jump(); }}
          />

          {/* Educational fact card */}
          {fact && (
            <div className="absolute bottom-3 left-3 right-3 bg-white/96 dark:bg-gray-800/96 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-sky-100 dark:border-sky-800 flex gap-2.5 items-start pointer-events-none">
              <span className="text-xl leading-none mt-0.5 shrink-0">{fact.emoji}</span>
              <p className="text-xs text-gray-700 dark:text-gray-200 leading-relaxed">{fact.text}</p>
            </div>
          )}

          {/* Intro overlay */}
          {phase === 'intro' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-sky-50/92 dark:bg-gray-900/92 backdrop-blur-sm">
              <div className="text-5xl mb-3">✈️</div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">Navigate the Pollen!</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-1 px-8 leading-relaxed">
                Tap to fly up. Glide through the gaps.<br />Collect 💧 rain drops to slow down pollen.
              </p>
              <p className="text-xs text-sky-600 dark:text-sky-400 text-center mb-5 px-8">
                Each gap teaches you something about pollen.
              </p>
              <button
                onClick={startGame}
                className="bg-sky-500 text-white font-semibold px-8 py-2.5 rounded-xl text-sm hover:bg-sky-600 active:scale-95 transition-all"
              >
                Start Flying
              </button>
            </div>
          )}

          {/* Game over overlay */}
          {phase === 'dead' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/82 backdrop-blur-sm">
              <div className="text-4xl mb-2">💨</div>
              <h3 className="font-bold text-white text-lg mb-0.5">Pollen got you!</h3>
              <p className="text-sky-300 text-sm mb-5">Score: {displayScore} pts</p>
              <button
                onClick={startGame}
                className="bg-sky-500 text-white font-semibold px-8 py-2.5 rounded-xl text-sm hover:bg-sky-600 active:scale-95 transition-all"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Bottom hint */}
        <div className="py-2.5 px-4 text-center text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800">
          {phase === 'playing'
            ? 'Tap / Space to flap ↑  •  Collect 💧 to slow down'
            : 'Each gap you clear teaches you something new 🌿'}
        </div>
      </div>
    </div>
  );
}
