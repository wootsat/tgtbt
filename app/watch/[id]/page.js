import VideoPlayer from '@/components/VideoPlayer'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function getVideoSafe(id) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!url || !key) return null

    const res = await fetch(`${url}/rest/v1/videos?id=eq.${id}&select=*,profiles(username),comments(count)`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      },
      next: { revalidate: 0 }
    })

    if (!res.ok) return null
    
    const data = await res.json()
    return data?.[0] || null

  } catch (error) {
    console.error("Server Fetch Error:", error)
    return null
  }
}

// METADATA GENERATION
export async function generateMetadata({ params }) {
  const { id } = await params
  const video = await getVideoSafe(id)

  if (!video) {
      return { 
          title: 'Watch on TGTBT',
          openGraph: { images: [] } // Safe empty array
      }
  }

  const isVideo = !video.video_url.match(/\.(jpeg|jpg|gif|png|webp)$/i)
  const title = video.title || 'TGTBT'
  const username = video.profiles?.username || 'User'
  const imageUrl = video.video_url

  // Strict check to ensure imageUrl exists
  const images = imageUrl ? [imageUrl] : []

  return {
    title: `${title} | @${username}`,
    description: 'Watch on TGTBT',
    openGraph: {
      title: title,
      description: `Posted by @${username}`,
      url: `https://tgtbt.xyz/watch/${id}`,
      type: 'video.other',
      // Strict undefined checks for arrays
      videos: isVideo ? [{
        url: video.compressed_url || video.video_url,
        width: 1280,
        height: 720,
        type: 'video/mp4'
      }] : undefined,
      images: images,
    },
    twitter: {
      card: isVideo ? 'player' : 'summary_large_image',
      title: title,
      description: `By @${username}`,
      images: images,
      players: isVideo ? [{
        url: video.compressed_url || video.video_url,
        width: 1280,
        height: 720,
      }] : undefined,
    }
  }
}

// MAIN PAGE COMPONENT
export default async function WatchPage({ params }) {
  const { id } = await params
  const video = await getVideoSafe(id)

  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white gap-4">
        <AlertCircle className="text-red-500" size={48} />
        <h1 className="text-xl font-bold">Video Not Found</h1>
        <Link href="/" className="px-6 py-2 bg-white text-black rounded-full font-bold">
            Go Home
        </Link>
      </div>
    )
  }

  return (
    <main className="fixed inset-0 bg-black z-50">
      <VideoPlayer 
        // Pass Only Serializable Data (Strings, Numbers, Booleans)
        videoSrc={video.compressed_url || video.video_url} 
        videoId={video.id}
        audioSrc={video.audio_url}
        isTiled={video.is_tiled}
        
        creatorUsername={video.profiles?.username}
        creatorId={video.user_id}
        
        initialRating={video.average_rating}
        initialCommentCount={video.comments?.[0]?.count || 0}
        
        // NO FUNCTIONS PASSED HERE (Fixes the crash)
        // VideoPlayer handles logic internally now.
        
        startMuted={false} 
        showHomeButton={true} 
      />
    </main>
  )
}