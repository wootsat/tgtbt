'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import VideoPlayer from '@/components/VideoPlayer'
import { Loader2, AlertCircle } from 'lucide-react'

export default function WatchPage() {
  const params = useParams() // Safer way to get ID in client components
  const router = useRouter()
  
  const [video, setVideo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Extract ID safely
  const videoId = params?.id

  useEffect(() => {
    // 1. Guard clause: Don't fetch if no ID yet
    if (!videoId) return

    const fetchVideo = async () => {
      try {
        setLoading(true)
        console.log("Fetching video:", videoId)

        // 2. Fetch Video Data
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

  // --- RATING HANDLER ---
  const handleRate = async (vidId, score) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return alert('Login to rate!')
    
    const { error } = await supabase
        .from('ratings')
        .upsert(
            { user_id: user.id, video_id: vidId, score }, 
            { onConflict: 'user_id, video_id' }
        )
        
    if (error) console.error("Rating error:", error)
  }

  // --- NAVIGATION HANDLER ---
  const handleUserClick = (userId) => {
    // Redirect to home with user query param
    router.push(`/?u=${userId}`)
  }

  const handleClose = () => {
    router.push('/')
  }

  // --- RENDER STATES ---

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white gap-4">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <p className="text-gray-400 text-sm animate-pulse">Loading TGTBT...</p>
      </div>
    )
  }

  if (error || !video) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white gap-6 p-4 text-center">
        <AlertCircle className="text-red-500" size={64} />
        <div>
            <h1 className="text-2xl font-bold mb-2">Video Not Found</h1>
            <p className="text-gray-400 mb-6 max-w-md">
                {error === "Video not found in database" 
                    ? "This video may have been deleted or the link is incorrect." 
                    : "Something went wrong while loading this video."}
            </p>
            <button 
                onClick={() => router.push('/')}
                className="bg-white text-black px-6 py-3 rounded-full font-bold hover:bg-gray-200 transition"
            >
                Return Home
            </button>
        </div>
      </div>
    )
  }

  // --- SUCCESS STATE ---
  return (
    <main className="fixed inset-0 bg-black z-50">
      <VideoPlayer 
        // Media Props
        videoSrc={video.compressed_url || video.video_url} 
        videoId={video.id}
        audioSrc={video.audio_url}
        isTiled={video.is_tiled} // IMPORTANT: Pass the tiled state
        
        // Creator Props
        creatorUsername={video.profiles?.username}
        creatorId={video.user_id}
        
        // Interaction Props
        initialRating={video.average_rating}
        initialCommentCount={video.comments?.[0]?.count || 0}
        onRate={handleRate}
        onClose={handleClose} 
        onUserClick={handleUserClick}
        
        // Config Props
        startMuted={false}
        showHomeButton={true} 
      />
    </main>
  )
}