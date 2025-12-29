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

// 3. METADATA GENERATION (Safe Mode)
export async function generateMetadata({ params }) {
  const { id } = await params
  const video = await getVideoSafe(id)

  // -- FALLBACK --
  // Use a reliable public image (like your logo) if video is missing
  const FALLBACK_IMAGE = 'https://tgtbt.xyz/tgtbt_logo.png' 
  
  if (!video || !video.video_url) {
    return {
      title: 'Watch on TGTBT',
      description: 'Too Good To Be True',
      openGraph: { images: [FALLBACK_IMAGE] },
      twitter: { card: 'summary', images: [FALLBACK_IMAGE] }
    }
  }

  // -- DATA PREP --
  const title = video.title || 'TGTBT'
  const username = video.profiles?.username || 'User'
  const description = `Posted by @${username}`
  
  // Clean URL check
  const rawImage = video.video_url || ''
  const imageUrl = rawImage.startsWith('http') ? rawImage : FALLBACK_IMAGE

  // -- CONSTRUCT METADATA --
  // We use 'summary_large_image' for everything. 
  // This shows a big preview image in Telegram/X and prevents the "players" crash.
  return {
    title: `${title} | @${username}`,
    description: description,
    openGraph: {
      title: title,
      description: description,
      url: `https://tgtbt.xyz/watch/${id}`,
      siteName: 'TGTBT',
      images: [{ url: imageUrl }],
      type: 'website', 
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: [imageUrl], // Must be an array of strings
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
        // Pass only primitives to Client Component
        videoSrc={video.compressed_url || video.video_url} 
        videoId={video.id}
        audioSrc={video.audio_url}
        isTiled={video.is_tiled}
        creatorUsername={video.profiles?.username}
        creatorId={video.user_id}
        initialRating={video.average_rating}
        initialCommentCount={video.comments?.[0]?.count || 0}
        
        // Settings
        startMuted={false} 
        showHomeButton={true} 
      />
    </main>
  )
}