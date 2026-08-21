
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface WeeklyVisualsProps {
  week: number;
}

export default function WeeklyVisuals({ week }: WeeklyVisualsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Check if provided week supports visuals
  if (week < 12 || week > 13) {
    return <></>;
  }

  // import.meta.glob requires a static string literal, so we import all weeks and filter dynamically
  const allModules = import.meta.glob('../../assets/weeks/*/*.{png,jpg,jpeg,svg,webp}', { eager: true, import: 'default' });
  const images = Object.keys(allModules)
    .filter((path) => path.startsWith(`../../assets/weeks/${week}/`))
    .map((path) => allModules[path] as string);

  if (images.length === 0) {
    return <></>;
  }

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="relative w-full overflow-hidden rounded-3xl bg-gray-50 shadow-sm ring-1 ring-gray-100">
      <img
        src={images[currentIndex]}
        alt={`Week ${week} visual ${currentIndex + 1}`}
        className="w-full h-auto max-h-[32rem] object-contain transition-opacity duration-300"
        loading="lazy"
      />

      {images.length > 1 && (
        <>
          <div className="absolute right-4 top-4 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {currentIndex + 1} / {images.length}
          </div>
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-800 shadow-sm backdrop-blur-sm transition-all hover:bg-white"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-800 shadow-sm backdrop-blur-sm transition-all hover:bg-white"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}
    </div>
  );
}