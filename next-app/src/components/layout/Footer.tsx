import React from 'react';

const Footer: React.FC = () => (
  <footer className="bg-white border-t border-[#EDEBE9] py-4 mt-auto">
    <div className="max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8">
      <p className="text-center text-xs text-[#A19F9D]">
        © {new Date().getFullYear()} Cristal Brindes. Todos os direitos reservados.
      </p>
    </div>
  </footer>
);

export default Footer;
