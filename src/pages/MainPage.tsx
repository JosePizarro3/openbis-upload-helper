import { useState } from "react";

import {
  CollectionSelector,
} from "../features/destination/CollectionSelector";
import {
  ProjectSelector,
} from "../features/destination/ProjectSelector";
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
  const [spaceExists, setSpaceExists] = useState(false);

  const [project, setProject] = useState("");
  const [projectExists, setProjectExists] = useState(false);

  const [collection, setCollection] = useState("");

  function handleSpaceChange(value: string) {
    setSpace(value);

    setProject("");
    setProjectExists(false);

    setCollection("");
  }

  function handleProjectChange(value: string) {
    setProject(value);

    setCollection("");
  }

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
              onChange={handleSpaceChange}
              onExistsChange={setSpaceExists}
            />

            <ProjectSelector
              space={space}
              spaceExists={spaceExists}
              value={project}
              onChange={handleProjectChange}
              onExistsChange={setProjectExists}
            />

            <CollectionSelector
              space={space}
              project={project}
              projectExists={projectExists}
              value={collection}
              onChange={setCollection}
            />
          </div>
        </div>
      </section>
    </main>
  );
}