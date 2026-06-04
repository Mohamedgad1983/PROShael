/**
 * Jest setup for testing
 * Imports jest-dom matchers for testing library
 */

import '@testing-library/jest-dom';

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: jest.fn(function getContext(this: HTMLCanvasElement) {
    return {
      arc: jest.fn(),
      beginPath: jest.fn(),
      bezierCurveTo: jest.fn(),
      canvas: this,
      clearRect: jest.fn(),
      clip: jest.fn(),
      closePath: jest.fn(),
      createImageData: jest.fn(() => []),
      createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
      createPattern: jest.fn(),
      createRadialGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
      drawImage: jest.fn(),
      fill: jest.fn(),
      fillRect: jest.fn(),
      fillText: jest.fn(),
      getImageData: jest.fn(() => ({ data: [] })),
      getLineDash: jest.fn(() => []),
      lineTo: jest.fn(),
      measureText: jest.fn(() => ({ width: 0 })),
      moveTo: jest.fn(),
      putImageData: jest.fn(),
      quadraticCurveTo: jest.fn(),
      rect: jest.fn(),
      resetTransform: jest.fn(),
      restore: jest.fn(),
      rotate: jest.fn(),
      save: jest.fn(),
      scale: jest.fn(),
      setLineDash: jest.fn(),
      setTransform: jest.fn(),
      stroke: jest.fn(),
      strokeRect: jest.fn(),
      strokeText: jest.fn(),
      transform: jest.fn(),
      translate: jest.fn(),
    };
  }),
});
