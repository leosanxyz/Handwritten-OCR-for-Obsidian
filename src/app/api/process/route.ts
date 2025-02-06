import { NextResponse } from "next/server";
import OpenAI from "openai";

export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { error: "No se proporcionó ningún archivo" },
        { status: 400 }
      );
    }

    // Leer el contenido del archivo y convertirlo a Base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString("base64");
    const mimeType = file.type || "image/jpeg";

    const transformationPrompt = `
INSTRUCTIONS_FOR_LLM:
1. INPUT: an image containing a handwritten diary entry (in any language).
   Please transcribe exactly the text from the following image, preserving all punctuation, spacing, and line breaks.

2. OUTPUT: A formatted string in Obsidian Markdown, following these rules:

   a) YAML FRONT MATTER:
      ---
      created: {ISO8601-format date/time at which the diary was physically created.
                If the note hour mentions "am" (after midnight),
                interpret that as the next calendar day for 'created'.}
      date: {ISO8601-format date corresponding to the diary entry content}
      tags:
        - note
        - journal
      place: "[[{location where the note was written}]]"
      ---

   b) SUBTITLES:
      - Insert "## {Subtitle}" to separate relevant sections.
      - These subtitles may not exist in the original diary text; you will create them where appropriate.
      - Do not remove or modify any original text.

   c) TEXT PRESERVATION:
      - Preserve the diary's words, punctuation, line breaks, and spacing exactly as they appear.
      - Do not change, add, or remove any words or punctuation.
      - Only insert Markdown headers (##) and links as instructed; never alter the original sentences.

   d) OBSIDIAN LINKS:
      - Convert any references to:
         • dates
         • person names
         • movies, books, music
        into [[InternalLink]] format.
      - If a reference is repeated, link it consistently each time.

   e) FINAL OUTPUT:
      - Return ONLY the final note with YAML front matter, inserted subtitles, and Obsidian links.
      - No additional text or explanation before or after the note.

Please extract the diary text from the image and transform it accordingly.
    `;

    // Construir el mensaje con "detail": "high" en la parte de la imagen.
    const messageContent = [
      {
        type: "text",
        text: transformationPrompt,
      },
      {
        type: "image_url",
        image_url: {
          url: `data:${mimeType};base64,${base64Image}`,
          detail: "high",
        },
      },
    ] as any;

    // Llamada a la API de OpenAI utilizando el modelo compatible con visión.
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // o "gpt-4o-mini" según tus necesidades
      messages: [
        {
          role: "user",
          content: messageContent,
        },
      ],
      temperature: 0,
      store: true,
    });

    let finalNote = response.choices[0].message?.content;
    if (!finalNote) {
      return NextResponse.json(
        { error: "No se generó contenido" },
        { status: 500 }
      );
    }

    // Eliminar posibles delimitadores de código (triple backticks)
    finalNote = finalNote.replace(/```/g, "");

    // Si la respuesta contiene HTML, extraer solo el contenido del <body>
    if (finalNote.includes("<!DOCTYPE html>") || finalNote.includes("<html")) {
      const bodyMatch = finalNote.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch && bodyMatch[1]) {
        finalNote = bodyMatch[1];
      }
    }

    // Devolver la respuesta como texto plano
    return new NextResponse(finalNote, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Error procesando la imagen:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
