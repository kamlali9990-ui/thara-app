import { useState, useEffect, useRef, useCallback } from 'react';

const SIZE = 15;
const TILE = 14;
const CANVAS = SIZE * TILE;

function randPos() {
  return { x: Math.floor(Math.random() * SIZE), y: Math.floor(Math.random() * SIZE) };
}

function eq(a, b) { return a.x === b.x && a.y === b.y; }

export default function SnakeGame() {
  const canvasRef = useRef(null);
  const [snake, setSnake] = useState([{ x: 7, y: 7 }]);
  const [food, setFood] = useState(randPos);
  const [dir, setDir] = useState({ x: 1, y: 0 });
  const [nextDir, setNextDir] = useState({ x: 1, y: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const handleKey = (e) => {
      if (!running || gameOver) return;
      const k = e.key.replace('Arrow', '').toLowerCase();
      const map = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
      const nd = map[k];
      if (!nd) return;
      if (nd.x === -dir.x && nd.y === -dir.y) return;
      setNextDir(nd);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
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
      if (!ate) next.pop(); else { setFood(randPos); setScore(s => s + 1); }
      return next;
    });
  }, [nextDir, food]);

  useEffect(() => {
    if (!running || gameOver) return;
    const id = setInterval(tick, 140);
    return () => clearInterval(id);
  }, [running, gameOver, tick]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#0a1f14';
    ctx.fillRect(0, 0, CANVAS, CANVAS);
    snake.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? '#22c55e' : '#16a34a';
      ctx.fillRect(s.x * TILE + 1, s.y * TILE + 1, TILE - 2, TILE - 2);
    });
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(food.x * TILE + TILE / 2, food.y * TILE + TILE / 2, TILE / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
  }, [snake, food]);

  const start = () => {
    setSnake([{ x: 7, y: 7 }]);
    setDir({ x: 1, y: 0 });
    setNextDir({ x: 1, y: 0 });
    setFood(randPos);
    setScore(0);
    setGameOver(false);
    setRunning(true);
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
      <p style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
        🐍 استخدم الأسهم للعب
      </p>
      <canvas ref={canvasRef} width={CANVAS} height={CANVAS}
        style={{ borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', display: 'block', margin: '0 auto' }} />
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
