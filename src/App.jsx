import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './lib/AuthContext'
import Header from './components/shared/Header'
import ProtectedRoute from './components/ProtectedRoute'
import GalleryPage from './pages/gallery'
import UploadPage from './pages/upload'
import MainPage from './pages/mainpage/MainPage'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import PhotoDetailPage from './pages/photo/PhotoDetailPage'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen">
          <Header />
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/photo/:id" element={<PhotoDetailPage />} />
            <Route 
              path="/upload" 
              element={
                <ProtectedRoute>
                  <UploadPage />
                </ProtectedRoute>
              } 
            />
            {/* 추후에 구현할 페이지들도 보호 */}
            <Route 
              path="/my-photos" 
              element={
                <ProtectedRoute>
                  <div className="p-4 text-center">내 사진 페이지는 아직 구현 안 했어❤️ 오빠가 만들어봐❤️</div>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <div className="p-4 text-center">프로필 페이지는 아직 구현 안 했어❤️ 오빠가 만들어봐❤️</div>
                </ProtectedRoute>
              } 
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App