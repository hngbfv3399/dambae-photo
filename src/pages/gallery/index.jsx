import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import PhotoGrid from './components/PhotoGrid'

const SORT_OPTIONS = [
  { value: 'created_at_desc', label: '최신순', key: 'created_at', ascending: false },
  { value: 'created_at_asc', label: '오래된순', key: 'created_at', ascending: true },
  { value: 'description_asc', label: '설명 가나다순', key: 'description', ascending: true },
  { value: 'description_desc', label: '설명 역순', key: 'description', ascending: false },
]

export default function GalleryPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [folders, setFolders] = useState([])
  const [unfolderPhotos, setUnfolderPhotos] = useState([])
  const [sort, setSort] = useState('created_at_desc')
  const [expandedFolders, setExpandedFolders] = useState(new Set())

  useEffect(() => {
    if (user) {
      loadFoldersAndPhotos()
    }
  }, [user, sort])

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
      
      const currentSortOption = SORT_OPTIONS.find(option => option.value === sort) || SORT_OPTIONS[0];

      // 1. Fetch all photos for the user
      const { data: photos, error: photosError } = await supabase
        .from('photos')
        .select('*')
        .eq('user_id', user.id)
        .order(currentSortOption.key, { ascending: currentSortOption.ascending });

      if (photosError) throw photosError;

      // 2. Fetch all folders for the user
      const { data: userFolders, error: foldersError } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (foldersError) throw foldersError;

      // 3. Generate public URLs for all photos
      const photosWithUrls = await Promise.all(
        photos.map(async (photo) => {
          const { data: { publicUrl } } = supabase
            .storage
            .from('photos')
            .getPublicUrl(photo.file_name);
          return { ...photo, url: publicUrl };
        })
      );

      // 4. Separate photos into folders and non-folder groups
      const photosInFolders = new Map();
      const photosWithoutFolder = [];

      photosWithUrls.forEach(photo => {
        if (photo.folder_id) {
          if (!photosInFolders.has(photo.folder_id)) {
            photosInFolders.set(photo.folder_id, []);
          }
          photosInFolders.get(photo.folder_id).push(photo);
        } else {
          photosWithoutFolder.push(photo);
        }
      });

      // 5. Combine folder data with photos
      const populatedFolders = userFolders.map(folder => ({
        ...folder,
        photos: photosInFolders.get(folder.id) || []
      }));

      setFolders(populatedFolders);
      setUnfolderPhotos(photosWithoutFolder);

    } catch (error) {
      console.error('Error loading data: ', error)
      alert('데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }
  
  const handleDeleteFolder = async (folderId) => {
    if (!window.confirm('폴더를 삭제하시겠습니까? 폴더 안의 모든 사진도 함께 삭제됩니다.')) {
      return
    }

    try {
      const folderToDelete = folders.find(f => f.id === folderId);
      if (!folderToDelete) return;

      // Delete photos from storage
      if (folderToDelete.photos.length > 0) {
        const fileNames = folderToDelete.photos.map(p => p.file_name);
        await supabase.storage.from('photos').remove(fileNames);
      }
      
      // Delete folder from DB (photos will be deleted by CASCADE)
      const { error } = await supabase.from('folders').delete().eq('id', folderId);
      if (error) throw error;

      alert('폴더가 삭제되었습니다.')
      loadFoldersAndPhotos();
    } catch (error) {
      console.error('폴더 삭제 오류:', error)
      alert('폴더 삭제에 실패했습니다.')
    }
  }

  // Render logic...
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-lg">데이터를 불러오는 중...</span>
      </div>
    )
  }

  const totalPhotos = folders.reduce((sum, folder) => sum + folder.photos.length, 0) + unfolderPhotos.length

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">갤러리</h1>
            <p className="text-sm sm:text-base mt-1 text-gray-500">총 {totalPhotos}개의 사진</p>
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {totalPhotos === 0 ? (
        <div className="text-center py-16">
          <h3 className="text-lg font-medium">아직 사진이 없습니다</h3>
          <p className="text-sm mt-1">첫 번째 사진을 업로드해보세요!</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Folders */}
          {folders.map((folder) => (
            <div key={folder.id} className="rounded-xl shadow-sm border">
              <div className="p-4 border-b flex justify-between items-center">
                <button onClick={() => toggleFolder(folder.id)} className="flex items-center space-x-3">
                  <svg className={`w-5 h-5 transition-transform ${expandedFolders.has(folder.id) ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  <h3 className="text-lg font-semibold">{folder.name} ({folder.photos.length})</h3>
                </button>
                <button onClick={() => handleDeleteFolder(folder.id)} className="p-2 hover:bg-red-50 rounded-full"><svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
              </div>
              {expandedFolders.has(folder.id) && (
                <div className="p-4">
                  <PhotoGrid photos={folder.photos} onPhotosChange={loadFoldersAndPhotos} />
                </div>
              )}
            </div>
          ))}

          {/* Uncategorized Photos */}
          {unfolderPhotos.length > 0 && (
            <div className="rounded-xl shadow-sm border">
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold">일반 사진 ({unfolderPhotos.length})</h3>
              </div>
              <div className="p-4">
                <PhotoGrid photos={unfolderPhotos} onPhotosChange={loadFoldersAndPhotos} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
