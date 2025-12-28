import { supabase } from '@/lib/supabaseClient'
import WatchClient from '@/components/WatchClient'

// This function tells Telegram/Discord what to show in the chat preview
export async function generateMetadata({ params }) {
  const { id } = params
  
  const { data: video } = await supabase
    .from('videos')
    .select('*, profiles(username)')
    .eq('id', id)
    .single()

  if (!video) {
    return {
      title: 'Video Not Found - TGTBT',
    }
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
      // Telegram looks for these specific video tags:
      videos: isVideo ? [
        {
          url: video.compressed_url || video.video_url, // Direct link to MP4
          width: 1280,
          height: 720,
          type: 'video/mp4',
        }
      ] : undefined,
      images: [
        {
          url: video.video_url, // For images or video thumbnail
        }
      ],
    },
    // Twitter Card support (used by Discord/Slack sometimes)
    twitter: {
      card: isVideo ? 'player' : 'summary_large_image',
      title: video.title,
      description: `By @${video.profiles?.username}`,
      images: [video.video_url],
      players: isVideo ? [
        {
          url: video.compressed_url || video.video_url,
          width: 1280,
          height: 720,
        }
      ] : undefined,
    }
  }
}

export default async function WatchPage({ params }) {
  const { id } = params

  // Fetch data on the server to pass to the client
  // (Faster than fetching on the client!)
  const { data: video } = await supabase
    .from('videos')
    .select('*, profiles(username), comments(count)')
    .eq('id', id)
    .single()

  return <WatchClient initialVideo={video} />
}