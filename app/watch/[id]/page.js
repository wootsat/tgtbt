import WatchClient from '@/components/WatchClient'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

// --- SAFE FETCH ---
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

// --- METADATA (Telegram Card) ---
export async function generateMetadata({ params }) {
  const { id } = await params
  const video = await getVideoSafe(id)

  // 1. CONSTANTS
  // Ensure this file actually exists in your public folder!
  const FALLBACK_IMAGE = 'https://tgtbt.xyz/tgtbt_logo.png' 

  // 2. FALLBACK (If video not found)
  if (!video) {
    return {
      title: 'Watch on TGTBT',
      description: 'Too Good To Be True',
      openGraph: {
        title: 'Watch on TGTBT',
        images: [{ url: FALLBACK_IMAGE }],
      },
      twitter: {
        card: 'summary',
        images: [FALLBACK_IMAGE],
      }
    }
  }

  // 3. PREPARE DATA
  const title = video.title || 'TGTBT'
  const username = video.profiles?.username || 'User'
  const description = `Watch this video by @${username} on TGTBT`
  
  // Try to use the actual video URL as the image if it is an image
  // Otherwise, fallback to the logo.
  const rawUrl = video.video_url || ''
  const isImageFile = rawUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i)
  
  const imageUrl = (isImageFile && rawUrl.startsWith('http')) 
    ? rawUrl 
    : FALLBACK_IMAGE

  // 4. RETURN TAGS
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
      card: 'summary_large_image', // Big pretty card
      title: title,
      description: description,
      images: [imageUrl], 
    }
  }
}

// --- MAIN PAGE ---
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

  return <WatchClient video={video} />
}