// Lazy loading configuration for heavy libraries
// This reduces initial bundle size significantly

// Lazy load Chart.js (188KB saved from initial bundle)
export const loadChartJS = () => import(/* webpackChunkName: "chartjs" */ 'chart.js/auto');

// Lazy load PDF generation libraries
export const loadPDFLib = () => import(/* webpackChunkName: "pdf-lib" */ '@pdf-lib/fontkit');

// Lazy load Excel processing
export const loadExcelJS = () => import(/* webpackChunkName: "exceljs" */ 'exceljs');

// Lazy load QR Code generation
export const loadQRCode = () => import(/* webpackChunkName: "qrcode" */ 'qrcode');

// Lazy load moment.js with locales
export const loadMoment = () => import(/* webpackChunkName: "moment" */ 'moment');

// Usage example:
// const { Chart } = await loadChartJS();
// const chart = new Chart(ctx, config);
