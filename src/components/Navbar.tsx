import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../store/useCart';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const toggleCart = useCartStore((state) => state.toggleCart);
  const cartItemsCount = useCartStore((state) => state.items.reduce((total, item) => total + item.quantity, 0));

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Collection', href: '#gallery' },
    { name: 'Featured', href: '#featured' },
    { name: 'Our Story', href: '#story' },
    { name: 'Visit Us', href: '#visit' },
  ];

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${
          isScrolled 
            ? 'bg-charcoal-900/90 backdrop-blur-md py-4 shadow-lg shadow-black/20 border-b border-white/5' 
            : 'bg-transparent py-6'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center">
          <a href="#home" className="text-xl md:text-2xl font-serif text-gold-400 tracking-wider uppercase">
            VEER ELEGANCE
          </a>
          
          <div className="hidden md:flex items-center space-x-12">
            {navLinks.map((link) => (
              <a 
                key={link.name} 
                href={link.href}
                className="text-sm font-sans text-ivory hover:text-gold-400 transition-colors tracking-widest uppercase font-medium"
              >
                {link.name}
              </a>
            ))}
            
            <button 
              onClick={toggleCart}
              className="relative p-2 text-ivory hover:text-gold-400 transition-colors"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartItemsCount > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-gold-400 text-charcoal-900 rounded-full text-[10px] flex items-center justify-center font-bold">
                  {cartItemsCount}
                </span>
              )}
            </button>
          </div>
          
          <div className="md:hidden flex items-center gap-4">
            <button 
              onClick={toggleCart}
              className="relative p-2 text-ivory hover:text-gold-400 transition-colors"
            >
              <ShoppingBag className="w-6 h-6" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-gold-400 text-charcoal-900 rounded-full text-xs flex items-center justify-center font-bold">
                  {cartItemsCount}
                </span>
              )}
            </button>
            <button
              className="text-gold-400"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={28} />
            </button>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-50 bg-charcoal-900 flex flex-col p-6"
          >
            <div className="flex justify-between items-center mb-12">
              <span className="text-xl font-serif text-gold-400 uppercase tracking-widest">VEER ELEGANCE</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-gold-400">
                <X size={32} />
              </button>
            </div>
            
            <div className="flex flex-col gap-8 text-center mt-12">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-2xl font-serif text-ivory hover:text-gold-400 tracking-widest uppercase"
                >
                  {link.name}
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
