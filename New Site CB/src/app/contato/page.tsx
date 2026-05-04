'use client';

import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import styles from './Contato.module.css';

export default function ContatoPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className="container">
          <h1 className="heading-xl">Fale Conosco</h1>
          <p className={styles.heroSubtitle}>Estamos prontos para transformar sua ideia em realidade.</p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container">
          <div className={styles.grid}>
            <div className={styles.info}>
              <h2 className="heading-lg">Informações de Contato</h2>
              <p className={styles.infoText}>Utilize nossos canais oficiais para atendimento rápido e personalizado.</p>
              
              <div className={styles.contactList}>
                <div className={styles.contactItem}>
                  <Phone className={styles.icon} />
                  <div>
                    <h4>Telefone / WhatsApp</h4>
                    <p>(27) 99958-6250</p>
                  </div>
                </div>
                <div className={styles.contactItem}>
                  <Mail className={styles.icon} />
                  <div>
                    <h4>E-mail</h4>
                    <p>contato@cristalbrindes.com.br</p>
                  </div>
                </div>
                <div className={styles.contactItem}>
                  <MapPin className={styles.icon} />
                  <div>
                    <h4>Localização</h4>
                    <p>Vitória, Espírito Santo - Brasil</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.formContainer}>
              <form className={styles.form}>
                <div className={styles.formGroup}>
                  <label>Nome Completo</label>
                  <input type="text" placeholder="Seu nome aqui..." />
                </div>
                <div className={styles.formGroup}>
                  <label>E-mail Corporativo</label>
                  <input type="email" placeholder="seu@email.com.br" />
                </div>
                <div className={styles.formGroup}>
                  <label>Assunto</label>
                  <select>
                    <option>Orçamento</option>
                    <option>Dúvidas Técnicas</option>
                    <option>Parcerias</option>
                    <option>Outros</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Mensagem</label>
                  <textarea rows={5} placeholder="Como podemos te ajudar?"></textarea>
                </div>
                <button type="button" className="btn btn-primary" style={{ width: '100%' }}>
                  Enviar Mensagem <Send size={18} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
