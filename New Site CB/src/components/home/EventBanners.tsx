'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import styles from './EventBanners.module.css';

const events = [
  { name: 'DIA DAS MÃES', image: 'https://images.unsplash.com/photo-1594498653385-d5172c532c00?q=80&w=400&h=600&auto=format&fit=crop' },
  { name: 'DIA DOS PAIS', image: 'https://images.unsplash.com/photo-1531844251246-9a1bfaae09fc?q=80&w=400&h=600&auto=format&fit=crop' },
  { name: 'DIA DA SECRETÁRIA', image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400&h=600&auto=format&fit=crop' },
  { name: 'OUTUBRO ROSA', image: 'https://images.unsplash.com/photo-15426019069d0-b4d9235e65a1?q=80&w=400&h=600&auto=format&fit=crop' },
  { name: 'NOVEMBRO AZUL', image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=400&h=600&auto=format&fit=crop' },
];

export default function EventBanners() {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.header}>
          <h2>Se liga aqui e já se adianta</h2>
          <p>Programe suas ações para as datas mais importantes do ano.</p>
        </div>

        <div className={styles.grid}>
          {events.map((event, idx) => (
            <motion.div 
              key={idx} 
              className={styles.card}
              whileHover={{ scale: 1.05 }}
            >
              <Image src={event.image} alt={event.name} fill className={styles.img} />
              <div className={styles.overlay}>
                <span className={styles.tag}>BRINDES PARA</span>
                <h3 className={styles.eventName}>{event.name}</h3>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
