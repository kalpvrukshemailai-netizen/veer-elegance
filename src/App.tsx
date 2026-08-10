import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { StickyScroll } from './components/StickyScroll';
import { Gallery } from './components/Gallery';
import { FeaturedSpotlight } from './components/FeaturedSpotlight';
import { Story } from './components/Story';
import { VisitUs } from './components/VisitUs';
import { Footer } from './components/Footer';
import { Cart } from './components/Cart';

function App() {
  return (
    <div className="bg-charcoal-900 min-h-screen text-ivory font-sans selection:bg-gold-400/30 selection:text-gold-400">
      <Navbar />
      <Cart />
      <main>
        <Hero />
        <StickyScroll />
        <Gallery />
        <FeaturedSpotlight />
        <Story />
        <VisitUs />
      </main>
      <Footer />
    </div>
  );
}

export default App;
