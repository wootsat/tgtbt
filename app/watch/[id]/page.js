'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import VideoPlayer from '@/components/VideoPlayer'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function WatchPage({ params }) {
  const [video, setVideo] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { id } = params

  useEffect(() => {
    const fetchVideo = async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('*, profiles(username), comments(count)') // Ensure is_tiled is fetched (via *)
        .eq('id', id)
        .single()

      if (error || !data) {
        console.error('Video not found')
        // router.push('/') // Optional: redirect home if failed
      } else {
        setVideo(data)
      }
      setLoading(false)
    }
    fetchVideo()
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-black text-white">
      <Loader2 className="animate-spin" size={40} />
    </div>
  )

  if (!video) return (
    <div className="flex items-center justify-center min-h-screen bg-black text-white">
      <p>Video not found.</p>
    </div>
  )

  return (
    <main className="fixed inset-0 bg-black z-50">
      <VideoPlayer 
        videoSrc={video.compressed_url || video.video_url} 
        videoId={video.id}
        audioSrc={video.audio_url}
        creatorUsername={video.profiles?.username}
        creatorId={video.user_id}
        
        // PASS THE TILE PROP
        isTiled={video.is_tiled}
        
        initialRating={video.average_rating}
        initialCommentCount={video.comments?.[0]?.count || 0}
        onRate={async (vidId, score) => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return alert('Login to rate!')
            await supabase.from('ratings').upsert({ user_id: user.id, video_id: vidId, score }, { onConflict: 'user_id, video_id' })
        }}
        onClose={() => router.push('/')} 
        onUserClick={(uid) => router.push(`/?u=${uid}`)}
        startMuted={false}
        showHomeButton={true} // Helpful for direct link visitors
      />
    </main>
  )
}