import { useState } from "react";
import { useNavigate } from "react-router-dom"; 
import axios from "axios";
import "./Login.css";
import appLogo from "../../images/logo.png";

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isEmailValid, setIsEmailValid] = useState(true);
    const navigate = useNavigate();
    const [loginError, setLoginError] = useState(null);

    const validateEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleEmailChange = (e) => {
        setEmail(e.target.value);
        if (loginError === 'email') setLoginError(null);
    };

    const handlePasswordChange = (e) => {
        setPassword(e.target.value);
        if (loginError === 'password') setLoginError(null);
    };

    const handleEmailFocus = () => {
        if (email !== "") {
            setIsEmailValid(validateEmail(email));
        } else {
            setIsEmailValid(true); 
        }
    };


    const handleEmailBlur = () => {
        if (email === "") {
            setIsEmailValid(true);
        }
    };

    const handleLogin = async () => {
        setLoginError(null);

        if (!email.trim() || !validateEmail(email)) {
            setIsEmailValid(false);
            setLoginError('email');
            return;
        }
        if (!password.trim()) {
            setLoginError('password');
            return;
        }
        try {
            const serverAddress = window.location.origin;
            const response = await axios.post(serverAddress + "/api/users/login", { email, password });
            localStorage.setItem("token", response.data.access_token);
            navigate("/home");
        } catch (error) {
            setLoginError('password');
        }
    };



    return (
        <div className="login-container">
            <div className="login-card">
                <img src={appLogo} alt="Logo" className="logo" />
                <input
                    type="text"
                    placeholder="Email"
                    value={email}
                    onFocus={handleEmailFocus}
                    onChange={handleEmailChange}
                    onBlur={handleEmailBlur}
                    className={loginError === 'email' ? "invalid-input" : ""}
                />

                {loginError === 'email' && (
                    <div style={{ color: '#f472b6', fontSize: '0.95em', marginTop: '-7px', marginBottom: '6px' }}>
                        Please enter a valid email address.
                    </div>
                )}
                <input
                    type="password"
                    placeholder="Password"
                    onChange={handlePasswordChange}
                    className={loginError === 'password' ? "invalid-input" : ""}
                />
                {loginError === 'password' && (
                    <div style={{ color: '#f472b6', fontSize: '0.95em', marginTop: '-7px', marginBottom: '6px' }}>
                        Credentials do not match. Please try again.
                    </div>
                )}
                <button className="login-submit" onClick={handleLogin}>Login</button>
                <p>New? <a href="/register" className="signup">Sign up</a></p>
            </div>
        </div>
    );
}

export default Login;
