import React, { useState, useRef } from 'react';
import { X, Star } from 'lucide-react';

const VideoPlayer = ({ videoSrc, videoId, initialRating = 0, onRate, onClose }) => {
  const [showOverlay, setShowOverlay] = useState(false);
  const [rating, setRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(0);
  const videoRef = useRef(null);

  const handleRating = (score) => {
    setRating(score);
    if (onRate) onRate(videoId, score);
    // Optional: Close overlay after rating
    setTimeout(() => setShowOverlay(false), 500); 
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden shadow-2xl">
      
      {/* 1. The Video Player */}
      <video
        ref={videoRef}
        src={videoSrc}
        className="w-full h-full object-cover cursor-pointer"
        loop
        autoPlay
        playsInline
        muted={false} 
        onClick={() => setShowOverlay(true)} // Tap video -> Show Overlay
      />

      {/* 2. The Title Overlay (Visible when interactive overlay is CLOSED) */}
      {!showOverlay && (
        <div className="absolute bottom-12 left-0 w-full text-center pointer-events-none animate-pulse">
           <p className="text-white/50 text-xs uppercase tracking-widest">Tap to Rate / Close</p>
        </div>
      )}

      {/* 3. The Interactive Overlay (Visible when Tapped) */}
      {showOverlay && (
        <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-200">
          
          {/* Close Button (Red X) */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              // If onClose is provided (Feed view), close the video. 
              // If not, just close the overlay.
              if (onClose) onClose(); 
              else setShowOverlay(false);
            }}
            className="absolute top-8 right-8 p-3 bg-white/10 rounded-full hover:bg-white/20 transition transform hover:scale-110"
          >
            <X className="w-10 h-10 text-red-500" strokeWidth={4} />
          </button>

          {/* Star Rating System */}
          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((starIndex) => {
              const isFilled = starIndex <= (hoverRating || rating);
              return (
                <button
                  key={starIndex}
                  className="transition-transform transform hover:scale-125 focus:outline-none"
                  onMouseEnter={() => setHoverRating(starIndex)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => handleRating(starIndex)}
                >
                  <Star
                    size={42}
                    className={`transition-colors duration-200 ${
                      isFilled 
                        ? "fill-yellow-400 text-yellow-400" 
                        : "text-gray-500 fill-transparent"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          <p className="text-white font-black tracking-widest text-lg uppercase">
            Rate this TGTBT
          </p>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;