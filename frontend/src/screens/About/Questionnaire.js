import { useState, memo, useCallback } from "react";
import MainLayout from "../Profile/MainLayout";
import axios from "axios";
import { TASKS as EXTENDED_TASKS } from "./Questionnaire2"; 

// Part 1 question groups
const GROUPED_QUESTIONS = [
  {
    group: "Navigation & Finding Features",
    questions: [
      {
        key: "navigation",
        label: "How easy was it to navigate the platform?",
        options: ["Very easy", "Easy", "Average", "Difficult", "Very difficult"],
      },
      {
        key: "easy_find",
        label: "Was it easy to find features (groups, people, posts)?",
        options: ["Very easy", "Easy", "Average", "Difficult", "Very difficult"],
      },
    ],
  },
  {
    group: "Usage & Design",
    questions: [
      {
        key: "would_use",
        label: "Would you use this platform to learn programming?",
        options: ["Definitely", "Probably", "Maybe", "Probably not", "Never"],
      },
      {
        key: "design",
        label: "What do you think of the overall design?",
        options: ["Excellent", "Good", "Average", "Poor", "Terrible"],
      },
    ],
  },
  {
    group: "Open Feedback",
    questions: [
      {
        key: "improve",
        label: "What would you improve or change in the platform?",
        textarea: true,
        placeholder: "Improvements or changes...",
      },
      {
        key: "desired_functionality",
        label: "What functionalities would you like to see in this platform?",
        textarea: true,
        placeholder: "Describe features you'd like...",
      },
      {
        key: "more_feedback",
        label: "Any other suggestions?",
        textarea: true,
        placeholder: "Other suggestions...",
      },
    ],
  },
];

const FLAT_QUESTIONS = GROUPED_QUESTIONS.flatMap((g) => g.questions);

// Part 2 question groups
const GROUPED_TASKS = [
  {
    group: "Content Creation",
    questions: EXTENDED_TASKS.slice(0, 4).map((t) => ({
      key: `q${t.step}`,
      label: t.question,
      options: t.options,
      textarea: t.isOpen,
    })),
  },
  {
    group: "Community Interaction",
    questions: EXTENDED_TASKS.slice(4, 8).map((t) => ({
      key: `q${t.step}`,
      label: t.question,
      options: t.options,
      textarea: t.isOpen,
    })),
  },
  {
    group: "Performance & Feedback",
    questions: EXTENDED_TASKS.slice(8).map((t) => ({
      key: `q${t.step}`,
      label: t.question,
      options: t.options,
      textarea: t.isOpen,
    })),
  },
];

const FLAT_TASKS = GROUPED_TASKS.flatMap((g) => g.questions);

const QuestionCard = memo(function QuestionCard({ question, form, onChange, prefix }) {
  const idx =
    prefix === "part1"
      ? FLAT_QUESTIONS.findIndex((x) => x.key === question.key) + 1
      : FLAT_TASKS.findIndex((x) => x.key === question.key) + 1;

  const value = form[question.key] ?? "";
  const inputId = `${prefix}_${question.key}`;

  return (
    <div
      style={{
        marginBottom: "1.8rem",
        background: "#1d1d1e",
        borderRadius: "10px",
        padding: "1.2rem",
        borderLeft: "3px solid #2a2a2c",
      }}
    >
      <label
        htmlFor={question.textarea ? inputId : undefined}
        style={{
          display: "block",
          color: "#d7dadc",
          fontWeight: "bold",
          marginBottom: "1rem",
          fontSize: "1.05rem",
        }}
      >
        {idx}. {question.label}
      </label>

      {question.textarea ? (
        <textarea
          id={inputId}
          style={{
            width: "100%",
            padding: "0.8em",
            borderRadius: "8px",
            border: "1px solid #3a3c3f",
            background: "#18181b",
            color: "#fff",
            minHeight: "100px",
            fontSize: "1rem",
          }}
          value={value}
          onChange={(e) => onChange(question.key, e.target.value)}
          placeholder={question.placeholder || "Your answer..."}
        />
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.8rem",
            paddingLeft: "0.5rem",
          }}
        >
          {question.options.map((opt) => (
            <label
              key={opt}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.8em",
                cursor: "pointer",
                color: "#fff",
                fontSize: "1.05rem",
              }}
            >
              <input
                type="radio"
                name={`${prefix}_${question.key}`}
                value={opt}
                checked={form[question.key] === opt}
                onChange={() => onChange(question.key, opt)}
                style={{
                  accentColor: "#d7dadc",
                  width: "18px",
                  height: "18px",
                  margin: 0,
                }}
              />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
});
/** ---------------------------------- */

export default function Questionnaire() {
  const [activeTab, setActiveTab] = useState("part1");

  const [notice1, setNotice1] = useState(null);
  const [notice2, setNotice2] = useState(null);
  const [error1, setError1] = useState("");
  const [error2, setError2] = useState("");
  const [submitted1, setSubmitted1] = useState(false);
  const [submitted2, setSubmitted2] = useState(false);

  const [loading1, setLoading1] = useState(false);
  const [loading2, setLoading2] = useState(false);

  const emptyForm1 = Object.fromEntries(FLAT_QUESTIONS.map((q) => [q.key, ""]));
  const [form1, setForm1] = useState(emptyForm1);

  const emptyForm2 = Object.fromEntries(FLAT_TASKS.map((q) => [q.key, ""]));
  const [form2, setForm2] = useState(emptyForm2);

  const handleChange1 = useCallback((key, value) => {
    setNotice1(null);
    setError1("");
    setForm1((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleChange2 = useCallback((key, value) => {
    setNotice2(null);
    setError2("");
    setForm2((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit1 = async (e) => {
    e.preventDefault();
    const missing = Object.entries(form1).filter(([, v]) => !v || String(v).trim() === "");
    if (missing.length > 0) {
      setError1("Please answer all questions before submitting.");
      return;
    }

    setLoading1(true);
    const token = localStorage.getItem("token");
    try {
      await axios.post(`${window.location.origin}/api/others/questionnaire`, form1, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubmitted1(true);
      setNotice1({ type: "success", text: "Thank you for submitting your feedback (Part 1)." });
      setForm1(emptyForm1);
    } catch (err) {
      console.error(err);
      setError1("An error occurred while submitting. Please try again.");
    }
    setLoading1(false);
  };

  const handleSubmit2 = async (e) => {
    e.preventDefault();
    const missing = Object.entries(form2).filter(([, v]) => !v || String(v).trim() === "");
    if (missing.length > 0) {
      setError2("Please answer all questions before submitting.");
      return;
    }

    setLoading2(true);
    const token = localStorage.getItem("token");
    try {
      await axios.post(`${window.location.origin}/api/others/questionnaire/2`, form2, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubmitted2(true);
      setNotice2({ type: "success", text: "Thank you for submitting your feedback (Part 2)." });
      setForm2(emptyForm2);
    } catch (err) {
      console.error(err);
      setError2("An error occurred while submitting. Please try again.");
    }
    setLoading2(false);
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

  const InlineError = ({ text }) => {
    if (!text) return null;
    return (
      <div
        role="alert"
        style={{
          marginTop: "0.75rem",
          borderRadius: 10,
          padding: "0.6rem 0.8rem",
          background: "#3b1a1a",
          border: "1px solid #7a1e1e",
          color: "#ffb8b8",
          fontWeight: 600,
          width: "fit-content",
        }}
      >
        {text}
      </div>
    );
  };

  return (
    <MainLayout>
      <div
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
        {/* Tabs */}
        <div style={{ display: "flex", marginBottom: "1.5rem" }}>
          {["part1", "part2"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: "0.7em",
                background: activeTab === tab ? "#2a2a2c" : "transparent",
                color: "#fff",
                border: "1px solid #2a2a2c",
                cursor: "pointer",
                fontWeight: activeTab === tab ? "bold" : "normal",
              }}
            >
              {tab === "part1" ? "Part 1" : "Part 2"}
            </button>
          ))}
        </div>

        {/* --- Part 1 --- */}
        {activeTab === "part1" && (
          <>
            <h1 style={{ fontSize: "1.8rem", marginBottom: "1.5rem" }}>Part 1: Quick Feedback</h1>

            <Banner type={notice1?.type} text={notice1?.text} />

            {submitted1 ? (
              <div style={{ height: 1 }} />
            ) : (
              <form autoComplete="off" onSubmit={handleSubmit1}>
                {GROUPED_QUESTIONS.map((group) => (
                  <div
                    key={group.group}
                    style={{
                      background: "#222223",
                      borderRadius: "16px",
                      padding: "1.5rem 1.4rem",
                      marginBottom: "2rem",
                    }}
                  >
                    <div
                      style={{
                        color: "#d7dadc",
                        fontWeight: "bold",
                        marginBottom: "1rem",
                        fontSize: "1.1rem",
                      }}
                    >
                      {group.group}
                    </div>
                    {group.questions.map((q) => (
                      <QuestionCard
                        key={q.key}
                        question={q}
                        form={form1}
                        onChange={handleChange1}
                        prefix="part1"
                      />
                    ))}
                  </div>
                ))}
                <button
                  type="submit"
                  disabled={loading1}
                  style={{
                    background: "#2a2a2c",
                    padding: "0.7em 2em",
                    border: "none",
                    borderRadius: "8px",
                    cursor: loading1 ? "not-allowed" : "pointer",
                    fontSize: "1rem",
                    color: "#fff",
                  }}
                >
                  {loading1 ? "Saving…" : "Submit Part 1"}
                </button>
                <InlineError text={error1} />
              </form>
            )}
          </>
        )}

        {/* --- Part 2 --- */}
        {activeTab === "part2" && (
          <>
            <h1 style={{ fontSize: "1.8rem", marginBottom: "1.5rem" }}>Part 2: Extended Feedback</h1>

            <Banner type={notice2?.type} text={notice2?.text} />

            {submitted2 ? (
              <div style={{ height: 1 }} />
            ) : (
              <form autoComplete="off" onSubmit={handleSubmit2}>
                {GROUPED_TASKS.map((group) => (
                  <div
                    key={group.group}
                    style={{
                      background: "#222223",
                      borderRadius: "16px",
                      padding: "1.5rem 1.4rem",
                      marginBottom: "2rem",
                    }}
                  >
                    <div
                      style={{
                        color: "#d7dadc",
                        fontWeight: "bold",
                        marginBottom: "1rem",
                        fontSize: "1.1rem",
                      }}
                    >
                      {group.group}
                    </div>
                    {group.questions.map((q) => (
                      <QuestionCard
                        key={q.key}
                        question={q}
                        form={form2}
                        onChange={handleChange2}
                        prefix="part2"
                      />
                    ))}
                  </div>
                ))}
                <button
                  type="submit"
                  disabled={loading2}
                  style={{
                    background: "#2a2a2c",
                    padding: "0.7em 2em",
                    border: "none",
                    borderRadius: "8px",
                    cursor: loading2 ? "not-allowed" : "pointer",
                    fontSize: "1rem",
                    color: "#fff",
                  }}
                >
                  {loading2 ? "Saving…" : "Submit Part 2"}
                </button>
                <InlineError text={error2} />
              </form>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
