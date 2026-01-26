import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../Profile/Base.css";
import "./CreatePost.css";
import "./Editor.css"
import appLogo from "../../images/logo.png";
import profilePic from "../../images/profile-pic.png";
import friend from "../../images/friend.png";
import axios from "axios";
import MainLayout from "../Profile/MainLayout";
import Select from "react-select";
import { useLocation } from "react-router-dom";

function CreatePost() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const preselectedGroupId = queryParams.get("group");
  const preselectedGroupName = queryParams.get("name");
  const navigate = useNavigate();
  const editorRef = useRef(null);
  const tutorialEditorsRef = useRef({});
  const [user, setUser] = useState(null);
  const [postType, setPostType] = useState(null);
  const [editor, setEditor] = useState(null);
  const [isEditorLoaded, setIsEditorLoaded] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [userGroups, setUserGroups] = useState([]);
  const [postTypeError, setPostTypeError] = useState(false);
  const [language, setLanguage] = useState(null); 
  const [imageUrl, setImageUrl] = useState(null); 
  const [researchLinks, setResearchLinks] = useState([]); 
  const [difficulty, setDifficulty] = useState(null);
  const [estimatedTime, setEstimatedTime] = useState("");
  const [prerequisites, setPrerequisites] = useState([]);
  const [tagsInput, setTagsInput] = useState("");
  const [memeUploadsAllowed, setMemeUploadsAllowed] = useState(0);
  const [memeUploadsUsed, setMemeUploadsUsed] = useState(0);
  const [uploadHover, setUploadHover] = useState(false);
  const [fileKey, setFileKey] = useState(0);

  const handleRemoveImage = () => {
    setImageUrl(null);
    setFileKey((k) => k + 1);
  };


  function getLevel(xp) {
    return Math.floor(xp / 100);
  }

  const uploadsAllowed = memeUploadsAllowed;              
  const uploadsRemaining = uploadsAllowed - memeUploadsUsed;
  const nextRequiredLevel = (uploadsAllowed + 1) * 10;


  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchUser = async () => {
      try {
        const res = await axios.get(`${window.location.origin}/api/users/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setUser({
          name: res.data.name,
          username: res.data.username,
          xp: res.data.xp,
          profilePic,
        });
        setMemeUploadsAllowed(res.data.memes_allowed);
        setMemeUploadsUsed(res.data.memes_uploaded);

        const groupsRes = await axios.get(`${window.location.origin}/api/users/my-groups`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const allGroups = groupsRes.data;
        setUserGroups(allGroups);

        if (preselectedGroupId) {
          const group = allGroups.find((g) => g.id === Number(preselectedGroupId));
          if (group) {
            setSelectedGroup({ value: group.id, label: group.name });
          }
        }

      } catch (err) {
        console.error("Erro ao carregar utilizador ou grupos:", err);
        navigate("/login");
      }
    };

    fetchUser();
  }, [navigate, preselectedGroupId]);


  useEffect(() => {
    if (!user || editor) return;

    const initEditor = () => {
      if (window.editormd && document.getElementById("editor")) {
        const mdEditor = window.editormd("editor", {
          width: "100%",
          height: 600,
          path: "/editor.md/lib/",
          saveHTMLToTextarea: true,
          placeholder: "Write here...",
          markdown: "",
          imageUpload: false,
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
        });
        
        setEditor(mdEditor);
        setIsEditorLoaded(true);
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
        setIsEditorLoaded(true); 
      }
    }, 100);

    return () => clearInterval(intervalId);
  }, [user, editor]);

const handleSubmit = async () => {
  if (!postType) {
    setPostTypeError(true);
    return;
  }

  const markdownContent = editor?.getMarkdown?.() || "";

  const requiresContent = ["snippet", "tutorial", "research"];
  if (requiresContent.includes(postType.value)) {
    if (!markdownContent.trim()) {
      alert("You must write something");
      return;
    }
  }

  if (postType.value === "question" && !markdownContent.includes("?")) {
    alert("Questions must contain at least one question mark (?)");
    return;
  }

  if (postType.value === "meme" && !imageUrl) {
    alert("Please upload an image for a meme post.");
    return;
  }

  if (postType.value === "snippet") {
    if (!language || !language.trim()) {
      alert("Language is required for snippet posts.");
      return;
    }
  }

  if (postType.value === "tutorial") {
    if (!estimatedTime.trim()) {
      alert("Estimated time is required for tutorials.");
      return;
    }
    if (!difficulty) {
      alert("Difficulty is required for tutorials.");
      return;
    }
  }

  const cleanPrerequisites = prerequisites
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const cleanLinks = researchLinks
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const cleanTags = tagsInput
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !/\s/.test(t));


  const payload = {
    type: postType.value,
    content: markdownContent,
    group_id: selectedGroup?.value,
    ...(postType.value === "snippet" && { language }),
    ...(imageUrl && { image_url: imageUrl }),
    ...(postType.value === "tutorial" && {
      estimated_time: estimatedTime,
      difficulty: difficulty?.value,
      prerequisites: cleanPrerequisites,
    }),
    ...(postType.value === "research" && { links: cleanLinks }),
    ...(cleanTags.length > 0 && { tags: cleanTags }),
  };


  try {
    const token = localStorage.getItem("token");
    await axios.post(`${window.location.origin}/api/posts/posts`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    navigate("/home");
  } catch (err) {
    console.error(err);
    alert("Erro ao criar post");
  }
};



  if (!user) return <div>Carregando...</div>;

  return (
    <MainLayout>
      <main className="create-post-page">
        <div className="create-post-card">
          <div className="card-header">
            <div className="post-options">
              <div className="select-group">
                <label>Choose a group</label>
                <Select
                  classNamePrefix="react-select"
                  options={userGroups.map((g) => ({
                    value: g.id,
                    label: g.name,
                  }))}
                  value={selectedGroup}
                  onChange={(option) => setSelectedGroup(option)}
                  placeholder="Select group..."
                  isSearchable
                  isClearable={!preselectedGroupId} 
                  isDisabled={!!preselectedGroupId}
                  menuPortalTarget={document.body}
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      backgroundColor: '#2a2a2c',
                      borderColor: state.isFocused ? 'white' : '#3a3c3f',
                      boxShadow: 'none',
                      color: 'white',
                    }),
                    menu: (base) => ({
                      ...base,
                      backgroundColor: '#2a2a2c',
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
                        : '#2a2a2c',
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

              <div className="select-group">
                <label>Post type</label>
                <Select
                  classNamePrefix="react-select"
                  options={[
                    { value: "snippet", label: "Snippet" },
                    { value: "meme", label: "Meme" },
                    { value: "tutorial", label: "Tutorial" },
                    { value: "research", label: "Research" },
                    { value: "question", label: "Question" },
                  ]}
                  value={postType}
                  onChange={(option) => {
                    setPostType(option);
                    setPostTypeError(false);
                    if (option?.value !== "meme" && imageUrl && /^https?:\/\//i.test(imageUrl)) {
                      setImageUrl(null);
                    }
                  }}
                  placeholder="Select type..."
                  isSearchable
                  isClearable
                  menuPortalTarget={document.body}
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      backgroundColor: '#2a2a2c',
                      borderColor: state.isFocused ? 'white' : '#3a3c3f',
                      boxShadow: 'none',
                      color: 'white',
                    }),
                    menu: (base) => ({
                      ...base,
                      backgroundColor: '#2a2a2c',
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
                        : '#2a2a2c',
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
                {postTypeError && (
                  <p style={{ color: "red", marginTop: "0.3rem" }}>
                    Please select a post type.
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="card-body">
            {postType?.value === "snippet" && (
              <div className="extra-field">
                <label>Language</label>
                <input
                  type="text"
                  placeholder="e.g. JavaScript, Python"
                  value={language || ""}
                  onChange={(e) => setLanguage(e.target.value)}
                />
              </div>
            )}

            {postType?.value === "meme" && (
              <div className="extra-field">
                <label>Image link</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={imageUrl || ""}
                  onChange={(e) => setImageUrl(e.target.value)}
                />

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
                      ({uploadsRemaining} upload{uploadsRemaining !== 1 ? 's' : ''} remaining)
                    </span>
                    <input
                      key={`meme-${fileKey}`}
                      type="file"
                      accept="image/*"
                      disabled={uploadsRemaining <= 0}
                      style={{ display: "none" }}
                      onChange={async (e) => {
                        const file = e.target.files[0];
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
                        } catch (err) {
                          if (err.response?.status === 413) {
                            alert("A imagem é demasiado grande. Tenta uma mais pequena ou comprime-a.");
                          } else {
                            alert("Falha ao enviar imagem.");
                          }
                        } finally {
                          e.target.value = null;
                        }
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
                    alt="meme preview"
                    style={{
                      display: "block",
                      maxWidth: "100%",
                      borderRadius: "8px",
                    }}
                  />
                  <div className="image-actions" style={{ marginTop: 8 }}>
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

            {postType && postType.value !== "meme" && (
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
                      ({uploadsRemaining} upload{uploadsRemaining !== 1 ? 's' : ''} remaining)        </span>
                    <input
                      key={`other-${fileKey}`}
                      type="file"
                      accept="image/*"
                      disabled={uploadsRemaining <= 0}
                      style={{ display: "none" }}
                      onChange={async (e) => {
                        const file = e.target.files[0];
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
                        } catch (err) {
                          if (err.response?.status === 413) {
                            alert("A imagem é demasiado grande. Tenta uma mais pequena ou comprime-a.");
                          } else {
                            alert("Falha ao enviar imagem.");
                          }
                        } finally {
                          e.target.value = null; 
                        }
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
                {imageUrl && !/^https?:\/\//i.test(imageUrl) && (
                  <div style={{ marginTop: 10 }}>
                    <img
                      src={imageUrl}
                      alt="image preview"
                      style={{
                        display: "block",
                        maxWidth: "100%",
                        borderRadius: "8px",
                      }}
                    />
                    <div className="image-actions" style={{ marginTop: 8 }}>
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


            {postType?.value === "tutorial" && (
              <>
                <div className="extra-field">
                  <label>Estimated Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 15 min"
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
                    placeholder="Select difficulty"
                    isClearable
                    menuPortalTarget={document.body}
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

            {postType?.value === "research" && (
              <div className="extra-field">
                <label>Research Links</label>
                {researchLinks.map((link, index) => (
                  <div key={index} className="input-with-remove">
                    <input
                      type="text"
                      placeholder={`Link ${index + 1}`}
                      value={link}
                      onChange={(e) => {
                        const updated = [...researchLinks];
                        updated[index] = e.target.value;
                        setResearchLinks(updated);
                      }}
                      style={{ flex: 1, height: "40px" }}
                    />
                    <button
                      type="button"
                      className="remove-btn"
                      onClick={() => {
                        const updated = researchLinks.filter((_, i) => i !== index);
                        setResearchLinks(updated);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setResearchLinks([...researchLinks, ""])}
                  className="btn-add-link"
                >
                  Add Link
                </button>
              </div>
            )}
            
            <div className="editor-wrapper" style={{ position: "relative" }}>
              {!isEditorLoaded ? (
                <div className="editor-loading" style={{
                  position: "absolute",
                  top: 0, left: 0, right: 0, bottom: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#1f1f1f",
                }}>
                  Loading editor…
                </div>
              ) : null}
              
              <div
                id="editor"
                className="editor-container dark-editor"
                style={{ 
                  display: isEditorLoaded ? "block" : "none",
                  height: 600 
                }}
              >
                <textarea
                  ref={editorRef}
                  id="editor-markdown-doc"
                  name="content"
                  style={{ display: "none" }}
                />
              </div>
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
            </div>

            {tagsInput && (
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {tagsInput.split(",").map(t => t.trim()).filter(t => t && !/\s/.test(t)).map((t, i) => (
                  <span key={i} style={{ padding: "4px 8px", border: "1px solid #3a3c3f", borderRadius: 12 }}>
                    {t}
                  </span>
                ))}
              </div>
            )}

          </div>

          <div className="card-footer">
            <button onClick={handleSubmit} className="btn-submit">
              Publish
            </button>
          </div>
        </div>
      </main>
    </MainLayout>
  );
}

export default CreatePost;
