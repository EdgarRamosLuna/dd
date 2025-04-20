// src/hooks/useCustomModal.ts
import { useState } from 'react';

export const useCustomModal = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalCallback, setModalCallback] = useState<(() => void) | null>(null);
  const [showIcon, setShowIcon] = useState(true);
  const [iconSrc, setIconSrc] = useState('assets/imgs/icoError.png');
  const [buttonText, setButtonText] = useState('OK');

  const showModal = (
    title: string, 
    message: string, 
    callback?: () => void,
    options?: {
      showIcon?: boolean;
      iconSrc?: string;
      buttonText?: string;
    }
  ) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalCallback(callback || null);
    
    if (options) {
      if (options.showIcon !== undefined) setShowIcon(options.showIcon);
      if (options.iconSrc) setIconSrc(options.iconSrc);
      if (options.buttonText) setButtonText(options.buttonText);
    }
    
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    if (modalCallback) {
      setTimeout(() => {
        modalCallback();
      }, 300); // Pequeño retraso para permitir que el modal se cierre primero
    }
  };

  return {
    isModalOpen,
    modalTitle,
    modalMessage,
    showIcon,
    iconSrc,
    buttonText,
    showModal,
    closeModal
  };
};
