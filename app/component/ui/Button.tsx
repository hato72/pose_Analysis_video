import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', ...props }) => {
  const baseStyles = 'px-4 py-2 font-bold text-white rounded';
  const variantStyles = variant === 'primary' ? 'bg-blue-500' : 'bg-gray-500';

  return <button className={`${baseStyles} ${variantStyles}`} {...props} />;
};
