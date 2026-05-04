'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, ChevronDown } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import MegaMenu from './MegaMenu';
import styles from './CategoryNav.module.css';

export default function CategoryNav() {
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);

  return (
    <div className={styles.categoryNav} onMouseLeave={() => setIsMegaMenuOpen(false)}>
      <div className="container">
        <div className={styles.navWrapper}>
          <div 
            className={`${styles.mainLink} ${isMegaMenuOpen ? styles.active : ''}`} 
            onMouseEnter={() => setIsMegaMenuOpen(true)}
          >
             <Menu size={20} />
             <span>BRINDES POR CATEGORIA</span>
             <ChevronDown size={16} className={isMegaMenuOpen ? styles.rotate : ''} />
          </div>
          
          <Link href="/produtos?status=lancamentos" className={styles.navLink}>
            LANÇAMENTOS E NOVIDADES
          </Link>
          
          <div className={styles.mainLink}>
             <Menu size={20} />
             <span>BRINDES POR TEMA</span>
          </div>

          <Link href="/gravacao" className={styles.navLink}>
            TIPOS DE GRAVAÇÃO
          </Link>

          <Link href="/sobre" className={styles.navLink}>
            SOBRE NÓS
          </Link>
        </div>
      </div>

      <AnimatePresence>
        <MegaMenu isOpen={isMegaMenuOpen} />
      </AnimatePresence>
    </div>
  );
}
