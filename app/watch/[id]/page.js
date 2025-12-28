'use client'
import WatchClient from '@/components/WatchClient'
import { useParams } from 'next/navigation'

export default function WatchPage() {
  // Get the ID safely on the client side
  const params = useParams()
  
  // Render the client (which handles the fetch, the interaction wall, and the tiling)
  return <WatchClient videoId={params?.id} />
}