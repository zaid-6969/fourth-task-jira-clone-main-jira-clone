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
  /* ================= ROUTE ================= */
  const { projectId, issueId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  /* ================= LOAD KANBAN BOARD (STATUS ONLY) ================= */
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

  /* ================= REDUX ================= */
  const columns = useSelector((state) => state.kanban.columns);

  const issue =
    columns.flatMap((col) => col.items).find((i) => i.id === issueId) || null;

  /* ================= QUILL ================= */
  const summaryRef = useRef(null);
  const descriptionRef = useRef(null);
  const summaryQuill = useRef(null);
  const descriptionQuill = useRef(null);

  const [editSummary, setEditSummary] = useState(false);
  const [editDescription, setEditDescription] = useState(false);

  const [summaryHTML, setSummaryHTML] = useState("");
  const [descriptionHTML, setDescriptionHTML] = useState("");

  const [activeActivityTab, setActiveActivityTab] = useState("Comments");
  const [activityOpen, setActivityOpen] = useState(true);

  /* ================= LOAD TICKET CONTENT ================= */
  useEffect(() => {
    if (!issueId) return;

    const ref = doc(db, "tickets", issueId);

    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSummaryHTML(data.summary || "");
        setDescriptionHTML(data.description || "");
      }
    });

    return () => unsub();
  }, [issueId]);

  /* ================= ISSUE NOT FOUND ================= */
  if (!issue) {
    return <div style={{ padding: 20 }}>Issue not found</div>;
  }

  /* ================= ACTIVITY ================= */
  const logMoveActivity = async (from, to) => {
    await addDoc(collection(db, "tickets", issue.id, "activity"), {
      type: "move",
      from,
      to,
      createdAt: serverTimestamp(),
    });
  };

  /* ================= STATUS UPDATE (BOARD ONLY) ================= */
  const updateStatus = async (columnId) => {
    const updated = structuredClone(columns);

    let sourceCol = null;
    let index = -1;

    for (const col of updated) {
      index = col.items.findIndex((c) => c.id === issue.id);
      if (index !== -1) {
        sourceCol = col;
        break;
      }
    }

    if (!sourceCol) return;

    const card = sourceCol.items[index];
    const target = updated.find((c) => c.id === columnId);
    if (!target) return;

    sourceCol.items.splice(index, 1);

    target.items.push({
      ...card,
      columnId: target.id,
      columnTitle: target.title,
    });

    await updateDoc(doc(db, "projects", projectId, "kanban", "board"), {
      columns: updated,
    });

    if (sourceCol.title !== target.title) {
      await logMoveActivity(sourceCol.title, target.title);
    }
  };

  /* ================= SAVE CONTENT ================= */
  const saveSummary = async () => {
    await updateDoc(doc(db, "tickets", issue.id), {
      summary: summaryQuill.current.root.innerHTML,
      updatedAt: new Date().toISOString(),
    });

    setEditSummary(false);
    summaryQuill.current = null;
  };

  const saveDescription = async () => {
    await updateDoc(doc(db, "tickets", issue.id), {
      description: descriptionQuill.current.root.innerHTML,
      updatedAt: new Date().toISOString(),
    });

    setEditDescription(false);
    descriptionQuill.current = null;
  };

  /* ================= INIT QUILL ================= */
  useEffect(() => {
    if (editSummary && !summaryQuill.current) {
      summaryQuill.current = new Quill(summaryRef.current, {
        theme: "snow",
        placeholder: "Add a summary…",
      });
      summaryQuill.current.root.innerHTML = summaryHTML;
    }

    if (editDescription && !descriptionQuill.current) {
      descriptionQuill.current = new Quill(descriptionRef.current, {
        theme: "snow",
        placeholder: "Add a description…",
      });
      descriptionQuill.current.root.innerHTML = descriptionHTML;
    }
  }, [editSummary, editDescription, summaryHTML, descriptionHTML]);

  /* ================= UI ================= */
  return (
    <div className="issue-page">
      {/* HEADER */}
      <div className="issue-header">
        <span className="issue-key">{issue.issueKey}</span>
        <span className="issue-title">{issue.content}</span>
        <button className="icon-btn" onClick={() => navigate(`/spaces/${projectId}`)}>
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
                  <button onClick={() => setEditSummary(false)}>Cancel</button>
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
                  <button onClick={() => setEditDescription(false)}>
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
                <IssueAllActivity issueId={issue.id} />
              )}
              {activeActivityTab === "Comments" && (
                <IssueComments issueId={issue.id} />
              )}
              {activeActivityTab === "History" && (
                <IssueActivity issueId={issue.id} />
              )}
            </>
          )}
        </div>

        {/* RIGHT */}
        <div className="issue-sidebar">
          <div className="issue-meta">
            <label>Status</label>
            <select
              value={issue.columnId}
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
            <div>{issue.createdByName || "—"}</div>
          </div>

          <div className="issue-meta">
            <label>Created</label>
            <div>
              {issue.createdAt
                ? new Date(issue.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                  })
                : "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IssuePage;
