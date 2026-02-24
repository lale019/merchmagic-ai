import React from 'react';
import { ProductType } from '../types';
import { Shirt, ShoppingBag, Smartphone, Monitor, GraduationCap, Coffee, Layout } from 'lucide-react';

interface MockupSelectorProps {
  selected: ProductType;
  onSelect: (type: ProductType) => void;
}

const products: { type: ProductType; label: string; icon: React.ReactNode }[] = [
  { type: 't-shirt', label: 'T-Shirt', icon: <Shirt size={20} /> },
  { type: 'hoodie', label: 'Hoodie', icon: <Shirt size={20} /> },
  { type: 'cap', label: 'Cap', icon: <GraduationCap size={20} /> },
  { type: 'tote-bag', label: 'Tote Bag', icon: <ShoppingBag size={20} /> },
  { type: 'mug', label: 'Mug', icon: <Coffee size={20} /> },
  { type: 'phone-case', label: 'Phone Case', icon: <Smartphone size={20} /> },
  { type: 'poster', label: 'Poster', icon: <Layout size={20} /> },
];

export const MockupSelector: React.FC<MockupSelectorProps> = ({ selected, onSelect }) => {
  return (
    <div className="grid grid-cols-4 gap-2">
      {products.map((product) => (
        <button
          key={product.type}
          onClick={() => onSelect(product.type)}
          className={`
            flex flex-col items-center justify-center min-h-[80px] p-2 rounded-[24px] border transition-all duration-300 ripple
            ${selected === product.type 
              ? 'border-m3-primary bg-m3-primary text-white shadow-md shadow-m3-primary/20' 
              : 'border-m3-outline/10 bg-m3-surface-variant/20 text-m3-on-surface-variant hover:border-m3-primary/20'}
          `}
        >
          <div className={`mb-1.5 transition-colors duration-300 ${selected === product.type ? 'text-white' : 'text-m3-on-surface-variant/30'}`}>
            {React.cloneElement(product.icon as React.ReactElement, { 
              size: 18,
              strokeWidth: selected === product.type ? 2.5 : 2
            } as any)}
          </div>
          <span className={`text-[9px] uppercase tracking-wider font-bold transition-colors duration-300 ${selected === product.type ? 'text-white' : 'text-m3-on-surface-variant'}`}>
            {product.label}
          </span>
        </button>
      ))}
    </div>
  );
};
