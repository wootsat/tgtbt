'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { ArrowLeft, Star, CalendarDays, Eye, Share2, PlayCircle, Loader2, X, Heart, Sparkles } from 'lucide-react'
import VideoPlayer from '@/components/VideoPlayer'
import CommentsOverlay from '@/components/CommentsOverlay'

export default function UserProfile({ session, targetUserId, onBack, onUserClick }) {
  const [profile, setProfile] = useState(null)
  
  // Lists
  const [videos, setVideos] = useState([])
  const [favUsers, setFavUsers] = useState([])
  const [favVideos, setFavVideos] = useState([]) // <--- New List

  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('videos') // 'videos', 'fav_users', 'fav_videos'
  
  // Follow State
  const [isFavorited, setIsFavorited] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  
  // Modals
  const [activeVideo, setActiveVideo] = useState(null)
  const [commentVideoId, setCommentVideoId] = useState(null)
  const [ratingVideoId, setRatingVideoId] = useState(null)

  const isMyProfile = session?.user?.id === targetUserId

  useEffect(() => {
    fetchProfileData()
  }, [targetUserId, session])

  const fetchProfileData = async () => {
    try {
      setLoading(true)
      
      // 1. Profile
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', targetUserId).single()
      setProfile(profileData)

      // 2. User's Own Videos
      const { data: videoData } = await supabase
        .from('videos')
        .select('*, comments(count)')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
      setVideos(videoData || [])

      // 3. User's Favorite USERS (Only needed if it's MY profile)
      if (isMyProfile) {
        const { data: favUserData } = await supabase
          .from('user_favorites')
          .select('favorite_user_id, profiles!user_favorites_favorite_user_id_fkey(id, username)')
          .eq('user_id', targetUserId)
        setFavUsers(favUserData?.map(f => f.profiles) || [])

        // 4. User's Favorite VIDEOS (Only needed if it's MY profile)
        // We join 'video_favorites' with 'videos' to get the video details
        const { data: favVideoData } = await supabase
          .from('video_favorites')
          .select('video_id, videos!video_favorites_video_id_fkey(*, comments(count))')
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false })
          
        // Flatten structure
        setFavVideos(favVideoData?.map(f => f.videos) || [])
      }

      // 5. Am I following this user?
      if (session && !isMyProfile) {
        const { data: amIFollowing } = await supabase
          .from('user_favorites')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('favorite_user_id', targetUserId)
          .single()
        setIsFavorited(!!amIFollowing)
      }

    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const toggleFavoriteUser = async () => {
    if (!session) return alert("Please log in.")
    setFollowLoading(true)
    if (isFavorited) {
      const { error } = await supabase.from('user_favorites').delete().match({ user_id: session.user.id, favorite_user_id: targetUserId })
      if (!error) setIsFavorited(false)
    } else {
      const { error } = await supabase.from('user_favorites').insert({ user_id: session.user.id, favorite_user_id: targetUserId })
      if (!error) setIsFavorited(true)
    }
    setFollowLoading(false)
  }

  // Helper to render video card (reused for both lists)
  const renderVideoList = (videoList, emptyMessage) => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {videoList.map((video) => (
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
          {/* Share Button (Right) */}
          <button onClick={async (e) => {
            e.stopPropagation()
            const shareUrl = `https://tgtbt.xyz/watch/${video.id}`
            if(navigator.share) try{await navigator.share({title:'TGTBT',url:shareUrl})}catch(e){}
            else{navigator.clipboard.writeText(shareUrl);alert('Link copied!')}
          }} className="text-gray-500 hover:text-white p-2">
            <Share2 size={18} />
          </button>
        </div>
      ))}
      {videoList.length === 0 && <div className="text-center text-gray-500 py-10">{emptyMessage}</div>}
    </div>
  )

  const handleRate = async (videoId, score) => {
    if (!session) return alert("Please log in to rate.")
    setRatingVideoId(null)
    const { error } = await supabase.from('ratings').upsert({ user_id: session.user.id, video_id: videoId, score: score }, { onConflict: 'user_id, video_id' })
    // In a real app we'd refresh the specific video in the list here
  }

  if (loading) return <div className="flex justify-center pt-20 text-white"><Loader2 className="animate-spin" /></div>
  if (!profile) return <div className="pt-20 text-center text-white">User not found</div>

  return (
    <div className="min-h-full pb-20 px-4">
      <button onClick={onBack} className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition"><ArrowLeft size={20} /> Back</button>

      {/* HEADER */}
      <div className="flex flex-col items-center mb-6 animate-in slide-in-from-bottom-4">
        <div className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-4xl font-bold text-white mb-4 shadow-2xl relative">
          {profile.username?.charAt(0).toUpperCase()}
          {!isMyProfile && (
            <button onClick={toggleFavoriteUser} disabled={followLoading} className="absolute -bottom-2 -right-2 bg-gray-800 p-2 rounded-full border border-gray-600 shadow-lg hover:scale-110 transition active:scale-95">
              <Heart size={20} className={isFavorited ? "fill-red-500 text-red-500" : "text-gray-400"} />
            </button>
          )}
        </div>
        <h1 className="text-2xl font-bold text-white">@{profile.username}</h1>
        <p className="text-xs text-gray-500 mt-1">Joined {new Date(profile.created_at).toLocaleDateString()}</p>

        {/* TABS (Hidden if not my profile) */}
        <div className="flex items-center gap-4 mt-6 border-b border-gray-800 w-full justify-center pb-1 overflow-x-auto">
          
          {/* Tab 1: Videos (Always Visible) */}
          <button 
            onClick={() => setActiveTab('videos')}
            className={`pb-2 px-2 text-xs sm:text-sm font-bold transition border-b-2 whitespace-nowrap ${activeTab === 'videos' ? 'text-white border-blue-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
          >
            VIDEOS ({videos.length})
          </button>
          
          {/* Private Tabs */}
          {isMyProfile && (
            <>
              <button 
                onClick={() => setActiveTab('fav_users')}
                className={`pb-2 px-2 text-xs sm:text-sm font-bold transition border-b-2 whitespace-nowrap flex items-center gap-1 ${activeTab === 'fav_users' ? 'text-white border-pink-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
              >
                FAVORITE USERS
              </button>

              <button 
                onClick={() => setActiveTab('fav_videos')}
                className={`pb-2 px-2 text-xs sm:text-sm font-bold transition border-b-2 whitespace-nowrap flex items-center gap-1 ${activeTab === 'fav_videos' ? 'text-white border-yellow-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
              >
                 FAVORITE TGTBTS
              </button>
            </>
          )}
        </div>
      </div>

      {/* CONTENT */}
      {activeTab === 'videos' && renderVideoList(videos, "No videos uploaded yet.")}
      
      {activeTab === 'fav_videos' && isMyProfile && renderVideoList(favVideos, "You haven't favorited any videos yet.")}

      {activeTab === 'fav_users' && isMyProfile && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {favUsers.map((favUser) => (
            <div key={favUser.id} onClick={() => onUserClick && onUserClick(favUser.id)} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center gap-4 hover:bg-gray-700 transition cursor-pointer">
              <div className="w-10 h-10 bg-gradient-to-tr from-pink-500 to-orange-400 rounded-full flex items-center justify-center font-bold text-white shadow-md">
                 {favUser.username?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                 <h3 className="text-white font-bold text-lg">@{favUser.username}</h3>
              </div>
              <ArrowLeft className="rotate-180 text-gray-500" size={16} />
            </div>
          ))}
          {favUsers.length === 0 && <div className="text-center text-gray-500 py-10">No favorite users yet.</div>}
        </div>
      )}

      {/* MODALS */}
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