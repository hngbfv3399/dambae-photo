import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../lib/AuthContext'

export default function UploadForm() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [file, setFile] = useState(null)
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [folders, setFolders] = useState([])
  const [selectedFolder, setSelectedFolder] = useState('')
  const [preview, setPreview] = useState(null)
  const [dragActive, setDragActive] = useState(false)

  useEffect(() => {
    loadFolders()
  }, [])

  useEffect(() => {
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target.result)
      reader.readAsDataURL(file)
    } else {
      setPreview(null)
    }
  }, [file])

  const loadFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setFolders(data)
    } catch (error) {
      console.error('폴더 목록 불러오기 실패:', error)
      alert('폴더 목록을 불러오는데 실패했습니다.')
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.type.startsWith('image/')) {
        setFile(droppedFile)
      } else {
        alert('이미지 파일만 업로드 가능합니다.')
      }
    }
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      if (selectedFile.type.startsWith('image/')) {
        setFile(selectedFile)
      } else {
        alert('이미지 파일만 업로드 가능합니다.')
        e.target.value = ''
      }
    }
  }

  const validateForm = () => {
    if (!file) {
      alert('파일을 선택해주세요.')
      return false
    }
    if (file.size > 10 * 1024 * 1024) { // 10MB
      alert('파일 크기는 10MB 이하여야 합니다.')
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    try {
      setLoading(true)
      
      // 파일 업로드
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (uploadError) throw uploadError

      // DB에 저장
      const { error: insertError } = await supabase
        .from('photos')
        .insert([{
          file_name: fileName,
          description: description.trim(),
          folder_id: selectedFolder || null,
          user_id: user.id
        }])
      
      if (insertError) throw insertError

      alert('업로드가 완료되었습니다.')
      navigate('/gallery')
    } catch (error) {
      console.error('업로드 실패:', error)
      alert('업로드에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const removeFile = () => {
    setFile(null)
    setPreview(null)
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="shadow-lg rounded-xl overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b">
            <h1 className="text-xl sm:text-2xl font-bold">사진 업로드</h1>
            <p className="text-sm mt-1">새로운 사진을 업로드하고 폴더로 정리해보세요</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* File Upload Area */}
            <div className="space-y-4">
              <label className="block text-sm font-medium">
                사진 파일 <span className="text-sm font-normal">(최대 10MB)</span>
              </label>
              
              {!file ? (
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                    dragActive ? 'border-blue-400 scale-105' : 'border-gray-300'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-lg font-medium mb-2">파일을 드래그하거나 클릭하여 선택</p>
                  <p className="text-sm mb-4">JPG, PNG, GIF 파일을 지원합니다</p>
                  
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="fileInput"
                  />
                  <label
                    htmlFor="fileInput"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-all"
                  >
                    파일 선택
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Preview */}
                  <div className="relative">
                    <img
                      src={preview}
                      alt="미리보기"
                      className="w-full max-h-64 object-contain rounded-lg shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={removeFile}
                      className="absolute top-2 right-2 p-2 rounded-full shadow-lg hover:shadow-xl transition-all"
                      title="파일 제거"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* File Info */}
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                설명 <span className="text-sm font-normal">(선택사항)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="사진에 대한 설명을 입력하세요"
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                rows="3"
                maxLength="500"
              />
              <div className="flex justify-between text-xs">
                <span>사진을 설명하는 내용을 입력해주세요</span>
                <span>{description.length}/500</span>
              </div>
            </div>

            {/* Folder Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                폴더 선택 <span className="text-sm font-normal">(선택사항)</span>
              </label>
              <select
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">폴더 없음 (일반 사진)</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
              {folders.length === 0 && (
                <p className="text-xs">
                  새 폴더는 상단 메뉴에서 만들 수 있습니다
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading || !file}
                className="w-full py-3 px-4 border border-transparent text-sm font-medium rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md transition-all"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin mr-2"></div>
                    업로드 중...
                  </div>
                ) : (
                  '업로드하기'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 