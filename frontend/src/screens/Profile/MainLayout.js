import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Base.css";
import "./Friends.css";
import "./MainLayout.css";
import appLogo from "../../images/logo.png";
import profilePicDefault from "../../images/profile-pic.png";
import groupDefault from "../../images/group-default.png";
import friend from "../../images/friend.png";
import axios from "axios";
import UserHoverCard from "./UserHoverCard";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  User,
  Home,
  Users,
  LogOut,
  Info,
  FileText,
  Group,
  Pencil,
  Moon,
  Sun,
  Coins,
  Gamepad2,
  Gift,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";


function MainLayout({ children, otherUser = null, showFriends = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [followingList, setFollowingList] = useState([]);
  const [followersList, setFollowersList] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [popularTags, setPopularTags] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const notifRef = useRef();
  const [topGroups, setTopGroups] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [blockedOut, setBlockedOut] = useState(new Set());
  const [blockedIn, setBlockedIn] = useState(new Set());
  const [gamification, setGamification] = useState(null);
  const [showDailyBonus, setShowDailyBonus] = useState(false);
  const [claimingDailyBonus, setClaimingDailyBonus] = useState(false);

  const [language, setLanguage] = useState(localStorage.getItem("lang") || "en");
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "dark"
  );
  const { t, i18n } = useTranslation();

  const changeLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem("lang", lang);
    i18n.changeLanguage(lang);
  };

  const toggleTheme = () => {
    setTheme((currentTheme) =>
      currentTheme === "dark" ? "light" : "dark"
    );
  };

  useEffect(() => {
    localStorage.setItem("lang", language);
  }, [language]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const fetchGamification = async () => {
      try {
        const { data } = await axios.get(
          `${window.location.origin}/api/users/gamification/status`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setGamification(data);
        const dismissedDate = sessionStorage.getItem("dailyBonusDismissedDate");
        setShowDailyBonus(
          data.daily_bonus.available &&
          dismissedDate !== data.daily_bonus.date
        );
      } catch (err) {
        console.error("Error fetching gamification status:", err);
      }
    };

    const handleBalanceChange = (event) => {
      setGamification((current) =>
        current
          ? {
              ...current,
              balance: event.detail.balance,
              daily_game: event.detail.dailyGameCompleted
                ? { ...current.daily_game, completed: true }
                : current.daily_game,
            }
          : current
      );
    };

    fetchGamification();
    window.addEventListener("codula:balance-changed", handleBalanceChange);
    return () =>
      window.removeEventListener("codula:balance-changed", handleBalanceChange);
  }, []);

  const claimDailyBonus = async () => {
    const token = localStorage.getItem("token");
    if (!token || claimingDailyBonus) return;

    setClaimingDailyBonus(true);
    try {
      const { data } = await axios.post(
        `${window.location.origin}/api/users/gamification/daily-bonus/claim`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGamification((current) => ({
        ...current,
        balance: data.balance,
        daily_bonus: {
          ...current.daily_bonus,
          available: false,
        },
      }));
      setShowDailyBonus(false);
    } catch (err) {
      if (err.response?.status === 409) {
        setShowDailyBonus(false);
      } else {
        console.error("Error claiming daily bonus:", err);
      }
    } finally {
      setClaimingDailyBonus(false);
    }
  };

  const dismissDailyBonus = () => {
    if (gamification?.daily_bonus.date) {
      sessionStorage.setItem(
        "dailyBonusDismissedDate",
        gamification.daily_bonus.date
      );
    }
    setShowDailyBonus(false);
  };


  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    const fetchBlocks = async () => {
      try {
        const [outRes, inRes] = await Promise.all([
          axios.get(`${window.location.origin}/api/users/my-blocked`, { headers }), 
          axios.get(`${window.location.origin}/api/users/blocked-me`, { headers })
        ]);
        setBlockedOut(new Set(outRes.data.map(u => Number(u.id ?? u.user_id))));
        setBlockedIn(new Set(inRes.data.map(u => Number(u.id ?? u.user_id))));
      } catch (err) {
        console.error("Error fetching block lists:", err);
      }
    };
    fetchBlocks();
  }, []);

  const isBlockedEither = (u) =>
    blockedOut.has(Number(u.id)) || blockedIn.has(Number(u.id)) ||
    u.blocked || u.blocked_me || u.isBlocked || u.blockedMe;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    axios
      .get(`${window.location.origin}/api/users/top-followed`, { headers })
      .then((res) => setTopUsers(res.data))
      .catch((err) => console.error("Erro ao buscar top users:", err));
  }, []);

  useEffect(() => {
    const fetchTopGroups = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await axios.get(`${window.location.origin}/api/users/top-groups`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTopGroups(res.data);
      } catch (err) {
        console.error("Erro ao buscar top groups:", err);
      }
    };
    fetchTopGroups();
  }, []);

  useEffect(() => {
    const fetchMyGroups = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await axios.get(`${window.location.origin}/api/users/my-groups`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMyGroups(res.data);
      } catch (err) {
        console.error("Erro ao buscar grupos do user:", err);
      }
    };
    fetchMyGroups();
  }, []);


  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return navigate("/login");
    axios
      .get(`${window.location.origin}/api/users/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => setUser(data))
      .catch(() => navigate("/login"));
  }, [navigate]);

  const fetchNotifications = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    const res = await axios.get(
      `${window.location.origin}/api/others/notifications`,
      { headers }
    );
    setNotifications(res.data);
    setNotifCount(res.data.filter(n => n.read === 0).length);
  };

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const fetchSearchResults = async () => {
      const token = localStorage.getItem("token");
      if (!token || searchTerm.trim() === "") {
        setSearchResults([]);
        return;
      }
      try {
        const res = await axios.get(`${window.location.origin}/api/users/search?query=${searchTerm}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSearchResults(res.data);
        setShowResults(true);
      } catch (err) {
        console.error("Search failed:", err);
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchSearchResults();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  useEffect(() => {
    if (!showFriends || !otherUser) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    const fetchOtherFriends = async () => {
      try {
        const [ { data: following }, { data: followers } ] = await Promise.all([
          axios.get(
            `${window.location.origin}/api/users/users/${otherUser.username}/following`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
          axios.get(
            `${window.location.origin}/api/users/users/${otherUser.username}/followers`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
        ]);
        setFollowingList(following);
        setFollowersList(followers);
      } catch (err) {
        console.error("Error searching for users:", err);
      }
    };

    fetchOtherFriends();
  }, [showFriends, otherUser]);

  useEffect(() => {
    const fetchTopUsers = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await axios.get(`${window.location.origin}/api/users/top-followed`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTopUsers(res.data);
      } catch (err) {
        console.error("Erro ao buscar top users:", err);
      }
    };
    fetchTopUsers();
  }, []);

  useEffect(() => {
    const fetchTopTags = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await axios.get(`${window.location.origin}/api/posts/top-tags`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPopularTags(res.data);
      } catch (err) {
        console.error("Erro ao buscar tags populares:", err);
      }
    };
    fetchTopTags();
  }, []);

  useEffect(() => {
    function onClickOutside(e) {
      if (
        notifRef.current &&
        !notifRef.current.contains(e.target)
      ) {
        setShowNotif(false);
      }
    }
    if (showNotif) {
      document.addEventListener("mousedown", onClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [showNotif]);

  const handleBellClick = async () => {
    const opening = !showNotif;
    setShowNotif(opening);

    if (opening) {
      const token = localStorage.getItem("token");
      await axios.post(
        `${window.location.origin}/api/others/notifications/mark-all-read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications((notifs) => notifs.map(n => ({ ...n, read: 1 })));
      setNotifCount(0);
    }
  };

  function getNotificationText(n) {
    switch (n.type) {
      case "like":
        return n.comment_id ? t("likedYourComment") : t("likedYourPost");
      case "comment":
        return t("commentedOnYourPost");
      case "reply":
        return t("repliedToYourComment");
      case "follow":
        return t("followedYou");
      default:
        return t("didSomething");
    }
  }


  const displayUser = user;
  const currentLevel = Math.floor(user?.xp / 100);
  const xpPercentage = user?.xp % 100;
  const isHome = location.pathname === "/home";

  if (!user) return <div>Loading...</div>;

  return (
    <>
      {/* TOPBAR */}
      <header className="topbar">
        <div
          className="navbar-left logo-container"
          onClick={() => navigate("/home")}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <img src={appLogo} alt="App Logo" className="app-logo" />
          <span className="app-name">
            Codula
          </span>
        </div>

        <div className="search-container">
          <input
            className="search-input"
            type="text"
            placeholder={t("search")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
          />

          {showResults && searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.some(r => r.type === "group") && (
                <>
                  <div className="search-section-title">Groups</div>
                  {searchResults
                    .filter(r => r.type === "group")
                    .map(item => (
                      <div
                        key={`group-${item.id}`}
                        className="search-result-item"
                        onClick={() => {
                          navigate(`/groups/${item.id}`);
                          setSearchTerm("");
                          setShowResults(false);
                        }}
                      >
                        <img src={item.image_url || profilePicDefault} alt="Avatar" className="search-avatar" />
                        <div className="search-user-text">
                          <span className="search-name">{item.name}</span>
                        </div>
                      </div>
                    ))}
                </>
              )}

              {searchResults.some(r => r.type === "user") && (
                <>
                  <div className="search-section-title">People</div>
                  {searchResults
                    .filter(r => r.type === "user")
                    .map(item => (
                      <div
                        key={`user-${item.id}`}
                        className="search-result-item"
                        onClick={() => {
                          navigate(`/users/${item.username}`);
                          setSearchTerm("");
                          setShowResults(false);
                        }}
                      >
                        <img src={item.image_url || profilePicDefault} alt="Avatar" className="search-avatar" />
                        <div className="search-user-text">
                          <span className="search-name">{item.name}</span>
                          <span className="search-username">@{item.username}</span>
                        </div>
                      </div>
                    ))}
                </>
              )}
            </div>
          )}
        </div>

        <div className="navbar-right">
          <button
            type="button"
            className="currency-pill"
            onClick={() =>
              gamification?.daily_bonus.available
                ? setShowDailyBonus(true)
                : navigate("/daily-game")
            }
            aria-label={
              gamification?.daily_bonus.available
                ? t("dailyBonusAvailable")
                : t("currencyBalance")
            }
            title={
              gamification?.daily_bonus.available
                ? t("dailyBonusAvailable")
                : t("currencyBalance")
            }
          >
            <Coins size={18} aria-hidden="true" />
            <span>{gamification?.balance ?? 0}</span>
            {gamification?.daily_bonus.available && (
              <span className="currency-claim-dot" aria-hidden="true" />
            )}
          </button>

          <div className="topbar-preferences">
            <div className="language-switch" role="group" aria-label="Language">
              <button
                type="button"
                className={`language-option ${language === "pt" ? "active" : ""}`}
                onClick={() => changeLanguage("pt")}
                aria-pressed={language === "pt"}
              >
                PT
              </button>
              <button
                type="button"
                className={`language-option ${language === "en" ? "active" : ""}`}
                onClick={() => changeLanguage("en")}
                aria-pressed={language === "en"}
              >
                EN
              </button>
            </div>

            <button
              type="button"
              className={`theme-toggle ${theme === "light" ? "is-light" : "is-dark"}`}
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              <Sun className="theme-toggle__track-icon theme-toggle__sun" size={14} />
              <Moon className="theme-toggle__track-icon theme-toggle__moon" size={14} />
              <span className="theme-toggle__thumb">
                <Sun className="theme-toggle__thumb-sun" size={15} />
                <Moon className="theme-toggle__thumb-moon" size={15} />
              </span>
            </button>
          </div>
          <div className="nav-icons">
            <div className="notif-container" ref={notifRef}>
              <button className="icon-btn" onClick={handleBellClick}>
                <Bell size={22} />
                {notifCount > 0 && (
                  <div className="notif-count">{notifCount > 99 ? "99+" : notifCount}</div>
                )}
              </button>

              {showNotif && (
                <div className="notif-dropdown">
                  {notifications.length === 0 ? (
                    <p className="notif-empty">{t("noNotifications")}</p>
                  ) : (
                    notifications.map((n) => {
                      const user = n.actor || {};
                      return (
                        <div
                          key={n.id}
                          className="notif-item"
                          onClick={async () => {
                            if (n.type === "follow" && n.actor?.username) {
                              navigate(`/users/${n.actor.username}`);
                            } else if (n.post_id) {
                              navigate(`/posts/${n.post_id}`);
                            }
                            setShowNotif(false);
                          }}
                        >
                          <img
                            src={user.image_url || profilePicDefault}
                            alt=""
                            className="notif-avatar"
                          />
                          <div className="notif-text">
                            <p>{n.actor.name} {getNotificationText(n)}</p>
                            <div className="notif-time">
                              {n.created_at
                                ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true })
                                : ""}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="user-info">
            <img
              src={user.image_url || user.avatar_url || profilePicDefault}
              alt="Profile"
              className="user-pic"
            />
            <div className="user-text">
              <p className="user-name">{user.name}</p>
              <p className="user-username">@{user.username}</p>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div className="profile-container">
        {/* LEFT SIDEBAR */}
        <aside className="sidebar">
          <div className="profile-section">
            <img
              src={
                user.avatar_url ||
                user.image_url ||
                profilePicDefault
              }
              alt="Profile"
              className="profile-pic"
            />
            <h3>{user.name}</h3>
            <p>@{user.username}</p>
            <div className="level-display">
              <div className="level-row">
                <div className="circle red">{currentLevel}</div>
                <div className="xp-bar-container">
                  <div className="xp-bar">
                    <div
                      className="xp-fill"
                      style={{ width: `${xpPercentage}%` }}
                    />
                  </div>
                </div>
                <div className="circle blue">{currentLevel + 1}</div>
              </div>
              {/* <div className="xp-text">{user.xp} XP</div> */}
            </div>
          </div>
          <div className="menu-section">
            <h4 className="menu-title">{t("actions")}</h4>
            <div className="menu-item" onClick={() => navigate("/create-post")}>
              <span className="icon-box"><Pencil size={18} /></span>
              <span>{t("createPost")}</span>
            </div>
            <h4 className="menu-title">{t("explorePanel")}</h4>
            <div className="menu-item" onClick={() => navigate("/home")}>
              <span className="icon-box"><Home size={18} /></span>
              <span>{t("home")}</span>
            </div>
            <div className="menu-item" onClick={() => navigate("/profile")}>
              <span className="icon-box"><User size={18} /></span>
              <span>{t("profile")}</span>
            </div>
            <div className="menu-item" onClick={() => navigate("/people")}>
              <span className="icon-box"><Users size={18} /></span>
              <span>{t("people")}</span>
            </div>
            <div className="menu-item" onClick={() => navigate("/groups")}>
              <span className="icon-box"><Group size={18} /></span>
              <span>{t("groups")}</span>
            </div>
            <div className="menu-item" onClick={() => navigate("/daily-game")}>
              <span className="icon-box"><Gamepad2 size={18} /></span>
              <span>{t("dailyGame")}</span>
              {gamification && !gamification.daily_game.completed && (
                <span className="menu-new-dot" aria-label={t("newDailyGame")} />
              )}
            </div>

            <div className="menu-item" onClick={() => {
              localStorage.removeItem("token");
              navigate("/login");
            }}>
              <span className="icon-box"><LogOut size={18} /></span>
              <span>{t("logOut")}</span>
            </div>

            <h4 className="menu-title">{t("about")}</h4>

            <div className="menu-item" onClick={() => navigate("/about")}>
              <span className="icon-box"><Info size={18} /></span>
              <span>{t("about")}</span>
            </div>
            <div className="menu-item" onClick={() => navigate("/questionnaire")}>
              <span className="icon-box"><FileText size={18} /></span>
              <span>{t("feedback")}</span>
            </div>

          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main>
          {children}
        </main>

        {/* RIGHT SIDEBAR */}
        <aside className="right-sidebar">
          <div className="suggestions">
            <h4 className="right-title">{t("peopleYouMayKnow")}</h4>
            {topUsers
              .filter(
                u =>
                  !u.is_self &&
                  !u.following &&
                  !isBlockedEither(u) 
              )
              .slice(0, 3)
              .map(user => (
                <UserHoverCard
                  key={user.username}
                  username={user.username}
                  onFollowChange={(userId, nowFollowing) => {
                    setTopUsers(us =>
                      us.map(u =>
                        u.id === userId
                          ? { ...u, following: nowFollowing, followers_count: u.followers_count + (nowFollowing ? 1 : -1) }
                          : u
                      )
                    );
                  }}
                >
                  <div
                    className="suggestion-item"
                    onClick={() => navigate(`/users/${user.username}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <img
                      src={user.image_url || friend}
                      alt="Avatar"
                      className="suggestion-avatar"
                    />
                    <div className="suggestion-info">
                      <span className="suggestion-name">{user.name}</span>
                      <span className="suggestion-followers">
                        {user.followers_count} {t("followers")}
                      </span>
                    </div>
                  </div>
                </UserHoverCard>
              ))}

          </div>

          <div className="tags">
            <h4 className="right-title">{t("popularTags")}</h4>
            {popularTags.slice(0, 3).map((tag) => (
              <div
                key={tag.tag}
                className="tag-item"
                onClick={() => navigate(`/tags/${tag.tag}`)}
                style={{ cursor: "pointer" }}
              >
                <span className="tag-title">#{tag.tag}</span>
                <span className="tag-postcount">{tag.posts}+ posts</span>
              </div>
            ))}
          </div>

          <div className="suggestions">
            <h4 className="right-title">{t("popularGroups")}</h4>
              {topGroups
                .filter(
                  group =>
                    !myGroups.some(g => g.id === group.id) 
                )
                .slice(0, 3)
                .map((group) => (
                  <div
                    key={group.id}
                    className="suggestion-item"
                    onClick={() => navigate(`/groups/${group.id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <img
                      src={group.image_url || groupDefault}
                      alt="Group"
                      className="suggestion-avatar"
                    />
                    <div className="suggestion-info">
                      <span className="suggestion-name">{group.name}</span>
                      <span className="suggestion-followers">
                        {group.members_count} {t("members")}
                      </span>
                    </div>
                  </div>
                ))}

          </div>

        </aside>
      </div>

      {showDailyBonus && gamification?.daily_bonus.available && (
        <div className="daily-bonus-backdrop" role="presentation">
          <section
            className="daily-bonus-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="daily-bonus-title"
          >
            <button
              type="button"
              className="daily-bonus-close"
              onClick={dismissDailyBonus}
              aria-label={t("claimLater")}
            >
              <X size={20} />
            </button>
            <div className="daily-bonus-icon">
              <Gift size={34} />
            </div>
            <p className="daily-bonus-eyebrow">{t("dailyBonus")}</p>
            <h2 id="daily-bonus-title">{t("dailyBonusTitle")}</h2>
            <p className="daily-bonus-description">{t("dailyBonusDescription")}</p>
            <div className="daily-bonus-reward">
              <Coins size={22} />
              <strong>+{gamification.daily_bonus.reward}</strong>
              <span>{t("points")}</span>
            </div>
            <button
              type="button"
              className="daily-bonus-claim"
              onClick={claimDailyBonus}
              disabled={claimingDailyBonus}
            >
              {claimingDailyBonus ? t("claiming") : t("claimReward")}
            </button>
          </section>
        </div>
      )}
    </>
  );
}

export default MainLayout;
