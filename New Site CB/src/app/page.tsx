'use client';

import { useState, useEffect } from 'react';
import Hero from "@/components/home/Hero";
import TrustBadges from "@/components/home/TrustBadges";
import EventBanners from "@/components/home/EventBanners";
import CipaBanner from "@/components/home/CipaBanner";
import CategoryRibbon from "@/components/home/CategoryRibbon";
import ProductCard from "@/components/products/ProductCard";
import { productService } from '@/services/productService';
import type { Product } from '@/types/product';
import styles from "./page.module.css";
import { motion } from 'framer-motion';

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [latestProducts, setLatestProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [featured, latest] = await Promise.all([
          productService.getFeaturedProducts(8),
          productService.getLatestProducts(8)
        ]);
        setFeaturedProducts(featured);
        setLatestProducts(latest);
      } catch (error) {
        console.error('Failed to load products:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className={styles.page}>
      {/* Hero Section */}
      <Hero />

      {/* Trust Badges */}
      <TrustBadges />

      {/* Cipa Banner (Print 03) */}
      <CipaBanner />

      {/* Event Banners (Print 02) */}
      <EventBanners />

      {/* Featured Products Section */}
      <section className="section-padding">
        <div className="container">
          <div className={styles.sectionHeader}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="heading-lg">Tendências para 2026</h2>
              <p className={styles.sectionSubtitle}>Confira o que há de mais moderno no mercado de brindes corporativos.</p>
            </motion.div>
          </div>
          
          <div className={styles.productGrid}>
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className={styles.skeletonCard} />
              ))
            ) : (
              featuredProducts.map(product => (
                <ProductCard key={product.id} {...product} />
              ))
            )}
          </div>
        </div>
      </section>

      {/* New Products Section */}
      <section className="section-padding">
        <div className="container">
          <div className={styles.sectionHeader}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="heading-lg">Lançamentos & Novidades</h2>
              <p className={styles.sectionSubtitle}>Produtos exclusivos que acabaram de chegar em nosso catálogo.</p>
            </motion.div>
          </div>
          
          <div className={styles.productGrid}>
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className={styles.skeletonCard} />
              ))
            ) : (
              latestProducts.map(product => (
                <ProductCard key={`new-${product.id}`} {...product} />
              ))
            )}
          </div>
        </div>
      </section>

      {/* Ribbon Section - Electronic */}
      <CategoryRibbon 
        title="Eletrônicos Premium" 
        subtitle="Tecnologia que conecta sua marca ao dia a dia do cliente." 
        theme="dark"
        link="/produtos?cat=eletronicos"
      />
    </div>
  );
}
