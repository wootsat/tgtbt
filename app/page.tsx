'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import UploadVideo from '@/components/UploadVideo'
import UserProfile from '@/components/UserProfile'
import Feed from '@/components/Feed' 
import { LogOut, PlusCircle, X, User, Home as HomeIcon } from 'lucide-react'

export default function Home() {
  const [session, setSession] = useState(null)
  
  // Auth State
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  
  // App State
  const [showUpload, setShowUpload] = useState(false)
  const [currentView, setCurrentView] = useState('feed') // 'feed' or 'profile'

  // 1. Check for User Session on Load
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Auth Handlers
  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert(error.message)
    setLoading(false)
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) alert(error.message)
    else alert('Check your email for the login link!')
    setLoading(false)
  }

  // --- VIEW 1: LOGIN SCREEN (If not logged in) ---
  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black p-4">
        <div className="w-full max-w-sm space-y-6 rounded-2xl bg-gray-900 p-8 text-white shadow-2xl border border-gray-800">
          <div className="text-center">
            <h1 className="text-4xl font-black tracking-tighter text-white mb-2">TGTBT</h1>
            <p className="text-gray-400 text-sm uppercase tracking-widest">Too Good To Be True</p>
          </div>
          
          <form className="space-y-4">
            <input
              className="w-full rounded-lg bg-gray-800 p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="w-full rounded-lg bg-gray-800 p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            
            <div className="flex gap-3 pt-2">
              <button 
                onClick={handleLogin} 
                disabled={loading}
                className="flex-1 rounded-lg bg-blue-600 p-3 font-bold hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {loading ? '...' : 'Log In'}
              </button>
              <button 
                onClick={handleSignUp} 
                disabled={loading}
                className="flex-1 rounded-lg border border-gray-600 p-3 font-bold hover:bg-gray-800 disabled:opacity-50 transition"
              >
                Sign Up
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // --- VIEW 2: MAIN APP (If logged in) ---
  return (
    <main className="flex min-h-screen flex-col items-center bg-black text-white overflow-hidden">
      
      {/* Header / Navbar */}
      <div className="w-full max-w-md p-4 flex justify-between items-center z-20 absolute top-0 bg-gradient-to-b from-black/90 to-transparent">
        {/* Logo / Home Button */}
        <button 
          onClick={() => setCurrentView('feed')} 
          className="font-black text-xl tracking-tighter drop-shadow-md text-white hover:text-gray-300 transition"
        >
          TGTBT
        </button>
        
        <div className="flex items-center gap-5">
           {/* Navigation Switch (Feed <-> Profile) */}
          <button 
            onClick={() => setCurrentView(currentView === 'feed' ? 'profile' : 'feed')}
            className="text-white hover:text-blue-400 transition"
          >
            {currentView === 'feed' ? <User size={26} /> : <HomeIcon size={26} />}
          </button>

          {/* Upload Button */}
          <button 
            onClick={() => setShowUpload(true)}
            className="text-white hover:text-blue-400 transition transform hover:scale-110"
          >
            <PlusCircle size={28} />
          </button>
          
          {/* Sign Out */}
          <button 
            onClick={() => supabase.auth.signOut()} 
            className="text-gray-400 hover:text-white transition"
          >
            <LogOut size={24} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-md h-[100dvh] relative bg-gray-900">
        
        {currentView === 'feed' ? (
           // --- THE FEED VIEW (Top 5 List) ---
           <div className="h-full">
             <Feed />
           </div>
        ) : (
           // --- THE PROFILE VIEW ---
           <div className="pt-20 h-full">
             <UserProfile session={session} />
           </div>
        )}

      </div>

      {/* Upload Overlay Modal */}
      {showUpload && (
        <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md relative">
            
            {/* Close Button */}
            <button 
              onClick={() => setShowUpload(false)}
              className="absolute -top-12 right-0 text-gray-400 hover:text-white"
            >
              <X size={32} />
            </button>

            {/* The Upload Component */}
            <UploadVideo onUploadComplete={() => {
              setShowUpload(false)
            }} />
            
          </div>
        </div>
      )}
    </main>
  )
}