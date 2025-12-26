'use client'
import { useRef, useState, useEffect } from 'react'
import Link from 'next/link' 
import { supabase } from '@/lib/supabaseClient' 
import { X, Star, MessageCircle, Volume2, VolumeX, Share2, Heart, User } from 'lucide-react'
import CommentsOverlay from '@/components/CommentsOverlay' 

export default function VideoPlayer({ 
  videoSrc, 
  videoId, 
  audioSrc = null, 
  creatorUsername,
  creatorId,
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
  
  const [rating, setRating] = useState(initialRating || 0)
  const [userRating, setUserRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [showControls, setShowControls] = useState(false)
  const [showComments, setShowComments] = useState(false) 
  const [isMuted, setIsMuted] = useState(startMuted)
  const [commentCount, setCommentCount] = useState(initialCommentCount)
  const [isFavorited, setIsFavorited] = useState(false)

  // --- HISTORY LOGIC ---
  useEffect(() => {
    const handleHistory = () => {
       window.history.pushState({ videoOpen: true }, '', window.location.href);
    }
    handleHistory();

    const handlePopState = (event) => {
      event.preventDefault();
      onClose(); 
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleManualClose = () => {
    if (window.history.state?.videoOpen) {
       window.history.back(); 
    } else {
       onClose(); 
    }
  }
  // ---------------------

  useEffect(() => {
    const initPlayer = async () => {
      if (!videoId) return
      const { error } = await supabase.rpc('increment_view_count', { video_id: videoId })
      if (error) console.error("Error incrementing view:", error)

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
    if (audioSrc && audioRef.current) audioRef.current.muted = newState
    else if (videoRef.current) videoRef.current.muted = newState
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
      
      {showHomeButton && (
        <Link href="/" onClick={(e) => e.stopPropagation()} className={`absolute top-4 left-4 z-50 transition-opacity duration-300 hover:scale-105 active:scale-95 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <img src="/tgtbt_logo.png" alt="Home" className="h-12 w-auto drop-shadow-md" />
        </Link>
      )}

      <button 
        onClick={handleManualClose} 
        className={`absolute top-4 right-4 z-50 text-white hover:scale-110 bg-red-600 hover:bg-red-700 rounded-full p-3 shadow-xl backdrop-blur-sm transition-all duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <X size={36} strokeWidth={3} />
      </button>

      {/* MEDIA RENDERING */}
      {audioSrc ? (
        <>
          <video ref={videoRef} src={videoSrc} className="max-h-full max-w-full w-auto h-auto object-contain" loop playsInline autoPlay muted />
          <audio ref={audioRef} src={audioSrc} autoPlay loop muted={shouldStartMuted} />
        </>
      ) : (
        shouldStartMuted ? (
          <video ref={videoRef} src={videoSrc} className="max-h-full max-w-full w-auto h-auto object-contain" loop playsInline autoPlay muted />
        ) : (
          <video ref={videoRef} src={videoSrc} className="max-h-full max-w-full w-auto h-auto object-contain" loop playsInline autoPlay />
        )
      )}

      {/* WATERMARK LOGO */}
      {/* - w-80: Standard Mobile Portrait (Large)
          - sm:w-96: Desktop/Tablet (Even Larger)
          - landscape:w-20: Mobile Landscape (Tiny & Tucked Away)
      */}
      <img 
        src="/tgtbt_logo.png" 
        alt="TGTBT" 
        className="absolute z-10 select-none opacity-50 pointer-events-none h-auto 
                   
                   /* 1. DEFAULT (Mobile Portrait) */
                   bottom-8 right-8 w-80 

                   /* 2. PHONE LANDSCAPE (Bumped up to w-24) */
                   landscape:w-24 landscape:bottom-4 landscape:right-4

                   /* 3. DESKTOP ONLY (Restores big size if screen is wider than 1024px) */
                   lg:landscape:w-[30rem] lg:landscape:bottom-10 lg:landscape:right-10" 
      />

      {/* --- CONTROLS OVERLAY --- */}
      {!showComments && (
        <div className={`absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-20 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="flex flex-col gap-4 items-center">
            
            {/* CLICKABLE USERNAME */}
            {creatorUsername && (
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        // Parent (Page.tsx) handles history replacement logic
                        if (onUserClick) onUserClick(creatorId);
                    }}
                    className="flex items-center gap-2 text-white/90 hover:text-blue-400 hover:scale-110 transition mb-2"
                >
                    <User size={20} className="text-blue-500" />
                    <span className="text-xl font-bold shadow-black drop-shadow-lg">@{creatorUsername}</span>
                </button>
            )}

            {/* Stars */}
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} onClick={(e) => { e.stopPropagation(); handleRate(star); }} className="transition transform hover:scale-125 focus:outline-none">
                  <Star size={32} className={star <= (hoverRating || userRating || rating) ? "text-yellow-400 fill-yellow-400 drop-shadow-lg" : "text-gray-500"} />
                </button>
              ))}
            </div>

            {/* Buttons Row */}
            <div className="flex items-center gap-6 mt-2">
              <button onClick={toggleMute} className="text-white/80 hover:text-white transition">
                {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
              </button>

              <button onClick={(e) => { e.stopPropagation(); setShowComments(true); }} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full backdrop-blur-md border border-white/10 transition">
                <MessageCircle size={20} /> <span className="text-sm font-bold">Comments ({commentCount})</span>
              </button>

              <button onClick={toggleFavorite} className={`transition transform hover:scale-110 ${isFavorited ? 'text-pink-500 fill-pink-500' : 'text-white/80 hover:text-white'}`}>
                <Heart size={24} className={isFavorited ? "fill-pink-500" : ""} />
              </button>

              <button onClick={handleShare} className="text-white/80 hover:text-white transition transform hover:scale-110">
                <Share2 size={24} />
              </button>
            </div>
          </div>
        </div>
      )}

      {showComments && (
        <div 
            className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center" 
            onClick={(e) => { 
                e.stopPropagation(); 
                setShowComments(false); 
            }}
        >
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