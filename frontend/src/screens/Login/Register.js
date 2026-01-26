import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Register.css";
import appLogo from "../../images/logo.png";

function Register() {
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  function hasSpecialChar(str) {
    return /[!@#$%^&*()_\-+={}\[\]|\\:;"'<>,.?/~`]/.test(str);
  }

  function checkImage(url) {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
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

  function isValidName(str) {
    return /^[A-Za-zÀ-ÖØ-öø-ÿ]+$/.test(str);
  }

  function isValidLastName(str) {
  return /^[A-Za-zÀ-ÖØ-öø-ÿ]+(?: [A-Za-zÀ-ÖØ-öø-ÿ]+)*$/.test(str);
}



  const handleRegister = async () => {
    setErrors({});
    let newErrors = {};

    const cleanFirst = firstname.trim();
    const cleanLast  = lastname.trim().replace(/\s+/g, " ");

    if (!cleanFirst) newErrors.firstname = "First name is required.";
    else if (cleanFirst.length > 10) newErrors.firstname = "First name cannot exceed 10 characters.";
    else if (!isValidName(cleanFirst)) newErrors.firstname = "First name can only contain letters (no spaces or symbols).";

    if (!cleanLast) newErrors.lastname = "Last name is required.";
    else if (cleanLast.length > 20) newErrors.lastname = "Last name cannot exceed 20 characters.";
    else if (!isValidLastName(cleanLast)) newErrors.lastname = "Last name can only contain letters and spaces (no symbols).";


    if (!email.trim()) newErrors.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Please enter a valid email address.";
    if (!username.trim()) newErrors.username = "Username is required.";
    else {
      const usernameError = getUsernameError(username.trim());
      if (usernameError) newErrors.username = usernameError;
    }
    if (!password) newErrors.password = "Password is required.";
    else if (password.length < 6) newErrors.password = "Password must be at least 6 characters.";
    else if (!hasSpecialChar(password)) newErrors.password = "Password must contain a special character.";
    if (!repeatPassword) newErrors.repeatPassword = "Please repeat your password.";
    else if (repeatPassword !== password) newErrors.repeatPassword = "Passwords do not match.";

    if (imageUrl.trim()) {
      const isValid = await checkImage(imageUrl.trim());
      if (!isValid) newErrors.imageUrl = "Profile image URL is invalid or unreachable.";
    }

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    try {
      const serverAddress = window.location.origin;
      const payload = { firstname: cleanFirst, lastname: cleanLast, email, username, password };
      if (imageUrl.trim()) payload.image_url = imageUrl.trim();
      await axios.post(`${serverAddress}/api/users/register`, payload);
      navigate("/login");
    } catch (error) {
      let err = error?.response?.data?.detail || "Unknown error.";
      let fieldErrors = {};
      if (typeof err === "string") {
        if (err.includes("Email")) fieldErrors.email = err;
        else if (err.includes("Username")) fieldErrors.username = err;
        else if (err.includes("Invalid username format")) fieldErrors.username = "Invalid username format.";
        else fieldErrors.general = err;
      } else {
        fieldErrors.general = "Registration failed.";
      }
      setErrors(fieldErrors);
    }

  };

  const clearFieldError = (field) => {
    if (errors[field]) setErrors({ ...errors, [field]: undefined, general: undefined });
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <img src={appLogo} alt="Logo" className="logo" />
        <input
          type="text"
          placeholder="First Name"
          value={firstname}
          onChange={(e) => {
            setFirstname(e.target.value);
            clearFieldError("firstname");
          }}
          className={errors.firstname ? "invalid-input" : ""}
        />
        {errors.firstname && <div className="error-input">{errors.firstname}</div>}

        <input
          type="text"
          placeholder="Last Name"
          value={lastname}
          onChange={(e) => {
            setLastname(e.target.value);
            clearFieldError("lastname");
          }}
          className={errors.lastname ? "invalid-input" : ""}
        />
        {errors.lastname && <div className="error-input">{errors.lastname}</div>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            clearFieldError("email");
          }}
          className={errors.email ? "invalid-input" : ""}
        />
        {errors.email && <div className="error-input">{errors.email}</div>}

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            clearFieldError("username");
          }}
          className={errors.username ? "invalid-input" : ""}
        />
        {errors.username && <div className="error-input">{errors.username}</div>}

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            clearFieldError("password");
          }}
          className={errors.password ? "invalid-input" : ""}
        />
        {errors.password && <div className="error-input">{errors.password}</div>}

        <input
          type="password"
          placeholder="Repeat password"
          value={repeatPassword}
          onChange={(e) => {
            setRepeatPassword(e.target.value);
            clearFieldError("repeatPassword");
          }}
          className={errors.repeatPassword ? "invalid-input" : ""}
        />
        {errors.repeatPassword && <div className="error-input">{errors.repeatPassword}</div>}

        <input
          type="url"
          placeholder="Profile Image URL (optional)"
          value={imageUrl}
          onChange={(e) => {
            setImageUrl(e.target.value);
            clearFieldError("imageUrl");
          }}
          className={errors.imageUrl ? "invalid-input" : ""}
        />
        {errors.imageUrl && <div className="error-input">{errors.imageUrl}</div>}


        <button className="register-submit" onClick={handleRegister}>
          Register
        </button>
        {errors.general && <div className="error-input" style={{ textAlign: "center" }}>{errors.general}</div>}
        <p>
          Already have an account? <a href="/login" className="login">Login</a>
        </p>
      </div>
    </div>
  );
}

export default Register;
