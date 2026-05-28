import React, { useState } from 'react';
import { X, Calendar } from 'lucide-react';

const ExportConfigModal = ({ isOpen, onClose, onGenerate }) => {
  const [rangeType, setRangeType] = useState('week');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content panel pop-in" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          border: '1px solid rgba(14, 165, 233, 0.3)', 
          boxShadow: '0 0 30px rgba(14, 165, 233, 0.1)',
          maxWidth: '450px'
        }}
      >
        <button className="close-btn" onClick={onClose} aria-label="Close">
          <X size={24} />
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <Calendar size={28} color="#0ea5e9" />
          <h2 className="glitch-title" style={{ fontSize: '1.5rem', color: '#0ea5e9', margin: 0, textShadow: '0 0 10px rgba(14, 165, 233, 0.3)' }}>
            Export Configuration
          </h2>
        </div>

        <div className="modal-text mb-4" style={{ color: '#94a3b8' }}>
          Select a date range to compile the historical telemetry report.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', margi