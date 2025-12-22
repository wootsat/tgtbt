import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import WatchView from '@/components/WatchView' // Import the new client component

export const dynamic = 'force-dynamic'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// --- 1. METADATA (Keep this for Twitter/X Cards) ---
export async function generateMetadata(props) {
  try {
    const params = await props.params
    const { id } = params
    
    const supabase = getSupabase()
    if (!supabase) return { title: 'Configuration Error' }

    const { data: video } = await supabase.from('videos').select('*').eq('id', id).single()

    if (!video) return { title: 'Video Not Found - TGTBT' }

    const safeTitle = video.title || 'Untitled TGTBT Video'
    const safeDesc = `Watch ${safeTitle} on TGTBT`
    const videoUrl = video.compressed_url || video.video_url
    const pageUrl = `https://tgtbt.xyz/watch/${id}`
    const imageUrl = 'https://tgtbt.xyz/tgtbt_logo.png'

    return {
      title: safeTitle,
      description: safeDesc,
      openGraph: {
        title: safeTitle,
        description: safeDesc,
        url: pageUrl,
        videos: [{ url: videoUrl, width: 720, height: 1280, type: 'video/mp4' }],
        images: [imageUrl],
      },
      other: {
        'twitter:card': 'player',
        'twitter:title': safeTitle,
        'twitter:description': safeDesc,
        'twitter:image': imageUrl,
        'twitter:player': pageUrl,
        'twitter:player:width': '720',
        'twitter:player:height': '1280',
      }
    }
  } catch (e) {
    return { title: 'TGTBT' }
  }
}

// --- 2. MAIN PAGE ---
export default async function WatchPage(props) {
  let video = null
  let errorMsg = null

  try {
    const params = await props.params 
    const id = params.id
    const supabase = getSupabase()

    if (!supabase) throw new Error("Missing Supabase Config")

    // We fetch comments count here too so the player has it ready
    const { data, error } = await supabase
      .from('videos')
      .select('*, profiles(username), comments(count)')
      .eq('id', id)
      .single()
      
    if (error) throw error
    video = data

  } catch (err) {
    errorMsg = err.message
  }

  if (errorMsg || !video) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4 text-center">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Video Unavailable</h1>
        <p className="text-gray-400 mb-6 text-sm">{errorMsg || "Could not load video."}</p>
        <Link href="/" className="bg-blue-600 px-6 py-3 rounded-full font-bold hover:bg-blue-500 transition">
          Go to Home Feed
        </Link>
      </div>
    )
  }

  // Render the interactive Client Component
  return <WatchView initialVideo={video} />
}