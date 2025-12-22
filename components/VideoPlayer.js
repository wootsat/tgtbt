'use client'
import { useRef, useEffect, useState } from 'react'
import Link from 'next/link' 
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
  startMuted = true,
  showHomeButton = false 
}) {
  const videoRef = useRef(null)
  
  const [rating, setRating] = useState(initialRating || 0)
  const [userRating, setUserRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  
  const [showControls, setShowControls] = useState(false)
  const [showComments, setShowComments] = useState(false) 
  
  // Initialize state based on prop
  const [isMuted, setIsMuted] = useState(startMuted)
  const [commentCount, setCommentCount] = useState(initialCommentCount)

  // --- PLAYBACK LOGIC ---
  useEffect(() => {
    const playVideo = async () => {
      if (!videoRef.current) return

      // 1. Force state to match props immediately
      videoRef.current.muted = startMuted
      videoRef.current.volume = 1.0 // Ensure volume is up
      setIsMuted(startMuted)

      // 2. Attempt to play via JavaScript (This works better for sound than HTML autoPlay)
      try {
        await videoRef.current.play()
      } catch (err) {
        console.warn("Playback failed:", err)
        
        // 3. Fallback: If it failed and we really need it to play (Share Link), mute it.
        // We DO NOT do this for the App (startMuted=false) because we want to avoid 
        // accidentally muting it if there's a slight millisecond delay.
        if (startMuted && videoRef.current) {
          videoRef.current.muted = true
          setIsMuted(true)
          try {
            await videoRef.current.play()
          } catch (e) {
            // Video is truly blocked
          }
        }
      }
    }

    playVideo()
  }, [startMuted, videoId])

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
      
      {/* --- HOME LOGO (Only for Share Page) --- */}
      {showHomeButton && (
        <Link 
          href="/"
          onClick={(e) => e.stopPropagation()} 
          className={`absolute top-4 left-4 z-50 transition-opacity duration-300 hover:scale-105 active:scale-95 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          <img src="/tgtbt_logo.png" alt="Home" className="h-12 w-auto drop-shadow-md" />
        </Link>
      )}

      {/* --- CLOSE BUTTON --- */}
      <button 
        onClick={onClose} 
        className={`absolute top-4 right-4 z-50 text-white hover:scale-110 bg-red-600 hover:bg-red-700 rounded-full p-3 shadow-xl backdrop-blur-sm transition-all duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <X size={36} strokeWidth={3} />
      </button>

      {/* --- VIDEO --- */}
      {/* Key Fix: REMOVED 'autoPlay'. We let the useEffect handle it. */}
      <video 
        ref={videoRef}
        src={videoSrc}
        className="max-h-full max-w-full w-auto h-auto object-contain"
        loop
        playsInline
        muted={isMuted} 
      />

      {/* Watermark */}
      <img 
        src="/tgtbt_logo.png" 
        alt="TGTBT" 
        className="absolute bottom-8 right-8 w-80 h-auto opacity-50 pointer-events-none z-10 select-none"
      />

      {/* --- CONTROLS --- */}
      {!showComments && (
        <div className={`absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-20 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="flex flex-col gap-4 items-center">
            
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={(e) => { e.stopPropagation(); handleRate(star); }}
                  className="transition transform hover:scale-125 focus:outline-none"
                >
                  <Star size={32} className={star <= (hoverRating || userRating || rating) ? "text-yellow-400 fill-yellow-400 drop-shadow-lg" : "text-gray-500"} />
                </button>
              ))}
            </div>

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