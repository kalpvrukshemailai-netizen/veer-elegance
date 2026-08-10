import { motion } from 'framer-motion';
import { MapPin, Clock, Phone, MessageCircle } from 'lucide-react';

export function VisitUs() {
  return (
    <section id="visit" className="py-24 px-6 md:px-12 bg-charcoal-800">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-16">
        
        {/* Contact Info */}
        <div className="w-full lg:w-1/3 space-y-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-serif text-ivory mb-4">Visit Us</h2>
            <div className="w-16 h-1 bg-gradient-to-r from-gold-400 to-gold-500 mb-8 rounded-full" />
            <p className="text-ivory/70 font-sans mb-8">
              Step into our boutique to explore the complete collection and find your perfect piece.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-6"
          >
            <div className="flex items-start space-x-4">
              <MapPin className="w-6 h-6 text-gold-400 shrink-0 mt-1" />
              <div>
                <h4 className="text-ivory font-serif text-xl mb-1">Location</h4>
                <p className="text-ivory/70 font-sans">Galleria St, Adajan Gam,<br/>Surat, Gujarat</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <Clock className="w-6 h-6 text-gold-400 shrink-0 mt-1" />
              <div>
                <h4 className="text-ivory font-serif text-xl mb-1">Hours</h4>
                <p className="text-ivory/70 font-sans">Mon - Sat: 10:30 AM - 8:30 PM<br/>Sunday: Closed</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <Phone className="w-6 h-6 text-gold-400 shrink-0 mt-1" />
              <div>
                <h4 className="text-ivory font-serif text-xl mb-1">Contact</h4>
                <p className="text-ivory/70 font-sans">+91 98765 43210</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="pt-4"
          >
            <a 
              href="https://wa.me/919876543210" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-full px-8 py-4 space-x-2 text-sm font-sans tracking-widest uppercase text-charcoal-900 bg-[#25D366] hover:bg-[#20bd5a] transition-colors rounded-full font-semibold shadow-lg shadow-[#25D366]/20"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Message on WhatsApp</span>
            </a>
          </motion.div>
        </div>

        {/* Map */}
        <div className="w-full lg:w-2/3 h-96 lg:h-auto min-h-[400px] rounded-xl overflow-hidden shadow-2xl relative group">
          <div className="absolute inset-0 bg-gold-400/10 pointer-events-none z-10 group-hover:bg-transparent transition-colors duration-500" />
          <iframe 
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3719.5583908871633!2d72.78453487508381!3d21.18738988582962!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be04d9c79237dcf%3A0xc665181c03932fa5!2sAdajan%20Gam%2C%20Adajan%2C%20Surat%2C%20Gujarat!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin" 
            className="w-full h-full border-0 grayscale-[50%] contrast-125 group-hover:grayscale-0 transition-all duration-700"
            allowFullScreen={false} 
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

      </div>
    </section>
  );
}
