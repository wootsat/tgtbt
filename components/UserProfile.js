'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Star, Loader2, Play, Trophy, Calendar } from 'lucide-react'

export default function UserProfile({ session, targetUserId, onBack }) {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [playingVideoId, setPlayingVideoId] = useState(null)
  const [profileData, setProfileData] = useState({ username: '', joinedAt: null })
  const [sortBy, setSortBy] = useState('date') 

  const profileId = targetUserId || session?.user?.id
  const isOwnProfile = session?.user?.id === profileId

  useEffect(() => {
    async function fetchData() {
      if (!profileId) return
      setLoading(true)

      // 1. Get Profile Info (Username + Join Date)
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, created_at')
        .eq('id', profileId)
        .single()
      
      if (profile) {
        setProfileData({ 
          username: profile.username,
          joinedAt: new Date(profile.created_at)
        })
      }

      // 2. Get Videos
      let query = supabase.from('videos').select('*').eq('user_id', profileId)

      if (sortBy === 'rank') {
        query = query.order('average_rating', { ascending: false })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      const { data: videoData, error } = await query
      
      if (error) console.error('Error:', error)
      else setVideos(videoData || [])
      
      setLoading(false)
    }

    fetchData()
  }, [profileId, sortBy])

  const activeVideo = videos.find(v => v.id === playingVideoId)

  // Helper to format date: "September 7th, 2025"
  const formatDate = (date) => {
    if (!date) return ''
    return new Intl.DateTimeFormat('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }).format(date)
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      
      {/* HEADER */}
      <div className="p-6 pb-2 bg-gradient-to-b from-gray-800 to-gray-900 border-b border-gray-800">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-3xl font-black text-fuchsia-500 tracking-tighter">
              {profileData.username || 'Unknown User'}
            </h2>
            
            {/* UPDATED: JOIN DATE */}
            <p className="text-gray-400 text-xs mt-1 font-medium">
              since {formatDate(profileData.joinedAt)}
            </p>
          </div>

          {!isOwnProfile && onBack && (
             <button onClick={onBack} className="text-sm text-blue-400 font-bold hover:underline">
               ← Back
             </button>
          )}
        </div>

        {/* Sorting Tabs */}
        <div className="flex gap-2 mt-4">
          <button 
            onClick={() => setSortBy('date')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition ${
              sortBy === 'date' ? 'bg-white text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Calendar size={16} /> Newest
          </button>
          <button 
            onClick={() => setSortBy('rank')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition ${
              sortBy === 'rank' ? 'bg-yellow-400 text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Trophy size={16} /> Top Rated
          </button>
        </div>
      </div>

      {/* VIDEO LIST */}
      <div className="flex-1 overflow-y-auto p-4 pb-32">
        {loading ? (
          <div className="flex justify-center p-10"><Loader2 className="animate-spin text-white"/></div>
        ) : videos.length === 0 ? (
          <div className="text-gray-500 text-center mt-10">No videos found.</div>
        ) : (
          <div className="space-y-4">
            {videos.map((video) => (
              <div 
                key={video.id} 
                onClick={() => setPlayingVideoId(video.id)} 
                className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3 flex gap-4 items-center cursor-pointer hover:bg-gray-800 transition group"
              >
                {/* Thumbnail */}
                <div className="relative w-24 h-32 bg-black rounded-lg overflow-hidden flex-shrink-0 border border-gray-700 group-hover:border-gray-500 transition">
                  <video 
                    src={video.video_url} 
                    className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition"
                    muted 
                    preload="metadata"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play size={24} className="text-white opacity-80" />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold truncate text-lg group-hover:text-blue-400 transition">
                    {video.title}
                  </h3>
                  
                  <div className="flex items-center gap-2 mt-2">
                     <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded text-yellow-400 border border-gray-700">
                        <Star size={12} fill="currentColor" />
                        <span className="text-xs font-bold">{video.average_rating?.toFixed(1) || '0.0'}</span>
                     </div>
                     <span className="text-gray-500 text-xs">
                       {new Date(video.created_at).toLocaleDateString()}
                     </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PLAYER */}
      {playingVideoId && activeVideo && (
        <div 
          onClick={() => setPlayingVideoId(null)}
          className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-200 cursor-pointer"
        >
          <video 
            src={activeVideo.video_url}
            className="max-h-full max-w-full w-auto h-auto object-contain shadow-2xl"
            loop
            autoPlay
            playsInline
          />
        </div>
      )}
    </div>
  )
}