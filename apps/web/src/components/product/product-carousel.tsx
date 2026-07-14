'use client';

import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from './product-card';

const AUTOPLAY_DELAY_MS = 5000;

interface ProductCarouselProps {
  products: any[];
}

export default function ProductCarousel({ products }: ProductCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollByOneCard = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;

    const card = track.firstElementChild as HTMLElement | null;
    const gap = 24; // gap-6
    const cardWidth = card ? card.getBoundingClientRect().width + gap : track.clientWidth;

    track.scrollBy({ left: direction * cardWidth, behavior: 'smooth' });
  };

  const goNext = () => {
    const track = trackRef.current;
    if (!track) return;

    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 10;
    if (atEnd) {
      track.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      scrollByOneCard(1);
    }
  };

  useEffect(() => {
    if (products.length <= 1) return;

    const timer = setInterval(goNext, AUTOPLAY_DELAY_MS);
    return () => clearInterval(timer);
  }, [products.length]);

  if (products.length === 0) return null;

  return (
    <div className="relative">
      <div
        ref={trackRef}
        className="flex gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory no-scrollbar"
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="snap-start shrink-0 w-[80%] xs:w-1/2 sm:w-1/2 md:w-1/3 lg:w-1/4"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      {products.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => scrollByOneCard(-1)}
            aria-label="Produto anterior"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 hidden sm:flex p-2 rounded-full bg-white hover:bg-slate-50 shadow-md border border-slate-200 transition-all duration-200"
          >
            <ChevronLeft className="h-5 w-5 text-slate-700" />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Próximo produto"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 flex p-2 rounded-full bg-white hover:bg-slate-50 shadow-md border border-slate-200 transition-all duration-200"
          >
            <ChevronRight className="h-5 w-5 text-slate-700" />
          </button>
        </>
      )}
    </div>
  );
}
