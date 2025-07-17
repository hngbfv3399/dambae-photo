import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import UploadForm from './components/UploadForm'

export default function UploadPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (file, description, folderId = null) => {
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

      console.log('Uploading to folder:', folderId || 'none')

      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, file)

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        throw new Error(`파일 업로드 실패: ${uploadError.message}`)
      }

      const { error: insertError } = await supabase
        .from('photos')
        .insert([
          {
            file_name: fileName,
            user_id: user.id,
            description: description || '',
            folder_id: folderId
          }
        ])

      if (insertError) {
        console.error('DB insert error:', insertError)
        throw new Error(`데이터 저장 실패: ${insertError.message}`)
      }

      alert('사진 업로드가 완료되었습니다.')
      navigate('/gallery')
      
    } catch (error) {
      console.error('Upload error:', error)
      alert(`업로드에 실패했습니다: ${error.message || '알 수 없는 오류'}`)
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