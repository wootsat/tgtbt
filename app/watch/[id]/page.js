'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import VideoPlayer from '@/components/VideoPlayer'
import { Loader2, AlertCircle } from 'lucide-react'

export default function WatchPage() {
  const params = useParams()
  const router = useRouter()
  
  const [video, setVideo] = useState(null)
  const [loading, setLoading] = useState(true)
  const videoId = params?.id

  useEffect(() => {
    if (!videoId) return

    const fetchVideo = async () => {
      // Fetch data directly from client (Browser) - This is safe and won't crash the server
      const { data, error } = await supabase
        .from('videos')
        .select('*, profiles(username), comments(count)')
        .eq('id', videoId)
        .single()

      if (data) setVideo(data)
      setLoading(false)
    }
    fetchVideo()
  }, [videoId])

  const handleRate = async (vidId, score) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return alert('Login to rate!')
    
    await supabase.from('ratings').upsert(
        { user_id: user.id, video_id: vidId, score }, 
        { onConflict: 'user_id, video_id' }
    )
  }

  // --- LOADING STATE ---
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    )
  }

  // --- ERROR STATE ---
  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white gap-4">
        <AlertCircle className="text-red-500" size={48} />
        <h1 className="text-xl font-bold">Video Not Found</h1>
        <button 
            onClick={() => router.push('/')} 
            className="text-blue-400 hover:underline mt-2"
        >
            Return Home
        </button>
      </div>
    )
  }

  // --- PLAYER ---
  return (
    <main className="fixed inset-0 bg-black z-50">
      <VideoPlayer 
        videoSrc={video.compressed_url || video.video_url} 
        videoId={video.id}
        audioSrc={video.audio_url}
        isTiled={video.is_tiled}
        
        creatorUsername={video.profiles?.username}
        creatorId={video.user_id}
        
        initialRating={video.average_rating}
        initialCommentCount={video.comments?.[0]?.count || 0}
        onRate={handleRate}
        onClose={() => router.push('/')} 
        onUserClick={(userId) => router.push(`/?u=${userId}`)}
        
        // We set startMuted={false} to attempt autoplay.
        // If the browser blocks it, the VideoPlayer component will handle the fallback.
        startMuted={false} 
        showHomeButton={true} 
      />
    </main>
  )
}