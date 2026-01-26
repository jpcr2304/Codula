import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import PostList from "../Post/PostList";
import "./Base.css";
import "./Profile.css";
import "../Groups/GroupPage.css";
import profilePicDefault from "../../images/profile-pic.png";
import MainLayout from "./MainLayout";
import InfiniteScroll from "react-infinite-scroll-component";

export default function UserProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();

  const [profileUser, setProfileUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const [posts, setPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);
  const [repliedPosts, setRepliedPosts] = useState([]);

  const [postsOffset, setPostsOffset] = useState(0);
  const [likesOffset, setLikesOffset] = useState(0);
  const [repliesOffset, setRepliesOffset] = useState(0);

  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [hasMoreLikes, setHasMoreLikes] = useState(true);
  const [hasMoreReplies, setHasMoreReplies] = useState(true);

  const [view, setView] = useState("posts"); 

  const [modalType, setModalType] = useState(null);     
  const [modalUsers, setModalUsers] = useState([]);
  const [loadingModal, setLoadingModal] = useState(false);
  const [errorModal, setErrorModal] = useState(null);
  const [modalSearch, setModalSearch] = useState("");
  const [version, setVersion] = useState(0);
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);


  const token = localStorage.getItem("token");
  const origin = window.location.origin;
  const limit = 10;

  const isBlockedView =
  !!profileUser &&
  !profileUser.isSelf &&
  (profileUser.isBlocked || profileUser.blockedMe);

  const canShowFollowBtn = (u) => {
    const blockedFlags = [
      u.blocked, u.blocked_me, u.blockedMe,
      u.is_blocked, u.blocked_by_me, u.blockedByMe,
    ];
    return u.id !== currentUser.id && !blockedFlags.some(Boolean);
  };


  const fetchUserProfileInfo = async () => {
    const [meRes, userRes] = await Promise.all([
      axios.get(`${origin}/api/users/profile`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`${origin}/api/users/users/${username}`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    const me = meRes.data;
    setCurrentUser({ id: me.id, name: me.name, username: me.username });

    const u = userRes.data;
    const parsed = {
      id: u.id,
      name: u.name,
      username: u.username,
      xp: u.xp,
      profilePic: u.image_url || profilePicDefault,
      banner: u.banner_url,
      followers: u.followers_count,
      following: u.following_count,
      isFollowing: u.following,
      isSelf: u.is_self,
      isBlocked: !!u.blocked,
      blockedMe: !!u.blocked_me,
    };
    setProfileUser(parsed);
    return parsed; 
  };


  const blockUser = async () => {
    try {
      await axios.post(`${origin}/api/users/block/${profileUser.id}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setProfileUser(p => ({ ...p, isBlocked: true }));
      setPosts([]); setLikedPosts([]); setRepliedPosts([]);
      setHasMorePosts(false); setHasMoreLikes(false); setHasMoreReplies(false);

      await fetchUserProfileInfo();
    } catch (e) {
      console.error(e);
    }
  };

  const unblockUser = async () => {
    try {
      await axios.post(`${origin}/api/users/unblock/${profileUser.id}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setProfileUser(p => ({ ...p, isBlocked: false }));

      await fetchUserProfileInfo();

      fetchPosts(true); fetchLikes(true); fetchReplies(true);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPosts = async (reset = false) => {
    if (profileUser?.isBlocked || profileUser?.blockedMe) { setHasMorePosts(false); return; }
    try {
      const offset = reset ? 0 : postsOffset;
      const { data } = await axios.get(`${origin}/api/posts/users/${username}/posts`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit, offset },
      });
      if (reset) { setPosts(data); setPostsOffset(limit); setHasMorePosts(data.length === limit); }
      else { setPosts(prev => [...prev, ...data]); setPostsOffset(offset + limit); setHasMorePosts(data.length === limit); }
    } catch (err) {
      if (err?.response?.status === 403) {
        setPosts([]); setHasMorePosts(false);
      }
    }
  };



  const fetchLikes = async (reset = false) => {
    if (profileUser?.isBlocked || profileUser?.blockedMe) { setHasMoreLikes(false); return; }
    try {
      const offset = reset ? 0 : likesOffset;
      const { data } = await axios.get(`${origin}/api/posts/users/${username}/likes`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit, offset },
      });
      if (reset) { setLikedPosts(data); setLikesOffset(limit); setHasMoreLikes(data.length === limit); }
      else { setLikedPosts(prev => [...prev, ...data]); setLikesOffset(offset + limit); setHasMoreLikes(data.length === limit); }
    } catch (err) {
      if (err?.response?.status === 403) {
        setLikedPosts([]); setHasMoreLikes(false);
      }
    }
  };


  const fetchReplies = async (reset = false) => {
    if (profileUser?.isBlocked || profileUser?.blockedMe) { setHasMoreReplies(false); return; }
    try {
      const offset = reset ? 0 : repliesOffset;
      const { data } = await axios.get(`${origin}/api/posts/users/${username}/replies`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit, offset },
      });
      if (reset) { setRepliedPosts(data); setRepliesOffset(limit); setHasMoreReplies(data.length === limit); }
      else { setRepliedPosts(prev => [...prev, ...data]); setRepliesOffset(offset + limit); setHasMoreReplies(data.length === limit); }
    } catch (err) {
      if (err?.response?.status === 403) {
        setRepliedPosts([]); setHasMoreReplies(false);
      }
    }
  };


  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    (async () => {
      const info = await fetchUserProfileInfo(); 
      if (info.isBlocked || info.blockedMe) {
        setPosts([]); setLikedPosts([]); setRepliedPosts([]);
        setHasMorePosts(false); setHasMoreLikes(false); setHasMoreReplies(false);
        setPostsOffset(0); setLikesOffset(0); setRepliesOffset(0);
        return;
      }
      await Promise.all([fetchPosts(true), fetchLikes(true), fetchReplies(true)]);
      setPostsOffset(0); setLikesOffset(0); setRepliesOffset(0);
    })();
  }, [username, navigate, token]);


  useEffect(() => {
    if (profileUser?.isBlocked || profileUser?.blockedMe) {
      setPosts([]); setLikedPosts([]); setRepliedPosts([]);
      setHasMorePosts(false); setHasMoreLikes(false); setHasMoreReplies(false);
    }
  }, [profileUser]);

  useEffect(() => {
    if (!token) return;
    if (profileUser?.isBlocked || profileUser?.blockedMe) return;

    if (view === "posts") {
      fetchPosts(true);    
    } else if (view === "likes") {
      fetchLikes(true);
    } else if (view === "replies") {
      fetchReplies(true);
    } 
  }, [view, profileUser?.isBlocked, profileUser?.blockedMe]);

  const openModal = async (type) => {
    if (!profileUser || !currentUser) return;
    setModalSearch("");
    setModalType(type);
    setLoadingModal(true);
    setErrorModal(null);

    try {
      const url =
        type === "followers"
          ? `${origin}/api/users/users/${profileUser.username}/followers`
          : `${origin}/api/users/users/${profileUser.username}/following`;
      const { data: list } = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { data: myFollowing } = await axios.get(
        `${origin}/api/users/my-following`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const myFollowingIds = new Set(myFollowing.map(u => u.id));
      const enriched = list.map(u => ({
        ...u,
        following: myFollowingIds.has(u.id),
      }));
      setModalUsers(enriched);
    } catch (err) {
      console.error(err);
      setErrorModal("Error loading list.");
    } finally {
      setLoadingModal(false);
    }
  };

  const handleFollowToggle = async (id, isFollowing) => {
    try {
      const route = isFollowing ? "unfollow" : "follow";
      await axios.post(`${origin}/api/users/${route}/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchUserProfileInfo();
      setModalUsers(arr =>
        arr.map(u =>
          u.id === id ? { ...u, following: !isFollowing } : u
        )
      );
    } catch (err) {
      console.error("Error toggling follow:", err);
    }
  };

  if (!profileUser || !currentUser) return <div>Loading...</div>;

  return (
    <MainLayout otherUser={profileUser}>
      <section className="group-banner-wrapper">
        <div
          className="group-banner-image"
          style={{
            backgroundImage: `url(${profileUser.banner ||
              "https://images8.alphacoders.com/774/774361.jpg"})`,
          }}
        />
        <div className="group-header-bar">
          <div className="group-avatar-container">
            <img
              className="group-avatar-circle"
              src={profileUser.profilePic}
              alt={profileUser.name}
              onError={e => e.target.src = profilePicDefault}
            />
          </div>
          <div className="group-title-section title-bar">
            <div>
              <h1>{profileUser.name}</h1>
              <p>@{profileUser.username}</p>
              <div className="follow-stats">
                <span className="clickable" onClick={() => openModal("followers")}>
                  <strong>{profileUser.followers}</strong> followers
                </span>{" "}
                •{" "}
                <span className="clickable" onClick={() => openModal("following")}>
                  <strong>{profileUser.following}</strong> following
                </span>
              </div>
            </div>
            <div className="group-actions">
              {profileUser.isSelf ? (
                <button className="btn-leave" onClick={() => navigate("/edit-profile")}>
                  ✎ Edit Profile
                </button>
              ) : (
                <>
                  {!profileUser.isBlocked && !profileUser.blockedMe && (
                    <button
                      className={profileUser.isFollowing ? "btn-leave" : "btn-join"}
                      onClick={() => handleFollowToggle(profileUser.id, profileUser.isFollowing)}>
                      {profileUser.isFollowing ? "Unfollow" : "Follow"}
                    </button>
                  )}

                  {profileUser.isBlocked ? (
                    <button
                      className="btn-join"
                      style={{ marginLeft: 8 }}
                      onClick={unblockUser}
                    >
                      Unblock
                    </button>
                  ) : (
                    <button
                      className="btn-leave"
                      style={{ marginLeft: 8 }}
                      onClick={() => setConfirmBlockOpen(true)}
                    >
                      Block
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {isBlockedView ? (
        <section className="posts">
          <div className="error-input" style={{ margin: "1rem 0" }}>
            {profileUser.isBlocked
              ? "You’ve blocked this user. Unblock to view their profile."
              : "You can’t view this profile because this user has blocked you."}
          </div>
        </section>
      ) : (
        <>
          {/* Posts / Likes / Replies nav */}
          <nav className="profile-nav">
            <ul>
              <li
                className={view === "posts" ? "active" : ""}
                onClick={() => setView("posts")}
              >
                Posts
              </li>
              <li
                className={view === "likes" ? "active" : ""}
                onClick={() => setView("likes")}
              >
                Likes
              </li>
              <li
                className={view === "replies" ? "active" : ""}
                onClick={() => setView("replies")}
              >
                Replies
              </li>
            </ul>
          </nav>

          {/* Content */}
          <section className="posts">
            {view === "posts" && (
              posts.length === 0 ? (
                <h4 style={{ marginBottom: "1rem", color: "white" }}>
                  {profileUser.name} hasn’t posted yet.
                </h4>
              ) : (
                <InfiniteScroll
                  dataLength={posts.length}
                  next={() => fetchPosts()}
                  hasMore={hasMorePosts}
                  loader={<h4 style={{ color: "white" }}>Loading...</h4>}
                  endMessage={<p style={{ color: "white", textAlign: "center" }}><b>No more posts</b></p>}
                >
                  <PostList
                    posts={posts}
                    user={currentUser}
                    token={token}
                    refreshPosts={() => fetchPosts(true)}
                    setPosts={setPosts}
                    previewMode={true}
                  />
                </InfiniteScroll>
              )
            )}
            {view === "likes" && (
              likedPosts.length === 0 ? (
                <h4 style={{ marginBottom: "1rem", color: "white" }}>No liked posts yet.</h4>
              ) : (
                <InfiniteScroll
                  dataLength={likedPosts.length}
                  next={() => fetchLikes()}
                  hasMore={hasMoreLikes}
                  loader={<h4 style={{ color: "white" }}>Loading...</h4>}
                  endMessage={<p style={{ color: "white", textAlign: "center" }}><b>No more liked posts</b></p>}
                >
                  <PostList
                    posts={likedPosts}
                    user={currentUser}
                    token={token}
                    refreshPosts={() => fetchLikes(true)}
                    setPosts={setLikedPosts}
                    previewMode={true}
                  />
                </InfiniteScroll>
              )
            )}
            {view === "replies" && (
              repliedPosts.length === 0 ? (
                <h4 style={{ marginBottom: "1rem", color: "white" }}>No replies yet.</h4>
              ) : (
                <InfiniteScroll
                  dataLength={repliedPosts.length}
                  next={() => fetchReplies()}
                  hasMore={hasMoreReplies}
                  loader={<h4 style={{ color: "white" }}>Loading...</h4>}
                  endMessage={<p style={{ color: "white", textAlign: "center" }}><b>No more replied posts</b></p>}
                >
                  <PostList
                    posts={repliedPosts}
                    user={currentUser}
                    token={token}
                    refreshPosts={() => fetchReplies(true)}
                    setPosts={setRepliedPosts}
                    previewMode={true}
                  />
                </InfiniteScroll>
              )
            )}
          </section>
        </>
      )}
      
      {confirmBlockOpen && (
        <div className="modal-overlay" onClick={() => setConfirmBlockOpen(false)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <header className="confirm-modal-header">
              <h2>Block User</h2>
              <button className="close-btn" onClick={() => setConfirmBlockOpen(false)}>
                &times;
              </button>
            </header>
            <div className="confirm-modal-body">
              <p>
                Are you sure you want to block <strong>@{profileUser.username}</strong>?  
                They will no longer be able to interact with you.
              </p>
            </div>
            <div className="confirm-modal-actions">
              <button
                className="btn-leave"
                onClick={() => {
                  blockUser();
                  setConfirmBlockOpen(false);
                }}
              >
                Yes, block
              </button>
              <button
                className="btn-join"
                onClick={() => setConfirmBlockOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Followers/Following Modal (unchanged) */}
      {modalType && (
        <div className="modal-overlay" onClick={() => setModalType(null)}>
          <div className="user-modal" onClick={e => e.stopPropagation()}>
            <header className="user-modal-header">
              <h2>{modalType === "followers" ? "Followers" : "Following"}</h2>
              <button className="close-btn" onClick={() => setModalType(null)}>
                &times;
              </button>
            </header>
            <div className="user-modal-search-wrapper">
              <input
                type="text"
                className="user-modal-search"
                placeholder={`Search ${modalType}…`}
                value={modalSearch}
                onChange={e => setModalSearch(e.target.value)}
              />
            </div>
            <div className="user-modal-list">
              {loadingModal && <p>Loading...</p>}
              {errorModal && <p className="error-input">{errorModal}</p>}
              {!loadingModal && !errorModal && modalUsers.length === 0 && <p>No users found.</p>}
              {modalUsers
                .filter(u =>
                  u.name.toLowerCase().includes(modalSearch.toLowerCase()) ||
                  u.username.toLowerCase().includes(modalSearch.toLowerCase())
                )
                .map(u => (
                  <div key={u.id} className="user-modal-item">
                    <img
                      className="user-modal-avatar"
                      src={u.image_url || profilePicDefault}
                      alt={u.name}
                      onError={e => e.target.src = profilePicDefault}
                      onClick={() => { setModalType(null); navigate(`/users/${u.username}`); }}
                    />
                    <div
                      className="user-modal-info"
                      onClick={() => { setModalType(null); navigate(`/users/${u.username}`); }}
                    >
                      <strong>{u.name}</strong>
                      <span>@{u.username}</span>
                    </div>
                    {canShowFollowBtn(u) && (
                      <button
                        className={u.following ? "btn-leave" : "btn-join"}
                        onClick={() => handleFollowToggle(u.id, u.following)}
                      >
                        {u.following ? "Unfollow" : "Follow"}
                      </button>
                    )}

                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
