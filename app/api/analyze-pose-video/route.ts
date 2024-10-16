import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('video') as Blob;
    const buffer = Buffer.from(await file.arrayBuffer());

    // Ensure the uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Write the file to a temporary location
    const filePath = path.join(uploadsDir, 'captured_video.mp4');
    fs.writeFileSync(filePath, buffer);

    // Create a FormData object to send the video file
    const sendFormData = new FormData();
    sendFormData.append('video', new Blob([buffer]), 'captured_video.mp4');

    // Make a request to the external pose analysis API
    const response = await axios.post('http://localhost:5000/analyze-pose-video', sendFormData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    // Clean up the temporary file
    fs.unlinkSync(filePath);

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error analyzing pose video:', error);
    return NextResponse.json({ error: 'Failed to analyze pose video' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';