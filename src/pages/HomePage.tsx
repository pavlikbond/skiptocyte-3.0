import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/features/auth/AuthProvider";
import { cn } from "@/lib/utils";

const CELLS = ["Neutrophil", "Lymphocyte", "Monocyte", "Eosinophil", "Basophil"] as const;

type CellName = (typeof CELLS)[number] | "Skiptocyte";

function emptyCounts(): Record<CellName, number> {
  return {
    Neutrophil: 0,
    Lymphocyte: 0,
    Monocyte: 0,
    Eosinophil: 0,
    Basophil: 0,
    Skiptocyte: 0,
  };
}

const HEAT = ["count-heat-1", "count-heat-2", "count-heat-3", "count-heat-4", "count-heat-5"] as const;
const RELATIVE_ORDER = [...CELLS, "Skiptocyte"] as const satisfies readonly CellName[];

function relativePercents(values: number[]): number[] {
  const total = values.reduce((sum, n) => sum + n, 0);
  if (total === 0) return values.map(() => 0);
  const exact = values.map((n) => (n / total) * 100);
  const floored = exact.map((n) => Math.floor(n));
  let leftover = 100 - floored.reduce((sum, n) => sum + n, 0);
  const byRemainder = exact
    .map((n, i) => ({ i, frac: n - Math.floor(n) }))
    .sort((a, b) => b.frac - a.frac);
  const out = [...floored];
  for (const { i } of byRemainder) {
    if (leftover <= 0) break;
    if (values[i] === 0) continue;
    out[i] += 1;
    leftover -= 1;
  }
  return out;
}

function heatClass(n: number) {
  return HEAT[Math.min(4, Math.floor(n / 25))];
}

export function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [counts, setCounts] = useState(emptyCounts);
  const [flashCell, setFlashCell] = useState<CellName | null>(null);
  const [flashTick, setFlashTick] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setCounts({
        Neutrophil: 8,
        Lymphocyte: 6,
        Monocyte: 3,
        Eosinophil: 2,
        Basophil: 1,
        Skiptocyte: 80,
      });
      return;
    }

    let cancelled = false;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const bump = (cell: CellName) => {
      setFlashCell(cell);
      setFlashTick((t) => t + 1);
      setCounts((c) => ({ ...c, [cell]: c[cell] + 1 }));
    };

    const run = async () => {
      while (!cancelled) {
        setCounts(emptyCounts());
        setFlashCell(null);
        const mixed = 20;
        for (let i = 0; i < mixed; i++) {
          if (cancelled) return;
          bump(CELLS[Math.floor(Math.random() * CELLS.length)]);
          await sleep(90);
        }
        const skipMax = 100 - mixed;
        for (let n = 1; n <= skipMax; n++) {
          if (cancelled) return;
          bump("Skiptocyte");
          await sleep(Math.max(12, 70 - n * 0.5));
        }
        await sleep(1400);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const fiveTotal = CELLS.reduce((sum, c) => sum + counts[c], 0);
  const tally = fiveTotal + counts.Skiptocyte;
  const skipColor = heatClass(counts.Skiptocyte);

  const relatives = useMemo(() => {
    const percents = relativePercents(RELATIVE_ORDER.map((name) => counts[name]));
    const out = {} as Record<CellName, string>;
    RELATIVE_ORDER.forEach((name, i) => {
      out[name] = `${percents[i]}%`;
    });
    return out;
  }, [counts]);

  return (
    <div className="mx-auto grid w-full max-w-6xl items-center gap-10 py-6 lg:min-h-[calc(100svh-5.5rem)] lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-14 lg:py-4">
      <div className="max-w-xl">
        <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
          Eyes on the scope.
        </h1>
        <p className="mt-4 text-lg text-muted-foreground text-pretty">
          One hand on the numpad. A free WBC differential counter built for the bench. Works fully
          offline.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Button size="lg" className="w-full sm:w-auto" asChild>
            <Link to="/differential">WBC Counter</Link>
          </Button>
          {user ? (
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => void logout()}>
              Log out
            </Button>
          ) : (
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => void navigate("/login")}>
              Login / Signup
            </Button>
          )}
        </div>
      </div>

      <Card
        aria-hidden="true"
        className="min-w-0 p-4 sm:p-5"
      >
        <div className="mb-4 text-center text-5xl font-bold tabular-nums tracking-tight sm:text-6xl">
          {tally}
          <span className="text-muted-foreground"> / 100</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="p-1 text-left font-medium">Cell</th>
              <th className="p-1 text-center font-medium">Count</th>
              <th className="p-1 text-center font-medium">Relative</th>
            </tr>
          </thead>
          <tbody>
            {CELLS.map((c) => (
              <tr
                key={c}
                className={cn(
                  "border-b border-border/70",
                  flashCell === c && (flashTick % 2 === 0 ? "flash-row-a" : "flash-row-b"),
                )}
              >
                <td className="p-1.5 font-medium">{c}</td>
                <td className="p-1.5 text-center font-semibold tabular-nums">{counts[c]}</td>
                <td className="p-1.5 text-center tabular-nums text-muted-foreground">
                  {relatives[c]}
                </td>
              </tr>
            ))}
            <tr
              className={cn(
                flashCell === "Skiptocyte" && (flashTick % 2 === 0 ? "flash-row-a" : "flash-row-b"),
              )}
            >
              <td className={cn("p-1.5 font-bold", skipColor)}>Skiptocyte</td>
              <td className={cn("p-1.5 text-center font-bold tabular-nums", skipColor)}>
                {counts.Skiptocyte}
              </td>
              <td className="p-1.5 text-center tabular-nums text-muted-foreground">
                {relatives.Skiptocyte}
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}
