import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { FaRegCommentDots } from "react-icons/fa";
import defaultAvatar from "../../images/friend.png";
import UserHoverCard from "../Profile/UserHoverCard";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import "./Editor.css";
import "./Post.css";
import { Heart, MessageCircle  } from "lucide-react";
import groupDefault from "../../images/group-default.png";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { enUS, pt } from "date-fns/locale";
import { useTranslation } from "react-i18next";


function sanitizeForPreview(md, opts = {}) {
  const {
    maxLines = 15,               
    maxConsecutiveEmpty = 5,      
    maxConsecutiveDuplicate = 3, 
  } = opts;

  const lines = md.split("\n");
  const out = [];

  let empty = 0;
  let dupCount = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim() === "") {
      empty++;
      if (empty > maxConsecutiveEmpty) continue;
    } else {
      empty = 0;
    }

    if (out.length && line === out[out.length - 1]) {
      dupCount++;
      if (dupCount > maxConsecutiveDuplicate) continue;
    } else {
      dupCount = 1;
    }

    out.push(line);
    if (out.length >= maxLines) break;
  }

  return out.join("\n");
}


function FollowButton({ userId, isFollowing, token, onFollowChange }) {
  const [loading, setLoading] = useState(false);
  const [following, setFollowing] = useState(isFollowing);

  const handleFollow = async () => {
    setLoading(true);
    try {
      if (following) {
        await axios.post(
          `${window.location.origin}/api/users/unfollow/${userId}`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setFollowing(false);
      } else {
        await axios.post(
          `${window.location.origin}/api/users/follow/${userId}`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setFollowing(true);
      }
      if (onFollowChange) onFollowChange();
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={following ? "btn-leave" : "btn-join"}
      disabled={loading}
      onClick={handleFollow}
      style={{ fontSize: "0.97em", minWidth: 90, marginLeft: 8 }}
    >
      {loading ? "..." : following ? "Unfollow" : "Follow"}
    </button>
  );
}


function buildCommentTree(interactions) {
  const map = {};
  interactions
    .filter((i) => i.type === "comment")
    .forEach((c) => {
      map[c.id] = { ...c, children: [], reactions: [] };
    });
  interactions.forEach((i) => {
    if (i.type === "comment" && i.parent_id) {
      map[i.parent_id]?.children.push(map[i.id]);
    } else if (i.type === "like" && i.parent_id) {
      map[i.parent_id]?.reactions.push(i);
    }
  });
  const roots = Object.values(map).filter((c) => !c.parent_id);
  const sortRec = (nodes) => {
    nodes.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

function PostMeta({ post }) {
  const items = [];

  if (post.language)
    items.push({ label: "Language", value: post.language });

  if (post.estimated_time)
    items.push({ label: "Estimated Time", value: post.estimated_time });

  if (post.difficulty)
    items.push({ label: "Difficulty", value: post.difficulty });

  if (post.prerequisites?.length)
    items.push({ label: "Prerequisites", value: post.prerequisites.join(", ") });

  if (post.links?.length)
    items.push({
      label: "References",
      value: (
        <ul>
          {post.links.map((link, idx) => (
            <li key={idx}>
              <a href={link} target="_blank" rel="noopener noreferrer">{link}</a>
            </li>
          ))}
        </ul>
      )
    });

  if (items.length === 0) return null;

  return (
    <div className="post-meta-box">
      {items.map((item, idx) => (
        <div className="post-meta-item" key={idx}>
          <span className="label">{item.icon} {item.label && `${item.label}:`}</span>{" "}
          <span className="value">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function getSmartQuoteMarkdown() {
  const selection = window.getSelection();
  if (!selection.rangeCount) return null;
  const selectedText = selection.toString();
  if (!selectedText.trim()) return null;

  const range = selection.getRangeAt(0);

  function findCodeLang(node) {
    while (node && node.nodeType !== 1) node = node.parentNode;
    while (node) {
      if (node.tagName === "CODE" || node.tagName === "PRE") {
        if (node.className) {
          const m = /language-(\w+)/.exec(node.className);
          if (m) return m[1];
        }
      }
      node = node.parentNode;
    }
    return "python";
  }

  function selectionFullyInsideCode() {
    let anchor = selection.anchorNode;
    let focus = selection.focusNode;
    function findCode(node) {
      while (node && node.nodeType !== 1) node = node.parentNode;
      while (node) {
        if (node.tagName === "CODE" || node.tagName === "PRE") return true;
        node = node.parentNode;
      }
      return false;
    }
    return findCode(anchor) && findCode(focus);
  }

  if (selectionFullyInsideCode()) {
    const lang = findCodeLang(range.startContainer);
    const codeLines = selectedText.split('\n').map(line => `> ${line}`).join('\n');
    return `> \`\`\`${lang}\n${codeLines}\n> \`\`\`\n\n`;
  }

  function isLineCode(line) {
    const fragment = range.cloneContents();
    const childNodes = Array.from(fragment.childNodes);
    return childNodes.some(
      node =>
        node.nodeType === 1 &&
        (node.tagName === "CODE" || node.tagName === "PRE") &&
        node.textContent && node.textContent.includes(line.trim())
    );
  }

  const lang = findCodeLang(range.startContainer);
  const lines = selectedText.split('\n');
  let result = [];
  let codeBuffer = [];

  function flushCodeBuffer() {
    if (codeBuffer.length) {
      result.push(`> \`\`\`${lang}`);
      codeBuffer.forEach(l => result.push(`> ${l}`));
      result.push(`> \`\`\``);
      codeBuffer = [];
    }
  }

  lines.forEach(line => {
    if (isLineCode(line) && line.trim() !== "") {
      codeBuffer.push(line);
    } else {
      flushCodeBuffer();
      result.push(`> ${line}`);
    }
  });
  flushCodeBuffer();
  result.push("");
  return result.join("\n");
}

export default function PostList({ posts, user, token, refreshPosts, setPosts, previewMode = false, autoOpenEditor = false, setReplyRequested,isSinglePostPage = false }) {
  const [visibleEditors, setVisibleEditors] = useState({});
  const [visibleReplies, setVisibleReplies] = useState({});
  const [openMenuPost, setOpenMenuPost] = useState(null);
  const [openMenuComment, setOpenMenuComment] = useState(null);
  const [loadingLikes, setLoadingLikes] = useState({});
  const [groupImages, setGroupImages] = useState({});
  const postMenuRefs = useRef({});
  const commentMenuRefs = useRef({});
  const navigate = useNavigate();
  const [likesModal, setLikesModal] = useState({ open: false, postId: null, users: [], loading: false, error: null });
  const [commentLikesModal, setCommentLikesModal] = useState({ open: false, commentId: null, users: [], loading: false, error: null });
  const quoteInProgressRef = useRef(false);
  const { t, i18n } = useTranslation();
  const dateLocales = {
    en: enUS,
    "en-US": enUS,
    pt: pt,
    "pt-PT": pt,
  };


  const canShowFollowBtn = (u) => {
    const blockedFlags = [
      u.blocked,        
      u.blocked_me,       
      u.blockedMe,
      u.is_blocked,
      u.blocked_by_me,
      u.blockedByMe,
    ];
    return u.username !== user.username && !blockedFlags.some(Boolean);
  };

  useEffect(() => {
    const handler = (e) => {
      if (openMenuPost != null) {
        const ref = postMenuRefs.current[`menu-${openMenuPost}`];
        if (ref && !ref.contains(e.target)) setOpenMenuPost(null);
      }
      if (openMenuComment != null) {
        const ref = commentMenuRefs.current[openMenuComment];
        if (ref && !ref.contains(e.target)) setOpenMenuComment(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openMenuPost, openMenuComment]);

  useEffect(() => {
    const groupIds = Array.from(new Set(posts.map(p => p.group_id).filter(Boolean)));
    groupIds.forEach(id => {
      if (!groupImages[id]) {
        fetch(`/api/users/groups/${id}`)
          .then(res => res.json())
          .then(data => setGroupImages(prev => ({ ...prev, [id]: data })));
      }
    });
  }, [posts]);

  const getCodeInlineStyle = (postType) => {
    switch(postType) {
      case 'snippet':
        return {
          background: "#2a0c4a",
          color: "#ddc4fcff",
          padding: "2px 6px",
          borderRadius: "5px",
          fontSize: "0.97em",
          fontFamily: "inherit",
          fontWeight: 500,
          display: "inline",
          whiteSpace: "nowrap",
        };
      case 'meme':
        return {
          background: "#3d2e0f",
          color: "#f8e3b7ff",
          padding: "2px 6px",
          borderRadius: "5px",
          fontSize: "0.97em",
          fontFamily: "inherit",
          fontWeight: 500,
          display: "inline",
          whiteSpace: "nowrap",
        };
      case 'tutorial':
        return {
          background: "#0d3d12",
          color: "#bbf5c7ff",
          padding: "2px 6px",
          borderRadius: "5px",
          fontSize: "0.97em",
          fontFamily: "inherit",
          fontWeight: 500,
          display: "inline",
          whiteSpace: "nowrap",
        };
      case 'research':
        return {
          background: "#5a0f0f",
          color: "#f1c2c2ff",
          padding: "2px 6px",
          borderRadius: "5px",
          fontSize: "0.97em",
          fontFamily: "inherit",
          fontWeight: 500,
          display: "inline",
          whiteSpace: "nowrap",
        };
      case 'question':
        return {
          background: "#0d3d5a",
          color: "#c0dff7ff",
          padding: "2px 6px",
          borderRadius: "5px",
          fontSize: "0.97em",
          fontFamily: "inherit",
          fontWeight: 500,
          display: "inline",
          whiteSpace: "nowrap",
        };
      default:
        return {
          background: "#23222a",
          color: "#cabcf7ff",
          padding: "2px 6px",
          borderRadius: "5px",
          fontSize: "0.97em",
          fontFamily: "inherit",
          fontWeight: 500,
          display: "inline",
          whiteSpace: "nowrap",
        };
    }
  };

  const getLikeColorForType = (postType) => {
    switch(postType) {
      case 'snippet':
        return "#7B34DD";    
      case 'meme':
        return "#B89143";    
      case 'tutorial':
        return "#1BC263";    
      case 'research':
        return "#DD3E3E";    
      case 'question':
        return "#257CC4";   
      default:
        return "#6A5ACD";   
    }
  };

  const initEditor = (id, type) => {
    const key = type === "reply" ? `reply-${id}` : id;
    if (!window.commentEditors) window.commentEditors = {};

    const wrapperId = `${type}-editor-${id}`;
    const wrapper = document.getElementById(wrapperId);

    if (!wrapper) return false;

    wrapper.innerHTML = "";

    if (window.commentEditors[key]) {
      try {
        window.commentEditors[key].editor.remove();
      } catch (e) {
        console.warn(`Could not remove editor for key: ${key}`, e);
      }
      delete window.commentEditors[key];
    }

    try {
      window.commentEditors[key] = window.editormd(wrapperId, {
        width: "100%",
        height: 400,
        path: "/editor.md/lib/",
        placeholder: type === "reply" ? "Write a reply…" : "Write a comment…",
        saveHTMLToTextarea: true,
        imageUpload: false,
        toolbarIcons: () => [
          "undo", "redo", "|",
          "bold", "del", "italic", "quote", "|",
          "uppercase", "lowercase", "h1", "|",
          "list-ul", "list-ol", "hr", "|",
          "link", "image", "code", "code-block", "|",
          "table", "datetime", "|",
          "watch", "preview",
        ],
      });
      return true;
    } catch (err) {
      console.error("Failed to init editor:", err);
      return false;
    }
  };

  const toggleEditor = (postId) => {
    setVisibleEditors((v) => {
      const alreadyVisible = v[postId];

      if (!alreadyVisible) {
        const key = postId;
        let tries = 0;
        const maxTries = 50;
        const interval = setInterval(() => {
          tries++;
          if (document.getElementById(`comment-editor-${key}`)) {
            initEditor(key, "comment");
            clearInterval(interval);
          }
          if (tries >= maxTries) {
            clearInterval(interval);
            console.error(`Editor init failed after retries (from toggleEditor) for post ${key}`);
          }
        }, 100);
      } else {
        delete window.commentEditors?.[postId];
      }

      return { ...v, [postId]: !alreadyVisible };
    });
  };

  const toggleReply = (commentId) => {
    setVisibleReplies((v) => {
      const key = `reply-${commentId}`;
      const alreadyVisible = v[commentId];

      if (!alreadyVisible) {
        let tries = 0;
        const maxTries = 50;
        const interval = setInterval(() => {
          tries++;
          if (document.getElementById(`reply-editor-${commentId}`)) {
            initEditor(commentId, "reply");
            clearInterval(interval);
          }
          if (tries >= maxTries) {
            clearInterval(interval);
            console.error(`Reply editor init failed for comment ${commentId}`);
          }
        }, 100);
      } else {
        const key = `reply-${commentId}`;
        delete window.commentEditors?.[key];
      }

      return { ...v, [commentId]: !alreadyVisible };
    });
  };

  const quotePost = (postId) => {
    const markdown = getSmartQuoteMarkdown();
    if (!markdown) return;

    quoteInProgressRef.current = true;

    if (!visibleEditors[postId]) {
      quoteInProgressRef.current = true;
      setVisibleEditors((v) => ({ ...v, [postId]: true }));

      requestAnimationFrame(() => {
        setTimeout(() => {
          const wrapper = document.getElementById(`comment-editor-${postId}`);
          if (wrapper) {
            const success = initEditor(postId, "comment");
            if (success) {
              let tries = 0;
              const maxTries = 20;

              const checkEditor = setInterval(() => {
                tries++;
                const editor = window.commentEditors?.[postId];
                if (editor?.setMarkdown) {
                  editor.setMarkdown(markdown);
                  quoteInProgressRef.current = false;
                  clearInterval(checkEditor);
                } else if (tries >= maxTries) {
                  console.error("Editor not ready to set markdown (quote)");
                  quoteInProgressRef.current = false;
                  clearInterval(checkEditor);
                }
              }, 100);
            }
          } else {
            console.error("Editor wrapper not found after render (quotePost)");
            quoteInProgressRef.current = false;
          }
        }, 100); 
      });
    } else {
      const editor = window.commentEditors?.[postId];
      if (editor) {
        const currentContent = editor.getMarkdown() || "";
        const newContent = currentContent + (currentContent ? "\n\n" : "") + markdown;
        editor.setMarkdown(newContent);
        
        setTimeout(() => {
          const textarea = document.querySelector(`#comment-markdown-${postId}`);
          if (textarea) {
            textarea.focus();
            textarea.scrollTop = textarea.scrollHeight;
          }
        }, 50);
      }
    }
  };

  const quoteComment = (postId, commentId) => {
    const markdown = getSmartQuoteMarkdown();
    if (!markdown) return;

    const key = `reply-${commentId}`;

    if (!visibleReplies[commentId]) {
      setVisibleReplies((v) => ({ ...v, [commentId]: true }));

      requestAnimationFrame(() => {
        setTimeout(() => {
          const wrapper = document.getElementById(`reply-editor-${commentId}`);
          if (wrapper) {
            const success = initEditor(commentId, "reply");
            if (success) {
              let tries = 0;
              const maxTries = 20;

              const checkEditor = setInterval(() => {
                tries++;
                const editor = window.commentEditors?.[key];
                if (editor?.setMarkdown) {
                  editor.setMarkdown(markdown);
                  clearInterval(checkEditor);

                  setTimeout(() => {
                    const textarea = document.querySelector(`#reply-markdown-${commentId}`);
                    if (textarea) {
                      textarea.focus();
                      textarea.scrollTop = textarea.scrollHeight;
                    }
                  }, 50);
                } else if (tries >= maxTries) {
                  console.error("Reply editor not ready to set markdown (quote)");
                  clearInterval(checkEditor);
                }
              }, 100);
            }
          } else {
            console.error("Reply editor wrapper not found after render (quoteComment)");
          }
        }, 100);
      });

    } else {
      const editor = window.commentEditors?.[key];
      if (editor) {
        const currentContent = editor.getMarkdown() || "";
        const newContent = currentContent + (currentContent ? "\n\n" : "") + markdown;
        editor.setMarkdown(newContent);

        setTimeout(() => {
          const textarea = document.querySelector(`#reply-markdown-${commentId}`);
          if (textarea) {
            textarea.focus();
            textarea.scrollTop = textarea.scrollHeight;
          }
        }, 50);
      }
    }
  };

  const reactToComment = async (postId, commentId, yourLikeId = null) => {
    const key = `p-${postId}`;
    setLoadingLikes((l) => ({ ...l, [key]: true }));
    try {
      if (yourLikeId) {
        await axios.delete(
          `${window.location.origin}/api/posts/interactions/${yourLikeId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setPosts(prev =>
          prev.map(post =>
            post.id === postId
              ? {
                  ...post,
                  interactions: post.interactions.filter(
                    (i) =>
                      !(
                        i.type === "like" &&
                        i.username === user.username &&
                        i.parent_id === commentId
                      )
                  ),
                }
              : post
          )
        );
      } else {
        const { data: newLike } = await axios.post(
          `${window.location.origin}/api/posts/posts/${postId}/interact`,
          { type: "like", parent_id: commentId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setPosts(prev =>
          prev.map(post =>
            post.id === postId
              ? {
                  ...post,
                  interactions: [...post.interactions, newLike],
                }
              : post
          )
        );
      }
    } finally {
      setLoadingLikes((l) => ({ ...l, [key]: false }));
    }
  };

  const handlePostLike = async (postId, yourLikeId) => {
    setLoadingLikes((l) => ({ ...l, [`p-${postId}`]: true }));
    try {
      if (yourLikeId) {
        await axios.delete(
          `${window.location.origin}/api/posts/interactions/${yourLikeId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  interactions: post.interactions.filter(
                    (i) => !(i.type === "like" && i.username === user.username && !i.parent_id)
                  ),
                }
              : post
          )
        );
      } else {
        const { data: newLike } = await axios.post(
          `${window.location.origin}/api/posts/posts/${postId}/interact`,
          { type: "like" },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  interactions: [...post.interactions, newLike],
                }
              : post
          )
        );
      }
    } finally {
      setLoadingLikes((l) => ({ ...l, [`p-${postId}`]: false }));
    }
  };

  const deleteInteraction = async (id) => {
    await axios.delete(`${window.location.origin}/api/posts/interactions/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    refreshPosts();
  };

  const submitComment = async (postId) => {
    const md = window.commentEditors?.[postId]?.getMarkdown?.();
    if (!md?.trim()) {
      setVisibleEditors((v) => ({ ...v, [postId]: false }));
      return;
    }

    await axios.post(
      `${window.location.origin}/api/posts/posts/${postId}/interact`,
      { type: "comment", content: md },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    setVisibleEditors((v) => ({ ...v, [postId]: false }));
    delete window.commentEditors[postId];

    const url = new URL(window.location.href);
    url.searchParams.delete("reply");
    window.history.replaceState({}, "", url);
    setReplyRequested(false);

    const { data: updatedPost } = await axios.get(
      `${window.location.origin}/api/posts/posts/${postId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setPosts((prev) =>
      prev.map((post) => (post.id === postId ? updatedPost : post))
    );
  };

  const submitReply = async (postId, commentId) => {
    const key = `reply-${commentId}`;
    const md = window.commentEditors?.[key]?.getMarkdown?.();
    if (!md?.trim()) {
      setVisibleReplies((v) => ({ ...v, [commentId]: false }));
      return;
    }
    await axios.post(
      `${window.location.origin}/api/posts/posts/${postId}/interact`,
      { type: "comment", content: md, parent_id: commentId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setVisibleReplies((v) => ({ ...v, [commentId]: false }));
    delete window.commentEditors[key];

    const { data: updatedPost } = await axios.get(
      `${window.location.origin}/api/posts/posts/${postId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setPosts(prev =>
      prev.map(post => post.id === postId ? updatedPost : post)
    );
  };

  const handleRemovePost = async (postId) => {
    await axios.delete(`${window.location.origin}/api/posts/posts/${postId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setOpenMenuPost(null);
    refreshPosts();
  };

  const handlePostSave = async (postId, saveId) => {
    if (saveId) {
      await axios.delete(
        `${window.location.origin}/api/posts/interactions/${saveId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                interactions: post.interactions.filter(
                  (i) => !(i.type === "save" && i.username === user.username && !i.parent_id)
                ),
              }
            : post
        )
      );
    } else {
      const { data: saved } = await axios.post(
        `${window.location.origin}/api/posts/posts/${postId}/interact`,
        { type: "save" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                interactions: [...post.interactions, saved],
              }
            : post
        )
      );
    }
  };

  const openLikesModal = async (postId) => {
    setLikesModal({ open: true, postId, users: [], loading: true, error: null });
    try {
      const { data } = await axios.get(`${window.location.origin}/api/posts/${postId}/likes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLikesModal(modal => ({ ...modal, users: data, loading: false }));
    } catch (err) {
      setLikesModal(modal => ({ ...modal, error: "Failed to load likes", loading: false }));
    }
  };

  const closeLikesModal = () => setLikesModal({ open: false, postId: null, users: [], loading: false, error: null });

  const openCommentLikesModal = async (commentId) => {
    setCommentLikesModal({ open: true, commentId, users: [], loading: true, error: null });
    try {
      const { data } = await axios.get(`${window.location.origin}/api/posts/comments/${commentId}/likes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCommentLikesModal(modal => ({ ...modal, users: data, loading: false }));
    } catch (err) {
      setCommentLikesModal(modal => ({ ...modal, error: "Failed to load likes", loading: false }));
    }
  };

  const closeCommentLikesModal = () => setCommentLikesModal({ open: false, commentId: null, users: [], loading: false, error: null });

  const renderTree = (nodes, depth = 0, postId, postType) =>
    nodes.map((c) => {
      const liked = c.reactions.some((r) => r.username === user.username);
      const yourLike = c.reactions.find((r) => r.username === user.username);

      return (
        <div key={c.id} className={`comment${depth > 0 ? " reply" : ""}`}>
          <div
            className="post-header comment-header-with-menu"
            ref={(el) => (commentMenuRefs.current[c.id] = el)}
          >
            <div
              className="post-author-line"
              style={{
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              <UserHoverCard username={c.username}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();                
                    navigate(`/users/${c.username}`);
                  }}
                >
                  <img
                    src={c.image_url || defaultAvatar}
                    alt={c.user}
                    className="post-avatar"
                  />
                  <span className="author-name" style={{ marginLeft: 4 }}>
                    {c.user}
                  </span>
                  <span className="author-username" style={{ marginLeft: 4 }}>
                    @{c.username}
                  </span>
                </div>
              </UserHoverCard>

              <span
                className="post-date"
                style={{
                  color: "#d7dadc",
                  marginLeft: 6,
                  fontSize: "0.85rem",
                  alignSelf: "center"
                }}
              >
                • {formatDistanceToNow(new Date(c.created_at), {
                    addSuffix: true,
                    locale: dateLocales[i18n.language] || enUS,
                  })}
              </span>
            </div>

          </div>

          <div className="comment-content">
            <ReactMarkdown
              components={{
                blockquote({ node, ...props }) {
                  const onlyCode =
                    node.children &&
                    node.children.length === 1 &&
                    node.children[0].type === "element" &&
                    (node.children[0].tagName === "pre" || node.children[0].tagName === "code");

                  if (onlyCode) {
                    return (
                      <blockquote className="quote-code">{props.children}</blockquote>
                    );
                  }
                  return (
                    <blockquote {...props} />
                  );
                },
                p({ node, children, ...props }) {
                  const isOnlyInlineCode = node.children && 
                    node.children.length === 1 && 
                    node.children[0].type === "element" && 
                    node.children[0].tagName === "code";
                  
                  return isOnlyInlineCode ? (
                    <span {...props}>{children}</span>
                  ) : (
                    <p {...props}>{children}</p>
                  );
                },
                code({ node, className, children, inline, ...props }) {
                  const isInline = inline || (node && node.tagName === 'code' && !className?.includes('language-'));
                  
                  if (isInline) {
                    return (
                      <code
                        className={className}
                        style={getCodeInlineStyle(postType)}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }
                
                  const match = /language-(\w+)/.exec(className || "");
                  return (
                    <SyntaxHighlighter
                      style={oneDark}
                      language={match ? match[1] : "plaintext"}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  );
                },
                
              }}
            >
              {c.content}
            </ReactMarkdown>

          </div>

          <div className="comment-actions">
            <button
              className="like-btn"
              onClick={() =>
                reactToComment(postId, c.id, liked ? yourLike.id : null)
              }
              disabled={loadingLikes[`p-${postId}`]}
            >
              <Heart
                size={17}
                fill={liked ? getLikeColorForType(postType) : "none"}
                color={liked ? getLikeColorForType(postType) : "#A1A1AA"}
                strokeWidth={2}
                style={{ verticalAlign: "middle", transition: "color 0.2s, fill 0.2s" }}
              />

              <span
                style={{ marginLeft: 6, cursor: 'pointer' }}
                onClick={e => {
                  e.stopPropagation();
                  openCommentLikesModal(c.id); 
                }}
              >
                {c.reactions.length}
              </span>

            </button>

            <span className="quote-tooltip">
              <button onClick={() => quoteComment(postId, c.id)}>
                ❝ Quote
              </button>
              <span className="quote-tooltip-text">
                Select text before quoting!
              </span>
            </span>


            <button onClick={() => toggleReply(c.id)}>
              <MessageCircle size={17} style={{ marginRight: 4 }} />
              {visibleReplies[c.id] ? "Cancel" : "Reply"}
            </button>

            {user.username === c.username && (
              <div className="reply-menu-container" ref={(el) => (commentMenuRefs.current[c.id] = el)}>
                <button
                  className="comment-menu-btn"
                  onClick={() =>
                    setOpenMenuComment(openMenuComment === c.id ? null : c.id)
                  }
                >
                  ⋯
                </button>
                {openMenuComment === c.id && (
                  <div className="comment-menu-dropdown">
                    <button onClick={() => deleteInteraction(c.id)}>
                      Remove Comment
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>

          {visibleReplies[c.id] && (
            <div className="comment-form">
              <div className="editor-container dark-editor" id={`reply-editor-${c.id}`}>
                <textarea
                  id={`reply-markdown-${c.id}`}
                  name="content"
                  style={{ display: "none" }}
                />
              </div>
              <button className="btn-submit" onClick={() => submitReply(postId, c.id)}>
                Submit
              </button>
            </div>
          )}

          {c.children.length > 0 && (
            <div className="replies">
              {renderTree(c.children, depth + 1, postId, postType)}
            </div>
          )}
        </div>
      );
    });

  const postTypeLabel = {
    snippet: t("postTypes.snippet"),
    meme: t("postTypes.meme"),
    tutorial: t("postTypes.tutorial"),
    research: t("postTypes.research"),
    question: t("postTypes.question"),
  };

  return (
    <>
      {likesModal.open && (
        <div className="modal-overlay" onClick={closeLikesModal}>
          <div
            className="user-modal"
            onClick={e => e.stopPropagation()}
          >
            <div className="user-modal-header">
              <h2>Liked by</h2>
              <button className="close-btn" onClick={closeLikesModal}>×</button>
            </div>
            <div className="user-modal-list">
              {likesModal.loading ? (
                <div>Loading…</div>
              ) : likesModal.error ? (
                <div style={{ color: "#f44" }}>{likesModal.error}</div>
              ) : (
                <ul style={{ listStyle: "none", padding: 0 }}>
                  {likesModal.users.map((u, idx) => (
                    <li className="user-modal-item" key={u.username || idx}>
                      <img
                        className="user-modal-avatar"
                        src={u.image_url || defaultAvatar}
                        alt={u.username}
                        onClick={() => navigate(`/users/${u.username}`)}
                      />
                      <div className="user-modal-info" onClick={() => navigate(`/users/${u.username}`)}>
                        <strong>{u.name}</strong>
                        <span>@{u.username}</span>
                      </div>
                      {canShowFollowBtn(u) && (
                      <FollowButton
                        userId={u.id}
                        isFollowing={u.is_following}
                        token={token}
                        onFollowChange={() => {
                          setLikesModal(modal => ({
                            ...modal,
                            users: modal.users.map(user =>
                              user.id === u.id
                                ? { ...user, is_following: !user.is_following }
                                : user
                            )
                          }));
                        }}
                      />


                      )}
                    </li>
                  ))}
                  {likesModal.users.length === 0 && (
                    <li style={{ color: "#bbb" }}>No likes yet.</li>
                  )}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {commentLikesModal.open && (
        <div className="modal-overlay" onClick={closeCommentLikesModal}>
          <div className="user-modal" onClick={e => e.stopPropagation()}>
            <div className="user-modal-header">
              <h2>Liked by</h2>
              <button className="close-btn" onClick={closeCommentLikesModal}>×</button>
            </div>
            <div className="user-modal-list">
              {commentLikesModal.loading ? (
                <div>Loading…</div>
              ) : commentLikesModal.error ? (
                <div style={{ color: "#f44" }}>{commentLikesModal.error}</div>
              ) : (
                <ul style={{ listStyle: "none", padding: 0 }}>
                  {commentLikesModal.users.map((u, idx) => (
                    <li className="user-modal-item" key={u.username || idx}>
                      <img
                        className="user-modal-avatar"
                        src={u.image_url || defaultAvatar}
                        alt={u.username}
                        onClick={() => navigate(`/users/${u.username}`)}
                      />
                      <div className="user-modal-info" onClick={() => navigate(`/users/${u.username}`)}>
                        <strong>{u.name}</strong>
                        <span>@{u.username}</span>
                      </div>
                      {canShowFollowBtn(u) && (
                        <FollowButton
                          userId={u.id}
                          isFollowing={u.is_following}
                          token={token}
                          onFollowChange={() => setCommentLikesModal(modal => ({
                            ...modal,
                            users: modal.users.map(user =>
                              user.id === u.id
                                ? { ...user, is_following: !user.is_following }
                                : user
                            )
                          }))}
                        />
                      )}
                    </li>
                  ))}
                  {commentLikesModal.users.length === 0 && (
                    <li style={{ color: "#bbb" }}>No likes yet.</li>
                  )}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {posts.map((post) => {
        const roots = buildCommentTree(post.interactions);
        const reactions = post.interactions.filter(
          (i) => i.type === "like" && !i.parent_id
        );
        const postKey = `p-${post.id}`;

        const savedInteraction = post.interactions.find(
          (i) => i.type === "save" && i.username === user.username && !i.parent_id
        );
        const isSaved = !!savedInteraction;
        const MAX_PREVIEW_LINES = 15;
        const isLongPost = post.content.split("\n").length > MAX_PREVIEW_LINES;

        return (
          <div   
            key={post.id}
            className={`post type-${post.type}`}
            onClick={() => {
              if (previewMode) navigate(`/posts/${post.id}`);
            }}
            style={previewMode ? { cursor: "pointer" } : {}}
          >
            <div className="post-author-line post-header-flex">
              <UserHoverCard username={post.username}>
                <div
                  className="clickable-author"
                  style={{ cursor: "pointer", display: "inline-flex", alignItems: "center" }}
                  onClick={(e) => {
                    e.stopPropagation();        
                    navigate(`/users/${post.username}`);
                  }}
                >
                  <img
                    src={post.image_url || defaultAvatar}
                    alt={post.name}
                    className="post-avatar"
                  />
                  <span className="author-name" style={{ marginLeft: 4 }}>
                    {post.name}
                  </span>
                  <span className="author-username" style={{ marginLeft: 4 }}>
                    @{post.username}
                  </span>
                </div>
              </UserHoverCard>

              <span className={`post-type-badge type-${post.type}`} style={{ marginLeft: 2 }}>
                {postTypeLabel[post.type] || post.type}
              </span>

              {post.group_id && groupImages[post.group_id] && (
                <Link
                  to={`/groups/${post.group_id}`}
                  className="mini-group-badge"
                  title={`Posted in group: ${groupImages[post.group_id].name}`}
                  style={{ marginLeft: 6, marginRight: 2, verticalAlign: 'middle', display: "inline-flex", alignItems: "center" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <img
                    src={groupImages[post.group_id].image || groupDefault}
                    alt={groupImages[post.group_id].name}
                    className="mini-group-badge-img"
                    onError={(e) => (e.target.src = groupDefault)} 
                  />
                </Link>
              )}


              <span
                className="post-created-time"
                style={{ marginLeft: 4, color: "#d7dadc", fontSize: "0.85rem" }}
              >
                • {formatDistanceToNow(new Date(post.created_at), {
                    addSuffix: true,
                    locale: dateLocales[i18n.language] || enUS,
                  })}
              </span>

              {post.updated_at && post.updated_at !== post.created_at && (
                <span
                  className="post-edited-time"
                  style={{ marginLeft: 4, whiteSpace: "nowrap", color: "#d7dadc", fontSize: "0.85rem" }}
                >
                  ({t("edited")})
                </span>
              )}
            </div>

            <div className="post-content">


              <PostMeta post={post} />

              <ReactMarkdown
                components={{
                  blockquote({ node, ...props }) {
                    const onlyCode =
                      node.children &&
                      node.children.length === 1 &&
                      node.children[0].type === "element" &&
                      (node.children[0].tagName === "pre" || node.children[0].tagName === "code");

                    if (onlyCode) {
                      return (
                        <blockquote className="quote-code">{props.children}</blockquote>
                      );
                    }
                    return (
                      <blockquote {...props} />
                    );
                  },
                  p({ node, children, ...props }) {
                    const isOnlyInlineCode = node.children && 
                      node.children.length === 1 && 
                      node.children[0].type === "element" && 
                      node.children[0].tagName === "code";
                    
                    return isOnlyInlineCode ? (
                      <span {...props}>{children}</span>
                    ) : (
                      <p {...props}>{children}</p>
                    );
                  },
                  code({ node, className, children, inline, ...props }) {
                    const isInline = inline || (node && node.tagName === 'code' && !className?.includes('language-'));
                    
                    if (isInline) {
                      return (
                        <code
                          className={className}
                          style={getCodeInlineStyle(post.type)}
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    }

                    const match = /language-(\w+)/.exec(className || "");
                    return (
                      <SyntaxHighlighter
                        style={oneDark}
                        language={match ? match[1] : "plaintext"}
                        PreTag="div"
                        {...props}
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    );
                  },
                }}
              >
                {previewMode
                  ? sanitizeForPreview(post.content, {
                      maxLines: MAX_PREVIEW_LINES,
                      maxConsecutiveEmpty: 5,
                      maxConsecutiveDuplicate: 3,
                    }) + (isLongPost ? "\n\n…" : "")
                  : post.content}
              </ReactMarkdown>

              {post.meme_url && (
                <div className="post-image-wrapper" style={{ marginTop: "1rem" }}>
                  <img
                    src={post.meme_url}
                    alt="Post image"
                    style={{ maxWidth: "100%", maxHeight: "300px", borderRadius: "8px", objectFit: "contain" }}
                  />
                </div>
              )}


              {post.tags?.length > 0 && (
                <div className="post-tags">
                  {post.tags.map((tag, idx) => (
                    <button
                      key={idx}
                      className="tag-badge"
                      onClick={() => navigate(`/tags/${encodeURIComponent(tag)}`)}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              )}

            </div>

            <div className="post-actions">
              <button
                className="like-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePostLike(
                    post.id,
                    reactions.find((r) => r.username === user.username)?.id
                  );
                }}
                disabled={loadingLikes[postKey]}
                aria-label="Like"
              >
                <Heart
                  size={17}
                  fill={reactions.some((r) => r.username === user.username)
                    ? getLikeColorForType(post.type)
                    : "none"}
                  color={reactions.some((r) => r.username === user.username)
                    ? getLikeColorForType(post.type)
                    : "#A1A1AA"}
                  strokeWidth={2.2}
                  style={{
                    verticalAlign: "middle",
                    transition: "color 0.2s, fill 0.2s"
                  }}
                />
                <span
                  style={{ marginLeft: 6, cursor: "pointer" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    openLikesModal(post.id);
                  }}
                >
                  {reactions.length}
                </span>
              </button>

              {isSinglePostPage && (
                <span className="quote-tooltip">
                  <button onClick={() => quotePost(post.id)}>❝ Quote</button>
                  <span className="quote-tooltip-text">Select text before quoting!</span>
                </span>
              )}

              {isSinglePostPage ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleEditor(post.id);
                  }}
                >
                  <MessageCircle size={17} style={{ marginRight: 4 }} />
                  {visibleEditors[post.id] ? "Cancel" : "Reply"}
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/posts/${post.id}`);
                  }}
                >
                  <MessageCircle size={17} style={{ marginRight: 4 }} />
                  {
                    post.interactions.filter(
                      (i) => i.type === "comment" && i.parent_id === null
                    ).length
                  }
                </button>
              )}

              {/* Bookmark - sempre visível, depois do comentário */}
              <button
                className="save-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePostSave(post.id, savedInteraction ? savedInteraction.id : null);
                }}
                aria-label={isSaved ? "Unsave" : "Save"}
                style={{
                  color: isSaved ? getLikeColorForType(post.type) : "#aaa",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                {isSaved ? (
                  <BookmarkCheck
                    size={20}
                    style={{
                      transition: "color 0.2s",
                      color: getLikeColorForType(post.type),
                      ...(isSaved ? { fill: getLikeColorForType(post.type) } : {})
                    }}
                  />
                ) : (
                  <Bookmark
                    size={20}
                    style={{
                      transition: "color 0.2s",
                      color: "#aaa"
                    }}
                  />
                )}
              </button>

              {user.username === post.username && (
                <div
                  className="post-menu-container"
                  ref={(el) => (postMenuRefs.current[`menu-${post.id}`] = el)}
                >
                  <button
                    className="post-menu-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuPost(openMenuPost === post.id ? null : post.id);
                    }}
                  >
                    ⋯
                  </button>

                  {openMenuPost === post.id && (
                    <div className="post-menu-dropdown">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/posts/${post.id}/edit`);
                        }}
                      >
                        Edit Post
                      </button>
                      <button onClick={() => handleRemovePost(post.id)}>
                        Remove Post
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>


            {visibleEditors[post.id] && (
              <div className="comment-form">
                <div className="editor-container dark-editor" id={`comment-editor-${post.id}`}>
                  <textarea
                    id={`comment-markdown-${post.id}`}
                    name="content"
                    style={{ display: "none" }}
                  />
                </div>
                <button className="btn-submit" onClick={() => submitComment(post.id)}>
                  Submit
                </button>
              </div>
            )}
            {!previewMode && (
              <div className="post-comments">
                {renderTree(roots, 0, post.id, post.type)}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
