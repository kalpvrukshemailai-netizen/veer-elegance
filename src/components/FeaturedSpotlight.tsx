import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { SafeImage } from './ui/SafeImage';
import { fallbackImage, products } from '../data/products';
import { ShoppingBag } from 'lucide-react';
import { useCartStore } from '../store/useCart';

export function FeaturedSpotlight() {
  const containerRef = useRef<HTMLDivElement>(null);
  const addToCart = useCartStore(state => state.addToCart);
  
  // Find the featured product
  const featuredProduct = products.find(p => p.id === '12') || products[0];

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);

  return (
    <section id="featured" ref={containerRef} className="py-24 bg-charcoal-900 relative overflow-hidden">
      <div className="container mx-auto px-6 md:px-12 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          
          <div className="w-full lg:w-1/2 relative h-[60vh] md:h-[80vh] rounded-2xl overflow-hidden shadow-2xl group">
            <div className="absolute inset-0 bg-charcoal-900/20 z-10 transition-opacity duration-700 group-hover:opacity-0" />
            <motion.div style={{ y }} className="absolute inset-[-10%] w-[120%] h-[120%]">
              <SafeImage 
                src={featuredProduct.image} 
                alt={featuredProduct.title}
                fallback={fallbackImage}
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              />
            </motion.div>
          </div>

          <div className="w-full lg:w-1/2 flex flex-col justify-center">
            <span className="text-gold-400 font-sans tracking-[0.2em] uppercase text-sm mb-6 flex items-center gap-4">
              <span className="w-12 h-px bg-gold-400" />
              Spotlight
            </span>
            <h2 className="text-4xl md:text-6xl font-serif text-ivory mb-8 leading-tight">
              {featuredProduct.title}
            </h2>
            <p className="text-ivory/70 font-sans text-lg md:text-xl leading-relaxed mb-10 max-w-xl">
              An exclusive piece handpicked by our founders. This stunning design combines traditional kundan craftsmanship with a modern silhouette, perfect for making a grand entrance.
            </p>
            <div className="flex items-center gap-8 mb-10">
              <div className="text-3xl font-serif text-gold-400">
                ₹{featuredProduct.price.toLocaleString('en-IN')}
              </div>
            </div>
            <button 
              onClick={() => addToCart(featuredProduct)}
              className="px-8 py-4 bg-gold-400 text-charcoal-900 font-medium tracking-wider uppercase text-sm hover:bg-gold-300 transition-colors w-fit flex items-center gap-3 rounded-xl shadow-lg hover:shadow-gold-400/20 hover:-translate-y-1 transform duration-300"
            >
              <ShoppingBag className="w-5 h-5" />
              Add to Cart
            </button>
          </div>

        </div>
      </div>
    </section>
  );
}
