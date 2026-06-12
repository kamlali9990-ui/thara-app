import { useState, useRef, useEffect } from 'react';

export default function VoiceMessage({ url }) {
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onMeta = () => setDuration(a.duration || 0);
    const onEnd = () => { setPlaying(false); setCurrentTime(0); };
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('ended', onEnd);
    return () => { a.removeEventListener('loadedmetadata', onMeta); a.removeEventListener('ended', onEnd); };
  }, [url]);

  useEffect(() => {
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
      cancelAnimationFrame(animRef.current);
    } else {
      a.play();
      setPlaying(true);
      const update = () => {
        setCurrentTime(a.currentTime);
        animRef.current = requestAnimationFrame(update);
      };
      animRef.current = requestAnimationFrame(update);
    }
  };

  const fmt = (s) => {
    if (!s || !isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="voice-message" onClick={toggle} style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
      cursor: 'pointer', userSelect: 'none', direction: 'ltr',
      padding: '0.15rem 0'
    }}>
      <audio ref={audioRef} src={url} preload="metadata" />
      <span style={{ fontSize: '1.1rem' }}>{playing ? '⏹' : '▶️'}</span>
      <div className="voice-wave" style={{
        flex: 1, height: '24px', minWidth: '80px', position: 'relative',
        display: 'flex', alignItems: 'center'
      }}>
        <div style={{ width: '100%', height: '3px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'currentColor', borderRadius: '2px', transition: 'width 0.1s linear' }} />
        </div>
      </div>
      <span style={{ fontSize: '0.7rem', opacity: 0.7, minWidth: '2.2rem', textAlign: 'right', direction: 'ltr' }}>
        {playing ? fmt(currentTime) : fmt(duration)}
      </span>
    </div>
  );
}
