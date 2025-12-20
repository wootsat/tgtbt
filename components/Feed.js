'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Loader2, Trophy, PlayCircle } from 'lucide-react'
import VideoPlayer from '@/components/VideoPlayer'

export default function Feed() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeVideo, setActiveVideo] = useState(null) // The video currently playing

  useEffect(() => {
    fetchTop5()
  }, [])

  const fetchTop5 = async () => {
    setLoading(true)
    
    // Calculate 24 hours ago
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .gt('created_at', yesterday.toISOString()) // Only videos newer than 24h
      .order('average_rating', { ascending: false }) // Highest rating first
      .limit(5) // Top 5 only

    if (error) console.error('Error fetching feed:', error)
    else setVideos(data || [])
    
    setLoading(false)
  }

  const handleRate = async (videoId, score) => {
    // 1. Send rating to DB
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('ratings').upsert({
      user_id: user.id,
      video_id: videoId,
      score: score
    })

    // 2. (Optional) Refresh the list to see new rankings immediately?
    // For now, we let it stay to prevent the video jumping while watching.
  }

  // --- VIEW 1: THE ACTIVE VIDEO PLAYER ---
  if (activeVideo) {
    return (
      <div className="fixed inset-0 z-40 bg-black">
        <VideoPlayer 
          videoSrc={activeVideo.compressed_url || activeVideo.video_url} 
          videoId={activeVideo.id}
          initialRating={activeVideo.average_rating} // or fetch user's specific rating
          onRate={handleRate}
          onClose={() => setActiveVideo(null)} // Returns to list
        />
      </div>
    )
  }

  // --- VIEW 2: THE TOP 5 LIST ---
  return (
    <div className="w-full h-full overflow-y-auto p-4 pt-20 pb-32 bg-gradient-to-b from-gray-900 to-black">
      
      <div className="mb-8 text-center space-y-2">
        <h2 className="text-3xl font-black text-white italic tracking-tighter">
          DAILY TOP 5
        </h2>
        <p className="text-gray-400 text-xs uppercase tracking-widest">
          The best of the last 24 hours
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center"><Loader2 className="animate-spin text-white" /></div>
      ) : videos.length === 0 ? (
        <div className="text-center text-gray-500 mt-10">
          <p>No videos uploaded today.</p>
          <p className="text-sm">Be the first!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {videos.map((video, index) => (
            <div 
              key={video.id}
              onClick={() => setActiveVideo(video)}
              className="group relative overflow-hidden rounded-xl bg-gray-800 border border-gray-700 p-4 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              {/* Rank Number Background */}
              <span className="absolute -right-4 -bottom-6 text-9xl font-black text-white/5 select-none z-0">
                {index + 1}
              </span>

              <div className="relative z-10 flex items-center gap-4">
                
                {/* Rank Badge */}
                <div className={`
                  flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-black text-xl shadow-lg
                  ${index === 0 ? 'bg-yellow-400 text-black' : 
                    index === 1 ? 'bg-gray-300 text-black' : 
                    index === 2 ? 'bg-orange-400 text-black' : 
                    'bg-gray-700 text-white'}
                `}>
                  {index + 1}
                </div>

                {/* Title & Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="truncate text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                    {video.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                    <span className="flex items-center gap-1 text-yellow-400">
                      ★ {video.average_rating?.toFixed(1) || '0.0'}
                    </span>
                    <span>•</span>
                    <span>{new Date(video.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                </div>

                {/* Play Icon */}
                <PlayCircle className="text-gray-500 group-hover:text-white transition-colors" size={28} />
                
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}