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

// 3. METADATA GENERATION (Strict Mode)
export async function generateMetadata({ params }) {
  const { id } = await params
  const video = await getVideoSafe(id)

  // Default Fallback (Safe)
  const defaultMeta = {
    title: 'Watch on TGTBT',
    description: 'Too Good To Be True',
    openGraph: {
        title: 'Watch on TGTBT',
        images: ['https://tgtbt.xyz/tgtbt_logo.png'] // Replace with a real valid image URL from your public folder if possible
    },
    twitter: {
        card: 'summary',
        title: 'Watch on TGTBT',
        images: ['https://tgtbt.xyz/tgtbt_logo.png']
    }
  }

  if (!video || !video.video_url) return defaultMeta

  // Strict Data Sanitization
  const title = video.title || 'TGTBT'
  const username = video.profiles?.username || 'User'
  const description = `Posted by @${username}`
  const videoUrl = video.compressed_url || video.video_url
  
  // Ensure Image is a valid absolute URL string or fallback
  const rawImage = video.video_url
  const imageUrl = rawImage && rawImage.startsWith('http') ? rawImage : 'https://tgtbt.xyz/tgtbt_logo.png'

  const isVideo = !videoUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i)

  // OpenGraph Construction
  const og = {
    title: title,
    description: description,
    url: `https://tgtbt.xyz/watch/${id}`,
    siteName: 'TGTBT',
    images: [{ url: imageUrl }],
    type: 'website' // Default to website to be safe
  }

  // Twitter Construction
  const twitter = {
    card: 'summary_large_image',
    title: title,
    description: description,
    images: [imageUrl],
  }

  // Only add Video tags if we are 100% sure it's a video
  if (isVideo && videoUrl) {
      og.type = 'video.other'
      og.videos = [{
          url: videoUrl,
          width: 1280,
          height: 720,
          type: 'video/mp4'
      }]

      twitter.card = 'player'
      twitter.players = [{
          url: videoUrl,
          width: 1280,
          height: 720,
      }]
  }

  return {
    title: `${title} | @${username}`,
    description: description,
    openGraph: og,
    twitter: twitter
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
        
        // Pass Only Primitives
        startMuted={false} 
        showHomeButton={true} 
      />
    </main>
  )
}