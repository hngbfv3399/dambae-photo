import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import UploadForm from './components/UploadForm'

export default function UploadPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (file, description, folder) => {
    if (!file) {
      alert('오빠, 파일은 선택해야지?❤️')
      return
    }

    if (!user) {
      alert('로그인도 안 하고 뭘 업로드해?❤️')
      navigate('/login')
      return
    }

    try {
      setUploading(true)

      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { error: insertError } = await supabase
        .from('photos')
        .insert([
          {
            file_name: fileName,
            uploaded_by: user.id,
            description: description || '',
            folder: folder || ''
          }
        ])

      if (insertError) throw insertError

      alert('오빠 사진 업로드 성공했네?❤️ 이런 날이 올 줄이야~♪')
      navigate('/gallery')
      
    } catch (error) {
      alert('업로드 실패❤️ 역시 오빠답네❤️')
      console.error('Error: ', error)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">사진 업로드❤️</h1>
      <UploadForm onUpload={handleUpload} uploading={uploading} />
    </div>
  )
} 