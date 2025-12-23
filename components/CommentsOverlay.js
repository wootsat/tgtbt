'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { X, Send, Loader2, Trash2 } from 'lucide-react'

export default function CommentsOverlay({ videoId, onClose, isInsidePlayer = false, onCommentAdded, onUserClick }) {
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [session, setSession] = useState(null)
  
  // 1. Add Ref to track the box
  const overlayRef = useRef(null)

  useEffect(() => {
    fetchComments()
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
  }, [videoId])

  // 2. Add the Click Outside Listener (Restores the "Close on click away" feature)
  useEffect(() => {
    // Only needed if we are inside the player (Feed mode has its own backdrop)
    if (!isInsidePlayer) return;

    const handleClickOutside = (event) => {
      // If clicking inside the comment box, ignore
      if (overlayRef.current && overlayRef.current.contains(event.target)) {
        return;
      }
      // If clicking outside, close
      onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isInsidePlayer, onClose]);


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
      fetchComments()
      if (onCommentAdded) onCommentAdded()
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
    <div 
      ref={overlayRef} // 3. Attach Ref here so we know where the box is
      onClick={(e) => e.stopPropagation()} // 4. STOP propagation (Prevents parent from closing this immediately)
      className={`flex flex-col bg-gray-900 border-gray-800 shadow-2xl overflow-hidden ${isInsidePlayer ? 'h-[70%] sm:h-[500px] w-full sm:rounded-t-2xl sm:rounded-b-xl border-t' : 'h-[80vh] w-full max-w-md rounded-t-2xl border-t border-l border-r'}`}
    >
      
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

  if (isInsidePlayer) {
    return <Content />
  }

  // Feed/Profile Mode (Backdrop)
  return (
    <div 
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center" 
      onClick={onClose} 
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:w-auto">
         <Content />
      </div>
    </div>
  )
}