import { useState } from "react";

// components/ui/UseToast.tsx
export const useToast = () => {
    const [toastMessage, setToastMessage] = useState('');
  
    interface ToastOptions {
      title: string;
      description: string;
      variant?: 'default' | 'destructive';  // オプションで variant を追加
    }
  
    const toast = ({ title, description, variant = 'default' }: ToastOptions) => {
      let variantStyle = '';
      if (variant === 'destructive') {
        variantStyle = 'color: red;';
      }
  
      setToastMessage(`${title}: ${description}`);
      console.log(variantStyle); // ここで variant に基づいたスタイルなどを処理できます。
  
      setTimeout(() => setToastMessage(''), 3000);
    };
  
    return { toast, toastMessage };
  };
  