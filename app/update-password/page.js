'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Lock, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password.length < 6) {
        setError("Password must be at least 6 characters.")
        setLoading(false)
        return
    }

    // Update the user's password
    const { error } = await supabase.auth.updateUser({ 
        password: password 
    })

    if (error) {
        setError(error.message)
    } else {
        setSuccess(true)
        // Redirect to home after 2 seconds
        setTimeout(() => router.push('/'), 2000)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-300">
        
        <div className="flex justify-center mb-6">
            <img src="/tgtbt_logo.png" alt="TGTBT" className="h-16 w-auto" />
        </div>

        <h1 className="text-2xl font-bold text-white text-center mb-2">Set New Password</h1>
        <p className="text-gray-400 text-center mb-8 text-sm">
            Enter your new password below.
        </p>

        {/* Success State */}
        {success ? (
            <div className="flex flex-col items-center gap-4 py-8">
                <CheckCircle className="text-green-500 w-16 h-16 animate-bounce" />
                <h2 className="text-white text-xl font-bold">Password Updated!</h2>
                <p className="text-gray-400">Redirecting you home...</p>
            </div>
        ) : (
            /* Form State */
            <form onSubmit={handleUpdate} className="space-y-6">
                
                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg flex items-center gap-2 text-sm">
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                <div className="relative">
                    <Lock className="absolute left-3 top-3.5 text-gray-500" size={20} />
                    <input 
                        type="password" 
                        placeholder="New Password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 pl-10 text-white focus:outline-none focus:border-blue-500 transition"
                        required 
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin" /> : 'Update Password'}
                </button>
            </form>
        )}

      </div>
    </div>
  )
}