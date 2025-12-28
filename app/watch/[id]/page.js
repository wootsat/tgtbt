import VideoPlayer from '@/components/VideoPlayer'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

// 1. Force Dynamic (Prevents caching old errors)
export const dynamic = 'force-dynamic'

// 2. SHARED FETCH FUNCTION (Safe for Server)
// This uses a raw web request instead of the Supabase SDK to avoid crashes
async function getVideo(id) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) return null

    const res = await fetch(`${url}/rest/v1/videos?id=eq.${id}&select=*,profiles(username),comments(count)`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      },
      next: { revalidate: 0 } // No cache
    })

    if (!res.ok) return null
    
    const data = await res.json()
    return data?.[0] || null
  } catch (e) {
    console.error("Fetch error:", e)
    return null
  }
}

// 3. METADATA GENERATOR (For Telegram/Discord)
export async function generateMetadata({ params }) {
  const { id } = await params
  const video = await getVideo(id)

  if (!video) return { title: 'TGTBT' }

  const isVideo = !video.video_url.match(/\.(jpeg|jpg|gif|png|webp)$/i)
  const title = video.title || 'TGTBT'
  const username = video.profiles?.username || 'User'
  const imageUrl = video.video_url

  return {
    title: `${title} | @${username}`,
    description: 'Watch on TGTBT',
    openGraph: {
      title: title,
      description: `Posted by @${username}`,
      url: `https://tgtbt.xyz/watch/${id}`,
      type: 'video.other',
      videos: isVideo ? [{
        url: video.compressed_url || video.video_url,
        width: 1280,
        height: 720,
        type: 'video/mp4'
      }] : undefined,
      images: [{ url: imageUrl }],
    },
    twitter: {
      card: isVideo ? 'player' : 'summary_large_image',
      title: title,
      description: `By @${username}`,
      images: [imageUrl],
      players: isVideo ? [{
        url: video.compressed_url || video.video_url,
        width: 1280,
        height: 720,
      }] : undefined,
    }
  }
}

// 4. MAIN PAGE COMPONENT (Server Side)
export default async function WatchPage({ params }) {
  const { id } = await params
  const video = await getVideo(id)

  // Error State (If fetch failed)
  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white gap-4">
        <AlertCircle className="text-red-500" size={48} />
        <h1 className="text-xl font-bold">Video Not Found</h1>
        <Link href="/" className="text-blue-400 hover:underline mt-2">
            Return Home
        </Link>
      </div>
    )
  }

  // Success State: Pass data to Client Player
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
        
        // No client-side handlers passed here initially (VideoPlayer handles its own via context/internal logic if needed)
        // Or we pass empty handlers and let the component internal logic handle auth checks
        onRate={() => {}} 
        onClose={() => {}} // We need to handle this inside VideoPlayer or pass a simple redirect
        
        // Auto-play settings
        startMuted={false} 
        showHomeButton={true} 
      />
    </main>
  )
}