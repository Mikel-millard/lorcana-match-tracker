import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-xl w-full relative h-[80vh] flex flex-col"> {/* Fixed height, flex column */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl font-bold"
        >
          &times;
        </button>
        {title && <h2 className="text-2xl font-bold text-white mb-6 text-center">{title}</h2>}
        <div className="flex-1 overflow-y-auto"> {/* Scrollable content area */}
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;