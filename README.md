# 🚗 CarPark Direct: License Plate OCR & Google Chat Notifier

> **Instantly scan parked vehicle license plates, match them against your company's employee parking Google Sheet, and send a 1-click friendly move-car request via Google Chat.**

[![Hugging Face](https://img.shields.io/badge/Hugging%20Face-TrOCR%20Transformers-orange?logo=huggingface)](https://huggingface.co/microsoft/trocr-base-printed)
[![Google Gemini](https://img.shields.io/badge/Google%20GenAI-Vision%20OCR-blue?logo=google)](https://ai.google.dev/)
[![Google Chat](https://img.shields.io/badge/Google%20Chat-Direct%20DM%20Links-green?logo=googlechat)](https://chat.google.com)
[![Google Colab](https://img.shields.io/badge/Google%20Colab-Jupyter%20Notebook-yellow?logo=googlecolab)](https://colab.research.google.com)

---

## 📌 What Problem Does This Product Solve?

In corporate offices, co-working hubs, and commercial campuses:

1. **Blocked Cars & Double Parking**: Employees often find their parked vehicles blocked by another car or find another colleague parked in their designated bay.
2. **Channel Broadcast Spam**: Finding the car owner typically requires spamming company-wide Slack or Google Chat channels:
   > *"Whose white i20 is parked in Bay #14? Please move it ASAP, someone needs to leave!"*
3. **Productivity Delays & Friction**: Colleagues are often in meetings, heads-down working, or have notifications muted on general channels, leading to delayed meetings, missed flights, and unnecessary frustration.

### How CarPark Direct Solves It:
- **Instant Camera OCR**: Point your smartphone or laptop camera at the number plate. The AI reads the registration number in seconds using **Hugging Face TrOCR** or **Google Gemini Vision**.
- **Real-Time Google Sheet Lookup**: The app normalizes the plate number (stripping spaces, hyphens, and dots) and matches it against your company's live employee parking spreadsheet.
- **1-Click Google Chat Direct Message**: Generates an instant deep link (`https://chat.google.com/dm/{colleague_email}`) with a courteous, pre-filled request so you can notify the vehicle owner privately in seconds without disturbing the entire company.

---

## 🚀 How to Use It

### Method 1: Using the Web App

1. **Open the App**: Launch CarPark Direct in your browser or on your phone.
2. **Scan or Upload the Plate**:
   - **Camera Mode**: Click **"Start Camera"**, frame the license plate in the viewfinder, and click **"Capture & Recognize"**.
   - **Upload Mode**: Click **"Upload Photo"** to drag-and-drop or select any vehicle photo.
   - **Demo Mode**: Click any of the **Quick Test Sample Plates** in the scanner card to test recognition immediately.
3. **Verify the Registration Number**:
   - The recognized number and confidence score appear automatically.
   - You can edit any character manually if lighting or dirt on the plate caused an ambiguity.
4. **Notify the Colleague**:
   - When a match is found in the parking registry, their Name, Email, Department, Phone, Car Model, and Assigned Bay appear.
   - Click **"Open Google Chat DM"** to open a direct 1-on-1 chat in Google Chat with a polite, pre-formatted message copied to your clipboard.
   - Click **"Copy Message"** or **"Open WhatsApp"** if you prefer messaging directly.

---

### Method 2: Using the Google Colab Notebook

If your data science or DevOps team prefers running the Python ML pipeline on Colab GPUs:

1. Click the **"Google Colab"** tab inside the web app.
2. Click **"Download .ipynb Notebook"** or copy the code cells directly.
3. Run the notebook steps:
   - **Step 1**: Install Hugging Face `transformers[sentencepiece]`, `torch`, and vision libraries.
   - **Step 2**: Load the official `microsoft/trocr-base-printed` Vision Transformer model.
   - **Step 3**: Load your company's Google Sheet parking registry.
   - **Step 4**: Run OCR inference on any uploaded vehicle photo.
   - **Step 5**: Generate direct Google Chat deep links and notification payloads.

---

## 📋 Setting Up Your Company Google Sheet

You can connect any Google Sheet containing your organization's parking data:

### 1. Recommended Column Headers
Create a sheet with any of the following column names (header names are automatically detected):

| Name | Email | PlateNumber | Department | Phone | CarModel | ParkingSpot |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Sanjay Rana | sanjay@company.com | GJ 01 AB 1234 | Engineering | +91 98765 43210 | White Hyundai i20 | Bay #14 |
| Priya Patel | priya@company.com | MH 12 CD 5678 | Product | +91 98222 33445 | Silver Honda City | Bay #09 |
| Rahul Sharma | rahul@company.com | DL 03 EF 9999 | DevOps | +91 99111 88223 | Red Tata Nexon | Bay #22 |

### 2. Connect Your Sheet to the App
1. In Google Sheets, go to **File &rarr; Share &rarr; Publish to web**.
2. Under "Link", choose **"Entire Document"** and format as **"Comma-separated values (.csv)"**.
3. Copy the generated link.
4. In CarPark Direct, paste the link into the **Google Sheet Link** input in the header and click **"Connect"**.
5. All records sync instantly with offline caching in your browser.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite
- **OCR Engines**:
  - **Hugging Face TrOCR**: `microsoft/trocr-base-printed` Vision Transformer
  - **Google Gemini Vision**: Multi-model fallback pipeline (`gemini-2.5-flash`, `gemini-flash-latest`, `gemini-3.1-flash-lite`)
- **Backend & Proxy**: Express.js, Node.js (`server.ts`) for CORS proxying and secure API handling
- **Integration**: Google Chat Deep Link URL Schema (`https://chat.google.com/dm/{email}`), Google Sheets CSV Export

---

## 💻 Local Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/carpark-direct.git
cd carpark-direct

# 2. Install dependencies
npm install

# 3. Configure environment variables (optional for Hugging Face Inference API)
cp .env.example .env

# 4. Start the local development server
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
