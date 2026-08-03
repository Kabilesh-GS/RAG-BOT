import { GoogleGenAI } from '@google/genai'
import { useState, useRef } from 'react'
import Markdown from 'react-markdown';

const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GOOGLE_GENAI_API_KEY
});

function AI() {
  const [prompt, setPrompt] = useState('')
  const [output, setOutput] = useState('')
  const fileRef = useRef(null)

  const AiFunction = async (e) => {
    if (!prompt.trim()) return
    const file = fileRef.current?.files[0]
    try {

      if (!file){
        const interaction = await ai.interactions.create({
          model: 'gemini-2.5-flash',
          input: prompt
        })
        console.log(interaction.output_text)
        setOutput(interaction.output_text)
      }

      else{
        const mimeType = file.type || 'application/pdf'
        const upload = await ai.files.upload({
          file: file,
          config: { mimeType },
        })
        const interaction = await ai.interactions.create({
          model: 'gemini-2.5-flash',
          input: [
            { type: 'document', uri: upload.uri, mime_type: mimeType },
            { type: 'text', text: prompt },
          ],
        })
        console.log(interaction.output_text)
        setOutput(interaction.output_text)
      }
    } 
    catch (err) {
      console.log(err.message)
    }
  }

  return (
    <div>
      <h1>AI Component</h1>

      <form>
        <input type="text" placeholder="Enter your prompt" value={prompt} onChange={(e) => {setPrompt(e.target.value)}}/>
        <button type="button" onClick={AiFunction}>Submit</button>
        <input type="file" accept="application/pdf" ref={fileRef} />
        <button type="button">Submit</button>
      </form>

      <Markdown>{output}</Markdown>
    </div>
  )
}

export default AI