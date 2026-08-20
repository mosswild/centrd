import React from 'react';

export default function AppLogo({ size = 24, style = {}, className = '' }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 100 100" 
      width={size} 
      height={size}
      style={{ display: 'inline-block', verticalAlign: 'middle', borderRadius: '50%', flexShrink: 0, ...style }}
      className={className}
    >
      <circle cx="50" cy="50" r="46" fill="#c96f53" />
      <path d="M 75 32 A 30 30 0 1 0 75 68" fill="none" stroke="#fbf9f6" strokeWidth="8" strokeLinecap="round" />
      <path d="M 67 38 A 20 20 0 1 0 67 62" fill="none" stroke="#fbf9f6" strokeWidth="5" strokeLinecap="round" opacity="0.6" />
      <circle cx="79" cy="50" r="14" fill="#e6c594" stroke="#c96f53" strokeWidth="2" />
    </svg>
  );
}
