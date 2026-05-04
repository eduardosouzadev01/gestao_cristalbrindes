import React from 'react';

export const ISSUERS = [
  { id: 'CRISTAL', label: 'CRISTAL', fullName: 'Cristal Brindes', color: 'blue', cnpj: '08.769.700/0001-57', email: 'cristalbrindes@cristalbrindes.com.br', phone: '(27) 99992-0408', address: 'RUA PORTO ALEGRE, 590 - ALTEROSAS - CEP: 29167-036 - SERRA - ES', logo: '/img/CristalBrindes_logo02.png' },
  { id: 'ESPIRITO', label: 'ESPÍRITO', fullName: 'ESPIRITO BRINDES LTDA', color: 'orange', cnpj: '57.225.892/0001-46', email: 'vendas@espiritobrindes.com.br', phone: '(27) 99992-0408', address: 'RUA PORTO ALEGRE, 590 - ALTEROSAS - CEP: 29167-036 - SERRA - ES', logo: '/img/logo_espiritobrindes.png' },
  { id: 'NATUREZA', label: 'NATUREZA', fullName: 'Natureza Brindes', color: 'emerald', cnpj: '57.225.892/0001-46', email: 'vendas04@naturezabrindes.com.br', phone: '(27) 9995-47137', address: 'R. Porto Alegre, 590 - casa 02 - Alterosas, Serra - ES, 29167-036', logo: '/img/logo_naturezabrindes.png' },
] as const;

export const ISSUER_INFO = ISSUERS.reduce((acc, issuer) => {
    acc[issuer.id] = {
        name: issuer.fullName,
        cnpj: issuer.cnpj,
        email: issuer.email,
        phone: issuer.phone,
        address: issuer.address,
        logo: issuer.logo
    };
    return acc;
}, {} as Record<string, any>);

export type IssuerType = typeof ISSUERS[number]['id'];

interface IssuerSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  includeAll?: boolean;
  allLabel?: string;
}

export const IssuerSelect: React.FC<IssuerSelectProps> = ({ 
  value, 
  onChange, 
  className = "w-full px-2 border border-gray-300 rounded-md h-8 text-[10px] font-medium uppercase tracking-widest bg-white",
  includeAll = false,
  allLabel = "TODOS EMISSORES"
}) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    >
      {includeAll && <option value="ALL">{allLabel}</option>}
      {ISSUERS.map(issuer => (
        <option key={issuer.id} value={issuer.id}>
          {issuer.label}
        </option>
      ))}
    </select>
  );
};
