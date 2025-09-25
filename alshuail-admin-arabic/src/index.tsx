import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/normalize-text.css'; // Import normalize text styles
import App from './App';
import reportWebVitals from './reportWebVitals';
import './styles/force-normal-text.css'; // Force all text to normal weight - loaded last!

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
