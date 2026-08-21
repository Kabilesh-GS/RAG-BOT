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
  const [chunksMap, setChunksMap] = useState([])
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

  const embedText = async (result, taskType = "RETRIEVAL_DOCUMENT") => {
    const embeds = [];

    for (const text of result){
      const response = await ai.models.embedContent({
        model : "gemini-embedding-001",
        contents : text,
        config : {
          taskType,
          outputDimensionality : 1536
        }
      })
      // console.log("Each embed : ", response.embeddings[0].values)
      embeds.push(response.embeddings[0].values)
    }

    return embeds;
  }

  const cosineSimilarity = (vecA, vecB) => {
    let dotProduct = 0.0, normA = 0.0, normB = 0.0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  };

  const UploadFunction = async (e) => {
    const file = fileRef.current?.files[0]
    if (!file) return

    setState("Extracting text from PDF...")
    const fullText = await TextFunction(file);
    // console.log("Full text extracted:", fullText)

    setState("Chuncking text...")
    const chunks = await chunkText(fullText);
    // console.log("Chunks created:", chunks)

    setState("Embedding...")
    const embeds = await embedText(chunks);
    // console.log("Embeds : ", embeds)

    const chunksWithEmbeddings = chunks.map((chunk, index) => ({ chunk, embed: embeds[index] }))
    setChunksMap(chunksWithEmbeddings)
    console.log("Chunks with embeddings:", chunksWithEmbeddings)
  }

  const AiFunction = async (e) => {
    if (!prompt.trim()) return
    try {

      if (chunksMap.length === 0) {
        setOutput("Upload a Document to get relevant answers." )
        return
      }

      setState("Finding relevant chunks...")

      const [ promptEmbed ] = await embedText([prompt], "RETRIEVAL_QUERY")
      console.log("Prompt embed : ", promptEmbed)
      const similarities = chunksMap.map(({ chunk, embed }) => ({ chunk, similarity: cosineSimilarity(promptEmbed, embed)})).sort((a, b) => b.similarity - a.similarity).slice(0, 3)
      console.log("Similarities : ", similarities)

      const context = similarities.map(({ chunk }) => chunk).join('\n\n')
      console.log("Context : ", context)

      setState("Generating response...")
      const interaction = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { text: `Context: ${context}` },
          { text: `Question: ${prompt}` }
        ]
      })

      setOutput(interaction.candidates[0].content.parts[0].text)
      setState("")
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

        </form>
      </div>

      <section className="nb-output">
        <div className="nb-output-head">Output</div>
        {output
          ? <div className="nb-output-body"><Markdown>{output}</Markdown></div>
          : <div className="nb-empty">{state || "Upload a Document to get relevant answers."}</div>}
      </section>
    </div>
  )
}

export default AI