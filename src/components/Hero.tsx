import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const heroImages = [
  '/assets/images/pearl_choker_1786365612240.png',
  '/assets/images/teal_necklace_1786365640333.png',
  '/assets/images/kundan_necklace_1786365599450.png',
];

const fallbackImages = [
  '/assets/images/pearl_choker_1786365612240.png',
  '/assets/images/teal_necklace_1786365640333.png',
  '/assets/images/kundan_necklace_1786365599450.png',
];

export function Hero() {
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section id="home" className="relative h-screen w-full overflow-hidden bg-charcoal-900 flex items-center justify-center">
      {/* Background Images Crossfade */}
      <AnimatePresence initial={false}>
        <motion.div
          key={currentImage}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 0.6, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
          className="absolute inset-0 z-0"
        >
          <img
            src={heroImages[currentImage]}
            alt="Hero background"
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src !== fallbackImages[currentImage]) {
                target.src = fallbackImages[currentImage];
              }
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 z-1 bg-gradient-to-t from-charcoal-900 via-charcoal-900/50 to-charcoal-900/20" />

      {/* Subtle gold particles effect overlay */}
      <div className="absolute inset-0 z-2 opacity-30 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #C9A24B 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-4 flex items-center justify-center space-x-2"
        >
          <div className="flex text-gold-400">
            {'★★★★★'.split('').map((star, i) => <span key={i} className="text-sm">{star}</span>)}
          </div>
          <span className="text-ivory/80 text-sm font-sans tracking-widest uppercase">4.5 Rating</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-5xl md:text-7xl lg:text-8xl font-serif text-transparent bg-clip-text bg-gradient-to-r from-gold-400 via-ivory to-gold-500 mb-6 leading-tight"
        >
          Timeless Pieces, Handcrafted in Surat.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-lg md:text-xl text-ivory/80 mb-10 max-w-2xl font-sans"
        >
          Veer Arts Immitation Jewellery brings you an exquisite collection of artificial jewellery, blending tradition with modern elegance.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <a
            href="#gallery"
            className="inline-flex items-center justify-center px-8 py-4 text-sm font-sans tracking-widest uppercase text-charcoal-900 bg-gradient-to-r from-gold-400 to-gold-500 rounded-full hover:scale-105 transition-transform duration-300 shadow-[0_0_20px_rgba(201,162,75,0.3)]"
          >
            View Collection
          </a>
        </motion.div>
      </div>
    </section>
  );
}
