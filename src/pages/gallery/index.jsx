import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import PhotoGrid from './components/PhotoGrid'

const SORT_OPTIONS = [
  { value: 'created_at_desc', label: '최신순' },
  { value: 'created_at_asc', label: '오래된순' },
  { value: 'description_asc', label: '설명 가나다순' },
  { value: 'description_desc', label: '설명 역순' },
]

export default function GalleryPage() {
  const [loading, setLoading] = useState(true)
  const [photos, setPhotos] = useState([])
  const [sort, setSort] = useState('created_at_desc')

  useEffect(() => {
    loadPhotos()
  }, [sort])

  const loadPhotos = async () => {
    try {
      setLoading(true)

      const [sortKey, sortOrder] = sort.split('_')
      const isAscending = sortOrder === 'asc'

      const { data: photosData, error } = await supabase
        .from("photos")
        .select("*")
        .order(sortKey, { ascending: isAscending })

      if (error) throw error

      // 향후 성능 개선을 위해 이 부분은 Supabase Edge Function으로 대체하는 것을 고려해보세요.
      // 여러 개의 getPublicUrl 호출을 하나의 함수로 묶어 클라이언트-서버 간의 통신 횟수를 줄일 수 있습니다.
      const photosWithUrls = await Promise.all(
        photosData.map(async (photo) => {
          const { data: { publicUrl } } = supabase
            .storage
            .from('photos')
            .getPublicUrl(photo.file_name)
          
          return { ...photo, url: publicUrl }
        })
      )

      setPhotos(photosWithUrls)

    } catch (error) {
      console.error('Error loading photos: ', error)
      alert('사진을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-lg">사진을 불러오는 중...</span>
          </div>
        </div>
      </div>
    )
  }

  const totalPhotos = photos.length

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">갤러리</h1>
              <p className="text-sm sm:text-base mt-1">
                총 {totalPhotos}개의 사진
              </p>
            </div>
            
            {/* Sort Dropdown */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium whitespace-nowrap">
                정렬
              </label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-w-[120px]"
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {totalPhotos === 0 ? (
          <div className="text-center py-12 sm:py-16">
            <div className="max-w-md mx-auto">
              <svg className="mx-auto h-16 w-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-lg font-medium mb-2">아직 사진이 없습니다</h3>
              <p className="text-sm">첫 번째 사진을 업로드해보세요!</p>
            </div>
          </div>
        ) : (
          <div>
            <PhotoGrid photos={photos} onPhotosChange={loadPhotos} />
          </div>
        )}
      </div>
    </div>
  )
} 