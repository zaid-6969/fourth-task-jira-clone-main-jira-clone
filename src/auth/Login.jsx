import { useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, db, googleProvider } from "../firebase/firebase";
import { useNavigate, Link } from "react-router-dom";
import { doc, getDoc, setDoc } from "firebase/firestore";
import styles from "../styles/LoginPage.module.scss";
import { FcGoogle } from "react-icons/fc";
import darkImage from "../assets/image/jira.login.jpg";
import lightImage from "../assets/image/jira.login.light.png";
import { useSelector } from "react-redux";

const ADMIN_EMAIL = "admin@gmail.com";

const Login = () => {
  const theme = useSelector((state) => state.theme.mode);
  const loginImage = theme === "light" ? lightImage : darkImage;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await handleUserData(result.user);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await handleUserData(result.user);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUserData = async (user) => {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        name: user.displayName || "",
        email: user.email,
        role: user.email === ADMIN_EMAIL ? "admin" : "user",
        createdAt: Date.now(),
      });
    }

    navigate(user.email === ADMIN_EMAIL ? "/admin" : "/homeuser", {
      replace: true,
    });
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginContainer}>
        {/* LEFT SIDE – IMAGE */}
        <div className={styles.loginImageWrapper}>
          <img
            src={loginImage}
            alt="Jira workflow illustration"
            className={styles.loginImage}
          />
        </div>

        {/* RIGHT SIDE – CONTENT */}
        <div className={styles.loginLeft}>
          <h1>Welcome back</h1>
          <p className={styles.subtitle}>
            Login to continue managing your work
          </p>

          <form onSubmit={handleLogin} className={styles.loginForm}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && <p className={styles.error}>{error}</p>}
            <div className={styles.groupbtn}>
              <button className={styles.loginbtn} type="submit">
                Login
              </button>
              <button onClick={handleGoogleLogin} className={styles.googleBtn}>
                <FcGoogle className={styles.googleIcon} />
                Continue with Google
              </button>
            </div>
          </form>

          <p className={styles.authFooter}>
            Do you have a google account?{" "}
            <Link to="/register" className={styles.registerLink}>
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
