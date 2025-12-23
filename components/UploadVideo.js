'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Upload, Music, Loader2, AlertCircle } from 'lucide-react'

// --- UPDATED CONFIGURATION ---
const MAX_SIZE_MB = 100      // Increased to 100MB
const MAX_DURATION_SEC = 180 // Increased to 3 minutes
// -----------------------------

export default function UploadVideo({ onUploadComplete }) {
  const [file, setFile] = useState(null)
  const [audioFile, setAudioFile] = useState(null)
  const [title, setTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  // Helper to check video duration
  const checkVideoDuration = (file) => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src)
        resolve(video.duration)
      }
      video.onerror = () => reject("Invalid video file")
      video.src = window.URL.createObjectURL(file)
    })
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    setStatusMsg('')
    if (!file || !title) return alert("Please select a video and enter a title.")

    // 1. CHECK FILE SIZE
    const fileSizeMB = file.size / 1024 / 1024
    if (fileSizeMB > MAX_SIZE_MB) {
      return alert(`File too large! Max size is ${MAX_SIZE_MB}MB`)
    }

    setUploading(true)

    try {
      // 2. CHECK VIDEO DURATION
      setStatusMsg("Checking video length...")
      const duration = await checkVideoDuration(file)
      
      if (duration > MAX_DURATION_SEC) {
        throw new Error(`Video is too long! Limit is ${MAX_DURATION_SEC} seconds. (Yours: ${Math.round(duration)}s)`)
      }

      // 3. UPLOAD VIDEO
      setStatusMsg("Uploading video...")
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("You must be logged in.")

      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`
      
      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, file)

      if (uploadError) throw uploadError
      
      const { data: { publicUrl: videoUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath)

      // 4. UPLOAD AUDIO (Optional)
      let finalAudioUrl = null
      if (audioFile) {
        setStatusMsg("Uploading audio...")
        // Check Audio Size
        if ((audioFile.size / 1024 / 1024) > MAX_SIZE_MB) {
           throw new Error("Audio file too large.")
        }

        const audioExt = audioFile.name.split('.').pop()
        const audioName = `audio_${Date.now()}.${audioExt}`
        const audioPath = `${user.id}/${audioName}`

        const { error: audioError } = await supabase.storage
          .from('videos')
          .upload(audioPath, audioFile)

        if (audioError) throw audioError

        const { data: { publicUrl } } = supabase.storage
          .from('videos')
          .getPublicUrl(audioPath)
        
        finalAudioUrl = publicUrl
      }

      // 5. SAVE TO DB
      setStatusMsg("Finalizing...")
      const { error: dbError } = await supabase.from('videos').insert({
        user_id: user.id,
        title: title,
        video_url: videoUrl,
        audio_url: finalAudioUrl,
        compressed_url: null 
      })

      if (dbError) throw dbError

      alert('Upload successful!')
      onUploadComplete()
      
    } catch (error) {
      alert(error.message)
    } finally {
      setUploading(false)
      setStatusMsg('')
    }
  }

  return (
    <div className="w-full bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-2xl">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Upload size={24} /> Upload Video
      </h2>
      
      <form onSubmit={handleUpload} className="space-y-4">
        
        {/* Title */}
        <div>
          <label className="block text-gray-400 text-xs uppercase tracking-widest mb-1">Title</label>
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-gray-800 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Give it a catchy title..."
          />
        </div>

        {/* Video Input */}
        <div>
          <label className="block text-gray-400 text-xs uppercase tracking-widest mb-1 flex justify-between">
            <span>Video File</span>
            <span className="text-gray-500">Max {MAX_DURATION_SEC}s / {MAX_SIZE_MB}MB</span>
          </label>
          <input 
            type="file" 
            accept="video/*"
            onChange={(e) => setFile(e.target.files[0])}
            className="w-full text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
          />
        </div>

        {/* Audio Input */}
        <div>
          <label className="block text-gray-400 text-xs uppercase tracking-widest mb-1 flex items-center gap-2">
            <Music size={14} /> Custom Audio (Optional)
          </label>
          <div className="relative">
             <input 
              type="file" 
              accept="audio/*"
              onChange={(e) => setAudioFile(e.target.files[0])}
              className="w-full text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pink-600 file:text-white hover:file:bg-pink-700 cursor-pointer"
            />
            {audioFile && (
               <button 
                 type="button" 
                 onClick={() => setAudioFile(null)} 
                 className="absolute right-0 top-2 text-red-500 hover:text-white text-xs"
                >
                 Remove Audio
               </button>
            )}
          </div>
        </div>

        {statusMsg && (
          <div className="text-sm text-blue-400 animate-pulse flex items-center gap-2">
             <Loader2 size={14} className="animate-spin" /> {statusMsg}
          </div>
        )}

        <button 
          disabled={uploading}
          className="w-full bg-green-500 hover:bg-green-600 text-black font-bold py-3 rounded-lg transition flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="animate-spin" /> : 'Post Video'}
        </button>
      </form>
    </div>
  )
}