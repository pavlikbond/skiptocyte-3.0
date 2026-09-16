import type { ReactElement } from "react";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
  type DocumentProps,
} from "@react-pdf/renderer";
import { estimateValues } from "@/lib/counting";
import { morphologyFindings } from "@/lib/types";
import { parseUnits } from "@/lib/units";
import type {
  DiffRow,
  EstimateCell,
  MorphologyState,
  PrintSettings,
} from "@/lib/types";
import type { RowStats } from "@/lib/counting";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 18, marginBottom: 12, fontWeight: 700 },
  fields: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  field: { width: "50%", marginBottom: 8 },
  label: { fontSize: 8, color: "#485765" },
  value: { borderBottomWidth: 1, borderBottomColor: "#92a9b4", minHeight: 12, paddingTop: 2 },
  meta: { marginBottom: 8 },
  table: { marginTop: 8 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#bfd5e2", paddingVertical: 4 },
  th: { fontWeight: 700, backgroundColor: "#e0edf6", paddingVertical: 5 },
  morph: { marginTop: 12 },
  super: { fontSize: 7, verticalAlign: "super" },
});

function Units({ units }: { units: string }) {
  const parts = parseUnits(units);
  if (parts.kind === "plain") return <Text>{parts.text}</Text>;
  return (
    <Text>
      {parts.base}
      <Text style={styles.super}>{parts.exp}</Text>
      {parts.rest}
    </Text>
  );
}

export type DiffReportArgs = {
  print: PrintSettings;
  rows: DiffRow[];
  stats: Map<string, RowStats>;
  wbcCount: number;
  corrected: number | null;
  ancValue: number | null;
  alcValue: number | null;
  me: string | null;
  morphology: MorphologyState;
};

function DiffDocument({
  print,
  rows,
  stats,
  wbcCount,
  corrected,
  ancValue,
  alcValue,
  me,
  morphology,
}: DiffReportArgs) {
  const visible = rows.filter((r) => print.showIgnored || !r.ignore);
  const morphLines = print.showMorphology ? morphologyFindings(morphology) : [];

  return (
    <Document>
      <Page size={print.paperSize === "A4" ? "A4" : "LETTER"} style={styles.page}>
        <Text style={styles.title}>{print.reportTitle}</Text>
        <View style={styles.fields}>
          {print.fields.map((f) => (
            <View key={f.name} style={styles.field}>
              <Text style={styles.label}>{f.name}</Text>
              <Text style={styles.value}>{f.value}</Text>
            </View>
          ))}
        </View>
        {print.showWBC ? (
          <View style={styles.meta}>
            <Text>
              WBC Count: {wbcCount} {print.showUnits ? <Units units={print.units} /> : null}
            </Text>
            {corrected != null ? <Text>Corrected WBC: {corrected}</Text> : null}
            {ancValue != null ? <Text>ANC: {ancValue}</Text> : null}
            {alcValue != null ? <Text>ALC: {alcValue}</Text> : null}
            {me ? <Text>M:E: {me}</Text> : null}
          </View>
        ) : null}
        <View style={styles.table}>
          <View style={[styles.row, styles.th]}>
            {print.showCell ? <Text style={{ flex: 2 }}>Cell</Text> : null}
            {print.showCount ? <Text style={{ flex: 1 }}>Count</Text> : null}
            {print.showRelative ? <Text style={{ flex: 1 }}>Relative</Text> : null}
            {print.showAbsolute ? <Text style={{ flex: 1 }}>Absolute</Text> : null}
          </View>
          {visible.map((r) => {
            const s = stats.get(r.id);
            return (
              <View key={r.id} style={styles.row}>
                {print.showCell ? <Text style={{ flex: 2 }}>{r.cell}</Text> : null}
                {print.showCount ? <Text style={{ flex: 1 }}>{r.count}</Text> : null}
                {print.showRelative ? (
                  <Text style={{ flex: 1 }}>
                    {r.ignore ? "" : `${s?.relative ?? 0}%`}
                  </Text>
                ) : null}
                {print.showAbsolute ? (
                  <Text style={{ flex: 1 }}>{r.ignore ? "" : s?.absolute ?? ""}</Text>
                ) : null}
              </View>
            );
          })}
        </View>
        {print.showMorphology ? (
          <View style={styles.morph}>
            <Text style={{ fontWeight: 700, marginBottom: 4 }}>Morphology</Text>
            {morphLines.length > 0 ? (
              morphLines.map((line) => (
                <Text key={line}>{line}</Text>
              ))
            ) : (
              <Text>None recorded</Text>
            )}
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

export type EstimateReportArgs = {
  print: PrintSettings;
  fieldCount: number;
  fieldCountMax: number;
  cells: EstimateCell[];
};

function EstimateDocument({
  print,
  fieldCount,
  fieldCountMax,
  cells,
}: EstimateReportArgs) {
  return (
    <Document>
      <Page size={print.paperSize === "A4" ? "A4" : "LETTER"} style={styles.page}>
        <Text style={styles.title}>{print.reportTitle}</Text>
        <View style={styles.fields}>
          {print.fields.map((f) => (
            <View key={f.name} style={styles.field}>
              <Text style={styles.label}>{f.name}</Text>
              <Text style={styles.value}>{f.value}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.meta}>
          Fields counted: {fieldCount} / {fieldCountMax}
        </Text>
        <View style={styles.table}>
          <View style={[styles.row, styles.th]}>
            <Text style={{ flex: 2 }}>Name</Text>
            <Text style={{ flex: 1 }}>Factor</Text>
            <Text style={{ flex: 1 }}>Count</Text>
            <Text style={{ flex: 1 }}>Average</Text>
            <Text style={{ flex: 1.4 }}>
              Estimate
              {print.showUnits ? " (" : ""}
              {print.showUnits ? <Units units={print.units} /> : null}
              {print.showUnits ? ")" : ""}
            </Text>
          </View>
          {cells.map((c) => {
            const v = estimateValues(c, fieldCount, fieldCountMax);
            return (
              <View key={c.id} style={styles.row}>
                <Text style={{ flex: 2 }}>{c.name}</Text>
                <Text style={{ flex: 1 }}>{c.factor ?? ""}</Text>
                <Text style={{ flex: 1 }}>{c.count}</Text>
                <Text style={{ flex: 1 }}>{v.average.toFixed(2)}</Text>
                <Text style={{ flex: 1.4 }}>{v.estimate.toLocaleString("en-US")}</Text>
              </View>
            );
          })}
        </View>
      </Page>
    </Document>
  );
}

function renderPdfToBlob(doc: ReactElement<DocumentProps>) {
  return pdf(doc).toBlob();
}

export function renderDiffBlob(args: DiffReportArgs) {
  return renderPdfToBlob(<DiffDocument {...args} />);
}

export function renderEstimateBlob(args: EstimateReportArgs) {
  return renderPdfToBlob(<EstimateDocument {...args} />);
}

async function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadDiffPdf(args: DiffReportArgs) {
  await download(
    await renderDiffBlob(args),
    `${args.print.reportTitle || "Report"}.pdf`,
  );
}

export async function downloadEstimatePdf(args: EstimateReportArgs) {
  await download(
    await renderEstimateBlob(args),
    `${args.print.reportTitle || "Report"}.pdf`,
  );
}

export { DiffDocument, EstimateDocument };
