import { useEffect, useState } from "react";
import axios from "axios";
import MainLayout from "../Profile/MainLayout";
import "../Profile/Base.css";
import "./Groups.css";
import { useNavigate } from "react-router-dom";
import groupDefault from "../../images/group-default.png";
import { useTranslation } from "react-i18next";

function checkImage(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(true); 
    const img = new window.Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

function isValidGroupName(name) {
  return (
    /^[a-z0-9._]{1,20}$/i.test(name) && 
    !/^\./.test(name) &&                 
    !/\.$/.test(name) &&                
    !/\.\./.test(name)                   
  );
}


function Groups() {
  const [groups, setGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [newGroupImage, setNewGroupImage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [userGroups, setUserGroups] = useState([]);
  const [formError, setFormError] = useState(""); 
  const navigate = useNavigate();
  const [fieldErrors, setFieldErrors] = useState({});
  const [userId, setUserId] = useState(null);
  const { t } = useTranslation();

  useEffect(() => {
    fetchGroups();
    fetchUserGroups();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await axios.get(`${window.location.origin}/api/users/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUserId(res.data.id);
      } catch (err) {
        console.error("Erro ao buscar perfil:", err);
      }
    };
    fetchProfile();
  }, []);

  const fetchGroups = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(`${window.location.origin}/api/users/groups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sorted = res.data.sort((a, b) => (b.members || 0) - (a.members || 0));
      setGroups(sorted);
    } catch (err) {
      console.error("Erro ao buscar grupos:", err);
    }
  };

  const fetchUserGroups = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(`${window.location.origin}/api/users/my-groups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserGroups(res.data.map(g => g.id));
    } catch (err) {
      console.error("Erro ao buscar grupos do utilizador:", err);
    }
  };

  const handleJoinGroup = async (id) => {
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `${window.location.origin}/api/users/groups/${id}/join`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchGroups();
      fetchUserGroups();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLeaveGroup = async (id) => {
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `${window.location.origin}/api/users/groups/${id}/leave`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchGroups();
      fetchUserGroups();
    } catch (err) {
      console.error(err);
    }
  };

  function getGroupNameError(name) {
    if (!/^[a-z0-9._]{1,20}$/i.test(name)) {
      return "Group name can only contain letters, numbers, dots, or underscores, with a maximum length of 20 characters.";
    }
    if (/^\./.test(name)) {
      return "Group name cannot start with a dot.";
    }
    if (/\.$/.test(name)) {
      return "Group name cannot end with a dot.";
    }
    if (/\.\./.test(name)) {
      return "Group name cannot contain consecutive dots.";
    }
    return null; 
  }


  const joined = groups.filter(g => userGroups.includes(g.id));
  const suggested = groups.filter(g => !userGroups.includes(g.id));

  return (
    <MainLayout>
      <section className="groups-section">
        <div className="groups-header">
          <h2>{t("groups")}</h2>
          <button
            className={showForm ? "btn-leave" : "btn-join"}
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? t("cancel") : t("createGroup")}
          </button>

        </div>

        {showForm && (
          <div className="create-group-form-card">
            <h3>{t("createNewGroup")}</h3>
            <form
              className="create-group-form"
              onSubmit={async (e) => {
                e.preventDefault();
                let errors = {};
                setFormError("");

                if (!newGroupName.trim()) {
                  errors.name = "Group name is required.";
                } else {
                  const groupNameError = getGroupNameError(newGroupName.trim());
                  if (groupNameError) errors.name = groupNameError;
                }

                if (newGroupImage.trim()) {
                  const isValidImage = await checkImage(newGroupImage.trim());
                  if (!isValidImage) errors.image = "Image URL is invalid or unreachable.";
                }

                if (Object.keys(errors).length > 0) {
                  setFieldErrors(errors);
                  return;
                } else {
                  setFieldErrors({});
                }

                axios.post(
                  `${window.location.origin}/api/users/groups`,
                  { 
                    name: newGroupName, 
                    description: newGroupDesc.trim() ? newGroupDesc : null, 
                    image: newGroupImage.trim() ? newGroupImage : null 
                  },
                  { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
                )
                  .then(() => {
                    setNewGroupName("");
                    setNewGroupDesc("");
                    setNewGroupImage("");
                    setShowForm(false);
                    fetchGroups();
                    fetchUserGroups();
                  })
                  .catch(err => {
                    let msg = "Could not create group. Please try again.";
                    if (err.response?.data?.detail) {
                      msg = err.response.data.detail;
                    } else if (typeof err.response?.data === "string") {
                      msg = err.response.data;
                    }
                    if (typeof msg === "string") {
                      if (msg.toLowerCase().includes("invalid group name format")) {
                        setFieldErrors((f) => ({ ...f, name: "Invalid group name format." }));
                        setFormError("");
                      } else if (
                        msg.toLowerCase().includes("nome") ||
                        msg.toLowerCase().includes("name") ||
                        msg.toLowerCase().includes("group already exists")
                      ) {
                        setFieldErrors((f) => ({ ...f, name: msg }));
                        setFormError("");
                      } else {
                        setFormError(msg);
                      }
                    } else {
                      setFormError(msg);
                    }

                  });
              }}
            >
              <label>Group Name</label>
              <input
                type="text"
                value={newGroupName}
                placeholder="Enter group name"
                onChange={e => {
                  setNewGroupName(e.target.value);
                  setFieldErrors((f) => ({ ...f, name: undefined }));
                  setFormError("");
                }}
                className={fieldErrors.name ? "invalid-input" : ""}
              />
              {fieldErrors.name && <div className="error-input">{fieldErrors.name}</div>}


              <label>Description (Optional)</label>
              <textarea
                value={newGroupDesc}
                placeholder="Enter group description"
                onChange={e => setNewGroupDesc(e.target.value)}
              />

              <label>Image URL (Optional)</label>
              <input
                type="text"
                value={newGroupImage}
                placeholder="Enter image URL"
                onChange={e => {
                  setNewGroupImage(e.target.value);
                  setFieldErrors((f) => ({ ...f, image: undefined }));
                }}
                className={fieldErrors.image ? "invalid-input" : ""}
              />
              {fieldErrors.image && <div className="error-input">{fieldErrors.image}</div>}

              {formError && <div className="error-input" style={{ textAlign: "center" }}>{formError}</div>}

              <button type="submit" className="btn-join">Create Group</button>
            </form>
          </div>
        )}

        <div className="search-container">
          <input
            className="search-bar"
            type="text"
            placeholder="Search groups..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>


        {joined.length > 0 && (
          <div className="joined-section">
            <h3>{t("yourGroups")}</h3>
            <div className="group-list">
              {joined
                .filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(g => (
                  <div
                    key={g.id}
                    className="group-card person-card"
                    onClick={() => navigate(`/groups/${g.id}`)}
                  >
                    <div className="avatar-circle">
                      <img
                        src={g.image ? g.image : groupDefault}
                        alt={g.name}
                        onError={e => { e.target.onerror = null; e.target.src = groupDefault; }}
                      />
                    </div>
                    <div className="group-info">
                      <h4>{g.name}</h4>
                      <p>
                        {g.description?.length > 20
                          ? g.description.slice(0, 20) + "..."
                          : g.description}
                      </p>
                      <p><strong>{g.members || 0}</strong> {t("members")}</p>
                      {g.owner_id === userId ? (
                        <span className="owner-badge">{t("owner")}</span>
                      ) : (
                        <button
                          className={userGroups.includes(g.id) ? "btn-leave" : "btn-join"}
                          onClick={(e) => {
                            e.stopPropagation();
                            userGroups.includes(g.id)
                              ? handleLeaveGroup(g.id)
                              : handleJoinGroup(g.id);
                          }}
                        >
                          {userGroups.includes(g.id) ? t("leave") : t("join")}
                        </button>
                      )}

                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {suggested.length > 0 && (
          <div className="suggestions-section">
            <h3>{t("popularGroups")}</h3>
            <div className="group-list">
              {suggested
                .filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(g => (
                  <div
                    key={g.id}
                    className="group-card person-card"
                    onClick={() => navigate(`/groups/${g.id}`)}
                  >
                    <div className="avatar-circle">
                      <img
                        src={g.image ? g.image : groupDefault}
                        alt={g.name}
                        onError={e => { e.target.onerror = null; e.target.src = groupDefault; }}
                      />
                    </div>
                    <div className="group-info">
                      <h4>{g.name}</h4>
                      <p>{g.description}</p>
                      <p><strong>{g.members || 0}</strong> {t("members")}</p>
                      <button
                        className={userGroups.includes(g.id) ? "btn-leave" : "btn-join"}
                        onClick={(e) => {
                          e.stopPropagation(); 
                          userGroups.includes(g.id)
                            ? handleLeaveGroup(g.id)
                            : handleJoinGroup(g.id);
                        }}
                      >
                        {userGroups.includes(g.id) ? t("leave") : t("join")}
                      </button>
                    </div>
                  </div>

                ))}
            </div>
          </div>
        )}

        {joined.length === 0 && suggested.length === 0 && (
          <p>{t("noGroupsFound")}</p>
        )}
      </section>
    </MainLayout>
  );
}

export default Groups;
