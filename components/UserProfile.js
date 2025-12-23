'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { ArrowLeft, Star, CalendarDays, Eye, Share2, PlayCircle, Loader2, X } from 'lucide-react'
import VideoPlayer from '@/components/VideoPlayer'
import CommentsOverlay from '@/components/CommentsOverlay'

export default function UserProfile({ session, targetUserId, onBack }) {
  const [profile, setProfile] = useState(null)
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  
  // States for Modals
  const [activeVideo, setActiveVideo] = useState(null)
  const [commentVideoId, setCommentVideoId] = useState(null)
  const [ratingVideoId, setRatingVideoId] = useState(null) // <--- New State for Rating Modal

  useEffect(() => {
    fetchProfileData()
  }, [targetUserId])

  const fetchProfileData = async () => {
    try {
      setLoading(true)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single()
      
      if (profileError) throw profileError
      setProfile(profileData)

      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select('*, comments(count)')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })

      if (videoError) throw videoError
      setVideos(videoData || [])

    } catch (error) {
      console.error("Error fetching profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async (e, videoId) => {
    e.stopPropagation()
    const shareUrl = `https://tgtbt.xyz/watch/${videoId}`
    if (navigator.share) {
      try { await navigator.share({ title: 'TGTBT', url: shareUrl }) } catch (err) {}
    } else {
      navigator.clipboard.writeText(shareUrl)
      alert('Link copied!')
    }
  }

  const handleRate = async (videoId, score) => {
    if (!session) return alert("Please log in to rate.")
    
    // Close the rating modal immediately for better UX
    setRatingVideoId(null)

    const { error } = await supabase.from('ratings').upsert(
      { user_id: session.user.id, video_id: videoId, score: score }, 
      { onConflict: 'user_id, video_id' }
    )

    if (!error) {
      // Refresh local data
      const { data: updatedVideo } = await supabase
        .from('videos')
        .select('average_rating')
        .eq('id', videoId)
        .single()
        
      if (updatedVideo) {
        setVideos(prev => prev.map(v => v.id === videoId ? { ...v, average_rating: updatedVideo.average_rating } : v))
        if(activeVideo?.id === videoId) {
          setActiveVideo(prev => ({ ...prev, average_rating: updatedVideo.average_rating }))
        }
      }
    }
  }

  if (loading) return <div className="flex justify-center pt-20 text-white"><Loader2 className="animate-spin" /></div>
  if (!profile) return <div className="pt-20 text-center text-white">User not found</div>

  return (
    <div className="min-h-full pb-20 px-4">
      {/* Back Button */}
      <button onClick={onBack} className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition">
        <ArrowLeft size={20} /> Back
      </button>

      {/* Profile Header */}
      <div className="flex flex-col items-center mb-8 animate-in slide-in-from-bottom-4">
        <div className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-4xl font-bold text-white mb-4 shadow-2xl">
          {profile.username?.charAt(0).toUpperCase()}
        </div>
        <h1 className="text-2xl font-bold text-white">@{profile.username}</h1>
        <div className="flex gap-4 mt-2 text-sm text-gray-400">
           <span>{videos.length} Videos</span>
           <span>•</span>
           <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Video List */}
      <div className="space-y-4">
        {videos.map((video) => (
          <div key={video.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex gap-4 hover:bg-gray-750 transition group cursor-pointer" onClick={() => setActiveVideo(video)}>
            
            {/* Thumbnail */}
            <div className="w-24 h-16 bg-black rounded-lg flex items-center justify-center shrink-0 border border-gray-700 relative overflow-hidden">
               <video src={video.compressed_url || video.video_url} className="absolute inset-0 w-full h-full object-cover opacity-50" />
               <PlayCircle className="relative z-10 text-white opacity-80" />
            </div>

            {/* Meta Data */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <h3 className="font-bold text-white truncate pr-4">{video.title}</h3>
              
              <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                
                {/* INTERACTIVE RATING BUTTON */}
                <button 
                  onClick={(e) => { 
                    e.stopPropagation() 
                    setRatingVideoId(video.id) // Open rating modal
                  }}
                  className="flex items-center gap-1 text-yellow-400 hover:text-yellow-200 transition bg-white/5 px-2 py-0.5 rounded-full hover:bg-white/10"
                >
                  <Star size={12} fill="currentColor" /> 
                  <span className="font-bold">{video.average_rating?.toFixed(1) || '0.0'}</span>
                </button>
                
                <span className="text-gray-600">|</span>

                <span className="flex items-center gap-1">
                  <Eye size={12} /> {video.view_count || 0}
                </span>

                <span className="text-gray-600">|</span>

                <span className="flex items-center gap-1">
                   <CalendarDays size={12} />
                   {new Date(video.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>

            <button onClick={(e) => handleShare(e, video.id)} className="text-gray-500 hover:text-white p-2">
              <Share2 size={18} />
            </button>
          </div>
        ))}
      </div>

      {/* --- MODALS --- */}

      {/* 1. Video Player Modal */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 bg-black">
          <VideoPlayer 
            videoSrc={activeVideo.compressed_url || activeVideo.video_url} 
            videoId={activeVideo.id}
            audioSrc={activeVideo.audio_url}
            initialRating={activeVideo.average_rating}
            initialCommentCount={activeVideo.comments?.[0]?.count || 0}
            onRate={handleRate}
            onClose={() => setActiveVideo(null)} 
            onUserClick={() => setActiveVideo(null)}
            startMuted={false} 
          />
        </div>
      )}

      {/* 2. Rating Modal (New) */}
      {ratingVideoId && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setRatingVideoId(null)}>
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl shadow-2xl w-full max-w-sm relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setRatingVideoId(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X size={24} />
            </button>
            <h3 className="text-center text-white font-bold text-lg mb-6">Rate this Video</h3>
            <div className="flex justify-center gap-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRate(ratingVideoId, star)}
                  className="text-gray-600 hover:text-yellow-400 hover:scale-125 transition-transform"
                >
                  <Star size={40} className="fill-current" />
                </button>
              ))}
            </div>
            <p className="text-center text-gray-500 text-xs mt-6">Tap a star to submit</p>
          </div>
        </div>
      )}

    </div>
  )
}