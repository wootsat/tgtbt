'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { LogOut, PlusCircle, X, User, Home as HomeIcon, LogIn } from 'lucide-react'

// Components
import UploadVideo from '@/components/UploadVideo'
import UserProfile from '@/components/UserProfile'
import Feed from '@/components/Feed' 
import Auth from '@/components/Auth'

export default function Home() {
  const [session, setSession] = useState(null)
  
  // View State
  const [showUpload, setShowUpload] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [viewMode, setViewMode] = useState('feed') 
  const [targetProfileId, setTargetProfileId] = useState(null)
  
  // Forces Feed refresh
  const [feedKey, setFeedKey] = useState(0)

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

  // 2. --- HISTORY ROUTER (The Fix) ---
  useEffect(() => {
    // A. Set initial state on load so we have a base to go back to
    window.history.replaceState({ view: 'feed' }, '', window.location.pathname);

    // B. Listen for the Back Button
    const handlePopState = (event) => {
      const state = event.state;
      
      // If we popped back to a profile state
      if (state?.view === 'profile' && state?.profileId) {
        setTargetProfileId(state.profileId);
        setViewMode('profile');
        setShowUpload(false); // Ensure overlays are closed
        setShowAuth(false);
      } 
      // If we popped back to feed (or null state)
      else {
        setViewMode('feed');
        setTargetProfileId(null);
        setShowUpload(false);
        setShowAuth(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 3. --- NAVIGATION HANDLERS ---
  
  const navigateToProfile = (userId) => {
    // Avoid pushing duplicate states if we are already there
    if (viewMode === 'profile' && targetProfileId === userId) return;

    setTargetProfileId(userId);
    setViewMode('profile');
    
    // Push new history entry
    window.history.pushState({ view: 'profile', profileId: userId }, '', `?u=${userId}`);
  }

  const navigateToFeed = () => {
    if (viewMode === 'feed') {
        // If already on feed, just scroll to top/refresh
        setFeedKey(prev => prev + 1);
        return;
    }
    setViewMode('feed');
    setTargetProfileId(null);
    setShowUpload(false);
    setShowAuth(false);
    
    // Push feed state
    window.history.pushState({ view: 'feed' }, '', window.location.pathname);
    setFeedKey(prev => prev + 1);
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    navigateToFeed()
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

  return (
    <main className="flex min-h-screen flex-col items-center bg-black text-white overflow-hidden relative">
      
      {/* --- NAVBAR --- */}
      <div className="w-full max-w-2xl p-4 flex justify-between items-center z-50 absolute top-0 bg-gradient-to-b from-black/90 to-transparent">
        
        {/* Logo -> Goes Home */}
        <button onClick={navigateToFeed} className="hover:opacity-80 transition hover:scale-105 active:scale-95">
          <img src="/tgtbt_logo.png" alt="TGTBT" className="h-24 w-auto object-contain" />
        </button>
        
        {/* Right Buttons */}
        <div className="flex items-center gap-2">
          
          {/* Profile / Home Toggle */}
          <button 
            onClick={() => requireAuth(() => {
              if (isMyProfile) {
                navigateToFeed()
              } else {
                navigateToProfile(session.user.id)
              }
            })}
            className={`transition transform hover:scale-110 h-12 w-12 flex items-center justify-center rounded-full active:bg-white/10 
              ${isMyProfile ? 'text-blue-400 hover:text-blue-300' : 'text-white hover:text-blue-400'}`}
          >
            {isMyProfile ? <HomeIcon size={28} /> : <User size={28} />}
          </button>

          {/* Upload Button */}
          <button 
            onClick={() => requireAuth(() => setShowUpload(true))} 
            className="text-white hover:text-green-400 transition transform hover:scale-110 h-12 w-12 flex items-center justify-center rounded-full active:bg-white/10"
          >
            <PlusCircle size={30} />
          </button>
          
          {/* Login / Logout */}
          {session ? (
            <button 
              onClick={handleLogout} 
              className="text-gray-400 hover:text-red-500 transition transform hover:scale-110 h-12 w-12 flex items-center justify-center rounded-full active:bg-red-900/50 active:scale-95"
            >
              <LogOut size={26} />
            </button>
          ) : (
            <button 
              onClick={() => setShowAuth(true)} 
              className="flex items-center gap-1 text-white font-bold hover:text-blue-400 transition transform hover:scale-110 px-3 py-2 h-12"
            >
              <LogIn size={20} /> <span className="hidden sm:inline">Log In</span>
            </button>
          )}
        </div>
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="flex-1 w-full max-w-2xl h-[100dvh] relative bg-gray-900">
        
        {viewMode === 'feed' && (
           <div className="h-full">
             <Feed 
               key={feedKey} 
               onAuthRequired={() => setShowAuth(true)}
               onUserClick={(userId) => navigateToProfile(userId)} // UPDATED to use history
             />
           </div>
        )}

        {viewMode === 'profile' && (
           <div className="pt-28 h-full">
             <UserProfile 
                session={session} 
                targetUserId={targetProfileId} 
                onBack={navigateToFeed} // UPDATED
                onUserClick={(id) => navigateToProfile(id)} // UPDATED (allows jumping profile to profile)
             />
           </div>
        )}
      </div>

      {/* --- UPLOAD OVERLAY --- */}
      {showUpload && (
        <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg relative">
            <button onClick={() => setShowUpload(false)} className="absolute -top-12 right-0 text-gray-400 hover:text-white"><X size={32} /></button>
            <UploadVideo onUploadComplete={() => {
              setShowUpload(false)
              setFeedKey(prev => prev + 1)
            }} />
          </div>
        </div>
      )}

      {/* --- AUTH OVERLAY --- */}
      {showAuth && (
        <div className="absolute inset-0 z-[60] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
           <Auth onClose={() => setShowAuth(false)} />
        </div>
      )}

    </main>
  )
}