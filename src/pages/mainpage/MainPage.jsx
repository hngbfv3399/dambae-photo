import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import TextPressure from "../../components/TextPressure";
import Masonry from "../../components/Masonry";

const MainPage = () => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const { data: photos, error } = await supabase
          .from("photos")
          .select("*")
          .limit(3);

        if (error) throw error;

        const itemsWithUrls = await Promise.all(
          photos.map(async (photo, index) => {
            const {
              data: { publicUrl },
            } = supabase.storage.from("photos").getPublicUrl(photo.file_name);

            return {
              id: String(index + 1),
              img: publicUrl,
              url: `/photo/${photo.id}`,
              height: [400, 250, 600][index], // 기존 높이값 유지
            };
          })
        );

        setItems(itemsWithUrls);
      } catch (error) {
        console.error("Error fetching photos:", error);
        // 에러 발생시 기본 이미지로 대체
        setItems([
          {
            id: "1",
            img: "https://picsum.photos/id/1015/600/900?grayscale",
            url: "https://example.com/one",
            height: 400,
          },
          {
            id: "2",
            img: "https://picsum.photos/id/1011/600/750?grayscale",
            url: "https://example.com/two",
            height: 250,
          },
          {
            id: "3",
            img: "https://picsum.photos/id/1020/600/800?grayscale",
            url: "https://example.com/three",
            height: 600,
          },
        ]);
      }
    };

    fetchPhotos();
  }, []);

  return (
    <div className="w-full h-screen overflow-y-scroll snap-y snap-mandatory">
      {/* First Section */}
      <div className="w-full min-h-[calc(100vh-56px)] flex items-center justify-center snap-start">
        <div className="w-screen px-4 md:px-0">
          <div className="text-2xl md:text-4xl font-bold mb-4 md:mb-8 text-center">
            우리들의 추억을 저장하는 공간
          </div>
          <TextPressure
            text="dambae photo"
            // imageId="0.12672281377847638.jpeg"
          />
        </div>
      </div>

      {/* Second Section */}
      <div className="w-full min-h-[calc(100vh-56px)] flex flex-col snap-start">
        <div className="w-full h-full max-w-[1800px] mx-auto px-4 py-8 md:px-8 md:py-12">
          <Masonry
            items={items}
            ease="power3.out"
            duration={0.6}
            stagger={0.05}
            animateFrom="bottom"
            scaleOnHover={true}
            hoverScale={0.95}
            blurToFocus={true}
            colorShiftOnHover={false}
          />
        </div>
      </div>

      
    </div>
  );
};

export default MainPage;
