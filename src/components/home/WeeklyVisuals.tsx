
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface WeeklyVisualsProps {
  week: number;
}

export default function WeeklyVisuals({ week }: WeeklyVisualsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Check if provided week supports visuals
  if (week < 12 || week > 16) {
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
    <div className="flex flex-col gap-3">
      <div className="relative w-full overflow-hidden rounded-3xl bg-gray-50 shadow-sm ring-1 ring-gray-100">
        <img
          src={images[currentIndex]}
          alt={`Week ${week} visual ${currentIndex + 1}`}
          className="w-full h-auto max-h-[32rem] object-contain transition-opacity duration-300"
          loading="lazy"
        />
      </div>

      {images.length > 1 && (
        <div className="flex items-center justify-center gap-4 px-2">
          <button
            onClick={handlePrev}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700 shadow-sm ring-1 ring-gray-200 transition-all hover:bg-gray-200"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="min-w-[48px] text-center text-sm font-semibold text-gray-500">
            {currentIndex + 1} / {images.length}
          </div>
          <button
            onClick={handleNext}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700 shadow-sm ring-1 ring-gray-200 transition-all hover:bg-gray-200"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}