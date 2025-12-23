'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { ArrowLeft, Star, CalendarDays, Eye, Share2, PlayCircle, Loader2, X, Heart, Users } from 'lucide-react'
import VideoPlayer from '@/components/VideoPlayer'
import CommentsOverlay from '@/components/CommentsOverlay'

export default function UserProfile({ session, targetUserId, onBack, onUserClick }) {
  const [profile, setProfile] = useState(null)
  const [videos, setVideos] = useState([])
  const [favorites, setFavorites] = useState([]) // <--- List of favorited users
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('videos') // 'videos' or 'favorites'
  
  // Follow State
  const [isFavorited, setIsFavorited] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  
  // Modals
  const [activeVideo, setActiveVideo] = useState(null)
  const [commentVideoId, setCommentVideoId] = useState(null)
  const [ratingVideoId, setRatingVideoId] = useState(null)

  useEffect(() => {
    fetchProfileData()
  }, [targetUserId, session]) // Re-fetch if target changes

  const fetchProfileData = async () => {
    try {
      setLoading(true)
      
      // 1. Fetch Profile Info
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single()
      
      if (profileError) throw profileError
      setProfile(profileData)

      // 2. Fetch Videos
      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select('*, comments(count)')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })

      if (videoError) throw videoError
      setVideos(videoData || [])

      // 3. Fetch Favorites (Who this user follows)
      const { data: favData, error: favError } = await supabase
        .from('user_favorites')
        .select('favorite_user_id, profiles!user_favorites_favorite_user_id_fkey(id, username)')
        .eq('user_id', targetUserId)

      if (favError) console.error(favError)
      // Flatten the data structure for easier use
      setFavorites(favData?.map(f => f.profiles) || [])

      // 4. Check if YOU (the logged in user) have favorited THIS profile
      if (session && session.user.id !== targetUserId) {
        const { data: amIFollowing } = await supabase
          .from('user_favorites')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('favorite_user_id', targetUserId)
          .single()
        
        setIsFavorited(!!amIFollowing)
      }

    } catch (error) {
      console.error("Error fetching profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const toggleFavorite = async () => {
    if (!session) return alert("Please log in to add favorites.")
    setFollowLoading(true)

    if (isFavorited) {
      // Unfollow
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', session.user.id)
        .eq('favorite_user_id', targetUserId)
      
      if (!error) setIsFavorited(false)
    } else {
      // Follow
      const { error } = await supabase
        .from('user_favorites')
        .insert({ user_id: session.user.id, favorite_user_id: targetUserId })
      
      if (!error) setIsFavorited(true)
    }
    setFollowLoading(false)
  }

  // --- Handlers reused from previous code ---
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
    setRatingVideoId(null)
    const { error } = await supabase.from('ratings').upsert(
      { user_id: session.user.id, video_id: videoId, score: score }, 
      { onConflict: 'user_id, video_id' }
    )
    if (!error) {
      const { data: updatedVideo } = await supabase.from('videos').select('average_rating').eq('id', videoId).single()
      if (updatedVideo) {
        setVideos(prev => prev.map(v => v.id === videoId ? { ...v, average_rating: updatedVideo.average_rating } : v))
        if(activeVideo?.id === videoId) setActiveVideo(prev => ({ ...prev, average_rating: updatedVideo.average_rating }))
      }
    }
  }

  if (loading) return <div className="flex justify-center pt-20 text-white"><Loader2 className="animate-spin" /></div>
  if (!profile) return <div className="pt-20 text-center text-white">User not found</div>

  const isMyProfile = session?.user?.id === targetUserId

  return (
    <div className="min-h-full pb-20 px-4">
      
      {/* Back Button */}
      <button onClick={onBack} className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition">
        <ArrowLeft size={20} /> Back
      </button>

      {/* --- HEADER --- */}
      <div className="flex flex-col items-center mb-6 animate-in slide-in-from-bottom-4">
        
        {/* Avatar */}
        <div className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-4xl font-bold text-white mb-4 shadow-2xl relative">
          {profile.username?.charAt(0).toUpperCase()}
          
          {/* Favorite Toggle Button (Only if not my profile) */}
          {!isMyProfile && (
            <button 
              onClick={toggleFavorite}
              disabled={followLoading}
              className="absolute -bottom-2 -right-2 bg-gray-800 p-2 rounded-full border border-gray-600 shadow-lg hover:scale-110 transition active:scale-95"
            >
              <Heart 
                size={20} 
                className={isFavorited ? "fill-red-500 text-red-500" : "text-gray-400"} 
              />
            </button>
          )}
        </div>

        <h1 className="text-2xl font-bold text-white">@{profile.username}</h1>
        <p className="text-xs text-gray-500 mt-1">Joined {new Date(profile.created_at).toLocaleDateString()}</p>

        {/* --- TABS --- */}
        <div className="flex items-center gap-6 mt-6 border-b border-gray-800 w-full justify-center pb-1">
          <button 
            onClick={() => setActiveTab('videos')}
            className={`pb-2 px-2 text-sm font-bold transition border-b-2 ${activeTab === 'videos' ? 'text-white border-blue-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
          >
            VIDEOS ({videos.length})
          </button>
          
          <button 
             onClick={() => setActiveTab('favorites')}
             className={`pb-2 px-2 text-sm font-bold transition border-b-2 flex items-center gap-2 ${activeTab === 'favorites' ? 'text-white border-pink-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
          >
            FAVORITES ({favorites.length}) <Heart size={12} className={activeTab === 'favorites' ? "text-pink-500 fill-pink-500" : ""} />
          </button>
        </div>
      </div>

      {/* --- CONTENT AREA --- */}

      {/* 1. VIDEOS TAB */}
      {activeTab === 'videos' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {videos.map((video) => (
            <div key={video.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex gap-4 hover:bg-gray-750 transition group cursor-pointer" onClick={() => setActiveVideo(video)}>
              <div className="w-24 h-16 bg-black rounded-lg flex items-center justify-center shrink-0 border border-gray-700 relative overflow-hidden">
                 <video src={video.compressed_url || video.video_url} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                 <PlayCircle className="relative z-10 text-white opacity-80" />
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h3 className="font-bold text-white truncate pr-4">{video.title}</h3>
                <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                  <button onClick={(e) => { e.stopPropagation(); setRatingVideoId(video.id); }} className="flex items-center gap-1 text-yellow-400 hover:text-yellow-200 transition bg-white/5 px-2 py-0.5 rounded-full hover:bg-white/10">
                    <Star size={12} fill="currentColor" /> <span className="font-bold">{video.average_rating?.toFixed(1) || '0.0'}</span>
                  </button>
                  <span className="text-gray-600">|</span>
                  <span className="flex items-center gap-1"><Eye size={12} /> {video.view_count || 0}</span>
                  <span className="text-gray-600">|</span>
                  <span className="flex items-center gap-1"><CalendarDays size={12} /> {new Date(video.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </div>
              </div>
              <button onClick={(e) => handleShare(e, video.id)} className="text-gray-500 hover:text-white p-2"><Share2 size={18} /></button>
            </div>
          ))}
          {videos.length === 0 && <div className="text-center text-gray-500 py-10">No videos uploaded yet.</div>}
        </div>
      )}

      {/* 2. FAVORITES TAB */}
      {activeTab === 'favorites' && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {favorites.map((favUser) => (
            <div 
              key={favUser.id} 
              onClick={() => onUserClick && onUserClick(favUser.id)}
              className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center gap-4 hover:bg-gray-700 transition cursor-pointer"
            >
              <div className="w-10 h-10 bg-gradient-to-tr from-pink-500 to-orange-400 rounded-full flex items-center justify-center font-bold text-white shadow-md">
                 {favUser.username?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                 <h3 className="text-white font-bold text-lg">@{favUser.username}</h3>
              </div>
              <ArrowLeft className="rotate-180 text-gray-500" size={16} />
            </div>
          ))}
          {favorites.length === 0 && <div className="text-center text-gray-500 py-10">No favorites yet.</div>}
        </div>
      )}

      {/* --- MODALS (Player & Rating) --- */}
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

      {ratingVideoId && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setRatingVideoId(null)}>
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl shadow-2xl w-full max-w-sm relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setRatingVideoId(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={24} /></button>
            <h3 className="text-center text-white font-bold text-lg mb-6">Rate this Video</h3>
            <div className="flex justify-center gap-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => handleRate(ratingVideoId, star)} className="text-gray-600 hover:text-yellow-400 hover:scale-125 transition-transform"><Star size={40} className="fill-current" /></button>
              ))}
            </div>
          </div>
        </div>
      )}

      {commentVideoId && <CommentsOverlay videoId={commentVideoId} onClose={() => setCommentVideoId(null)} onUserClick={() => setCommentVideoId(null)} />}
    </div>
  )
}