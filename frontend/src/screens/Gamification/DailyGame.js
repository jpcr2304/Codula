import { useEffect, useState } from "react";
import axios from "axios";
import { CheckCircle2, Coins, Gamepad2, RotateCcw, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import MainLayout from "../Profile/MainLayout";
import "./DailyGame.css";

function DailyGame() {
  const { t, i18n } = useTranslation();
  const language = i18n.language?.startsWith("pt") ? "pt" : "en";
  const [game, setGame] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const fetchGame = async () => {
      const token = localStorage.getItem("token");
      setLoadError(false);
      try {
        const { data } = await axios.get(
          `${window.location.origin}/api/users/gamification/daily-game`,
          {
            params: { language },
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setGame(data);
        setSelectedOption(null);
        setFeedback(
          data.completed
            ? {
                type: "completed",
                message: t("gameAlreadyCompleted"),
                explanation: data.explanation,
              }
            : null
        );
      } catch (err) {
        console.error("Error fetching daily game:", err);
        setLoadError(true);
      }
    };

    fetchGame();
  }, [language, t]);

  const submitAnswer = async () => {
    if (selectedOption === null) {
      setFeedback({ type: "warning", message: t("selectAnswerFirst") });
      return;
    }

    const token = localStorage.getItem("token");
    setSubmitting(true);
    try {
      const { data } = await axios.post(
        `${window.location.origin}/api/users/gamification/daily-game/answer`,
        {
          option_index: selectedOption,
          language,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.correct) {
        const earnedReward = data.already_completed ? 0 : data.reward;
        setGame((current) => ({
          ...current,
          completed: true,
          explanation: data.explanation,
        }));
        setFeedback({
          type: "correct",
          message: data.already_completed
            ? t("gameAlreadyCompleted")
            : t("correctAnswer", { reward: earnedReward }),
          explanation: data.explanation,
        });
        window.dispatchEvent(
          new CustomEvent("codula:balance-changed", {
            detail: {
              balance: data.balance,
              dailyGameCompleted: true,
            },
          })
        );
      } else {
        setFeedback({ type: "wrong", message: t("wrongAnswer") });
      }
    } catch (err) {
      console.error("Error submitting daily game answer:", err);
      setFeedback({ type: "warning", message: t("gameLoadError") });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="daily-game-page">
        <section className="daily-game-hero">
          <div className="daily-game-hero-icon">
            <Gamepad2 size={30} />
          </div>
          <div>
            <span className="daily-game-kicker">{t("dailyChallenge")}</span>
            <h1>{t("guessOutput")}</h1>
            <p>{t("howDailyGamesWork")}</p>
          </div>
          <div className="daily-game-prize">
            <Coins size={20} />
            <strong>+{game?.reward ?? 100}</strong>
          </div>
        </section>

        {loadError ? (
          <div className="daily-game-state daily-game-state-error">
            <XCircle size={26} />
            <p>{t("gameLoadError")}</p>
          </div>
        ) : !game ? (
          <div className="daily-game-state">
            <RotateCcw className="daily-game-spinner" size={26} />
            <p>{t("loadingGame")}</p>
          </div>
        ) : (
          <section className="daily-game-card">
            <header className="daily-game-card-header">
              <div>
                <span>{game.language}</span>
                <h2>{game.title}</h2>
              </div>
              <time dateTime={game.date}>{game.date}</time>
            </header>

            <p className="daily-game-prompt">{game.prompt}</p>

            <pre className="daily-game-code">
              <code>{game.code}</code>
            </pre>

            <p className="daily-game-instruction">{t("chooseExactOutput")}</p>
            <div className="daily-game-options" role="radiogroup" aria-label={game.prompt}>
              {game.options.map((option, index) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedOption === index}
                  className={`daily-game-option ${
                    selectedOption === index ? "selected" : ""
                  }`}
                  key={`${game.id}-${index}`}
                  onClick={() => {
                    if (!game.completed) {
                      setSelectedOption(index);
                      setFeedback(null);
                    }
                  }}
                  disabled={game.completed}
                >
                  <span className="daily-game-option-letter">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <code>{option}</code>
                </button>
              ))}
            </div>

            {feedback && (
              <div className={`daily-game-feedback ${feedback.type}`} role="status">
                {feedback.type === "correct" || feedback.type === "completed" ? (
                  <CheckCircle2 size={21} />
                ) : (
                  <XCircle size={21} />
                )}
                <div>
                  <strong>{feedback.message}</strong>
                  {feedback.explanation && <p>{feedback.explanation}</p>}
                </div>
              </div>
            )}

            {!game.completed && (
              <button
                type="button"
                className="daily-game-submit"
                onClick={submitAnswer}
                disabled={submitting}
              >
                {submitting ? t("checkingAnswer") : t("submitAnswer")}
              </button>
            )}
          </section>
        )}
      </div>
    </MainLayout>
  );
}

export default DailyGame;
