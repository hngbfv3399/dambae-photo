import { useEffect, useRef, useState } from "react";
import { supabase } from '../lib/supabase';

const TextPressure = ({
  text = "Compressa",
  fontFamily = "Compressa VF",
  // This font is just an example, you should not use it in commercial projects.
  fontUrl = "https://res.cloudinary.com/dr6lvwubh/raw/upload/v1529908256/CompressaPRO-GX.woff2",
  imageId = null, // Supabase 스토리지의 이미지 ID
  backgroundImage = "https://picsum.photos/1200/800", // fallback 이미지

  width = true,
  weight = true,
  italic = true,
  alpha = false,

  flex = true,
  stroke = false,
  scale = false,

  className = "",

  minFontSize = 24,
}) => {
  const [imageUrl, setImageUrl] = useState(backgroundImage);
  const containerRef = useRef(null);
  const titleRef = useRef(null);
  const spansRef = useRef([]);

  const mouseRef = useRef({ x: 0, y: 0 });
  const cursorRef = useRef({ x: 0, y: 0 });

  const [fontSize, setFontSize] = useState(minFontSize);
  const [scaleY, setScaleY] = useState(1);
  const [lineHeight, setLineHeight] = useState(1);

  const chars = text.split("");

  const dist = (a, b) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Supabase 이미지 URL 가져오기
  useEffect(() => {
    const fetchImageUrl = async () => {
      if (!imageId) return;
      
      try {
        const { data: { publicUrl } } = supabase
          .storage
          .from('photos') // 여기 버킷 이름을 실제 버킷 이름으로 변경
          .getPublicUrl(imageId);
          
        if (publicUrl) {
          setImageUrl(publicUrl);
        }
      } catch (error) {
        console.error('이미지 URL 가져오기 실패:', error);
        // fallback 이미지 사용
        setImageUrl(backgroundImage);
      }
    };

    fetchImageUrl();
  }, [imageId, backgroundImage]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      cursorRef.current.x = e.clientX;
      cursorRef.current.y = e.clientY;
    };
    const handleTouchMove = (e) => {
      const t = e.touches[0];
      cursorRef.current.x = t.clientX;
      cursorRef.current.y = t.clientY;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });

    if (containerRef.current) {
      const { left, top, width, height } =
        containerRef.current.getBoundingClientRect();
      mouseRef.current.x = left + width / 2;
      mouseRef.current.y = top + height / 2;
      cursorRef.current.x = mouseRef.current.x;
      cursorRef.current.y = mouseRef.current.y;
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  const setSize = () => {
    if (!containerRef.current || !titleRef.current) return;

    const { width: containerW, height: containerH } =
      containerRef.current.getBoundingClientRect();

    let newFontSize = containerW / (chars.length / 2);
    newFontSize = Math.max(newFontSize, minFontSize);

    setFontSize(newFontSize);
    setScaleY(1);
    setLineHeight(1);

    requestAnimationFrame(() => {
      if (!titleRef.current) return;
      const textRect = titleRef.current.getBoundingClientRect();

      if (scale && textRect.height > 0) {
        const yRatio = containerH / textRect.height;
        setScaleY(yRatio);
        setLineHeight(yRatio);
      }
    });
  };

  useEffect(() => {
    setSize();
    window.addEventListener("resize", setSize);
    return () => window.removeEventListener("resize", setSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, text]);

  useEffect(() => {
    let rafId;
    const animate = () => {
      mouseRef.current.x += (cursorRef.current.x - mouseRef.current.x) / 15;
      mouseRef.current.y += (cursorRef.current.y - mouseRef.current.y) / 15;

      if (titleRef.current) {
        const titleRect = titleRef.current.getBoundingClientRect();
        const maxDist = titleRect.width / 2;

        spansRef.current.forEach((span) => {
          if (!span) return;

          const rect = span.getBoundingClientRect();
          const charCenter = {
            x: rect.x + rect.width / 2,
            y: rect.y + rect.height / 2,
          };

          const d = dist(mouseRef.current, charCenter);

          const getAttr = (distance, minVal, maxVal) => {
            const val = maxVal - Math.abs((maxVal * distance) / maxDist);
            return Math.max(minVal, val + minVal);
          };

          const wdth = width ? Math.floor(getAttr(d, 5, 200)) : 100;
          const wght = weight ? Math.floor(getAttr(d, 100, 900)) : 400;
          const italVal = italic ? getAttr(d, 0, 1).toFixed(2) : 0;
          const alphaVal = alpha ? getAttr(d, 0, 1).toFixed(2) : 1;

          span.style.opacity = alphaVal;
          span.style.fontVariationSettings = `'wght' ${wght}, 'wdth' ${wdth}, 'ital' ${italVal}`;
        });
      }

      rafId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(rafId);
  }, [width, weight, italic, alpha, chars.length]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
    >
      <style>{`
        @font-face {
          font-family: '${fontFamily}';
          src: url('${fontUrl}');
          font-style: normal;
          font-display: swap;
        }
        .text-image-clip {
          /* fallback 컬러 먼저 설정 */
          color: #333333;
          background-image: url('${imageUrl}');
          background-size: cover;
          background-position: center;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          
          /* 브라우저 지원하지 않을 때 fallback */
          @supports not (background-clip: text) {
            color: #333333;
            -webkit-text-fill-color: initial;
          }
        }
        .text-image-clip span {
          /* fallback 컬러 */
          color: #333333;
          background-image: url('${imageUrl}');
          background-size: cover;
          background-position: center;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          
          /* 브라우저 지원하지 않을 때 fallback */
          @supports not (background-clip: text) {
            color: #333333;
            -webkit-text-fill-color: initial;
          }
        }
        
        /* 이미지 로딩 실패시 fallback */
        .text-fallback {
          color: #333333 !important;
          -webkit-text-fill-color: #333333 !important;
          background: none !important;
        }
        
        .stroke span {
          position: relative;
        }
        .stroke span::after {
          content: attr(data-char);
          position: absolute;
          left: 0;
          top: 0;
          z-index: -1;
        }
      `}</style>

      <h1
        ref={titleRef}
        className={`text-pressure-title text-image-clip ${className} ${
          flex ? "flex justify-between" : ""
        } ${stroke ? "stroke" : ""} uppercase text-center`}
        style={{
          fontFamily: `'${fontFamily}', Arial, sans-serif`, // fallback 폰트 추가
          fontSize: fontSize,
          lineHeight,
          transform: `scale(1, ${scaleY})`,
          transformOrigin: "center top",
          margin: 0,
          fontWeight: 100,
        }}
      >
        {chars.map((char, i) => (
          <span
            key={i}
            ref={(el) => (spansRef.current[i] = el)}
            data-char={char}
            className="inline-block"
          >
            {char}
          </span>
        ))}
      </h1>
    </div>
  );
};

export default TextPressure;
