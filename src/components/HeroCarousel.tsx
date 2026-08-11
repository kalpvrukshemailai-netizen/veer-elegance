import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const banners = [
  {
    id: 1,
    image: '/assets/images/teal_necklace_1786365640333.png',
    title: 'Rakhi starting at',
    subtitle: 'Only ₹699',
    buttonText: 'SHOP NOW'
  },
  {
    id: 2,
    image: '/col_3.png',
    title: 'Its a tie',
    subtitle: 'Gift combos for sisters at 50% OFF',
    buttonText: 'SHOP NOW'
  }
];

export function HeroCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  return (
    <div className="relative w-full h-[calc(100dvh-60px)] md:h-[650px] lg:h-[750px] group overflow-hidden bg-black">
      {banners.map((banner, index) => (
        <div 
          key={banner.id}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out flex items-center justify-center ${
            index === currentIndex ? 'opacity-100 z-10 scale-100' : 'opacity-0 z-0 scale-105'
          }`}
        >
          {/* Background Image */}
          <div className="absolute inset-0">
            <img 
              src={banner.image} 
              alt="" 
              className="w-full h-full object-cover opacity-80"
            />
            {/* Subtle Gradient Overlay for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20"></div>
          </div>
          
          <div className="relative z-20 text-center text-white px-4 flex flex-col items-center mt-20">
            <h2 className={`text-2xl md:text-3xl lg:text-4xl mb-1 tracking-wider ${index === currentIndex ? 'animate-fade-in-up' : ''}`} style={{animationDelay: '0.2s'}}>
              {banner.title}
            </h2>
            <h1 className={`text-5xl md:text-7xl lg:text-8xl font-serif mb-8 ${index === currentIndex ? 'animate-fade-in-up' : ''}`} style={{animationDelay: '0.4s'}}>
              {banner.subtitle}
            </h1>
            <button className={`border-2 border-white text-white px-8 md:px-12 py-3 md:py-4 text-sm tracking-[0.2em] uppercase hover:bg-white hover:text-black transition-all duration-300 ${index === currentIndex ? 'animate-fade-in-up' : ''}`} style={{animationDelay: '0.6s'}}>
              {banner.buttonText}
            </button>
          </div>
        </div>
      ))}

      {/* Navigation Controls */}
      <button 
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 text-white/70 p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:text-white"
      >
        <ChevronLeft size={40} strokeWidth={1} />
      </button>
      
      <button 
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 text-white/70 p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:text-white"
      >
        <ChevronRight size={40} strokeWidth={1} />
      </button>

      {/* Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex gap-3">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-1 transition-all duration-300 ${
              index === currentIndex ? 'bg-white w-8' : 'bg-white/40 w-4 hover:bg-white/60'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
