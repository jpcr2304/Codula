import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals(console.log);

// import { StrictMode } from "react";
// import { createRoot } from "react-dom/client";
// import { Login } from "./screens/Login";
// import "./index.css";

// createRoot(document.getElementById("app")).render(
//   <StrictMode>
//     <Login />
//   </StrictMode>
// );