'use client';

// Mismo patrón de modal que components/SpecimenCard.tsx (AnimatePresence +
// backdrop-blur + click-fuera-cierra) — reutilizado aquí para vistas previas
// y confirmaciones del panel admin.
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export default function AdminModal({ open, title, subtitle, onClose, children }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-3">
              <div>
                <h4 className="font-bold text-white">{title}</h4>
                {subtitle && <p className="text-xs text-neutral-500">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                aria-label="Cerrar"
                className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
