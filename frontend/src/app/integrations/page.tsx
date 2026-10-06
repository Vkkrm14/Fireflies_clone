import { Calendar, Cloud, Phone, Plug, Video } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import styles from "./integrations.module.css";

const GROUPS = [
  { name: "Zoom", kind: "Video conferencing", icon: Video },
  { name: "Google Meet", kind: "Video conferencing", icon: Video },
  { name: "Google Calendar", kind: "Calendar", icon: Calendar },
  { name: "Salesforce", kind: "CRM", icon: Cloud },
  { name: "HubSpot", kind: "CRM", icon: Cloud },
  { name: "Slack", kind: "Collaboration", icon: Plug },
  { name: "Aircall", kind: "Dialer", icon: Phone },
];

export default function IntegrationsPage() {
  return (
    <div className={styles.page}>
      <h2>Integrations</h2>
      <p>Connect the tools you already use. Every integration is a placeholder in this build.</p>
      <ul className={styles.grid}>
        {GROUPS.map(({ name, kind, icon: Icon }) => (
          <li key={name} className={styles.card}>
            <span className={styles.icon}><Icon size={18} aria-hidden /></span>
            <div>
              <b>{name}</b>
              <span>{kind}</span>
            </div>
            <Badge tone="brand" dot>Coming soon</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
