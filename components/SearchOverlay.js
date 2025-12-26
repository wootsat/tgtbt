'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Search, User, PlayCircle, Loader2 } from 'lucide-react'

export default function SearchOverlay({ onClose, onSelectUser, onSelectVideo }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ users: [], videos: [] })
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  // --- HISTORY MANAGEMENT ---
  useEffect(() => {
    // 1. Add "search" state to history
    window.history.pushState({ modal: 'search' }, '', window.location.href);
    
    // 2. Close on Back Button
    const handlePopState = (event) => {
      event.preventDefault();
      onClose();
    };

    window.addEventListener('popstate', handlePopState);
    
    // 3. Auto-focus
    inputRef.current?.focus();

    return () => window.removeEventListener('popstate', handlePopState);
  }, []); // Run once on mount

  const handleManualClose = () => {
    // If user clicks "Cancel", go back to remove the history state
    if (window.history.state?.modal === 'search') {
        window.history.back();
    } else {
        onClose();
    }
  }

  // --- SEARCH LOGIC ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (!query.trim()) {
        setResults({ users: [], videos: [] })
        return
      }

      setLoading(true)

      const { data: users } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${query}%`)
        .limit(5)

      const { data: videos } = await supabase
        .from('videos')
        .select('*, profiles(username)')
        .ilike('title', `%${query}%`)
        .limit(10)

      setResults({ users: users || [], videos: videos || [] })
      setLoading(false)
    }, 300) 

    return () => clearTimeout(delayDebounceFn)
  }, [query])

  return (
    <div className="absolute inset-0 z-[60] bg-black/95 backdrop-blur-xl flex flex-col p-4 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
           <Search className="absolute left-4 top-3.5 text-gray-500" size={20} />
           <input 
             ref={inputRef}
             type="text" 
             placeholder="Search users or videos..." 
             value={query}
             onChange={(e) => setQuery(e.target.value)}
             className="w-full bg-gray-800 text-white pl-12 pr-4 py-3 rounded-full border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-900 outline-none transition"
           />
        </div>
        <button onClick={handleManualClose} className="text-gray-400 hover:text-white transition">
           Cancel
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto space-y-6">
        
        {loading && <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" /></div>}

        {/* User Results */}
        {!loading && results.users.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest pl-2">Users</h3>
            {results.users.map(user => (
              <div 
                key={user.id} 
                onClick={() => onSelectUser(user.id)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 cursor-pointer transition"
              >
                <div className="w-10 h-10 bg-gradient-to-tr from-gray-700 to-gray-600 rounded-full flex items-center justify-center overflow-hidden">
                   {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : <User size={18} />}
                </div>
                <span className="font-bold text-white">@{user.username}</span>
              </div>
            ))}
          </div>
        )}

        {/* Video Results */}
        {!loading && results.videos.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest pl-2">Videos</h3>
            {results.videos.map(video => (
              <div 
                key={video.id} 
                onClick={() => onSelectVideo(video)}
                className="flex gap-3 p-3 rounded-xl hover:bg-white/10 cursor-pointer transition group"
              >
                <div className="w-20 h-12 bg-black rounded-lg border border-gray-700 relative overflow-hidden shrink-0">
                    <video src={video.compressed_url || video.video_url} className="w-full h-full object-cover opacity-60" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <PlayCircle size={20} className="text-white opacity-80 group-hover:scale-110 transition" />
                    </div>
                </div>
                <div className="flex flex-col justify-center min-w-0">
                    <h4 className="font-bold text-white truncate">{video.title}</h4>
                    <p className="text-xs text-gray-400 truncate">by @{video.profiles?.username}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && query && results.users.length === 0 && results.videos.length === 0 && (
            <div className="text-center text-gray-500 mt-10">No results found</div>
        )}
      </div>
    </div>
  )
}