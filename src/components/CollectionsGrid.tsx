export function CollectionsGrid() {
  // Palmonas style everyday demifine collection
  const collections = [
    { id: 1, title: 'Earrings', image: '/col_1.png' },
    { id: 2, title: 'Necklaces', image: '/col_2.png' },
    { id: 3, title: 'Bracelets', image: '/col_3.png' },
    { id: 4, title: 'Rings', image: '/promo_1.png' },
    { id: 5, title: 'Mangalsutras', image: '/promo_2.png' },
    { id: 6, title: 'Mens', image: '/kids_product.png' } // Re-using for demo
  ];

  return (
    <div className="max-w-[1440px] mx-auto px-4 py-12 md:py-16">
      <h2 className="text-xl md:text-2xl font-sans tracking-wide text-center mb-10 text-gray-800 uppercase">
        EVERYDAY DEMIFINE® COLLECTION
      </h2>
      
      <div className="flex overflow-x-auto no-scrollbar gap-4 md:gap-8 justify-start md:justify-center px-4 md:px-0 snap-x">
        {collections.map((collection) => (
          <div 
            key={collection.id} 
            className="group cursor-pointer flex flex-col items-center min-w-[140px] md:min-w-[180px] snap-start"
          >
            <div className="w-[140px] h-[140px] md:w-[180px] md:h-[180px] rounded-full overflow-hidden mb-4 shadow-sm group-hover:shadow-lg transition-all duration-300 transform group-hover:scale-105 bg-[#fff8eb]">
              <img 
                src={collection.image} 
                alt={collection.title} 
                className="w-full h-full object-cover mix-blend-multiply opacity-90 p-4"
              />
            </div>
            <h3 className="text-sm md:text-base font-sans text-gray-800 text-center tracking-wide">{collection.title}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}
