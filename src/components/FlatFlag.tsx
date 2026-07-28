'use client';

import React from 'react';
import 'flag-icons/css/flag-icons.min.css';

interface FlatFlagProps {
  countryCode?: string;
  className?: string;
}

export default function FlatFlag({ countryCode = 'pe', className = '' }: FlatFlagProps) {
  return (
    <span 
      className={`fi fi-${countryCode.toLowerCase()} inline-block rounded shadow-sm ${className}`}
      style={{ width: '48px', height: '36px', backgroundSize: 'cover' }}
    />
  );
}
