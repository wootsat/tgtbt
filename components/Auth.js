'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { X, Loader2, CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
import { hasProfanity } from '@/lib/filter'

export default function Auth({ onClose }) {
  // --- STATE ---
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [isSignUpMode, setIsSignUpMode] = useState(false)
  const [isResetMode, setIsResetMode] = useState(false) // New: Forgot Password Mode
  
  const [usernameStatus, setUsernameStatus] = useState('idle') 
  const [message, setMessage] = useState(null) // Success messages
  const [error, setError] = useState(null) // Error messages

  // --- USERNAME CHECK (Existing Logic) ---
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

  // --- HANDLERS ---

  // 1. Login
  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) setError(error.message)
    else onClose() 
    
    setLoading(false)
  }

  // 2. Sign Up
  const handleSignUp = async (e) => {
    e.preventDefault()
    setError(null)

    if(!username) return setError("Please pick a username")
    if (hasProfanity(username)) return setError("Username contains not allowed words.")
    if(usernameStatus === 'invalid') return setError("Username already taken or invalid!")
    
    setLoading(true)
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: { data: { username: username } }
    })

    if (error) {
      setError(error.message)
    } else {
      setMessage('Success! Check your email to verify your account.')
    }
    setLoading(false)
  }

  // 3. Reset Password (New)
  const handleResetPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (!email) {
        setError("Please enter your email address.")
        setLoading(false)
        return
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })

    if (error) {
        setError(error.message)
    } else {
        setMessage("Reset link sent! Please check your email.")
    }
    setLoading(false)
  }

  // --- RENDER ---
  return (
    <div className="w-full max-w-md space-y-6 rounded-2xl bg-gray-900 p-8 text-white shadow-2xl border border-gray-800 relative animate-in fade-in zoom-in duration-300">
      
      <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
        <X size={24} />
      </button>

      <div className="flex justify-center mb-4">
        <img src="/tgtbt_logo.png" alt="TGTBT" className="h-24 w-auto object-contain" />
      </div>

      <h2 className="text-center text-xl font-bold text-white mb-2">
        {isResetMode ? "Reset Password" : (isSignUpMode ? "Join to Rate & Upload" : "Welcome Back")}
      </h2>
      
      {/* Messages */}
      {error && <div className="text-red-400 text-sm text-center bg-red-900/20 p-2 rounded border border-red-900/50">{error}</div>}
      {message && <div className="text-green-400 text-sm text-center bg-green-900/20 p-2 rounded border border-green-900/50">{message}</div>}

      <form className="space-y-4" onSubmit={isResetMode ? handleResetPassword : (isSignUpMode ? handleSignUp : handleLogin)}>
        
        {/* Email Field (Always Visible) */}
        <input 
          className="w-full rounded-lg bg-gray-800 p-4 text-white focus:ring-2 focus:ring-blue-500 outline-none" 
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)}
          required 
        />

        {/* Password Field (Hidden in Reset Mode) */}
        {!isResetMode && (
            <input 
              className="w-full rounded-lg bg-gray-800 p-4 text-white focus:ring-2 focus:ring-blue-500 outline-none" 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
        )}

        {/* Username Field (Only Sign Up) */}
        {isSignUpMode && !isResetMode && (
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

        {/* Forgot Password Link (Only Login Mode) */}
        {!isSignUpMode && !isResetMode && (
            <div className="flex justify-end">
                <button 
                    type="button"
                    onClick={() => { setIsResetMode(true); setError(null); setMessage(null); }}
                    className="text-sm text-gray-400 hover:text-blue-400 transition"
                >
                    Forgot Password?
                </button>
            </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 pt-2">
          <button 
            type="submit"
            disabled={loading || (isSignUpMode && usernameStatus !== 'valid')} 
            className="w-full rounded-lg bg-blue-600 p-3 font-bold hover:bg-blue-700 disabled:opacity-50 transition flex justify-center items-center gap-2"
          >
              {loading && <Loader2 className="animate-spin" size={20} />}
              {loading ? 'Processing...' : (isResetMode ? 'Send Reset Link' : (isSignUpMode ? 'Sign Up' : 'Log In'))}
          </button>
          
          {/* Toggles */}
          {isResetMode ? (
             <button 
                type="button" 
                onClick={() => { setIsResetMode(false); setIsSignUpMode(false); setError(null); setMessage(null); }} 
                className="text-gray-400 text-sm hover:text-white transition flex items-center justify-center gap-2"
             >
               <ArrowLeft size={16} /> Back to Log In
             </button>
          ) : (
             <button 
                type="button" 
                onClick={() => { setIsSignUpMode(!isSignUpMode); setError(null); setMessage(null); }} 
                className="text-gray-400 text-sm hover:text-white transition"
             >
               {isSignUpMode ? "Already have an account? Log In" : "Need an account? Sign Up"}
             </button>
          )}
        </div>
      </form>
    </div>
  )
}