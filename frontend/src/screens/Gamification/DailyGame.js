import { useEffect, useState } from "react";
import axios from "axios";
import {
  ArrowLeft,
  CheckCircle2,
  Coins,
  Gamepad2,
  Play,
  RotateCcw,
  Trophy,
  XCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import MainLayout from "../Profile/MainLayout";
import profilePicDefault from "../../images/profile-pic.png";
import "./DailyGame.css";

function DailyGame() {
  const { t, i18n } = useTranslation();
  const language = i18n.language?.startsWith("pt") ? "pt" : "en";
  const [screen, setScreen] = useState("overview");
  const [game, setGame] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [submittedOption, setSubmittedOption] = useState(null);
  const [correctOption, setCorrectOption] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const fetchPageData = async () => {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      setLoadError(false);

      try {
        const [gameResponse, leaderboardResponse] = await Promise.all([
          axios.get(
            `${window.location.origin}/api/users/gamification/daily-game`,
            { params: { language }, headers }
          ),
          axios.get(
            `${window.location.origin}/api/users/gamification/leaderboard`,
            { headers }
          ),
        ]);

        const gameData = gameResponse.data;
        setGame(gameData);
        setLeaderboard(leaderboardResponse.data);
        setSelectedOption(gameData.selected_option);
        setSubmittedOption(gameData.selected_option);
        setCorrectOption(gameData.correct_option);

        if (gameData.attempted) {
          setFeedback({
            type: gameData.was_correct ? "correct" : "wrong",
            message: gameData.was_correct
              ? t("gameAlreadyCompleted")
              : t("wrongAnswer"),
            explanation: gameData.explanation,
          });
        } else {
          setFeedback(null);
        }
      } catch (err) {
        console.error("Error fetching daily game page:", err);
        setLoadError(true);
      }
    };

    fetchPageData();
  }, [language, t]);

  const refreshLeaderboard = async () => {
    const token = localStorage.getItem("token");
    try {
      const { data } = await axios.get(
        `${window.location.origin}/api/users/gamification/leaderboard`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setLeaderboard(data);
    } catch (err) {
      console.error("Error refreshing leaderboard:", err);
    }
  };

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

      setSubmittedOption(data.selected_option);
      setCorrectOption(data.correct_option);
      setGame((current) => ({
        ...current,
        completed: true,
        attempted: true,
        was_correct: data.correct,
        selected_option: data.selected_option,
        correct_option: data.correct_option,
        explanation: data.explanation,
      }));
      setFeedback({
        type: data.correct ? "correct" : "wrong",
        message: data.correct
          ? data.already_completed
            ? t("gameAlreadyCompleted")
            : t("correctAnswer", { reward: data.reward })
          : t("wrongAnswer"),
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
      refreshLeaderboard();
    } catch (err) {
      console.error("Error submitting daily game answer:", err);
      setFeedback({ type: "warning", message: t("gameLoadError") });
    } finally {
      setSubmitting(false);
    }
  };

  const optionClassName = (index) => {
    const classes = ["daily-game-option"];

    if (!game?.attempted && selectedOption === index) {
      classes.push("selected");
    }
    if (game?.attempted && correctOption === index) {
      classes.push("correct-answer");
    }
    if (
      game?.attempted &&
      submittedOption === index &&
      correctOption !== index
    ) {
      classes.push("wrong-answer");
    }

    return classes.join(" ");
  };

  const leaderboardRows = leaderboard?.entries || [];

  return (
    <MainLayout>
      <div className="daily-game-page">
        {screen === "overview" ? (
          <>
            <section className="daily-game-intro">
              <Gamepad2 className="daily-game-intro-icon" size={38} />
              <div className="daily-game-intro-copy">
                <span className="daily-game-kicker">{t("dailyChallenge")}</span>
                <h1>{t("guessOutput")}</h1>
                <p>{t("dailyGameIntro")}</p>
              </div>
              <div className="daily-game-intro-actions">
                <span className="daily-game-prize">
                  <Coins size={19} />
                  +{game?.reward ?? 100}
                </span>
                <button
                  type="button"
                  className="daily-game-play"
                  onClick={() => setScreen("exercise")}
                  disabled={!game || loadError}
                >
                  <Play size={18} fill="currentColor" />
                  {game?.attempted ? t("viewChallenge") : t("playChallenge")}
                </button>
              </div>
            </section>

            {loadError && (
              <div className="daily-game-state daily-game-state-error">
                <XCircle size={24} />
                <p>{t("gameLoadError")}</p>
              </div>
            )}

            {!game && !loadError && (
              <div className="daily-game-state">
                <RotateCcw className="daily-game-spinner" size={24} />
                <p>{t("loadingGame")}</p>
              </div>
            )}

            <section className="daily-game-leaderboard">
              <header className="daily-game-leaderboard-title">
                <Trophy size={22} />
                <div>
                  <h2>{t("leaderboard")}</h2>
                  <p>{t("leaderboardDescription")}</p>
                </div>
              </header>

              <div className="leaderboard-table" role="table" aria-label={t("leaderboard")}>
                <div className="leaderboard-header" role="row">
                  <span role="columnheader">{t("position")}</span>
                  <span role="columnheader">{t("player")}</span>
                  <span role="columnheader">{t("points")}</span>
                </div>

                {leaderboardRows.map((entry, index) => {
                  const previousRank =
                    index > 0 ? leaderboardRows[index - 1].rank : null;
                  const hasGap =
                    previousRank !== null && entry.rank - previousRank > 1;

                  return (
                    <div key={entry.user_id}>
                      {hasGap && (
                        <div className="leaderboard-gap" aria-hidden="true">
                          •••
                        </div>
                      )}
                      <div
                        className={`leaderboard-row ${
                          entry.is_current_user ? "current-user" : ""
                        }`}
                        role="row"
                      >
                        <strong className="leaderboard-rank" role="cell">
                          #{entry.rank}
                        </strong>
                        <div className="leaderboard-user" role="cell">
                          <img
                            src={entry.image_url || profilePicDefault}
                            alt=""
                          />
                          <div>
                            <strong>
                              {entry.name}
                              {entry.is_current_user && (
                                <span className="leaderboard-you">{t("you")}</span>
                              )}
                            </strong>
                            <span>@{entry.username}</span>
                          </div>
                        </div>
                        <span className="leaderboard-points" role="cell">
                          <Coins size={16} />
                          {entry.balance}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        ) : (
          <section className="daily-game-exercise">
            <button
              type="button"
              className="daily-game-back"
              onClick={() => setScreen("overview")}
            >
              <ArrowLeft size={18} />
              {t("backToRanking")}
            </button>

            {!game ? (
              <div className="daily-game-state">
                <RotateCcw className="daily-game-spinner" size={24} />
                <p>{t("loadingGame")}</p>
              </div>
            ) : (
              <>
                <header className="daily-game-exercise-header">
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
                <div
                  className="daily-game-options"
                  role="radiogroup"
                  aria-label={game.prompt}
                >
                  {game.options.map((option, index) => (
                    <button
                      type="button"
                      role="radio"
                      aria-checked={selectedOption === index}
                      className={optionClassName(index)}
                      key={`${game.id}-${index}`}
                      onClick={() => {
                        if (!game.attempted) {
                          setSelectedOption(index);
                          setFeedback(null);
                        }
                      }}
                      disabled={game.attempted}
                    >
                      <span className="daily-game-option-letter">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <code>{option}</code>
                      {game.attempted && correctOption === index && (
                        <CheckCircle2
                          className="daily-game-answer-icon"
                          size={20}
                          aria-label={t("correctAnswerLabel")}
                        />
                      )}
                      {game.attempted &&
                        submittedOption === index &&
                        correctOption !== index && (
                          <XCircle
                            className="daily-game-answer-icon"
                            size={20}
                            aria-label={t("yourAnswerLabel")}
                          />
                        )}
                    </button>
                  ))}
                </div>

                {feedback && (
                  <div className={`daily-game-feedback ${feedback.type}`} role="status">
                    {feedback.type === "correct" ? (
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

                {!game.attempted && (
                  <button
                    type="button"
                    className="daily-game-submit"
                    onClick={submitAnswer}
                    disabled={submitting}
                  >
                    {submitting ? t("checkingAnswer") : t("submitAnswer")}
                  </button>
                )}
              </>
            )}
          </section>
        )}
      </div>
    </MainLayout>
  );
}

export default DailyGame;
