import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { FiX } from "react-icons/fi";
import Quill from "quill";
import "quill/dist/quill.snow.css";

import ActivityTabs from "./ActivityTabs";
import IssueComments from "./IssueComments";
import IssueActivity from "./IssueActivity";
import IssueAllActivity from "./IssueAllActivity";

import {
  doc,
  updateDoc,
  addDoc,
  onSnapshot,
  collection,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase/firebase";
import { setColumns } from "../store/kanbanSlice";

import "../styles/issuePage.scss";

const IssuePage = () => {
  const { projectId, issueId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  /* ================= BOARD (FOR STATUS OPTIONS) ================= */
  const columns = useSelector((state) => state.kanban.columns);

  useEffect(() => {
    if (!projectId) return;

    const ref = doc(db, "projects", projectId, "kanban", "board");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        dispatch(setColumns(snap.data().columns || []));
      }
    });

    return () => unsub();
  }, [projectId, dispatch]);

  /* ================= TICKET (SOURCE OF TRUTH) ================= */
  const [ticket, setTicket] = useState(null);
  const [loadingTicket, setLoadingTicket] = useState(true);

  const [summaryHTML, setSummaryHTML] = useState("");
  const [descriptionHTML, setDescriptionHTML] = useState("");

  useEffect(() => {
    if (!issueId) {
      console.log("⚠️ No issueId provided");
      return;
    }

    console.log("🔍 Loading ticket:", issueId);
    const ref = doc(db, "tickets", issueId);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        console.log("✅ Ticket found:", data);
        setTicket({ id: issueId, ...data });
        setSummaryHTML(data.summary || "");
        setDescriptionHTML(data.description || "");
      } else {
        console.log("❌ Ticket not found in database:", issueId);
        setTicket(null);
      }
      setLoadingTicket(false);
    });

    return () => unsub();
  }, [issueId]);

  /* ================= QUILL (MUST ALWAYS RUN) ================= */
  const summaryRef = useRef(null);
  const descriptionRef = useRef(null);
  const summaryQuill = useRef(null);
  const descriptionQuill = useRef(null);

  const [editSummary, setEditSummary] = useState(false);
  const [editDescription, setEditDescription] = useState(false);

  /* ================= ACTIVITY STATE (MUST BE BEFORE RETURNS) ================= */
  const [activeActivityTab, setActiveActivityTab] = useState("All");
  const [activityOpen, setActivityOpen] = useState(true);

  useEffect(() => {
    if (editSummary && summaryRef.current && !summaryQuill.current) {
      summaryQuill.current = new Quill(summaryRef.current, {
        theme: "snow",
        placeholder: "Add a summary…",
      });
      summaryQuill.current.root.innerHTML = summaryHTML;
    }
  }, [editSummary, summaryHTML]);

  useEffect(() => {
    if (editDescription && descriptionRef.current && !descriptionQuill.current) {
      descriptionQuill.current = new Quill(descriptionRef.current, {
        theme: "snow",
        placeholder: "Add a description…",
      });
      descriptionQuill.current.root.innerHTML = descriptionHTML;
    }
  }, [editDescription, descriptionHTML]);

  /* ================= SAFE RETURNS (AFTER ALL HOOKS) ================= */
  if (loadingTicket) {
    return <div style={{ padding: 20 }}>Loading issue…</div>;
  }

  if (!ticket) {
    return <div style={{ padding: 20 }}>Issue not found</div>;
  }

  /* ================= SAVE SUMMARY ================= */
  const saveSummary = async () => {
    if (!summaryQuill.current) return;

    const html = summaryQuill.current.getSemanticHTML();

    setEditSummary(false);
    summaryQuill.current = null;
    setSummaryHTML(html);

    // 1️⃣ Update ticket (source of truth)
    await updateDoc(doc(db, "tickets", ticket.id), {
      summary: html,
      updatedAt: new Date().toISOString(),
    });

    // 2️⃣ Update board
    const updated = structuredClone(columns);

    for (const col of updated) {
      const i = col.items.findIndex((c) => c.id === ticket.id);
      if (i !== -1) {
        col.items[i].summary = html;
        break;
      }
    }

    dispatch(setColumns(updated));

    await updateDoc(doc(db, "projects", projectId, "kanban", "board"), {
      columns: updated,
    });
  };

  /* ================= SAVE DESCRIPTION ================= */
  const saveDescription = async () => {
    if (!descriptionQuill.current) return;

    const html = descriptionQuill.current.getSemanticHTML();

    setEditDescription(false);
    descriptionQuill.current = null;
    setDescriptionHTML(html);

    // 1️⃣ Update ticket (source of truth)
    await updateDoc(doc(db, "tickets", ticket.id), {
      description: html,
      updatedAt: new Date().toISOString(),
    });

    // 2️⃣ Update board
    const updated = structuredClone(columns);

    for (const col of updated) {
      const i = col.items.findIndex((c) => c.id === ticket.id);
      if (i !== -1) {
        col.items[i].description = html;
        break;
      }
    }

    dispatch(setColumns(updated));

    await updateDoc(doc(db, "projects", projectId, "kanban", "board"), {
      columns: updated,
    });
  };

  /* ================= STATUS UPDATE ================= */
  const updateStatus = async (columnId) => {
    if (columnId === ticket.columnId) return;

    const targetCol = columns.find((c) => c.id === columnId);
    if (!targetCol) return;

    // 1️⃣ Update ticket (source of truth)
    await updateDoc(doc(db, "tickets", ticket.id), {
      columnId,
      columnTitle: targetCol.title,
      updatedAt: new Date().toISOString(),
    });

    // 2️⃣ Update board
    const updated = structuredClone(columns);

    // Remove from old column
    for (const col of updated) {
      const i = col.items.findIndex((c) => c.id === ticket.id);
      if (i !== -1) {
        col.items.splice(i, 1);
        break;
      }
    }

    // Add to new column
    const target = updated.find((c) => c.id === columnId);
    if (!target) return;

    target.items.push({
      ...ticket,
      columnId,
      columnTitle: target.title,
    });

    dispatch(setColumns(updated));

    await updateDoc(doc(db, "projects", projectId, "kanban", "board"), {
      columns: updated,
    });

    // 3️⃣ Log activity
    await addDoc(collection(db, "tickets", ticket.id, "activity"), {
      type: "move",
      from: ticket.columnTitle,
      to: target.title,
      createdAt: serverTimestamp(),
    });
  };

  /* ================= UI ================= */
  return (
    <div className="issue-page">
      {/* HEADER */}
      <div className="issue-header">
        <span className="issue-key">{ticket.issueKey}</span>
        <span className="issue-title">{ticket.content}</span>
        <button
          className="icon-btn"
          onClick={() => navigate(`/spaces/${projectId}`)}
        >
          <FiX />
        </button>
      </div>

      <div className="issue-body">
        {/* LEFT */}
        <div className="issue-main">
          {/* SUMMARY */}
          <div className="issue-group">
            <label>Summary</label>
            {!editSummary ? (
              <div
                className="issue-view"
                dangerouslySetInnerHTML={{
                  __html:
                    summaryHTML ||
                    "<span class='muted'>Click to add summary</span>",
                }}
                onClick={() => setEditSummary(true)}
              />
            ) : (
              <>
                <div ref={summaryRef} className="issue-editor" />
                <div className="inline-actions">
                  <button onClick={saveSummary}>Save</button>
                  <button
                    onClick={() => {
                      setEditSummary(false);
                      summaryQuill.current = null;
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>

          {/* DESCRIPTION */}
          <div className="issue-group">
            <label>Description</label>
            {!editDescription ? (
              <div
                className="issue-view"
                dangerouslySetInnerHTML={{
                  __html:
                    descriptionHTML ||
                    "<span class='muted'>Click to add description</span>",
                }}
                onClick={() => setEditDescription(true)}
              />
            ) : (
              <>
                <div ref={descriptionRef} className="issue-editor" />
                <div className="inline-actions">
                  <button onClick={saveDescription}>Save</button>
                  <button
                    onClick={() => {
                      setEditDescription(false);
                      descriptionQuill.current = null;
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ACTIVITY */}
          <ActivityTabs
            activeTab={activeActivityTab}
            onTabChange={setActiveActivityTab}
            onToggle={setActivityOpen}
          />

          {activityOpen && (
            <>
              {activeActivityTab === "All" && (
                <IssueAllActivity issueId={ticket.id} />
              )}
              {activeActivityTab === "Comments" && (
                <IssueComments issueId={ticket.id} />
              )}
              {activeActivityTab === "History" && (
                <IssueActivity issueId={ticket.id} />
              )}
            </>
          )}
        </div>

        {/* RIGHT */}
        <div className="issue-sidebar">
          <div className="issue-meta">
            <label>Status</label>
            <select
              value={ticket.columnId || ""}
              onChange={(e) => updateStatus(e.target.value)}
            >
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="issue-meta">
            <label>Created by</label>
            <div className="issue-meta-value">
              {ticket.createdByName || "Unknown"}
            </div>
          </div>

          <div className="issue-meta">
            <label>Created</label>
            <div className="issue-meta-value">
              {ticket.createdAt
                ? new Date(ticket.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                  })
                : "—"}
            </div>
          </div>

          {ticket.startDate && (
            <div className="issue-meta">
              <label>Start date</label>
              <div className="issue-meta-value">
                {new Date(ticket.startDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "2-digit",
                  year: "numeric",
                })}
              </div>
            </div>
          )}

          {ticket.dueDate && (
            <div className="issue-meta">
              <label>Due date</label>
              <div className="issue-meta-value">
                {new Date(ticket.dueDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "2-digit",
                  year: "numeric",
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IssuePage;