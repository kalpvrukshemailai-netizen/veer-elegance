export function PromotionalBanners() {
  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-8 md:py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 h-auto md:h-[600px]">
        {/* Large Left Banner (e.g. Shaya by CaratLane) */}
        <div className="relative rounded-2xl overflow-hidden group cursor-pointer h-[400px] md:h-full">
          <div className="absolute inset-0 bg-black/10 z-10 group-hover:bg-black/0 transition-colors"></div>
          <img 
            src="/promo_1.png" 
            alt="Shaya by CaratLane" 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute bottom-8 left-8 right-8 z-20 text-white flex flex-col items-center text-center">
            <h3 className="text-3xl font-serif mb-2 text-gold-400">SHAYA</h3>
            <p className="text-sm tracking-widest uppercase mb-4">by CaratLane</p>
            <div className="bg-white/10 backdrop-blur-sm px-6 py-4 rounded-lg border border-white/20">
              <p className="font-medium text-lg mb-1">This Rakhi, Say it with Shaya</p>
              <h4 className="text-2xl font-bold text-gold-400">BUY 1, GET 1</h4>
              <p className="text-sm">on 925 Silver Jewellery</p>
            </div>
          </div>
        </div>

        {/* Right side Stacked Banners */}
        <div className="grid grid-rows-2 gap-4 md:gap-6">
          {/* Top Right Banner */}
          <div className="relative rounded-2xl overflow-hidden group cursor-pointer">
            <div className="absolute inset-0 bg-black/10 z-10 group-hover:bg-black/0 transition-colors"></div>
            <img 
              src="/promo_2.png" 
              alt="Rakhi Gifts" 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute top-8 right-8 z-20 text-white text-right max-w-[200px]">
              <p className="text-sm font-medium mb-1 text-gold-400">Thoughtful</p>
              <h3 className="text-3xl font-serif italic mb-2">Rakhi Gifts</h3>
              <p className="text-xs">for your forever secret keeper</p>
            </div>
            <div className="absolute bottom-4 right-6 z-20">
              <p className="text-xs text-white">Natural Diamonds starting from <span className="font-bold">₹5000</span></p>
            </div>
          </div>

          {/* Bottom Right Banner */}
          <div className="relative rounded-2xl overflow-hidden group cursor-pointer">
            <div className="absolute inset-0 bg-black/10 z-10 group-hover:bg-black/0 transition-colors"></div>
            <img 
              src="/promo_3.png" 
              alt="Late Summer Deals" 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute bottom-8 right-8 z-20 text-purple-900 text-right">
              <h3 className="text-4xl font-serif mb-1">11:11</h3>
              <p className="text-sm italic mb-2">Make a wish</p>
              <p className="text-xs max-w-[150px] ml-auto">Late summer. Little wishes. Lots of sparkle.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
