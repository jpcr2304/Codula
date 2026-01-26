import { useEffect, useState } from "react";
import axios from "axios";
import MainLayout from "../Profile/MainLayout";
import "../Profile/Base.css";
import "../Groups/Groups.css";
import friend from "../../images/friend.png";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

function People() {
  const { t } = useTranslation();
  const [people, setPeople] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [followingIds, setFollowingIds] = useState([]);
  const [blockedOut, setBlockedOut] = useState(new Set()); 
  const [blockedIn, setBlockedIn] = useState(new Set());
  const navigate = useNavigate();

  const isBlockedEither = (p) =>
    blockedOut.has(Number(p.id)) ||
    blockedIn.has(Number(p.id)) ||
    !!p.blocked || !!p.blocked_me || !!p.isBlocked || !!p.blockedMe;


  useEffect(() => {
    fetchPeople();
    fetchFollowing();
    fetchBlocks();
  }, []);

  const fetchBlocks = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(
        `${window.location.origin}/api/users/my-blocked`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const out = new Set(res.data.map(u => Number(u.id)));
      setBlockedOut(out);
      setBlockedIn(new Set());
    } catch (err) {
      console.error("Erro ao buscar blocks:", err);
    }
  };

  const fetchPeople = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(`${window.location.origin}/api/users/people`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPeople(res.data);
    } catch (err) {
      console.error("Erro ao buscar pessoas:", err);
    }
  };

  const fetchFollowing = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(
        `${window.location.origin}/api/users/my-following`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFollowingIds(res.data.map(p => p.id));
    } catch (err) {
      console.error("Erro ao buscar following:", err);
    }
  };

  const handleFollow = async (userId) => {
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `${window.location.origin}/api/users/follow/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchFollowing();
    } catch (err) {
      console.error("Erro ao seguir:", err);
    }
  };

  const handleUnfollow = async (userId) => {
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `${window.location.origin}/api/users/unfollow/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchFollowing();
    } catch (err) {
      console.error("Erro ao deixar de seguir:", err);
    }
  };

  const followingPeople = people.filter(p => followingIds.includes(p.id));
  const suggestedPeople = people.filter(p => !followingIds.includes(p.id));

  const renderPersonCard = (person, isFollowing) => {
    const isSelf = person.is_self || person.isSelf;
    const blocked = isBlockedEither(person);

    return (
      <div
        key={person.id}
        className={`group-card person-card ${isFollowing ? "card-following" : "card-suggested"}`}
        onClick={() => navigate(`/users/${person.username}`)}
      >
        <div className="avatar-circle">
          <img
            src={person.image_url || friend}
            alt={person.name}
            className="person-avatar"
          />
        </div>
        <div className="group-info">
          <h4>{person.name}</h4>
          <p>@{person.username}</p>

          {!isSelf && !blocked && (
            <button
              className={isFollowing ? "btn-leave" : "btn-join"}
              onClick={(e) => {
                e.stopPropagation();
                if (blocked) return; 
                isFollowing ? handleUnfollow(person.id) : handleFollow(person.id);
              }}
            >
              {isFollowing ? t("unfollow") : t("follow")}
            </button>
          )}
        </div>
      </div>
    );
  };


  return (
    <MainLayout>
      <section className="groups-section people-page">
        <div className="groups-header">
          <h2>{t("people")}</h2>
        </div>

        <div className="search-container">
          <input
            className="search-bar"
            type="text"
            placeholder={t("search")}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {followingPeople.length > 0 && (
          <div className="following-section">
            <h3>{t("following")}</h3>
            <div className="group-list">
              {followingPeople
                .filter(person =>
                  person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  person.username.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map(person => renderPersonCard(person, true))}
            </div>
          </div>
        )}

        {suggestedPeople.length > 0 && (
          <div className="suggestions-section">
            <h3>{t("peopleYouMayKnow")}</h3>
            <div className="group-list">
              {suggestedPeople
                .filter(person =>
                  person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  person.username.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map(person => renderPersonCard(person, false))}
            </div>
          </div>
        )}

        {people.length === 0 && <p>{t("noPeopleFound")}</p>}
      </section>
    </MainLayout>
  );
}

export default People;