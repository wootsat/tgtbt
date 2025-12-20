'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Upload, Loader2, CheckCircle } from 'lucide-react'

export default function UploadVideo({ onUploadComplete }) {
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState('idle') // idle, uploading, success, error

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file || !title) return alert('Please select a video and give it a title!')
    
    setUploading(true)
    setStatus('uploading')

    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) throw new Error('You must be logged in to upload.')

      // 1. Create a unique file path: user_id/timestamp_filename.mp4
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      // 2. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // 3. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath)

      // 4. Save Metadata to Database
      const { error: dbError } = await supabase
        .from('videos')
        .insert({
          user_id: user.id,
          title: title,
          video_url: publicUrl,
          // compressed_url is null initially; the backend job will fill it later
        })

      if (dbError) throw dbError

      setStatus('success')
      setFile(null)
      setTitle('')
      if (onUploadComplete) onUploadComplete()

    } catch (error) {
      console.error(error)
      alert('Error uploading: ' + error.message)
      setStatus('error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-gray-900 rounded-xl border border-gray-800 shadow-xl">
      <h2 className="text-xl font-bold text-white mb-4">Post a TGTBT</h2>
      
      {/* Title Input */}
      <div className="mb-4">
        <label className="block text-gray-400 text-sm mb-1">Video Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Impossible trick shot..."
          className="w-full bg-gray-800 text-white rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* File Input */}
      <div className="mb-6">
        <label className="block text-gray-400 text-sm mb-1">Video File</label>
        <div className="relative border-2 border-dashed border-gray-700 rounded-lg p-6 flex flex-col items-center justify-center hover:bg-gray-800 transition cursor-pointer">
          <input 
            type="file" 
            accept="video/*" 
            onChange={handleFileChange} 
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <Upload className="w-8 h-8 text-gray-500 mb-2" />
          <p className="text-sm text-gray-400">
            {file ? file.name : "Tap to select video"}
          </p>
        </div>
      </div>

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={uploading || status === 'success'}
        className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition ${
          status === 'success' 
            ? 'bg-green-600 text-white' 
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {uploading ? (
          <> <Loader2 className="animate-spin" /> Uploading... </>
        ) : status === 'success' ? (
          <> <CheckCircle /> Posted! </>
        ) : (
          'Post Video'
        )}
      </button>
    </div>
  )
}