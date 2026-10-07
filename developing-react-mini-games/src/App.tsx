import { useCallback, useEffect, useState } from "react";
import ArcadeSection from "./components/ArcadeSection";
import Hero from "./components/Hero";
import Leaderboard from "./components/Leaderboard";
import Nav from "./components/Nav";
import { Footer, Lore, Prizes } from "./components/Sections";
import {
  getName,
  loadBoard,
  setName as persistName,
  submitScore,
  type Board,
  type GameId,
} from "./lib/scores";

const PLAYS_KEY = "bolt-arcade:plays";

export default function App() {
  const [board, setBoard] = useState<Board>(() => loadBoard());
  const [name, setName] = useState<string>(() => getName());
  const [plays, setPlays] = useState(0);

  useEffect(() => {
    try {
      setPlays(Number(window.localStorage.getItem(PLAYS_KEY) ?? 0));
    } catch {
      /* ignore */
    }
  }, []);

  const handleName = useCallback((n: string) => {
    persistName(n);
    setName(n.toUpperCase().slice(0, 12));
  }, []);

  const handleSubmit = useCallback(
    (game: GameId, score: number, detail: string) => {
      const who = name || getName() || "ANON";
      const { board: next, rank } = submitScore(game, who, score, detail);
      setBoard(next);
      setPlays((p) => {
        const v = p + 1;
        try {
          window.localStorage.setItem(PLAYS_KEY, String(v));
        } catch {
          /* ignore */
        }
        return v;
      });
      return rank;
    },
    [name],
  );

  return (
    <div className="min-h-screen bg-ink text-paper">
      <Nav />
      <Hero plays={plays} />
      <ArcadeSection board={board} name={name} onName={handleName} onSubmit={handleSubmit} />
      <Leaderboard board={board} name={name} />
      <Prizes />
      <Lore />
      <Footer />
    </div>
  );
}
