/**
 * AudioPlayer.js
 * Lecteur audio immersif - Composant extrait de App.js
 * Affiche un mini-player fixé en bas de l'écran
 */

import { useRef, useState, useEffect } from 'react';

export const AudioPlayer = ({ 
  course, 
  isVisible, 
  onClose 
}) => {
  const audioRef = useRef(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0.7);

  // Reset track index when course changes
  useEffect(() => {
    setCurrentTrackIndex(0);
    setIsPlaying(false);
  }, [course?.id]);

  // Sync volume with audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = audioVolume;
    }
  }, [audioVolume]);

  if (!isVisible || !course?.playlist?.length) return null;

  const playlist = course.playlist;

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(console.error);
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handlePrevTrack = () => {
    const newIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
    setCurrentTrackIndex(newIndex);
    if (audioRef.current && isPlaying) {
      audioRef.current.load();
      audioRef.current.play().catch(console.error);
    }
  };

  const handleNextTrack = () => {
    const newIndex = (currentTrackIndex + 1) % playlist.length;
    setCurrentTrackIndex(newIndex);
    if (audioRef.current && isPlaying) {
      audioRef.current.load();
      audioRef.current.play().catch(console.error);
    }
  };

  const handleClose = () => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    onClose();
  };

  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    setAudioVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  };

  const handleTrackEnded = () => {
    const nextIndex = (currentTrackIndex + 1) % playlist.length;
    setCurrentTrackIndex(nextIndex);
    if (audioRef.current) {
      audioRef.current.load();
      audioRef.current.play().catch(console.error);
    }
  };

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50 p-4"
      style={{
        background: 'linear-gradient(to top, #000000, rgba(0,0,0,0.95))',
        borderTop: '1px solid rgba(217, 28, 210, 0.3)',
        boxShadow: '0 -10px 30px rgba(0,0,0,0.8)'
      }}
    >
      <div className="max-w-lg mx-auto">
        {/* Header avec fermeture */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎧</span>
            <div>
              <p className="text-white text-sm font-medium">Expérience immersive</p>
              <p className="text-white/50 text-xs truncate max-w-[200px]">
                {course.name}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            style={{ color: '#fff' }}
            data-testid="close-audio-player"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Contrôles audio */}
        <div className="flex items-center gap-4">
          {/* Bouton Play/Pause */}
          <button
            onClick={handlePlayPause}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{
              background: 'linear-gradient(135deg, #d91cd2, #8b5cf6)',
              boxShadow: isPlaying ? '0 0 20px rgba(217, 28, 210, 0.5)' : 'none'
            }}
            data-testid="audio-play-pause"
          >
            {isPlaying ? (
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              </svg>
            ) : (
              <svg className="w-5 h-5 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>

          {/* Piste suivante/précédente (si plusieurs pistes) */}
          {playlist.length > 1 && (
            <>
              <button
                onClick={handlePrevTrack}
                className="p-2 rounded-full hover:bg-white/10"
                style={{ color: '#fff' }}
                data-testid="audio-prev"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z"/>
                </svg>
              </button>
              <button
                onClick={handleNextTrack}
                className="p-2 rounded-full hover:bg-white/10"
                style={{ color: '#fff' }}
                data-testid="audio-next"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zm2 0V6l6.5 6L8 18zm8-12h2v12h-2V6z"/>
                </svg>
              </button>
            </>
          )}

          {/* Contrôle du volume */}
          <div className="flex items-center gap-2 flex-1">
            <svg className="w-4 h-4 text-white/60" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
            </svg>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={audioVolume}
              onChange={handleVolumeChange}
              className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #d91cd2 0%, #d91cd2 ${audioVolume * 100}%, rgba(255,255,255,0.2) ${audioVolume * 100}%, rgba(255,255,255,0.2) 100%)`
              }}
              data-testid="audio-volume"
            />
            <svg className="w-5 h-5 text-white/60" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
          </div>
        </div>

        {/* Info piste actuelle */}
        <div className="mt-3 text-center">
          <p className="text-white/40 text-xs">
            Piste {currentTrackIndex + 1} / {playlist.length}
          </p>
        </div>

        {/* Élément audio caché */}
        <audio
          ref={audioRef}
          src={playlist[currentTrackIndex]}
          onEnded={handleTrackEnded}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      </div>
    </div>
  );
};

export default AudioPlayer;
