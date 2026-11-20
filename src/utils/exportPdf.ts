/**
 * Raw font and layout CSS rules injected into the cloned DOM node during PDF export.
 * Defining these styles as raw CSS strings prevents html-to-image from accessing
 * cross-origin external stylesheets (e.g. Google Fonts), avoiding browser SecurityError.
 */
export const RAW_FONT_CSS = `
  @font-face {
    font-family: 'Public Sans';
    font-style: normal;
    font-weight: 300 800;
    font-display: swap;
    src: local('Public Sans'), local('PublicSans-Regular'), local('Helvetica Neue'), local('sans-serif');
  }

  @font-face {
    font-family: 'Source Serif 4';
    font-style: normal;
    font-weight: 400 800;
    font-display: swap;
    src: local('Source Serif 4'), local('SourceSerif4-Regular'), local('Georgia'), local('serif');
  }

  /* Universal PDF rendering print color and typography safety rules */
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  body, div, p, span, td, th, li, a, button {
    font-family: 'Public Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
  }

  h1, h2, h3, h4, h5, h6, .font-serif, [data-serif] {
    font-family: 'Source Serif 4', Georgia, Cambria, 'Times New Roman', Times, serif !important;
  }

  .tabular-nums {
    font-variant-numeric: tabular-nums !important;
  }

  table {
    border-collapse: collapse !important;
  }

  .no-print {
    display: none !important;
  }
`;

export async function ensureImagesLoadedForPrint(root: HTMLElement | Document = document): Promise<void> {
  const imgs = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    imgs.map(async (img) => {
      try {
        if (!img.complete) {
          await new Promise<void>((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true });
            img.addEventListener('error', () => resolve(), { once: true });
            setTimeout(resolve, 1500);
          });
        }
        if (typeof img.decode === 'function') {
          await img.decode().catch(() => {});
        }
      } catch {
        // Ignore individual image decode failure
      }
    })
  );
}

async function inlineImagesInClone(clone: HTMLElement): Promise<void> {
  const imgs = Array.from(clone.querySelectorAll('img'));
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute('src');
      if (!src || src.startsWith('data:')) return;
      try {
        const res = await fetch(src);
        if (!res.ok) return;
        const blob = await res.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('Failed to read image blob'));
          reader.readAsDataURL(blob);
        });
        img.setAttribute('src', dataUrl);
      } catch (err) {
        console.warn('Could not inline image for PDF:', src, err);
      }
    })
  );
}

export async function exportReportToPDF(
  elementOrId: HTMLElement | string,
  fileName: string = 'OSU_Report.pdf'
): Promise<boolean> {
  let stagingContainer: HTMLDivElement | null = null;
  try {
    const element =
      typeof elementOrId === 'string'
        ? (document.getElementById(elementOrId) as HTMLElement) ||
          (document.querySelector(elementOrId) as HTMLElement)
        : elementOrId;

    if (!element) {
      console.error('Report element not found for PDF generation');
      return false;
    }

    // 1. Explicitly clone the DOM node for isolated styling and rendering
    const clone = element.cloneNode(true) as HTMLElement;

    // 1b. Inline all images (including the OSU logo) as Base64 data URIs so they never drop in PDF capture
    await inlineImagesInClone(clone);

    // 2. Explicitly inject custom CSS styles into the cloned DOM node
    // This avoids SecurityError by defining required font rules locally as raw CSS strings
    const customStyle = document.createElement('style');
    customStyle.setAttribute('data-pdf-custom-fonts', 'true');
    customStyle.textContent = RAW_FONT_CSS;
    clone.prepend(customStyle);

    // 3. Synchronize form controls and inputs from original element to clone
    const originalInputs = element.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea');
    const clonedInputs = clone.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea');
    originalInputs.forEach((orig, idx) => {
      const cloned = clonedInputs[idx];
      if (!cloned) return;
      if (orig instanceof HTMLInputElement && (orig.type === 'checkbox' || orig.type === 'radio')) {
        (cloned as HTMLInputElement).checked = orig.checked;
      } else {
        cloned.value = orig.value;
      }
    });

    // 4. Configure dimensions and position clone in off-screen staging container
    const rect = element.getBoundingClientRect();
    const targetWidth = rect.width > 0 ? rect.width : element.offsetWidth || 1024;
    clone.style.width = `${targetWidth}px`;
    clone.style.maxWidth = `${targetWidth}px`;
    clone.style.margin = '0';
    clone.style.backgroundColor = '#ffffff';

    stagingContainer = document.createElement('div');
    stagingContainer.id = 'pdf-render-staging-container';
    stagingContainer.style.position = 'fixed';
    stagingContainer.style.left = '-99999px';
    stagingContainer.style.top = '0';
    stagingContainer.style.width = `${targetWidth}px`;
    stagingContainer.style.overflow = 'hidden';
    stagingContainer.style.opacity = '1';
    stagingContainer.style.zIndex = '-9999';
    stagingContainer.appendChild(clone);
    document.body.appendChild(stagingContainer);

    await ensureImagesLoadedForPrint(clone);

    const [{ toJpeg, toCanvas }, { default: jsPDF }] = await Promise.all([
      import('html-to-image'),
      import('jspdf')
    ]);

    // 5. Capture snapshot using html-to-image with skipFonts and fontEmbedCSS configured with raw CSS
    const options = {
      quality: 0.95,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      skipFonts: true,
      fontEmbedCSS: RAW_FONT_CSS,
      filter: (node: Node) => {
        if (node instanceof HTMLElement && node.classList.contains('no-print')) {
          return false;
        }
        return true;
      }
    };

    let dataUrl: string;
    try {
      dataUrl = await toJpeg(clone, options);
    } catch (jpegErr) {
      console.warn('Initial toJpeg attempt on cloned node failed, retrying with toCanvas:', jpegErr);
      const canvas = await toCanvas(clone, options);
      dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    }

    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load captured image into DOM'));
      img.src = dataUrl;
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const imgHeight = (img.height * pageWidth) / img.width;

    let heightLeft = imgHeight;
    let position = 0;

    // First page
    pdf.addImage(dataUrl, 'JPEG', 0, position, pageWidth, imgHeight);
    heightLeft -= pageHeight;

    // Subsequent pages if the document overflows A4 length
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(dataUrl, 'JPEG', 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  } finally {
    if (stagingContainer && stagingContainer.parentNode) {
      stagingContainer.parentNode.removeChild(stagingContainer);
    }
  }
}
