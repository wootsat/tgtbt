'use client'
import { useRef, useEffect, useState } from 'react'
import { X, Star, MessageCircle, Play, Volume2, VolumeX, Share2 } from 'lucide-react'
import CommentsOverlay from '@/components/CommentsOverlay' 

export default function VideoPlayer({ videoSrc, videoId, initialRating, initialCommentCount = 0, onRate, onClose, onUserClick }) {
  const videoRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [rating, setRating] = useState(initialRating || 0)
  const [userRating, setUserRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [showComments, setShowComments] = useState(false) 
  
  // Default to muted to ensure autoplay works on mobile/fresh loads
  const [isMuted, setIsMuted] = useState(true)
  const [commentCount, setCommentCount] = useState(initialCommentCount)

  // --- ROBUST AUTOPLAY LOGIC ---
  useEffect(() => {
    const startVideo = async () => {
      if (!videoRef.current) return

      try {
        // 1. Try to play (browser might block this if unmuted)
        await videoRef.current.play()
        setIsPlaying(true)
      } catch (err) {
        console.log("Autoplay with sound blocked. Switching to muted.")
        // 2. If blocked, force mute and play again
        if (videoRef.current) {
          videoRef.current.muted = true
          setIsMuted(true)
          try {
            await videoRef.current.play()
            setIsPlaying(true)
          } catch (e) {
            console.error("Autoplay failed completely", e)
            setIsPlaying(false)
          }
        }
      }
    }

    startVideo()
  }, [videoId]) // Run whenever videoId changes

  const togglePlay = (e) => {
    e.stopPropagation()
    if (videoRef.current.paused) {
      videoRef.current.play()
      setIsPlaying(true)
    } else {
      videoRef.current.pause()
      setIsPlaying(false)
    }
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
      try {
        await navigator.share({
          title: 'Check out this video on TGTBT',
          url: shareUrl
        })
      } catch (err) {
        console.log('Share canceled')
      }
    } else {
      navigator.clipboard.writeText(shareUrl)
      alert('Link copied to clipboard!')
    }
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black">
      
      {/* Close Button */}
      <button onClick={onClose} className="absolute top-4 right-4 z-50 text-white/80 hover:text-white bg-black/40 rounded-full p-2 backdrop-blur-sm">
        <X size={28} />
      </button>

      {/* Main Video Element */}
      <video 
        ref={videoRef}
        src={videoSrc}
        className="max-h-full max-w-full w-auto h-auto object-contain cursor-pointer"
        loop
        playsInline
        autoPlay
        muted={isMuted}
        onClick={togglePlay}
      />

      {/* --- WATERMARK LOGO (UPDATED SIZE) --- */}
      <img 
        src="/tgtbt_logo.png" 
        alt="TGTBT" 
        // Changed w-16 to w-80 (5x bigger). Adjusted bottom/right spacing slightly.
        className="absolute bottom-8 right-8 w-80 h-auto opacity-50 pointer-events-none z-10 select-none"
      />
      {/* ------------------------------------- */}

      {/* Big Play Icon Overlay (Only shows if paused) */}
      {!isPlaying && !showComments && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <Play size={64} className="text-white/50" fill="currentColor" />
        </div>
      )}

      {/* Controls Overlay */}
      {!showComments && (
        <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-20">
          <div className="flex flex-col gap-4 items-center animate-in slide-in-from-bottom-4">
            
            {/* Star Ratings */}
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => handleRate(star)}
                  className="transition transform hover:scale-125 focus:outline-none"
                >
                  <Star 
                    size={32} 
                    className={star <= (hoverRating || userRating || rating) ? "text-yellow-400 fill-yellow-400 drop-shadow-lg" : "text-gray-500"} 
                  />
                </button>
              ))}
            </div>

            {/* Bottom Buttons */}
            <div className="flex items-center gap-6 mt-2">
              {/* Mute Button */}
              <button onClick={toggleMute} className="text-white/80 hover:text-white transition">
                {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
              </button>

              {/* Comments Button */}
              <button 
                onClick={() => setShowComments(true)}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full backdrop-blur-md border border-white/10 transition"
              >
                <MessageCircle size={20} />
                <span className="text-sm font-bold">Comments ({commentCount})</span>
              </button>

              {/* Share Button */}
              <button 
                onClick={handleShare}
                className="text-white/80 hover:text-white transition transform hover:scale-110"
              >
                <Share2 size={24} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comments Modal Overlay */}
      {showComments && (
        <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
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