import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import MainLayout from "./MainLayout";
import "../Groups/Groups.css"
import "./EditProfile.css"; 

function hasSpecialChar(str) {
  return /[!@#$%^&*()_\-+={}\[\]|\\:;"'<>,.?/~`]/.test(str);
}

function checkImage(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(true); 
    const img = new window.Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

function isValidInstagramUsername(username) {
  return (
    /^[a-z0-9._]{1,20}$/.test(username) &&
    !/^\./.test(username) &&
    !/\.$/.test(username) &&
    !/\.\./.test(username)
  );
}

function isValidName(str) {
  return /^[A-Za-zÀ-ÖØ-öø-ÿ]+$/.test(str);
}

function isValidLastName(str) {
  return /^[A-Za-zÀ-ÖØ-öø-ÿ]+(?: [A-Za-zÀ-ÖØ-öø-ÿ]+)*$/.test(str);
}


function getUsernameError(username) {
  if (!/^[a-z0-9._]{1,20}$/.test(username)) {
    return "Username should only contain lowercase letters, numbers, dots, or underscores, with a maximum length of 20 characters.";
  }
  if (/^\./.test(username)) {
    return "Username cannot start with a dot.";
  }
  if (/\.$/.test(username)) {
    return "Username cannot end with a dot.";
  }
  if (/\.\./.test(username)) {
    return "Username cannot contain consecutive dots.";
  }
  return null;
}


export default function EditProfile() {
  const [form, setForm] = useState({
    firstname: "",
    lastname: "",
    username: "",
    image_url: "",
    banner_url: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await axios.get(`${window.location.origin}/api/users/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const nameParts = data.name.split(" ");
        setForm((f) => ({
          ...f,
          firstname: nameParts[0] || "",
          lastname: nameParts.slice(1).join(" ") || "",
          username: data.username,
          image_url: data.image_url || "",
          banner_url: data.banner_url || "",
        }));
        setLoading(false);
      } catch {
        navigate("/login");
      }
    };

    if (!token) {
      navigate("/login");
    } else {
      fetchProfile();
    }
  }, [token, navigate]);

  const validate = () => {
    const newErrors = {};

    const cleanFirst = form.firstname.trim();
    const cleanLast  = form.lastname.trim().replace(/\s+/g, " ");

    if (!cleanFirst) newErrors.firstname = "First name is required.";
    else if (cleanFirst.length > 10) newErrors.firstname = "First name cannot exceed 10 characters.";
    else if (!isValidName(cleanFirst)) newErrors.firstname = "First name can only contain letters (no spaces or symbols).";

    if (!cleanLast) newErrors.lastname = "Last name is required.";
    else if (cleanLast.length > 20) newErrors.lastname = "Last name cannot exceed 20 characters.";
    else if (!isValidLastName(cleanLast)) newErrors.lastname = "Last name can only contain letters and spaces (no symbols).";

    if (!form.username.trim()) newErrors.username = "Username is required.";
    else {
      const usernameError = getUsernameError(form.username.trim());
      if (usernameError) newErrors.username = usernameError;
    }

    if (form.newPassword || form.confirmPassword || form.currentPassword) {
      if (!form.currentPassword)
        newErrors.currentPassword = "Please enter your current password.";
      if (!form.newPassword)
        newErrors.newPassword = "New password is required.";
      else if (form.newPassword.length < 6)
        newErrors.newPassword = "Password must be at least 6 characters.";
      else if (!hasSpecialChar(form.newPassword))
        newErrors.newPassword = "Password must contain a special character.";
      if (!form.confirmPassword)
        newErrors.confirmPassword = "Please repeat your new password.";
      else if (form.newPassword !== form.confirmPassword)
        newErrors.confirmPassword = "Passwords do not match.";
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError(null);
    const foundErrors = validate();
    
    if (form.image_url) {
      const validAvatar = await checkImage(form.image_url.trim());
      if (!validAvatar) foundErrors.image_url = "Avatar URL is invalid or unreachable.";
    }
    if (form.banner_url) {
      const validBanner = await checkImage(form.banner_url.trim());
      if (!validBanner) foundErrors.banner_url = "Banner URL is invalid or unreachable.";
    }
    
    if (Object.keys(foundErrors).length > 0) {
      setErrors(foundErrors);
      return;
    }
    const cleanFirst = form.firstname.trim();
    const cleanLast  = form.lastname.trim().replace(/\s+/g, " ");
    try {
      await axios.put(
        `${window.location.origin}/api/users/profile`,
        {
          firstname: cleanFirst,
          lastname: cleanLast,
          username: form.username,
          image_url: form.image_url || null,
          banner_url: form.banner_url || null,
          ...(form.newPassword
            ? { password: form.newPassword, current_password: form.currentPassword }
            : {}),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      navigate(`/users/${form.username}`);
    } catch (err) {
      if (
        err.response?.status === 400 &&
        typeof err.response.data?.detail === "string"
      ) {
        const d = err.response.data.detail;
        if (d.toLowerCase().includes("invalid username format")) {
          setErrors((e) => ({ ...e, username: "Invalid username format." }));
        } else if (d.toLowerCase().includes("already taken")) {
          setErrors((e) => ({ ...e, username: "This username is already taken." }));
        } else if (d.toLowerCase().includes("current password")) {
          setErrors((e) => ({ ...e, currentPassword: "Current password is incorrect." }));
        } else if (d.toLowerCase().includes("password")) {
          setErrors((e) => ({ ...e, newPassword: d }));
        } else {
          setGeneralError(d);
        }

      } else {
        setGeneralError("Could not save changes. Please try again.");
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setGeneralError(null);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <MainLayout>
      <div className="form-container">
        <form onSubmit={handleSubmit} className="edit-profile-form">
          <h2>Edit Profile</h2>
          <label>First name *</label>
          <input
            name="firstname"
            placeholder="First name *"
            value={form.firstname}
            onChange={handleChange}
            className={errors.firstname ? "invalid-input" : ""}
            autoComplete="off"
          />
          {errors.firstname && <div className="error-input">{errors.firstname}</div>}
          <label>Last name *</label>
          <input
            name="lastname"
            placeholder="Last name *"
            value={form.lastname}
            onChange={handleChange}
            className={errors.lastname ? "invalid-input" : ""}
            autoComplete="off"
          />
          {errors.lastname && <div className="error-input">{errors.lastname}</div>}
          <label>Username *</label>
          <input
            name="username"
            placeholder="Username *"
            value={form.username}
            onChange={handleChange}
            className={errors.username ? "invalid-input" : ""}
            autoComplete="off"
          />
          {errors.username && <div className="error-input">{errors.username}</div>}
          <label>Avatar URL</label>
          <input
            name="image_url"
            placeholder="Avatar URL"
            value={form.image_url}
            onChange={handleChange}
            autoComplete="off"
            className={errors.image_url ? "invalid-input" : ""}
          />
          {errors.image_url && <div className="error-input">{errors.image_url}</div>}
          <label>Banner URL</label>
          <input
            name="banner_url"
            placeholder="Banner URL"
            value={form.banner_url}
            onChange={handleChange}
            autoComplete="off"
            className={errors.banner_url ? "invalid-input" : ""}
          />
          {errors.banner_url && <div className="error-input">{errors.banner_url}</div>}

          <h3 style={{ marginTop: 20 }}>Change password</h3>
          <label>Current password</label>
          <input
            type="password"
            name="currentPassword"
            placeholder="Current password"
            value={form.currentPassword}
            onChange={handleChange}
            className={errors.currentPassword ? "invalid-input" : ""}
            autoComplete="off"
          />
          {errors.currentPassword && <div className="error-input">{errors.currentPassword}</div>}
          <label>New password</label>
          <input
            type="password"
            name="newPassword"
            placeholder="New password"
            value={form.newPassword}
            onChange={handleChange}
            className={errors.newPassword ? "invalid-input" : ""}
            autoComplete="off"
          />
          {errors.newPassword && <div className="error-input">{errors.newPassword}</div>}
          <label>Confirm new password</label>
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm new password"
            value={form.confirmPassword}
            onChange={handleChange}
            className={errors.confirmPassword ? "invalid-input" : ""}
            autoComplete="off"
          />
          {errors.confirmPassword && <div className="error-input">{errors.confirmPassword}</div>}

          {generalError && (
            <div className="error-input" style={{ textAlign: "center" }}>
              {generalError}
            </div>
          )}

          <div className="form-actions">
            <button type="submit" className="btn-join">
              Save changes
            </button>
            <button type="button" className="btn-leave" onClick={() => navigate(-1)}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
