import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CSF_UNITS = [
  { id: "ul", label: "cells/µL", perUl: 1 },
  { id: "ml", label: "cells/mL", perUl: 1000 },
  { id: "l", label: "cells/L", perUl: 1_000_000 },
  { id: "e6l", label: "×10⁶/L", perUl: 1 },
  { id: "e9l", label: "×10⁹/L", perUl: 0.001 },
] as const;

type CsfUnitId = (typeof CSF_UNITS)[number]["id"];

function formatCsfCount(value: number) {
  const abs = Math.abs(value);
  const maximumFractionDigits = abs >= 1000 ? 0 : abs >= 1 ? 2 : 4;
  return value.toLocaleString(undefined, { maximumFractionDigits });
}

function maturationTime(hct: number) {
  if (hct >= 40) return 1;
  if (hct >= 30) return 1.5;
  if (hct >= 20) return 2;
  return 2.5;
}

function Field({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Label htmlFor={id} className="leading-snug">
        {label}
      </Label>
      <Input
        id={id}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function ToolCard({
  title,
  lede,
  children,
}: {
  title: string;
  lede: string;
  children: ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{lede}</p>
      </div>
      {children}
    </Card>
  );
}

export function ToolsPage() {
  const [retic, setRetic] = useState("2");
  const [hct, setHct] = useState("30");
  const [cells, setCells] = useState("50");
  const [dilution, setDilution] = useState("10");
  const [squares, setSquares] = useState("9");
  const [csfUnit, setCsfUnit] = useState<CsfUnitId>("ul");

  const reticOut = useMemo(() => {
    const r = Number(retic);
    const h = Number(hct);
    if (!r || !h) return null;
    const crc = r * (h / 45);
    const rpi = crc / maturationTime(h);
    return { crc, rpi, mat: maturationTime(h) };
  }, [retic, hct]);

  const csfOut = useMemo(() => {
    const n = Number(cells);
    const d = Number(dilution);
    const s = Number(squares);
    if (!s) return null;
    const perUl = (n * d * 10) / s;
    const unit = CSF_UNITS.find((u) => u.id === csfUnit) ?? CSF_UNITS[0];
    return { value: perUl * unit.perUl, label: unit.label };
  }, [cells, dilution, squares, csfUnit]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <h1 className="sr-only">Tools</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <ToolCard
          title="Reticulocyte CRC / RPI"
          lede="Educational formulas, not clinical decision support."
        >
          <div className="flex flex-col gap-5">
            <Field id="retic-pct" label="Retic %" value={retic} onChange={setRetic} />
            <Field id="hct-pct" label="HCT %" value={hct} onChange={setHct} />
          </div>
          <div className="flex flex-col gap-2 text-sm tabular-nums">
            <p>CRC = retic% × (HCT / 45)</p>
            <p>RPI = CRC / maturation time</p>
            {reticOut ? (
              <p className="text-base">
                CRC {reticOut.crc.toFixed(2)} · maturation {reticOut.mat} · RPI{" "}
                {reticOut.rpi.toFixed(2)}
              </p>
            ) : null}
          </div>
        </ToolCard>
        <ToolCard
          title="CSF / body fluid"
          lede="Hemocytometer: cells/µL = (counted × dilution × 10) / squares (depth 0.1 mm)."
        >
          <div className="flex flex-col gap-5">
            <Field id="csf-cells" label="Cells counted" value={cells} onChange={setCells} />
            <Field id="csf-dilution" label="Dilution" value={dilution} onChange={setDilution} />
            <Field id="csf-squares" label="Squares" value={squares} onChange={setSquares} />
            <div className="flex flex-col gap-4">
              <Label htmlFor="csf-units" className="leading-snug">
                Result units
              </Label>
              <Select value={csfUnit} onValueChange={(value) => setCsfUnit(value as CsfUnitId)}>
                <SelectTrigger id="csf-units">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CSF_UNITS.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {csfOut != null ? (
            <p className="text-lg font-semibold tabular-nums">
              {formatCsfCount(csfOut.value)} {csfOut.label}
            </p>
          ) : null}
        </ToolCard>
      </div>
      <Button variant="outline" className="w-fit" asChild>
        <Link to="/differential">Back to counter</Link>
      </Button>
    </div>
  );
}
