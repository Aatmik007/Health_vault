import fs from 'fs/promises';
import pdfParse from 'pdf-parse';
import { cleanText } from '../utils/cleanText.js';
import { performOcrOnImage, performOcrOnPdf, cleanOcrText } from './ocr.service.js';

/**
 * Extracts structured page-by-page text from a document file with automatic OCR fallback.
 * 
 * Flow:
 * 1. For Image files (`image/jpeg`, `image/png`, `image/jpg`): direct OCR extraction.
 * 2. For PDF files:
 *    a. Extract text via pdf-parse.
 *    b. Calculate total character count across all pages.
 *    c. If total length >= OCR_MIN_EXTRACTED_CHARACTERS (default 50), use pdf-parse text.
 *    d. If total length < OCR_MIN_EXTRACTED_CHARACTERS, trigger OCR fallback for scanned PDF.
 * 
 * @param {string} filePath Absolute or relative path to file on disk
 * @param {string} mimeType File MIME type
 * @returns {Promise<{ extractedPages: Array<{ pageNumber: number, text: string }>, ocrUsed: boolean, ocrStatus: string, ocrError: string|null }>}
 */
export const extractTextFromDocument = async (filePath, mimeType) => {
  const minCharThreshold = parseInt(process.env.OCR_MIN_EXTRACTED_CHARACTERS || '50', 10);

  // 1. Direct OCR for image files
  if (mimeType && mimeType.startsWith('image/')) {
    try {
      const imageBuffer = await fs.readFile(filePath);
      const ocrText = await performOcrOnImage(imageBuffer);
      
      const pageText = cleanOcrText(ocrText) || '[Image Document] OCR completed but no readable text was detected.';

      return {
        extractedPages: [
          {
            pageNumber: 1,
            text: pageText,
          },
        ],
        ocrUsed: true,
        ocrStatus: 'completed',
        ocrError: null,
      };
    } catch (error) {
      console.error('Image OCR extraction error:', error);
      return {
        extractedPages: [
          {
            pageNumber: 1,
            text: '[Image Document] Failed to extract text via OCR.',
          },
        ],
        ocrUsed: true,
        ocrStatus: 'failed',
        ocrError: error.message,
      };
    }
  }

  // 2. PDF processing with OCR fallback
  if (mimeType === 'application/pdf') {
    let pdfPages = [];
    let pdfExtractError = null;

    try {
      pdfPages = await extractTextFromPDF(filePath);
    } catch (err) {
      pdfExtractError = err.message;
      console.warn('pdf-parse failed, attempting OCR fallback:', err.message);
    }

    const totalChars = pdfPages.reduce((sum, page) => sum + (page.text ? page.text.trim().length : 0), 0);

    // If pdf-parse succeeded and extracted sufficient text (>= threshold)
    if (!pdfExtractError && totalChars >= minCharThreshold) {
      return {
        extractedPages: pdfPages,
        ocrUsed: false,
        ocrStatus: 'not_required',
        ocrError: null,
      };
    }

    // Scanned PDF fallback to OCR
    console.log(`PDF text length (${totalChars} chars) is below threshold (${minCharThreshold} chars). Triggering OCR fallback...`);
    
    try {
      const ocrPages = await performOcrOnPdf(filePath);
      return {
        extractedPages: ocrPages,
        ocrUsed: true,
        ocrStatus: 'completed',
        ocrError: null,
      };
    } catch (ocrError) {
      console.error('PDF OCR fallback error:', ocrError);
      
      // If pdf-parse at least found partial text, return it with warning, else return error page
      if (pdfPages.length > 0 && totalChars > 0) {
        return {
          extractedPages: pdfPages,
          ocrUsed: true,
          ocrStatus: 'failed',
          ocrError: `OCR fallback failed: ${ocrError.message}`,
        };
      }

      return {
        extractedPages: [
          {
            pageNumber: 1,
            text: '[PDF Document] OCR processing failed to extract text from scanned pages.',
          },
        ],
        ocrUsed: true,
        ocrStatus: 'failed',
        ocrError: ocrError.message,
      };
    }
  }

  // 3. Fallback for unsupported file types
  return {
    extractedPages: [
      {
        pageNumber: 1,
        text: cleanText('[Document] Text extraction is not supported for this file type.'),
      },
    ],
    ocrUsed: false,
    ocrStatus: 'not_required',
    ocrError: null,
  };
};

/**
 * Page-by-page PDF text extraction service using pdf-parse custom pagerender
 */
const extractTextFromPDF = async (filePath) => {
  const dataBuffer = await fs.readFile(filePath);
  const pagesData = [];

  const customPageRender = (pageData) => {
    let renderOptions = {
      normalizeWhitespace: false,
      disableCombineTextItems: false,
    };

    return pageData.getTextContent(renderOptions).then((textContent) => {
      let lastY, pageText = '';
      for (let item of textContent.items) {
        if (lastY === item.transform[5] || !lastY) {
          pageText += item.str;
        } else {
          pageText += '\n' + item.str;
        }
        lastY = item.transform[5];
      }

      pagesData.push({
        pageIndex: pageData.pageIndex,
        rawText: pageText,
      });

      return pageText;
    });
  };

  const options = {
    pagerender: customPageRender,
  };

  await pdfParse(dataBuffer, options);

  pagesData.sort((a, b) => a.pageIndex - b.pageIndex);

  return pagesData.map((page, index) => ({
    pageNumber: index + 1,
    text: cleanText(page.rawText),
  }));
};
