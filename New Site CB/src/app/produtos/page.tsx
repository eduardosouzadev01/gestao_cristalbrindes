'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, SlidersHorizontal, Grid, List } from 'lucide-react';
import ProductCard from '@/components/products/ProductCard';
import { productService } from '@/services/productService';
import type { Product } from '@/types/product';
import styles from './Produtos.module.css';

export default function ProdutosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('');

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
        const data = await productService.searchProducts(search, { source });
        setProducts(data);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    }
    const timeout = setTimeout(fetchProducts, 500);
    return () => clearTimeout(timeout);
  }, [search, source]);

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div className="container">
          <h1 className="heading-lg">Nosso Catálogo</h1>
          <p>Explore milhares de opções de brindes personalizados de alta qualidade.</p>
        </div>
      </section>

      <section className={styles.catalogSection}>
        <div className="container">
          <div className={styles.toolbar}>
            <div className={styles.searchBox}>
              <Search size={20} className={styles.searchIcon} />
              <input 
                type="text" 
                placeholder="O que você está procurando?" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className={styles.filters}>
              <div className={styles.filterGroup}>
                <label>Fornecedor:</label>
                <select value={source} onChange={(e) => setSource(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="XBZ">XBZ Brindes</option>
                  <option value="Asia">Asia Import</option>
                  <option value="Spot">Spot Gifts</option>
                </select>
              </div>
            </div>
          </div>

          <div className={styles.productCount}>
             Exibindo {products.length} produtos
          </div>

          <div className={styles.grid}>
            {loading ? (
              Array(8).fill(0).map((_, i) => (
                <div key={i} className={styles.skeleton} />
              ))
            ) : (
              products.map(product => (
                <ProductCard key={product.id} {...product} />
              ))
            )}
          </div>

          {!loading && products.length === 0 && (
            <div className={styles.empty}>
              <h3>Nenhum produto encontrado.</h3>
              <p>Tente ajustar seus filtros ou termo de busca.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
