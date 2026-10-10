import React, { useEffect, useRef, useState } from 'react';

interface BackgroundVideoProps {
  videoSrc?: string;
  posterSrc?: string;
  className?: string;
}

export const BackgroundVideo: React.FC<BackgroundVideoProps> = ({
  // Default high-performance nature stream or fallback
  videoSrc = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 
  posterSrc = '/src/assets/images/cinematic_manali_landscape_1791639623052.jpg',
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [opacity, setOpacity] = useState<number>(0);
  const [hasError, setHasError] = useState<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || hasError) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setOpacity(0.9);
      return;
    }

    let isFadingOut = false;

    const handleTimeUpdate = () => {
      if (!video.duration || isNaN(video.duration)) return;

      const timeLeft = video.duration - video.currentTime;

      // Start fade out in the last 0.6 seconds
      if (timeLeft <= 0.6 && !isFadingOut) {
        isFadingOut = true;
        setOpacity(0);
      }
    };

    const handleEnded = () => {
      setOpacity(0);
      setTimeout(() => {
        if (video) {
          video.currentTime = 0;
          isFadingOut = false;
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                setOpacity(1);
              })
              .catch(() => {
                setHasError(true);
              });
          }
        }
      }, 100);
    };

    const handleCanPlay = () => {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // Smooth 500ms fade-in
            setTimeout(() => setOpacity(1), 50);
          })
          .catch(() => {
            // If autoplay is blocked, gracefully fall back to poster
            setOpacity(1);
          });
      }
    };

    const handleError = () => {
      setHasError(true);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [hasError]);

  return (
    <div className={`absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none ${className}`}>
      {/* Fallback & Poster layer (high-fidelity 8k cinematic landscape) */}
      <img
        src={posterSrc}
        alt="Scenic Himalayan Valley of Manali"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover object-center scale-105 transition-transform duration-1000 ease-out"
      />

      {/* Continuously moving video layer with controlled fade loop */}
      {!hasError && (
        <video
          ref={videoRef}
          src={videoSrc}
          poster={posterSrc}
          autoPlay
          muted
          playsInline
          loop={false}
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700 ease-in-out"
          style={{ opacity }}
        />
      )}

      {/* Atmospheric gradient blending overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/40" />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-slate-950/60" />
      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-slate-950/90 to-transparent" />
    </div>
  );
};
