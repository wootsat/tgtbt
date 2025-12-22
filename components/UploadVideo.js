'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Upload, Loader2, Video } from 'lucide-react'
import { maskProfanity } from '@/lib/filter' // <--- IMPORTED

export default function UploadVideo({ onUploadComplete }) {
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [uploading, setUploading] = useState(false)

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file || !title) return alert("Please select a video and add a title.")
    setUploading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("You must be logged in.")

      // 1. Upload File
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath)

      // 3. Save to Database with PROFANITY MASK
      const { error: dbError } = await supabase
        .from('videos')
        .insert({
          user_id: user.id,
          title: maskProfanity(title), // <--- TITLE MASKED HERE
          video_url: publicUrl,
        })

      if (dbError) throw dbError

      alert("Upload successful!")
      setTitle('')
      setFile(null)
      if (onUploadComplete) onUploadComplete()

    } catch (error) {
      console.error(error)
      alert("Error uploading: " + error.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-gray-900 p-8 rounded-2xl shadow-xl border border-gray-800">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Upload className="text-blue-500" /> Upload Video
      </h2>

      <div className="space-y-4">
        {/* Title Input */}
        <div>
          <label className="block text-gray-400 text-sm font-bold mb-2">Title</label>
          <input
            type="text"
            className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Give it a catchy name..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* File Input */}
        <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-blue-500 transition cursor-pointer relative">
          <input 
            type="file" 
            accept="video/*" 
            onChange={handleFileChange} 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          {file ? (
            <div className="text-green-400 flex flex-col items-center">
              <Video size={32} className="mb-2" />
              <span className="font-bold">{file.name}</span>
            </div>
          ) : (
            <div className="text-gray-500 flex flex-col items-center">
              <Upload size={32} className="mb-2" />
              <span>Click to select video</span>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          onClick={handleUpload}
          disabled={uploading || !file || !title}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="animate-spin" /> Uploading...
            </>
          ) : (
            "Post Video"
          )}
        </button>
      </div>
    </div>
  )
}