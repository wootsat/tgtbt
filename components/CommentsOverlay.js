'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { X, Send, Loader2, User } from 'lucide-react'
import { maskProfanity } from '@/lib/filter'

export default function CommentsOverlay({ videoId, onClose, onAuthRequired, isInsidePlayer, onCommentAdded, onUserClick }) {
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    fetchComments()
  }, [videoId])

  const fetchComments = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('comments')
      .select('*, profiles(username)')
      .eq('video_id', videoId)
      .order('created_at', { ascending: true })

    if (error) console.error(error)
    else setComments(data || [])
    setLoading(false)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      if (onAuthRequired) onAuthRequired()
      return
    }

    setSubmitting(true)
    const { error } = await supabase
      .from('comments')
      .insert({ 
        user_id: user.id, 
        video_id: videoId, 
        text: maskProfanity(newComment.trim()) 
      })

    if (error) {
      alert('Failed to post comment')
    } else {
      setNewComment('')
      fetchComments()
      if (onCommentAdded) onCommentAdded()
    }
    setSubmitting(false)
  }

  return (
    <div className={`${isInsidePlayer ? 'w-full h-full' : 'fixed inset-0 z-[60]'} flex items-end sm:items-center justify-center animate-in fade-in duration-200`}>
      
      {!isInsidePlayer && (
         <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      )}

      <div 
        onClick={(e) => e.stopPropagation()} // STOP CLOSING WHEN CLICKING INSIDE BOX
        className={`relative w-full max-w-md bg-gray-900 border-gray-800 shadow-2xl flex flex-col overflow-hidden 
        ${isInsidePlayer ? 'h-full bg-gray-900/90' : 'h-[80vh] sm:h-[600px] sm:rounded-2xl border'}`}
      >
        
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-transparent z-10">
          <h3 className="text-white font-bold text-lg">Comments</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white bg-black/20 rounded-full p-1">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex justify-center pt-10"><Loader2 className="animate-spin text-gray-500" /></div>
          ) : comments.length === 0 ? (
            <div className="text-center text-gray-500 mt-10 text-sm">No comments yet.</div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 animate-in slide-in-from-bottom-2">
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
                  <User size={14} className="text-gray-300" />
                </div>
                <div className="bg-gray-800/80 rounded-2xl rounded-tl-none p-3 max-w-[85%]">
                  {/* Username Button */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      if(onUserClick) onUserClick(comment.user_id)
                    }}
                    className="text-xs text-blue-400 font-bold mb-1 hover:text-blue-300 hover:underline text-left block"
                  >
                    {comment.profiles?.username || 'Unknown'}
                  </button>
                  
                  <p className="text-sm text-gray-200 leading-relaxed break-words">
                    {comment.text}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-2 text-right">
                    {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef}></div>
        </div>

        <form onSubmit={handleSubmit} className="p-3 bg-gray-800/50 border-t border-gray-700 flex gap-2 items-center backdrop-blur-md">
          <input 
            type="text" 
            placeholder="Add a comment..." 
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-1 bg-gray-900 text-white rounded-full px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button 
            type="submit" 
            disabled={submitting || !newComment.trim()}
            className="p-3 bg-blue-600 rounded-full text-white disabled:opacity-50 hover:bg-blue-500 transition"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </form>

      </div>
    </div>
  )
}