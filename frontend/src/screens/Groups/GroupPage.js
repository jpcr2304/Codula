import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import PostList from "../Post/PostList";
import MainLayout from "../Profile/MainLayout";
import "./GroupPage.css";
import groupDefault from "../../images/group-default.png";
import myImage from "../../images/profile-pic.png";
import InfiniteScroll from "react-infinite-scroll-component";

export default function GroupPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [offsetPosts, setOffsetPosts] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const limit = 10;

  const [modalOpen, setModalOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const token = localStorage.getItem("token");
  const origin = window.location.origin;

  const fetchGroupInfo = async () => {
    try {
      const { data: me } = await axios.get(`${origin}/api/users/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCurrentUser({ id: me.id, username: me.username, name: me.name });

      const [{ data: allGroups }, { data: myGroups }] = await Promise.all([
        axios.get(`${origin}/api/users/groups`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${origin}/api/users/my-groups`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const g = allGroups.find((g) => g.id === +groupId);
      if (!g) throw new Error("Group not found");
      const isMember = myGroups.some((m) => m.id === g.id);

      setGroup({
        ...g,
        isOwner: g.owner_id === me.id,
        isMember,
      });
    } catch (err) {
      console.error(err);
      navigate("/home");
    }
  };

  const fetchPosts = async (reset = false) => {
    try {
      const currentOffset = reset ? 0 : offsetPosts;
      const { data: newPosts } = await axios.get(
        `${origin}/api/posts/groups/${groupId}/posts`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { limit, offset: currentOffset },
        }
      );
      if (reset) {
        setPosts(newPosts);
        setOffsetPosts(limit);
        setHasMorePosts(newPosts.length === limit);
      } else {
        setPosts((prev) => [...prev, ...newPosts]);
        setOffsetPosts(currentOffset + limit);
        setHasMorePosts(newPosts.length === limit);
      }
    } catch (err) {
      console.error(err);
      setHasMorePosts(false);
    }
  };

  useEffect(() => {
    if (!token) return void navigate("/login");
    fetchGroupInfo();
    setOffsetPosts(0);
    setHasMorePosts(true);
    fetchPosts(true);
  }, [groupId]);

  const openMembers = async () => {
    setModalOpen(true);
    setLoadingMembers(true);
    setMembersError(null);
    setSearchTerm("");

    try {
      const [ { data: membersData }, { data: myFollowing } ] =
        await Promise.all([
          axios.get(`${origin}/api/users/groups/${groupId}/members`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${origin}/api/users/my-following`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

      const followingIds = new Set(myFollowing.map((u) => u.id));
      setMembers(
        membersData.map((u) => ({
          ...u,
          following: followingIds.has(u.id),
        }))
      );
    } catch (err) {
      console.error(err);
      setMembersError("Could not load members.");
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleFollowToggle = async (memberId, isFollowing) => {
    try {
      const route = isFollowing ? "unfollow" : "follow";
      await axios.post(
        `${origin}/api/users/${route}/${memberId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMembers((ms) =>
        ms.map((u) =>
          u.id === memberId ? { ...u, following: !isFollowing } : u
        )
      );
    } catch (err) {
      console.error("Error toggling follow:", err);
    }
  };

  if (!group || !currentUser) return <div>Loading...</div>;

  return (
    <MainLayout>
      <section className="posts">
        <section className="group-banner-wrapper">
          <div
            className="group-banner-image"
            style={{
              backgroundImage: `url(${
                group.banner_url ||
                "https://images8.alphacoders.com/774/774361.jpg"
              })`,
            }}
          />
          <div className="group-header-bar">
            <div className="group-avatar-container">
              <img
                className="group-avatar-circle"
                src={group.image || groupDefault}
                alt={group.name}
                onError={(e) => (e.target.src = groupDefault)}
              />
            </div>
            <div className="group-title-section">
              <h1>{group.name}</h1>
              {group.description && (
                <p className="group-description">{group.description}</p>
              )}
              <div className="group-meta">
                <span className="clickable" onClick={openMembers}>
                  <strong>{group.members}</strong> members
                </span>
              </div>
            </div>
            <div className="group-actions">
              {group.isOwner && (
                <button
                  className="btn-leave"
                  onClick={() =>
                    navigate(`/groups/${group.id}/edit`)
                  }
                >
                  ✎ Edit Group
                </button>
              )}
              {(group.isMember || group.isOwner) && (
                <button
                  className="btn-leave"
                  onClick={() =>
                    navigate(
                      `/create-post?group=${group.id}&name=${encodeURIComponent(
                        group.name
                      )}`
                    )
                  }
                >
                  ＋ Create Post
                </button>
              )}

              {!group.isOwner && (
                <button
                  className={group.isMember ? "btn-leave" : "btn-join"}
                  onClick={async () => {
                    const route = group.isMember ? "leave" : "join";
                    await axios.post(
                      `${origin}/api/users/groups/${group.id}/${route}`,
                      {},
                      { headers: { Authorization: `Bearer ${token}` } }
                    );
                    setGroup((g) => ({
                      ...g,
                      isMember: !g.isMember,
                      members: g.members + (g.isMember ? -1 : +1),
                    }));
                  }}
                >
                  {group.isMember ? "Leave" : "Join"}
                </button>
              )}
            </div>
          </div>
        </section>

        {posts.length === 0 ? (
          <p style={{ color: "white" }}>No posts in this group.</p>
        ) : (
          <InfiniteScroll
            dataLength={posts.length}
            next={() => fetchPosts()}
            hasMore={hasMorePosts}
            loader={<h4 style={{ color: "white" }}>Loading...</h4>}
            endMessage={
              <p style={{ color: "white", textAlign: "center" }}>
                <b>No more posts</b>
              </p>
            }
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
        )}
      </section>

      {modalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setModalOpen(false)}
        >
          <div className="user-modal" onClick={(e) => e.stopPropagation()}>
            <header className="user-modal-header">
              <h2>Members</h2>
              <button
                className="close-btn"
                onClick={() => setModalOpen(false)}
              >
                &times;
              </button>
            </header>

            <div className="user-modal-search-wrapper">
              <input
                type="text"
                className="user-modal-search"
                placeholder="Search members…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="user-modal-list">
              {loadingMembers && <p>Loading…</p>}
              {membersError && (
                <p className="error-input">{membersError}</p>
              )}
              {!loadingMembers && members.length === 0 && (
                <p>No members found.</p>
              )}

              {members
                .filter(
                  (u) =>
                    u.name
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase()) ||
                    u.username
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase())
                )
                .map((u) => (
                  <div key={u.id} className="user-modal-item">
                    <img
                      className="user-modal-avatar"
                      src={u.image_url || myImage}
                      alt={u.name}
                      onError={(e) => (e.target.src = myImage)}
                      onClick={() => {
                        setModalOpen(false);
                        navigate(`/users/${u.username}`);
                      }}
                    />
                    <div
                      className="user-modal-info"
                      onClick={() => {
                        setModalOpen(false);
                        navigate(`/users/${u.username}`);
                      }}
                    >
                      <strong>{u.name}</strong>
                      <span>@{u.username}</span>
                    </div>

                    {u.id !== currentUser.id && (
                      <button
                        className={u.following ? "btn-leave" : "btn-join"}
                        onClick={() =>
                          handleFollowToggle(u.id, u.following)
                        }
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
