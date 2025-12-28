import WatchClient from '@/components/WatchClient'

// Force dynamic rendering so Next.js doesn't crash trying to build static pages for IDs that don't exist yet
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }) {
  try {
    const { id } = await params
    
    // 1. Check Env Vars (Common crash point)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!url || !key) {
      console.log('Missing env vars')
      return { title: 'TGTBT' }
    }

    // 2. Fetch Data
    const res = await fetch(`${url}/rest/v1/videos?id=eq.${id}&select=*,profiles(username)`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      },
      next: { revalidate: 0 } // No cache
    })

    if (!res.ok) return { title: 'TGTBT' }
    
    const data = await res.json()
    const video = data?.[0]
    
    if (!video) return { title: 'TGTBT' }

    // 3. Construct Metadata (Safely)
    // If it's a video file (mp4/mov), we treat it as video. If gif/image, treat as image.
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
            url: video.compressed_url || video.video_url, // Prefer compressed
            width: 1280,
            height: 720,
            type: 'video/mp4'
        }] : undefined,
        images: [{ url: imageUrl }],
      }
    }

  } catch (e) {
    console.error('Metadata failed:', e)
    return { title: 'TGTBT' }
  }
}

export default async function WatchPage({ params }) {
  const { id } = await params
  return <WatchClient videoId={id} />
}