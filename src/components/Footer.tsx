export function Footer() {
  return (
    <footer className="bg-charcoal-900 border-t border-white/5 pt-16 pb-8 px-6 md:px-12 text-center">
      <div className="max-w-4xl mx-auto flex flex-col items-center">
        <a href="#home" className="text-2xl font-serif text-ivory tracking-wider mb-6">
          VEER ELEGANCE
        </a>
        <div className="flex space-x-6 mb-12">
          {['Instagram', 'Facebook', 'Pinterest'].map((social) => (
            <a 
              key={social}
              href="#"
              className="text-ivory/60 hover:text-gold-400 text-sm font-sans tracking-widest uppercase transition-colors"
            >
              {social}
            </a>
          ))}
        </div>
        <p className="text-ivory/40 text-sm font-sans">
          &copy; {new Date().getFullYear()} Veer Elegance Immitation Jewellery. All rights reserved. Handcrafted in Surat.
        </p>
      </div>
    </footer>
  );
}
