'use client';

import { motion } from 'framer-motion';
import { Target, Users, Award, Briefcase } from 'lucide-react';
import styles from './Sobre.module.css';

export default function SobrePage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className="container">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={styles.heroContent}
          >
            <h1 className="heading-xl">Nossa História</h1>
            <p className={styles.heroSubtitle}>
              Líderes em soluções de brindes corporativos que conectam marcas e pessoas.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container">
          <div className={styles.grid}>
            <div className={styles.textContent}>
              <h2 className="heading-lg">Quem Somos</h2>
              <p>
                A <strong>Cristal Brindes</strong> nasceu com o propósito de elevar o padrão do mercado de brindes promocionais. Não entregamos apenas objetos; entregamos ferramentas de marketing poderosas que fortalecem a identidade da sua marca no dia a dia dos seus clientes e colaboradores.
              </p>
              <p>
                Com anos de experiência e milhares de projetos entregues, nos especializamos em curadoria de produtos premium, sustentabilidade e tecnologia aplicada a brindes.
              </p>
            </div>
            
            <div className={styles.stats}>
              <div className={styles.statCard}>
                <Users size={32} />
                <h3>5.000+</h3>
                <p>Clientes Atendidos</p>
              </div>
              <div className={styles.statCard}>
                <Briefcase size={32} />
                <h3>15.000+</h3>
                <p>Produtos no Catálogo</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.valuesSection}>
        <div className="container">
          <h2 className="heading-lg text-center" style={{ textAlign: 'center', marginBottom: '3rem' }}>Nossos Valores</h2>
          <div className={styles.valuesGrid}>
            <div className={styles.valueCard}>
              <Award className={styles.valueIcon} />
              <h3>Qualidade Impecável</h3>
              <p>Trabalhamos apenas com os melhores fornecedores e processos de gravação.</p>
            </div>
            <div className={styles.valueCard}>
              <Target className={styles.valueIcon} />
              <h3>Foco no Cliente</h3>
              <p>Cada projeto é único e tratado com máxima dedicação por nossos consultores.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
