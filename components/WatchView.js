'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import VideoPlayer from '@/components/VideoPlayer'

export default function WatchView({ initialVideo }) {
  const router = useRouter()
  const [video, setVideo] = useState(initialVideo)

  const handleRate = async (videoId, score) => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      alert("Please log in to rate videos!")
      return 
    }

    const { error } = await supabase.from('ratings').upsert(
      { user_id: user.id, video_id: videoId, score: score }, 
      { onConflict: 'user_id, video_id' }
    )

    if (error) {
      console.error("Error submitting rating:", error.message)
      return
    }

    setTimeout(async () => {
      const { data: updatedVideo } = await supabase
        .from('videos')
        .select('average_rating')
        .eq('id', videoId)
        .single()

      if (updatedVideo) {
        setVideo(prev => ({ ...prev, average_rating: updatedVideo.average_rating }))
      }
    }, 250) 
  }

  const handleClose = () => {
    router.push('/')
  }

  const handleUserClick = () => {
    router.push('/')
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <VideoPlayer 
        videoSrc={video.compressed_url || video.video_url} 
        videoId={video.id}
        initialRating={video.average_rating}
        initialCommentCount={video.comments?.[0]?.count || 0} 
        onRate={handleRate}
        onClose={handleClose} 
        onUserClick={handleUserClick}
        
        // 1. Muted for autoplay on links
        startMuted={true}
        // 2. SHOW LOGO (Because this is a standalone page)
        showHomeButton={true} 
      />
    </div>
  )
}