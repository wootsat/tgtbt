import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { Home, PlayCircle, AlertCircle } from 'lucide-react'

// Force the page to be dynamic so it always checks for the latest data
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// 1. FIX: await params for Metadata
export async function generateMetadata({ params }) {
  const { id } = await params // <--- ADDED await
  
  const { data: video } = await supabase.from('videos').select('*').eq('id', id).single()

  if (!video) {
    return { title: 'Video Not Found - TGTBT' }
  }

  return {
    title: video.title,
    description: `Watch ${video.title} on TGTBT`,
    openGraph: {
      title: video.title,
      description: 'Watch on TGTBT',
      url: `https://tgtbt.xyz/watch/${id}`,
      videos: [{ url: video.compressed_url || video.video_url, width: 720, height: 1280, type: 'video/mp4' }],
      images: ['https://tgtbt.xyz/tgtbt_logo.png'],
    },
    twitter: {
      card: 'player',
      title: video.title,
      images: ['https://tgtbt.xyz/tgtbt_logo.png'],
      players: [{ url: `https://tgtbt.xyz/watch/${id}`, width: 720, height: 1280 }],
    },
  }
}

// 2. FIX: await params for Main Page
export default async function WatchPage(props) {
  const params = await props.params // <--- ADDED await
  const { id } = params

  console.log(`[WatchPage] Fetching ID: ${id}`) 

  const { data: video, error } = await supabase
    .from('videos')
    .select('*, profiles(username)')
    .eq('id', id)
    .single()

  if (error) {
    console.error(`[WatchPage] Supabase Error for ID ${id}:`, error.message)
  }

  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4 text-center">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Video Not Found</h1>
        <p className="text-gray-400 mb-6">Could not load video ID: {id}</p>
        <Link href="/" className="bg-blue-600 px-6 py-3 rounded-full font-bold hover:bg-blue-500 transition">
          Go to Home Feed
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white relative">
      
      {/* Home Button */}
      <div className="absolute top-4 left-4 z-50">
        <Link href="/" className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full hover:bg-white/10 transition border border-white/10">
          <Home size={20} /> <span className="font-bold">Home</span>
        </Link>
      </div>

      {/* Video Container */}
      <div className="w-full max-w-md aspect-[9/16] max-h-[85vh] relative bg-gray-900 rounded-xl overflow-hidden shadow-2xl border border-gray-800">
        <video 
          src={video.compressed_url || video.video_url} 
          className="w-full h-full object-contain bg-black" 
          controls 
          autoPlay 
          playsInline
          loop
        />
        
        {/* Info Overlay */}
        <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/90 to-transparent pointer-events-none">
          <h1 className="text-xl font-bold text-white mb-1 drop-shadow-md">{video.title}</h1>
          <p className="text-blue-400 font-bold text-sm drop-shadow-md">@{video.profiles?.username || 'Unknown'}</p>
        </div>
      </div>
      
      {/* Footer Call to Action */}
      <div className="mt-8 flex flex-col items-center gap-3">
        <p className="text-gray-400 text-sm">Want to see more?</p>
        <Link href="/" className="bg-white text-black hover:bg-gray-200 font-black uppercase tracking-widest py-3 px-8 rounded-full transition flex items-center gap-2 transform hover:scale-105">
           <PlayCircle size={20} /> Open App
        </Link>
      </div>
    </div>
  )
}