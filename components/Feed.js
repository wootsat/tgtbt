'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Loader2, PlayCircle, User, Flame, CalendarDays, Sparkles, MessageCircle, Share2, Eye } from 'lucide-react'
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

  // --- HISTORY LOGIC ---
  const historyPushedRef = useRef(false)

  useEffect(() => {
    if (activeVideo) {
      if (!historyPushedRef.current) {
        window.history.pushState(null, '', window.location.pathname)
        historyPushedRef.current = true
      }
      const handlePopState = () => {
        historyPushedRef.current = false 
        setActiveVideo(null)
      }
      window.addEventListener('popstate', handlePopState)
      return () => {
        window.removeEventListener('popstate', handlePopState)
      }
    } else {
      historyPushedRef.current = false
    }
  }, [activeVideo])

  const closeVideo = () => {
    if (historyPushedRef.current) {
      window.history.back()
    } else {
      setActiveVideo(null)
    }
  }

  // --- SHARE LOGIC ---
  const handleShare = async (e, videoId) => {
    e.stopPropagation()
    const shareUrl = `https://tgtbt.xyz/watch/${videoId}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out this video on TGTBT',
          url: shareUrl
        })
      } catch (err) {
        // User cancelled share
      }
    } else {
      navigator.clipboard.writeText(shareUrl)
      alert('Link copied to clipboard!')
    }
  }

  // --- SWIPE LOGIC ---
  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (currentTab === 'new') handleTabChange('day')
      else if (currentTab === 'day') handleTabChange('week')
      else if (currentTab === 'week') handleTabChange('new') 
    },
    onSwipedRight: () => {
      if (currentTab === 'week') handleTabChange('day')
      else if (currentTab === 'day') handleTabChange('new')
      else if (currentTab === 'new') handleTabChange('week') 
    },
    trackMouse: true 
  })

  // --- DATA FETCHING ---
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

    // Added view_count to the select query just in case it wasn't being fetched
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

  // --- RATING LOGIC ---
  const handleRate = async (videoId, score) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      if (onAuthRequired) onAuthRequired()
      return 
    }

    const { error } = await supabase.from('ratings').upsert(
      { user_id: user.id, video_id: videoId, score: score }, 
      { onConflict: 'user_id, video_id' }
    )

    if (error) {
      console.error("Error submitting rating:", error.message)
      return
    }

    setTimeout(async () => {
      const { data: updatedVideo } = await supabase
        .from('videos')
        .select('average_rating')
        .eq('id', videoId)
        .single()

      if (updatedVideo) {
        setVideos(prevVideos => prevVideos.map(v => 
          v.id === videoId ? { ...v, average_rating: updatedVideo.average_rating } : v
        ))
        if (activeVideo && activeVideo.id === videoId) {
          setActiveVideo(prev => ({ ...prev, average_rating: updatedVideo.average_rating }))
        }
      }
    }, 250) 
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
          onUserClick={onUserClick}
        />
      )}

      {activeVideo && (
        <div className="fixed inset-0 z-[100] bg-black">
          <VideoPlayer 
            videoSrc={activeVideo.compressed_url || activeVideo.video_url} 
            videoId={activeVideo.id}
            audioSrc={activeVideo.audio_url}
            initialRating={activeVideo.average_rating}
            initialCommentCount={getCommentCount(activeVideo)}
            onRate={handleRate}
            onClose={closeVideo} 
            onUserClick={onUserClick}
            startMuted={false} // Sound ON for Feed
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
        
        <p className="text-gray-500 text-[10px] uppercase tracking-widest animate-pulse md:hidden mt-2">
           Swipe Left / Right to switch
        </p>
      </div>

      {videos.length === 0 && !loading ? (
        <div className="text-center text-gray-500 mt-20"><p>No videos found.</p></div>
      ) : (
        <div className="space-y-4">
          {videos.map((video, index) => (
            <div key={video.id} className="group relative overflow-hidden rounded-xl bg-gray-800 border border-gray-700 p-4 transition hover:scale-[1.01]">
              
              <div onClick={() => setActiveVideo(video)} className="cursor-pointer relative z-10 flex items-center gap-4">
                
                {/* RANK / INDEX BADGE */}
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-black text-xl shadow-lg ${
                  currentTab === 'new' ? 'bg-gray-800 text-green-400 border border-gray-700' :
                  index === 0 ? 'bg-yellow-400 text-black' : 
                  index === 1 ? 'bg-gray-300 text-black' : 
                  index === 2 ? 'bg-orange-400 text-black' : 
                  'bg-gray-700 text-white'
                }`}>
                  {currentTab === 'new' ? <Sparkles size={20} /> : index + 1 + (page * BATCH_SIZE)}
                </div>

                {/* --- VIDEO INFO --- */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  
                  {/* Line 1: Title */}
                  <h3 className="truncate text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                    {video.title}
                  </h3>
                  
                  {/* Line 2: Username (Own line prevents overflow issues) */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); if(onUserClick) onUserClick(video.user_id); }}
                    className="flex items-center gap-1 text-fuchsia-500 font-bold hover:text-fuchsia-400 hover:underline text-xs mt-0.5 w-fit"
                  >
                    <User size={12} /> {video.profiles?.username || 'Unknown'}
                  </button>
                  
                  {/* Line 3: Metrics Row (Uniform Layout) */}
                  <div className="flex items-center gap-3 text-gray-400 text-[10px] mt-1.5 font-medium">
                    
                    {/* Date or Rating */}
                    {currentTab === 'new' ? (
                      <span className="text-gray-400">
                        {new Date(video.created_at).toLocaleString([], { month: 'numeric', day: 'numeric', year: '2-digit' })}
                      </span>
                    ) : (
                      <span className="text-yellow-400 flex items-center gap-1">
                         ★ {video.average_rating?.toFixed(1) || '0.0'}
                      </span>
                    )}

                    <span className="text-gray-600">|</span>

                    {/* Views */}
                    <span className="flex items-center gap-1 text-gray-400">
                       <Eye size={12} /> {video.view_count || 0}
                    </span>

                    <span className="text-gray-600">|</span>

                    {/* Comments */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation() 
                        setCommentVideoId(video.id)
                      }}
                      className="flex items-center gap-1 hover:text-white transition"
                    >
                      <MessageCircle size={12} />
                      {getCommentCount(video)}
                    </button>

                    <span className="text-gray-600">|</span>

                    {/* Share */}
                    <button 
                      onClick={(e) => handleShare(e, video.id)}
                      className="hover:text-white transition"
                    >
                      <Share2 size={12} />
                    </button>

                  </div>
                </div>

                {/* Play Button Icon (Right Side) */}
                <PlayCircle className="text-gray-500 group-hover:text-white transition-colors shrink-0" size={28} />
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