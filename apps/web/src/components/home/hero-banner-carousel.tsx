'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Banner {
  image: string;
  href: string;
  alt: string;
}

const banners: Banner[] = [
  {
    image: '/images/banner01.png',
    href: '/produtos/b21c9958-8282-4147-9ed8-adbc70b70d1a',
    alt: 'Promoção leve 3 pague 2',
  },
  {
    image: '/images/banner02.png',
    href: '/produtos/c16ba73e-eb11-4c60-b1b6-379ac6581bb3',
    alt: 'Promoção especial',
  },
];

export default function HeroBannerCarousel() {
  const [index, setIndex] = useState(0);

  const goPrev = () => setIndex((i) => (i === 0 ? banners.length - 1 : i - 1));
  const goNext = () => setIndex((i) => (i === banners.length - 1 ? 0 : i + 1));

  const banner = banners[index];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="relative">
        <Link
          href={banner.href}
          className="block rounded-2xl overflow-hidden shadow-md border border-slate-200/80"
        >
          <img
            src={banner.image}
            alt={banner.alt}
            className="w-full h-auto object-cover"
          />
        </Link>

        {banners.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Banner anterior"
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/90 hover:bg-white shadow-md border border-slate-200 transition-all duration-200"
            >
              <ChevronLeft className="h-5 w-5 text-slate-700" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Próximo banner"
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/90 hover:bg-white shadow-md border border-slate-200 transition-all duration-200"
            >
              <ChevronRight className="h-5 w-5 text-slate-700" />
            </button>
          </>
        )}
      </div>

      {banners.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {banners.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Ir para banner ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === index ? 'w-6 bg-primary-600' : 'w-1.5 bg-slate-300'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
