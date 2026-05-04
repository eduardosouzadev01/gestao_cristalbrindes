import Link from 'next/link';
import Image from 'next/image';
import { Mail, Phone, MapPin, MessageCircle } from 'lucide-react';
import styles from './Footer.module.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.footerGrid}>
          {/* Company Info */}
          <div className={styles.col}>
            <div className={styles.logo}>
              <Image 
                src="/logo.png" 
                alt="Cristal Brindes" 
                width={200} 
                height={60} 
                className={styles.logoImg}
              />
            </div>
            <p className={styles.description}>
              Os melhores produtos, você encontra aqui!<br />
              Brindes para qualquer tipo de ação.
            </p>
          </div>

          {/* Contact */}
          <div className={styles.col}>
            <h3 className={styles.title}>Contato</h3>
            <ul className={styles.contactList}>
              <li className={styles.contactItem}>
                <p>Rua Ibitirama, 265</p>
                <p>Praia de Itaparica Vila - Velha - ES</p>
              </li>
              <li className={styles.contactItem}>
                <div className={styles.iconGroup}>
                  <Phone size={16} />
                  <MessageCircle size={16} />
                  <span>27 99659-3641</span>
                </div>
              </li>
              <li className={styles.contactItem}>
                <div className={styles.iconGroup}>
                  <Mail size={16} />
                  <span>vendas@cristalbrindes.com.br</span>
                </div>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div className={styles.col}>
            <h3 className={styles.title}>Links Rápidos</h3>
            <ul className={styles.links}>
              <li><Link href="/">Home</Link></li>
              <li><Link href="/produtos">Todos os produtos</Link></li>
              <li><Link href="/politica-de-privacidade">Política de privacidade</Link></li>
              <li><Link href="/contato" className={styles.boldLink}>Fale Conosco</Link></li>
            </ul>
          </div>
        </div>
      </div>

      <div className={styles.bottomBar}>
        <div className="container">
          <p className={styles.copyright}>
            Copyright © {currentYear}. TODOS OS DIREITOS RESERVADOS. Todo o conteúdo do site, todas as fotos, imagens, dizeres, som, software, conjunto imagem, layout, aqui veiculados são de propriedade exclusiva da Cristal Brindes.
          </p>
          <p className={styles.developer}>
            Este site foi desenvolvido e é administrado pela <strong>Antigravity</strong>
          </p>
        </div>
      </div>
    </footer>
  );
}
