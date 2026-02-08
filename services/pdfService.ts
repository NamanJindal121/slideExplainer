import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';
import { Slide } from '../types';

// Initialize PDF.js worker
// Using a specific version to ensure compatibility. 
// Ideally this matches the version of pdfjs-dist installed, but since we rely on CDN for worker in this setup:
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// Helper: Run OCR on a list of slides that lack text
export const performOCR = async (slides: Slide[], onProgress: (progress: number) => void): Promise<Slide[]> => {
  const worker = await createWorker('eng');
  const updatedSlides = [...slides];
  let processedCount = 0;

  for (let i = 0; i < updatedSlides.length; i++) {
    const slide = updatedSlides[i];
    
    // Only run OCR if textContent is missing or too short (likely image-only)
    if (!slide.textContent || slide.textContent.length < 50) {
      const { data: { text } } = await worker.recognize(slide.imageUrl);
      updatedSlides[i] = { ...slide, textContent: text };
    }
    
    processedCount++;
    onProgress(Math.round((processedCount / updatedSlides.length) * 100));
  }

  await worker.terminate();
  return updatedSlides;
};

export const processPdf = async (file: File): Promise<Slide[]> => {
  const arrayBuffer = await file.arrayBuffer();
  
  // Load the document
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDocument = await loadingTask.promise;
  const numPages = pdfDocument.numPages;
  const slides: Slide[] = [];

  // We will limit to a reasonable number of pages to avoid browser crash on huge PDFs
  // or implement lazy loading. For this demo, let's process up to 20 pages eagerly 
  // or just process them as images. 
  // Processing 1-by-1 is safer for memory, but let's do parallel with a limit if needed.
  // Actually, for a smooth "Upload" experience, let's generate data URLs now.
  
  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDocument.getPage(i);
    
    // Scale: 1.5 for better quality analysis
    const viewport = page.getViewport({ scale: 1.5 });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Could not create canvas context');
    }

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport,
    } as any).promise;

    const imageUrl = canvas.toDataURL('image/jpeg', 0.8);
    
    // Extract Text (Native PDF Layer)
    const textContentObj = await page.getTextContent();
    const textContent = textContentObj.items
      // @ts-ignore
      .map((item: any) => item.str)
      .join(' ');

    slides.push({
      id: `slide-${i}-${Date.now()}`,
      pageNumber: i,
      imageUrl: imageUrl,
      textContent: textContent || "",
      explanation: null,
      status: 'IDLE',
      customPrompt: "Explain everything in this slide in detail. Break down key points, diagrams, and any text present.",
    });
  }

  return slides;
};