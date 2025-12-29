import VideoPlayer from '@/components/VideoPlayer'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

// 1. Force Dynamic Rendering
export const dynamic = 'force-dynamic'

// 2. SAFE FETCH
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
    console.error("Fetch Error:", error)
    return null
  }
}

// 3. METADATA GENERATION
export async function generateMetadata({ params }) {
  const { id } = await params
  const video = await getVideoSafe(id)

  const FALLBACK_IMAGE = 'https://tgtbt.xyz/tgtbt_logo.png' 
  
  // -- FALLBACK --
  if (!video || !video.video_url) {
    return {
      title: 'Watch on TGTBT',
      openGraph: { images: [FALLBACK_IMAGE] },
      twitter: { card: 'summary', images: [FALLBACK_IMAGE] }
    }
  }

  // -- DATA PREP --
  const title = video.title || 'TGTBT'
  const username = video.profiles?.username || 'User'
  const description = `Posted by @${username}`
  
  const rawVideoUrl = video.compressed_url || video.video_url || ''
  const rawImage = video.video_url || ''
  
  // 1. Determine if it's an MP4/Video file
  // (If it doesn't end in an image extension, we assume it's a video)
  const isVideo = !rawVideoUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) && rawVideoUrl.startsWith('http')
  
  // 2. Image Logic: If it's a video, use the logo (unless you have a thumbnail_url col). 
  // If it's a GIF/Image, use the file itself.
  const imageUrl = rawImage.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? rawImage : FALLBACK_IMAGE

  // -- CONSTRUCT METADATA --
  return {
    title: `${title} | @${username}`,
    description: description,
    
    // OpenGraph (Used by Telegram, Discord, iMessage)
    openGraph: {
      title: title,
      description: description,
      url: `https://tgtbt.xyz/watch/${id}`,
      siteName: 'TGTBT',
      images: [{ url: imageUrl }],
      type: 'website', // Default
      
      // INJECT VIDEO TAGS (This makes Telegram play MP4s!)
      ...(isVideo && {
          type: 'video.other',
          videos: [{
            url: rawVideoUrl,
            width: 1280,
            height: 720,
            type: 'video/mp4' // Critical for Telegram
          }]
      })
    },

    // Twitter (Keep simple to prevent crash)
    twitter: {
      card: 'summary_large_image', // Safe card type
      title: title,
      description: description,
      images: [imageUrl],
    }
  }
}

// 4. MAIN PAGE
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
        videoSrc={video.compressed_url || video.video_url} 
        videoId={video.id}
        audioSrc={video.audio_url}
        isTiled={video.is_tiled}
        creatorUsername={video.profiles?.username}
        creatorId={video.user_id}
        initialRating={video.average_rating}
        initialCommentCount={video.comments?.[0]?.count || 0}
        
        startMuted={false} 
        showHomeButton={true} 
      />
    </main>
  )
}