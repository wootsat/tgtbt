'use client'
import { useRef, useEffect, useState } from 'react'
import { X, Star, MessageCircle, Volume2, VolumeX, Share2 } from 'lucide-react'
import CommentsOverlay from '@/components/CommentsOverlay' 

export default function VideoPlayer({ 
  videoSrc, 
  videoId, 
  initialRating, 
  initialCommentCount = 0, 
  onRate, 
  onClose, 
  onUserClick,
  startMuted = true 
}) {
  const videoRef = useRef(null)
  
  // Rating State
  const [rating, setRating] = useState(initialRating || 0)
  const [userRating, setUserRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  
  // UI Visibility State (Default: Hidden)
  const [showControls, setShowControls] = useState(false)
  const [showComments, setShowComments] = useState(false) 
  
  // Mute state
  const [isMuted, setIsMuted] = useState(startMuted)
  const [commentCount, setCommentCount] = useState(initialCommentCount)

  // --- AUTOPLAY LOGIC (Looping & Robust) ---
  useEffect(() => {
    const startVideo = async () => {
      if (!videoRef.current) return

      videoRef.current.muted = startMuted
      setIsMuted(startMuted)

      try {
        await videoRef.current.play()
      } catch (err) {
        console.log("Autoplay blocked. Retrying muted.")
        if (videoRef.current) {
          videoRef.current.muted = true
          setIsMuted(true)
          try {
            await videoRef.current.play()
          } catch (e) {
            console.error("Autoplay failed completely", e)
          }
        }
      }
    }
    startVideo()
  }, [videoId, startMuted])

  // Toggle UI Visibility when tapping the video background
  const handleVideoClick = (e) => {
    e.stopPropagation()
    setShowControls(prev => !prev)
  }

  const handleRate = (score) => {
    setUserRating(score)
    onRate(videoId, score)
  }

  const toggleMute = (e) => {
    e.stopPropagation()
    if (!videoRef.current) return
    videoRef.current.muted = !videoRef.current.muted
    setIsMuted(videoRef.current.muted)
  }

  const handleShare = async (e) => {
    e.stopPropagation()
    if (!videoId) return alert("Error: Cannot share video (Missing ID)")
    const shareUrl = `https://tgtbt.xyz/watch/${videoId}`
    if (navigator.share) {
      try { await navigator.share({ title: 'TGTBT', url: shareUrl }) } catch (err) {}
    } else {
      navigator.clipboard.writeText(shareUrl)
      alert('Link copied!')
    }
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black" onClick={handleVideoClick}>
      
      {/* 1. Close Button (Toggles with Controls) */}
      <button 
        onClick={onClose} 
        className={`absolute top-4 right-4 z-50 text-white/80 hover:text-white bg-black/40 rounded-full p-2 backdrop-blur-sm transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <X size={28} />
      </button>

      {/* 2. Main Video Element */}
      <video 
        ref={videoRef}
        src={videoSrc}
        className="max-h-full max-w-full w-auto h-auto object-contain"
        loop
        playsInline
        autoPlay
        muted={isMuted}
        // Removed onClick here so the parent div handles the toggle
      />

      {/* 3. Watermark (Always visible, behind controls) */}
      <img 
        src="/tgtbt_logo.png" 
        alt="TGTBT" 
        className="absolute bottom-8 right-8 w-80 h-auto opacity-50 pointer-events-none z-10 select-none"
      />

      {/* 4. Bottom Controls Overlay (Toggles with Controls) */}
      {!showComments && (
        <div className={`absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-20 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="flex flex-col gap-4 items-center">
            
            {/* Star Ratings */}
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={(e) => { e.stopPropagation(); handleRate(star); }}
                  className="transition transform hover:scale-125 focus:outline-none"
                >
                  <Star 
                    size={32} 
                    className={star <= (hoverRating || userRating || rating) ? "text-yellow-400 fill-yellow-400 drop-shadow-lg" : "text-gray-500"} 
                  />
                </button>
              ))}
            </div>

            {/* Bottom Action Buttons */}
            <div className="flex items-center gap-6 mt-2">
              <button onClick={toggleMute} className="text-white/80 hover:text-white transition">
                {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
              </button>

              <button 
                onClick={(e) => { e.stopPropagation(); setShowComments(true); }}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full backdrop-blur-md border border-white/10 transition"
              >
                <MessageCircle size={20} />
                <span className="text-sm font-bold">Comments ({commentCount})</span>
              </button>

              <button onClick={handleShare} className="text-white/80 hover:text-white transition transform hover:scale-110">
                <Share2 size={24} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Comments Modal (Always visible when active) */}
      {showComments && (
        <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <CommentsOverlay 
            videoId={videoId} 
            onClose={() => setShowComments(false)} 
            isInsidePlayer={true}
            onCommentAdded={() => setCommentCount(prev => prev + 1)}
            onUserClick={onUserClick}
          />
        </div>
      )}
    </div>
  )
}