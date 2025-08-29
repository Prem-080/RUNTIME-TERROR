# StudyMate QA

A web application for uploading PDF study notes and asking questions about their content using AI.

## Features

- Upload multiple PDF files as study notes
- Ask questions about uploaded notes
- AI-powered answers using Hugging Face models
- Chat session management and history
- Download chat history

## Technologies Used

- **Frontend:** React, TypeScript, Tailwind CSS, Vite
- **Backend:** Flask, Python
- **AI:** Sentence Transformers, Hugging Face Inference API, FAISS

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd studymateQA
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Install Backend Dependencies

```bash
pip install -r services/requirements.txt
```

### 4. Environment Variables

Create a `.env.local` file in the root directory and add your Hugging Face token:

```
HF_TOKEN=your_huggingface_token
```

### 5. Run the Backend

```bash
python services/__init__.py
```

### 6. Run the Frontend

```bash
npm run dev
```

### 7. Access the App

Open your browser and go to `http://localhost:5173` (or the port shown in your terminal).

## Deployment

- Deploy the backend on platforms like Render, Heroku, or Railway.
- Deploy the frontend on Vercel, Netlify, or any static hosting provider.
- Update API URLs in the frontend to point to your deployed backend.

## Notes

- Make sure your Hugging Face token has access to the models you want to use.
- Not all Hugging Face models are available for direct inference via API.

## License

MIT
