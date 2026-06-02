import { useRef, useEffect, useState, useCallback } from 'react';

// ── Logical coordinate space (scaled to canvas at runtime) ──────────────────
const LW = 360;
const LH = 340;
const GROUND_H = 32;
const PLANE_X = 72;
const PLANE_R = 11;
const GRAVITY = 0.36;
const JUMP_VEL = -4.5;
const GAP_H = 118;
const CLOUD_W = 70;
const INIT_SPEED = 2.3;
const MAX_SPEED = 4.8;
const CLOUD_SPACING = 230;
const SLOW_FRAMES = 100;
const DROP_R = 14;

type CType = 'grass' | 'tree' | 'weed';
const CTYPES: CType[] = ['grass', 'tree', 'weed'];

const CINFO: Record<CType, { fill: string; border: string; emoji: string; label: string; facts: string[] }> = {
  grass: {
    fill: '#86efac', border: '#16a34a',
    emoji: '🌿', label: 'Grass',
    facts: [
      'Grass pollen peaks between 6-10am on dry, warm mornings.',
      'Grass is the #1 allergen worldwide, affecting 1 in 4 people.',
      "Pollen is a plant's male reproductive cell, essentially plant sperm, carried by wind to fertilize distant flowers.",
      'Grass pollen season runs from late spring through early summer, peaking in May and June.',
      'Lawns release more pollen when they go to seed. Mowing regularly keeps local counts lower.',
      'Bermuda and Timothy grasses are among the most allergenic species.',
      'Wearing sunglasses outside can reduce eye exposure to pollen by up to 50%.',
      'Showering before bed removes pollen that collects in your hair and on your skin throughout the day.',
    ],
  },
  tree: {
    fill: '#6ee7b7', border: '#0d9488',
    emoji: '🌳', label: 'Tree',
    facts: [
      'Trees pollinate in early spring, often before their leaves even appear.',
      'Tree pollen can travel over 400 miles on the wind.',
      'Oak, birch, and cedar produce the most allergenic pollen of any trees.',
      'Birch trees release pollen for just 3-4 weeks, but it is one of the most intense allergy seasons.',
      'Some people allergic to birch pollen also react to apples, peaches, and almonds. This is called oral allergy syndrome.',
      'Conifers like pine produce massive yellow clouds of pollen but it is rarely allergenic.',
      'In warmer climates, trees can start releasing pollen as early as January.',
      'Only the male flowers of trees produce pollen. Female flowers do not.',
    ],
  },
  weed: {
    fill: '#fde68a', border: '#d97706',
    emoji: '🌾', label: 'Weed',
    facts: [
      'One ragweed plant releases up to 1 billion pollen grains per season.',
      'Weed pollen peaks in late summer, just after grass and tree seasons end.',
      'Weed pollen is so light it can drift hundreds of miles from its source.',
      'Ragweed pollen has been detected 400 miles offshore and 2 miles up in the atmosphere.',
      'Mugwort is the ragweed of Europe, the most common weed allergen there.',
      'Weed pollination is triggered by decreasing daylight hours in late summer.',
      "Lamb's quarters, a common roadside weed, produces so much pollen it can coat sidewalks yellow.",
      'A single season of heavy ragweed exposure can be enough to develop a lasting allergy.',
    ],
  },
};

const RAIN_FACTS = [
  'Rain washes pollen from the air. Counts drop up to 90% after a downpour.',
  'Your immune system mistakes harmless pollen for a threat, releasing histamine and causing sneezing, itching, and inflammation.',
  'Pollen grains are 10-100 micrometers wide, invisible to the naked eye but potent enough to trigger full-body reactions.',
  'Warm, sunny days after cold nights cause plants to release stored pollen all at once, the worst days for allergy sufferers.',
  'Indoor air can have 2x the pollen of outdoor air if windows are left open during high-pollen hours.',
  '"Hay fever" is a misnomer. It is caused by pollen, not hay, and does not actually cause a fever.',
  'Allergy medications work best when taken before exposure, not after symptoms have already started.',
  'Climate change is extending pollen seasons and increasing annual pollen counts worldwide.',
  'Air purifiers with HEPA filters can remove 99.97% of airborne particles, including pollen.',
  'Pollen counts are measured and reported as grains per cubic meter of air.',
  'Athletes often experience worse pollen reactions because they breathe more air during exercise.',
  'Antihistamines block histamine receptors. They do not stop pollen, just your body\'s reaction to it.',
];

type FactEntry = { text: string; emoji: string };

interface Cloud { id: number; x: number; cy: number; type: CType; passed: boolean; }
interface Drop  { id: number; x: number; y: number; }
interface GS {
  y: number; vy: number;
  clouds: Cloud[]; drops: Drop[];
  frame: number; score: number; speed: number;
  nextId: number; slowFrames: number;
  distSinceCloud: number;
  dead: boolean; bgX: number;
  collectedFacts: FactEntry[];
}

function freshState(): GS {
  return {
    y: LH / 2 - 15, vy: 0,
    clouds: [], drops: [],
    frame: 0, score: 0, speed: INIT_SPEED,
    nextId: 1, slowFrames: 0,
    distSinceCloud: CLOUD_SPACING * 0.55,
    dead: false, bgX: 0,
    collectedFacts: [],
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gsRef     = useRef<GS>(freshState());
  const rafRef    = useRef<number>(0);
  const usedFacts = useRef(new Set<string>());
  const factTimer = useRef<ReturnType<typeof setTimeout>>();

  const [phase, setPhase]                       = useState<Phase>('intro');
  const [displayScore, setDisplayScore]         = useState(0);
  const [fact, setFact]                         = useState<FactEntry | null>(null);
  const [collectedFacts, setCollectedFacts]     = useState<FactEntry[]>([]);
  const [highScore, setHighScore]               = useState(() => Number(localStorage.getItem('pp_game_highscore') ?? 0));
  const [isNewRecord, setIsNewRecord]           = useState(false);

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
    gsRef.current.collectedFacts.push({ text, emoji });
    factTimer.current = setTimeout(() => setFact(null), 3800);
  }, []);

  const cbRef = useRef({ pickFact, showFact });
  useEffect(() => { cbRef.current = { pickFact, showFact }; });

  // ── Canvas draw ────────────────────────────────────────────────────────────
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

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, dh);
    skyGrad.addColorStop(0, '#bae6fd');
    skyGrad.addColorStop(1, '#f0f9ff');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, dw, dh);

    // Decorative parallax clouds
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
      const info    = CINFO[c.type];
      const cx      = c.x * sx;
      const cw      = CLOUD_W * sx;
      const gapTop  = (c.cy - GAP_H / 2) * sy;
      const gapBot  = (c.cy + GAP_H / 2) * sy;
      const groundY = (LH - GROUND_H) * sy;

      // Top block
      if (gapTop > 0) {
        rrect(ctx, cx, 0, cw, gapTop, 10 * sx);
        ctx.fillStyle = info.fill + 'dd';
        ctx.fill();
        ctx.strokeStyle = info.border;
        ctx.lineWidth = 1.5 * sx;
        ctx.stroke();
        ctx.fillStyle = info.border + '90';
        for (let p = 0; p < 4; p++) {
          ctx.beginPath();
          ctx.arc(cx + (10 + p * 16) * sx, Math.min(gapTop * 0.5 + p * 9 * sy, gapTop - 5 * sy), 2.5 * sx, 0, Math.PI * 2);
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

      // Label above top block — white pill for contrast
      const labelY = gapTop - 5 * sy;
      if (labelY > 14 * sy) {
        const labelText = `${info.emoji} ${info.label}`;
        ctx.font = `bold ${11 * sx}px system-ui, sans-serif`;
        const tw   = ctx.measureText(labelText).width;
        const lpad = 5 * sx;
        const lh   = 17 * sy;
        rrect(ctx, cx + cw / 2 - tw / 2 - lpad, labelY - lh, tw + lpad * 2, lh, 5 * sx);
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.fill();
        ctx.fillStyle = '#111827';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(labelText, cx + cw / 2, labelY - 2 * sy);
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

    // Slow-mo progress bar
    if (gs.slowFrames > 0) {
      ctx.fillStyle = 'rgba(56,189,248,0.50)';
      ctx.fillRect(0, 0, (gs.slowFrames / SLOW_FRAMES) * dw, 4);
    }

    // Score (right) and high score (left) — white pills for contrast
    ctx.font = `bold ${12 * sx}px system-ui, sans-serif`;
    const spad = 5 * sx;

    const scoreText = `${gs.score} pts`;
    const scoreW    = ctx.measureText(scoreText).width;
    rrect(ctx, (LW - 10) * sx - scoreW - spad * 2, 8 * sy, scoreW + spad * 2, 18 * sy, 6 * sx);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(scoreText, (LW - 10) * sx - spad, 10 * sy);

    const hs = Number(localStorage.getItem('pp_game_highscore') ?? 0);
    if (hs > 0) {
      const hsText = `Best: ${hs}`;
      const hsW    = ctx.measureText(hsText).width;
      rrect(ctx, 10 * sx, 8 * sy, hsW + spad * 2, 18 * sy, 6 * sx);
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fill();
      ctx.fillStyle = '#6b7280';
      ctx.textAlign = 'left';
      ctx.fillText(hsText, 10 * sx + spad, 10 * sy);
    }
  }, []);

  // ── Game loop ──────────────────────────────────────────────────────────────
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

    function die() {
      gs.y    = Math.max(PLANE_R, Math.min(LH - GROUND_H - PLANE_R, gs.y));
      gs.dead = true;
      draw();
      setDisplayScore(gs.score);
      setCollectedFacts([...gs.collectedFacts]);
      setIsNewRecord(gs.score > 0 && gs.score > Number(localStorage.getItem('pp_game_highscore') ?? 0));
      if (gs.score > Number(localStorage.getItem('pp_game_highscore') ?? 0)) {
        localStorage.setItem('pp_game_highscore', String(gs.score));
        setHighScore(gs.score);
      }
      setPhase('dead');
    }

    if (gs.y - PLANE_R <= 0 || gs.y + PLANE_R >= LH - GROUND_H) { die(); return; }

    // Spawn cloud
    gs.distSinceCloud += gs.speed * slow;
    if (gs.distSinceCloud >= CLOUD_SPACING) {
      gs.distSinceCloud = 0;
      const type  = CTYPES[Math.floor(Math.random() * CTYPES.length)];
      const minCY = GAP_H / 2 + 20;
      const maxCY = LH - GROUND_H - GAP_H / 2 - 10;
      const cy    = rnd(minCY, maxCY);
      gs.clouds.push({ id: gs.nextId++, x: LW + CLOUD_W / 2, cy, type, passed: false });
      if (Math.random() < 0.45) {
        gs.drops.push({ id: gs.nextId++, x: LW + CLOUD_W / 2, y: cy });
      }
    }

    // Move clouds + collision
    for (const c of gs.clouds) {
      c.x -= gs.speed * slow;
      const withinX = PLANE_X + PLANE_R > c.x + 3 && PLANE_X - PLANE_R < c.x + CLOUD_W - 3;
      if (withinX) {
        const gapTop = c.cy - GAP_H / 2;
        const gapBot = c.cy + GAP_H / 2;
        if (gs.y - PLANE_R < gapTop || gs.y + PLANE_R > gapBot) { die(); return; }
      }
      if (!c.passed && c.x + CLOUD_W < PLANE_X - PLANE_R) {
        c.passed  = true;
        gs.score += 10;
        const info = CINFO[c.type];
        cbRef.current.showFact(cbRef.current.pickFact(info.facts), info.emoji);
      }
    }
    gs.clouds = gs.clouds.filter(c => c.x + CLOUD_W > -20);

    // Move drops + collection
    for (const d of gs.drops) {
      d.x -= gs.speed * slow;
      const dx = PLANE_X - d.x;
      const dy = gs.y - d.y;
      if (Math.sqrt(dx * dx + dy * dy) < PLANE_R + DROP_R) {
        gs.drops      = gs.drops.filter(dr => dr.id !== d.id);
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
    setCollectedFacts([]);
    setDisplayScore(0);
    setIsNewRecord(false);
    setPhase('playing');
  }

  useEffect(() => {
    if (phase === 'playing') {
      rafRef.current = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(rafRef.current);
    }
  }, [phase, loop]);

  useEffect(() => {
    if (phase !== 'playing') {
      const id = requestAnimationFrame(draw);
      return () => cancelAnimationFrame(id);
    }
  }, [phase, draw]);

  useEffect(() => {
    if (phase !== 'playing') return;
    function onKey(e: KeyboardEvent) {
      if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, jump]);

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    clearTimeout(factTimer.current);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-900">
      <div className="flex flex-col flex-1 min-h-0">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-sky-50 dark:bg-sky-900/30 border-b border-sky-100 dark:border-sky-800 shrink-0">
          <div>
            <div className="font-bold text-sky-900 dark:text-sky-100 text-sm">✈️ Pollen Pilot: The Game</div>
            {checkInsRemaining > 0 && (
              <div className="text-xs text-sky-600 dark:text-sky-400">
                {checkInsRemaining} check-in{checkInsRemaining !== 1 ? 's' : ''} until your ML model activates
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 w-8 h-8 flex items-center justify-center text-xl"
          >
            ✕
          </button>
        </div>

        {/* Canvas area — fills all remaining screen space */}
        <div className="relative flex-1 min-h-0 bg-sky-100 dark:bg-sky-950">
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ display: 'block', touchAction: 'none' }}
            onClick={phase === 'playing' ? jump : undefined}
            onTouchStart={e => { e.preventDefault(); if (phase === 'playing') jump(); }}
          />

          {/* Fact card during play */}
          {fact && (
            <div className="absolute bottom-3 left-3 right-3 bg-white dark:bg-gray-800 rounded-xl p-3 shadow-xl border border-gray-200 dark:border-gray-600 flex gap-2.5 items-start pointer-events-none">
              <span className="text-xl leading-none mt-0.5 shrink-0">{fact.emoji}</span>
              <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">{fact.text}</p>
            </div>
          )}

          {/* Intro */}
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

          {/* Game over — scrollable, shows collected facts */}
          {phase === 'dead' && (
            <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-sm overflow-y-auto">
              <div className="flex flex-col items-center pt-6 pb-3">
                <div className="text-4xl mb-2">💨</div>
                <h3 className="font-bold text-white text-lg mb-2">Pollen got you!</h3>
                {isNewRecord ? (
                  <div className="bg-amber-400 text-amber-900 font-bold text-xs px-3 py-1 rounded-full mb-1">
                    New Record!
                  </div>
                ) : null}
                <p className="text-white text-xl font-bold mb-0.5">{displayScore} pts</p>
                {!isNewRecord && highScore > 0 && (
                  <p className="text-gray-400 text-xs mb-3">Best: {highScore} pts</p>
                )}
                <div className="mb-4" />
                <button
                  onClick={startGame}
                  className="bg-sky-500 text-white font-semibold px-8 py-2.5 rounded-xl text-sm hover:bg-sky-600 active:scale-95 transition-all"
                >
                  Try Again
                </button>
              </div>

              {collectedFacts.length > 0 && (
                <div className="px-3 pb-5">
                  <div className="text-xs font-semibold text-sky-400 uppercase tracking-wide mb-2 text-center">
                    What you learned
                  </div>
                  <div className="space-y-2">
                    {collectedFacts.map((f, i) => (
                      <div key={i} className="bg-white/10 rounded-xl p-2.5 flex gap-2.5 items-start">
                        <span className="text-lg leading-none shrink-0 mt-0.5">{f.emoji}</span>
                        <p className="text-xs text-white/90 leading-relaxed">{f.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="py-2.5 px-4 text-center text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800 shrink-0">
          {phase === 'playing'
            ? 'Tap / Space to flap ↑  •  Collect 💧 to slow down'
            : 'Each gap you clear teaches you something new 🌿'}
        </div>
    </div>
    </div>
  );
}
