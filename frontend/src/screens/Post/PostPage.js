import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import MainLayout from "../Profile/MainLayout";
import PostList from "../Post/PostList";
import { useLocation } from "react-router-dom";

export default function PostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [post, setPost] = useState(null);
  const setSinglePost = (updatedPost) => setPost(updatedPost);
  const [user, setUser] = useState(null);

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const [replyRequested, setReplyRequested] = useState(
    new URLSearchParams(location.search).get("reply") === "true"
  );

  const [posts, setPosts] = useState([]);


  const fetchPost = async () => {
    try {
      const { data: profile } = await axios.get(`${window.location.origin}/api/users/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser({
        name: profile.name,
        username: profile.username,
        xp: profile.xp,
        profilePic: profile.image_url,
      });

      const { data: postData } = await axios.get(`${window.location.origin}/api/posts/posts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPosts([postData]);
      console.log("Fetched post:", postData);
    } catch (err) {
      console.error("Error loading post", err);
      navigate("/home");
    }
  };

  useEffect(() => {
    if (!token) return navigate("/login");
    fetchPost();
  }, [id]);

  if (!posts || !user) return <div>Loading...</div>;

  console.log("Rendering PostPage", { posts });

  return (
    <MainLayout>
      <section className="posts single-post-page">
        <PostList
          posts={posts}
          user={user}
          token={token}
          refreshPosts={fetchPost}
          autoOpenEditor={replyRequested}
          setPosts={setPosts}
          setReplyRequested={setReplyRequested}
          isSinglePostPage={true}
        />
      </section>
    </MainLayout>
  );
}
