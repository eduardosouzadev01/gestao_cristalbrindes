'use client';

import { motion } from 'framer-motion';
import { PenTool, Layout, Monitor, Coffee, Shirt, Wine, Key, Package } from 'lucide-react';
import Link from 'next/link';
import styles from './MegaMenu.module.css';

const categories = [
  {
    title: 'Canetas',
    icon: <PenTool size={24} />,
    items: ['Canetas Ecológicas', 'Canetas Metal', 'Canetas Plásticas', 'Canetas Semimetal', 'Estojos', 'Kits Especiais', 'Marca Textos', 'Lapiseiras'],
  },
  {
    title: 'Escritório',
    icon: <Layout size={24} />,
    items: ['Agendas', 'Blocos Moleskine', 'Blocos De Anotações', 'Cadernos', 'Calculadoras', 'Pastas', 'Risque Rabisque', 'Lápis', 'Mouse Pad', 'Réguas', 'Brindes De PVC', 'Relógios De Mesa', 'Calendários De Mesa'],
  },
  {
    title: 'Eletrônicos',
    icon: <Monitor size={24} />,
    items: ['Caixas De Som', 'Fones De Ouvido', 'Informática', 'Para Celular', 'Pen Drives', 'Carregadores E Power Banks'],
  },
  {
    title: 'Dia-a-dia',
    icon: <Coffee size={24} />,
    items: ['Squeezes E Garrafas', 'Canecas', 'Copos', 'Xícaras', 'Taças Plásticas', 'Ferramentas', 'Guarda-Chuvas', 'Lanternas E Luminárias', 'Porta Retratos', 'Bolinhas Antistress', 'Canudos Ecológicos', 'Canivetes', 'Relógios De Pulso', 'Sacolas De Papel', 'Chapéus', 'Brindes Diversos'],
  },
  {
    title: 'Confecção',
    icon: <Shirt size={24} />,
    items: ['Ecobag', 'Malas', 'Mochilas', 'Bolsas E Sacolas', 'Bolsas Térmicas', 'Necessaires', 'Pastas E Cases', 'Brindes Em Neoprene', 'Aventais', 'Bonés', 'Camisetas'],
  },
  {
    title: 'Bar e Afins',
    icon: <Wine size={24} />,
    items: ['Bar E Cozinha', 'Kits Caipirinha', 'Kits Churrasco', 'Kits Pizza', 'Queijos E Vinhos', 'Kit Petiscos'],
  },
  {
    title: 'Chaveiros',
    icon: <Key size={24} />,
    items: ['Metal', 'Mosquetão', 'Plástico'],
  },
];

export default function MegaMenu({ isOpen }: { isOpen: boolean }) {
  if (!isOpen) return null;

  return (
    <motion.div 
      className={styles.megaMenu}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="container">
        <div className={styles.grid}>
          {categories.map((cat, idx) => (
            <div key={idx} className={styles.column}>
              <div className={styles.header}>
                <span className={styles.icon}>{cat.icon}</span>
                <h3 className={styles.title}>{cat.title}</h3>
              </div>
              <ul className={styles.itemList}>
                {cat.items.map((item, i) => (
                  <li key={i}>
                    <Link href={`/produtos?cat=${encodeURIComponent(item)}`} className={styles.itemLink}>
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          
          <div className={styles.specialColumn}>
             <div className={styles.specialCard}>
                <Package size={48} />
                <h3>Kits Premium Especiais</h3>
                <Link href="/produtos?cat=kits" className={styles.specialLink}>Ver Opções</Link>
             </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
