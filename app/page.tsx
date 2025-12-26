'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { LogOut, PlusCircle, X, User, Home as HomeIcon, LogIn } from 'lucide-react'

// Components
import UploadVideo from '@/components/UploadVideo'
import UserProfile from '@/components/UserProfile'
import Feed from '@/components/Feed' 
import Auth from '@/components/Auth' // <--- Imported the new component

export default function Home() {
  const [session, setSession] = useState(null)
  
  // View State
  const [showUpload, setShowUpload] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [viewMode, setViewMode] = useState('feed') 
  const [targetProfileId, setTargetProfileId] = useState(null)
  
  // This key trick forces the Feed to re-render (scrolling to top) when you click Home
  const [feedKey, setFeedKey] = useState(0)

  // 1. Session Check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) {
        // If logged out, reset views
        setShowUpload(false)
        setViewMode('feed')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // 2. Navigation Handlers
  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setViewMode('feed')
    window.location.reload()
  }

  const goHome = () => {
    setViewMode('feed')
    setTargetProfileId(null)
    setShowUpload(false)
    setShowAuth(false)
    setFeedKey(prev => prev + 1) // Refresh feed
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
        
        {/* Logo -> Resets to Home */}
        <button onClick={goHome} className="hover:opacity-80 transition hover:scale-105 active:scale-95">
          <img src="/tgtbt_logo.png" alt="TGTBT" className="h-24 w-auto object-contain" />
        </button>
        
        {/* Right Buttons */}
        <div className="flex items-center gap-2">
          
          {/* Profile / Home Toggle */}
          <button 
            onClick={() => requireAuth(() => {
              if (isMyProfile) {
                goHome()
              } else {
                setTargetProfileId(session.user.id)
                setViewMode('profile')
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
              className="text-gray-400 hover:text-red-500 transition h-12 w-12 flex items-center justify-center rounded-full active:bg-red-900/50 active:scale-95"
            >
              <LogOut size={26} />
            </button>
          ) : (
            <button 
              onClick={() => setShowAuth(true)} 
              className="flex items-center gap-1 text-white font-bold hover:text-blue-400 transition px-3 py-2 h-12"
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
               key={feedKey} // Forces reset when logo clicked
               onAuthRequired={() => setShowAuth(true)}
               onUserClick={(userId) => { 
                 setTargetProfileId(userId)
                 setViewMode('profile') 
               }} 
             />
           </div>
        )}

        {viewMode === 'profile' && (
           <div className="pt-28 h-full">
             <UserProfile 
                session={session} 
                targetUserId={targetProfileId} 
                onBack={goHome} 
                onUserClick={(id) => { 
                  setTargetProfileId(id) 
                  // We are already in 'profile' mode, but this forces a refresh if needed
               }}
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
              setFeedKey(prev => prev + 1) // Refresh feed after upload
            }} />
          </div>
        </div>
      )}

      {/* --- AUTH OVERLAY --- */}
      {showAuth && (
        <div className="absolute inset-0 z-[60] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
           {/* We use the new Component here */}
           <Auth onClose={() => setShowAuth(false)} />
        </div>
      )}

    </main>
  )
}