import { motion } from 'framer-motion';
import { SafeImage } from './ui/SafeImage';
import { fallbackImage } from '../data/products';

export function Story() {
  return (
    <section id="story" className="py-24 px-6 md:px-12 bg-charcoal-900 relative">
      <div className="max-w-6xl mx-auto flex flex-col-reverse md:flex-row items-center gap-16">
        
        {/* Content */}
        <div className="w-full md:w-1/2 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-serif text-ivory mb-6">The Art of Imitation</h2>
            <div className="w-16 h-1 bg-gold-400 mb-8" />
            <p className="text-ivory/80 font-sans text-lg leading-relaxed">
              Rooted in the rich heritage of Surat's jewelry-making tradition, Veer Elegance brings you meticulously handcrafted imitation pieces that rival the beauty of real gems. 
            </p>
            <p className="text-ivory/80 font-sans text-lg leading-relaxed mt-4">
              Our artisans blend age-old techniques with contemporary designs, ensuring every necklace, chain, and earring tells a story of elegance without compromise. Experience the luxury of fine craftsmanship curated just for you.
            </p>
          </motion.div>
        </div>

        {/* Supporting Image */}
        <div className="w-full md:w-1/2 flex justify-center md:justify-end">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="absolute inset-0 border border-gold-400 translate-x-4 translate-y-4 rounded-lg" />
            <div className="relative w-72 h-96 md:w-80 md:h-[30rem] overflow-hidden rounded-lg z-10 shadow-2xl">
              <SafeImage 
                src="/assets/images/pearl_choker_1786365612240.png" 
                alt="Inside the boutique"
                fallback={fallbackImage}
                className="w-full h-full object-cover grayscale-[30%] hover:grayscale-0 transition-all duration-700"
              />
            </div>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
