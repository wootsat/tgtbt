'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import UploadVideo from '@/components/UploadVideo'
import UserProfile from '@/components/UserProfile'
import Feed from '@/components/Feed' 
import { LogOut, PlusCircle, X, User, Home as HomeIcon, CheckCircle, XCircle, Loader2 } from 'lucide-react' // LogIn removed from imports
import { hasProfanity } from '@/lib/filter'

export default function Home() {
  const [session, setSession] = useState(null)
  
  // Auth Form State
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUpMode, setIsSignUpMode] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState('idle') 
  
  // App View State
  const [showUpload, setShowUpload] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [viewMode, setViewMode] = useState('feed') 
  const [targetProfileId, setTargetProfileId] = useState(null)

  // 1. Session Check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  // 2. Username Check (Debounced)
  useEffect(() => {
    if (!username || !isSignUpMode) {
      setUsernameStatus('idle')
      return
    }
    const checkAvailability = setTimeout(async () => {
      // Immediate frontend check for profanity
      if (hasProfanity(username)) {
        setUsernameStatus('invalid')
        return
      }

      setUsernameStatus('checking')
      const { data } = await supabase.from('profiles').select('username').ilike('username', username).single()
      if (data) setUsernameStatus('invalid')
      else setUsernameStatus('valid')
    }, 500) 
    return () => clearTimeout(checkAvailability)
  }, [username, isSignUpMode])

  // 3. Auth Handlers
  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert(error.message)
    else setShowAuth(false) 
    setLoading(false)
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    if(!username) return alert("Please pick a username")
    
    // PROFANITY CHECK
    if (hasProfanity(username)) {
      return alert("Username contains not allowed words. Please choose another.")
    }

    if(usernameStatus === 'invalid') return alert("Username already taken or invalid!")
    
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) alert(error.message)
    else if (data?.user) {
      const { error: profileError } = await supabase.from('profiles').insert({ id: data.user.id, username: username })
      if (profileError) alert("Username taken! Please try another.")
      else {
        alert('Success! Check your email.')
        setShowAuth(false)
      }
    }
    setLoading(false)
  }

  // Helper: Triggers Auth if guest, otherwise does action
  const requireAuth = (action) => {
    if (!session) {
      setIsSignUpMode(true) 
      setShowAuth(true)
    } else {
      action()
    }
  }

  // Helper: Check if we are currently viewing our OWN profile
  const isMyProfile = viewMode === 'profile' && session && targetProfileId === session.user.id

  // --- MAIN APP RENDER ---
  return (
    <main className="flex min-h-screen flex-col items-center bg-black text-white overflow-hidden">
      
      {/* NAVBAR */}
      <div className="w-full max-w-2xl p-4 flex justify-between items-center z-20 absolute top-0 bg-gradient-to-b from-black/90 to-transparent">
        
        <button onClick={() => setViewMode('feed')} className="hover:opacity-80 transition">
          <img src="/tgtbt_logo.png" alt="TGTBT" className="h-24 w-auto object-contain" />
        </button>
        
        <div className="flex items-center gap-6">
          <button 
            onClick={() => requireAuth(() => {
              if (isMyProfile) {
                setViewMode('feed')
              } else {
                setTargetProfileId(session.user.id)
                setViewMode('profile')
              }
            })}
            className={`transition ${isMyProfile ? 'text-blue-400' : 'text-white'}`}
          >
            {isMyProfile ? <HomeIcon size={28} /> : <User size={28} />}
          </button>

          <button onClick={() => requireAuth(() => setShowUpload(true))} className="text-white hover:text-blue-400 transition transform hover:scale-110">
            <PlusCircle size={30} />
          </button>
          
          {session ? (
            <button onClick={() => supabase.auth.signOut()} className="text-gray-400 hover:text-white transition">
              <LogOut size={26} />
            </button>
          ) : (
            // UPDATED: No Icon, just text
            <button 
              onClick={() => { setIsSignUpMode(false); setShowAuth(true); }} 
              className="text-blue-400 font-bold hover:text-white transition"
            >
              Log In
            </button>
          )}
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 w-full max-w-2xl h-[100dvh] relative bg-gray-900">
        {viewMode === 'feed' && (
           <div className="h-full">
             <Feed 
               onAuthRequired={() => {
                 setIsSignUpMode(true)
                 setShowAuth(true)
               }}
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
               onBack={() => setViewMode('feed')} 
             />
           </div>
        )}
      </div>

      {/* UPLOAD OVERLAY */}
      {showUpload && (
        <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg relative">
            <button onClick={() => setShowUpload(false)} className="absolute -top-12 right-0 text-gray-400 hover:text-white"><X size={32} /></button>
            <UploadVideo onUploadComplete={() => setShowUpload(false)} />
          </div>
        </div>
      )}

      {/* AUTH OVERLAY */}
      {showAuth && (
        <div className="absolute inset-0 z-[60] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="w-full max-w-md space-y-6 rounded-2xl bg-gray-900 p-8 text-white shadow-2xl border border-gray-800 relative">
              
              <button onClick={() => setShowAuth(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={24} /></button>

              <div className="flex justify-center mb-4">
                <img src="/tgtbt_logo.png" alt="TGTBT Logo" className="h-24 w-auto object-contain" />
              </div>

              <h2 className="text-center text-xl font-bold text-white mb-2">
                {isSignUpMode ? "Join to Rate & Upload" : "Welcome Back"}
              </h2>

              <form className="space-y-4">
                <input className="w-full rounded-lg bg-gray-800 p-4 text-white focus:ring-2 focus:ring-blue-500" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <input className="w-full rounded-lg bg-gray-800 p-4 text-white focus:ring-2 focus:ring-blue-500" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                
                {isSignUpMode && (
                  <div className="relative">
                    <input className={`w-full rounded-lg bg-gray-800 p-4 text-white focus:ring-2 ${usernameStatus === 'valid' ? 'focus:ring-green-500' : usernameStatus === 'invalid' ? 'focus:ring-red-500' : 'focus:ring-blue-500'}`} type="text" placeholder="Pick a Username" value={username} onChange={(e) => setUsername(e.target.value)} />
                    <div className="absolute right-4 top-4">
                      {usernameStatus === 'checking' && <Loader2 className="animate-spin text-blue-400" />}
                      {usernameStatus === 'valid' && <CheckCircle className="text-green-500" />}
                      {usernameStatus === 'invalid' && <XCircle className="text-red-500" />}
                    </div>
                    {usernameStatus === 'invalid' && hasProfanity(username) && (
                      <p className="text-red-500 text-xs mt-1 ml-1">Username contains restricted words.</p>
                    )}
                  </div>
                )}
                
                <div className="flex flex-col gap-3 pt-2">
                  <button onClick={isSignUpMode ? handleSignUp : handleLogin} disabled={loading || (isSignUpMode && usernameStatus !== 'valid')} className="w-full rounded-lg bg-blue-600 p-3 font-bold hover:bg-blue-700 disabled:opacity-50 transition">
                     {loading ? 'Processing...' : isSignUpMode ? 'Sign Up' : 'Log In'}
                  </button>
                  <button type="button" onClick={() => setIsSignUpMode(!isSignUpMode)} className="text-gray-400 text-sm hover:text-white transition">
                    {isSignUpMode ? "Already have an account? Log In" : "Need an account? Sign Up"}
                  </button>
                </div>
              </form>
           </div>
        </div>
      )}

    </main>
  )
}