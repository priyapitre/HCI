import React, { useState } from 'react';
import axios from 'axios';

function Highlighter() {
  const [inputText, setInputText] = useState('');
  const [highlightedText, setHighlightedText] = useState('');

  const highlightText = () => {
    const selection = window.getSelection();
    const highlighted = selection.toString();

    if (highlighted) {
      axios.post('/highlight', { text: inputText, highlightedText: highlighted })
        .then(response => {
          setHighlightedText(response.data.highlightedText);
        })
        .catch(error => {
          console.error('Error:', error);
        });
    }
  };

  return (
    <div>
      <textarea rows="4" cols="50" value={inputText} onChange={e => setInputText(e.target.value)}></textarea>
      <br />
      <button onClick={highlightText}>Highlight Text</button>
      <br />
      <span>Highlighted text: {highlightedText}</span>
    </div>
  );
}

export default Highlighter;
