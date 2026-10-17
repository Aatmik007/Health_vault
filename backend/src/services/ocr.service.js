import { createWorker } from 'tesseract.js';
import { exportImages } from 'pdf-export-images';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

/**
 * Non-destructive text cleaning for OCR text.
 * Preserves numbers, decimal points, dates, and medical units.
 * @param {string} rawText 
 * @returns {string} Cleaned text
 */
export const cleanOcrText = (rawText) => {
  if (!rawText || typeof rawText !== 'string') return '';

  return rawText
    // Remove null bytes & non-printable control characters (except newlines/tabs)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize spaces and tabs on the same line to single space
    .replace(/[ \t]+/g, ' ')
    // Remove trailing spaces at line ends
    .replace(/ +$/gm, '')
    // Remove leading spaces at line starts
    .replace(/^ +/gm, '')
    // Replace 3 or more consecutive newlines with max 2 newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

/**
 * Perform Tesseract OCR on a single image buffer or file path
 * @param {Buffer|string} imageBufferOrPath 
 * @returns {Promise<string>} Recognized text
 */
export const performOcrOnImage = async (imageBufferOrPath) => {
  if (!imageBufferOrPath) {
    return '';
  }

  // Safety check: if passed a Buffer, verify it has an image signature, NOT a PDF (%PDF)
  if (Buffer.isBuffer(imageBufferOrPath)) {
    if (imageBufferOrPath.length > 4 && imageBufferOrPath.toString('utf8', 0, 4) === '%PDF') {
      console.warn('[OCR Warning] Cannot perform OCR directly on raw PDF buffer; skipping.');
      return '';
    }
  }

  let worker = null;
  try {
    worker = await createWorker('eng');
    const { data } = await worker.recognize(imageBufferOrPath);
    await worker.terminate();
    worker = null;
    return cleanOcrText(data?.text || '');
  } catch (error) {
    if (worker) {
      try {
        await worker.terminate();
      } catch (e) {
        // ignore termination cleanup error
      }
    }
    console.error('Tesseract OCR error:', error.message);
    return '';
  }
};

/**
 * Perform OCR on a scanned PDF file by extracting image objects page-by-page
 * @param {string} pdfFilePath Path to PDF file on disk
 * @returns {Promise<Array<{ pageNumber: number, text: string }>>}
 */
export const performOcrOnPdf = async (pdfFilePath) => {
  const tempDir = path.resolve('uploads', `ocr_tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

  try {
    if (!fsSync.existsSync(tempDir)) {
      fsSync.mkdirSync(tempDir, { recursive: true });
    }

    const images = await exportImages(pdfFilePath, tempDir);

    if (!images || images.length === 0) {
      return [
        {
          pageNumber: 1,
          text: '[OCR] Scanned PDF did not contain embedded raster image layers.',
        },
      ];
    }

    // Map extracted images page by page
    const pageMap = new Map();

    for (let index = 0; index < images.length; index++) {
      const img = images[index];
      const pageNum = img.pageNumber || (index + 1);

      // Determine file path for extracted image
      let imageFilePath = null;
      if (img.file) {
        imageFilePath = path.isAbsolute(img.file) ? img.file : path.resolve(tempDir, img.file);
      } else if (typeof img === 'string') {
        imageFilePath = path.resolve(tempDir, img);
      }

      if (!imageFilePath || !fsSync.existsSync(imageFilePath)) {
        continue;
      }

      const recognizedText = await performOcrOnImage(imageFilePath);

      if (!pageMap.has(pageNum)) {
        pageMap.set(pageNum, []);
      }
      if (recognizedText) {
        pageMap.get(pageNum).push(recognizedText);
      }

      // Clean up individual temporary image file
      try {
        await fs.unlink(imageFilePath);
      } catch (err) {
        // ignore individual unlink error
      }
    }

    const pages = [];
    const sortedPageNums = Array.from(pageMap.keys()).sort((a, b) => a - b);

    for (const pageNum of sortedPageNums) {
      const texts = pageMap.get(pageNum);
      const combinedText = cleanOcrText(texts.join('\n\n'));
      pages.push({
        pageNumber: pageNum,
        text: combinedText || `[OCR Page ${pageNum}] No text recognized.`,
      });
    }

    if (pages.length === 0) {
      pages.push({
        pageNumber: 1,
        text: '[OCR PDF] Document processed but no text was recognized on any page.',
      });
    }

    return pages;
  } catch (error) {
    console.error('OCR PDF processing error:', error.message);
    return [
      {
        pageNumber: 1,
        text: `[OCR Fallback] Text extraction could not be completed: ${error.message}`,
      },
    ];
  } finally {
    // Clean up temporary folder
    try {
      if (fsSync.existsSync(tempDir)) {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    } catch (cleanupErr) {
      console.warn('Temporary OCR directory cleanup warning:', cleanupErr.message);
    }
  }
};
