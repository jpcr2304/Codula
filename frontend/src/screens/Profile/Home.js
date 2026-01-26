import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../Groups/Groups.css";
import MainLayout from "../Profile/MainLayout";
import PostList from "../Post/PostList";
import Select from "react-select";
import { Pencil } from "lucide-react";
import "./Base.css";
import "./Profile.css";
import InfiniteScroll from 'react-infinite-scroll-component';
import { useTranslation } from "react-i18next";

const customSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    minWidth: 170,
    maxWidth: 220,
    backgroundColor: "#2a2a2c",
    color: "#fff",
    borderColor: state.isFocused ? "#555" : "#3a3c3f",
    boxShadow: "none",
    "&:hover": { borderColor: "#666" },
    borderRadius: "8px",
    fontSize: "1rem",
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: "#2a2a2c",
    color: "#fff",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
    marginTop: 4,
    minWidth: 170,
    maxWidth: 220,
    zIndex: 999999,
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isFocused ? "#444" : "#2a2a2c",
    color: "#fff",
    fontWeight: state.isSelected ? "bold" : "normal",
    cursor: "pointer",
  }),
  singleValue: (provided) => ({
    ...provided,
    color: "#fff",
  }),
  dropdownIndicator: (provided) => ({
    ...provided,
    color: "#ccc",
    "&:hover": { color: "#fff" },
  }),
  indicatorSeparator: () => ({ display: "none" }),
  input: (provided) => ({ ...provided, color: "#fff" }),
};

export default function Home() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [currentUser, setCurrentUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [followingIds, setFollowingIds] = useState([]);
  const [groupIds, setGroupIds] = useState([]);

  const [feedFilter, setFeedFilter] = useState("forYou"); 
  const [typeFilter, setTypeFilter] = useState("all");
  const [showResponsibilityModal, setShowResponsibilityModal] = useState(false);

  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 10; 

  const { t } = useTranslation();

  const TYPE_OPTIONS = [
      { value: "all", label: t("all") },
      { value: "snippet", label: t("snippet") },
      { value: "meme", label: t("meme") },
      { value: "tutorial", label: t("tutorial") },
      { value: "research", label: t("research") },
      { value: "question", label: t("question") },
  ];

  const fetchProfile = async () => {
    const { data: me } = await axios.get(
      `${window.location.origin}/api/users/profile`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setCurrentUser({ id: me.id, name: me.name, username: me.username });

    if (!me.accepted_responsibility) {
      setShowResponsibilityModal(true);
    }
  };

  const fetchPostsAndFollows = async (reset = false, currentFilter = feedFilter) => {
    if (reset) {
      setOffset(0);
      setHasMore(true);
    }

    const isFollowing = currentFilter === "following";
    console.log("Fetching posts, following:", isFollowing);

    const { data: newPosts } = await axios.get(
      `${window.location.origin}/api/posts/posts`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          limit,
          offset: reset ? 0 : offset,
          following: isFollowing,
        },
      }
    );

    if (reset) {
      setPosts(newPosts);
      setOffset(limit);
    } else {
      setPosts(prev => [...prev, ...newPosts]);
      setOffset(prevOffset => prevOffset + limit);
    }

    if (newPosts.length < limit) {
      setHasMore(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchProfile().catch(() => navigate("/login"));
    fetchPostsAndFollows(true);
  }, [navigate]);

  const handleLoadMore = () => {
    fetchPostsAndFollows();
  };

  const refreshPosts = () => {
    fetchPostsAndFollows(true, feedFilter); 
  };

  const handleAcceptResponsibility = async () => {
    await axios.post(
      `${window.location.origin}/api/users/accept-responsibility`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setShowResponsibilityModal(false);
  };


  if (!currentUser) return <div>Loading…</div>;

  const visiblePosts = posts.filter((p) => {
    if (typeFilter === "all") return true;
    return p.type === typeFilter;
  });

  const ResponsibilityModal = () => {
    const [btnHover, setBtnHover] = useState(false);

    return (
      <div style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999999
      }}>
        <div style={{
          background: "#1f1f21",
          border: "1px solid #333",
          borderRadius: 12,
          padding: "24px 20px",
          maxWidth: 520,
          width: "92%",
          color: "#eaeaea",
          lineHeight: 1.5,
          boxShadow: "0 10px 30px rgba(0,0,0,0.4)"
        }}>
          <h2 style={{ marginTop: 0, marginBottom: 12 }}>Responsibility Notice</h2>
          <p style={{ marginBottom: 16 }}>
            <strong>Declaration:</strong> I take full responsibility for everything I post here and I will not publish anything illegal, dangerous, offensive, or that violates this platform’s terms.
          </p>
          <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 20 }}>
            By clicking “Accept”, I confirm that I understand and agree with this responsibility.
          </p>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <div style={{ position: "relative", display: "inline-block" }}>
              <button
                className="btn-join"
                title="hover"
                onMouseEnter={() => setBtnHover(true)}
                onMouseLeave={() => setBtnHover(false)}
                onClick={handleAcceptResponsibility}
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };



  return (
    <MainLayout>
      {showResponsibilityModal && <ResponsibilityModal />}
      <section className="posts">
        <div className="post-wrapper">
          <div
            className="create-post-box"
            onClick={() => navigate("/create-post")}
          >
            <span className="create-post-icon">
              <Pencil size={20} />
            </span>
            <span className="create-post-text">{t("createPost")}</span>
          </div>
            <div className="post-filter">
              <button
                className={`filter-button ${feedFilter === "forYou" ? "active" : ""}`}
                onClick={() => {
                  setFeedFilter("forYou");
                  fetchPostsAndFollows(true, "forYou"); 
                }}
              >
                {t("everyone")}
              </button>
              <button
                className={`filter-button ${feedFilter === "following" ? "active" : ""}`}
                onClick={() => {
                  setFeedFilter("following");
                  fetchPostsAndFollows(true, "following"); 
                }}
              >
                {t("following")}
              </button>
            </div>

        </div>

        <div
          style={{
            margin: "1rem 0 1.4rem",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <label
            htmlFor="post-type-filter"
            style={{ color: "#d7dadc", fontSize: "1rem" }}
          >
            {t("type")}:
          </label>
          <Select
            value={TYPE_OPTIONS.find((o) => o.value === typeFilter)}
            onChange={(o) => setTypeFilter(o.value)}
            options={TYPE_OPTIONS}
            styles={customSelectStyles}
            isSearchable={false}
          />
        </div>

        {visiblePosts.length === 0 ? (
          <p style={{ marginBottom: "1rem", color: "white" }}>
            {t("noPostsToDisplay")}
          </p>
        ) : (
          <InfiniteScroll
            dataLength={visiblePosts.length}
            next={handleLoadMore}
            hasMore={hasMore}
            loader={<h4 style={{ color: "white" }}>Loading...</h4>}
            endMessage={<p style={{ color: "white", textAlign: "center" }}><b>No more posts to show</b></p>}
          >
          <PostList
            posts={visiblePosts}
            user={currentUser}
            token={token}
            refreshPosts={refreshPosts}
            setPosts={setPosts}
            previewMode={true}
          />
          </InfiniteScroll>
        )}

      </section>
    </MainLayout>
  );
}
