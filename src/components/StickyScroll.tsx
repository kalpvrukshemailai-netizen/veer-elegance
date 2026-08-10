import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { SafeImage } from './ui/SafeImage';
import { fallbackImage } from '../data/products';

const content = [
  {
    title: 'Timeless Elegance',
    description: 'Discover the beauty of intricate pearl craftsmanship combined with bold, modern aesthetics. Perfect for any grand occasion.',
    image: '/assets/images/pearl_choker_1786365612240.png'
  },
  {
    title: 'Statement Pendants',
    description: 'Make a bold impression with oversized kundan pendants and layered designs that effortlessly command attention.',
    image: '/assets/images/kundan_necklace_1786365599450.png'
  },
  {
    title: 'Heritage Craft',
    description: 'Every gold bead and setting reflects decades of Surat\'s finest jewelry-making tradition, meticulously strung by hand.',
    image: '/assets/images/gold_jhumkas_1786365624809.png'
  },
  {
    title: 'Exquisite Chokers',
    description: 'Experience the luxury of finely set stones, vibrant enamel work, and teal accents in our signature choker collection.',
    image: '/assets/images/teal_necklace_1786365640333.png'
  }
];

export function StickyScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Opacity mappings for the 4 images based on scroll progress
  const opacity1 = useTransform(scrollYProgress, [0, 0.2, 0.3], [1, 1, 0]);
  const opacity2 = useTransform(scrollYProgress, [0.2, 0.3, 0.45, 0.55], [0, 1, 1, 0]);
  const opacity3 = useTransform(scrollYProgress, [0.45, 0.55, 0.7, 0.8], [0, 1, 1, 0]);
  const opacity4 = useTransform(scrollYProgress, [0.7, 0.8, 1], [0, 1, 1]);
  
  const opacities = [opacity1, opacity2, opacity3, opacity4];

  // Scale mapping for a subtle breathing effect on images
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);

  return (
    <section ref={containerRef} className="relative bg-charcoal-900" style={{ height: '400vh' }}>
      
      {/* Sticky Image Container */}
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <div className="w-full md:w-1/2 h-full absolute top-0 left-0">
          {content.map((item, index) => (
            <motion.div
              key={index}
              style={{ opacity: opacities[index] }}
              className="absolute inset-0 w-full h-full"
            >
              <motion.div style={{ scale, width: '100%', height: '100%' }}>
                <SafeImage
                  src={item.image}
                  alt={item.title}
                  fallback={fallbackImage}
                  className="w-full h-full object-cover"
                />
                {/* Gradient overlay to blend into the background on desktop */}
                <div className="absolute inset-0 bg-charcoal-900/40 md:bg-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-charcoal-900" />
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Scrolling Text Container */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="w-full md:w-1/2 md:ml-auto h-full flex flex-col pointer-events-auto">
          {content.map((item, index) => (
            <div key={index} className="h-screen flex items-center justify-center p-8 md:p-16">
              <div className="bg-charcoal-900/80 md:bg-transparent backdrop-blur-md md:backdrop-blur-none p-8 md:p-0 rounded-2xl max-w-lg">
                <span className="text-gold-400 text-sm font-sans tracking-widest uppercase mb-4 block">0{index + 1} // Details</span>
                <h3 className="text-4xl md:text-5xl font-serif text-ivory mb-6">{item.title}</h3>
                <p className="text-ivory/80 text-lg md:text-xl font-sans leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
    </section>
  );
}
