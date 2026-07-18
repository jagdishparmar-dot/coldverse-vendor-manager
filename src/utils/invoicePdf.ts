import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read PDF blob."));
    reader.readAsDataURL(blob);
  });
}

/**
 * Render invoice HTML into a PDF (A4) using an offscreen iframe.
 */
export async function generateInvoicePdfBlob(html: string): Promise<Blob> {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = "920px";
  iframe.style.height = "1300px";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument;
    if (!doc) {
      throw new Error("Unable to create PDF render context.");
    }

    doc.open();
    doc.write(html);
    doc.close();

    // Allow layout/fonts to settle
    await new Promise((r) => setTimeout(r, 80));

    const root =
      doc.getElementById("invoice-root") ||
      doc.body.querySelector(".invoice-container") ||
      doc.body;

    const canvas = await html2canvas(root as HTMLElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: 920,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const usableWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * usableWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, "JPEG", margin, position, usableWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;

    while (heightLeft > 0) {
      position = margin - (imgHeight - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", margin, position, usableWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;
    }

    return pdf.output("blob");
  } finally {
    document.body.removeChild(iframe);
  }
}

export async function generateInvoicePdfDataUrl(html: string): Promise<string> {
  const blob = await generateInvoicePdfBlob(html);
  return blobToDataUrl(blob);
}

export function downloadPdfBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
