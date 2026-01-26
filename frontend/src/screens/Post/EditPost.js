import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import MainLayout from "../Profile/MainLayout";
import Select from "react-select";
import "./CreatePost.css";
import "./Editor.css";

function EditPost() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editorRef = useRef(null);
  const [editor, setEditor] = useState(null);

  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState(null);

  const [content, setContent] = useState("");
  const [language, setLanguage] = useState("");
  const [imageUrl, setImageUrl] = useState(""); 
  const [estimatedTime, setEstimatedTime] = useState("");
  const [difficulty, setDifficulty] = useState(null);
  const [prerequisites, setPrerequisites] = useState([""]);
  const [researchLinks, setResearchLinks] = useState([""]);
  const [tagsInput, setTagsInput] = useState("");

  const [memeUploadsAllowed, setMemeUploadsAllowed] = useState(0);
  const [memeUploadsUsed, setMemeUploadsUsed] = useState(0);

  const [uploadHover, setUploadHover] = useState(false);
  const [fileKey, setFileKey] = useState(0); 

  const uploadsAllowed = memeUploadsAllowed;
  const uploadsRemaining = uploadsAllowed - memeUploadsUsed; 
  const nextRequiredLevel = (uploadsAllowed + 1) * 10;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchAll = async () => {
      try {
        const [postRes, profileRes] = await Promise.all([
          axios.get(`${window.location.origin}/api/posts/posts/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${window.location.origin}/api/users/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const found = postRes.data;
        setPost(found);
        setContent(found.content || "");
        setLanguage(found.language || "");
        setImageUrl(found.meme_url || "");
        setEstimatedTime(found.estimated_time || "");
        setDifficulty(
          found.difficulty ? { value: found.difficulty, label: found.difficulty } : null
        );
        setPrerequisites(found.prerequisites || [""]);
        setResearchLinks(found.links || [""]);
        setTagsInput(Array.isArray(found.tags) ? found.tags.join(",") : "");

        setMemeUploadsAllowed(profileRes.data.memes_allowed || 0);
        setMemeUploadsUsed(profileRes.data.memes_uploaded || 0);

        setLoading(false);
      } catch (e) {
        navigate("/home");
      }
    };

    fetchAll();
  }, [id, navigate]);

  useEffect(() => {
    if (editor || loading) return;

    const initEditor = () => {
      if (window.editormd && document.getElementById("editor")) {
        const mdEditor = window.editormd("editor", {
          width: "100%",
          height: 600,
          path: "/editor.md/lib/",
          saveHTMLToTextarea: true,
          emoji: false,
          toolbarIcons: () => [
            "undo", "redo", "|",
            "bold", "del", "italic", "quote", "|",
            "uppercase", "lowercase", "h1", "|",
            "list-ul", "list-ol", "hr", "|",
            "link", "image", "code", "code-block", "|",
            "table", "datetime", "|",
            "watch", "preview",
          ],
          markdown: content,
        });
        setEditor(mdEditor);
        return true;
      }
      return false;
    };

    if (initEditor()) return;

    let tryCount = 0;
    const maxTries = 50; 
    const intervalId = setInterval(() => {
      tryCount++;
      if (initEditor()) {
        clearInterval(intervalId);
      } else if (tryCount >= maxTries) {
        clearInterval(intervalId);
        console.error("Editor initialization failed after retries");
      }
    }, 100);

    return () => clearInterval(intervalId);
  }, [editor, content, loading]);

  const handleUpdate = async () => {
    const markdown = editor?.getMarkdown?.() || "";

    if (["snippet", "tutorial", "research"].includes(post.type)) {
      if (!markdown.trim()) {
        alert("You must write something.");
        return;
      }
    }

    if (post.type === "question" && !markdown.includes("?")) {
      alert("Questions must contain at least one question mark (?).");
      return;
    }

    if (post.type === "meme" && !imageUrl) {
      alert("Please add an image (link or upload) for memes.");
      return;
    }
    if (post.type === "snippet" && !`${language}`.trim()) {
      alert("Language is required for snippet posts.");
      return;
    }

    const cleanPrereqs = prerequisites.map((p) => p.trim()).filter((p) => p.length > 0);
    const cleanLinks = researchLinks.map((l) => l.trim()).filter((l) => l.length > 0);
    const cleanTags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && !/\s/.test(t));

    const canSendImageUrl =
      post.type === "meme"
        ? !!imageUrl
        : !!imageUrl && !/^https?:\/\//i.test(imageUrl);

    const updated = {
      type: post.type,
      content: markdown,
      ...(post.type === "snippet" && { language }),
      ...(canSendImageUrl && { image_url: imageUrl }),
      ...(post.type === "tutorial" && {
        estimated_time: estimatedTime,
        difficulty: difficulty?.value,
        prerequisites: cleanPrereqs,
      }),
      ...(post.type === "research" && { links: cleanLinks }),
      ...(cleanTags.length > 0 && { tags: cleanTags }),
    };

    try {
      const token = localStorage.getItem("token");
      await axios.put(`${window.location.origin}/api/posts/posts/${id}`, updated, {
        headers: { Authorization: `Bearer ${token}` },
      });
      navigate("/home");
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar post");
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${window.location.origin}/api/posts/upload-image`,
        form,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setImageUrl(res.data.url);      
      setFileKey((k) => k + 1);       
    } catch (err) {
      if (err?.response?.status === 413) alert("Image too big.");
      else if (err?.response?.data?.detail) alert(err.response.data.detail);
      else alert("Upload failed.");
    }
  };

  const handleClearLink = () => {
    setImageUrl("");
    setFileKey((k) => k + 1); 
  };


  const handleRemoveImage = () => {
    setImageUrl("");
    setFileKey((k) => k + 1); 
  };

  if (loading || !post) return <div>Loading...</div>;

  const isExternal = /^https?:\/\//i.test(imageUrl);

  return (
    <MainLayout>
      <main className="create-post-page">
        <div className="create-post-card">
          <div className="card-title">
            <h2 style={{ color: "white" }}>Edit Post ({post.type})</h2>
          </div>

          <div className="card-body">
            {post.type === "snippet" && (
              <div className="extra-field">
                <label>Language</label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                />
              </div>
            )}

            {post.type === "meme" && (
              <div className="extra-field">
                <label>Image link</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>

                <div style={{ marginTop: 10, position: "relative" }}>
                  <label
                    style={{
                      display: "inline-block",
                      position: "relative",
                      padding: "8px 16px",
                      background: uploadsRemaining > 0 ? "#23222a" : "#2a2a2c",
                      color: uploadsRemaining > 0 ? "#fff" : "#aaa",
                      borderRadius: "8px",
                      border: "1px solid #444",
                      cursor: uploadsRemaining > 0 ? "pointer" : "not-allowed",
                      opacity: uploadsRemaining > 0 ? 1 : 0.6,
                      userSelect: "none",
                    }}
                    onMouseEnter={() => setUploadHover(true)}
                    onMouseLeave={() => setUploadHover(false)}
                  >
                    Or upload
                    <span style={{ color: "#aaa", marginLeft: 8 }}>
                      ({uploadsRemaining} upload{uploadsRemaining !== 1 ? "s" : ""} remaining)
                    </span>
                    <input
                      key={`meme-${fileKey}`}
                      type="file"
                      accept="image/*"
                      disabled={uploadsRemaining <= 0}
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUpload(f);
                        e.target.value = null;
                      }}
                    />
                    {(uploadsRemaining <= 0 && uploadHover) && (
                      <div
                        style={{
                          position: "absolute",
                          left: "100%",
                          top: 0,
                          background: "#23222a",
                          color: "#fff",
                          padding: "8px 16px",
                          borderRadius: "8px",
                          marginLeft: "8px",
                          fontSize: "14px",
                          whiteSpace: "nowrap",
                          boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
                          zIndex: 9999,
                        }}
                      >
                        {uploadsAllowed === 0
                          ? "Get to level 10 to unlock your first upload!"
                          : `Get to level ${nextRequiredLevel} to unlock 1 more upload!`}
                      </div>
                    )}
                  </label>
                </div>

                {imageUrl && (
                  <div style={{ marginTop: 10 }}>
                    <img
                      src={imageUrl}
                      alt="preview"
                      style={{ maxWidth: "100%", borderRadius: "8px", display: "block" }}
                    />
                    <div className="image-actions">
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="btn btn-danger btn-sm"
                        title="Remove image"
                      >
                        Remove image
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}

            {post.type !== "meme" && (
              <div className="extra-field">
                <label>Optional image (upload)</label>
                <div style={{ marginTop: 10, position: "relative" }}>
                  <label
                    style={{
                      display: "inline-block",
                      position: "relative",
                      padding: "8px 16px",
                      background: uploadsRemaining > 0 ? "#23222a" : "#2a2a2c",
                      color: uploadsRemaining > 0 ? "#fff" : "#aaa",
                      borderRadius: "8px",
                      border: "1px solid #444",
                      cursor: uploadsRemaining > 0 ? "pointer" : "not-allowed",
                      opacity: uploadsRemaining > 0 ? 1 : 0.6,
                      userSelect: "none",
                    }}
                    onMouseEnter={() => setUploadHover(true)}
                    onMouseLeave={() => setUploadHover(false)}
                  >
                    Upload image
                    <span style={{ color: "#aaa", marginLeft: 8 }}>
                      ({uploadsRemaining} upload{uploadsRemaining !== 1 ? "s" : ""} remaining)
                    </span>
                    <input
                      key={`other-${fileKey}`}
                      type="file"
                      accept="image/*"
                      disabled={uploadsRemaining <= 0}
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUpload(f);
                        e.target.value = null; 
                      }}
                    />
                    {(uploadsRemaining <= 0 && uploadHover) && (
                      <div
                        style={{
                          position: "absolute",
                          left: "100%",
                          top: 0,
                          background: "#23222a",
                          color: "#fff",
                          padding: "8px 16px",
                          borderRadius: "8px",
                          marginLeft: "8px",
                          fontSize: "14px",
                          whiteSpace: "nowrap",
                          boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
                          zIndex: 9999,
                        }}
                      >
                        {uploadsAllowed === 0
                          ? "Get to level 10 to unlock your first upload!"
                          : `Get to level ${nextRequiredLevel} to unlock 1 more upload!`}
                      </div>
                    )}
                  </label>
                </div>

                {imageUrl && (
                  <div className="image-preview" style={{ marginTop: 10 }}>
                    <img
                      src={imageUrl}
                      alt="preview"
                      style={{ maxWidth: "100%", borderRadius: 8, display: "block" }}
                    />
                    <div className="image-actions">
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={handleRemoveImage}
                        title="Remove image"
                      >
                        Remove image
                      </button>
                    </div>
                  </div>
                )}


              </div>
            )}

            {post.type === "tutorial" && (
              <>
                <div className="extra-field">
                  <label>Estimated Time</label>
                  <input
                    type="text"
                    value={estimatedTime}
                    onChange={(e) => setEstimatedTime(e.target.value)}
                  />
                </div>
                <div className="extra-field">
                  <label>Difficulty</label>
                  <Select
                    classNamePrefix="react-select"
                    options={[
                      { value: "beginner", label: "Beginner" },
                      { value: "intermediate", label: "Intermediate" },
                      { value: "advanced", label: "Advanced" },
                    ]}
                    value={difficulty}
                    onChange={setDifficulty}
                    isClearable
                    styles={{
                      control: (base, state) => ({
                        ...base,
                        backgroundColor: '#1a1a1b',
                        borderColor: state.isFocused ? 'white' : '#3a3c3f',
                        boxShadow: 'none',
                        color: 'white',
                      }),
                      menu: (base) => ({
                        ...base,
                        backgroundColor: '#1a1a1b',
                        border: '1px solid #3a3c3f',
                        color: '#d7dadc',
                        zIndex: 9999,
                      }),
                      option: (base, state) => ({
                        ...base,
                        backgroundColor: state.isSelected
                          ? '#555'
                          : state.isFocused
                          ? '#3a3c3f'
                          : '#1a1a1b',
                        color: state.isSelected || state.isFocused ? 'white' : '#d7dadc',
                        cursor: 'pointer',
                      }),
                      singleValue: (base) => ({
                        ...base,
                        color: 'white',
                      }),
                      placeholder: (base) => ({
                        ...base,
                        color: '#888',
                      }),
                      input: (base) => ({
                        ...base,
                        color: 'white',
                      }),
                    }}
                  />
                </div>

                <div className="extra-field">
                  <label>Prerequisites</label>
                  {prerequisites.map((item, idx) => (
                    <div key={idx} className="input-with-remove">
                      <input
                        type="text"
                        placeholder={`Prerequisite ${idx + 1}`}
                        value={item}
                        onChange={(e) => {
                          const updated = [...prerequisites];
                          updated[idx] = e.target.value;
                          setPrerequisites(updated);
                        }}
                        style={{ flex: 1, height: "40px" }}
                      />
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => {
                          const updated = prerequisites.filter((_, i) => i !== idx);
                          setPrerequisites(updated);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn-add-link"
                    onClick={() => setPrerequisites([...prerequisites, ""])}
                  >
                    Add Prerequisite
                  </button>
                </div>
              </>
            )}

            {post.type === "research" && (
              <div className="extra-field">
                <label>Research Links</label>
                {researchLinks.map((link, idx) => (
                  <div key={idx} className="input-with-remove">
                    <input
                      type="text"
                      placeholder={`Link ${idx + 1}`}
                      value={link}
                      onChange={(e) => {
                        const updated = [...researchLinks];
                        updated[idx] = e.target.value;
                        setResearchLinks(updated);
                      }}
                      style={{ flex: 1, height: "40px" }}
                    />
                    <button
                      type="button"
                      className="remove-btn"
                      onClick={() => {
                        const updated = researchLinks.filter((_, i) => i !== idx);
                        setResearchLinks(updated);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn-add-link"
                  onClick={() => setResearchLinks([...researchLinks, ""])}
                >
                  Add Link
                </button>
              </div>
            )}

            <div id="editor" className="editor-container dark-editor">
              <textarea
                ref={editorRef}
                id="editor-markdown-doc"
                name="content"
                style={{ display: "none" }}
              />
            </div>

            <div className="extra-field">
              <label>Tags</label>
              <input
                type="text"
                placeholder="ex: javascript,react,webdev"
                value={tagsInput}
                onChange={(e) => {
                  const noSpaces = e.target.value.replace(/\s+/g, "");
                  setTagsInput(noSpaces);
                }}
                onKeyDown={(e) => {
                  if (e.key === " ") e.preventDefault();
                }}
                style={{ width: "100%", height: "40px" }}
              />
              <small className="helper" style={{ color: "#888" }}>
                Separate tags with commas. No spaces allowed.
              </small>

              {tagsInput && (
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {tagsInput
                    .split(",")
                    .map((t) => t.trim())
                    .filter((t) => t && !/\s/.test(t))
                    .map((t, i) => (
                      <span
                        key={i}
                        style={{
                          padding: "4px 8px",
                          border: "1px solid #3a3c3f",
                          borderRadius: 12,
                        }}
                      >
                        {t}
                      </span>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div className="card-footer">
            <button onClick={handleUpdate} className="btn-submit">
              Save Changes
            </button>
          </div>
        </div>
      </main>
    </MainLayout>
  );
}

export default EditPost;
