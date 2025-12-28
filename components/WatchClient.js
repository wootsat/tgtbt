'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import VideoPlayer from '@/components/VideoPlayer'
import { Loader2, AlertCircle } from 'lucide-react'

export default function WatchClient({ videoId }) {
  const router = useRouter()
  const [video, setVideo] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchVideo = async () => {
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

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-black text-white">
            <Loader2 className="animate-spin text-blue-500" size={40} />
        </div>
    )
  }

  if (!video) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white gap-4">
            <AlertCircle className="text-red-500" size={48} />
            <p>Video not found.</p>
            <button onClick={() => router.push('/')} className="text-blue-400 hover:underline">Go Home</button>
        </div>
    )
  }

  // DIRECT RENDER (Auto-play enabled)
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
        
        // We set startMuted={false} to TRY and play sound.
        // If the browser blocks it, your VideoPlayer component already handles the fallback to muted.
        startMuted={false} 
        showHomeButton={true} 
      />
    </main>
  )
}