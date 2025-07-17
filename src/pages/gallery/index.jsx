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
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)

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
      if (!folderToDelete) {
        alert('폴더를 찾을 수 없습니다.')
        return;
      }

      console.log('Deleting folder:', folderId, 'with', folderToDelete.photos.length, 'photos')

      // 먼저 폴더 안의 사진들을 DB에서 삭제 (권한 확인)
      if (folderToDelete.photos.length > 0) {
        const { error: photosError } = await supabase
          .from('photos')
          .delete()
          .eq('folder_id', folderId)
          .eq('user_id', user.id);

        if (photosError) {
          console.error('Photos delete error:', photosError)
          throw new Error(`사진 삭제 실패: ${photosError.message}`)
        }

        // DB에서 사진 삭제 성공 후 Storage에서 파일 삭제
        const fileNames = folderToDelete.photos.map(p => p.file_name);
        const { error: storageError } = await supabase.storage.from('photos').remove(fileNames);
        
        if (storageError) {
          console.error('Storage delete error:', storageError)
          // Storage 삭제 실패해도 계속 진행 (폴더는 삭제)
          console.warn('일부 파일 삭제에 실패했지만 계속 진행합니다.')
        }
      }
      
      // 폴더 삭제 (본인 폴더만 삭제 가능하도록 추가 확인)
      const { error: folderError } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderId)
        .eq('user_id', user.id);

      if (folderError) {
        console.error('Folder delete error:', folderError)
        throw new Error(`폴더 삭제 실패: ${folderError.message}`)
      }

      alert('폴더가 성공적으로 삭제되었습니다.')
      await loadFoldersAndPhotos();
    } catch (error) {
      console.error('폴더 삭제 오류:', error)
      alert(`폴더 삭제에 실패했습니다: ${error.message || '알 수 없는 오류'}`)
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      alert('폴더 이름을 입력해주세요.')
      return
    }

    try {
      setCreatingFolder(true)
      
      const { error } = await supabase
        .from('folders')
        .insert([
          {
            name: newFolderName.trim(),
            user_id: user.id
          }
        ])

      if (error) {
        console.error('Folder creation error:', error)
        throw new Error(`폴더 생성 실패: ${error.message}`)
      }

      alert('폴더가 성공적으로 생성되었습니다.')
      setNewFolderName('')
      setShowCreateFolder(false)
      await loadFoldersAndPhotos()
    } catch (error) {
      console.error('폴더 생성 오류:', error)
      alert(`폴더 생성에 실패했습니다: ${error.message || '알 수 없는 오류'}`)
    } finally {
      setCreatingFolder(false)
    }
  }

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
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">갤러리</h1>
            <p className="text-sm sm:text-base mt-1 text-gray-500">총 {totalPhotos}개의 사진</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setShowCreateFolder(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              폴더 생성
            </button>
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

        {/* 폴더 생성 입력창 */}
        {showCreateFolder && (
          <div className="mt-4 p-4 border rounded-lg bg-gray-50">
            <h3 className="text-lg font-medium mb-3">새 폴더 만들기</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="폴더 이름을 입력하세요"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
                disabled={creatingFolder}
              />
              <button
                onClick={handleCreateFolder}
                disabled={creatingFolder || !newFolderName.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creatingFolder ? '생성 중...' : '생성'}
              </button>
              <button
                onClick={() => {
                  setShowCreateFolder(false)
                  setNewFolderName('')
                }}
                disabled={creatingFolder}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        )}
      </div>

      {totalPhotos === 0 ? (
        <div className="text-center py-16">
          <h3 className="text-lg font-medium">아직 사진이 없습니다</h3>
          <p className="text-sm mt-1">첫 번째 사진을 업로드해보세요!</p>
        </div>
      ) : (
        <div className="space-y-8">
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
