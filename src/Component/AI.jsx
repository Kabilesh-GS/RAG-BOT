import { GoogleGenAI } from '@google/genai'
import { useState, useRef } from 'react'
import Markdown from 'react-markdown';
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GOOGLE_GENAI_API_KEY
});

function AI() {
  const [prompt, setPrompt] = useState('')
  const [output, setOutput] = useState('')
  const [state, setState] = useState('')
  const fileRef = useRef(null)

  const TextFunction = async (file) => {
    if (!file) return

    let fullText = ''
    const data = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data }).promise;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        // console.log(`Page ${pageNum} text content:`, textContent)
        fullText += textContent.items.map((item) => item.str).join(' ') + '\n'
        // console.log(`Page ${pageNum} text:`, fullText)
    }
    return fullText
  }

  const chunkText = async (text, SIZE = 1000, overlap = 150) => {
    const cleaned = text.replace(/\s+/g, ' ').trim()
    const result = []
    let start = 0

    while (start < cleaned.length) {
      const end = Math.min(start + SIZE, cleaned.length)
      // console.log(`Chunk from ${start} to ${end}:`)
      result.push(cleaned.slice(start, end))
      if (end === cleaned.length) break
      start = end - overlap
      // console.log("result", result)
    }
    return result
  }

  const UploadFunction = async (e) => {
    const file = fileRef.current?.files[0]
    if (!file) return

    setState("Extracting text from PDF...")
    const fullText = await TextFunction(file);
    console.log("Full text extracted:", fullText)

    setState("Chuncking text...")
    const chunks = await chunkText(fullText);
    console.log("Chunks created:", chunks)
  }

  const AiFunction = async (e) => {
    if (!prompt.trim()) return
    const file = fileRef.current?.files[0]
    try {

      if (!file){
        const interaction = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ text: prompt }]
        })
        // console.log(interaction.candidates[0].content.parts[0].text)
        setOutput(interaction.candidates[0].content.parts[0].text)
      }

      else{
        const mimeType = file.type || 'application/pdf'
        const upload = await ai.files.upload({
          file: file,
          config: { mimeType },
        })
        const interaction = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {fileData : {fileUri : upload.uri , mimeType : mimeType || upload.mimeType}},
            {text: prompt}
          ],
        })
        // console.log(interaction.candidates[0].content.parts[0].text)
        setOutput(interaction.candidates[0].content.parts[0].text)
      }
    } 
    catch (err) {
      console.log(err.message)
    }
  }

  return (
    <div className="nb-page">
      <header className="nb-header">
        <h1 className="nb-title">RAG</h1>
        <span className="nb-tag">Ask your PDF</span>
      </header>

      <div className="nb-card">
        <form className="nb-form">
          <div>
            <label className="nb-label" htmlFor="nb-prompt">Prompt</label>
            <div className="nb-row">
              <input
                id="nb-prompt"
                className="nb-input"
                type="text"
                placeholder="Enter your prompt"
                value={prompt}
                onChange={(e) => {setPrompt(e.target.value)}}
              />
              <button className="nb-btn nb-btn-primary" type="button" onClick={AiFunction}>Submit</button>
            </div>
          </div>

          <div>
            <label className="nb-label" htmlFor="nb-file">PDF Document</label>
            <div className="nb-row">
              <input id="nb-file" className="nb-file" type="file" accept="application/pdf" ref={fileRef} />
              <button className="nb-btn nb-btn-secondary" type="button" onClick={UploadFunction}>Upload</button>
            </div>
          </div>

          {state && <div className="nb-status">{state}</div>}
        </form>
      </div>

      <section className="nb-output">
        <div className="nb-output-head">Output</div>
        {output
          ? <div className="nb-output-body"><Markdown>{output}</Markdown></div>
          : <div className="nb-empty">Nothing here yet — ask something above.</div>}
      </section>
    </div>
  )
}

export default AI