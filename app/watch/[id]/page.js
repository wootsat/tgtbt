'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import VideoPlayer from '@/components/VideoPlayer'
import { Loader2, AlertCircle, Play } from 'lucide-react'

export default function WatchPage() {
  const params = useParams()
  const router = useRouter()
  
  const [video, setVideo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // NEW: We wait for a user interaction before showing the player
  const [hasInteracted, setHasInteracted] = useState(false)

  const videoId = params?.id

  useEffect(() => {
    if (!videoId) return

    const fetchVideo = async () => {
      try {
        setLoading(true)
        const { data, error: fetchError } = await supabase
          .from('videos')
          .select('*, profiles(username), comments(count)')
          .eq('id', videoId)
          .single()

        if (fetchError) throw fetchError
        if (!data) throw new Error("Video not found in database")

        setVideo(data)
      } catch (err) {
        console.error("Error fetching video:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchVideo()
  }, [videoId])

  const handleRate = async (vidId, score) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return alert('Login to rate!')
    
    await supabase
        .from('ratings')
        .upsert(
            { user_id: user.id, video_id: vidId, score }, 
            { onConflict: 'user_id, video_id' }
        )
  }

  // --- RENDER STATES ---

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white gap-4">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    )
  }

  if (error || !video) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white gap-6 p-4 text-center">
        <AlertCircle className="text-red-500" size={64} />
        <div>
            <h1 className="text-2xl font-bold mb-2">Video Not Found</h1>
            <button onClick={() => router.push('/')} className="mt-4 bg-white text-black px-6 py-3 rounded-full font-bold">
                Go Home
            </button>
        </div>
      </div>
    )
  }

  // --- INTERACTION WALL (The Fix) ---
  // We show this "Cover Screen" first. When clicked, we set hasInteracted(true).
  // Because this is a click, the VideoPlayer that mounts next is allowed to play sound.
  if (!hasInteracted) {
     return (
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-6 text-center z-50">
           {/* Background Preview (Muted & Blurred for effect) */}
           <div className="absolute inset-0 opacity-30 blur-xl pointer-events-none">
              {video.video_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                 <img src={video.video_url} className="w-full h-full object-cover" />
              ) : (
                 <video src={video.compressed_url || video.video_url} className="w-full h-full object-cover" muted />
              )}
           </div>

           <div className="relative z-10 flex flex-col items-center animate-in fade-in zoom-in duration-300">
              <img src="/tgtbt_logo.png" className="w-48 mb-8 drop-shadow-2xl" />
              
              <h1 className="text-white text-xl font-bold mb-2">
                 @{video.profiles?.username || 'User'} sent you a TGTBT
              </h1>
              <p className="text-gray-400 mb-8 italic">"{video.title}"</p>
              
              <button 
                onClick={() => setHasInteracted(true)}
                className="group flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-full font-black text-lg transition-all transform hover:scale-105 shadow-xl hover:shadow-blue-500/50"
              >
                <Play className="fill-white" /> WATCH NOW
              </button>
           </div>
        </div>
     )
  }

  // --- ACTUAL PLAYER (Only mounts after click) ---
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
        
        startMuted={false} // This is now safe because the user just clicked!
        showHomeButton={true} 
      />
    </main>
  )
}