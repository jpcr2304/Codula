import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import profilePicDefault from "../../images/profile-pic.png";
import "./UserHoverCard.css";

export default function UserHoverCard({ username, children, onFollowChange = () => {} }) {
  const [userData, setUserData] = useState(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const wrapperRef = useRef();
  const timer = useRef();

  useEffect(() => {
    if (!open || userData) return;
    axios
      .get(`${window.location.origin}/api/users/users/${username}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => setUserData(res.data))
      .catch(() => {});
  }, [open, username, userData]);

  const hideTimer = useRef();

  const handleMouseEnter = () => {
    clearTimeout(hideTimer.current);
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setPos({
        x: rect.left + rect.width / 2 + window.scrollX,
        y: rect.bottom + window.scrollY + 8,
      });
    }
    setOpen(true);
  };


  const handleMouseLeave = () => {
    hideTimer.current = setTimeout(() => {
      setOpen(false);
    }, 150); 
  };


  const tooltip = open && userData && createPortal(
    <div
      className="hover-card"
      style={{
        position: "absolute",
        top: pos.y,
        left: pos.x,
        transform: "translateX(-50%)",
        zIndex: 9999
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}

    >
      <img
        src={userData.image_url || profilePicDefault}
        alt={userData.name}
        className="hover-avatar"
      />
      <div className="hover-info">
        <strong className="hover-name" title={userData.name}>
          {userData.name}
        </strong>
        <span className="hover-username" title={userData.username}>
          @{userData.username}
        </span>
        <div className="hover-stats">
          <span>{userData.followers_count} followers</span>
          <span>{userData.following_count} following</span>
        </div>

        <div className="level-label">
          Level: <span className="circulo vermelho">{Math.floor(userData.xp / 100)}</span>
        </div>


        {!userData.is_self && !userData.blocked && !userData.blocked_me && (
          <button
            key={userData.following ? "following" : "not-following"}
            className={`btn-follow${userData.following ? " following" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              const action = userData.following ? "unfollow" : "follow";
              axios
                .post(`${window.location.origin}/api/users/${action}/${userData.id}`, {}, {
                  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                })
                .then(() => 
                  setUserData(d => {
                    const nowFollowing = !d.following;
                    const nowCount = d.followers_count + (nowFollowing ? 1 : -1);
                    const updated = {
                      ...d,
                      following: nowFollowing,
                      followers_count: nowCount,
                    };
                    onFollowChange(d.id, nowFollowing);
                    return updated;
                  })
                );
            }}
          >
            {userData.following ? "Unfollow" : "Follow"}
          </button>
        )}

      </div>
    </div>,
    document.body
  );

  return (
    <div
      className="hover-wrapper"
      ref={wrapperRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ display: "inline-block", position: "relative" }}
    >
      {children}
      {tooltip}
    </div>
  );
}
