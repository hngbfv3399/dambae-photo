import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'

export default function Header() {
  const { user, signOut } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [loading, setLoading] = useState(false)

  const createFolder = async () => {
    if (!folderName.trim()) {
      alert('폴더 이름을 입력해주세요.')
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase
        .from('folders')
        .insert([{ name: folderName.trim(), user_id: user.id }])
      
      if (error) throw error
      setShowModal(false)
      setFolderName('')
      alert('폴더가 생성되었습니다.')
    } catch (error) {
      console.error('폴더 생성 오류:', error)
      alert('폴더 생성에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      createFolder()
    }
  }

  return (
    <>
      <header className="shadow-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link 
              to="/" 
              className="text-xl font-bold hover:text-blue-600 transition-colors"
            >
              담배포토
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-4">
              {user ? (
                <>
                  <Link 
                    to="/upload" 
                    className="px-4 py-2 text-sm font-medium hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                  >
                    사진 업로드
                  </Link>
                  <button 
                    onClick={() => setShowModal(true)} 
                    className="px-4 py-2 text-sm font-medium hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                  >
                    폴더 만들기
                  </button>
                  <Link 
                    to="/gallery" 
                    className="px-4 py-2 text-sm font-medium hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                  >
                    갤러리
                  </Link>
                  <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-gray-300">
                    <span className="text-sm hidden lg:block">{user.email}</span>
                    <button 
                      onClick={signOut} 
                      className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
                    >
                      로그아웃
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link 
                    to="/login" 
                    className="px-4 py-2 text-sm font-medium hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                  >
                    로그인
                  </Link>
                  <Link 
                    to="/signup" 
                    className="px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-all duration-200"
                  >
                    회원가입
                  </Link>
                </>
              )}
            </nav>

            {/* Mobile menu button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {showMobileMenu ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-gray-200 shadow-lg">
            <div className="px-4 py-3 space-y-2">
              {user ? (
                <>
                  <Link 
                    to="/upload" 
                    className="block px-4 py-3 text-base font-medium hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    사진 업로드
                  </Link>
                  <button 
                    onClick={() => {
                      setShowModal(true)
                      setShowMobileMenu(false)
                    }} 
                    className="block w-full text-left px-4 py-3 text-base font-medium hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  >
                    폴더 만들기
                  </button>
                  <Link 
                    to="/gallery" 
                    className="block px-4 py-3 text-base font-medium hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    갤러리
                  </Link>
                  <div className="pt-2 mt-2 border-t border-gray-200">
                    <div className="px-4 py-2 text-sm">{user.email}</div>
                    <button 
                      onClick={() => {
                        signOut()
                        setShowMobileMenu(false)
                      }} 
                      className="block w-full text-left px-4 py-3 text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                    >
                      로그아웃
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link 
                    to="/login" 
                    className="block px-4 py-3 text-base font-medium hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    로그인
                  </Link>
                  <Link 
                    to="/signup" 
                    className="block px-4 py-3 text-base font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-all text-center"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    회원가입
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 relative">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">새 폴더 만들기</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                폴더 이름
              </label>
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="폴더 이름을 입력하세요"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                disabled={loading}
                autoFocus
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button 
                onClick={() => setShowModal(false)} 
                className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all order-2 sm:order-1"
                disabled={loading}
              >
                취소
              </button>
              <button 
                onClick={createFolder} 
                className="px-6 py-3 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
                disabled={loading || !folderName.trim()}
              >
                {loading ? '생성 중...' : '만들기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
} 