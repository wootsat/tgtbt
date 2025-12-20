'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Star, Loader2, Play } from 'lucide-react'

export default function UserProfile({ session }) {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [playingVideoId, setPlayingVideoId] = useState(null)

  useEffect(() => {
    async function fetchMyVideos() {
      if (!session?.user) return

      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching videos:', error)
      } else {
        setVideos(data)
      }
      setLoading(false)
    }

    fetchMyVideos()
  }, [session])

  const activeVideo = videos.find(v => v.id === playingVideoId)

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-white"/></div>

  return (
    <>
      {/* 1. THE LIST VIEW */}
      <div className="w-full h-full overflow-y-auto p-4 pb-32 bg-gray-900">
        <h2 className="text-2xl font-bold text-white mb-6">My Uploads</h2>

        {videos.length === 0 ? (
          <div className="text-gray-500 text-center mt-10">
            <p>You haven't uploaded any videos yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {videos.map((video) => (
              <div 
                key={video.id} 
                onClick={() => setPlayingVideoId(video.id)} 
                className="bg-gray-800 rounded-xl p-3 flex gap-4 items-center cursor-pointer hover:bg-gray-700 transition"
              >
                
                {/* Thumbnail */}
                <div className="relative w-24 h-32 bg-black rounded-lg overflow-hidden flex-shrink-0 border border-gray-700">
                  <video 
                    src={video.video_url} 
                    className="w-full h-full object-cover opacity-80"
                    muted 
                    preload="metadata"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play size={20} className="text-white fill-white opacity-80" />
                  </div>
                </div>

                {/* Video Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold truncate text-lg">{video.title}</h3>
                  <p className="text-gray-400 text-xs mb-2">
                    {new Date(video.created_at).toLocaleDateString()}
                  </p>

                  <div className="flex items-center gap-1 bg-gray-900 w-fit px-2 py-1 rounded-md border border-gray-700">
                    <Star size={14} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-white font-bold text-sm">
                      {video.average_rating ? video.average_rating.toFixed(1) : 'N/A'}
                    </span>
                    <span className="text-gray-500 text-xs ml-1">
                      ({video.rating_count || 0})
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. THE SIMPLE FULLSCREEN PLAYER */}
      {playingVideoId && activeVideo && (
        <div 
          // Clicking ANYWHERE on this background closes it
          onClick={() => setPlayingVideoId(null)}
          className="fixed inset-0 z-[60] bg-black flex items-center justify-center animate-in fade-in duration-200 cursor-pointer"
        >
          {/* Simple Video Tag - No custom player, no ratings */}
          <video 
            src={activeVideo.video_url}
            // 'object-contain' prevents stretching. It adds black bars if needed.
            className="max-h-full max-w-full w-auto h-auto object-contain"
            loop
            autoPlay
            playsInline
          />
        </div>
      )}
    </>
  )
}