"use client";

import { useState } from "react";
import { ListTodo, Plus } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import styles from "./tasks.module.css";

export default function TasksPage() {
  const [tab, setTab] = useState<"mine" | "all">("mine");
  const toast = useToast();
  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div className={styles.segmented} role="group" aria-label="Task scope">
          <button type="button" aria-pressed={tab === "mine"} onClick={() => setTab("mine")}>My Tasks</button>
          <button type="button" aria-pressed={tab === "all"} onClick={() => setTab("all")}>All Tasks</button>
        </div>
        <button type="button" className={styles.link} onClick={() => toast.info("Thanks for the feedback")}>Share Feedback</button>
      </div>
      <div className={styles.strip}>
        <span>Automatically send all your tasks to your work apps.</span>
        <a href="/integrations">Connect</a>
      </div>
      <div className={styles.empty}>
        <ListTodo size={22} aria-hidden />
        <h2>All your meeting tasks in one place</h2>
        <p>Manage, assign and update all your meeting tasks here.</p>
        <button type="button" onClick={() => toast.info("Open a meeting to add action items", "Tasks live inside each meeting for now.")}>
          <Plus size={14} aria-hidden /> New
        </button>
      </div>
    </div>
  );
}
