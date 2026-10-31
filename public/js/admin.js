(() => {
  'use strict';

  // Confirm destructive actions.
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-confirm]');
    if (btn && !window.confirm(btn.dataset.confirm)) e.preventDefault();
  });

  document.querySelectorAll('[data-autosubmit]').forEach((sel) => sel.addEventListener('change', () => sel.form.requestSubmit()));

  // Focus the error summary after a failed save.
  const summary = document.querySelector('[data-error-summary]');
  if (summary) summary.focus();

  // Preview photos before upload.
  document.querySelectorAll('[data-upload-preview]').forEach((input) => {
    const list = input.parentElement.querySelector('[data-preview]');
    input.addEventListener('change', () => {
      list.innerHTML = '';
      Array.from(input.files).forEach((file) => {
        const li = document.createElement('li');
        const img = document.createElement('img');
        img.alt = file.name;
        img.src = URL.createObjectURL(file);
        img.onload = () => URL.revokeObjectURL(img.src);
        li.appendChild(img);
        list.appendChild(li);
      });
    });
  });

  // Keep the save button from being double-clicked during uploads.
  document.querySelectorAll('form.vform').forEach((form) =>
    form.addEventListener('submit', (e) => {
      const btn = e.submitter;
      if (btn && !btn.name) {
        btn.disabled = true;
        btn.textContent = 'שומרים…';
      }
    })
  );
})();
