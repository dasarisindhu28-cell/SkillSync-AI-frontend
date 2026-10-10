
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import "./App.css";
import Login from "./Login";

const API_URL = "http://localhost:8080/api";
const MAX_FILE_SIZE = 5 * 1024 * 1024;


const NAV_ITEMS = [
  { id: "dashboard", icon: "⌂", label: "Dashboard" },
  { id: "analyze", icon: "▤", label: "Analyze Resume" },
  { id: "recommended", icon: "▣", label: "Recommended Jobs" },
  { id: "history", icon: "◷", label: "Analysis History" },
];


function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
const [authMode, setAuthMode] = useState("login");

const handleLogin = (userData) => {
  setCurrentUser(userData);
  setActiveTab("dashboard");
};
  const [activeTab, setActiveTab] = useState("dashboard");
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("skillsync-theme") === "dark"
  );

  const [resumeFile, setResumeFile] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [skills, setSkills] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const fileInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(
      "skillsync-theme",
      darkMode ? "dark" : "light"
    );
  }, [darkMode]);

  useEffect(() => {
    if (activeTab !== "history") return;

    let cancelled = false;

    async function loadHistory() {
      setHistoryLoading(true);

      try {
        const response = await axios.get(
          `${API_URL}/analysis/history`
        );

        const records = Array.isArray(response.data)
          ? response.data
          : response.data?.records ||
            response.data?.history ||
            response.data?.content ||
            [];

        if (!cancelled) {
          setHistory(Array.isArray(records) ? records : []);
        }
      } catch (err) {
        console.error("Could not load analysis history:", err);

        if (!cancelled) {
          setHistory([]);
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [activeTab, historyRefreshKey]);

  const openTab = (tab) => {
    setActiveTab(tab);

    if (tab === "history") {
      setHistoryRefreshKey((previous) => previous + 1);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetResults = () => {
    setSkills([]);
    setJobs([]);
    setMessage("");
    setError("");
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    resetResults();

    if (!file) {
      setResumeFile(null);
      return;
    }

    const validExtension = /\.(pdf|docx)$/i.test(file.name);

    if (!validExtension) {
      setResumeFile(null);
      setError("Please select a PDF or DOCX resume.");

      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setResumeFile(null);
      setError("Please choose a file smaller than 5 MB.");

      event.target.value = "";
      return;
    }

    setResumeFile(file);
    setResumeText("");
    setMessage(`Selected: ${file.name}`);
  };

  const clearResume = () => {
    setResumeFile(null);
    setResumeText("");
    resetResults();

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const analyzeResumeText = async (text) => {
    const skillResponse = await axios.post(
      `${API_URL}/skills/extract`,
      { resumeText: text }
    );

    const extractedSkills = Array.isArray(skillResponse.data?.skills)
      ? skillResponse.data.skills
      : [];

    setSkills(extractedSkills);

    if (extractedSkills.length === 0) {
      setJobs([]);
      setMessage(
        "Analysis completed, but no recognizable skills were detected. Try adding a technical skills section to your resume."
      );
      return;
    }

    const jobResponse = await axios.post(
      `${API_URL}/jobs/recommend`,
      { skills: extractedSkills }
    );

    const recommendedJobs = Array.isArray(jobResponse.data)
      ? jobResponse.data
      : jobResponse.data?.jobs || jobResponse.data?.recommendations || [];

    setJobs(Array.isArray(recommendedJobs) ? recommendedJobs : []);
    setMessage("Resume analyzed successfully!");
  };

  const handleAnalyze = async () => {
    const pastedText = resumeText.trim();

    if (!resumeFile && !pastedText) {
      setError("Please upload a resume or paste your resume text.");
      return;
    }

    setLoading(true);
    resetResults();

    try {
      let text = pastedText;

      if (resumeFile) {
        const formData = new FormData();
        formData.append("file", resumeFile);

        const uploadResponse = await axios.post(
          `${API_URL}/resume/upload`,
          formData
        );

        text = uploadResponse.data?.resumeText || "";

        if (!text.trim()) {
          throw new Error(
            "No readable text was extracted. Please try another PDF or DOCX file."
          );
        }

        setResumeText(text);

        // Uploaded files are saved by the backend.
        setHistoryRefreshKey((previous) => previous + 1);
      }

      if (!text.trim()) {
        throw new Error("No readable resume text was found.");
      }

      await analyzeResumeText(text);
    } catch (err) {
      console.error("Resume analysis failed:", err);

      const serverMessage =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message;

      setError(
        serverMessage ||
          "Unable to analyze your resume. Please check that the backend and MySQL are running."
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (value) => {
    if (!value) return "Date unavailable";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleString();
  };

  const renderJobCards = () => {
    if (jobs.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-state-icon">✧</div>
          <h3>No job recommendations yet</h3>
          <p>
            Analyze your resume first. SkillSync AI will suggest
            suitable roles, show skill gaps, and provide learning links.
          </p>
          <button
            type="button"
            className="primary-button"
            onClick={() => openTab("analyze")}
          >
            Analyze Resume →
          </button>
        </div>
      );
    }

    return (
      <div className="jobs-grid">
        {jobs.map((job, index) => {
          const title =
            job.jobTitle || job.title || job.role || "Suggested Job";

          const rawScore = Number(job.matchScore ?? job.matchPercentage ?? 0);
          const score = Math.min(100, Math.max(0, rawScore));

          const matchedNames =
            job.matchedSkillNames ||
            job.matchedSkillsList ||
            (Array.isArray(job.matchedSkills) ? job.matchedSkills : []);

          const missingSkills = Array.isArray(job.missingSkills)
            ? job.missingSkills
            : [];

          const resources = Array.isArray(job.learningResources)
            ? job.learningResources
            : [];

          const matchedCount = Array.isArray(matchedNames)
            ? matchedNames.length
            : Number(job.matchedSkills ?? 0);

          const totalRequired =
            job.totalRequiredSkills ??
            (matchedCount + missingSkills.length);

          return (
            <article
              className="job-card"
              key={`${title}-${index}`}
            >
              <div className="job-card-header">
                <span className="job-label">SUGGESTED ROLE</span>
                <span className="match-badge">{score}% match</span>
              </div>

              <h3>{title}</h3>

              <div
                className="match-track"
                aria-label={`${score}% match`}
              >
                <div
                  className="match-fill"
                  style={{ width: `${score}%` }}
                />
              </div>

              <p className="matched-count">
                {matchedCount} of {totalRequired} required skills matched
              </p>

              {Array.isArray(matchedNames) && matchedNames.length > 0 && (
                <div className="job-subsection">
                  <h4>Skills you have</h4>
                  <div className="skills-list compact">
                    {matchedNames.map((skill) => (
                      <span className="skill-chip" key={skill}>
                        ✓ {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {missingSkills.length > 0 ? (
                <div className="job-subsection">
                  <h4>Skills to improve</h4>

                  <div className="missing-skills">
                    {missingSkills.map((skill) => (
                      <span className="missing-chip" key={skill}>
                        + {skill}
                      </span>
                    ))}
                  </div>

                  {resources.length > 0 && (
                    <div className="learning-section">
                      <h4>Learning resources</h4>

                      {resources.map((resource, resourceIndex) => (
                        <div
                          className="learning-resource"
                          key={`${resource.skill || resource.title || "resource"}-${resourceIndex}`}
                        >
                          <div className="resource-info">
                            <strong>
                              {resource.skill || "Learn a new skill"}
                            </strong>
                            <span>
                              {resource.title || "Learning resource"}
                            </span>
                          </div>

                          {resource.url && (
                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="learn-link"
                            >
                              Learn now ↗
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="perfect-match">
                  You have all the listed required skills for this role!
                </div>
              )}
            </article>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`app ${darkMode ? "dark-mode" : ""}`}>
      <header className="app-header">
        <button
          type="button"
          className="brand"
          onClick={() => openTab("dashboard")}
          aria-label="Go to SkillSync AI home"
        >
          <span className="brand-icon">S</span>
          <span className="brand-copy">
            <strong>SkillSync AI</strong>
            <small>Your AI-powered career companion</small>
          </span>
        </button>

        <div className="header-actions">
          <span className="header-badge"></span>
          <button
            type="button"
            className="theme-toggle"
            onClick={() => setDarkMode((previous) => !previous)}
            aria-label={`Switch to ${darkMode ? "light" : "dark"} mode`}
          >
            {darkMode ? "☀ Light mode" : "☾ Dark mode"}
          </button>
          {!currentUser ? (
    <>
      <button
        type="button"
        className="auth-login-button"
        onClick={() => {
          setAuthMode("login");
          setShowAuth(true);
        }}
      >
        Login
      </button>

      <button
        type="button"
        className="auth-register-button"
        onClick={() => {
          setAuthMode("register");
          setShowAuth(true);
        }}
      >
        Create Account
      </button>
    </>
  ) : (
    <>
      <span className="user-greeting">
        Hi, {currentUser.name || currentUser.email}
      </span>

      <button
        type="button"
        className="auth-login-button"
        onClick={() => setCurrentUser(null)}
      >
        Logout
      </button>
    </>
  )}
        </div>
      </header>
      {showAuth && (
  <div
    className="auth-modal-backdrop"
    onClick={(event) => {
      if (event.target === event.currentTarget) {
        setShowAuth(false);
      }
    }}
  >
    <div
      className="auth-modal"
      role="dialog"
      aria-modal="true"
      aria-label={authMode === "login" ? "Login" : "Create account"}
    >
      <button
        type="button"
        className="auth-close-button"
        onClick={() => setShowAuth(false)}
        aria-label="Close authentication"
      >
        ✕
      </button>

      <Login
        mode={authMode}
        onModeChange={setAuthMode}
        onLogin={handleLogin}
      />
    </div>
  </div>
)}

      <nav className="dashboard-nav" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`nav-button ${activeTab === item.id ? "active" : ""}`}
            onClick={() => openTab(item.id)}
            aria-current={activeTab === item.id ? "page" : undefined}
          >
            <span className="nav-icon" aria-hidden="true">
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </nav>

      <main className="main-content">
        {activeTab === "dashboard" && (
          <section className="dashboard-overview">
            <section className="home-hero">
              <span className="home-eyebrow">
                YOUR AI-POWERED CAREER COMPANION
              </span>

              <h1>SkillSync AI</h1>

              <p className="home-tagline">
                Your Skills. Your Growth. Your Dream Career.
              </p>

              <p className="home-description">
                Discover your strengths, identify missing skills, and find
                suitable jobs with personalized learning guidance.
              </p>

              <button
                type="button"
                className="primary-button hero-button"
                onClick={() => openTab("analyze")}
              >
                Get Started <span aria-hidden="true">→</span>
              </button>

              <div className="hero-decoration" aria-hidden="true">
                <span>✦</span>
                <span>✧</span>
                <span>✦</span>
              </div>
            </section>

            <section className="formula-section">
              <div className="section-heading">
                <span className="step-number">01</span>
                <div>
                  <h2>From Skills to Career Goals</h2>
                  <p>Here's how SkillSync AI helps you move forward.</p>
                </div>
              </div>

              <div className="formula-grid">
                <article className="formula-card">
                  <span className="formula-icon">✦</span>
                  <span className="formula-step">STEP 01</span>
                  <h3>Your Skills</h3>
                  <p>
                    Discover the technical skills found in your resume.
                  </p>
                </article>

                <div className="formula-symbol" aria-hidden="true">+</div>

                <article className="formula-card">
                  <span className="formula-icon">◎</span>
                  <span className="formula-step">STEP 02</span>
                  <h3>Missing Skills</h3>
                  <p>
                    Identify skill gaps and explore learning resources.
                  </p>
                </article>

                <div className="formula-symbol" aria-hidden="true">+</div>

                <article className="formula-card">
                  <span className="formula-icon">↗</span>
                  <span className="formula-step">STEP 03</span>
                  <h3>Recommended Jobs</h3>
                  <p>
                    Find roles that match your skills and career potential.
                  </p>
                </article>
              </div>

              <div className="formula-result">
                <span className="formula-result-icon">↓</span>
                <h3>Your Target Career Goal</h3>
                <p>
                  Understand your skills, close the gaps, and discover your
                  next career opportunity.
                </p>
              </div>
            </section>

            <section className="home-navigation">
              <div className="section-heading">
                <span className="step-number">02</span>
                <div>
                  <h2>Explore Your Career Workspace</h2>
                  <p>Choose a feature to continue.</p>
                </div>
              </div>

              <div className="home-navigation-grid">
                <button
                  type="button"
                  className="home-navigation-card"
                  onClick={() => openTab("analyze")}
                >
                  <span className="formula-icon">▤</span>
                  <h3>Analyze Resume</h3>
                  <p>
                    Upload a PDF or DOCX resume to extract your skills.
                  </p>
                  <span className="quick-action-link">Analyze now →</span>
                </button>

                <button
                  type="button"
                  className="home-navigation-card"
                  onClick={() => openTab("recommended")}
                >
                  <span className="formula-icon">▣</span>
                  <h3>Recommended Jobs</h3>
                  <p>
                    Explore job matches, missing skills, and learning links.
                  </p>
                  <span className="quick-action-link">Explore jobs →</span>
                </button>

                <button
                  type="button"
                  className="home-navigation-card"
                  onClick={() => openTab("history")}
                >
                  <span className="formula-icon">◷</span>
                  <h3>Analysis History</h3>
                  <p>
                    Review resume files you previously uploaded and analyzed.
                  </p>
                  <span className="quick-action-link">View history →</span>
                </button>

                <button
                  type="button"
                  className="home-navigation-card"
                  onClick={() => openTab("dashboard")}
                >
                  <span className="formula-icon">⌂</span>
                  <h3>Home</h3>
                  <p>Return to the SkillSync AI landing page.</p>
                  <span className="quick-action-link">Back to home →</span>
                </button>
              </div>
            </section>
          </section>
        )}

        {activeTab === "analyze" && (
          <section className="workspace-section">
            <div className="page-intro">
              <span className="home-eyebrow">CAREER ANALYSIS</span>
              <h1>Analyze Your Resume</h1>
              <p>
                Upload your resume or paste its text to discover your skills
                and potential career matches.
              </p>
            </div>

            <section className="upload-card">
              <div className="section-heading">
                <span className="step-number">01</span>
                <div>
                  <h2>Upload your resume</h2>
                  <p>PDF or DOCX · Maximum 5 MB</p>
                </div>
              </div>

              <div className="upload-area">
                <div className="upload-icon">↑</div>
                <h3>Choose your resume file</h3>
                <p>PDF or Word document</p>

                <input
                  ref={fileInputRef}
                  id="resume-file"
                  className="file-input"
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileChange}
                />

                <label htmlFor="resume-file" className="upload-button">
                  Browse files
                </label>

                {resumeFile && (
                  <div className="selected-file">
                    <span className="file-icon">
                      {resumeFile.name.toLowerCase().endsWith(".pdf")
                        ? "PDF"
                        : "DOCX"}
                    </span>

                    <div className="file-details">
                      <strong>{resumeFile.name}</strong>
                      <span>{(resumeFile.size / 1024).toFixed(1)} KB</span>
                    </div>

                    <button
                      type="button"
                      className="remove-file"
                      onClick={clearResume}
                      aria-label="Remove resume"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>

              <div className="or-divider">
                <span>OR PASTE RESUME TEXT</span>
              </div>

              <textarea
                className="resume-textarea"
                value={resumeText}
                onChange={(event) => {
                  setResumeText(event.target.value);
                  setResumeFile(null);
                  resetResults();

                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
                placeholder="Paste your resume text here, including education, technical skills, projects, and experience..."
                rows={8}
              />

              <button
                type="button"
                className="primary-button analyze-button"
                onClick={handleAnalyze}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    Analyzing your resume...
                  </>
                ) : (
                  "Analyze My Career →"
                )}
              </button>

              {message && (
                <div className="success-message" role="status">
                  ✓ {message}
                </div>
              )}

              {error && (
                <div className="error-message" role="alert">
                  {error}
                </div>
              )}
            </section>

            {skills.length > 0 && (
              <section className="results-section">
                <div className="section-heading">
                  <span className="step-number">02</span>
                  <div>
                    <h2>Your detected skills</h2>
                    <p>
                      We identified {skills.length} skills in your resume.
                    </p>
                  </div>
                </div>

                <div className="skills-list">
                  {skills.map((skill) => (
                    <span className="skill-chip" key={skill}>
                      ✓ {skill}
                    </span>
                  ))}
                </div>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => openTab("recommended")}
                >
                  View Recommended Jobs →
                </button>
              </section>
            )}
          </section>
        )}

        {activeTab === "recommended" && (
          <section className="workspace-section">
            <div className="page-intro">
              <span className="home-eyebrow">PERSONALIZED MATCHES</span>
              <h1>Recommended Jobs</h1>
              <p>
                Explore suggested roles based on your detected skills and
                learn what you can improve.
              </p>
            </div>

            {skills.length > 0 && (
              <div className="recommendation-summary">
                <span className="summary-icon">✦</span>
                <div>
                  <strong>{skills.length} skills analyzed</strong>
                  <p>Your recommendations are based on your current analysis.</p>
                </div>
              </div>
            )}

            {renderJobCards()}

            {skills.length > 0 && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => openTab("analyze")}
              >
                Analyze Another Resume
              </button>
            )}
          </section>
        )}

        {activeTab === "history" && (
          <section className="workspace-section">
            <div className="page-intro">
              <span className="home-eyebrow">YOUR PREVIOUS UPLOADS</span>
              <h1>Analysis History</h1>
              <p>
                Review the resume files saved by the SkillSync AI backend.
              </p>
            </div>

            <div className="history-toolbar">
              <span>
                {history.length} saved {history.length === 1 ? "record" : "records"}
              </span>
              <button
                type="button"
                className="secondary-button small-button"
                onClick={() =>
                  setHistoryRefreshKey((previous) => previous + 1)
                }
                disabled={historyLoading}
              >
                {historyLoading ? "Refreshing..." : "↻ Refresh"}
              </button>
            </div>

            {historyLoading ? (
              <div className="empty-state">
                <span className="spinner" />
                <h3>Loading your history...</h3>
              </div>
            ) : history.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">◷</div>
                <h3>No saved analyses yet</h3>
                <p>
                  Upload a resume file from Analyze Resume. Saved uploads
                  will appear here when the backend returns them.
                </p>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => openTab("analyze")}
                >
                  Upload a Resume →
                </button>
              </div>
            ) : (
              <div className="history-list">
                {history.map((record, index) => {
                  const id = record.id ?? record.analysisId ?? index;
                  const filename =
                    record.resumeFilename ||
                    record.filename ||
                    record.fileName ||
                    "Resume file";

                  const rawSkills =
                    record.extractedSkills ?? record.skills ?? [];

                  let skillItems = [];

                  if (Array.isArray(rawSkills)) {
                    skillItems = rawSkills;
                  } else if (typeof rawSkills === "string") {
                    try {
                      const parsed = JSON.parse(rawSkills);
                      skillItems = Array.isArray(parsed)
                        ? parsed
                        : rawSkills.split(/[,;|]/).map((item) => item.trim());
                    } catch {
                      skillItems = rawSkills
                        .split(/[,;|]/)
                        .map((item) => item.trim())
                        .filter(Boolean);
                    }
                  }

                  const createdAt =
                    record.createdAt ||
                    record.created_at ||
                    record.analysisDate ||
                    record.timestamp;

                  return (
                    <article className="history-card" key={id}>
                      <div className="history-file-icon">PDF</div>

                      <div className="history-details">
                        <h3>{filename}</h3>
                        <p>{formatDate(createdAt)}</p>

                        {skillItems.length > 0 && (
                          <div className="skills-list compact">
                            {skillItems.slice(0, 8).map((skill, skillIndex) => (
                              <span
                                className="skill-chip"
                                key={`${skill}-${skillIndex}`}
                              >
                                {skill}
                              </span>
                            ))}
                            {skillItems.length > 8 && (
                              <span className="more-skills">
                                +{skillItems.length - 8} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <span className="history-status">Saved</span>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <footer className="app-footer">
          <span className="footer-brand">SkillSync AI</span>
          <p>Turn your skills into opportunities.</p>
          <button
            type="button"
            className="footer-home-link"
            onClick={() => openTab("dashboard")}
          >
            Back to Home ↑
          </button>
        </footer>
      </main>
    </div>
  );
}

export default App;
