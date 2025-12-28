import WatchClient from '@/components/WatchClient'

// 1. GENERATE METADATA (Telegram/Discord Previews)
export async function generateMetadata({ params }) {
  // Safe param handling for all Next.js versions
  const resolvedParams = await params
  const id = resolvedParams?.id

  // 1. Fail-safe: If no ID, return default
  if (!id) return { title: 'TGTBT' }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // 2. Fail-safe: If env vars are missing on server, return default immediately
    // (This prevents the crash caused by fetching 'undefined/rest/v1/...')
    if (!supabaseUrl || !supabaseKey) {
      console.warn("Missing Env Vars on Server - Skipping Metadata Fetch")
      return { title: 'TGTBT' }
    }

    // 3. Attempt Fetch
    const response = await fetch(
      `${supabaseUrl}/rest/v1/videos?id=eq.${id}&select=*,profiles(username)`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        next: { revalidate: 60 }
      }
    )

    // 4. Fail-safe: If fetch fails (404/500), return default
    if (!response.ok) {
        return { title: 'TGTBT' }
    }

    const data = await response.json()
    const video = data?.[0]

    // 5. Fail-safe: If video not found, return default
    if (!video) return { title: 'TGTBT' }

    // --- SUCCESS: Build the Preview Tags ---
    const isVideo = !video.video_url.match(/\.(jpeg|jpg|gif|png|webp)$/i)
    const title = video.title || 'TGTBT'
    const desc = `TGTBT by @${video.profiles?.username || 'User'}`
    const imageUrl = video.video_url

    return {
      title: title,
      description: desc,
      openGraph: {
        title: title,
        description: desc,
        type: 'video.other',
        url: `https://tgtbt.xyz/watch/${id}`,
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
    // 6. Fail-safe: Catch ANY other error and just load the page
    console.error("Metadata Generation Error:", error)
    return { title: 'TGTBT' }
  }
}

// 2. PAGE COMPONENT
export default async function WatchPage({ params }) {
  const resolvedParams = await params
  return <WatchClient videoId={resolvedParams.id} />
}