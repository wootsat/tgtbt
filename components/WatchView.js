'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import VideoPlayer from '@/components/VideoPlayer'

export default function WatchView({ initialVideo }) {
  const router = useRouter()
  const [video, setVideo] = useState(initialVideo)

  // Re-use the Rating Logic from Feed.js
  const handleRate = async (videoId, score) => {
    const { data: { user } } = await supabase.auth.getUser()
    
    // If not logged in, prompt user (or redirect)
    if (!user) {
      alert("Please log in to rate videos!")
      // Optional: router.push('/login')
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

    // Refresh the local video data to show new average
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

  // Handle Closing (Go to Home Feed)
  const handleClose = () => {
    router.push('/')
  }

  // Handle User Click (Go to Home Feed for now, or profile if we have routing set up)
  const handleUserClick = () => {
    router.push('/')
  }

  return (
    // We force the container to be full screen black, exactly like the feed modal
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <VideoPlayer 
        videoSrc={video.compressed_url || video.video_url} 
        videoId={video.id}
        initialRating={video.average_rating}
        initialCommentCount={video.comments?.[0]?.count || 0} 
        onRate={handleRate}
        onClose={handleClose} 
        onUserClick={handleUserClick}
        
        // SHARE SPECIFIC: Must start muted to bypass browser autoplay blocks
        startMuted={true}
      />
    </div>
  )
}