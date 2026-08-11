import { useState } from 'react';
import { Menu, X, ShoppingBag, Search, MapPin, User, Heart, Gem } from 'lucide-react';
import { useCartStore } from '../store/useCart';

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const toggleCart = useCartStore((state) => state.toggleCart);
  const cartItemsCount = useCartStore((state) => state.items.reduce((total, item) => total + item.quantity, 0));

  const navLinks = [
    'Rings', 'Earrings', 'Bracelets & Bangles', 'Solitaires', 'Mangalsutras', 
    'Necklaces & Pendants', 'Silver by Shaya', 'Gifting', 'Collections', 'More Jewellery', 'Trending'
  ];

  return (
    <>
      <header className="w-full bg-white shadow-sm relative z-40">
        {/* Top Tier */}
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-3 flex items-center justify-between gap-4 md:gap-8">
          
          <div className="flex items-center gap-4">
            <button
              className="md:hidden text-purple-900"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <a href="#home" className="text-2xl md:text-3xl font-serif text-purple-900 font-bold flex items-center gap-2">
              <Gem className="text-purple-600" size={28} />
              VEER
            </a>
          </div>

          <div className="hidden md:flex flex-1 max-w-2xl">
            <div className="relative w-full">
              <input 
                type="text" 
                placeholder="Search Price, Design..." 
                className="w-full pl-4 pr-12 py-2.5 rounded-l-md border-y border-l border-purple-200 bg-purple-50 text-purple-900 focus:outline-none focus:border-purple-600 transition-colors"
              />
              <button className="absolute right-[-48px] top-0 bottom-0 px-4 bg-purple-600 text-white rounded-r-md hover:bg-purple-700 transition-colors">
                <Search size={20} />
              </button>
            </div>
          </div>
          
          <div className="hidden lg:flex items-center gap-6">
            <div className="text-xs text-purple-900 text-right leading-tight">
              Delivery & Stores<br/>
              <span className="text-pink-500 font-medium">Enter Pincode</span>
            </div>
            
            <div className="h-6 w-[1px] bg-purple-200"></div>

            <div className="flex items-center gap-4">
              <button className="text-purple-900 hover:text-purple-600">
                <User size={22} />
              </button>
              <button className="text-purple-900 hover:text-purple-600">
                <Heart size={22} />
              </button>
              <button 
                onClick={toggleCart}
                className="relative text-purple-900 hover:text-purple-600 transition-colors"
              >
                <ShoppingBag size={22} />
                {cartItemsCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-4 h-4 bg-purple-600 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                    {cartItemsCount}
                  </span>
                )}
              </button>
            </div>
          </div>
          
          <div className="flex md:hidden gap-4 items-center">
            <button className="text-purple-900">
              <Search size={22} />
            </button>
            <button 
              onClick={toggleCart}
              className="relative text-purple-900"
            >
              <ShoppingBag size={22} />
              {cartItemsCount > 0 && (
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-purple-600 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                  {cartItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Bottom Tier / Navigation */}
        <div className="hidden md:block bg-purple-700 text-white">
          <div className="max-w-[1440px] mx-auto px-4 md:px-8">
            <div className="flex items-center justify-between h-12 overflow-x-auto no-scrollbar gap-6">
              {navLinks.map((link) => (
                <a 
                  key={link} 
                  href={`#${link.toLowerCase().replace(/ /g, '-')}`}
                  className="whitespace-nowrap text-sm font-medium hover:text-gold-400 transition-colors"
                >
                  {link}
                </a>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex justify-between items-center p-4 border-b border-purple-100">
            <div className="flex items-center gap-2">
              <Gem className="text-purple-600" size={24} />
              <span className="text-xl font-serif text-purple-900 font-bold uppercase">VEER</span>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="text-purple-900">
              <X size={28} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 bg-purple-50 flex items-center gap-4 text-purple-900 mb-4">
              <MapPin size={20} className="text-pink-500" />
              <span className="text-sm font-medium">Enter Pincode for Delivery</span>
            </div>
            
            <div className="flex flex-col">
              {navLinks.map((link) => (
                <a
                  key={link}
                  href={`#${link.toLowerCase().replace(/ /g, '-')}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-6 py-4 text-purple-900 font-medium border-b border-purple-50 hover:bg-purple-50"
                >
                  {link}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
