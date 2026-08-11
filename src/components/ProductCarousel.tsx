import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';

export function ProductCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const products = [
    {
      id: 1,
      name: "Alor Gold Stud Earrings",
      price: "₹5,559",
      originalPrice: "",
      image: "/kids_product.png"
    },
    {
      id: 2,
      name: "Anaya Mini Kids' Diamond",
      price: "₹16,104",
      originalPrice: "₹17,933",
      image: "/kids_product.png"
    },
    {
      id: 3,
      name: "Petite Heart Kids' Diamond",
      price: "₹19,262",
      originalPrice: "₹22,006",
      image: "/kids_product.png"
    },
    {
      id: 4,
      name: "Precious Kids' Gold Earrings",
      price: "₹24,999",
      originalPrice: "",
      image: "/kids_product.png"
    }
  ];

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-12 border-t border-purple-100">
      <div className="flex flex-col md:flex-row gap-6 md:gap-8 bg-white rounded-2xl overflow-hidden shadow-sm">
        
        {/* Left Banner */}
        <div className="w-full md:w-1/3 relative bg-[#f8eef2] h-[300px] md:h-auto min-h-[400px]">
          <img 
            src="/kids_banner.png" 
            alt="Kids Designs" 
            className="w-full h-full object-cover mix-blend-multiply opacity-80"
          />
          <div className="absolute inset-0 p-8 flex flex-col justify-between z-10">
            <div>
              <h3 className="text-4xl md:text-5xl font-serif text-purple-900 leading-tight mb-2">
                Aww-dorable<br/>Designs
              </h3>
            </div>
            <a href="#shop-kids" className="text-sm font-bold text-purple-900 uppercase tracking-widest hover:text-purple-600 transition-colors flex items-center gap-1">
              SHOP FOR KIDS <ChevronRight size={16} />
            </a>
          </div>
        </div>

        {/* Right Product Carousel */}
        <div className="w-full md:w-2/3 py-8 pr-8 relative">
          <div 
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto no-scrollbar pb-8 snap-x"
          >
            {products.map((product) => (
              <div key={product.id} className="min-w-[220px] max-w-[220px] snap-start group cursor-pointer">
                <div className="bg-purple-50 rounded-xl aspect-square mb-4 p-4 flex items-center justify-center transition-transform group-hover:shadow-md">
                  <img src={product.image} alt={product.name} className="w-3/4 h-3/4 object-contain drop-shadow-md" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-end gap-2">
                    <span className="text-lg font-bold text-purple-900">{product.price}</span>
                    {product.originalPrice && (
                      <span className="text-sm text-gray-400 line-through pb-[2px]">{product.originalPrice}</span>
                    )}
                  </div>
                  <h4 className="text-sm text-gray-600 truncate">{product.name}</h4>
                  <button className="w-full mt-4 bg-purple-700 hover:bg-purple-800 text-white py-2 rounded-md font-medium text-sm transition-colors opacity-0 group-hover:opacity-100 hidden md:block">
                    Shop Now
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Controls */}
          <div className="hidden md:flex gap-2 mt-4">
            <button 
              onClick={scrollLeft}
              className="w-10 h-10 rounded-full border border-purple-200 flex items-center justify-center text-purple-900 hover:bg-purple-50 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={scrollRight}
              className="w-10 h-10 rounded-full bg-purple-700 text-white flex items-center justify-center hover:bg-purple-800 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
