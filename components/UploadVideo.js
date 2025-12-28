'use client'
import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Upload, X, Loader2, Image as ImageIcon, Film, Music, Trash2 } from 'lucide-react'

export default function UploadVideo({ onUploadComplete }) {
  // Visual Media State
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [fileType, setFileType] = useState('video') // 'video' or 'image'
  
  // Audio State (RESTORED)
  const [audioFile, setAudioFile] = useState(null)
  
  // Metadata State
  const [title, setTitle] = useState('')
  const [isTiled, setIsTiled] = useState(false) 
  const [uploading, setUploading] = useState(false)

  const fileInputRef = useRef(null)
  const audioInputRef = useRef(null)

  // --- HANDLERS ---

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return

    const type = selectedFile.type.startsWith('image/') ? 'image' : 'video'
    setFileType(type)
    setFile(selectedFile)
    setPreviewUrl(URL.createObjectURL(selectedFile))
  }

  const handleAudioSelect = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) setAudioFile(selectedFile)
  }

  const handleUpload = async () => {
    if (!file || !title) return alert('Please select a visual file and enter a title')

    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const timestamp = Date.now()

    // 1. Upload Visual File
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}-${timestamp}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(fileName, file)

    if (uploadError) {
      console.error(uploadError)
      setUploading(false)
      return alert('Upload failed')
    }

    const { data: { publicUrl: visualUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(fileName)

    // 2. Upload Audio File (If selected)
    let audioUrl = null
    if (audioFile) {
        const audioExt = audioFile.name.split('.').pop()
        const audioName = `${user.id}-${timestamp}-audio.${audioExt}`
        
        const { error: audioUploadError } = await supabase.storage
          .from('videos')
          .upload(audioName, audioFile)
        
        if (!audioUploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('videos')
              .getPublicUrl(audioName)
            audioUrl = publicUrl
        }
    }

    // 3. Insert into DB
    const { error: dbError } = await supabase
      .from('videos')
      .insert({
        user_id: user.id,
        title: title,
        video_url: visualUrl,
        compressed_url: visualUrl, // Images use raw URL
        audio_url: audioUrl,       // Save audio link
        is_tiled: isTiled
      })

    setUploading(false)
    
    if (dbError) {
      console.error(dbError)
      alert('Database error')
    } else {
      if (onUploadComplete) onUploadComplete()
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
      <h2 className="text-xl font-bold text-white mb-2">Upload Media</h2>
      
      {/* --- VISUAL INPUT --- */}
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-gray-600 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-gray-800 transition group relative overflow-hidden"
      >
        {previewUrl ? (
          fileType === 'image' ? (
             <img 
               src={previewUrl} 
               className={`max-h-48 rounded-md shadow-lg ${isTiled ? 'object-none' : 'object-contain'}`} 
               style={isTiled ? { width: '100%', height: '12rem', backgroundImage: `url(${previewUrl})` } : {}} 
             />
          ) : (
             <video src={previewUrl} className="max-h-48 rounded-md shadow-lg" controls={false} />
          )
        ) : (
          <>
            <div className="flex gap-2 mb-2">
                <Film className="text-gray-400 group-hover:text-blue-400" />
                <ImageIcon className="text-gray-400 group-hover:text-green-400" />
            </div>
            <p className="text-gray-400 text-sm font-medium">Click to select Video or Image</p>
          </>
        )}
        <input 
            ref={fileInputRef} 
            type="file" 
            accept="video/*,image/*" 
            onChange={handleFileSelect} 
            className="hidden" 
        />
      </div>

      {/* --- AUDIO INPUT (RESTORED) --- */}
      <div className="flex items-center gap-3">
        <div 
            onClick={() => audioInputRef.current?.click()}
            className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-gray-500 text-gray-300 rounded-xl p-3 cursor-pointer transition flex items-center justify-center gap-2"
        >
            <Music size={18} className={audioFile ? "text-green-400" : "text-gray-400"} />
            <span className="text-sm font-medium truncate">
                {audioFile ? audioFile.name : "Add Audio Track (Optional)"}
            </span>
            <input 
                ref={audioInputRef} 
                type="file" 
                accept="audio/*" 
                onChange={handleAudioSelect} 
                className="hidden" 
            />
        </div>
        {audioFile && (
            <button onClick={() => setAudioFile(null)} className="p-3 bg-red-900/50 hover:bg-red-900 text-red-400 rounded-xl transition">
                <Trash2 size={18} />
            </button>
        )}
      </div>

      {/* Title Input */}
      <input 
        type="text" 
        placeholder="Give it a title..." 
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-700 focus:border-blue-500 outline-none"
      />

      {/* --- TILED CHECKBOX --- */}
      <label className="flex items-center gap-3 p-3 bg-gray-800 rounded-xl cursor-pointer hover:bg-gray-700 transition select-none">
        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition ${isTiled ? 'bg-blue-500 border-blue-500' : 'border-gray-500'}`}>
            {isTiled && <Upload size={14} className="text-white rotate-180" />}
        </div>
        <input 
            type="checkbox" 
            checked={isTiled} 
            onChange={(e) => setIsTiled(e.target.checked)} 
            className="hidden" 
        />
        <div className="flex flex-col">
            <span className="font-bold text-white text-sm">Tile Mode</span>
            <span className="text-xs text-gray-400">Repeats media across the screen</span>
        </div>
      </label>

      {/* Upload Button */}
      <button 
        disabled={uploading}
        onClick={handleUpload}
        className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? <Loader2 className="animate-spin" /> : <Upload size={20} />}
        {uploading ? 'Uploading...' : 'Post it!'}
      </button>
    </div>
  )
}