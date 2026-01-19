/**
 * OffersSlider.js
 * Carrousel d'offres avec auto-play
 * Composant extrait de App.js
 */

import { useState, useEffect, useRef } from 'react';
import { OfferCardSlider } from './OfferCard';

export const OffersSliderAutoPlay = ({ offers, selectedOffer, onSelectOffer }) => {
  const sliderRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  // Largeur d'une carte + padding
  const CARD_WIDTH = 308; // 300px + 8px padding
  const AUTO_PLAY_INTERVAL = 3500; // 3.5 secondes entre chaque slide
  
  // Auto-play effect
  useEffect(() => {
    if (!offers || offers.length <= 1 || isPaused || selectedOffer) return;
    
    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        const nextIndex = (prev + 1) % offers.length;
        // Scroll to the next card
        if (sliderRef.current) {
          sliderRef.current.scrollTo({
            left: nextIndex * CARD_WIDTH,
            behavior: 'smooth'
          });
        }
        return nextIndex;
      });
    }, AUTO_PLAY_INTERVAL);
    
    return () => clearInterval(interval);
  }, [offers, isPaused, selectedOffer]);
  
  // Reset auto-play when offers change
  useEffect(() => {
    setCurrentIndex(0);
    if (sliderRef.current) {
      sliderRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  }, [offers]);
  
  // Pause auto-play on user interaction
  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);
  const handleTouchStart = () => setIsPaused(true);
  const handleTouchEnd = () => {
    // Resume after a delay to allow swipe navigation
    setTimeout(() => setIsPaused(false), 5000);
  };
  
  // Handle manual scroll - update current index based on scroll position
  const handleScroll = () => {
    if (sliderRef.current) {
      const scrollLeft = sliderRef.current.scrollLeft;
      const newIndex = Math.round(scrollLeft / CARD_WIDTH);
      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < offers.length) {
        setCurrentIndex(newIndex);
      }
    }
  };
  
  if (!offers || offers.length === 0) {
    return <p className="text-white/60 text-center py-4">Aucune offre disponible</p>;
  }
  
  return (
    <div 
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slider Container */}
      <div 
        ref={sliderRef}
        onScroll={handleScroll}
        className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-4 hide-scrollbar"
        style={{ 
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          paddingTop: '30px',  /* Espace pour que le glow ne soit pas coupé - 30px */
          marginTop: '-10px'   /* Compense partiellement le padding pour l'alignement */
        }}
        data-testid="offers-slider"
      >
        {offers.map((offer) => (
          <OfferCardSlider
            key={offer.id}
            offer={offer}
            selected={selectedOffer?.id === offer.id}
            onClick={() => onSelectOffer(offer)}
          />
        ))}
      </div>
      
      {/* Indicateurs de pagination (points) - Visibles uniquement s'il y a plusieurs offres */}
      {offers.length > 1 && (
        <div className="flex justify-center gap-2 mt-2">
          {offers.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentIndex(idx);
                setIsPaused(true);
                if (sliderRef.current) {
                  sliderRef.current.scrollTo({
                    left: idx * CARD_WIDTH,
                    behavior: 'smooth'
                  });
                }
                // Resume after delay
                setTimeout(() => setIsPaused(false), 5000);
              }}
              className={`transition-all duration-300 rounded-full ${
                idx === currentIndex 
                  ? 'w-6 h-2 bg-pink-500' 
                  : 'w-2 h-2 bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`Aller à l'offre ${idx + 1}`}
              data-testid={`offer-dot-${idx}`}
            />
          ))}
        </div>
      )}
      
      {/* Indicateur visuel d'auto-play actif */}
      {offers.length > 1 && !selectedOffer && !isPaused && (
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/50 text-xs text-white/70">
          <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse"></span>
          Auto
        </div>
      )}
    </div>
  );
};

export default OffersSliderAutoPlay;
