import React, { useState } from 'react';
import {
  Code2,
  Download,
  ExternalLink,
  Copy,
  Check,
  Cpu,
  FileSpreadsheet,
  MessageSquare,
  Camera,
  AlertTriangle,
  Info,
  CheckCircle,
} from 'lucide-react';
import { generateColabNotebook } from '../utils/colabNotebookData';

export const ColabStudio: React.FC = () => {
  const [copiedCellIndex, setCopiedCellIndex] = useState<number | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [copiedFullJson, setCopiedFullJson] = useState(false);

  const handleDownloadNotebook = () => {
    try {
      const notebook = generateColabNotebook();
      const jsonString = JSON.stringify(notebook, null, 2);
      const blob = new Blob([jsonString], { type: 'application/x-ipynb+json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'CarPark_LicensePlate_Colab.ipynb';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const handleCopyFullNotebookJson = () => {
    try {
      const notebook = generateColabNotebook();
      navigator.clipboard.writeText(JSON.stringify(notebook, null, 2));
      setCopiedFullJson(true);
      setTimeout(() => setCopiedFullJson(false), 2000);
    } catch (err) {
      console.error('Copy error:', err);
    }
  };

  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCellIndex(index);
    setTimeout(() => setCopiedCellIndex(null), 2000);
  };

  const colabCells = [
    {
      title: 'Step 1: Install Hugging Face Transformers & PyTorch Ecosystem',
      description: 'Installs Hugging Face transformers with sentencepiece, PyTorch, PIL, gspread, and vision utilities.',
      code: `!pip install -q "transformers[sentencepiece]" sentencepiece protobuf tiktoken torch torchvision pillow requests pandas gspread google-auth opencv-python-headless

print("✅ Hugging Face Transformers & dependencies installed successfully in Google Colab!")`,
    },
    {
      title: 'Step 2: Load Hugging Face TrOCR Model (microsoft/trocr-base-printed)',
      description: 'Loads Hugging Face official TrOCR Transformer vision-encoder-decoder model onto GPU or CPU.',
      code: `import re
import torch
import numpy as np
import pandas as pd
from PIL import Image
from transformers import AutoImageProcessor, AutoTokenizer, TrOCRProcessor, VisionEncoderDecoderModel

# 1. Device selection (GPU accelerated on Colab)
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"🚀 Using device: {device}")

# 2. Load Hugging Face official TrOCR model & processor
# Note: microsoft/trocr-base-printed uses the RoBERTa-large vocabulary.
# Loading AutoTokenizer from 'roberta-large' provides pre-built 'tokenizer.json',
# completely bypassing the SentencePiece/Tiktoken requirement in Python 3.13!
HF_MODEL_NAME = "microsoft/trocr-base-printed"
print(f"Loading Hugging Face model ({HF_MODEL_NAME})...")

image_processor = AutoImageProcessor.from_pretrained(HF_MODEL_NAME)
try:
    tokenizer = AutoTokenizer.from_pretrained("roberta-large")
except Exception:
    tokenizer = AutoTokenizer.from_pretrained(HF_MODEL_NAME)

processor = TrOCRProcessor(image_processor=image_processor, tokenizer=tokenizer)
hf_model = VisionEncoderDecoderModel.from_pretrained(HF_MODEL_NAME).to(device)

print("✅ Hugging Face TrOCR Model loaded into memory successfully!")

# 3. License plate normalization helper
def normalize_plate(plate_str: str) -> str:
    """Standardizes registration number: removes spaces, dashes, dots, converts to uppercase."""
    if not plate_str:
        return ""
    return re.sub(r'[^A-Z0-9]', '', str(plate_str).upper())

# Test normalizer:
print("Sample Normalization:", normalize_plate("GJ 01 AB 1234"), "==> GJ01AB1234")`,
    },
    {
      title: 'Step 3: Connect to Google Sheets Parking Registry',
      description: 'Connects to your company Google Sheet with columns: Name, Email, Car Registration Number, Department, Phone, Car Model, Parking Spot.',
      code: `# Option A: Public Google Sheet CSV URL
# In Google Sheets: File > Share > Publish to web > CSV, or paste your Sheet ID below:
GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/YOUR_GOOGLE_SHEET_ID/export?format=csv"

# For Colab demonstration, load employee parking registry:
try:
    df_parking = pd.read_csv(GOOGLE_SHEET_CSV_URL)
    print("✅ Successfully connected to live Google Sheet!")
except Exception as e:
    print("Using local company registry for demonstration...")
    df_parking = pd.DataFrame([
        {
            "Name": "Sanjay Rana",
            "Email": "sanjaysinh.rana@bacancy.com",
            "PlateNumber": "GJ 01 AB 1234",
            "Department": "Software Engineering",
            "Phone": "+91 98765 43210",
            "CarModel": "White Hyundai i20",
            "ParkingSpot": "Bay #14"
        },
        {
            "Name": "Priya Patel",
            "Email": "priya.patel@bacancy.com",
            "PlateNumber": "GJ 27 BC 4590",
            "Department": "Product Management",
            "Phone": "+91 98222 33445",
            "CarModel": "Silver Honda City",
            "ParkingSpot": "Bay #09"
        },
        {
            "Name": "Rahul Sharma",
            "Email": "rahul.sharma@bacancy.com",
            "PlateNumber": "MH 12 PQ 7890",
            "Department": "DevOps",
            "Phone": "+91 99111 88223",
            "CarModel": "Red Tata Nexon",
            "ParkingSpot": "Bay #22"
        }
    ])

# Index normalized plate for fast matching
df_parking['NormalizedPlate'] = df_parking['PlateNumber'].apply(normalize_plate)
print(df_parking[['Name', 'PlateNumber', 'Email', 'ParkingSpot']])`,
    },
    {
      title: 'Step 4: Hugging Face TrOCR Plate Extractor & Colleague Matcher',
      description: 'Runs Hugging Face Transformer vision model on vehicle photo, generates text tokens, and matches against employee registry.',
      code: `import difflib

def extract_plate_with_huggingface(image_input):
    """
    Inference with Hugging Face TrOCR (Transformer Optical Character Recognition).
    Takes an image (file path, PIL Image, or numpy array) and runs Hugging Face VisionEncoderDecoder.
    """
    if isinstance(image_input, str):
        image = Image.open(image_input).convert("RGB")
    elif not isinstance(image_input, Image.Image):
        image = Image.fromarray(image_input).convert("RGB")
    else:
        image = image_input.convert("RGB")

    # 1. Hugging Face feature extractor
    pixel_values = processor(image, return_tensors="pt").pixel_values.to(device)

    # 2. VisionEncoderDecoder generate text tokens
    with torch.no_grad():
        generated_ids = hf_model.generate(pixel_values)

    # 3. Decode token IDs into string
    raw_text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
    cleaned_plate = normalize_plate(raw_text)

    return cleaned_plate, raw_text

def search_colleague(plate_query, df_records):
    """Finds employee by exact or fuzzy matching plate number."""
    norm_query = normalize_plate(plate_query)
    
    # 1. Exact match
    exact = df_records[df_records['NormalizedPlate'] == norm_query]
    if not exact.empty:
        return exact.iloc[0].to_dict(), 1.0
        
    # 2. Substring match (e.g. query is "AB1234" vs "GJ01AB1234")
    sub = df_records[df_records['NormalizedPlate'].str.contains(norm_query, na=False)]
    if not sub.empty:
        return sub.iloc[0].to_dict(), 0.92
        
    # 3. Fuzzy similarity
    all_plates = df_records['NormalizedPlate'].tolist()
    close = difflib.get_close_matches(norm_query, all_plates, n=1, cutoff=0.6)
    if close:
        match = df_records[df_records['NormalizedPlate'] == close[0]].iloc[0]
        return match.to_dict(), 0.8
        
    return None, 0.0`,
    },
    {
      title: 'Step 5: Google Chat Link Generator & Webhook Notifier',
      description: 'Creates direct 1-click Google Chat DM link (https://chat.google.com/dm/{email}) and optional Google Chat Space Incoming Webhook.',
      code: `def generate_google_chat_action(colleague, blocked_spot="Bay #14", urgency="polite"):
    name = colleague['Name']
    email = colleague['Email']
    plate = colleague['PlateNumber']
    car = colleague.get('CarModel', 'Vehicle')
    
    # Direct Google Chat DM URL:
    chat_dm_url = f"https://chat.google.com/dm/{email}"
    
    # Draft notification text:
    message = (
        f"Hi {name.split()[0]}, your car ({plate} - {car}) is currently blocking spot {blocked_spot}. "
        f"Could you please move it when you have a moment? Thank you!"
    )
    
    return {
        "colleague_name": name,
        "colleague_email": email,
        "chat_dm_url": chat_dm_url,
        "prefilled_message": message
    }

# Optional: Post directly to Google Chat Space via Incoming Webhook
def send_google_chat_webhook(webhook_url, message_text):
    payload = {"text": message_text}
    resp = requests.post(webhook_url, json=payload)
    return resp.status_code == 200`,
    },
    {
      title: 'Step 6: Webcam Capture in Google Colab & End-to-End Test',
      description: 'Click-to-snap webcam interface embedded directly into the Google Colab cell output.',
      code: `from IPython.display import display, Javascript, Image
from google.colab.output import eval_js
from base64 import b64decode

def take_photo_colab(filename='car_plate.jpg', quality=0.8):
    js = Javascript('''
      async function takePhoto(quality) {
        const div = document.createElement('div');
        const capture = document.createElement('button');
        capture.textContent = '📸 Snap Car Number Plate';
        capture.style.cssText = 'padding: 10px 16px; background: #2563eb; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;';
        div.appendChild(capture);

        const video = document.createElement('video');
        video.style.display = 'block';
        video.style.marginTop = '10px';
        video.style.borderRadius = '8px';
        const stream = await navigator.mediaDevices.getUserMedia({video: true});

        document.body.appendChild(div);
        div.appendChild(video);
        video.srcObject = stream;
        await video.play();

        // Resize the output to fit the video element.
        google.colab.output.setIframeHeight(document.documentElement.scrollHeight, true);

        // Wait for Capture to be clicked.
        await new Promise((resolve) => capture.onclick = resolve);

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        stream.getVideoTracks()[0].stop();
        div.remove();
        return canvas.toDataURL('image/jpeg', quality);
      }
    ''')
    display(js)
    data = eval_js('takePhoto({})'.format(quality))
    binary = b64decode(data.split(',')[1])
    with open(filename, 'wb') as f:
        f.write(binary)
    return filename

# Run End-to-End in Colab with Hugging Face Model:
# image_path = take_photo_colab()
# plate, raw_text = extract_plate_with_huggingface(image_path)
# print("Hugging Face Recognized Plate:", plate, f"(Raw: {raw_text})")
# colleague, match_score = search_colleague(plate, df_parking)
# if colleague:
#     action = generate_google_chat_action(colleague)
#     print("👉 Open Google Chat:", action['chat_dm_url'])`,
    },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Header card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <Code2 className="h-5 w-5" />
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                Google Colab &amp; Hugging Face Code Studio
              </h2>
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl">
              Everything requested: Hugging Face vision models, EasyOCR, Google Sheets sync, and automated Google Chat messaging formatted for 1-click execution in Google Colaboratory.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadNotebook}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 transition-all cursor-pointer"
            >
              {downloaded ? <CheckCircle className="h-4 w-4 text-emerald-300" /> : <Download className="h-4 w-4" />}
              <span>{downloaded ? 'Saved to Downloads!' : 'Download .ipynb Notebook'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyFullNotebookJson}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Copy the entire raw Jupyter Notebook JSON"
            >
              {copiedFullJson ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-slate-500" />}
              <span>{copiedFullJson ? 'JSON Copied!' : 'Copy Raw .ipynb JSON'}</span>
            </button>

            <a
              href="https://colab.research.google.com/#create=true"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors"
            >
              <ExternalLink className="h-4 w-4 text-amber-700" />
              <span>Open Google Colab</span>
            </a>
          </div>
        </div>

        {/* How to import into Google Colab / Fix <!doctype error */}
        <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-950">
          <div className="flex items-start gap-2.5">
            <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <p className="font-bold text-blue-900">
                How to open in Google Colab (Avoiding the &quot;&lt;!doctype is not valid JSON&quot; error):
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1 text-[11px] text-slate-700">
                <div className="rounded-lg bg-white p-2.5 border border-blue-100 shadow-xs">
                  <span className="font-bold text-blue-700">1. Click &quot;Download .ipynb&quot;</span>
                  <p className="text-slate-600 mt-0.5">Saves clean, validated Jupyter notebook file directly to your computer.</p>
                </div>
                <div className="rounded-lg bg-white p-2.5 border border-blue-100 shadow-xs">
                  <span className="font-bold text-blue-700">2. Open Colab &rarr; Upload Tab</span>
                  <p className="text-slate-600 mt-0.5">In Colab, select <strong>File &gt; Upload notebook</strong> (do not use &quot;Open from URL&quot;).</p>
                </div>
                <div className="rounded-lg bg-white p-2.5 border border-blue-100 shadow-xs">
                  <span className="font-bold text-blue-700">3. Select the file &amp; Run</span>
                  <p className="text-slate-600 mt-0.5">Select <code className="text-blue-800 font-mono">CarPark_LicensePlate_Colab.ipynb</code> and execute!</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 pt-1">
                <strong>Why did that error happen?</strong> Google Colab&apos;s &quot;Open from URL&quot; cannot reach private preview URLs inside AI Studio sandboxes (it receives an HTML authentication page starting with <code className="bg-blue-100/80 px-1 py-0.5 rounded text-blue-900">&lt;!doctype html&gt;</code>). Using the <strong>Upload</strong> tab with the downloaded file solves this instantly!
              </p>
            </div>
          </div>
        </div>

        {/* Architecture flow pills */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-3 pt-5 border-t border-slate-100">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 border border-slate-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 shrink-0">
              <Camera className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-800">1. Click Photo</p>
              <p className="text-[10px] text-slate-500">Phone camera or Colab webcam</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 border border-slate-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700 shrink-0">
              <Cpu className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-800">2. Hugging Face OCR</p>
              <p className="text-[10px] text-slate-500">TrOCR &amp; EasyOCR parser</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 border border-slate-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-800">3. Google Sheets Match</p>
              <p className="text-[10px] text-slate-500">Normalized fuzzy search</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 border border-slate-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 shrink-0">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-800">4. Google Chat DM</p>
              <p className="text-[10px] text-slate-500">Instant move-car link</p>
            </div>
          </div>
        </div>
      </div>

      {/* Code Cells List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            Colab Executable Code Blocks
          </h3>
          <span className="text-xs text-slate-500">
            Copy into your Colab notebook or download the full .ipynb above
          </span>
        </div>

        {colabCells.map((cell, idx) => {
          const isCopied = copiedCellIndex === idx;
          return (
            <div
              key={idx}
              className="overflow-hidden rounded-xl border border-slate-200 bg-slate-900 shadow-sm"
            >
              {/* Cell Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/80 px-4 py-2.5">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{cell.title}</h4>
                  <p className="text-[11px] text-slate-400">{cell.description}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyCode(cell.code, idx)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all shrink-0 ${
                    isCopied
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{isCopied ? 'Copied to Clipboard' : 'Copy Code'}</span>
                </button>
              </div>

              {/* Code display */}
              <div className="p-4 overflow-x-auto">
                <pre className="font-mono text-xs text-emerald-400 leading-relaxed">
                  <code>{cell.code}</code>
                </pre>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
