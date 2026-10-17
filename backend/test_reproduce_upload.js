import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from './src/models/User.js';
import Document from './src/models/Document.js';

dotenv.config();

const API_BASE = 'http://localhost:5000/api';

async function reproduce() {
  console.log('--- REPRODUCING UPLOAD FAILURE ---');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/healthvault');

  // 1. Ensure a verified test user exists
  const testEmail = 'doctor_test_repro@healthvault.local';
  let user = await User.findOne({ email: testEmail });
  if (!user) {
    user = await User.create({
      name: 'Dr. Repro Tester',
      email: testEmail,
      password: 'StrongPassword123!',
      emailVerified: true,
    });
  } else {
    user.emailVerified = true;
    await user.save();
  }

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'healthvault_jwt_secret_dev_key_2026', {
    expiresIn: '1h',
  });

  // 2. Create a minimal valid PDF
  // Standard minimal PDF 1.4 syntax
  const minimalPdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 53 >>
stream
BT
/F1 12 Tf
100 700 Td
(HealthVault Diagnostic Lab Test Report Result Normal) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000234 00000 n 
0000000338 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
412
%%EOF`;

  const tempPdfPath = path.resolve('test_sample.pdf');
  fs.writeFileSync(tempPdfPath, minimalPdf);

  console.log('Test PDF created at:', tempPdfPath);

  // 3. Check upload directory before upload
  const uploadsDir = path.resolve('uploads');
  const filesBefore = fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : [];
  console.log(`Files in uploads/ before: ${filesBefore.length}`);

  const docsBefore = await Document.countDocuments({ userId: user._id });
  console.log(`Documents in MongoDB for user before: ${docsBefore}`);

  // 4. Send upload request mimicking frontend FormData
  const formData = new FormData();
  const fileBlob = new Blob([fs.readFileSync(tempPdfPath)], { type: 'application/pdf' });
  formData.append('file', fileBlob, 'test_sample.pdf');
  formData.append('documentType', 'Lab Report');
  formData.append('documentDate', new Date().toISOString().split('T')[0]);

  console.log('\nSending POST request to:', `${API_BASE}/documents`);
  
  try {
    const res = await fetch(`${API_BASE}/documents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    console.log(`Actual HTTP Status: ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.log('Actual Response Body:', text);

    // 5. Check if physical file was saved
    const filesAfter = fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : [];
    console.log(`Files in uploads/ after: ${filesAfter.length}`);
    const newFiles = filesAfter.filter((f) => !filesBefore.includes(f));
    console.log('New files on disk:', newFiles);

    // 6. Check if MongoDB Document record was created
    const docsAfter = await Document.find({ userId: user._id }).sort({ createdAt: -1 });
    console.log(`Documents in MongoDB for user after: ${docsAfter.length}`);
    if (docsAfter.length > docsBefore) {
      console.log('Latest Document in DB:', {
        id: docsAfter[0]._id,
        originalName: docsAfter[0].originalName,
        filePath: docsAfter[0].filePath,
        extractionStatus: docsAfter[0].extractionStatus,
        chunkingStatus: docsAfter[0].chunkingStatus,
        embeddingStatus: docsAfter[0].embeddingStatus,
        vectorStatus: docsAfter[0].vectorStatus,
      });
    }
  } catch (err) {
    console.error('Fetch error:', err);
  } finally {
    if (fs.existsSync(tempPdfPath)) {
      fs.unlinkSync(tempPdfPath);
    }
    await mongoose.disconnect();
  }
}

reproduce();
