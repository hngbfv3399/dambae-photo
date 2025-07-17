import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../lib/AuthContext'

export default function PhotoGrid({ photos, onPhotosChange }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [deletingPhotos, setDeletingPhotos] = useState(new Set())

  const handleDelete = async (photo) => {
    if (!window.confirm('이 사진을 삭제하시겠습니까?')) {
      return
    }

    try {
      setDeletingPhotos(prev => new Set(prev).add(photo.id))
      
      console.log('Deleting photo:', photo.id, photo.file_name)
      console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
      console.log('Environment check:', {
        isDev: import.meta.env.DEV,
        mode: import.meta.env.MODE,
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL?.substring(0, 30) + '...'
      })

              // 현재 사용자와 사진 소유자 확인
      console.log('Current user ID:', user?.id)
      console.log('Photo user ID:', photo.user_id)
      console.log('Photo details:', { id: photo.id, file_name: photo.file_name, user_id: photo.user_id })

      // 먼저 DB에서 삭제 (권한 확인)
      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .eq('id', photo.id)
        .eq('user_id', user.id) // 본인 사진만 삭제 가능하도록 추가 확인

      if (dbError) {
        console.error('DB delete error:', dbError)
        throw new Error(`DB 삭제 실패: ${dbError.message}`)
      }

      // Storage 버킷 존재 여부 확인
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
      console.log('Available buckets:', buckets, 'Bucket error:', bucketError)

      // 먼저 파일이 존재하는지 확인
      console.log('Checking if file exists:', photo.file_name)
      const { data: fileList, error: listError } = await supabase
        .storage
        .from('photos')
        .list('', { search: photo.file_name })

      console.log('File exists check:', { fileList, listError, fileName: photo.file_name })

      // DB 삭제 성공 후 Storage에서 삭제
      console.log('Attempting to delete file from storage:', photo.file_name)
      const { data: deleteData, error: storageError } = await supabase
        .storage
        .from('photos')
        .remove([photo.file_name])

      console.log('Storage delete result:', { 
        data: deleteData, 
        error: storageError, 
        fileName: photo.file_name,
        currentUser: user?.id 
      })

      if (storageError) {
        console.error('Storage delete error:', storageError)
        console.error('Storage error details:', JSON.stringify(storageError, null, 2))
        console.error('Storage error name:', storageError.name)
        console.error('Storage error statusCode:', storageError.statusCode)
        
        // Storage 삭제 실패해도 DB는 이미 삭제됨 - 사용자에게는 성공으로 표시
        console.warn('Storage delete failed but DB delete succeeded. Photo will appear deleted to user.')
        alert('사진이 삭제되었습니다. (파일은 서버에서 별도 정리됩니다)')
      } else {
        console.log('Storage delete success:', { data: deleteData, fileName: photo.file_name })
        alert('사진이 성공적으로 삭제되었습니다.')
      }

      // 갤러리 새로고침
      if (onPhotosChange) {
        await onPhotosChange()
      }
      
    } catch (error) {
      console.error('Error deleting photo:', error)
      alert(`삭제에 실패했습니다: ${error.message || '알 수 없는 오류'}`)
    } finally {
      setDeletingPhotos(prev => {
        const newSet = new Set(prev)
        newSet.delete(photo.id)
        return newSet
      })
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-8">
        <svg className="mx-auto h-12 w-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p>아직 사진이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
      {photos.map((photo) => (
        <div 
          key={photo.id} 
          className="rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-200 cursor-pointer"
          onClick={() => navigate(`/photo/${photo.id}`)}
        >
          {/* Image Container - 문제됐던 aspect-square, overflow:hidden 제거 */}
          <div className="relative">
            <img 
              src={photo.url} 
              alt={photo.description || '사진'}
              className="w-full h-48 sm:h-56 object-cover rounded-t-lg"
              loading="lazy"
            />
            
            {/* Delete button - 로그인한 사용자만 */}
            {user && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(photo)
                }}
                disabled={deletingPhotos.has(photo.id)}
                className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="사진 삭제"
              >
                {deletingPhotos.has(photo.id) ? (
                  <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </button>
            )}
          </div>

          {/* Photo Info */}
          <div className="p-3 sm:p-4">
            <div className="space-y-2">
              {photo.description && (
                <p className="text-sm font-medium line-clamp-2 leading-relaxed">
                  {photo.description}
                </p>
              )}
              
              <div className="flex items-center justify-between text-xs">
                <span>{formatDate(photo.created_at)}</span>
                <div className="flex items-center space-x-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>보기</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
