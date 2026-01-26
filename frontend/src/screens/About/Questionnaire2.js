import { useState } from "react";
import MainLayout from "../Profile/MainLayout";
import axios from "axios";

export const TASKS = [
  { step: 1, title: "Create a post of type Code Snippet", question: "How easy was it to locate and create a code snippet post?", options: ["Very easy", "Easy", "Neutral", "Difficult", "Very difficult"] },
  { step: 2, title: "Create a post of type Tutorial", question: "How clear was the process to structure and format a tutorial post?", options: ["Very clear", "Clear", "Neutral", "Unclear", "Very unclear"] },
  { step: 3, title: "Add a Quote to an existing post", question: "How simple was it to highlight and quote a post?", options: ["Very simple", "Simple", "Neutral", "Complex", "Very complex"] },
  { step: 4, title: "Insert Tags in a new post", question: "Did you easily find the tags field when creating a post?", options: ["Yes", "Partially", "No"] },
  { step: 5, title: "Search for a group", question: "How easy was it to find and join a new group?", options: ["Very easy", "Easy", "Neutral", "Difficult", "Very difficult"] },
  { step: 6, title: "Follow a user", question: "How easy was it to find and follow a new profile?", options: ["Very easy", "Easy", "Neutral", "Difficult", "Very difficult"] },
  { step: 7, title: "Like and comment on a post", question: "How intuitive was locating and using the like and comment buttons?", options: ["Very intuitive", "Intuitive", "Neutral", "Slightly intuitive", "Not at all intuitive"] },
  { step: 8, title: "Evaluate loading speed when switching between tabs (Feed, Groups, Profile)", question: "How would you rate the loading speed when switching between tabs?", options: ["Very fast", "Fast", "Acceptable", "Slow", "Very slow"] },
  { step: 9, title: "Final open-ended question", question: "What difficulties or improvements would you highlight after this session?", isOpen: true },
];

function Questionnaire2() {
  const [form, setForm] = useState(
    TASKS.reduce((acc, t) => {
      acc[`q${t.step}`] = "";
      return acc;
    }, {})
  );

  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null); 
  const [error, setError] = useState("");   
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (key, value) => {
    setNotice(null);
    setError("");
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const missing = TASKS.filter(
      (t) => !form[`q${t.step}`] || String(form[`q${t.step}`]).trim() === ""
    );
    if (missing.length > 0) {
      setError("Please answer all questions before submitting.");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${window.location.origin}/api/others/questionnaire/2`,
        form,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSubmitted(true);
      setNotice({ type: "success", text: "Thank you for submitting your feedback." });
      const cleared = {};
      TASKS.forEach((t) => (cleared[`q${t.step}`] = ""));
      setForm(cleared);
    } catch {
      console.error("Error submitting questionnaire 2");
      setError("An error occurred while submitting. Please try again.");
    }
    setLoading(false);
  };

  const Banner = ({ type, text }) => {
    if (!text) return null;
    const isSuccess = type === "success";
    return (
      <div
        role="alert"
        style={{
          borderRadius: 12,
          padding: "0.9rem 1rem",
          marginBottom: "1rem",
          background: isSuccess ? "#12351d" : "#3b1a1a",
          border: `1px solid ${isSuccess ? "#1e7a3b" : "#7a1e1e"}`,
          color: isSuccess ? "#b7f5c8" : "#ffb8b8",
          fontWeight: 600,
        }}
      >
        {text}
      </div>
    );
  };

  const InlineError = ({ text }) =>
    !text ? null : (
      <div
        role="alert"
        style={{
          marginTop: "0.75rem",
          borderRadius: 10,
          padding: "0.6rem 0.8rem",
          background: "#12351d",
          border: "1px solid #1e7a3b",
          color: "#b7f5c8",
          fontWeight: 600,
          width: "fit-content",
        }}
      >
        {text}
      </div>
    );

  return (
    <MainLayout>
      <div
        className="about-container"
        style={{
          background: "#1a1a1b",
          color: "#fff",
          minHeight: "80vh",
          padding: "2rem",
          borderRadius: "24px",
          maxWidth: "700px",
          margin: "2rem auto",
        }}
      >
        <h1 style={{ color: "#fff", fontSize: "2rem", marginBottom: "1.4rem" }}>
          Extended Platform Feedback
        </h1>

        <Banner type={notice?.type} text={notice?.text} />

        {submitted ? (
          <div style={{ height: 1 }} />
        ) : (
          <form autoComplete="off" onSubmit={handleSubmit}>
            {TASKS.map((t) => (
              <div
                key={t.step}
                style={{
                  background: "#222223",
                  borderRadius: "16px",
                  padding: "1.5rem 1.4rem",
                  marginBottom: "2.5rem",
                  boxShadow: "0 0 14px #18181b99",
                }}
              >
                <div
                  style={{
                    color: "#d7dadc",
                    fontWeight: "bold",
                    fontSize: "1.12rem",
                    marginBottom: "1.3rem",
                  }}
                >
                  {t.step}. {t.title}
                </div>
                <p style={{ marginBottom: "1rem" }}>{t.question}</p>
                <div>
                  {t.isOpen ? (
                    <textarea
                      style={{
                        width: "100%",
                        padding: "0.7em",
                        borderRadius: "8px",
                        border: "1px solid #3a3c3f",
                        background: "#18181b",
                        color: "#fff",
                        minHeight: "70px",
                      }}
                      value={form[`q${t.step}`]}
                      onChange={(e) => handleChange(`q${t.step}`, e.target.value)}
                      placeholder="Your answer..."
                      required
                    />
                  ) : (
                    t.options.map((opt, i) => (
                      <label
                        key={opt}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.7em",
                          marginBottom: "0.5em",
                          cursor: "pointer",
                          color: "#fff",
                          fontSize: "1.06rem",
                          fontWeight: 400,
                          width: "fit-content",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <input
                          type="radio"
                          name={`q${t.step}`}
                          value={opt}
                          checked={form[`q${t.step}`] === opt}
                          onChange={() => handleChange(`q${t.step}`, opt)}
                          required={i === 0}
                          style={{
                            accentColor: "#d7dadc",
                            transform: "scale(1.18)",
                            margin: 0,
                          }}
                        />
                        {opt}
                      </label>
                    ))
                  )}
                </div>
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              style={{
                background: "#2a2a2c",
                color: "#fff",
                padding: "0.7em 2em",
                borderRadius: "12px",
                border: "none",
                fontWeight: "bold",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "1.08rem",
                display: "block",
                margin: "0 auto",
                opacity: loading ? 0.5 : 1,
              }}
            >
              {loading ? "Sending..." : "Submit"}
            </button>
            <InlineError text={error} />
          </form>
        )}
      </div>
    </MainLayout>
  );
}

export { TASKS as EXTENDED_TASKS };
export default Questionnaire2;
