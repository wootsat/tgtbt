import WatchClient from '@/components/WatchClient'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

// 1. Force Dynamic Rendering
export const dynamic = 'force-dynamic'

// 2. SAFE FETCH (Server Side)
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

// 3. METADATA GENERATION (Generic Card)
export async function generateMetadata({ params }) {
  const { id } = await params
  const video = await getVideoSafe(id)

  // GENERIC CARD IMAGE (Reliable)
  const GENERIC_IMAGE = 'https://tgtbt.xyz/tgtbt_logo.png'
  
  // Defaults if video not found
  if (!video) {
    return {
      title: 'Watch on TGTBT',
      description: 'Too Good To Be True',
      openGraph: { images: [GENERIC_IMAGE] },
      twitter: { card: 'summary', images: [GENERIC_IMAGE] }
    }
  }

  // --- PREVIEW CARD INFO ---
  // We show the specific Title and Username, but keep the image generic
  // to ensure the link preview works perfectly on all platforms.
  const title = video.title || 'TGTBT'
  const username = video.profiles?.username || 'User'
  const description = `Watch this video by @${username} on TGTBT`

  return {
    title: `${title} | @${username}`,
    description: description,
    openGraph: {
      title: title,
      description: description,
      url: `https://tgtbt.xyz/watch/${id}`,
      siteName: 'TGTBT',
      images: [{ url: GENERIC_IMAGE }],
      type: 'website', 
    },
    twitter: {
      card: 'summary', // "summary" shows a small square image, "summary_large_image" shows big rectangle
      title: title,
      description: description,
      images: [GENERIC_IMAGE], 
    }
  }
}

// 4. MAIN PAGE COMPONENT
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

  // Pass data to the Client Component (Interaction Wall)
  return <WatchClient video={video} />
}