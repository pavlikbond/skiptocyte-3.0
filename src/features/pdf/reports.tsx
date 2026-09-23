import type { ReactElement, ReactNode } from "react";
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
import { parseUnits, unitBody } from "@/lib/units";
import type {
  DiffRow,
  EstimateCell,
  MorphologyState,
  PrintSettings,
} from "@/lib/types";
import type { RowStats } from "@/lib/counting";

const ink = "#1c2430";
const muted = "#5c6670";
const hairline = "#e3dfd6";
const fieldLine = "#c9c4ba";

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 40,
    paddingHorizontal: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: ink,
  },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 6 },
  titleRule: {
    borderBottomWidth: 0.6,
    borderBottomColor: fieldLine,
    marginBottom: 14,
  },
  fields: { flexDirection: "row", flexWrap: "wrap" },
  field: { width: "50%", marginBottom: 11 },
  fieldGutterRight: { paddingRight: 14 },
  fieldGutterLeft: { paddingLeft: 14 },
  label: { fontSize: 8, color: muted, marginBottom: 2 },
  value: {
    borderBottomWidth: 0.75,
    borderBottomColor: fieldLine,
    minHeight: 14,
    paddingBottom: 1,
  },
  meta: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  metaItem: { marginRight: 22, marginBottom: 2 },
  metaLabel: { color: muted },
  table: { marginTop: 2 },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderBottomWidth: 1,
    borderBottomColor: ink,
    paddingBottom: 4,
  },
  bodyRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 0.6,
    borderBottomColor: hairline,
    paddingVertical: 5,
  },
  name: { flex: 1, paddingRight: 10 },
  count: { width: 58, marginLeft: 14, textAlign: "right" },
  relative: { width: 64, marginLeft: 16, textAlign: "right" },
  absolute: { width: 78, marginLeft: 16, textAlign: "right" },
  absoluteUnits: { width: 156, marginLeft: 12, textAlign: "right" },
  factor: { width: 52, marginLeft: 12, textAlign: "right" },
  estCount: { width: 52, marginLeft: 12, textAlign: "right" },
  average: { width: 58, marginLeft: 12, textAlign: "right" },
  estimate: { width: 132, marginLeft: 12, textAlign: "right" },
  th: { fontSize: 9, fontWeight: 700 },
  section: { marginTop: 16 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    borderBottomWidth: 1,
    borderBottomColor: ink,
    paddingBottom: 3,
    marginBottom: 6,
  },
  sectionLine: { marginBottom: 2 },
  muted: { color: muted },
  super: { fontSize: 7, verticalAlign: "super" },
});

function formatCount(n: number) {
  return n.toLocaleString("en-US");
}

function formatRelative(n: number) {
  return `${n.toFixed(1)}%`;
}

function formatAbsolute(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 3 });
}

function decimalPlaces(n: number) {
  const text = n.toLocaleString("en-US", { maximumFractionDigits: 3, useGrouping: false });
  const dot = text.indexOf(".");
  return dot < 0 ? 0 : text.length - dot - 1;
}

function alignedFormatter(values: number[]) {
  const places = values.reduce((max, n) => Math.max(max, decimalPlaces(n)), 0);
  return (n: number) =>
    n.toLocaleString("en-US", {
      minimumFractionDigits: places,
      maximumFractionDigits: 3,
    });
}

function ReportHeader({ print }: { print: PrintSettings }) {
  return (
    <>
      <Text style={styles.title}>{print.reportTitle}</Text>
      <View style={styles.titleRule} />
      {print.fields.length > 0 ? (
        <View style={styles.fields}>
          {print.fields.map((f, i) => (
            <View
              key={`${i}:${f.name}`}
              style={[
                styles.field,
                i % 2 === 0 ? styles.fieldGutterRight : styles.fieldGutterLeft,
              ]}
            >
              <Text style={styles.label}>{f.name}</Text>
              <Text style={styles.value}>{f.value}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </>
  );
}

function MetaPair({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Text style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label} </Text>
      {children}
    </Text>
  );
}

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

function UnitSuffix({ units, show }: { units: string; show: boolean }) {
  if (!show || !units.trim()) return null;
  const body = unitBody(units);
  if (body.times) {
    return (
      <Text>
        {" × "}
        <Units units={body.text} />
      </Text>
    );
  }
  return (
    <Text>
      {" "}
      <Units units={body.text} />
    </Text>
  );
}

function UnitPhrase({ units }: { units: string }) {
  const body = unitBody(units);
  if (!body.times) return <Units units={body.text} />;
  return (
    <Text>
      {"× "}
      <Units units={body.text} />
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
  const formatAbs = alignedFormatter(
    visible.filter((r) => !r.ignore).map((r) => stats.get(r.id)?.absolute ?? 0),
  );
  const absoluteStyle = print.showUnits ? styles.absoluteUnits : styles.absolute;

  return (
    <Document>
      <Page size={print.paperSize === "A4" ? "A4" : "LETTER"} style={styles.page}>
        <ReportHeader print={print} />
        {print.showWBC ? (
          <View style={styles.meta}>
            <MetaPair label="WBC Count:">
              {formatCount(wbcCount)}
              <UnitSuffix units={print.units} show={print.showUnits} />
            </MetaPair>
            {corrected != null ? (
              <MetaPair label="Corrected WBC:">
                {formatAbsolute(corrected)}
                <UnitSuffix units={print.units} show={print.showUnits} />
              </MetaPair>
            ) : null}
            {ancValue != null ? (
              <MetaPair label="ANC:">
                {formatAbsolute(ancValue)}
                <UnitSuffix units={print.units} show={print.showUnits} />
              </MetaPair>
            ) : null}
            {alcValue != null ? (
              <MetaPair label="ALC:">
                {formatAbsolute(alcValue)}
                <UnitSuffix units={print.units} show={print.showUnits} />
              </MetaPair>
            ) : null}
            {me ? <MetaPair label="M:E:">{me}</MetaPair> : null}
          </View>
        ) : null}
        <View style={styles.table}>
          <View style={styles.headerRow}>
            {print.showCell ? (
              <Text style={[styles.name, styles.th]}>Cell</Text>
            ) : (
              <View style={styles.name} />
            )}
            {print.showCount ? <Text style={[styles.count, styles.th]}>Count</Text> : null}
            {print.showRelative ? (
              <Text style={[styles.relative, styles.th]}>Relative</Text>
            ) : null}
            {print.showAbsolute ? (
              <Text style={[absoluteStyle, styles.th]}>Absolute</Text>
            ) : null}
          </View>
          {visible.map((r) => {
            const s = stats.get(r.id);
            return (
              <View key={r.id} style={styles.bodyRow}>
                {print.showCell ? <Text style={styles.name}>{r.cell}</Text> : <View style={styles.name} />}
                {print.showCount ? (
                  <Text style={styles.count}>{formatCount(r.count)}</Text>
                ) : null}
                {print.showRelative ? (
                  <Text style={styles.relative}>
                    {r.ignore ? "" : formatRelative(s?.relative ?? 0)}
                  </Text>
                ) : null}
                {print.showAbsolute ? (
                  <Text style={absoluteStyle}>
                    {r.ignore ? "" : formatAbs(s?.absolute ?? 0)}
                    {r.ignore ? null : (
                      <UnitSuffix units={print.units} show={print.showUnits} />
                    )}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
        {print.showMorphology ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Morphology</Text>
            {morphLines.length > 0 ? (
              morphLines.map((line) => (
                <Text key={line} style={styles.sectionLine}>
                  {line}
                </Text>
              ))
            ) : (
              <Text style={styles.muted}>None recorded</Text>
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
  const computed = cells.map((c) => ({
    cell: c,
    values: estimateValues(c, fieldCount, fieldCountMax),
  }));
  const formatEst = alignedFormatter(computed.map((row) => row.values.estimate));

  return (
    <Document>
      <Page size={print.paperSize === "A4" ? "A4" : "LETTER"} style={styles.page}>
        <ReportHeader print={print} />
        <View style={styles.meta}>
          <MetaPair label="Fields counted:">
            {formatCount(fieldCount)} / {formatCount(fieldCountMax)}
          </MetaPair>
        </View>
        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={[styles.name, styles.th]}>Name</Text>
            <Text style={[styles.factor, styles.th]}>Factor</Text>
            <Text style={[styles.estCount, styles.th]}>Count</Text>
            <Text style={[styles.average, styles.th]}>Average</Text>
            <Text style={[styles.estimate, styles.th]}>
              Estimate
              {print.showUnits ? " (" : ""}
              {print.showUnits ? <UnitPhrase units={print.units} /> : null}
              {print.showUnits ? ")" : ""}
            </Text>
          </View>
          {computed.map(({ cell, values }) => (
            <View key={cell.id} style={styles.bodyRow}>
              <Text style={styles.name}>{cell.name}</Text>
              <Text style={styles.factor}>
                {cell.factor == null ? "" : cell.factor.toLocaleString("en-US")}
              </Text>
              <Text style={styles.estCount}>{formatCount(cell.count)}</Text>
              <Text style={styles.average}>{values.average.toFixed(2)}</Text>
              <Text style={styles.estimate}>{formatEst(values.estimate)}</Text>
            </View>
          ))}
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
