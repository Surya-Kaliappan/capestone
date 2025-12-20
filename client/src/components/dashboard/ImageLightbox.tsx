import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download } from 'lucide-react';

interface LightboxProps {
  src: string;
  fileName: string;
  onClose: () => void;
}

export default function ImageLightbox({ src, fileName, onClose }: LightboxProps) {
  if (!src) return null;

  // Render outside the React hierarchy (at the <body> level)
  return createPortal(
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Toolbar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 bg-gradient-to-b from-black/50 to-transparent">
            <span className="text-white font-medium truncate max-w-xs drop-shadow-md">{fileName}</span>
            <div className="flex gap-4">
                <a 
                  href={src} 
                  download={fileName}
                  onClick={(e) => e.stopPropagation()}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition backdrop-blur-md"
                >
                    <Download size={20} />
                </a>
                <button 
                  onClick={onClose}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition backdrop-blur-md"
                >
                    <X size={20} />
                </button>
            </div>
        </div>

        {/* Image */}
        <motion.img 
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          src={src} 
          alt="Full view"
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()} 
        />
      </motion.div>
    </AnimatePresence>,
    document.body // <--- PORTAL TARGET
  );
}