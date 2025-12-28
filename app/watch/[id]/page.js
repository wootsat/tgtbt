import VideoPlayer from '@/components/VideoPlayer'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

// 1. Force Dynamic Rendering (Critical for dynamic IDs)
export const dynamic = 'force-dynamic'

// 2. HELPER: Safe Data Fetching
// This wraps the fetch in a try/catch so it NEVER crashes the server
async function getVideoSafe(id) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Debug Log: Check server logs to see if these are printing!
    if (!supabaseUrl || !supabaseKey) {
      console.error("CRITICAL: Missing Env Vars on Server")
      return null
    }

    const res = await fetch(`${supabaseUrl}/rest/v1/videos?id=eq.${id}&select=*,profiles(username),comments(count)`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      next: { revalidate: 0 }
    })

    if (!res.ok) {
      console.error(`Supabase Error: ${res.status} ${res.statusText}`)
      return null
    }
    
    const data = await res.json()
    return data?.[0] || null

  } catch (error) {
    console.error("Server Fetch Exception:", error)
    return null
  }
}

// 3. METADATA (Telegram / X Previews)
export async function generateMetadata({ params }) {
  const { id } = await params
  const video = await getVideoSafe(id)

  // FALLBACK: If fetch fails, show generic metadata (Prevents Crash)
  if (!video) {
    return {
      title: 'Watch on TGTBT',
      description: 'Too Good To Be True',
      openGraph: {
        title: 'Watch on TGTBT',
        description: 'Check out this video',
        url: `https://tgtbt.xyz/watch/${id}`,
        images: ['https://tgtbt.xyz/tgtbt_logo.png'], // Ensure you have a default logo hosted
      }
    }
  }

  // SUCCESS: Show Rich Preview
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

// 4. PAGE COMPONENT
export default async function WatchPage({ params }) {
  const { id } = await params
  const video = await getVideoSafe(id)

  // ERROR STATE (If fetch failed or ID doesn't exist)
  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white gap-4">
        <AlertCircle className="text-red-500" size={48} />
        <h1 className="text-xl font-bold">Video Not Found</h1>
        <p className="text-gray-500 text-sm">Target ID: {id}</p>
        <Link href="/" className="px-6 py-2 bg-white text-black rounded-full font-bold hover:scale-105 transition">
            Go Home
        </Link>
      </div>
    )
  }

  // SUCCESS STATE
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
        
        // Use empty functions for server-side props that require interaction
        // The VideoPlayer handles navigation internally now via useRouter
        onRate={() => {}} 
        onClose={() => {}} 
        
        startMuted={false} 
        showHomeButton={true} 
      />
    </main>
  )
}