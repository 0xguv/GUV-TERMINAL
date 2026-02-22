import React, { useState } from 'react';
import './CommandBar.css';

const CommandBar = () => {
  return (
    <div className="command-bar">
      <form className="command-form">
        <input
          type="text"
          className="command-input"
          autoComplete="off"
          spellCheck="false"
        />
      </form>
    </div>
  );
};

export default CommandBar;
