import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import UploadForm from './components/UploadForm'

export default function UploadPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (file, description, folderId) => {
    if (!file) {
      alert('파일을 선택해주세요.')
      return
    }

    if (!user) {
      alert('로그인이 필요합니다.')
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
            user_id: user.id,
            description: description || '',
            folder_id: folderId || null
          }
        ])

      if (insertError) throw insertError

      alert('사진 업로드가 완료되었습니다.')
      navigate('/gallery')
      
    } catch (error) {
      alert('업로드에 실패했습니다. 다시 시도해주세요.')
      console.error('Error: ', error)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">사진 업로드</h1>
      <UploadForm onUpload={handleUpload} uploading={uploading} />
    </div>
  )
} 