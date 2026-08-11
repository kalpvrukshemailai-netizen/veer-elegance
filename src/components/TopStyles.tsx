import { useState } from 'react';
import { Heart } from 'lucide-react';

export function TopStyles() {
  const [activeTab, setActiveTab] = useState('ALL');

  const tabs = ['ALL', 'NECKLACES', 'BRACELETS', 'EARRINGS', 'RINGS', 'MENS', 'MANGALSUTRA'];

  // Reusing generated images
  const products = [
    {
      id: 1,
      name: "Hearts All Over Bracelet",
      price: "₹999.00",
      originalPrice: "₹3,184.00",
      tag: "Flat 999",
      image: "/assets/images/gold_jhumkas_1786365624809.png",
      category: "EARRINGS"
    },
    {
      id: 2,
      name: "Diamond Affair Bracelet",
      price: "₹999.00",
      originalPrice: "₹3,647.00",
      tag: "Flat 999",
      image: "/assets/images/kundan_necklace_1786365599450.png",
      category: "NECKLACES"
    },
    {
      id: 3,
      name: "Athena Solitaire Hoop Earrings",
      price: "₹1,111.00",
      originalPrice: "₹3,226.00",
      tag: "Flat 1111",
      image: "/assets/images/pearl_choker_1786365612240.png",
      category: "EARRINGS"
    },
    {
      id: 4,
      name: "Crystal Love Bangle Bracelet",
      price: "₹999.00",
      originalPrice: "₹3,799.00",
      tag: "Flat 999",
      image: "/assets/images/teal_necklace_1786365640333.png", 
      category: "NECKLACES"
    }
  ];

  const filteredProducts = activeTab === 'ALL' 
    ? products 
    : products.filter(p => p.category === activeTab);

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-12 md:py-16">
      <h2 className="text-xl md:text-2xl font-sans tracking-wide text-center mb-8 text-gray-800 uppercase">
        PALMONAS TOP STYLES
      </h2>

      {/* Tabs */}
      <div className="flex flex-wrap justify-center gap-2 mb-10 border-b-0">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs md:text-sm tracking-wide border ${
              activeTab === tab 
                ? 'bg-black text-white border-black' 
                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-500'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {filteredProducts.map((product) => (
          <div key={product.id} className="group relative flex flex-col cursor-pointer">
            {/* Image Container */}
            <div className="relative aspect-square mb-4 bg-[#f9f9f9] overflow-hidden">
              {/* Tag */}
              {product.tag && (
                <div className="absolute top-0 left-0 bg-[#8c1c20] text-white text-[10px] font-bold px-2 py-1 z-10 clip-tag">
                  {product.tag}
                </div>
              )}
              
              <img 
                src={product.image} 
                alt={product.name} 
                className="w-full h-full object-cover p-4 transition-transform duration-500 group-hover:scale-105"
              />

              {/* Wishlist Heart */}
              <button className="absolute bottom-3 left-3 bg-white p-2 rounded-full shadow-sm hover:text-red-500 transition-colors z-10">
                <Heart size={16} strokeWidth={2} />
              </button>

              {/* Add to Bag (Hover) */}
              <button className="absolute bottom-3 right-3 bg-white/90 text-xs font-semibold px-4 py-2 shadow-sm opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 text-gray-700 hover:bg-white z-10 uppercase">
                ADD TO BAG
              </button>
            </div>

            {/* Product Info */}
            <div className="text-center flex flex-col items-center">
              <h3 className="text-sm text-gray-800 mb-1 line-clamp-1">{product.name}</h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium">{product.price}</span>
                {product.originalPrice && (
                  <span className="text-gray-400 line-through">{product.originalPrice}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
