import React from "react";
import "../styles/User.scss";
import { IoIosArrowDown } from "react-icons/io";

import { getAuth } from "firebase/auth";
import { doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";

const SupportCard = ({
  children,
  space, // 🔥 must receive full project object
  onClick,
}) => {

  const auth = getAuth();
  const currentUser = auth.currentUser;

  // 🔍 Detect role
  const getUserRole = () => {
    if (!space?.members || !currentUser) return null;

    const member = space.members.find(
      (m) => m.uid === currentUser.uid
    );

    return member ? member.role : null;
  };

  const role = getUserRole();

  const handleDelete = async (e) => {
    e.stopPropagation();
    await deleteDoc(doc(db, "projects", space.id));
  };

  const handleLeave = async (e) => {
    e.stopPropagation();

    const updatedMembers = space.members.filter(
      (m) => m.uid !== currentUser.uid
    );

    await updateDoc(doc(db, "projects", space.id), {
      members: updatedMembers,
    });
  };

  return (
    <div className="support-card-wrapper" onClick={onClick}>
      <div className="support-card">
        <div className="accent-bar"></div>

        <div className="card-content">
          <div className="card-header">
            <div className="card-left">
              <div className="icon">🎫</div>
              <div>
                <div className="title">
                  <h3>{children}</h3>
                </div>
                <p className="subtitle">Service management</p>
              </div>
            </div>

            <div className="card-actions">

              {(role === "owner" || role === "admin") && (
                <button
                  className="delete-btn"
                  onClick={handleDelete}
                  title="Delete project"
                >
                  ✖
                </button>
              )}

              {(role === "member" || role === "admin") && (
                <button
                  className="leave-btn"
                  onClick={handleLeave}
                  title="Leave project"
                >
                  Leave
                </button>
              )}

            </div>
          </div>

          <div className="card-body">
            <p className="section-title">Recent queues</p>

            <div className="row">
              <span>All open</span>
              <span className="count">0</span>
            </div>

            <div className="row">
              <span>Assigned to me</span>
              <span className="count">0</span>
            </div>

            <div className="card-hr"></div>

            <div className="footer" style={{ fontSize: "12px" }}>
              <span>3 queues</span>
              <span className="arrow">
                <IoIosArrowDown />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportCard;


