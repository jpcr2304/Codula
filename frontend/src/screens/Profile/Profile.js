import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import MainLayout from "./MainLayout";
import PostList from "../Post/PostList";
import "./Base.css";
import "./Profile.css";
import "../Groups/GroupPage.css";
import myImage from "../../images/profile-pic.png";
import InfiniteScroll from 'react-infinite-scroll-component';
import { useTranslation } from "react-i18next";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);
  const [repliedPosts, setRepliedPosts] = useState([]);
  const [view, setView] = useState("posts"); 
  const [modalType, setModalType] = useState(null); 
  const [modalUsers, setModalUsers] = useState([]);
  const [loadingModal, setLoadingModal] = useState(false);
  const [errorModal, setErrorModal] = useState(null);
  const [modalSearch, setModalSearch] = useState("");
  

  const [offsetPosts, setOffsetPosts] = useState(0);
  const [offsetLikes, setOffsetLikes] = useState(0);
  const [offsetReplies, setOffsetReplies] = useState(0);

  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [hasMoreLikes, setHasMoreLikes] = useState(true);
  const [hasMoreReplies, setHasMoreReplies] = useState(true);

  const [bookmarkedPosts, setBookmarkedPosts] = useState([]);
  const [offsetBookmarks, setOffsetBookmarks] = useState(0);
  const [hasMoreBookmarks, setHasMoreBookmarks] = useState(true);


  const limit = 10;


  const token  = localStorage.getItem("token");
  const origin = window.location.origin;

  
  const { t } = useTranslation();

  const fetchProfile = async () => {
    const { data: profile } = await axios.get(`${origin}/api/users/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setUser({
      ...profile,
      profilePic: profile.image_url || myImage,
    });
  };

  const fetchBookmarks = async (reset = false) => {
    const currentOffset = reset ? 0 : offsetBookmarks;

    const { data: newBookmarks } = await axios.get(
      `${origin}/api/posts/me/saved`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit, offset: currentOffset },
      }
    );

    if (reset) {
      setBookmarkedPosts(newBookmarks);
    } else {
      setBookmarkedPosts(prev => [...prev, ...newBookmarks]);
    }

    setOffsetBookmarks(currentOffset + limit);
    setHasMoreBookmarks(newBookmarks.length === limit);
  };


  const fetchPosts = async (reset = false) => {
    const currentOffset = reset ? 0 : offsetPosts;

    const { data: newPosts } = await axios.get(
      `${origin}/api/posts/me/posts`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit, offset: currentOffset },
      }
    );

    if (reset) {
      setPosts(newPosts);
    } else {
      setPosts(prev => [...prev, ...newPosts]);
    }

    setOffsetPosts(currentOffset + limit);
    setHasMorePosts(newPosts.length === limit);
  };

  const fetchLikes = async (reset = false) => {
    const currentOffset = reset ? 0 : offsetLikes;

    const { data: newLikes } = await axios.get(
      `${origin}/api/posts/me/likes`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit, offset: currentOffset },
      }
    );

    if (reset) {
      setLikedPosts(newLikes);
    } else {
      setLikedPosts(prev => [...prev, ...newLikes]);
    }

    setOffsetLikes(currentOffset + limit);
    setHasMoreLikes(newLikes.length === limit);
  };

  const fetchReplies = async (reset = false) => {
    const currentOffset = reset ? 0 : offsetReplies;

    const { data: newReplies } = await axios.get(
      `${origin}/api/posts/me/replies`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit, offset: currentOffset },
      }
    );

    if (reset) {
      setRepliedPosts(newReplies);
    } else {
      setRepliedPosts(prev => [...prev, ...newReplies]);
    }

    setOffsetReplies(currentOffset + limit);
    setHasMoreReplies(newReplies.length === limit);
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    fetchProfile().catch(() => navigate("/login"));
    fetchPosts(true);
    fetchLikes(true);
    fetchReplies(true);
    fetchBookmarks(true);
  }, []);

  useEffect(() => {
    if (!token) return;

    if (view === "posts") {
      fetchPosts(true);     
    } else if (view === "likes") {
      fetchLikes(true);
    } else if (view === "replies") {
      fetchReplies(true);
    } else if (view === "bookmarks") {
      fetchBookmarks(true);
    }
  }, [view]);


  const openModal = async (type) => {
    if (!user) return;
    setModalType(type);
    setModalSearch("");
    setLoadingModal(true);
    setErrorModal(null);

    try {
      const url =
        type === "followers"
          ? `${origin}/api/users/users/${user.username}/followers`
          : `${origin}/api/users/users/${user.username}/following`;
      const { data: list } = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      let enriched;
      if (type === "followers") {
        const { data: myFollowing } = await axios.get(
          `${origin}/api/users/my-following`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const myFollowingIds = new Set(myFollowing.map((u) => u.id));
        enriched = list.map((u) => ({
          ...u,
          following: myFollowingIds.has(u.id),
        }));
      } else {
        enriched = list.map((u) => ({ ...u, following: true }));
      }

      setModalUsers(enriched);
    } catch (err) {
      console.error(err);
      setErrorModal("Error loading list.");
    } finally {
      setLoadingModal(false);
    }
  };

  const handleFollowToggle = async (targetId, isFollowing) => {
    try {
      const url = isFollowing
        ? `${origin}/api/users/unfollow/${targetId}`
        : `${origin}/api/users/follow/${targetId}`;
      await axios.post(url, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setModalUsers((arr) =>
        arr.map((u) =>
          u.id === targetId ? { ...u, following: !isFollowing } : u
        )
      );
      setUser((u) => ({
        ...u,
        following_count: u.following_count + (isFollowing ? -1 : +1),
      }));
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) return <div>Loading...</div>;

  return (
    <MainLayout>
      <main>
        <section className="group-banner-wrapper">
          <div
            className="group-banner-image"
            style={{
              backgroundImage: `url(${
                user.banner_url ||
                "https://images8.alphacoders.com/774/774361.jpg"
              })`,
            }}
          />
          <div className="group-header-bar">
            <div className="group-avatar-container">
              <img
                className="group-avatar-circle"
                src={user.profilePic}
                alt={user.name}
                onError={(e) => { e.target.src = myImage; }}
              />
            </div>
            <div className="group-title-section title-bar">
              <div>
                <h1>{user.name}</h1>
                <p>@{user.username}</p>
                <div className="follow-stats">
                  <span onClick={() => openModal("followers")} className="clickable">
                    <strong>{user.followers_count}</strong> {t("followers")}
                  </span>{" "}
                  •{" "}
                  <span onClick={() => openModal("following")} className="clickable">
                    <strong>{user.following_count}</strong> {t("following")}
                  </span>
                </div>
              </div>
              <button className="btn-leave" onClick={() => navigate("/edit-profile")}>
                ✎ {t("edit_profile")}
              </button>
            </div>
          </div>
        </section>

        <nav className="profile-nav">
          <ul>
            <li
              className={view === "posts" ? "active" : ""}
              onClick={() => setView("posts")}
            >
              {t("posts")}
            </li>
            <li
              className={view === "likes" ? "active" : ""}
              onClick={() => setView("likes")}
            >
              {t("likes")}
            </li>
            <li
              className={view === "replies" ? "active" : ""}
              onClick={() => setView("replies")}
            >
              {t("replies")}
            </li>
            <li
              className={view === "bookmarks" ? "active" : ""}
              onClick={() => setView("bookmarks")}
            >
              {t("bookmarks")}
            </li>
          </ul>
        </nav>

        {view === "posts" && (
          <section className="posts">
            {posts.length === 0 ? (
              <h4 style={{ marginBottom: "1rem", color: "white" }}>
                {t("noPostsToDisplay")}
              </h4>
            ) : (
              <InfiniteScroll
                dataLength={posts.length}
                next={() => fetchPosts()}
                hasMore={hasMorePosts}
                loader={<h4 style={{ color: "white" }}>Loading...</h4>}
                endMessage={<p style={{ color: "white", textAlign: "center" }}>{t("noMorePosts")}</p>}
              >
                <PostList
                  posts={posts}
                  user={user}
                  token={token}
                  refreshPosts={() => fetchPosts(true)}
                  setPosts={setPosts}
                  previewMode={true}
                />
              </InfiniteScroll>
            )}
          </section>
        )}

        {view === "likes" && (
          <section className="posts">
            {likedPosts.length === 0 ? (
              <h4 style={{ marginBottom: "1rem", color: "white" }}>
                {t("havent_liked_any_posts_yet")}
              </h4>
            ) : (
              <InfiniteScroll
                dataLength={likedPosts.length}
                next={() => fetchLikes()}
                hasMore={hasMoreLikes}
                loader={<h4 style={{ color: "white" }}>Loading...</h4>}
                endMessage={<p style={{ color: "white", textAlign: "center" }}>{t("noMorePosts")}</p>}
              >
                <PostList
                  posts={likedPosts}
                  user={user}
                  token={token}
                  refreshPosts={() => fetchLikes(true)}
                  setPosts={setLikedPosts}
                  previewMode={true}
                />
              </InfiniteScroll>
            )}
          </section>
        )}

        {view === "replies" && (
          <section className="posts">
            {repliedPosts.length === 0 ? (
              <h4 style={{ marginBottom: "1rem", color: "white" }}>
                You haven’t replied to any posts yet.
              </h4>
            ) : (
              <InfiniteScroll
                dataLength={repliedPosts.length}
                next={() => fetchReplies()}
                hasMore={hasMoreReplies}
                loader={<h4 style={{ color: "white" }}>Loading...</h4>}
                endMessage={<p style={{ color: "white", textAlign: "center" }}>No more posts</p>}
              >
                <PostList
                  posts={repliedPosts}
                  user={user}
                  token={token}
                  refreshPosts={() => fetchReplies(true)}
                  setPosts={setRepliedPosts}
                  previewMode={true}
                />
              </InfiniteScroll>
            )}
          </section>
        )}

        {view === "bookmarks" && (
          <section className="posts">
            {bookmarkedPosts.length === 0 ? (
              <h4 style={{ marginBottom: "1rem", color: "white" }}>
                {t("havent_bookmarked_any_posts_yet")}
              </h4>
            ) : (
              <InfiniteScroll
                dataLength={bookmarkedPosts.length}
                next={() => fetchBookmarks()}
                hasMore={hasMoreBookmarks}
                loader={<h4 style={{ color: "white" }}>Loading...</h4>}
                endMessage={<p style={{ color: "white", textAlign: "center" }}>{t("noMorePosts")}</p>}
              >
                <PostList
                  posts={bookmarkedPosts}
                  user={user}
                  token={token}
                  refreshPosts={() => fetchBookmarks(true)}
                  setPosts={setBookmarkedPosts}
                  previewMode={true}
                />
              </InfiniteScroll>
            )}
          </section>
        )}

        {modalType && (
          <div className="modal-overlay" onClick={() => setModalType(null)}>
            <div className="user-modal" onClick={(e) => e.stopPropagation()}>
              <header className="user-modal-header">
                <h2>
                  {modalType === "followers" ? "Followers" : "Following"}
                </h2>
                <button
                  className="close-btn"
                  onClick={() => setModalType(null)}
                >
                  &times;
                </button>
              </header>

              <div className="user-modal-search-wrapper">
                <input
                  type="text"
                  className="user-modal-search"
                  placeholder={`Search ${modalType}…`}
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                />
              </div>

              <div className="user-modal-list">
                {loadingModal && <p>Loading...</p>}
                {errorModal && <p className="error-input">{errorModal}</p>}
                {!loadingModal &&
                  !errorModal &&
                  modalUsers.length === 0 && <p>No users found.</p>}
                {modalUsers
                  .filter((u) =>
                    u.name
                      .toLowerCase()
                      .includes(modalSearch.toLowerCase()) ||
                    u.username
                      .toLowerCase()
                      .includes(modalSearch.toLowerCase())
                  )
                  .map((u) => (
                    <div key={u.id} className="user-modal-item">
                      <img
                        className="user-modal-avatar"
                        src={u.image_url || myImage}
                        alt={u.name}
                        onError={(e) => {
                          e.target.src = myImage;
                        }}
                        onClick={() => navigate(`/users/${u.username}`)}
                      />
                      <div
                        className="user-modal-info"
                        onClick={() => navigate(`/users/${u.username}`)}
                      >
                        <strong>{u.name}</strong>
                        <span>@{u.username}</span>
                      </div>
                      <button
                        className={u.following ? "btn-leave" : "btn-join"}
                        onClick={() =>
                          handleFollowToggle(u.id, u.following)
                        }
                      >
                        {u.following ? "Unfollow" : "Follow"}
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </MainLayout>
  );
}
