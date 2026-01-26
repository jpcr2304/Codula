
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import MainLayout from "../Profile/MainLayout";
import "../Profile/EditProfile.css";

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



export default function EditGroup() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [form, setForm] = useState({
    name: "",
    description: "",
    image: "",
    banner_url: "",
  });
  const [loading, setLoading] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState("");


  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const { data } = await axios.get(`${window.location.origin}/api/users/groups`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const group = data.find((g) => g.id === Number(groupId));
        if (!group) throw new Error("Grupo não encontrado");

        setForm({
          name: group.name,
          description: group.description,
          image: group.image || "",
          banner_url: group.banner_url || "",
        });
        setLoading(false);
      } catch (err) {
        navigate("/home");
      }
    };

    if (!token) {
      navigate("/login");
    } else {
      fetchGroup();
    }
  }, [token, navigate, groupId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    setGeneralError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let errors = {};
    setGeneralError("");

  if (!form.name.trim()) {
    errors.name = "Group name is required.";
  } else {
    const groupNameError = getGroupNameError(form.name.trim());
    if (groupNameError) errors.name = groupNameError;
  }

    if (form.image) {
      const validImage = await checkImage(form.image.trim());
      if (!validImage) errors.image = "Group image URL is invalid or unreachable.";
    }
    if (form.banner_url) {
      const validBanner = await checkImage(form.banner_url.trim());
      if (!validBanner) errors.banner_url = "Banner URL is invalid or unreachable.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    } else {
      setFieldErrors({});
    }

    try {
      await axios.put(
        `${window.location.origin}/api/users/groups/${groupId}`,
        {
          name: form.name,
          description: form.description.trim() ? form.description : null,
          image: form.image || null,
          banner_url: form.banner_url || null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate(`/groups/${groupId}`);
    } catch (err) {
        let msg = "Erro ao atualizar grupo.";
        if (err.response?.data?.detail) {
          msg = err.response.data.detail;
        } else if (typeof err.response?.data === "string") {
          msg = err.response.data;
        }

        if (typeof msg === "string") {
          if (msg.toLowerCase().includes("invalid group name format")) {
            setFieldErrors((e) => ({ ...e, name: "Invalid group name format." }));
          } else if (msg.toLowerCase().includes("nome") || msg.toLowerCase().includes("name")) {
            setFieldErrors((e) => ({ ...e, name: msg }));
          } else {
            setGeneralError(msg);
          }
        } else {
          setGeneralError(msg);
        }

      }
  };


  if (loading) return <div>Carregando...</div>;

  return (
    <MainLayout>
      <div className="form-container">
        <h2>Edit Group</h2>
        <form onSubmit={handleSubmit} className="edit-profile-form">
          <label>Name *</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Group name"
            className={fieldErrors.name ? "invalid-input" : ""}
          />
          {fieldErrors.name && <div className="error-input">{fieldErrors.name}</div>}

          <label>Description</label>
          <input
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Group description"
            className={fieldErrors.description ? "invalid-input" : ""}
          />
          {fieldErrors.description && <div className="error-input">{fieldErrors.description}</div>}

          <label>Avatar URL</label>
          <input
            name="image"
            value={form.image}
            onChange={handleChange}
            placeholder="Avatar URL"
            className={fieldErrors.image ? "invalid-input" : ""}
          />
          {fieldErrors.image && <div className="error-input">{fieldErrors.image}</div>}

          <label>Banner URL</label>
          <input
            name="banner_url"
            value={form.banner_url}
            onChange={handleChange}
            placeholder="Banner URL"
            className={fieldErrors.banner_url ? "invalid-input" : ""}
          />
          {fieldErrors.banner_url && <div className="error-input">{fieldErrors.banner_url}</div>}

          {generalError && <div className="error-input" style={{ textAlign: "center" }}>{generalError}</div>}

          <div className="form-actions">
            <button type="submit" className="btn-join">Salvar alterações</button>
            <button type="button" className="btn-leave" onClick={() => navigate(-1)}>Cancelar</button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
