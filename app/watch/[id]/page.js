import WatchClient from '@/components/WatchClient'

// Helper to fetch video data safely
async function fetchVideoData(id) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) return null

    // Direct REST API call (Safe for Server)
    const response = await fetch(
      `${supabaseUrl}/rest/v1/videos?id=eq.${id}&select=*,profiles(username),comments(count)`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        next: { revalidate: 60 } // Cache for 60 seconds to prevent hammering DB
      }
    )
    
    if (!response.ok) return null
    
    const data = await response.json()
    return data && data.length > 0 ? data[0] : null
  } catch (e) {
    console.error("Metadata fetch error:", e)
    return null
  }
}

// 1. GENERATE METADATA (Telegram/Discord/iMessage Previews)
// Wrapped in try/catch to preventing crashing if DB is unreachable
export async function generateMetadata({ params }) {
  try {
    const resolvedParams = await params
    const id = resolvedParams?.id

    if (!id) return { title: 'TGTBT' }

    const video = await fetchVideoData(id)

    // Fallback if video not found or fetch failed
    if (!video) {
      return { 
        title: 'TGTBT',
        description: 'Watch this Too Good To Be True moment.'
      }
    }

    const isVideo = !video.video_url.match(/\.(jpeg|jpg|gif|png|webp)$/i)
    const title = `${video.title} | TGTBT by @${video.profiles?.username || 'User'}`

    return {
      title: title,
      description: 'Watch this Too Good To Be True moment.',
      openGraph: {
        title: title,
        description: `Posted by @${video.profiles?.username || 'User'}`,
        type: 'video.other',
        url: `https://tgtbt.xyz/watch/${id}`,
        videos: isVideo ? [{
            url: video.compressed_url || video.video_url,
            width: 1280, 
            height: 720,
            type: 'video/mp4',
        }] : undefined,
        images: [{ url: video.video_url }],
      },
      twitter: {
        card: isVideo ? 'player' : 'summary_large_image',
        title: title,
        description: `By @${video.profiles?.username || 'User'}`,
        images: [video.video_url],
        players: isVideo ? [{
            url: video.compressed_url || video.video_url,
            width: 1280,
            height: 720,
        }] : undefined,
      }
    }
  } catch (error) {
    console.error("Critical Metadata Error:", error)
    return { title: 'TGTBT' } // Safe fallback
  }
}

// 2. PAGE COMPONENT
export default async function WatchPage({ params }) {
  const resolvedParams = await params
  // Just pass the ID to the client. 
  // The Client Component handles the actual loading/playing.
  return <WatchClient videoId={resolvedParams.id} />
}