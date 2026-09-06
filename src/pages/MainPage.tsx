interface MainPageProps {
  onLogout: () => void;
}

export function MainPage({ onLogout }: MainPageProps) {
  return (
    <main className="main-page">
      <header className="app-header">
        <h1>openBIS Upload Helper</h1>

        <button onClick={onLogout}>
          Log out
        </button>
      </header>

      <section className="main-content">
        <h2>Upload data</h2>

        <p>
          You are logged in.
        </p>
      </section>
    </main>
  );
}