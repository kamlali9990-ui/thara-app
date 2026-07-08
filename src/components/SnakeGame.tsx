import { useState, useEffect, useRef, useCallback } from 'react';

const SIZE = 15;
const TILE = 16;
const CANVAS = SIZE * TILE;

interface Point { x: number; y: number; }

function randPos(snake: Point[]): Point {
  let p: Point;
  do { p = { x: Math.floor(Math.random() * SIZE), y: Math.floor(Math.random() * SIZE) }; }
  while (snake && snake.some(s => s.x === p.x && s.y === p.y));
  return p;
}

function eq(a: Point, b: Point) { return a.x === b.x && a.y === b.y; }

function speedForScore(s: number) { return Math.max(60, 140 - s * 4); }

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const touchStart = useRef<Point | null>(null);

  const [snake, setSnake] = useState<Point[]>(() => [{ x: 7, y: 7 }]);
  const [food, setFood] = useState<Point>(() => randPos([]));
  const [dir, setDir] = useState<Point>({ x: 1, y: 0 });
  const [nextDir, setNextDir] = useState<Point>({ x: 1, y: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(false);
  const speedRef = useRef(140);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!running || gameOver) return;
      const k = e.key.replace('Arrow', '').toLowerCase();
      const map: Record<string, Point> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
      const nd = map[k];
      if (!nd) return;
      if (nd.x === -dir.x && nd.y === -dir.y) return;
      setNextDir(nd);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [dir, running, gameOver]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!running || gameOver) return;
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }, [running, gameOver]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current || !running || gameOver) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    const nd = Math.abs(dx) > Math.abs(dy)
      ? { x: dx > 0 ? 1 : -1, y: 0 }
      : { x: 0, y: dy > 0 ? 1 : -1 };
    if (nd.x === -dir.x && nd.y === -dir.y) return;
    setNextDir(nd);
  }, [dir, running, gameOver]);

  const tick = useCallback(() => {
    setSnake(prev => {
      setDir(nextDir);
      const head = { x: prev[0].x + nextDir.x, y: prev[0].y + nextDir.y };
      if (head.x < 0 || head.x >= SIZE || head.y < 0 || head.y >= SIZE || prev.some(s => eq(s, head))) {
        setGameOver(true); setRunning(false); return prev;
      }
      const ate = eq(head, food);
      const next = [head, ...prev];
      if (!ate) next.pop(); else { setFood(randPos(next)); setScore(s => { const ns = s + 1; speedRef.current = speedForScore(ns); return ns; }); }
      return next;
    });
  }, [nextDir, food]);

  useEffect(() => {
    if (!running || gameOver) return;
    speedRef.current = speedForScore(score);
    const id = setInterval(tick, speedRef.current);
    return () => clearInterval(id);
  }, [running, gameOver, tick, score]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#0a1f14';
    ctx.fillRect(0, 0, CANVAS, CANVAS);
    ctx.shadowBlur = 0;

    snake.forEach((s, i) => {
      const x = s.x * TILE, y = s.y * TILE;
      if (i === 0) {
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 6;
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.roundRect(x + 1, y + 1, TILE - 2, TILE - 2, 4);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        const ed = nextDir;
        ctx.beginPath();
        ctx.arc(x + 4 + ed.x * 2, y + 4 + ed.y * 2, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + TILE - 4 + ed.x * 2, y + TILE - 4 + ed.y * 2, 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const t = i / snake.length;
        const r = Math.round(18 + t * 8);
        const g = Math.round(140 + t * 30);
        ctx.fillStyle = `rgb(${r},${g},${r})`;
        const pad = i === snake.length - 1 ? 2 : 1;
        ctx.beginPath();
        ctx.roundRect(x + pad, y + pad, TILE - pad * 2, TILE - pad * 2, 3);
        ctx.fill();
      }
    });

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(food.x * TILE + TILE / 2, food.y * TILE + TILE / 2, TILE / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(food.x * TILE + TILE / 2 - 1, food.y * TILE + TILE / 2 - 1, 2, 0, Math.PI * 2);
    ctx.fill();
  }, [snake, food, nextDir]);

  const start = () => {
    setSnake([{ x: 7, y: 7 }]);
    setDir({ x: 1, y: 0 });
    setNextDir({ x: 1, y: 0 });
    setFood(randPos([]));
    setScore(0);
    setGameOver(false);
    setRunning(true);
    speedRef.current = 140;
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
      <p style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
        🐍 اسحب أو استخدم الأسهم للعب
      </p>
      <canvas ref={canvasRef} width={CANVAS} height={CANVAS}
        onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
        style={{ borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', display: 'block', margin: '0 auto', touchAction: 'none' }} />
      <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>النقاط: {score}</span>
        {!running && (
          <button onClick={start} style={{
            background: gameOver ? '#dc2626' : '#127443',
            color: '#fff', border: 'none', padding: '0.3rem 0.8rem', borderRadius: '8px',
            fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600
          }}>
            {gameOver ? '🔄 إعادة' : '▶ بدء'}
          </button>
        )}
      </div>
    </div>
  );
}
