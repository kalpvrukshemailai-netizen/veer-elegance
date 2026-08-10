import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { products, type Category, fallbackImage } from '../data/products';
import { SafeImage } from './ui/SafeImage';
import { ShoppingBag } from 'lucide-react';
import { useCartStore } from '../store/useCart';

const categories: Category[] = ['Inside', 'Necklace', 'Chain', 'Earring', 'By Owner'];

export function Gallery() {
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');
  const addToCart = useCartStore(state => state.addToCart);

  const filteredProducts = activeCategory === 'All' 
    ? products 
    : products.filter(p => p.category === activeCategory);

  return (
    <section id="collection" className="py-24 bg-charcoal-900 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-serif text-ivory mb-6">Our Collection</h2>
          
          <div className="flex flex-wrap justify-center gap-4 mb-16">
            <button
              onClick={() => setActiveCategory('All')}
              className={`px-6 py-2 rounded-full font-sans text-sm tracking-wider uppercase transition-all duration-300 ${
                activeCategory === 'All' 
                  ? 'bg-gold-400 text-charcoal-900' 
                  : 'bg-transparent text-ivory border border-white/20 hover:border-gold-400 hover:text-gold-400'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-2 rounded-full font-sans text-sm tracking-wider uppercase transition-all duration-300 ${
                  activeCategory === cat 
                    ? 'bg-gold-400 text-charcoal-900' 
                    : 'bg-transparent text-ivory border border-white/20 hover:border-gold-400 hover:text-gold-400'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <motion.div 
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
        >
          <AnimatePresence>
            {filteredProducts.map((product) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
                key={product.id}
                className="group cursor-pointer flex flex-col"
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-charcoal-800 mb-4">
                  <SafeImage 
                    src={product.image}
                    alt={product.title}
                    fallback={fallbackImage}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-charcoal-900/60 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center backdrop-blur-[2px]">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(product);
                      }}
                      className="px-6 py-3 bg-gold-400 text-charcoal-900 font-medium tracking-wider uppercase text-sm rounded-lg hover:bg-gold-300 transition-transform transform translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 duration-500 flex items-center gap-2"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      Add to Cart
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-start mt-2">
                  <div>
                    <h3 className="font-serif text-lg text-ivory group-hover:text-gold-400 transition-colors">
                      {product.title}
                    </h3>
                    <p className="text-gold-400/60 text-sm font-sans tracking-widest uppercase mt-1">
                      {product.category}
                    </p>
                  </div>
                  {product.price > 0 && (
                    <span className="font-sans font-medium text-ivory">
                      ₹{product.price.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
