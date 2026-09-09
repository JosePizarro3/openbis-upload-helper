import { useState } from "react";

import {
  SpaceSelector,
} from "../features/destination/SpaceSelector";


interface MainPageProps {
  onLogout: () => void;
}


export function MainPage({
  onLogout,
}: MainPageProps) {
  const [space, setSpace] = useState("");

  return (
    <main className="main-page">
      <header className="app-header">
        <h1>openBIS Upload Helper</h1>

        <button onClick={onLogout}>
          Log out
        </button>
      </header>

      <section className="main-content">
        <div className="workflow-card">
          <div className="workflow-card-header">
            <h2>Select destination</h2>

            <p>
              Choose where the data should be stored
              in openBIS.
            </p>
          </div>

          <div className="workflow-card-content">
            <SpaceSelector
              value={space}
              onChange={setSpace}
            />
          </div>
        </div>
      </section>
    </main>
  );
}