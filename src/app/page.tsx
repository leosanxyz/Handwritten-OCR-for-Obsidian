// app/page.tsx
"use client";
import { useState, ChangeEvent, FormEvent } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [finalNote, setFinalNote] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      alert("Por favor, selecciona un archivo.");
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/process", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error("Error en el servidor");
      }
      const text = await response.text();
      setFinalNote(text);
    } catch (error) {
      console.error("Error procesando la imagen:", error);
      alert("Ocurrió un error al procesar la imagen.");
    }
    setLoading(false);
  };

  return (
    <main style={{ maxWidth: "600px", margin: "2rem auto", padding: "1rem", backgroundColor: "#fff", color: "#000" }}>
      <h1>OCR de Nota Manuscrita y Transformación</h1>
      <form onSubmit={handleSubmit}>
        <input type="file" accept="image/*" onChange={handleFileChange} />
        <button type="submit" style={{ marginLeft: "1rem" }}>Procesar</button>
      </form>
      {loading && <p>Procesando...</p>}
      {finalNote && (
        <section style={{ marginTop: "2rem" }}>
          <h2>Nota Formateada</h2>
          <pre style={{ whiteSpace: "pre-wrap", backgroundColor: "#fff", color: "#000", padding: "1rem", borderRadius: "4px", border: "1px solid #ccc" }}>
            {finalNote}
          </pre>
        </section>
      )}
    </main>
  );
}
