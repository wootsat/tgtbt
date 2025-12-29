'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { LogOut, PlusCircle, X, User, Home as HomeIcon, LogIn, Search, Loader2, Check } from 'lucide-react'

import UploadVideo from '@/components/UploadVideo'
import UserProfile from '@/components/UserProfile'
import Feed from '@/components/Feed' 
import Auth from '@/components/Auth'
import SearchOverlay from '@/components/SearchOverlay' 
import VideoPlayer from '@/components/VideoPlayer' 

export default function Home() {
  const [session, setSession] = useState(null)
  
  // View State
  const [showUpload, setShowUpload] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [showSearch, setShowSearch] = useState(false) 
  const [viewMode, setViewMode] = useState('feed') 
  const [targetProfileId, setTargetProfileId] = useState(null)
  const [searchedVideo, setSearchedVideo] = useState(null) 
  const [feedKey, setFeedKey] = useState(0)

  // --- PERSISTENT FEED TAB ---
  const [feedTab, setFeedTab] = useState('day') 
  const [isInitialized, setIsInitialized] = useState(false)
  
  // --- NEW: TOAST STATE ---
  const [showToast, setShowToast] = useState(false)

  // Helper to show the popup (Passed down to child components)
  const triggerToast = () => {
    setShowToast(true)
    setTimeout(() => setShowToast(false), 2000)
  }

  // Initialize from Session Storage on mount
  useEffect(() => {
    const savedTab = sessionStorage.getItem('tgtbt_active_tab')
    if (savedTab) {
      setFeedTab(savedTab)
    }
    setIsInitialized(true)
  }, [])

  const handleTabChange = (newTab) => {
    setFeedTab(newTab)
    sessionStorage.setItem('tgtbt_active_tab', newTab)
  }
  // ---------------------------------------------

  // 1. Session Check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) {
        setShowUpload(false)
        setViewMode('feed')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // 2. --- HISTORY ROUTER ---
  useEffect(() => {
    window.history.replaceState({ view: 'feed' }, '', window.location.pathname);

    const handlePopState = (event) => {
      const state = event.state;
      
      if (searchedVideo) {
         setSearchedVideo(null);
         return; 
      }

      if (showSearch) {
        setShowSearch(false);
        return;
      }
      
      if (showUpload) {
        setShowUpload(false);
        return;
      }

      if (state?.view === 'profile' && state?.profileId) {
        setTargetProfileId(state.profileId);
        setViewMode('profile');
        setShowUpload(false);
        setShowAuth(false);
      } 
      else {
        setViewMode('feed');
        setTargetProfileId(null);
        setShowUpload(false);
        setShowAuth(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [searchedVideo, showSearch, showUpload]); 

  // 3. --- NAVIGATION HANDLERS ---
  const navigateToProfile = (userId) => {
    if (viewMode === 'profile' && targetProfileId === userId) return;

    setTargetProfileId(userId);
    setViewMode('profile');
    
    if (window.history.state?.videoOpen || window.history.state?.modal === 'video') {
        window.history.replaceState({ view: 'profile', profileId: userId }, '', `?u=${userId}`);
    } else {
        window.history.pushState({ view: 'profile', profileId: userId }, '', `?u=${userId}`);
    }
    
    if (searchedVideo) setSearchedVideo(null);
  }

  const navigateToFeed = (forceRefresh = false) => {
    if (viewMode === 'feed' && !forceRefresh) return;

    if (forceRefresh) {
        setFeedKey(prev => prev + 1);
    }

    setViewMode('feed');
    setTargetProfileId(null);
    setShowUpload(false);
    setShowAuth(false);
    setShowSearch(false);
    
    window.history.pushState({ view: 'feed' }, '', window.location.pathname);
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    sessionStorage.removeItem('tgtbt_active_tab') 
    navigateToFeed(true)
    window.location.reload()
  }

  const requireAuth = (action) => {
    if (!session) {
      setShowAuth(true)
    } else {
      action()
    }
  }

  const isMyProfile = viewMode === 'profile' && session && targetProfileId === session.user.id

  if (!isInitialized) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <Loader2 className="animate-spin text-blue-500" size={40} />
    </div>
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-black text-white overflow-hidden relative">
      
      {/* --- NAVBAR --- */}
      <div className="w-full max-w-2xl p-4 flex justify-between items-center z-50 absolute top-0 bg-gradient-to-b from-black/90 to-transparent">
        <button onClick={() => navigateToFeed(true)} className="hover:opacity-80 transition hover:scale-105 active:scale-95">
          <img src="/tgtbt_logo.png" alt="TGTBT" className="h-24 w-auto object-contain" />
        </button>
        
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSearch(true)} className="text-white hover:text-blue-400 transition transform hover:scale-110 h-12 w-12 flex items-center justify-center rounded-full active:bg-white/10">
             <Search size={26} />
          </button>

          <button 
            onClick={() => requireAuth(() => {
              if (isMyProfile) navigateToFeed(false)
              else navigateToProfile(session.user.id)
            })}
            className={`transition transform hover:scale-110 h-12 w-12 flex items-center justify-center rounded-full active:bg-white/10 
              ${isMyProfile ? 'text-blue-400 hover:text-blue-300' : 'text-white hover:text-blue-400'}`}
          >
            {isMyProfile ? <HomeIcon size={28} /> : <User size={28} />}
          </button>

          <button onClick={() => requireAuth(() => setShowUpload(true))} className="text-white hover:text-green-400 transition transform hover:scale-110 h-12 w-12 flex items-center justify-center rounded-full active:bg-white/10">
            <PlusCircle size={30} />
          </button>
          
          {session ? (
            <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition transform hover:scale-110 h-12 w-12 flex items-center justify-center rounded-full active:bg-red-900/50 active:scale-95">
              <LogOut size={26} />
            </button>
          ) : (
            <button onClick={() => setShowAuth(true)} className="flex items-center gap-1 text-white font-bold hover:text-blue-400 transition transform hover:scale-110 px-3 py-2 h-12">
              <LogIn size={20} /> <span className="hidden sm:inline">Log In</span>
            </button>
          )}
        </div>
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="flex-1 w-full max-w-2xl h-[100dvh] relative bg-gray-900 shadow-2xl overflow-hidden">
        
        <div className={`h-full ${viewMode === 'feed' ? 'block' : 'hidden'}`}>
             {/* Passed triggerToast so Feed can use it for thumbnail sharing */}
             <Feed 
               key={feedKey} 
               activeTab={feedTab}
               onTabChange={handleTabChange} 
               onAuthRequired={() => setShowAuth(true)}
               onUserClick={(userId) => navigateToProfile(userId)} 
               isVisible={viewMode === 'feed'} 
               onShowToast={triggerToast} 
             />
        </div>

        {viewMode === 'profile' && (
           <div className="pt-28 h-full">
             <UserProfile 
                session={session} 
                targetUserId={targetProfileId} 
                onBack={() => navigateToFeed(false)} 
                onUserClick={(id) => navigateToProfile(id)} 
                onShowToast={triggerToast}
             />
           </div>
        )}

        {/* --- OVERLAYS --- */}
        
        {showSearch && (
           <div className="absolute inset-0 z-50">
              <SearchOverlay 
                 onClose={() => setShowSearch(false)}
                 onSelectUser={(userId) => {
                     setShowSearch(false);
                     navigateToProfile(userId);
                 }}
                 onSelectVideo={(video) => {
                     setShowSearch(false);
                     setSearchedVideo(video);
                     window.history.replaceState({ modal: 'video' }, '', window.location.href);
                 }}
                 onShowToast={triggerToast}
              />
           </div>
        )}

        {showUpload && (
          <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-md flex items-start justify-center p-4 pt-28 overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="w-full relative pb-20"> 
              <button onClick={() => setShowUpload(false)} className="absolute -top-12 right-0 text-gray-400 hover:text-white"><X size={32} /></button>
              <UploadVideo onUploadComplete={() => {
                setShowUpload(false)
                setFeedKey(prev => prev + 1)
              }} />
            </div>
          </div>
        )}

        {showAuth && (
          <div className="absolute inset-0 z-[60] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
             <Auth onClose={() => setShowAuth(false)} />
          </div>
        )}

      </div>

      {/* --- FULL SCREEN VIDEO PLAYER --- */}
      {searchedVideo && (
        <div className="fixed inset-0 z-[100] bg-black">
          <VideoPlayer 
            videoSrc={searchedVideo.compressed_url || searchedVideo.video_url} 
            videoId={searchedVideo.id}
            audioSrc={searchedVideo.audio_url}
            creatorUsername={searchedVideo.profiles?.username}
            creatorId={searchedVideo.user_id}
            isTiled={searchedVideo.is_tiled}
            initialRating={searchedVideo.average_rating}
            initialCommentCount={searchedVideo.comments?.[0]?.count || 0}
            onRate={async (vidId, score) => {
                 if (!session) return setShowAuth(true);
                 await supabase.from('ratings').upsert({ user_id: session.user.id, video_id: vidId, score }, { onConflict: 'user_id, video_id' })
            }}
            onClose={() => window.history.back()} 
            onUserClick={(uid) => navigateToProfile(uid)}
            startMuted={false} 
            // The VideoPlayer handles its own internal toast, 
            // so we don't need to pass triggerToast here.
          />
        </div>
      )}

      {/* --- GLOBAL TOAST NOTIFICATION --- */}
      {/* This pops up when Feed, UserProfile, or Search triggers a share action */}
      <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white/90 text-black px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 transition-all duration-500 z-[100] ${showToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
        <Check size={20} className="text-green-600" />
        <span className="font-bold">Link Copied!</span>
      </div>

    </main>
  )
}