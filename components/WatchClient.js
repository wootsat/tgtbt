'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import VideoPlayer from '@/components/VideoPlayer'
import { supabase } from '@/lib/supabaseClient'
import { Play } from 'lucide-react'

export default function WatchClient({ video }) {
  const router = useRouter()
  const [hasInteracted, setHasInteracted] = useState(false)

  // Handle rating inside the client
  const handleRate = async (vidId, score) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return alert('Login to rate!')
    
    await supabase.from('ratings').upsert(
        { user_id: user.id, video_id: vidId, score }, 
        { onConflict: 'user_id, video_id' }
    )
  }

  // --- 1. INTERACTION WALL (First Screen) ---
  if (!hasInteracted) {
     return (
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-6 text-center z-50">
           {/* Background Preview (Blurred) */}
           <div className="absolute inset-0 opacity-30 blur-xl pointer-events-none overflow-hidden">
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
              <p className="text-gray-400 mb-8 italic text-lg">"{video.title}"</p>
              
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

  // --- 2. REAL PLAYER (Mounts after click, Audio allowed) ---
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
        
        // Navigation Handlers
        onClose={() => router.push('/')} 
        onUserClick={(userId) => router.push(`/?u=${userId}`)}
        
        // AUDIO ON (Safe because user just clicked!)
        startMuted={false} 
        showHomeButton={true} 
      />
    </main>
  )
}