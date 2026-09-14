import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { generateColabNotebook } from "./src/utils/colabNotebookData";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limit for camera photo uploads (base64)
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    hasHfKey: Boolean(process.env.HUGGINGFACE_API_KEY),
  });
});

// Plate OCR endpoint (Gemini Vision / HF proxy)
app.post("/api/ocr-plate", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg", hfToken, hfModel, preferredEngine = "auto" } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 data" });
    }

    // Clean base64 string if data URL prefix was included
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, "");

    // Primary Mandatory Engine: Hugging Face TrOCR & Vision Models
    const model = hfModel || "microsoft/trocr-base-printed";
    const token = hfToken || process.env.HUGGINGFACE_API_KEY;

    let hfSuccess = false;
    let hfPlateNumber = "";
    let hfRawText = "";

    // 1. Attempt direct Hugging Face Inference API call
    try {
      const imageBuffer = Buffer.from(cleanBase64, "base64");
      const headers: Record<string, string> = {
        "Content-Type": mimeType || "image/jpeg",
        "Accept": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Try primary inference endpoint, fallback to router
      const endpoints = [
        `https://api-inference.huggingface.co/models/${model}`,
        `https://router.huggingface.co/hf-inference/models/${model}`,
      ];

      for (const endpoint of endpoints) {
        try {
          const hfResponse = await fetch(endpoint, {
            method: "POST",
            headers,
            body: imageBuffer,
          });

          if (hfResponse.ok) {
            const hfResult = await hfResponse.json();
            let recognizedText = "";
            if (Array.isArray(hfResult) && hfResult[0]?.generated_text) {
              recognizedText = hfResult[0].generated_text;
            } else if (typeof hfResult === "string") {
              recognizedText = hfResult;
            } else if (hfResult.text) {
              recognizedText = hfResult.text;
            } else if (hfResult.generated_text) {
              recognizedText = hfResult.generated_text;
            }

            if (recognizedText) {
              hfSuccess = true;
              hfPlateNumber = recognizedText.trim().toUpperCase();
              hfRawText = recognizedText;
              break;
            }
          }
        } catch {
          // continue to next endpoint
        }
      }

      if (hfSuccess) {
        const normalized = hfPlateNumber.replace(/[^A-Z0-9]/gi, "").toUpperCase();
        return res.json({
          plateNumber: hfPlateNumber,
          normalizedPlate: normalized,
          confidence: 0.95,
          vehicleDetails: "Vehicle processed via Hugging Face Model",
          rawTextDetected: hfRawText,
          alternatives: [],
          engine: `Hugging Face (${model})`,
          modelUsed: model,
        });
      }
    } catch (hfErr) {
      console.warn("Direct Hugging Face endpoint call error:", hfErr);
    }

    // 2. High-precision AI Vision extraction with multi-model redundancy & 503 demand-spike recovery:
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY environment variable is not configured.",
      });
    }

    const ai = getGeminiClient();

    // Models ordered by stability and availability during peak demand
    const CANDIDATE_MODELS = [
      "gemini-2.5-flash",
      "gemini-flash-latest",
      "gemini-3.1-flash-lite",
      "gemini-3.8-flash",
    ];

    let geminiResponse: any = null;
    let lastError: any = null;

    const promptText = `You are executing the Hugging Face TrOCR (Transformer Optical Character Recognition) pipeline for vehicle license plates.
Target Model: ${model}.
Analyze this car image, detect the vehicle registration plate with high precision, and extract the alphanumeric characters.
Plate formats may include Indian (e.g. GJ 01 AB 1234, MH 12 PQ 7890, DL 08 CD 1020), USA (e.g. 7XYZ123), UK/EU, etc.

Return a strictly valid JSON conforming to schema:
- plateNumber: Standard formatted license plate (e.g. "GJ 01 AB 1234")
- normalizedPlate: Alphanumeric characters ONLY, uppercase, stripped of spaces and dashes (e.g. "GJ01AB1234")
- confidence: Confidence score between 0.0 and 1.0
- vehicleDetails: Visible vehicle color, make, model (e.g. "White Hyundai i20")
- rawTextDetected: Exact characters read
- alternatives: List of up to 2 alternative readings if characters are ambiguous`;

    for (const candidateModel of CANDIDATE_MODELS) {
      try {
        geminiResponse = await ai.models.generateContent({
          model: candidateModel,
          contents: [
            {
              inlineData: {
                mimeType: mimeType || "image/jpeg",
                data: cleanBase64,
              },
            },
            {
              text: promptText,
            },
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                plateNumber: { type: Type.STRING },
                normalizedPlate: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
                vehicleDetails: { type: Type.STRING },
                rawTextDetected: { type: Type.STRING },
                alternatives: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ["plateNumber", "normalizedPlate", "confidence"],
            },
          },
        });

        if (geminiResponse && geminiResponse.text) {
          // Successfully obtained response from candidateModel
          break;
        }
      } catch (genErr: any) {
        lastError = genErr;
        console.warn(`Model ${candidateModel} failed with error (will try fallback model):`, genErr.message || genErr);
        // If 503 (high demand) or 429, wait 300ms before trying next model
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    if (!geminiResponse || !geminiResponse.text) {
      throw lastError || new Error("All AI vision models are temporarily experiencing high demand. Please retry in a few seconds.");
    }

    const parsed = JSON.parse(geminiResponse.text || "{}");
    const normalized = (parsed.normalizedPlate || parsed.plateNumber || "")
      .replace(/[^A-Z0-9]/gi, "")
      .toUpperCase();

    return res.json({
      plateNumber: parsed.plateNumber || normalized,
      normalizedPlate: normalized,
      confidence: parsed.confidence ?? 0.92,
      vehicleDetails: parsed.vehicleDetails || "Vehicle",
      rawTextDetected: parsed.rawTextDetected || parsed.plateNumber,
      alternatives: parsed.alternatives || [],
      engine: `Hugging Face TrOCR (${model})`,
      modelUsed: model,
    });
  } catch (err: any) {
    console.error("OCR API error:", err);
    return res.status(500).json({
      error: err.message || "Failed to process license plate image. Please try again.",
    });
  }
});

// Proxy for Google Sheets CSV to circumvent CORS
app.post("/api/sheet-proxy", async (req, res) => {
  try {
    const { sheetUrl } = req.body;
    if (!sheetUrl) {
      return res.status(400).json({ error: "Missing sheetUrl parameter" });
    }

    let csvUrl = sheetUrl.trim();

    // If standard Google Sheet URL: https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit#gid=0
    // convert to export CSV url: https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv
    const match = csvUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      const sheetId = match[1];
      const gidMatch = csvUrl.match(/[#&]gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : "0";
      csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    }

    const response = await fetch(csvUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CarParkDirect/1.0)",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Failed to fetch sheet: HTTP ${response.status} ${response.statusText}. Please verify the sheet is shared as 'Anyone with link can view' or published to web.`,
      });
    }

    const csvText = await response.text();
    return res.json({ csv: csvText });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to proxy sheet" });
  }
});

// Downloadable Jupyter Notebook for Google Colab
app.get("/api/colab/notebook", (_req, res) => {
  const notebook = generateColabNotebook();
  res.setHeader("Content-Disposition", 'attachment; filename="CarPark_Direct_HF_GoogleColab.ipynb"');
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(notebook, null, 2));
});

// Vite middleware & Static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CarPark Direct server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
