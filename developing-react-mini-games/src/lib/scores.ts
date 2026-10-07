export type GameId = "masher" | "reaction";

export type Entry = {
  id: string;
  name: string;
  score: number;
  /** human readable result, e.g. "412 m · 18 $BOLT" or "9.21 s" */
  detail: string;
  ts: number;
  cpu?: boolean;
};

export type Board = Record<GameId, Entry[]>;

const KEY = "bolt-arcade:v2";
const NAME_KEY = "bolt-arcade:name";
const MAX_ROWS = 25;

export const GAMES: { id: GameId; name: string; short: string; unit: string }[] = [
  { id: "masher", name: "100m Masher", short: "100M", unit: "pts" },
  { id: "reaction", name: "Reaction 9.39", short: "RCT", unit: "pts" },
];

const SEED: Board = {
  masher: [
    { id: "s7", name: "USAIN_BOT", score: 9390, detail: "9.39 s — WORLD RECORD", ts: 0, cpu: true },
    { id: "s8", name: "THUMB_DESTROYER", score: 7100, detail: "10.84 s", ts: 0, cpu: true },
    { id: "s9", name: "KEYBOARD_KILLA", score: 5400, detail: "12.61 s", ts: 0, cpu: true },
  ],
  reaction: [
    { id: "s4", name: "TRIGGER_FINGER", score: 8420, detail: "158 ms avg", ts: 0, cpu: true },
    { id: "s5", name: "DEGEN_REFLEX", score: 7550, detail: "245 ms avg", ts: 0, cpu: true },
    { id: "s6", name: "SLOW_HUMAN", score: 5300, detail: "470 ms avg", ts: 0, cpu: true },
  ],
};

function emptyBoard(): Board {
  return { masher: [], reaction: [] };
}

export function loadBoard(): Board {
  if (typeof window === "undefined") return structuredClone(SEED);
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return structuredClone(SEED);
    const parsed = JSON.parse(raw) as Partial<Board>;
    const board = emptyBoard();
    (Object.keys(board) as GameId[]).forEach((g) => {
      const rows = Array.isArray(parsed[g]) ? (parsed[g] as Entry[]) : [];
      const merged = [...rows, ...SEED[g].filter((s) => !rows.some((r) => r.id === s.id))];
      board[g] = merged.sort((a, b) => b.score - a.score).slice(0, MAX_ROWS);
    });
    return board;
  } catch {
    return structuredClone(SEED);
  }
}

function persist(board: Board) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(board));
  } catch {
    /* storage blocked (private mode) — game still playable */
  }
}

/** Adds a run, keeps only the best result per player name, returns new board + 1-based rank. */
export function submitScore(
  game: GameId,
  name: string,
  score: number,
  detail: string,
): { board: Board; rank: number; isBest: boolean } {
  const board = loadBoard();
  const clean = (name || "ANON").toUpperCase().slice(0, 12);
  const rows = board[game].filter((r) => r.cpu || r.name !== clean);
  const previous = board[game].find((r) => !r.cpu && r.name === clean);
  const isBest = !previous || score > previous.score;
  const keep = isBest ? score : previous!.score;
  const keepDetail = isBest ? detail : previous!.detail;

  rows.push({
    id: `${game}-${clean}-${Date.now()}`,
    name: clean,
    score: keep,
    detail: keepDetail,
    ts: Date.now(),
  });

  board[game] = rows.sort((a, b) => b.score - a.score).slice(0, MAX_ROWS);
  persist(board);
  const rank = board[game].findIndex((r) => !r.cpu && r.name === clean) + 1;
  return { board, rank: rank || board[game].length, isBest };
}

/** General classification: sum of a player's best score in every game. */
export function overall(board: Board): { name: string; total: number; games: number; cpu?: boolean }[] {
  const map = new Map<string, { name: string; total: number; games: number; cpu?: boolean }>();
  (Object.keys(board) as GameId[]).forEach((g) => {
    board[g].forEach((row) => {
      const cur = map.get(row.name) ?? { name: row.name, total: 0, games: 0, cpu: row.cpu };
      cur.total += row.score;
      cur.games += 1;
      cur.cpu = cur.cpu && row.cpu;
      map.set(row.name, cur);
    });
  });
  return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 15);
}

export function getName(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setName(name: string) {
  try {
    window.localStorage.setItem(NAME_KEY, name.toUpperCase().slice(0, 12));
  } catch {
    /* ignore */
  }
}

export function shareUrl(text: string) {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}
