import { useEffect, useState } from "react";
import { getSystemId } from "../utils/auth";

export default function SettingsPage() {
  const [systemId, setSystemId] = useState<string>("");

  useEffect(() => {
    getSystemId().then(setSystemId).catch(console.error);
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-4">Settings</h1>
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Application Settings</h2>
          <div className="form-control">
            <label className="input">
              <span className="label">System ID: </span>
              <input type="text" placeholder="URL" value={systemId}
              readOnly />
            </label>
          </div>
          <p>Copyright © 2026 Kagami-Git</p>
        </div>
      </div>
    </div>
  );
}
