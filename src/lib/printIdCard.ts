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
    // Remove face tags and no-print elements from clone
    clone.querySelectorAll('.card-face-tag, .no-print, button').forEach((el) => el.remove());
    // Reset transform scale on cloned cards so they print at 100% true physical size
    clone.style.transform = 'none';
    clone.style.transformOrigin = 'initial';
    printWrapper.appendChild(clone);
  } else if (frontEl || backEl) {
    if (frontEl) {
      const frontClone = frontEl.cloneNode(true) as HTMLElement;
      frontClone.querySelectorAll('.card-face-tag, .no-print, button').forEach((el) => el.remove());
      printWrapper.appendChild(frontClone);
    }
    if (backEl) {
      const backClone = backEl.cloneNode(true) as HTMLElement;
      backClone.querySelectorAll('.card-face-tag, .no-print, button').forEach((el) => el.remove());
      printWrapper.appendChild(backClone);
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
          margin: 0mm !important;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        html, body {
          margin: 0 !important;
          padding: 15mm 10mm !important;
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
        .print-official-header {
          text-align: center;
          margin-bottom: 8mm;
          padding-bottom: 3mm;
          border-bottom: 1px dashed #cbd5e1;
          width: 100%;
          max-width: 540px;
        }
        .print-official-header h2 {
          margin: 0;
          font-size: 13px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #0d1e4a;
        }
        .print-official-header p {
          margin: 2px 0 0;
          font-size: 10px;
          color: #64748b;
          font-weight: 600;
        }
        .print-cards-stage {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 12mm !important;
          width: 100% !important;
        }
        .printable-id-card-area,
        .id-showcase-container {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 12mm !important;
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
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .student-id-card {
          border: 1px dashed #94a3b8 !important; /* Cutting line guide */
          box-shadow: none !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        .card-face-tag, .no-print, button, input, select {
          display: none !important;
        }
        .print-official-footer {
          margin-top: 10mm;
          text-align: center;
          font-size: 9px;
          color: #94a3b8;
          font-weight: 600;
          letter-spacing: 0.5px;
          border-top: 1px dashed #e2e8f0;
          padding-top: 3mm;
          width: 100%;
          max-width: 540px;
        }
      </style>
    </head>
    <body>
      <div class="print-layout-container">
        <div class="print-official-header">
          <h2>Placido L. Señor National High School</h2>
          <p>Official CR80 DepEd Student Identification Card (Front & Back)</p>
        </div>
        <div class="print-cards-stage">
          ${printWrapper.innerHTML}
        </div>
        <div class="print-official-footer">
          Cut along the dashed guide line • CR80 Landscape Standard (85.6mm × 54mm)
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
