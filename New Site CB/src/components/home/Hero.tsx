'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, ShieldCheck, Globe } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './Hero.module.css';

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.bannerContainer}>
        {/* Banner 1 */}
        <div className={styles.banner}>
          <Image 
            src="/hero-product.jpg" 
            alt="Premium Gifts" 
            fill 
            className={styles.bannerImage}
            priority
          />
          <div className={styles.overlay} />
          
          <div className="container">
            <div className={styles.content}>
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className={styles.textContent}
              >
                <div className={styles.badge}>
                  <Sparkles size={16} />
                  <span>Excelência em Brindes B2B</span>
                </div>
                
                <h1 className={styles.title}>
                  Transforme sua Marca com <span className="text-gradient">Brindes Premium</span>
                </h1>
                
                <p className={styles.subtitle}>
                  Curadoria exclusiva de produtos que elevam a percepção da sua empresa e encantam seus parceiros.
                </p>

                <div className={styles.actions}>
                  <Link href="/produtos" className="btn btn-primary">
                    Explorar Catálogo <ArrowRight size={18} />
                  </Link>
                  <Link href="/contato" className="btn btn-glass">
                    Falar com Consultor
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mini Features Ribbon below banner */}
      <div className={styles.featuresRibbon}>
        <div className="container">
          <div className={styles.featuresList}>
            <div className={styles.feature}>
              <ShieldCheck size={20} />
              <span>Garantia de Qualidade Cristal</span>
            </div>
            <div className={styles.feature}>
              <Globe size={20} />
              <span>Logística Nacional Integrada</span>
            </div>
            <div className={styles.feature}>
              <Sparkles size={20} />
              <span>Personalização de Alto Nível</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
