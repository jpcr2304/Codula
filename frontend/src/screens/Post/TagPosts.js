import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import PostList from "./PostList";
import MainLayout from "../Profile/MainLayout";

export default function TagPosts() {
  const { tagName } = useParams();
  const [posts, setPosts] = useState([]);
  const [user, setUser] = useState(null);
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    axios.get(`${window.location.origin}/api/users/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then((res) => {
      setUser(res.data);
    }).catch(() => navigate("/login"));
  }, [token, navigate]);

  useEffect(() => {
    if (token) {
      axios.get(`${window.location.origin}/api/posts/tags/${encodeURIComponent(tagName)}/posts`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then((res) => {
        setPosts(res.data);
      });
    }
  }, [tagName, token]);

  const refreshPosts = async () => {
    const res = await axios.get(`${window.location.origin}/api/posts/tags/${encodeURIComponent(tagName)}/posts`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setPosts(res.data);
  };

  if (!user) return <div>Loading...</div>;

  return (
    <MainLayout>
      <section className="posts" style={{ padding: "1rem" }}>
        <h2 style={{
          marginBottom: "1rem",
          color: "white",
        }}>
          <strong>#{tagName}</strong>
        </h2>

        {posts.length === 0 ? (
          <p style={{
            marginBottom: "1rem",
            color: "white",
          }}>
            No posts found with this tag.
          </p>
        ) : (
          <PostList
            posts={posts}
            user={user}
            token={token}
            refreshPosts={refreshPosts}
            setPosts={setPosts}
          />
        )}
      </section>
    </MainLayout>
  );
}
