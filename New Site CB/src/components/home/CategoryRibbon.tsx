import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import styles from './CategoryRibbon.module.css';

interface CategoryRibbonProps {
  title: string;
  subtitle?: string;
  theme: 'primary' | 'secondary' | 'dark' | 'light';
  link: string;
}

export default function CategoryRibbon({ title, subtitle, theme, link }: CategoryRibbonProps) {
  return (
    <div className={`${styles.ribbon} ${styles[theme]}`}>
      <div className="container">
        <div className={styles.content}>
          <div className={styles.text}>
            <h2 className={styles.title}>{title}</h2>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          <Link href={link} className={styles.cta}>
            Ver Coleção <ArrowRight size={20} />
          </Link>
        </div>
      </div>
    </div>
  );
}
