// app/api/experiment/route.js

import { NextResponse } from 'next/server';
import { getData, createNewExperiment, addStepToExperiment, uploadImage } from '@/lib/s3';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const experimentId = searchParams.get('id');
    const mode = searchParams.get('mode'); 
    
    // fetch all data from S3
    const data = await getData();

    // --- KONTROL SIRASI ÇOK ÖNEMLİ ---

    // if we want all data (for graph)
    if (mode === 'all') {
      return NextResponse.json(data);
    }

    // if no id provided, return list of experiments
    // join experiment list use this
    if (!experimentId) {
      const list = data.map(exp => ({
        id: exp.id,
        name: exp.experiment_name,
        count: exp.images ? exp.images.length : 0
      }));
      return NextResponse.json(list);
    }

    // this is for users joining an existing experiment
    const experiment = data.find(exp => exp.id === experimentId);
    if (!experiment) return NextResponse.json({ error: "Deney bulunamadı" }, { status: 404 });

    // We select a random image for new users joining the experiment
    const randomIndex = Math.floor(Math.random() * experiment.images.length);
    const selectedImage = experiment.images[randomIndex];

    return NextResponse.json({
      experiment_id: experiment.id,
      image_data: selectedImage,
      index: randomIndex
    });

  } catch (error) {
    console.error("API GET Hatası:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
    try {
    const formData = await req.formData();
    const type = formData.get('type'); 

    if (type === 'start') {
      const file = formData.get('file');
      const name = formData.get('name') || `Experiment ${new Date().toLocaleTimeString()}`; 
      const buffer = Buffer.from(await file.arrayBuffer());
      const filename = `uploads/${uuidv4()}-${file.name}`;
      const imageUrl = await uploadImage(buffer, filename, file.type);
      const newExp = await createNewExperiment(name, imageUrl);
      return NextResponse.json({ success: true, experiment: newExp });
    } 
    else if (type === 'generate') {
      const prompt = formData.get('prompt');
      const experimentId = formData.get('experimentId');
      const sourceIndex = parseInt(formData.get('sourceIndex'));
      const aiResponse = await openai.images.generate({
        model: "dall-e-3", prompt: prompt, n: 1, size: "1024x1024",
      });
      const aiImageUrl = aiResponse.data[0].url;
      const imageRes = await fetch(aiImageUrl);
      const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
      const filename = `generated/${uuidv4()}.png`;
      const s3Url = await uploadImage(imageBuffer, filename, "image/png");
      const entry = await addStepToExperiment(experimentId, s3Url, sourceIndex, prompt);
      return NextResponse.json({ success: true, entry });
    }
    return NextResponse.json({ error: "Invalid operation" }, { status: 400 });
  } catch (error) {

    console.error("API Error:", error);

    // EĞER OPENAI 400 DÖNERSE (Safety Filter Hatası)
    if (error.status === 400) {
      // OpenAI'ın verdiği "Safety filters" mesajını direkt döndür
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Diğer sunucu hataları (500)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}