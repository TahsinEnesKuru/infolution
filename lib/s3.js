// lib/s3.js
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.NEXT_PUBLIC_AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.AWS_BUCKET_NAME;
const DB_FILE = "experiments.json";

const streamToString = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });

// Tüm veriyi okur
export async function getData() {
  try {
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: DB_FILE });
    const response = await s3Client.send(command);
    const data = await streamToString(response.Body);
    return JSON.parse(data);
  } catch (error) {
    if (error.name === 'NoSuchKey' || error.Code === 'NoSuchKey') return [];
    throw error;
  }
}

// Tüm veriyi yazar (Private helper)
async function saveData(data) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: DB_FILE,
    Body: JSON.stringify(data, null, 2), // Okunabilir olsun diye indent ekledim
    ContentType: "application/json",
  });
  await s3Client.send(command);
}

// 1. Yeni Deney Başlatma (START)
export async function createNewExperiment(experimentName, rootImageUrl) {
  const currentData = await getData();
  
  const newExperiment = {
    id: Date.now().toString(), // Benzersiz ID (Frontend'de seçim için lazım)
    experiment_name: experimentName,
    created_at: new Date().toISOString(),
    images: [
      {
        url: rootImageUrl,
        source: null, // İlk resim olduğu için null
        prompt: null  // İlk resim olduğu için null
      }
    ]
  };

  currentData.push(newExperiment);
  await saveData(currentData);
  return newExperiment;
}

// 2. Var Olan Deneye Ekleme Yapma (JOIN -> GENERATE)
export async function addStepToExperiment(experimentId, newImageUrl, sourceIndex, userPrompt) {
  const currentData = await getData();
  
  // İlgili deneyi bul
  const experiment = currentData.find(exp => exp.id === experimentId);
  if (!experiment) throw new Error("Deney bulunamadı");

  // Yeni görseli images array'ine ekle
  const newImageEntry = {
    url: newImageUrl,
    source: sourceIndex, // Hangi indexteki resme bakıp bunu çizdi?
    prompt: userPrompt
  };

  experiment.images.push(newImageEntry);
  
  await saveData(currentData);
  return newImageEntry;
}

// Resim yükleme aynı kalıyor
export async function uploadImage(buffer, filename, contentType) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: filename,
    Body: buffer,
    ContentType: contentType,
  });
  await s3Client.send(command);
  return `https://${BUCKET}.s3.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com/${filename}`;
}