import { supabase } from '@/lib/supabaseClient'
import WatchClient from '@/components/WatchClient'

// This generates the Preview Card for Telegram/Discord
export async function generateMetadata({ params }) {
  const { id } = await params // Await params for safety
  
  // Attempt to fetch video details for the preview card
  const { data: video } = await supabase
    .from('videos')
    .select('*, profiles(username)')
    .eq('id', id)
    .single()

  if (!video) {
    return { title: 'TGTBT' }
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

// The Page Component
export default async function WatchPage({ params }) {
  const { id } = await params // Await params
  
  // We just pass the ID to the client. 
  // The Client Component will fetch the video data itself, ensuring it works reliably.
  return <WatchClient videoId={id} />
}