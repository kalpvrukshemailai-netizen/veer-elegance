import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../store/useCart';
import { SafeImage } from './ui/SafeImage';

export function Cart() {
  const { isOpen, items, toggleCart, updateQuantity, removeFromCart, cartTotal } = useCartStore();

  const total = cartTotal();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleCart}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Cart Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-charcoal-900 border-l border-gold-400/20 z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h2 className="text-2xl font-serif text-gold-400 flex items-center gap-3">
                <ShoppingBag className="w-6 h-6" />
                Your Cart
              </h2>
              <button
                onClick={toggleCart}
                className="p-2 text-ivory/60 hover:text-white transition-colors rounded-full hover:bg-white/5"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-ivory/50 space-y-4">
                  <ShoppingBag className="w-16 h-16 opacity-20" />
                  <p>Your cart is empty.</p>
                  <button onClick={toggleCart} className="text-gold-400 hover:text-gold-300 underline underline-offset-4">Continue Shopping</button>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="flex gap-4 items-center bg-white/5 p-3 rounded-xl border border-white/5">
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-black/20 flex-shrink-0">
                      <SafeImage src={item.image} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-ivory font-medium truncate">{item.title}</h3>
                      <p className="text-gold-400 text-sm mb-2">₹{item.price.toLocaleString('en-IN')}</p>
                      
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-3 bg-black/30 w-fit rounded-lg px-2 py-1">
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="text-ivory/60 hover:text-white"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="text-ivory/60 hover:text-white"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="p-2 text-red-400/60 hover:text-red-400 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="p-6 border-t border-white/5 bg-black/20">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-ivory/80 font-medium">Subtotal</span>
                  <span className="text-2xl font-serif text-gold-400">₹{total.toLocaleString('en-IN')}</span>
                </div>
                <button className="w-full bg-gold-400 text-charcoal-900 font-bold py-4 rounded-xl hover:bg-gold-300 transition-colors flex items-center justify-center gap-2">
                  Proceed to Checkout
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
