'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { X, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { hasProfanity } from '@/lib/filter'

export default function Auth({ onClose }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUpMode, setIsSignUpMode] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState('idle') 

  // Username Availability Check
  useEffect(() => {
    if (!username || !isSignUpMode) {
      setUsernameStatus('idle')
      return
    }
    const checkAvailability = setTimeout(async () => {
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

  // Handlers
  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert(error.message)
    else onClose() // Close modal on success
    setLoading(false)
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    if(!username) return alert("Please pick a username")
    if (hasProfanity(username)) return alert("Username contains not allowed words.")
    if(usernameStatus === 'invalid') return alert("Username already taken or invalid!")
    
    setLoading(true)
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: { data: { username: username } }
    })

    if (error) {
      alert(error.message)
    } else {
      alert('Success! Check your email to verify your account.')
      onClose()
    }
    setLoading(false)
  }

  return (
    <div className="w-full max-w-md space-y-6 rounded-2xl bg-gray-900 p-8 text-white shadow-2xl border border-gray-800 relative animate-in fade-in zoom-in duration-300">
      
      <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
        <X size={24} />
      </button>

      <div className="flex justify-center mb-4">
        <img src="/tgtbt_logo.png" alt="TGTBT" className="h-24 w-auto object-contain" />
      </div>

      <h2 className="text-center text-xl font-bold text-white mb-2">
        {isSignUpMode ? "Join to Rate & Upload" : "Welcome Back"}
      </h2>

      <form className="space-y-4">
        <input 
          className="w-full rounded-lg bg-gray-800 p-4 text-white focus:ring-2 focus:ring-blue-500 outline-none" 
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
        />
        <input 
          className="w-full rounded-lg bg-gray-800 p-4 text-white focus:ring-2 focus:ring-blue-500 outline-none" 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
        />

        {isSignUpMode && (
          <div className="relative">
            <input 
              className={`w-full rounded-lg bg-gray-800 p-4 text-white focus:ring-2 outline-none ${usernameStatus === 'valid' ? 'focus:ring-green-500' : usernameStatus === 'invalid' ? 'focus:ring-red-500' : 'focus:ring-blue-500'}`} 
              type="text" 
              placeholder="Pick a Username" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
            />
            <div className="absolute right-4 top-4">
              {usernameStatus === 'checking' && <Loader2 className="animate-spin text-blue-400" />}
              {usernameStatus === 'valid' && <CheckCircle className="text-green-500" />}
              {usernameStatus === 'invalid' && <XCircle className="text-red-500" />}
            </div>
            {usernameStatus === 'invalid' && hasProfanity(username) && <p className="text-red-500 text-xs mt-1 ml-1">Username contains restricted words.</p>}
          </div>
        )}

        <div className="flex flex-col gap-3 pt-2">
          <button 
            onClick={isSignUpMode ? handleSignUp : handleLogin} 
            disabled={loading || (isSignUpMode && usernameStatus !== 'valid')} 
            className="w-full rounded-lg bg-blue-600 p-3 font-bold hover:bg-blue-700 disabled:opacity-50 transition"
          >
              {loading ? 'Processing...' : isSignUpMode ? 'Sign Up' : 'Log In'}
          </button>
          <button 
            type="button" 
            onClick={() => setIsSignUpMode(!isSignUpMode)} 
            className="text-gray-400 text-sm hover:text-white transition"
          >
            {isSignUpMode ? "Already have an account? Log In" : "Need an account? Sign Up"}
          </button>
        </div>
      </form>
    </div>
  )
}