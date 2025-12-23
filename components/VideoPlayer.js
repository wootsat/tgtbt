'use client'
import { useRef, useState, useEffect } from 'react'
import Link from 'next/link' 
import { supabase } from '@/lib/supabaseClient' 
import { X, Star, MessageCircle, Volume2, VolumeX, Share2, Heart } from 'lucide-react'
import CommentsOverlay from '@/components/CommentsOverlay' 

export default function VideoPlayer({ 
  videoSrc, 
  videoId, 
  audioSrc = null, 
  initialRating, 
  initialCommentCount = 0, 
  onRate, 
  onClose, 
  onUserClick,
  startMuted = true, 
  showHomeButton = false 
}) {
  const videoRef = useRef(null)
  const audioRef = useRef(null)
  
  // Stats State
  const [rating, setRating] = useState(initialRating || 0)
  const [userRating, setUserRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [commentCount, setCommentCount] = useState(initialCommentCount)
  const [isFavorited, setIsFavorited] = useState(false)
  
  // UI State
  const [showControls, setShowControls] = useState(false)
  const [showComments, setShowComments] = useState(false) 
  const [isMuted, setIsMuted] = useState(startMuted)

  // --- INITIALIZATION ---
  useEffect(() => {
    const initPlayer = async () => {
      if (!videoId) return

      // 1. Increment View Count
      const { error } = await supabase.rpc('increment_view_count', { video_id: videoId })
      if (error) console.error("Error incrementing view:", error)

      // 2. Check Favorite Status
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('video_favorites')
          .select('id')
          .eq('user_id', user.id)
          .eq('video_id', videoId)
          .single()
        if (data) setIsFavorited(true)
      }
    }
    initPlayer()
  }, [videoId])

  // --- HANDLERS ---

  const handleShowComments = (e) => {
    e.stopPropagation()
    // KEY FIX: setTimeout pushes the state update to the end of the event loop.
    // This ensures the "click" that opens the menu is dead and gone 
    // before the "Click Outside" listener in CommentsOverlay attaches.
    setTimeout(() => setShowControls(false), 0) // Optional: Hide controls when comments open
    setTimeout(() => setShowComments(true), 0)
  }

  const toggleFavorite = async (e) => {
    e.stopPropagation()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return alert("Login to favorite videos!")

    if (isFavorited) {
      const { error } = await supabase.from('video_favorites').delete().match({ user_id: user.id, video_id: videoId })
      if (!error) setIsFavorited(false)
    } else {
      const { error } = await supabase.from('video_favorites').insert({ user_id: user.id, video_id: videoId })
      if (!error) setIsFavorited(true)
    }
  }

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
    const newState = !isMuted
    setIsMuted(newState)
    if (audioSrc && audioRef.current) {
      audioRef.current.muted = newState
    } else if (videoRef.current) {
      videoRef.current.muted = newState
    }
  }

  const handleShare = async (e) => {
    e.stopPropagation()
    const shareUrl = `https://tgtbt.xyz/watch/${videoId}`
    if (navigator.share) {
      try { await navigator.share({ title: 'TGTBT', url: shareUrl }) } catch (err) {}
    } else {
      navigator.clipboard.writeText(shareUrl)
      alert('Link copied!')
    }
  }

  const shouldStartMuted = startMuted

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black" onClick={handleVideoClick}>
      
      {/* Home Button */}
      {showHomeButton && (
        <Link 
          href="/" 
          onClick={(e) => e.stopPropagation()} 
          className={`absolute top-4 left-4 z-50 transition-opacity duration-300 hover:scale-105 active:scale-95 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          <img src="/tgtbt_logo.png" alt="Home" className="h-12 w-auto drop-shadow-md" />
        </Link>
      )}

      {/* Close Button */}
      <button 
        onClick={onClose} 
        className={`absolute top-4 right-4 z-50 text-white hover:scale-110 bg-red-600 hover:bg-red-700 rounded-full p-3 shadow-xl backdrop-blur-sm transition-all duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <X size={36} strokeWidth={3} />
      </button>

      {/* --- MEDIA RENDERING --- */}
      {audioSrc ? (
        <>
          <video 
            ref={videoRef} src={videoSrc} className="max-h-full max-w-full w-auto h-auto object-contain" 
            loop playsInline autoPlay muted 
          />
          <audio 
            ref={audioRef} src={audioSrc} autoPlay loop muted={shouldStartMuted} 
          />
        </>
      ) : (
        shouldStartMuted ? (
          <video 
            ref={videoRef} src={videoSrc} className="max-h-full max-w-full w-auto h-auto object-contain" 
            loop playsInline autoPlay muted 
          />
        ) : (
          <video 
            ref={videoRef} src={videoSrc} className="max-h-full max-w-full w-auto h-auto object-contain" 
            loop playsInline autoPlay 
          />
        )
      )}

      {/* Watermark */}
      <img src="/tgtbt_logo.png" alt="TGTBT" className="absolute bottom-8 right-8 w-80 h-auto opacity-50 pointer-events-none z-10 select-none" />

      {/* --- CONTROLS OVERLAY --- */}
      {!showComments && (
        <div className={`absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-20 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="flex flex-col gap-4 items-center">
            
            {/* Stars */}
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

            {/* Buttons Row */}
            <div className="flex items-center gap-6 mt-2">
              <button onClick={toggleMute} className="text-white/80 hover:text-white transition">
                {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
              </button>

              <button 
                onClick={handleShowComments} 
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full backdrop-blur-md border border-white/10 transition"
              >
                <MessageCircle size={20} /> <span className="text-sm font-bold">Comments ({commentCount})</span>
              </button>

              <button 
                onClick={toggleFavorite} 
                className={`transition transform hover:scale-110 ${isFavorited ? 'text-pink-500 fill-pink-500' : 'text-white/80 hover:text-white'}`}
              >
                <Heart size={24} className={isFavorited ? "fill-pink-500" : ""} />
              </button>

              <button onClick={handleShare} className="text-white/80 hover:text-white transition transform hover:scale-110">
                <Share2 size={24} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- COMMENTS MODAL --- */}
      {showComments && (
        <div 
          className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
          // We handle close here just in case the stopPropagation below fails, 
          // but the primary logic is now in CommentsOverlay.
          onClick={(e) => { e.stopPropagation(); setShowComments(false); }}
        >
          {/* Wrapper to center and constrain width */}
          <div className="w-full h-full sm:h-auto sm:max-w-md">
            <CommentsOverlay 
              videoId={videoId} 
              onClose={() => setShowComments(false)} 
              isInsidePlayer={true} 
              onCommentAdded={() => setCommentCount(prev => prev + 1)} 
              onUserClick={onUserClick} 
            />
          </div>
        </div>
      )}
    </div>
  )
}