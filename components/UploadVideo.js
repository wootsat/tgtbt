'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Upload, Music, Loader2, X } from 'lucide-react'

export default function UploadVideo({ onUploadComplete }) {
  const [file, setFile] = useState(null)
  const [audioFile, setAudioFile] = useState(null) // <--- New Audio State
  const [title, setTitle] = useState('')
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file || !title) return alert("Please select a video and enter a title.")

    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return alert("You must be logged in.")

    try {
      // 1. Upload Video
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

      // 2. Upload Audio (Optional)
      let finalAudioUrl = null
      if (audioFile) {
        const audioExt = audioFile.name.split('.').pop()
        const audioName = `audio_${Date.now()}.${audioExt}`
        const audioPath = `${user.id}/${audioName}`

        const { error: audioError } = await supabase.storage
          .from('videos') // We can reuse the same bucket
          .upload(audioPath, audioFile)

        if (audioError) throw audioError

        const { data: { publicUrl } } = supabase.storage
          .from('videos')
          .getPublicUrl(audioPath)
        
        finalAudioUrl = publicUrl
      }

      // 3. Save to Database
      const { error: dbError } = await supabase.from('videos').insert({
        user_id: user.id,
        title: title,
        video_url: videoUrl,
        audio_url: finalAudioUrl, // <--- Save the audio URL
        compressed_url: null 
      })

      if (dbError) throw dbError

      alert('Upload successful!')
      onUploadComplete()
      
    } catch (error) {
      alert(error.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="w-full bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-2xl">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Upload size={24} /> Upload Video
      </h2>
      
      <form onSubmit={handleUpload} className="space-y-4">
        
        {/* Title Input */}
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

        {/* Video File Input */}
        <div>
          <label className="block text-gray-400 text-xs uppercase tracking-widest mb-1">Video File</label>
          <input 
            type="file" 
            accept="video/*"
            onChange={(e) => setFile(e.target.files[0])}
            className="w-full text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
          />
        </div>

        {/* NEW: Audio File Input */}
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
          <p className="text-[10px] text-gray-500 mt-1">
            If uploaded, this audio will replace the video's original sound.
          </p>
        </div>

        <button 
          disabled={uploading}
          className="w-full bg-green-500 hover:bg-green-600 text-black font-bold py-3 rounded-lg transition flex items-center justify-center gap-2 mt-4"
        >
          {uploading ? <Loader2 className="animate-spin" /> : 'Post Video'}
        </button>
      </form>
    </div>
  )
}