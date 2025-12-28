import WatchClient from '@/components/WatchClient'

// Ensures the server doesn't crash trying to build static pages for IDs that don't exist
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }) {
  try {
    const resolvedParams = await params
    const id = resolvedParams?.id

    if (!id) return { title: 'TGTBT' }

    // 1. Check Env Vars (Prevent Server Crash)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!url || !key) return { title: 'TGTBT' }

    // 2. Fetch Data via REST (Server Safe)
    const res = await fetch(`${url}/rest/v1/videos?id=eq.${id}&select=*,profiles(username)`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      },
      next: { revalidate: 0 } // Always fetch fresh data
    })

    if (!res.ok) return { title: 'TGTBT' }
    
    const data = await res.json()
    const video = data?.[0]
    
    if (!video) return { title: 'TGTBT' }

    // 3. Build Tags for Telegram/Discord
    const isVideo = !video.video_url.match(/\.(jpeg|jpg|gif|png|webp)$/i)
    const title = video.title || 'TGTBT'
    const username = video.profiles?.username || 'User'
    const mediaUrl = video.compressed_url || video.video_url

    return {
      title: `${title} | @${username}`,
      description: 'Watch on TGTBT',
      openGraph: {
        title: title,
        description: `Posted by @${username}`,
        url: `https://tgtbt.xyz/watch/${id}`,
        type: 'video.other',
        videos: isVideo ? [{
            url: mediaUrl,
            width: 1280,
            height: 720,
            type: 'video/mp4'
        }] : undefined,
        images: [{ url: video.video_url }], // Always provide an image tag (even for videos) as fallback
      },
      twitter: {
        card: isVideo ? 'player' : 'summary_large_image',
        title: title,
        description: `By @${username}`,
        images: [video.video_url],
        players: isVideo ? [{
            url: mediaUrl,
            width: 1280,
            height: 720,
        }] : undefined,
      }
    }

  } catch (e) {
    console.error('Metadata failed:', e)
    return { title: 'TGTBT' }
  }
}

export default async function WatchPage({ params }) {
  const resolvedParams = await params
  return <WatchClient videoId={resolvedParams.id} />
}