/**
 * Modal Keyboard Trap Utility
 * Implements focus trapping for accessible modal dialogs
 * Prevents tab navigation from escaping the modal
 */

class ModalKeyboardTrap {
  constructor() {
    this.activeModal = null;
    this.focusableElements = [];
    this.firstFocusable = null;
    this.lastFocusable = null;
  }

  /**
   * Enable keyboard trap for a modal
   * @param {HTMLElement} modal - The modal element
   */
  enableTrap(modal) {
    if (!modal) return;

    this.activeModal = modal;

    // Get all focusable elements within modal
    this.focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (this.focusableElements.length === 0) return;

    this.firstFocusable = this.focusableElements[0];
    this.lastFocusable = this.focusableElements[this.focusableElements.length - 1];

    // Add event listener for Tab key
    modal.addEventListener('keydown', this.handleKeyDown.bind(this));

    // Focus first element
    setTimeout(() => {
      this.firstFocusable?.focus();
    }, 100);
  }

  /**
   * Disable keyboard trap
   */
  disableTrap() {
    if (this.activeModal) {
      this.activeModal.removeEventListener('keydown', this.handleKeyDown.bind(this));
      this.activeModal = null;
      this.focusableElements = [];
      this.firstFocusable = null;
      this.lastFocusable = null;
    }
  }

  /**
   * Handle keydown events for focus trapping
   * @param {KeyboardEvent} e
   */
  handleKeyDown(e) {
    if (e.key !== 'Tab') return;

    // If shift + tab (backwards)
    if (e.shiftKey) {
      if (document.activeElement === this.firstFocusable) {
        e.preventDefault();
        this.lastFocusable?.focus();
      }
    }
    // If tab (forwards)
    else {
      if (document.activeElement === this.lastFocusable) {
        e.preventDefault();
        this.firstFocusable?.focus();
      }
    }
  }

  /**
   * Add escape key handler to close modal
   * @param {HTMLElement} modal - The modal element
   * @param {Function} closeCallback - Function to call when Escape is pressed
   */
  addEscapeHandler(modal, closeCallback) {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && modal.style.display !== 'none') {
        closeCallback();
      }
    };

    document.addEventListener('keydown', handleEscape);

    // Return cleanup function
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }
}

// Export singleton instance
const modalKeyboardTrap = new ModalKeyboardTrap();
export default modalKeyboardTrap;
