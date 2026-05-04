'use client';

import { FileText, Truck, ShieldCheck, Users } from 'lucide-react';
import styles from './TrustBadges.module.css';

const badges = [
  {
    title: 'ORÇAMENTO RÁPIDO',
    subtitle: 'EM ATÉ 1 HORA',
    icon: <FileText size={40} />,
  },
  {
    title: 'FRETE GRÁTIS PARA',
    subtitle: 'ESPÍRITO SANTO E CAPITAIS DO SUDESTE',
    icon: <Truck size={40} />,
  },
  {
    title: 'QUALIDADE GARANTIDA',
    subtitle: 'AQUI VOCÊ PODE CONFIAR',
    icon: <ShieldCheck size={40} />,
  },
  {
    title: 'ENTREGA RÁPIDA',
    subtitle: 'MAIS RESPEITO POR VOCÊ',
    icon: <Users size={40} />,
  },
];

export default function TrustBadges() {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.grid}>
          {badges.map((badge, idx) => (
            <div key={idx} className={styles.badge}>
              <div className={styles.icon}>{badge.icon}</div>
              <div className={styles.content}>
                <h3>{badge.title}</h3>
                <p>{badge.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
