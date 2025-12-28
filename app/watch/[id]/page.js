import WatchClient from '@/components/WatchClient'

// Helper to fetch video data without using the Supabase Client SDK (which crashes server-side)
async function fetchVideoData(id) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    // Direct REST API call to Supabase (Safer for Server Components)
    const response = await fetch(
      `${supabaseUrl}/rest/v1/videos?id=eq.${id}&select=*,profiles(username),comments(count)`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        cache: 'no-store' // Ensure fresh data
      }
    )
    
    const data = await response.json()
    return data && data.length > 0 ? data[0] : null
  } catch (e) {
    console.error("Metadata fetch error:", e)
    return null
  }
}

export async function generateMetadata({ params }) {
  // Handle async params (Next.js 15+ safety)
  const resolvedParams = await params
  const id = resolvedParams?.id

  if (!id) return { title: 'TGTBT' }

  const video = await fetchVideoData(id)

  if (!video) {
    return { title: 'Video Not Found - TGTBT' }
  }

  const isVideo = !video.video_url.match(/\.(jpeg|jpg|gif|png|webp)$/i)

  return {
    title: `${video.title} | TGTBT by @${video.profiles?.username || 'Unknown'}`,
    description: 'Watch this Too Good To Be True moment.',
    openGraph: {
      title: video.title,
      description: `Posted by @${video.profiles?.username}`,
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
      title: video.title,
      description: `By @${video.profiles?.username}`,
      images: [video.video_url],
      players: isVideo ? [{
          url: video.compressed_url || video.video_url,
          width: 1280,
          height: 720,
      }] : undefined,
    }
  }
}

export default async function WatchPage({ params }) {
  const resolvedParams = await params
  return <WatchClient videoId={resolvedParams.id} />
}