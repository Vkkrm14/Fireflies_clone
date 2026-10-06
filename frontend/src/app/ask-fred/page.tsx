import { AskFredPanel } from "@/components/meetings/AskFredPanel";
import styles from "./ask-fred.module.css";

export default function AskFredPage() {
  return (
    <div className={styles.page}>
      <AskFredPanel bare prompt="What would you like to know about your meetings?" scope="All meetings" />
    </div>
  );
}
