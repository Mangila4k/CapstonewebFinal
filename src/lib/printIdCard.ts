/**
 * Dedicated Utility to print ONLY the Official Student ID Card
 * Guarantees that controls, forms, sidebars, headers, and dashboard tables
 * ("Student ID Control Documents") are NEVER printed.
 */

export function printOfficialStudentId(targetElementIdOrSelector?: string | HTMLElement | null) {
  let targetEl: HTMLElement | null = null;

  if (typeof targetElementIdOrSelector === 'string') {
    targetEl =
      document.getElementById(targetElementIdOrSelector) ||
      document.querySelector(targetElementIdOrSelector);
  } else if (targetElementIdOrSelector instanceof HTMLElement) {
    targetEl = targetElementIdOrSelector;
  }

  // Fallbacks: find the printable ID container or the cards
  if (!targetEl) {
    targetEl = document.querySelector('.printable-id-card-area') as HTMLElement;
  }

  // If still not found, search for front and back cards
  let frontEl = document.getElementById('cardFrontElement') || document.querySelector('.id-card-front');
  let backEl = document.getElementById('cardBackElement') || document.querySelector('.id-card-back');

  // Create clone container
  const printWrapper = document.createElement('div');
  printWrapper.className = 'print-cards-stage';

  if (targetEl) {
    const clone = targetEl.cloneNode(true) as HTMLElement;
    // Remove no-print buttons and controls, but KEEP .card-face-tag (FRONT SIDE / BACK SIDE)
    clone.querySelectorAll('.no-print, button, input, select').forEach((el) => el.remove());
    // Reset transform scale on cloned cards so they print at 100% true physical size
    clone.style.transform = 'none';
    clone.style.transformOrigin = 'initial';
    printWrapper.appendChild(clone);
  } else if (frontEl || backEl) {
    if (frontEl) {
      const unit = document.createElement('div');
      unit.className = 'id-badge-unit';
      const tag = document.createElement('span');
      tag.className = 'card-face-tag';
      tag.textContent = 'FRONT SIDE';
      unit.appendChild(tag);
      const frontClone = frontEl.cloneNode(true) as HTMLElement;
      frontClone.querySelectorAll('.no-print, button').forEach((el) => el.remove());
      unit.appendChild(frontClone);
      printWrapper.appendChild(unit);
    }
    if (backEl) {
      const unit = document.createElement('div');
      unit.className = 'id-badge-unit';
      const tag = document.createElement('span');
      tag.className = 'card-face-tag';
      tag.textContent = 'BACK SIDE';
      unit.appendChild(tag);
      const backClone = backEl.cloneNode(true) as HTMLElement;
      backClone.querySelectorAll('.no-print, button').forEach((el) => el.remove());
      unit.appendChild(backClone);
      printWrapper.appendChild(unit);
    }
  } else {
    // If no card element found at all, fall back to native print
    window.print();
    return;
  }

  // Gather all active stylesheets from document
  let stylesHtml = '';
  document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
    stylesHtml += node.outerHTML;
  });

  // Create hidden iframe for isolated printing
  const iframe = document.createElement('iframe');
  iframe.id = 'officialIdPrintFrame';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  iframe.title = 'Official Student ID Print';

  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) {
    window.print();
    return;
  }

  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>&nbsp;</title>
      ${stylesHtml}
      <style>
        @page {
          size: A4 portrait;
          margin: 10mm 8mm !important;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        html, body {
          margin: 0 !important;
          padding: 8mm 0 !important;
          background: #ffffff !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          width: 100%;
        }
        .print-layout-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 0;
          margin: 0 auto;
        }
        .print-cards-stage {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 16px !important;
          width: 100% !important;
        }
        .printable-id-card-area,
        .id-showcase-container {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 16px !important;
          background: transparent !important;
          border: none !important;
          padding: 0 !important;
          margin: 0 !important;
          transform: none !important;
        }
        .id-badge-unit {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          margin-bottom: 20px !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .card-face-tag {
          display: inline-block !important;
          font-size: 11px !important;
          font-weight: 800 !important;
          text-transform: uppercase !important;
          letter-spacing: 1px !important;
          color: #334155 !important;
          background: #e2e8f0 !important;
          padding: 4px 16px !important;
          border-radius: 20px !important;
          border: none !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08) !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          user-select: none;
        }
        .id-card-scaler {
          width: 500px !important;
          height: 316px !important;
          transform: none !important;
          position: relative !important;
          margin: 0 auto !important;
        }
        .id-card-scaler-inner {
          width: 500px !important;
          height: 316px !important;
          transform: none !important;
          position: static !important;
          margin: 0 auto !important;
          top: auto !important;
          left: auto !important;
        }
        .student-id-card {
          width: 500px !important;
          height: 316px !important;
          border-radius: 16px !important;
          overflow: hidden !important;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.16) !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        .no-print, button, input, select {
          display: none !important;
        }
      </style>
    </head>
    <body>
      <div class="print-layout-container">
        <div class="print-cards-stage">
          ${printWrapper.innerHTML}
        </div>
      </div>
    </body>
    </html>
  `);
  iframeDoc.close();

  // Allow QR Code, Watermark, and Avatar Images to render inside iframe
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.warn('Iframe print error, falling back to window.print():', err);
      window.print();
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2500);
    }
  }, 400);
}
