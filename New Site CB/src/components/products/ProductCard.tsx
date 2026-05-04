'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ShoppingCart, Eye } from 'lucide-react';
import type { Product } from '@/types/product';
import styles from './ProductCard.module.css';

export default function ProductCard(product: Product) {
  return (
    <motion.div 
      className={styles.card}
      whileHover={{ y: -8 }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <Link href={`/produto/${product.id}`} className={styles.imageLink}>
        <div className={styles.imageContainer}>
          {product.image ? (
            <Image 
              src={product.image} 
              alt={product.name}
              fill
              className={styles.image}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            />
          ) : (
            <div className={styles.placeholder} />
          )}
          
          {product.badge && (
            <span className={styles.badge}>{product.badge}</span>
          )}

          <div className={styles.overlay}>
            <button className={styles.quickView}>
              <Eye size={20} />
              <span>Ver Detalhes</span>
            </button>
          </div>
        </div>
      </Link>

      <div className={styles.content}>
        <div className={styles.meta}>
          <span className={styles.sku}>Ref: {product.code}</span>
        </div>
        
        <Link href={`/produto/${product.id}`}>
          <h3 className={styles.name}>{product.name}</h3>
        </Link>
        
        <div className={styles.footer}>
          <div className={styles.sourceInfo}>
            <span className={styles.sourceLabel}>Disponibilidade Imediata</span>
          </div>
          
          <button className={styles.cartBtn}>
            <ShoppingCart size={20} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
