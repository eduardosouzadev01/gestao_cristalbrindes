'use client';

import { MessageCircle } from 'lucide-react';
import styles from './WhatsAppFAB.module.css';

export default function WhatsAppFAB() {
  const whatsappUrl = `https://wa.me/5527999586250?text=${encodeURIComponent('Olá! Vim pelo site e gostaria de um orçamento.')}`;

  return (
    <a 
      href={whatsappUrl} 
      target="_blank" 
      rel="noopener noreferrer" 
      className={styles.fab}
      aria-label="Falar no WhatsApp"
    >
      <div className={styles.tooltip}>Posso Ajudar?</div>
      <MessageCircle size={32} />
    </a>
  );
}
