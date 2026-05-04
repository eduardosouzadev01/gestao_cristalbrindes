'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import styles from './CipaBanner.module.css';

export default function CipaBanner() {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.banner}>
          <div className={styles.content}>
            <span className={styles.tag}>NOVA CATEGORIA DE BRINDES PARA</span>
            <h2 className={styles.title}>CIPA E SIPAT</h2>
            <p className={styles.description}>
              Uma <strong>Categoria Exclusiva</strong> de brindes temáticos para sua ação.
            </p>
            <Link href="/produtos?cat=cipa" className={styles.btn}>
              Veja todas as opções
            </Link>
          </div>
          <div className={styles.imageWrapper}>
            <Image 
              src="https://images.unsplash.com/photo-15426019069d0-b4d9235e65a1?q=80&w=600&auto=format&fit=crop" 
              alt="CIPA e SIPAT" 
              width={400} 
              height={250} 
              className={styles.bannerImg}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
