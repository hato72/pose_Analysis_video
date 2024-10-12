import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as Blob;
    const buffer = Buffer.from(await file.arrayBuffer());

    // Ensure the uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Write the file to a temporary location
    const filePath = path.join(uploadsDir, 'captured_image.jpg');
    fs.writeFileSync(filePath, buffer);

    // Read the image and convert it to base64
    const imageBuffer = fs.readFileSync(filePath);
    const base64Image = imageBuffer.toString('base64');

    // Make a request to the external pose analysis API
    const response = await axios.post('http://localhost:5000/analyze-pose', {
      image: base64Image,
    });

    // Clean up the temporary file
    fs.unlinkSync(filePath);

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error analyzing pose:', error);
    return NextResponse.json({ error: 'Failed to analyze pose' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';