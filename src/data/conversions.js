export const fileCategories = [
  { id: 'all', label: 'All Types' },
  { id: 'pdf', label: 'PDF' },
  { id: 'word', label: 'Word' },
  { id: 'excel', label: 'Excel' },
  { id: 'powerpoint', label: 'PowerPoint' },
  { id: 'image', label: 'Image' },
  { id: 'audio', label: 'Audio' },
  { id: 'video', label: 'Video' },
]

export const conversionAvailability = {
  supported: 'supported',
  limited: 'limited',
  comingSoon: 'coming-soon',
}

const LIMITED_PDF_TO_WORD_WARNING =
  'This conversion works best for simple text-based PDFs. Complex or scanned files may fail.'

export const conversionCatalog = [
  {
    id: 'pdf-word',
    category: 'pdf',
    from: 'PDF',
    to: 'Word',
    description: 'Turn static PDFs into editable DOCX documents.',
    accepts: '.pdf',
    outputExtension: 'docx',
    availability: conversionAvailability.limited,
    limitedWarning: LIMITED_PDF_TO_WORD_WARNING,
  },
  {
    id: 'pdf-png',
    category: 'pdf',
    from: 'PDF',
    to: 'PNG',
    description: 'Export each page as a clean, high-quality image.',
    accepts: '.pdf',
    outputExtension: 'png',
    availability: conversionAvailability.comingSoon,
  },
  {
    id: 'word-pdf',
    category: 'word',
    from: 'Word',
    to: 'PDF',
    description: 'Preserve typography and spacing for easy sharing.',
    accepts: '.docx',
    outputExtension: 'pdf',
    availability: conversionAvailability.supported,
  },
  {
    id: 'word-txt',
    category: 'word',
    from: 'Word',
    to: 'TXT',
    description: 'Extract plain text from Word documents quickly.',
    accepts: '.doc,.docx',
    outputExtension: 'txt',
    availability: conversionAvailability.comingSoon,
  },
  {
    id: 'excel-pdf',
    category: 'excel',
    from: 'Excel',
    to: 'PDF',
    description: 'Convert spreadsheets into shareable, print-ready documents.',
    accepts: '.xlsx',
    outputExtension: 'pdf',
    availability: conversionAvailability.supported,
  },
  {
    id: 'powerpoint-pdf',
    category: 'powerpoint',
    from: 'PowerPoint',
    to: 'PDF',
    description: 'Publish slide decks as consistent, portable PDF files.',
    accepts: '.pptx',
    outputExtension: 'pdf',
    availability: conversionAvailability.supported,
  },
  {
    id: 'image-pdf',
    category: 'image',
    from: 'Image',
    to: 'PDF',
    description: 'Combine images into a polished, print-ready PDF.',
    accepts: '.jpg,.jpeg,.png,.webp',
    outputExtension: 'pdf',
    availability: conversionAvailability.comingSoon,
  },
  {
    id: 'image-webp',
    category: 'image',
    from: 'Image',
    to: 'WEBP',
    description: 'Compress visuals for the web with modern format output.',
    accepts: '.jpg,.jpeg,.png',
    outputExtension: 'webp',
    availability: conversionAvailability.comingSoon,
  },
  {
    id: 'audio-mp3',
    category: 'audio',
    from: 'Audio',
    to: 'MP3',
    description: 'Create lightweight audio optimized for streaming.',
    accepts: '.wav,.aac,.ogg',
    outputExtension: 'mp3',
    availability: conversionAvailability.comingSoon,
  },
  {
    id: 'audio-wav',
    category: 'audio',
    from: 'Audio',
    to: 'WAV',
    description: 'Convert compressed tracks into lossless waveform audio.',
    accepts: '.mp3,.m4a,.ogg',
    outputExtension: 'wav',
    availability: conversionAvailability.comingSoon,
  },
  {
    id: 'video-mp4',
    category: 'video',
    from: 'Video',
    to: 'MP4',
    description: 'Standardize uploads for broad device playback.',
    accepts: '.mov,.mkv,.webm',
    outputExtension: 'mp4',
    availability: conversionAvailability.comingSoon,
  },
  {
    id: 'video-gif',
    category: 'video',
    from: 'Video',
    to: 'GIF',
    description: 'Clip moments into lightweight looped animations.',
    accepts: '.mp4,.mov,.webm',
    outputExtension: 'gif',
    availability: conversionAvailability.comingSoon,
  },
]

export const isSupportedConversion = (conversion) =>
  conversion?.availability === conversionAvailability.supported

export const isLimitedConversion = (conversion) =>
  conversion?.availability === conversionAvailability.limited

export const isInteractiveConversion = (conversion) =>
  isSupportedConversion(conversion) || isLimitedConversion(conversion)
