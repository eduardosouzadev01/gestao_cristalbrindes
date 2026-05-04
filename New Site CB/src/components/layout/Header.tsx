'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, ShoppingCart, Menu, Phone, Mail, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CategoryNav from './CategoryNav';
import styles from './Header.module.css';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`${styles.header} ${isScrolled ? styles.scrolled : ''}`}>
      {/* Top Bar */}
      <div className={styles.topBar}>
        <div className="container">
          <div className={styles.topBarContent}>
            <div className={styles.contactInfo}>
              <a href="tel:+5527999586250">
                <Phone size={14} /> (27) 99958-6250
              </a>
              <a href="mailto:contato@cristalbrindes.com.br">
                <Mail size={14} /> contato@cristalbrindes.com.br
              </a>
            </div>
            <div className={styles.socials}>
              <span>Brindes personalizados para um futuro melhor</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className={`${styles.mainHeader} ${isScrolled ? 'glass' : ''}`}>
        <div className="container">
          <div className={styles.mainHeaderContent}>
            <Link href="/" className={styles.logo}>
              <Image 
                src="/logo.png" 
                alt="Cristal Brindes" 
                width={180} 
                height={50} 
                className={styles.logoImg}
              />
            </Link>

            <nav className={styles.desktopNav}>
              <Link href="/produtos" className={styles.navLink}>Produtos</Link>
              <Link href="/sobre" className={styles.navLink}>Sobre Nós</Link>
              <Link href="/contato" className={styles.navLink}>Contato</Link>
            </nav>

            <div className={styles.actions}>
              <div className={styles.searchContainer}>
                <input type="text" placeholder="Buscar produtos..." className={styles.searchInput} />
                <button className={styles.searchBtn}><Search size={20} /></button>
              </div>
              
              <Link href="/orcamento" className={styles.cartBtn}>
                <ShoppingCart size={22} />
                <span className={styles.cartBadge}>0</span>
              </Link>

              <button 
                className={styles.mobileMenuBtn}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Category Navigation Bar */}
      <CategoryNav />

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={styles.mobileMenu}
          >
            <div className="container">
              <nav className={styles.mobileNav}>
                <Link href="/produtos" onClick={() => setIsMobileMenuOpen(false)}>Produtos</Link>
                <Link href="/sobre" onClick={() => setIsMobileMenuOpen(false)}>Sobre Nós</Link>
                <Link href="/contato" onClick={() => setIsMobileMenuOpen(false)}>Contato</Link>
                <Link href="/orcamento" onClick={() => setIsMobileMenuOpen(false)}>Meu Orçamento (0)</Link>
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
