import React, { useEffect, useState } from "react";
import { ImCross } from "react-icons/im";
import { useDispatch } from "react-redux";
import { toggleModule } from "../store/module";
import "../styles/creationModule.scss";

import { collection, getDocs, doc, getDoc, setDoc, addDoc, updateDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../firebase/firebase";

import style from "../styles/btn.module.scss";
import TextEditor from "./TextEditor";

import { MdKeyboardDoubleArrowUp, MdKeyboardDoubleArrowDown } from "react-icons/md";
import { FaEquals } from "react-icons/fa";

const Creationmodule = () => {
  const dispatch = useDispatch();
  const user = getAuth().currentUser;

  const [projects, setProjects] = useState([]);
  const [columns, setColumns] = useState([]);

  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedColumn, setSelectedColumn] = useState(null);

  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [priority, setPriority] = useState("medium");

  const [loading, setLoading] = useState(false);

  /* LOAD PROJECTS */
  useEffect(() => {
    const loadProjects = async () => {
      const snap = await getDocs(collection(db, "projects"));
      setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    loadProjects();
  }, []);

  /* LOAD COLUMNS */
  useEffect(() => {
    if (!selectedProject) return;

    const loadColumns = async () => {
      const refDoc = doc(db, "projects", selectedProject.id, "kanban", "board");
      const snap = await getDoc(refDoc);
      if (!snap.exists()) return;

      const board = snap.data();
      setColumns(board.columns || []);
      setSelectedColumn(board.columns?.[0] || null);
    };

    loadColumns();
  }, [selectedProject]);

  /* CREATE TICKET */
  const handleCreateTicket = async () => {
    if (!title || !selectedProject || !selectedColumn || loading) return;

    setLoading(true);

    try {
      // 1️⃣ Get current board to find issue number
      const boardRef = doc(db, "projects", selectedProject.id, "kanban", "board");
      const boardSnap = await getDoc(boardRef);
      if (!boardSnap.exists()) return;

      const board = boardSnap.data();
      
      // Find max issue number
      let maxIssueNumber = 0;
      board.columns.forEach((col) => {
        col.items?.forEach((item) => {
          if (item.issueNumber && item.issueNumber > maxIssueNumber) {
            maxIssueNumber = item.issueNumber;
          }
        });
      });
      
      const nextNumber = maxIssueNumber + 1;
      const issueKey = `${selectedProject.name}-${nextNumber}`;

      // 2️⃣ Create ticket document in tickets collection (SOURCE OF TRUTH)
      const ticketRef = await addDoc(collection(db, "tickets"), {
        issueNumber: nextNumber,
        issueKey,
        content: title,
        projectId: selectedProject.id,  // ✅ CRITICAL
        columnId: selectedColumn.id,
        columnTitle: selectedColumn.title,
        summary,  // ✅ NOW SAVED
        description,  // ✅ NOW SAVED
        dueDate,  // ✅ NOW SAVED
        startDate,  // ✅ NOW SAVED
        priority,  // ✅ NOW SAVED
        createdBy: user?.uid || "",
        createdByName: user?.displayName || user?.email || "",
        createdAt: new Date().toISOString(),
      });

      console.log("✅ Created ticket:", ticketRef.id, "with all data");

      // 3️⃣ Update board with new item
      const updatedColumns = board.columns.map((col) =>
        col.id === selectedColumn.id
          ? {
              ...col,
              items: [
                ...(col.items || []),
                {
                  id: ticketRef.id,  // Use ticket document ID
                  issueNumber: nextNumber,
                  issueKey,
                  content: title,
                  projectId: selectedProject.id,  // ✅ CRITICAL FOR MODAL REDIRECT
                  summary,
                  description,
                  dueDate,
                  startDate,
                  priority,
                  columnId: col.id,
                  columnTitle: col.title,
                  createdBy: user?.uid || "",
                  createdByName: user?.displayName || user?.email || "",
                  createdAt: new Date().toISOString(),
                },
              ],
            }
          : col
      );

      await updateDoc(boardRef, { columns: updatedColumns });

      // RESET FORM
      setTitle("");
      setSummary("");
      setDescription("");
      setDueDate("");
      setStartDate("");
      setPriority("medium");
      setSelectedColumn(columns[0] || null);
      dispatch(toggleModule());
    } catch (err) {
      console.error("CREATE TICKET FAILED:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="creation-overlay">
      <div className="creation-container">
        {/* HEADER */}
        <div className="creation-header">
          <h1>Create Ticket</h1>
          <button
            className="creation-close"
            onClick={() => dispatch(toggleModule())}
          >
            <ImCross />
          </button>
        </div>

        {/* BODY */}
        <div className="creation-body">
          {/* PROJECT */}
          <div className="form-group">
            <label>Project *</label>
            <div className="user-dropdown">
              <div
                className="user-dropdown-trigger"
                onClick={() => setShowProjectDropdown((p) => !p)}
              >
                {selectedProject?.name || "Select project"}
                <span className="arrow">▾</span>
              </div>

              {showProjectDropdown && (
                <div className="user-dropdown-menu">
                  {projects.map((p) => (
                    <div
                      key={p.id}
                      className="user-option"
                      onClick={() => {
                        setSelectedProject(p);
                        setShowProjectDropdown(false);
                      }}
                    >
                      {p.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* STATUS */}
          <div className="form-group">
            <label>Status *</label>
            <div className="user-dropdown">
              <div
                className="user-dropdown-trigger"
                onClick={() => setShowStatusDropdown((p) => !p)}
              >
                {selectedColumn?.title || "Select status"}
                <span className="arrow">▾</span>
              </div>

              {showStatusDropdown && (
                <div className="user-dropdown-menu">
                  {columns.map((col) => (
                    <div
                      key={col.id}
                      className="user-option"
                      onClick={() => {
                        setSelectedColumn(col);
                        setShowStatusDropdown(false);
                      }}
                    >
                      {col.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Summary</label>
            <TextEditor value={summary} onChange={setSummary} />
          </div>

          <div className="form-group">
            <label>Description</label>
            <TextEditor value={description} onChange={setDescription} />
          </div>

          <div className="form-group" style={{ width: "48%" }}>
            <label>Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}  // ✅ FIXED TYPO
            />
          </div>

          <div className="form-group" style={{ width: "48%" }}>
            <label>Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="priority-wrapper">
            <span className={`priority-icon ${priority}`}>
              {priority === "low" && <MdKeyboardDoubleArrowDown />}
              {priority === "medium" && <FaEquals />}
              {priority === "high" && <MdKeyboardDoubleArrowUp />}
            </span>

            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">Highest</option>
            </select>
          </div>
        </div>

        {/* FOOTER */}
        <div className="creation-footer">
          <button
            className={style["create-btn"]}
            disabled={loading || !title || !selectedProject || !selectedColumn}
            onClick={handleCreateTicket}
          >
            {loading ? "Creating..." : "Create Ticket"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Creationmodule;