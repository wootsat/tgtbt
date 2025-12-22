import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { Home, PlayCircle } from 'lucide-react'

// 1. Setup a temporary Supabase client for the Server
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// 2. Generate Metadata (This makes the Twitter Card work)
export async function generateMetadata({ params }) {
  const { id } = params
  const { data: video } = await supabase.from('videos').select('*').eq('id', id).single()

  if (!video) {
    return { title: 'Video Not Found - TGTBT' }
  }

  const videoUrl = video.compressed_url || video.video_url

  return {
    title: video.title,
    description: 'Watch on TGTBT',
    openGraph: {
      title: video.title,
      description: 'Watch this video on TGTBT',
      type: 'video.other',
      url: `https://tgtbt.xyz/watch/${id}`,
      videos: [
        {
          url: videoUrl,
          width: 720,
          height: 1280,
          type: 'video/mp4',
        },
      ],
      images: ['https://tgtbt.xyz/tgtbt_logo.png'], // Fallback image if no thumbnail
    },
    twitter: {
      card: 'player',
      title: video.title,
      description: 'Watch on TGTBT',
      images: ['https://tgtbt.xyz/tgtbt_logo.png'],
      players: [
        {
          url: `https://tgtbt.xyz/watch/${id}`, // Points to this page
          width: 720,
          height: 1280,
        },
      ],
    },
  }
}

// 3. The actual Page UI
export default async function WatchPage({ params }) {
  const { id } = params
  const { data: video } = await supabase.from('videos').select('*, profiles(username)').eq('id', id).single()

  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
        <h1 className="text-2xl font-bold mb-4">Video not found</h1>
        <Link href="/" className="text-blue-400 flex items-center gap-2"><Home /> Go Home</Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      {/* Navbarish thing */}
      <div className="absolute top-4 left-4 z-50">
        <Link href="/" className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full hover:bg-white/10 transition">
          <Home size={20} /> <span className="font-bold">Home</span>
        </Link>
      </div>

      <div className="w-full max-w-md h-[80vh] relative bg-gray-900 rounded-xl overflow-hidden shadow-2xl border border-gray-800">
        <video 
          src={video.compressed_url || video.video_url} 
          className="w-full h-full object-contain" 
          controls 
          autoPlay 
          playsInline
          loop
        />
        
        {/* Info Overlay */}
        <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/90 to-transparent pointer-events-none">
          <h1 className="text-xl font-bold text-white mb-1">{video.title}</h1>
          <p className="text-blue-400 font-bold text-sm">@{video.profiles?.username || 'Unknown'}</p>
        </div>
      </div>
      
      <div className="mt-6 flex flex-col items-center gap-2">
        <Link href="/" className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-full transition flex items-center gap-2">
           <PlayCircle /> Watch More on TGTBT
        </Link>
      </div>
    </div>
  )
}