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

      const { error: storageError } = await supabase
        .storage
        .from('photos')
        .remove([photo.file_name])

      if (storageError) throw storageError

      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .eq('id', photo.id)

      if (dbError) throw dbError

      onPhotosChange && onPhotosChange()
    } catch (error) {
      console.error('Error deleting photo:', error)
      alert('삭제에 실패했습니다. 다시 시도해주세요.')
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
        <p className="text-sm">아직 사진이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
      {photos.map((photo) => (
        <div 
          key={photo.id} 
          className="group relative rounded-lg overflow-hidden shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 cursor-pointer"
          onClick={() => navigate(`/photo/${photo.id}`)}
        >
          {/* Image Container */}
          <div className="aspect-square relative overflow-hidden">
            <img 
              src={photo.url} 
              alt={photo.description || '사진'}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300" />
            
            {/* Delete button for authorized users */}
            {user && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(photo)
                }}
                disabled={deletingPhotos.has(photo.id)}
                className="absolute top-2 right-2 p-2 bg-white bg-opacity-90 hover:bg-opacity-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                title="사진 삭제"
              >
                {deletingPhotos.has(photo.id) ? (
                  <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
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
