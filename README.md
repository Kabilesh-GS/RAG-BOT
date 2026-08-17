# RAG-BOT v1

A learning project to understand and build a **Retrieval-Augmented Generation (RAG)** application from scratch using **React** and **Gemini**.

This README serves as a progress tracker, documenting the concepts learned and features implemented throughout the project.
 
---

## Progress Timeline

- ✅ **Aug 3** — Set up the React app with a basic PDF upload workflow and a simple Gemini question-answer pipeline.
- ✅ **Aug 4** — Learned the end-to-end RAG architecture: document retrieval, PDF text extraction, chunking strategies, and text embeddings.
- ✅ **Aug 9** — Implemented page-wise PDF text extraction using **PDF.js**.
- ✅ **Aug 10** — Implemented chunking of the extracted text and understood chunk overlap; applied a NeoBrutalism design pattern to the UI.
- ✅ **Aug 17** — Generated embeddings for each chunk using Gemini's `gemini-embedding-001` model, with the `RETRIEVAL_DOCUMENT` task type.