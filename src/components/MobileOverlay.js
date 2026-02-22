import React from 'react';
import './MobileOverlay.css';

const MobileOverlay = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="mobile-overlay" onClick={onClose}>
      <div className="mobile-overlay-content" onClick={(e) => e.stopPropagation()}>
        <div className="mobile-overlay-header">
          <span className="mobile-overlay-title">{title}</span>
          <button className="mobile-overlay-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="mobile-overlay-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default MobileOverlay;
