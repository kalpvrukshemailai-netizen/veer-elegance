export function Footer() {
  return (
    <footer className="bg-purple-100 pt-16 pb-8 px-6 md:px-12 text-center mt-12">
      <div className="max-w-4xl mx-auto flex flex-col items-center">
        <a href="#home" className="text-2xl font-serif text-purple-900 tracking-wider mb-6 font-bold uppercase">
          VEER
        </a>
        <div className="flex space-x-6 mb-12">
          {['Instagram', 'Facebook', 'Pinterest'].map((social) => (
            <a 
              key={social}
              href="#"
              className="text-purple-700 hover:text-purple-900 text-sm font-sans tracking-widest uppercase transition-colors font-medium"
            >
              {social}
            </a>
          ))}
        </div>
        <p className="text-purple-900/60 text-sm font-sans">
          &copy; {new Date().getFullYear()} Veer Elegance Immitation Jewellery. All rights reserved. Handcrafted in Surat.
        </p>
      </div>
    </footer>
  );
}
