import { FormEvent, useState } from "react";
import { NavLink, Route, Routes, useNavigate } from "react-router-dom";
import Home from "./pages/Home";
import Songs from "./pages/Songs";
import SongDetail from "./pages/SongDetail";
import Videos from "./pages/Videos";
import VideoDetail from "./pages/VideoDetail";
import People from "./pages/People";
import PersonDetail from "./pages/PersonDetail";
import SearchResults from "./pages/SearchResults";

export default function App() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="app">
      <header className="header">
        <NavLink to="/" className="brand">
          🎵 Medley Manager
        </NavLink>
        <nav>
          <NavLink to="/videos">動画</NavLink>
          <NavLink to="/songs">曲</NavLink>
          <NavLink to="/people">担当者</NavLink>
        </nav>
        <form onSubmit={onSearch} className="searchbox">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="曲・動画・担当者を検索"
          />
        </form>
      </header>
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/videos" element={<Videos />} />
          <Route path="/videos/:id" element={<VideoDetail />} />
          <Route path="/songs" element={<Songs />} />
          <Route path="/songs/:id" element={<SongDetail />} />
          <Route path="/people" element={<People />} />
          <Route path="/people/:id" element={<PersonDetail />} />
          <Route path="/search" element={<SearchResults />} />
        </Routes>
      </main>
    </div>
  );
}
