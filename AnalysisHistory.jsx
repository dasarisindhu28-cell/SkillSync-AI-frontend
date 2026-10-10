
import { useEffect, useState } from "react";
import axios from "axios";

function AnalysisHistory({ refreshKey = 0 }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fetchHistory = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await axios.get(
          "http://localhost:8080/api/analysis/history"
        );

        if (!cancelled) {
          setHistory(response.data || []);
        }
      } catch (err) {
        console.error("Unable to load analysis history:", err);

        if (!cancelled) {
          setError("Unable to load analysis history.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <section className="history-section">
      <div className="section-heading">
        <span className="step-number">04</span>
        <div>
          <h2>Resume Analysis History</h2>
          <p>View your previously analyzed resumes.</p>
        </div>
      </div>

      {loading && <p>Loading analysis history...</p>}

      {!loading && error && (
        <div className="error-message" role="alert">
          {error}
          <button
            type="button"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && history.length === 0 && (
        <p>No analysis records found yet. Upload a resume to get started.</p>
      )}

      {!loading && !error && history.length > 0 && (
        <div className="history-list">
          {history.map((item) => (
            <article className="history-card" key={item.id}>
              <h3>{item.resumeFilename}</h3>

              <p>
                <strong>Analysis ID:</strong> {item.id}
              </p>

              <p>
                <strong>Detected Skills:</strong>{" "}
                {item.extractedSkills || "No skills detected"}
              </p>

              <p>
                <strong>Analyzed on:</strong>{" "}
                {item.createdAt
                  ? new Date(item.createdAt).toLocaleString()
                  : "Not available"}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default AnalysisHistory;
