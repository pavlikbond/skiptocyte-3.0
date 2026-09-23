import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useCounterSession } from "@/features/counter/context/useCounterSession";
import { GRADE_MORPH_ITEMS } from "@/lib/types";
import type { MorphologyGrade } from "@/lib/types";

const GRADES: MorphologyGrade[] = [0, 1, 2, 3];

export function MorphologyPanel() {
  const { morphology, setMorphology } = useCounterSession();
  return (
    <Accordion type="single" collapsible className="mt-1">
      <AccordionItem value="morph">
        <AccordionTrigger>Morphology checklist</AccordionTrigger>
        <AccordionContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {GRADE_MORPH_ITEMS.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                <span>{item.label}</span>
                <select
                  className="h-8 rounded-md border border-input bg-background px-2"
                  value={morphology.grades[item.id] ?? 0}
                  onChange={(e) =>
                    setMorphology({
                      ...morphology,
                      grades: {
                        ...morphology.grades,
                        [item.id]: Number(e.target.value) as MorphologyGrade,
                      },
                    })
                  }
                >
                  {GRADES.map((g) => (
                    <option key={g} value={g}>
                      {g === 0 ? "—" : `${g}+`}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <div className="flex items-center justify-between gap-2 text-sm">
              <Label>Platelet estimate</Label>
              <select
                className="h-8 rounded-md border border-input bg-background px-2"
                value={morphology.plateletEstimate}
                onChange={(e) =>
                  setMorphology({
                    ...morphology,
                    plateletEstimate: e.target.value as typeof morphology.plateletEstimate,
                  })
                }
              >
                <option value="">—</option>
                <option value="low">Low</option>
                <option value="adequate">Adequate</option>
                <option value="increased">Increased</option>
              </select>
            </div>
            <div className="flex items-center justify-between gap-2 text-sm">
              <Label htmlFor="giant-platelets">Giant platelets</Label>
              <Checkbox
                id="giant-platelets"
                className="h-5 w-5 cursor-pointer"
                checked={morphology.giantPlatelets}
                onCheckedChange={(v) =>
                  setMorphology({ ...morphology, giantPlatelets: Boolean(v) })
                }
              />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
