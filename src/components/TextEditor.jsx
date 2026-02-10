import { useEffect, useRef } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";

const TextEditor = ({ value, onChange }) => {
  const editorRef = useRef(null);
  const quillRef = useRef(null);
  const isLocalChange = useRef(false);

  // INIT QUILL (ONCE)
  useEffect(() => {
    if (!quillRef.current) {
      quillRef.current = new Quill(editorRef.current, {
        theme: "snow",
        placeholder: "Write something...",
        modules: {
          toolbar: [
            ["bold", "italic", "underline"],
            [{ list: "ordered" }, { list: "bullet" }],
            ["link", "image"],
            ["clean"],
          ],
        },
      });

      quillRef.current.on("text-change", () => {
        isLocalChange.current = true;
        onChange(quillRef.current.root.innerHTML);
      });
    }
  }, [onChange]);

  // SYNC FROM PARENT → QUILL (SAFE)
  useEffect(() => {
    if (!quillRef.current) return;

    if (isLocalChange.current) {
      isLocalChange.current = false;
      return;
    }

    if (value !== quillRef.current.root.innerHTML) {
      quillRef.current.root.innerHTML = value || "";
    }
  }, [value]);

  return <div ref={editorRef} />;
};

export default TextEditor;
