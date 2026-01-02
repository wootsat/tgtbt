'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { ArrowLeft, UserCheck, Heart, PlayCircle, Share2, Video, Users, Eye, MessageCircle, Star, ArrowUpDown, Trash2, Loader2, Camera } from 'lucide-react'
import VideoPlayer from '@/components/VideoPlayer'

export default function UserProfile({ session, targetUserId, onBack, onUserClick }) {
  const [profile, setProfile] = useState(null)
  const [items, setItems] = useState([]) 
  const [activeTab, setActiveTab] = useState('posts') 
  const [activeVideo, setActiveVideo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [sortBy, setSortBy] = useState('date') 
  
  // --- AVATAR UPLOAD STATE ---
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef(null)

  const isMyProfile = session?.user?.id === targetUserId
  const profileId = targetUserId || session?.user?.id

  useEffect(() => {
    fetchProfile()
    checkFollowStatus()
  }, [targetUserId, session])

  useEffect(() => {
    fetchData()
  }, [targetUserId, activeTab, sortBy]) 

  const fetchProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', targetUserId).single()
    if (data) setProfile(data)
  }

  const checkFollowStatus = async () => {
    if (!session) return
    const { data } = await supabase
      .from('user_favorites')
      .select('id')
      .match({ user_id: session.user.id, favorite_user_id: targetUserId })
      .single()
    setIsFollowing(!!data)
  }

  const toggleFollow = async () => {
    if (!session) return alert("Login to follow users!")
    if (isFollowing) {
      await supabase.from('user_favorites').delete().match({ user_id: session.user.id, favorite_user_id: targetUserId })
      setIsFollowing(false)
    } else {
      await supabase.from('user_favorites').insert({ user_id: session.user.id, favorite_user_id: targetUserId })
      setIsFollowing(true)
    }
  }

  // --- AVATAR UPLOAD HANDLER ---
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploadingAvatar(true)
    try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${profileId}-${Date.now()}.${fileExt}`
        const filePath = `${fileName}`

        // 1. Upload
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file, { upsert: true })
        if (uploadError) throw uploadError

        // 2. Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath)

        // 3. Update DB
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: publicUrl })
            .eq('id', profileId)
        if (updateError) throw updateError

        // 4. Update Local State
        setProfile(prev => ({ ...prev, avatar_url: publicUrl }))
        
    } catch (error) {
        alert('Error updating avatar: ' + error.message)
    } finally {
        setUploadingAvatar(false)
    }
  }

  const handleDelete = async (e, videoId) => {
    e.stopPropagation()
    if (!confirm("Are you sure you want to delete this video?")) return

    const { error } = await supabase.from('videos').delete().eq('id', videoId)
    
    if (error) {
        alert("Error deleting video")
        console.error(error)
    } else {
        setItems(prev => prev.filter(item => item.id !== videoId))
    }
  }

  const fetchData = async () => {
    setItems([])
    setLoading(true)
    
    let data = []
    
    // --- POSTS TAB ---
    if (activeTab === 'posts') {
      let query = supabase
        .from('videos')
        .select('*, comments(count)')
        .eq('user_id', targetUserId)

      if (sortBy === 'date') {
        query = query.order('created_at', { ascending: false })
      } else {
        query = query.order('average_rating', { ascending: false })
      }
      
      const { data: videos } = await query
      data = videos
    } 
    // --- FAV TGTBTs TAB ---
    else if (activeTab === 'fav_videos') {
      const { data: favorites } = await supabase
        .from('video_favorites')
        .select('videos(*, profiles(username), comments(count))')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
      
      let extracted = favorites?.map(f => f.videos) || []
      if (sortBy === 'rating') {
          extracted.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
      }
      data = extracted
    }
    // --- FAV USERS TAB ---
    else if (activeTab === 'fav_users') {
      const { data: favUsers } = await supabase
        .from('user_favorites')
        .select('profiles(*)')
        .eq('user_id', targetUserId)
      data = favUsers?.map(f => f.profiles)
    }

    setItems(data || [])
    setLoading(false)
  }

  const handleShareProfile = async () => {
    const url = `https://tgtbt.xyz/?u=${targetUserId}`
    if (navigator.share) {
        try { await navigator.share({ title: profile?.username, url }) } catch(e) {}
    } else {
        navigator.clipboard.writeText(url)
        alert('Profile link copied!')
    }
  }

  return (
    <div className="w-full h-full bg-black text-white flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center gap-4 border-b border-gray-800 bg-gray-900 sticky top-0 z-30">
        <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded-full transition">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold flex-1 truncate">@{profile?.username || 'User'}</h1>
        <button onClick={handleShareProfile} className="p-2 hover:bg-gray-800 rounded-full transition">
          <Share2 size={24} />
        </button>
      </div>

      {/* Profile Info */}
      <div className="p-6 flex flex-col items-center gap-4 bg-gray-900 border-b border-gray-800">
        
        {/* AVATAR WITH CAMERA BUTTON */}
        <div className="relative group">
            <div className="w-24 h-24 bg-gray-700 rounded-full overflow-hidden border-2 border-gray-600 shadow-xl">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-500">
                  {profile?.username?.[0]?.toUpperCase()}
                </div>
              )}
            </div>

            {/* CAMERA BUTTON (Only visible if own profile) */}
            {isMyProfile && (
                <>
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-full shadow-lg transition transform hover:scale-110 active:scale-95 border-2 border-black"
                    >
                        {uploadingAvatar ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                    </button>
                    {/* Hidden Input */}
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleAvatarUpload} 
                        accept="image/*" 
                        hidden 
                    />
                </>
            )}
        </div>

        <div className="text-center">
            <h2 className="text-2xl font-bold text-white">@{profile?.username}</h2>
            <p className="text-gray-400 text-sm mt-1">Joined {new Date(profile?.created_at || Date.now()).toLocaleDateString()}</p>
        </div>
        
        {session && !isMyProfile && (
           <button 
             onClick={toggleFollow}
             className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold transition transform active:scale-95 ${isFollowing ? 'bg-gray-700 text-white hover:bg-red-900' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
           >
             <UserCheck size={18} /> {isFollowing ? 'Following' : 'Follow'}
           </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 bg-black sticky top-[73px] z-20">
        <button 
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-4 flex justify-center items-center gap-2 transition text-[10px] sm:text-xs font-bold tracking-wider ${activeTab === 'posts' ? 'border-b-4 border-blue-500 text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
        >
            <Video size={16} /> POSTS
        </button>
        <button 
            onClick={() => setActiveTab('fav_users')}
            className={`flex-1 py-4 flex justify-center items-center gap-2 transition text-[10px] sm:text-xs font-bold tracking-wider ${activeTab === 'fav_users' ? 'border-b-4 border-purple-500 text-purple-400' : 'text-gray-500 hover:text-gray-300'}`}
        >
            <Users size={16} /> FAVORITE USERS
        </button>
        <button 
            onClick={() => setActiveTab('fav_videos')}
            className={`flex-1 py-4 flex justify-center items-center gap-2 transition text-[10px] sm:text-xs font-bold tracking-wider ${activeTab === 'fav_videos' ? 'border-b-4 border-pink-500 text-pink-400' : 'text-gray-500 hover:text-gray-300'}`}
        >
            <Heart size={16} /> FAVORITES TGTBTs
        </button>
      </div>

      {/* Sorting */}
      {(activeTab === 'posts' || activeTab === 'fav_videos') && (
        <div className="flex justify-end px-4 py-2 bg-gray-900/50">
            <button 
                onClick={() => setSortBy(prev => prev === 'date' ? 'rating' : 'date')}
                className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition"
            >
                <ArrowUpDown size={14} />
                Sort by: <span className="text-blue-400">{sortBy === 'date' ? 'Date (Newest)' : 'Rating (Highest)'}</span>
            </button>
        </div>
      )}

      {/* List Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-black">
        {loading ? (
            <div className="flex justify-center pt-10"><Loader2 className="animate-spin text-gray-500" /></div>
        ) : items.length === 0 ? (
            <div className="text-center text-gray-500 mt-10">Nothing to show here.</div>
        ) : (
            <>
              {/* VIDEO LIST */}
              {(activeTab === 'posts' || activeTab === 'fav_videos') && items.map((video, index) => (
                <div key={video.id} onClick={() => setActiveVideo(video)} className="cursor-pointer group relative overflow-hidden rounded-xl bg-gray-800 border border-gray-700 p-3 transition hover:scale-[1.01] hover:border-gray-500">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold text-sm ${index < 3 && sortBy === 'rating' ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-300'}`}>
                       {index + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="truncate text-base font-bold text-white group-hover:text-blue-400 transition-colors">
                        {video.title}
                      </h3>
                      
                      {activeTab === 'fav_videos' && (
                          <div className="text-xs text-gray-400 flex items-center gap-1">
                             by @{video.profiles?.username || 'Unknown'}
                          </div>
                      )}

                      <div className="flex items-center gap-3 text-gray-500 text-[10px] mt-1 font-medium">
                        {sortBy === 'date' ? (
                            <span>{new Date(video.created_at).toLocaleDateString()}</span>
                        ) : (
                            <span className="text-yellow-400 flex items-center gap-1">
                                ★ {video.average_rating?.toFixed(1) || '0.0'}
                            </span>
                        )}
                        <span>|</span>
                        <span className="flex items-center gap-1"><Eye size={12} /> {video.view_count || 0}</span>
                        <span>|</span>
                        <span className="flex items-center gap-1"><MessageCircle size={12} /> {video.comments?.[0]?.count || 0}</span>
                      </div>
                    </div>

                    {/* DELETE BUTTON (Only in 'posts' tab and if it's my profile) */}
                    {activeTab === 'posts' && isMyProfile ? (
                        <button 
                            onClick={(e) => handleDelete(e, video.id)}
                            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-900/30 rounded-full transition z-10"
                        >
                            <Trash2 size={20} />
                        </button>
                    ) : (
                        <PlayCircle className="text-gray-600 group-hover:text-white transition-colors" size={24} />
                    )}
                  </div>
                </div>
              ))}

              {/* USER LIST */}
              {activeTab === 'fav_users' && items.map((user) => (
                <div key={user.id} onClick={() => onUserClick(user.id)} className="cursor-pointer group flex items-center gap-4 p-4 rounded-xl bg-gray-800 border border-gray-700 hover:border-gray-500 transition">
                   <div className="w-12 h-12 bg-gray-600 rounded-full overflow-hidden">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">
                            {user.username?.[0]?.toUpperCase()}
                        </div>
                      )}
                   </div>
                   <div className="flex-1">
                      <h3 className="font-bold text-white text-lg group-hover:text-purple-400 transition">@{user.username}</h3>
                      <p className="text-xs text-gray-500">View Profile</p>
                   </div>
                   <ArrowLeft className="rotate-180 text-gray-600 group-hover:text-white transition" size={20} />
                </div>
              ))}
            </>
        )}
      </div>

      {/* Video Player Modal */}
      {activeVideo && (
        <div className="fixed inset-0 z-[100] bg-black">
          <VideoPlayer 
            videoSrc={activeVideo.compressed_url || activeVideo.video_url} 
            videoId={activeVideo.id}
            audioSrc={activeVideo.audio_url}
            creatorUsername={activeVideo.profiles?.username || profile?.username}
            creatorId={activeVideo.user_id}
            isTiled={activeVideo.is_tiled}
            initialRating={activeVideo.average_rating}
            initialCommentCount={activeVideo.comments?.[0]?.count || 0}
            onRate={async (vidId, score) => {
                 if (!session) return alert('Login to rate')
                 await supabase.from('ratings').upsert({ user_id: session.user.id, video_id: vidId, score }, { onConflict: 'user_id, video_id' })
            }}
            onClose={() => setActiveVideo(null)} 
            onUserClick={onUserClick}
            startMuted={false}
          />
        </div>
      )}
    </div>
  )
}