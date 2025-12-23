'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { X, Send, Loader2, Trash2 } from 'lucide-react'

export default function CommentsOverlay({ videoId, onClose, isInsidePlayer = false, onCommentAdded, onUserClick }) {
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [session, setSession] = useState(null)

  useEffect(() => {
    fetchComments()
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
  }, [videoId])

  const fetchComments = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('comments')
      .select('*, profiles(username)')
      .eq('video_id', videoId)
      .order('created_at', { ascending: false })

    if (!error) setComments(data)
    setLoading(false)
  }

  const handlePost = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return
    if (!session) return alert("Please log in to comment.")

    setPosting(true)
    const { error } = await supabase
      .from('comments')
      .insert({
        video_id: videoId,
        user_id: session.user.id,
        content: newComment.trim()
      })

    if (error) {
      alert(error.message)
    } else {
      setNewComment('')
      fetchComments() // Refresh list
      if (onCommentAdded) onCommentAdded() // Update counter in parent
    }
    setPosting(false)
  }

  const handleDelete = async (commentId) => {
    if (!confirm("Delete this comment?")) return
    const { error } = await supabase.from('comments').delete().eq('id', commentId)
    if (!error) {
      setComments(prev => prev.filter(c => c.id !== commentId))
    }
  }

  // --- CONTENT RENDERER ---
  const Content = () => (
    <div className={`flex flex-col bg-gray-900 border-gray-800 shadow-2xl overflow-hidden ${isInsidePlayer ? 'h-[70%] sm:h-[500px] w-full sm:rounded-t-2xl sm:rounded-b-xl border-t' : 'h-[80vh] w-full max-w-md rounded-t-2xl border-t border-l border-r'}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900 z-10">
        <h3 className="text-white font-bold">Comments ({comments.length})</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X size={24} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && <div className="flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>}
        
        {!loading && comments.length === 0 && (
          <div className="text-center text-gray-500 mt-10 text-sm">No comments yet. Be the first!</div>
        )}

        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
             <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
               {comment.profiles?.username?.[0]?.toUpperCase() || '?'}
             </div>
             <div className="flex-1">
               <div className="flex justify-between items-start">
                  <span 
                    className="text-xs font-bold text-gray-400 hover:text-blue-400 cursor-pointer"
                    onClick={() => { if(onUserClick) onUserClick(comment.user_id) }}
                  >
                    @{comment.profiles?.username || 'Unknown'}
                  </span>
                  <span className="text-[10px] text-gray-600">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
               </div>
               <p className="text-sm text-white mt-1 break-words">{comment.content}</p>
               
               {/* Delete Button (If Owner) */}
               {session?.user?.id === comment.user_id && (
                 <button onClick={() => handleDelete(comment.id)} className="text-[10px] text-red-500 hover:text-red-400 mt-1 flex items-center gap-1">
                   <Trash2 size={10} /> Delete
                 </button>
               )}
             </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handlePost} className="p-4 border-t border-gray-800 bg-gray-900 flex gap-2">
        <input 
          type="text" 
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..." 
          className="flex-1 bg-gray-800 text-white rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <button 
          disabled={posting || !newComment.trim()} 
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-full p-2 transition"
        >
          {posting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </form>
    </div>
  )

  // --- LAYOUT LOGIC ---

  // If inside player, VideoPlayer.js handles the backdrop click logic (via the update we just made above).
  // We just return the content.
  if (isInsidePlayer) {
    return <Content />
  }

  // If used in Feed/Profile (not inside player), WE provide the backdrop.
  // Clicking the backdrop closes. Clicking the Content stops propagation.
  return (
    <div 
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center" 
      onClick={onClose} // <--- CLICKING BACKDROP CLOSES
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:w-auto">
         <Content />
      </div>
    </div>
  )
}