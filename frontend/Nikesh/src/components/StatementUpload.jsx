import { useRef, useState } from "react";
import axios from "axios";

export default function StatementUpload({ onSuccess }) {
  const [dragging,  setDragging]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result,    setResult]    = useState(null); // { saved, skipped, bank, message }
  const [error,     setError]     = useState("");
  const [fileName,  setFileName]  = useState("");
  const inputRef = useRef();
  const token    = localStorage.getItem("token");

  const reset = () => {
    setResult(null);
    setError("");
    setFileName("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = async (file) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Only PDF files are supported. Please upload a PDF bank statement.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File is too large. Maximum size is 10 MB.");
      return;
    }

    setFileName(file.name);
    setError("");
    setResult(null);
    setUploading(true);

    const formData = new FormData();
    formData.append("statement", file);

    try {
      const r = await axios.post("http://localhost:5000/api/upload", formData, {
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      setResult(r.data);
      if (onSuccess) onSuccess(r.data.transactions || []);
    } catch (e) {
      setError(e.response?.data?.error || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const onInputChange = (e) => handleFile(e.target.files[0]);

  return (
    <div style={{
      background: "linear-gradient(135deg, #13141f 0%, #0d0e17 100%)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 20,
      padding: "24px 26px",
      marginBottom: 20,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, flexShrink: 0,
          boxShadow: "0 4px 14px rgba(124,58,237,0.35)",
        }}>📄</div>
        <div>
          <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 700, color: "#fff", margin: 0 }}>
            Upload Bank Statement
          </h2>
          <p style={{ fontSize: 12, color: "#6b6e85", marginTop: 2 }}>
            PDF format · SBI, HDFC, ICICI, Axis · Max 10 MB
          </p>
        </div>
      </div>

      {/* Drop Zone */}
      {!result && (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          style={{
            border: `2px dashed ${dragging ? "#7c3aed" : uploading ? "#4f46e5" : "rgba(255,255,255,0.12)"}`,
            borderRadius: 16,
            padding: "32px 20px",
            textAlign: "center",
            cursor: uploading ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
            background: dragging
              ? "rgba(124,58,237,0.08)"
              : uploading
              ? "rgba(79,70,229,0.05)"
              : "rgba(255,255,255,0.02)",
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            onChange={onInputChange}
            style={{ display: "none" }}
          />

          {uploading ? (
            <>
              <div style={{
                width: 44, height: 44, borderRadius: "50%",
                border: "3px solid rgba(124,58,237,0.15)",
                borderTop: "3px solid #7c3aed",
                animation: "fk-spin 0.8s linear infinite",
                margin: "0 auto 14px",
              }} />
              <p style={{ fontSize: 14, color: "#a78bfa", fontWeight: 600 }}>
                Parsing <span style={{ color: "#c4b5fd" }}>{fileName}</span>…
              </p>
              <p style={{ fontSize: 12, color: "#5c5f72", marginTop: 4 }}>
                Detecting bank format and extracting transactions
              </p>
            </>
          ) : (
            <>
              <div style={{ fontSize: 36, marginBottom: 12 }}>
                {dragging ? "📂" : "📑"}
              </div>
              <p style={{ fontSize: 14, color: dragging ? "#c4b5fd" : "#a0a3b1", fontWeight: 600 }}>
                {dragging ? "Drop your PDF here" : "Drag & drop your bank statement PDF"}
              </p>
              <p style={{ fontSize: 12, color: "#5c5f72", marginTop: 4 }}>
                or{" "}
                <span style={{ color: "#a78bfa", textDecoration: "underline", cursor: "pointer" }}>
                  browse to choose a file
                </span>
              </p>
              {fileName && (
                <div style={{
                  marginTop: 10, padding: "6px 14px", borderRadius: 8,
                  background: "rgba(124,58,237,0.12)", display: "inline-block",
                  fontSize: 12, color: "#c4b5fd",
                }}>
                  📎 {fileName}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          marginTop: 14, padding: "12px 16px", borderRadius: 12,
          background: "rgba(255,77,109,0.1)", border: "1px solid rgba(255,77,109,0.25)",
          display: "flex", alignItems: "flex-start", gap: 10,
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
          <div>
            <p style={{ fontSize: 13, color: "#ff8a80", margin: 0, fontWeight: 600 }}>{error}</p>
          </div>
          <button onClick={reset} style={{
            marginLeft: "auto", background: "none", border: "none",
            color: "#5c5f72", cursor: "pointer", fontSize: 16, padding: 0, flexShrink: 0,
          }}>✕</button>
        </div>
      )}

      {/* Success */}
      {result && (
        <div style={{
          padding: "18px 20px", borderRadius: 16,
          background: "rgba(74,222,128,0.07)", border: "1px solid rgba(74,222,128,0.2)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 22 }}>✅</span>
            <div>
              <p style={{ fontSize: 14, color: "#4ade80", fontWeight: 700, margin: 0 }}>
                Statement Processed Successfully
              </p>
              <p style={{ fontSize: 12, color: "#6b6e85", marginTop: 2 }}>
                Bank detected: <strong style={{ color: "#a0a3b1" }}>{result.bank}</strong>
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{
              flex: 1, minWidth: 100, padding: "12px 14px", borderRadius: 12,
              background: "rgba(74,222,128,0.1)", textAlign: "center",
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#4ade80", fontFamily: "'Outfit',sans-serif" }}>
                {result.saved}
              </div>
              <div style={{ fontSize: 11, color: "#6b6e85", marginTop: 2 }}>Imported</div>
            </div>
            <div style={{
              flex: 1, minWidth: 100, padding: "12px 14px", borderRadius: 12,
              background: "rgba(255,255,255,0.04)", textAlign: "center",
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#a0a3b1", fontFamily: "'Outfit',sans-serif" }}>
                {result.skipped}
              </div>
              <div style={{ fontSize: 11, color: "#6b6e85", marginTop: 2 }}>Duplicates skipped</div>
            </div>
          </div>
          <button
            onClick={reset}
            style={{
              marginTop: 14, width: "100%", padding: "10px", borderRadius: 10,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              color: "#a0a3b1", fontSize: 13, cursor: "pointer", fontFamily: "'Inter',sans-serif",
              transition: "background 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.09)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
          >
            Upload Another Statement
          </button>
        </div>
      )}
    </div>
  );
}
