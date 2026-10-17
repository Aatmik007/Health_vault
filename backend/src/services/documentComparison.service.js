/**
 * Deterministic helper to extract medical metrics and key-value lines from extracted document text
 * @param {Array<{ pageNumber: number, text: string }>} extractedText 
 * @returns {Array<{ metricName: string, value: string, pageNumber: number, rawLine: string }>}
 */
export const extractMedicalMetrics = (extractedText) => {
  if (!extractedText || !Array.isArray(extractedText)) return [];

  const metrics = [];
  const seenMetrics = new Set();

  // Common medical test keywords regex (case-insensitive)
  const metricPattern = /(Hemoglobin|HGB|WBC|White Blood Cell|RBC|Red Blood Cell|Platelets|Platelet Count|Hematocrit|HCT|Glucose|Fasting Blood Sugar|HbA1c|Blood Pressure|BP|Cholesterol|Triglycerides|HDL|LDL|TSH|Thyroid|Creatinine|Urea|BUN|Sodium|Potassium|Calcium|Bilirubin|AST|SGOT|ALT|SGPT|Vitamin D|Vitamin B12|Heart Rate|Pulse|SpO2|Respiration Rate)/i;

  // General Key: Value pattern
  const keyValuePattern = /^([A-Z0-9\s/_\-()]{2,40})[:=]\s*([0-9.\-\/\s]+[a-zA-Z%µ/]*.*)$/i;

  for (const pageObj of extractedText) {
    const pageNum = pageObj.pageNumber || 1;
    const lines = (pageObj.text || '').split('\n');

    for (let line of lines) {
      line = line.trim();
      if (!line || line.length < 3 || line.length > 120) continue;

      // Check key: value format
      const kvMatch = line.match(keyValuePattern);
      if (kvMatch) {
        const key = kvMatch[1].trim();
        const val = kvMatch[2].trim();
        const keyLower = key.toLowerCase();

        if (key.length >= 2 && !seenMetrics.has(keyLower)) {
          seenMetrics.add(keyLower);
          metrics.push({
            metricName: key,
            value: val,
            pageNumber: pageNum,
            rawLine: line,
          });
          continue;
        }
      }

      // Check standard medical test keywords
      const keywordMatch = line.match(metricPattern);
      if (keywordMatch) {
        const matchedKey = keywordMatch[0].trim();
        const keyLower = matchedKey.toLowerCase();

        if (!seenMetrics.has(keyLower)) {
          seenMetrics.add(keyLower);
          metrics.push({
            metricName: matchedKey,
            value: line,
            pageNumber: pageNum,
            rawLine: line,
          });
        }
      }
    }
  }

  return metrics;
};

/**
 * Compare two authorized documents side-by-side without diagnostic claims
 * @param {Object} docA Authorized Document Mongoose document
 * @param {Object} docB Authorized Document Mongoose document
 * @returns {Object} Structured comparison result
 */
export const compareDocuments = (docA, docB) => {
  const metricsA = extractMedicalMetrics(docA.extractedText);
  const metricsB = extractMedicalMetrics(docB.extractedText);

  const metricsBMap = new Map();
  metricsB.forEach((m) => {
    metricsBMap.set(m.metricName.toLowerCase(), m);
  });

  const commonValues = [];
  const reportAOnly = [];
  const matchedInBKeys = new Set();

  for (const itemA of metricsA) {
    const keyLower = itemA.metricName.toLowerCase();
    if (metricsBMap.has(keyLower)) {
      const itemB = metricsBMap.get(keyLower);
      matchedInBKeys.add(keyLower);
      commonValues.push({
        metricName: itemA.metricName,
        valueA: itemA.value,
        pageA: itemA.pageNumber,
        valueB: itemB.value,
        pageB: itemB.pageNumber,
      });
    } else {
      reportAOnly.push({
        metricName: itemA.metricName,
        value: itemA.value,
        pageNumber: itemA.pageNumber,
        rawLine: itemA.rawLine,
      });
    }
  }

  const reportBOnly = [];
  for (const itemB of metricsB) {
    const keyLower = itemB.metricName.toLowerCase();
    if (!matchedInBKeys.has(keyLower)) {
      reportBOnly.push({
        metricName: itemB.metricName,
        value: itemB.value,
        pageNumber: itemB.pageNumber,
        rawLine: itemB.rawLine,
      });
    }
  }

  return {
    reportA: {
      documentId: docA._id,
      documentName: docA.originalName,
      documentType: docA.documentType,
      documentDate: docA.documentDate,
      pageCount: docA.extractedText?.length || 0,
    },
    reportB: {
      documentId: docB._id,
      documentName: docB.originalName,
      documentType: docB.documentType,
      documentDate: docB.documentDate,
      pageCount: docB.extractedText?.length || 0,
    },
    comparison: {
      commonValuesCount: commonValues.length,
      reportAOnlyCount: reportAOnly.length,
      reportBOnlyCount: reportBOnly.length,
      commonValues,
      reportAOnly,
      reportBOnly,
    },
  };
};
