import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, db, googleProvider } from "../firebase/firebase";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, getDoc } from "firebase/firestore";
import styles from "../styles/Register.module.scss";
import { FcGoogle } from "react-icons/fc";
import Image1 from "../assets/image/jira.jpg";

const ADMIN_EMAIL = "admin@gmail.com";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleRegister = async () => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);

      await setDoc(doc(db, "users", res.user.uid), {
        name,
        email: res.user.email,
        role: res.user.email === ADMIN_EMAIL ? "admin" : "user",
        createdAt: Date.now(),
      });
      
      navigate("/login");
    } catch (error) {
      alert(error.message);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const userRef = doc(db, "users", res.user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          name: res.user.displayName,
          email: res.user.email,
          role: res.user.email === ADMIN_EMAIL ? "admin" : "user",
          createdAt: Date.now(),
        });
      }

      navigate("/homeuser");
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className={styles.registerPage}>
      <div className={styles.title}>
              <img className={styles.img} src={Image1} alt="" />
              <h1>JIRA</h1>
            </div>
      <div className={styles.registerContainer}>
        <div className={styles.registerLeft}>
          <h1>Set up your Jira Account</h1>
          <p className={styles.subtitle}>
            continue to Jira
          </p>

          <div className={styles.registerForm}>
            <input
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className={styles.para}>By signing up, I accept the Jira <span className={styles.bluepara}>cloud Terms of Service </span>  and  acknowledge the <span className={styles.bluepara}>Privacy Policy</span>.</p>
          </div>
          <div className={styles.groupbtn}>
            <button className={styles.rigisterBtn} onClick={handleRegister}>
              Create account
            </button>
                
                <p>OR</p>

            <button onClick={handleGoogleRegister} className={styles.googleBtn}>
              <FcGoogle className={styles.googleIcon} />
              Continue with Google
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Register;
