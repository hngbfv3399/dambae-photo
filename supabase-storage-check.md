# Supabase 스토리지 설정 체크리스트

## 1. 스토리지 버킷 확인
- Supabase 대시보드 → Storage → photos 버킷이 있는지 확인
- 버킷이 **public**으로 설정되어 있는지 확인

## 2. 파일 업로드 확인
- Storage → photos 버킷 안에 실제로 `1752688818099-d4jtoa.jpg` 파일이 있는지 확인

## 3. RLS (Row Level Security) 정책 확인
- Storage → photos 버킷 → Policies 탭 확인
- **SELECT** 정책이 있고 **public**으로 읽기가 허용되어 있는지 확인

## 4. 버킷 정책 예시
```sql
-- photos 버킷에 대한 public 읽기 정책
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'photos');

-- 또는 더 간단하게
CREATE POLICY "Public read access" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'photos');
```

## 5. 확인 방법
1. 브라우저에서 직접 URL 접속: https://your-supabase-url/storage/v1/object/public/photos/filename.jpg
2. 404 오류가 나면 → 파일이 없음
3. 403 오류가 나면 → 권한 문제
4. 이미지가 보이면 → 스토리지는 정상, 웹앱 문제 