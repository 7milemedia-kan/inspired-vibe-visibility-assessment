import { useEffect, useRef, useState } from 'react';

export function SectionBackground() {
  const video = useRef<HTMLVideoElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { setEnabled(!preference.matches); setPlaying(!preference.matches); };
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!video.current) return;
    if (playing) video.current.play().catch(() => setPlaying(false));
    else video.current.pause();
  }, [playing, enabled]);

  return <>
    <div className="section-video-background" aria-hidden="true">
      {enabled && <video ref={video} autoPlay muted loop playsInline preload="metadata" onError={() => setEnabled(false)}>
        <source src="/media/section-background.mp4" type="video/mp4" />
      </video>}
      <div className="section-video-overlay" />
    </div>
    {enabled && <button type="button" className="section-video-toggle" onClick={() => setPlaying(value => !value)}>{playing ? 'Pause background' : 'Play background'}</button>}
  </>;
}
