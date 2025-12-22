'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Loader2, PlayCircle, User, Flame, CalendarDays, Sparkles, MessageCircle } from 'lucide-react'
import VideoPlayer from '@/components/VideoPlayer'
import CommentsOverlay from '@/components/CommentsOverlay'
import { useSwipeable } from 'react-swipeable'

const BATCH_SIZE = 20

export default function Feed({ onUserClick, onAuthRequired }) {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeVideo, setActiveVideo] = useState(null)
  const [commentVideoId, setCommentVideoId] = useState(null)
  
  const [currentTab, setCurrentTab] = useState('day') 
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (currentTab === 'new') handleTabChange('day')
      else if (currentTab === 'day') handleTabChange('week')
    },
    onSwipedRight: () => {
      if (currentTab === 'week') handleTabChange('day')
      else if (currentTab === 'day') handleTabChange('new')
    },
    trackMouse: true 
  })

  useEffect(() => {
    setVideos([])
    setPage(0)
    setHasMore(true)
    fetchVideos(0, currentTab) 
  }, [currentTab])

  const fetchVideos = async (pageNumber, tab) => {
    setLoading(true)
    const from = pageNumber * BATCH_SIZE
    const to = from + BATCH_SIZE - 1

    let query = supabase
      .from('videos')
      .select('*, profiles(username), comments(count)')
      .range(from, to)

    if (tab === 'new') {
      query = query.order('created_at', { ascending: false })
    } else {
      const cutoffDate = new Date()
      const daysToSubtract = tab === 'day' ? 1 : 7
      cutoffDate.setDate(cutoffDate.getDate() - daysToSubtract)
      
      query = query.gt('created_at', cutoffDate.toISOString()).order('average_rating', { ascending: false })
    }

    const { data, error } = await query

    if (error) console.error(error)
    else {
      if (data.length < BATCH_SIZE) setHasMore(false)
      if (pageNumber === 0) setVideos(data)
      else setVideos(prev => [...prev, ...data])
    }
    setLoading(false)
  }

  const handleTabChange = (newTab) => {
    if (newTab === currentTab) return
    setCurrentTab(newTab)
  }

  const handleScroll = (e) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget
    if (scrollHeight - scrollTop <= clientHeight + 50 && !loading && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchVideos(nextPage, currentTab)
    }
  }

  const handleRate = async (videoId, score) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      if (onAuthRequired) onAuthRequired()
      return 
    }
    await supabase.from('ratings').upsert({ user_id: user.id, video_id: videoId, score: score })
  }

  const getCommentCount = (video) => video.comments?.[0]?.count || 0

  return (
    <div 
      {...handlers} 
      onScroll={handleScroll} 
      className="w-full h-full overflow-y-auto p-4 pt-28 pb-32 bg-gradient-to-b from-gray-900 to-black"
    >
      {commentVideoId && (
        <CommentsOverlay 
          videoId={commentVideoId} 
          onClose={() => setCommentVideoId(null)} 
          onAuthRequired={onAuthRequired}
        />
      )}

      {activeVideo && (
        <div className="fixed inset-0 z-40 bg-black">
          <VideoPlayer 
            videoSrc={activeVideo.compressed_url || activeVideo.video_url} 
            videoId={activeVideo.id}
            initialRating={activeVideo.average_rating}
            initialCommentCount={getCommentCount(activeVideo)}
            onRate={handleRate}
            onClose={() => setActiveVideo(null)}
          />
        </div>
      )}
      
      <div className="mb-6 text-center space-y-4">
        <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase animate-in fade-in slide-in-from-top-4 duration-500">
          {currentTab === 'new' ? 'NEW TGTBTs' : currentTab === 'day' ? 'HOT FRESH' : 'TOP WEEKLY'}
        </h2>
        
        <div className="flex justify-center items-center gap-3 text-[10px] font-bold tracking-widest">
          <button onClick={() => handleTabChange('new')} className={`transition-all duration-300 flex items-center gap-1 ${currentTab === 'new' ? 'text-green-400 scale-110 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'text-gray-600 hover:text-gray-400'}`}>
            <Sparkles size={12} /> NEWEST
          </button>
          <span className="text-gray-700">|</span>
          <button onClick={() => handleTabChange('day')} className={`transition-all duration-300 flex items-center gap-1 ${currentTab === 'day' ? 'text-blue-400 scale-110 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]' : 'text-gray-600 hover:text-gray-400'}`}>
             HOT FRESH <Flame size={12} />
          </button>
          <span className="text-gray-700">|</span>
          <button onClick={() => handleTabChange('week')} className={`transition-all duration-300 flex items-center gap-1 ${currentTab === 'week' ? 'text-fuchsia-500 scale-110 drop-shadow-[0_0_8px_rgba(217,70,239,0.5)]' : 'text-gray-600 hover:text-gray-400'}`}>
            WEEKLY <CalendarDays size={12} />
          </button>
        </div>
      </div>

      {videos.length === 0 && !loading ? (
        <div className="text-center text-gray-500 mt-20"><p>No videos found.</p></div>
      ) : (
        <div className="space-y-4">
          {videos.map((video, index) => (
            <div key={video.id} className="group relative overflow-hidden rounded-xl bg-gray-800 border border-gray-700 p-4 transition hover:scale-[1.01]">
              
              <div onClick={() => setActiveVideo(video)} className="cursor-pointer relative z-10 flex items-center gap-4">
                
                {/* RANK / ICON CIRCLE */}
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-black text-xl shadow-lg ${
                  currentTab === 'new' ? 'bg-gray-800 text-green-400 border border-gray-700' :
                  index === 0 ? 'bg-yellow-400 text-black' : 
                  index === 1 ? 'bg-gray-300 text-black' : 
                  index === 2 ? 'bg-orange-400 text-black' : 
                  'bg-gray-700 text-white'
                }`}>
                  {/* If NEWEST, show Icon. If others, show Rank Number */}
                  {currentTab === 'new' ? <Sparkles size={20} /> : index + 1 + (page * BATCH_SIZE)}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="truncate text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                    {video.title}
                  </h3>
                  
                  <div className="flex items-center gap-4 text-xs mt-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); if(onUserClick) onUserClick(video.user_id); }}
                      className="flex items-center gap-1 text-fuchsia-500 font-bold hover:text-fuchsia-400 hover:underline z-20"
                    >
                      <User size={14} /> {video.profiles?.username || 'Unknown'}
                    </button>
                    
                    <div className="flex items-center gap-3">
                      {currentTab === 'new' ? (
                        <span className="text-gray-400 text-[10px]">
                          {new Date(video.created_at).toLocaleString([], { month: 'numeric', day: 'numeric', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ) : (
                        <span className="text-yellow-400 flex items-center gap-1">
                           ★ {video.average_rating?.toFixed(1) || '0.0'}
                        </span>
                      )}

                      <button 
                        onClick={(e) => {
                          e.stopPropagation() 
                          setCommentVideoId(video.id)
                        }}
                        className="flex items-center gap-1 text-gray-400 hover:text-white transition z-20"
                      >
                        <MessageCircle size={14} />
                        <span className="text-[10px]">Comments ({getCommentCount(video)})</span>
                      </button>
                    </div>

                  </div>
                </div>
                <PlayCircle className="text-gray-500 group-hover:text-white transition-colors" size={28} />
              </div>
            </div>
          ))}
          {loading && <div className="flex justify-center py-4"><Loader2 className="animate-spin text-white" /></div>}
          {!hasMore && videos.length > 0 && <div className="text-center text-gray-600 text-xs py-4 uppercase tracking-widest">You've reached the end</div>}
        </div>
      )}
    </div>
  )
}