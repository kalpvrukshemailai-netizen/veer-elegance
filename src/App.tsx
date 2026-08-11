import { Navbar } from './components/Navbar';
import { HeroCarousel } from './components/HeroCarousel';
import { CollectionsGrid } from './components/CollectionsGrid';
import { TopStyles } from './components/TopStyles';
import { Footer } from './components/Footer';
import { Cart } from './components/Cart';

function App() {
  return (
    <div className="bg-white min-h-screen text-gray-900 font-sans selection:bg-black/10 selection:text-black">
      <Navbar />
      <Cart />
      <main className="pt-0">
        <HeroCarousel />
        <CollectionsGrid />
        <TopStyles />
      </main>
      <Footer />
    </div>
  );
}

export default App;
