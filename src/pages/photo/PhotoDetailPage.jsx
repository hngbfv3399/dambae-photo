import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'

export default function PhotoDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [photo, setPhoto] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) {
      setError('사진 ID가 없습니다.')
      setLoading(false)
      return
    }

    loadPhoto()
  }, [id])

  const loadPhoto = async () => {
    try {
      setLoading(true)
      setError(null)

      // 사진 정보 가져오기
      const { data: photoData, error: photoError } = await supabase
        .from('photos')
        .select('*')
        .eq('id', id)
        .single()

      if (photoError) {
        if (photoError.code === 'PGRST116') {
          setError('사진을 찾을 수 없습니다.')
        } else {
          throw photoError
        }
        return
      }

      // 이미지 URL 가져오기
      const { data: { publicUrl } } = supabase
        .storage
        .from('photos')
        .getPublicUrl(photoData.file_name)

      setPhoto({
        ...photoData,
        url: publicUrl
      })

    } catch (error) {
      console.error('Error loading photo:', error)
      setError('사진을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!user) {
      alert('로그인이 필요합니다.')
      return
    }

    if (photo.user_id !== user.id) {
      alert('본인이 업로드한 사진만 삭제할 수 있습니다.')
      return
    }

    if (!confirm('정말로 삭제하시겠습니까? 되돌릴 수 없습니다.')) {
      return
    }

    try {
      // 스토리지에서 파일 삭제
      const { error: storageError } = await supabase
        .storage
        .from('photos')
        .remove([photo.file_name])

      if (storageError) throw storageError

      // DB에서 레코드 삭제
      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .eq('id', photo.id)
        .eq('user_id', user.id)

      if (dbError) throw dbError

      alert('삭제가 완료되었습니다.')
      navigate('/gallery')

    } catch (error) {
      console.error('Error deleting photo:', error)
      alert(`삭제 실패: ${error.message}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-t-transparent border-gray-300 rounded-full animate-spin mx-auto mb-4"></div>
          <p>로딩 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p style={{ fontSize: 20, marginBottom: 16 }}>{error}</p>
          <Link 
            to="/gallery" 
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors custom-btn"
          >
            갤러리로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  if (!photo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p style={{ fontSize: 20, marginBottom: 16 }}>사진이 없습니다.</p>
          <Link 
            to="/gallery" 
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors custom-btn"
          >
            갤러리로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-100 rounded-md transition-colors custom-btn"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>뒤로 가기</span>
            </button>

            {user && photo.user_id === user.id && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors custom-btn custom-btn-danger"
              >
                삭제
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Image */}
            <div className="lg:col-span-2">
              <div className="rounded-lg shadow-sm overflow-hidden">
                <img 
                  src={photo.url} 
                  alt={photo.description}
                  className="w-full h-auto max-h-[80vh] object-contain"
                />
              </div>
            </div>

            {/* Info Panel */}
            <div className="lg:col-span-1">
              <div className="rounded-lg shadow-sm p-6">
                <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>사진 정보</h1>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">설명</label>
                    <p>{photo.description || '설명이 없습니다.'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">업로드 날짜</label>
                    <p>
                      {new Date(photo.created_at).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">파일명</label>
                    <p className="text-sm break-all">{photo.file_name}</p>
                  </div>

                  {user && photo.user_id === user.id && (
                    <div className="pt-4 border-t">
                      <p style={{ color: 'var(--color-accent)', fontWeight: 500 }}>내가 업로드한 사진</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-6 space-y-3">
                  <a 
                    href={photo.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block w-full text-center px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors custom-btn"
                  >
                    원본 크기로 보기
                  </a>
                  
                  <Link 
                    to="/gallery"
                    className="block w-full text-center px-4 py-2 rounded-lg custom-btn custom-btn-primary"
                  >
                    갤러리로 돌아가기
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 