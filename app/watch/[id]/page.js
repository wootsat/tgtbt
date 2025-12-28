import WatchClient from '@/components/WatchClient'

// 1. GENERATE METADATA (Server-Side)
// This runs on the server to give Telegram/Discord the preview tags
export async function generateMetadata({ params }) {
  // Await params for Next.js 15 compatibility
  const { id } = await params

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Use standard FETCH instead of the Supabase Client SDK to avoid server crashes
    const response = await fetch(
      `${supabaseUrl}/rest/v1/videos?id=eq.${id}&select=*,profiles(username)`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        // Revalidate every minute so we don't hit the DB too hard
        next: { revalidate: 60 } 
      }
    )

    if (!response.ok) {
       console.error("Metadata fetch failed", response.statusText)
       return { title: 'TGTBT' }
    }

    const data = await response.json()
    const video = data?.[0]

    if (!video) return { title: 'TGTBT' }

    // Prepare tags
    const isVideo = !video.video_url.match(/\.(jpeg|jpg|gif|png|webp)$/i)
    const title = `${video.title}`
    const desc = `TGTBT by @${video.profiles?.username || 'User'}`
    const imageUrl = video.video_url // Use the raw URL for the preview image

    return {
      title: title,
      description: desc,
      openGraph: {
        title: title,
        description: desc,
        type: 'video.other',
        url: `https://tgtbt.xyz/watch/${id}`,
        // Telegram uses these to show the player inline
        videos: isVideo ? [{
          url: video.compressed_url || video.video_url,
          width: 1280,
          height: 720,
          type: 'video/mp4',
        }] : undefined,
        images: [{ url: imageUrl }],
      },
      twitter: {
        card: isVideo ? 'player' : 'summary_large_image',
        title: title,
        description: desc,
        images: [imageUrl],
        players: isVideo ? [{
          url: video.compressed_url || video.video_url,
          width: 1280,
          height: 720,
        }] : undefined,
      }
    }
  } catch (error) {
    console.error("Metadata Error:", error)
    return { title: 'TGTBT' } // Fallback so the page never crashes
  }
}

// 2. PAGE COMPONENT (Server-Side)
export default async function WatchPage({ params }) {
  const { id } = await params
  
  // Pass the ID to the client component, which handles the user interaction
  return <WatchClient videoId={id} />
}