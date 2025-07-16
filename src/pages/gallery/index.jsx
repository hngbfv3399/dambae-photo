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
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [folders, setFolders] = useState([])
  const [unfolderPhotos, setUnfolderPhotos] = useState([])
  const [sort, setSort] = useState('created_at_desc')
  const [expandedFolders, setExpandedFolders] = useState(new Set())

  useEffect(() => {
    loadFoldersAndPhotos()
  }, [sort])

  const toggleFolder = (folderId) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId)
    } else {
      newExpanded.add(folderId)
    }
    setExpandedFolders(newExpanded)
  }

  const loadFoldersAndPhotos = async () => {
    try {
      setLoading(true)

      // 1. 폴더와 그 안의 사진들 불러오기
      const { data: foldersData, error: foldersError } = await supabase
        .from('folders')
        .select(`
          *,
          photos (
            *
          )
        `)
      
      if (foldersError) throw foldersError

      // 2. 폴더에 없는 사진들 불러오기
      const { data: unfolderedPhotos, error: photosError } = await supabase
        .from('photos')
        .select('*')
        .is('folder_id', null)
      
      if (photosError) throw photosError

      // 3. 사진 URL 가져오기
      const processPhotos = async (photos) => {
        return await Promise.all(
          photos.map(async (photo) => {
            const { data: { publicUrl } } = supabase
              .storage
              .from('photos')
              .getPublicUrl(photo.file_name)
            return { ...photo, url: publicUrl }
          })
        )
      }

      // 폴더 안의 사진들 URL 처리
      const processedFolders = await Promise.all(
        foldersData.map(async (folder) => ({
          ...folder,
          photos: await processPhotos(folder.photos)
        }))
      )

      // 폴더 없는 사진들 URL 처리
      const processedUnfolderPhotos = await processPhotos(unfolderedPhotos)

      // 정렬 적용
      const sortPhotos = (photos) => {
        return [...photos].sort((a, b) => {
          switch (sort) {
            case 'created_at_desc':
              return new Date(b.created_at) - new Date(a.created_at)
            case 'created_at_asc':
              return new Date(a.created_at) - new Date(b.created_at)
            case 'description_asc':
              return (a.description || '').localeCompare(b.description || '')
            case 'description_desc':
              return (b.description || '').localeCompare(a.description || '')
            default:
              return 0
          }
        })
      }

      // 각 폴더의 사진들 정렬
      const sortedFolders = processedFolders.map(folder => ({
        ...folder,
        photos: sortPhotos(folder.photos)
      }))

      setFolders(sortedFolders)
      setUnfolderPhotos(sortPhotos(processedUnfolderPhotos))
    } catch (error) {
      console.error('Error: ', error)
      alert('사진을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteFolder = async (folderId) => {
    if (!window.confirm('폴더를 삭제하시겠습니까? 폴더 안의 모든 사진도 함께 삭제됩니다.')) {
      return
    }

    try {
      const folder = folders.find(f => f.id === folderId)
      if (!folder) return

      // 폴더 안의 모든 사진들 스토리지에서 삭제
      if (folder.photos.length > 0) {
        const fileNames = folder.photos.map(photo => photo.file_name)
        const { error: storageError } = await supabase
          .storage
          .from('photos')
          .remove(fileNames)
        
        if (storageError) throw storageError
      }

      // 폴더 삭제 (CASCADE로 photos도 함께 삭제됨)
      const { error: folderError } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderId)
      
      if (folderError) throw folderError

      alert('폴더가 삭제되었습니다.')
      loadFoldersAndPhotos()
    } catch (error) {
      console.error('폴더 삭제 오류:', error)
      alert('폴더 삭제에 실패했습니다.')
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

  const totalPhotos = folders.reduce((sum, folder) => sum + folder.photos.length, 0) + unfolderPhotos.length

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
          <div className="space-y-6 sm:space-y-8">
            {/* 폴더별 사진들 */}
            {folders.map((folder) => (
              <div key={folder.id} className="rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleFolder(folder.id)}
                      className="flex items-center space-x-3 text-left flex-1 hover:text-blue-600 transition-colors"
                    >
                      <svg 
                        className={`w-5 h-5 transition-transform ${expandedFolders.has(folder.id) ? 'rotate-90' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <div className="flex items-center space-x-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        <div>
                          <h3 className="text-lg font-semibold">{folder.name}</h3>
                          <p className="text-sm">{folder.photos.length}개 사진</p>
                        </div>
                      </div>
                    </button>
                    
                    {user && (
                      <button
                        onClick={() => handleDeleteFolder(folder.id)}
                        className="p-2 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="폴더 삭제"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                
                {expandedFolders.has(folder.id) && (
                  <div className="p-4 sm:p-6">
                    <PhotoGrid photos={folder.photos} onPhotosChange={loadFoldersAndPhotos} />
                  </div>
                )}
              </div>
            ))}

            {/* 폴더에 없는 사진들 */}
            {unfolderPhotos.length > 0 && (
              <div className="rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <h3 className="text-lg font-semibold">일반 사진</h3>
                      <p className="text-sm">{unfolderPhotos.length}개 사진</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 sm:p-6">
                  <PhotoGrid photos={unfolderPhotos} onPhotosChange={loadFoldersAndPhotos} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 