const INTRO_MODAL_HIDDEN_CLASS = 'intro-modal-hidden';

function focusPrimaryInput() {
  const addressInput = document.getElementById('address-search');
  if (addressInput) {
    addressInput.focus();
  }
}

export function initIntroPrompt() {
  const modal = document.getElementById('intro-modal');
  const continueButton = modal?.querySelector('[data-intro-continue]');

  if (!modal || !continueButton) {
    return;
  }

  const closeModal = () => {
    if (modal.classList.contains(INTRO_MODAL_HIDDEN_CLASS)) {
      return;
    }

    modal.classList.add(INTRO_MODAL_HIDDEN_CLASS);
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('intro-modal-open');
    document.removeEventListener('keydown', handleKeydown);
    focusPrimaryInput();
  };

  const handleBackdropClick = (event) => {
    if (event.target === modal) {
      closeModal();
    }
  };

  const handleKeydown = (event) => {
    if (event.key === 'Escape') {
      closeModal();
    }
  };

  document.body.classList.add('intro-modal-open');
  modal.removeAttribute('aria-hidden');

  continueButton.addEventListener('click', closeModal);
  modal.addEventListener('click', handleBackdropClick);
  document.addEventListener('keydown', handleKeydown);

  // Provide initial focus for accessibility once the modal paints.
  requestAnimationFrame(() => continueButton.focus());
}
