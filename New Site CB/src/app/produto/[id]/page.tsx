'use client';

import { useState, useEffect, use } from 'react';
import { ChevronLeft, Share2, Heart, MessageCircle, ShoppingCart, ShieldCheck, Truck, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { productService } from '@/services/productService';
import type { Product } from '@/types/product';
import styles from './ProductPage.module.css';

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(50);

  useEffect(() => {
    async function loadProduct() {
      try {
        const data = await productService.getProductById(resolvedParams.id);
        setProduct(data);
      } catch (error) {
        console.error('Error loading product:', error);
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [resolvedParams.id]);

  if (loading) return <div className={styles.loading}>Carregando produto...</div>;
  if (!product) return <div className={styles.error}>Produto não encontrado.</div>;

  const whatsappMessage = `Olá! Gostaria de mais informações sobre o produto: ${product.name} (Ref: ${product.code})`;
  const whatsappUrl = `https://wa.me/5527999586250?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className={styles.container}>
      <div className="container">
        {/* Breadcrumb */}
        <nav className={styles.breadcrumb}>
          <Link href="/produtos" className={styles.backBtn}>
            <ChevronLeft size={20} /> Voltar ao Catálogo
          </Link>
          <span className={styles.path}>Catálogo / {product.name}</span>
        </nav>

        <div className={styles.productGrid}>
          {/* Gallery */}
          <div className={styles.gallery}>
            <div className={styles.mainImageContainer}>
              <Image 
                src={product.images[selectedImage] || product.image} 
                alt={product.name}
                fill
                className={styles.mainImage}
                priority
              />
              {product.badge && <span className={styles.badge}>{product.badge}</span>}
            </div>
            
            <div className={styles.thumbnails}>
              {(product.images.length > 0 ? product.images : [product.image]).map((img, idx) => (
                <button 
                  key={idx} 
                  className={`${styles.thumb} ${selectedImage === idx ? styles.activeThumb : ''}`}
                  onClick={() => setSelectedImage(idx)}
                >
                  <Image src={img} alt={`Thumb ${idx}`} fill className={styles.thumbImg} />
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className={styles.info}>
            <div className={styles.header}>
              <div className={styles.brandInfo}>
                <span className={styles.ref}>Ref: {product.code}</span>
              </div>
              <h1 className={styles.title}>{product.name}</h1>
            </div>

            <p className={styles.description}>{product.description}</p>

            <div className={styles.priceSection}>
              <span className={styles.priceLabel}>Preço sob consulta</span>
              <h2 className={styles.price}>Solicite um Orçamento</h2>
              <p className={styles.stockInfo}>Disponibilidade: <strong>{product.stock > 0 ? 'Em Estoque' : 'Sob Encomenda'}</strong></p>
            </div>

            {/* Features Mini Bar */}
            <div className={styles.featureBar}>
               <div className={styles.featureItem}>
                 <ShieldCheck size={18} />
                 <span>Garantia Cristal</span>
               </div>
               <div className={styles.featureItem}>
                 <Truck size={18} />
                 <span>Entrega Agilizada</span>
               </div>
               <div className={styles.featureItem}>
                 <RefreshCw size={18} />
                 <span>Troca Facilitada</span>
               </div>
            </div>

            {/* Actions */}
            <div className={styles.actions}>
              <div className={styles.quantitySelector}>
                <label>Quantidade Estimada:</label>
                <input 
                  type="number" 
                  value={quantity} 
                  onChange={(e) => setQuantity(parseInt(e.target.value))} 
                  min={1}
                />
              </div>

              <div className={styles.buttonGroup}>
                <a 
                  href={whatsappUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={`${styles.btn} ${styles.whatsappBtn}`}
                >
                  <MessageCircle size={20} /> Falar com Especialista
                </a>
                <button className={`${styles.btn} ${styles.quoteBtn}`}>
                  <ShoppingCart size={20} /> Adicionar ao Orçamento
                </button>
              </div>
            </div>

            <div className={styles.footerActions}>
               <button className={styles.iconAction}><Heart size={20} /> Favoritar</button>
               <button className={styles.iconAction}><Share2 size={20} /> Compartilhar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
