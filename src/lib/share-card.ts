// Mashg'ulot natijasini Instagram/Telegram Story uchun 9:16 (1080×1920) rasm
// sifatida chizadi. Faqat Canvas 2D API — serverga so'rov ham, AI ham yo'q.
// Kartada ism, email yoki boshqa shaxsiy ma'lumot bo'lmaydi.

export interface ShareCardRecord {
  exerciseName: string;
  previousWeightKg: number;
  previousReps: number;
  weightKg: number;
  reps: number;
}

export interface ShareCardData {
  startedAt: string;
  finishedAt: string;
  totalVolumeKg: number;
  totalSets: number;
  caloriesBurned: number;
  exercises: { exerciseName: string; sets: { weightKg: number; reps: number }[] }[];
  cardio: { label: string; durationMin: number }[];
  records: ShareCardRecord[];
}

export interface ShareCardFonts {
  display: string;
  body: string;
  mono: string;
}

const W = 1080;
const H = 1920;
const PAD = 88;
const LIME = "#c3f400";
const CYAN = "#00dbe9";
const WHITE = "#f4f6ee";
const MUTED = "#8e9379";
const BG_TOP = "#0b0d0c";
const BG_BOTTOM = "#121614";
const SITE = "auraf1t.netlify.app";

const UZ_MONTHS = ["yan", "fev", "mar", "apr", "may", "iyun", "iyul", "avg", "sen", "okt", "noy", "dek"];

export function formatThousands(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${UZ_MONTHS[d.getMonth()]} ${d.getFullYear()}`.toUpperCase();
}

function durationParts(startedAt: string, finishedAt: string): { value: string; unit: string } {
  const minutes = Math.max(
    1,
    Math.round((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 60000),
  );
  if (minutes < 60) return { value: String(minutes), unit: "DAQIQA" };
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return { value: `${h}:${String(m).padStart(2, "0")}`, unit: "SOAT" };
}

function formatSet(weightKg: number, reps: number): string {
  return weightKg > 0 ? `${formatThousands(weightKg)} kg × ${reps}` : `${reps} takror`;
}

function setSpacing(ctx: CanvasRenderingContext2D, px: number) {
  // letterSpacing eski Safari'da yo'q — bo'lmasa oddiy chiziladi.
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px}px`;
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) out = out.slice(0, -1);
  return `${out.trimEnd()}…`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color.replace("ALPHA", String(alpha)));
  g.addColorStop(1, color.replace("ALPHA", "0"));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function drawBackground(ctx: CanvasRenderingContext2D) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, BG_TOP);
  bg.addColorStop(1, BG_BOTTOM);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  glow(ctx, W * 0.92, 260, 760, "rgba(195,244,0,ALPHA)", 0.2);
  glow(ctx, W * 0.02, H * 0.72, 820, "rgba(0,219,233,ALPHA)", 0.13);
  glow(ctx, W * 0.5, H * 1.02, 600, "rgba(195,244,0,ALPHA)", 0.08);

  // Nozik perspektiv to'r — kiberpank kayfiyati, matnga xalaqit bermaydi.
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.035)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(W, y + 0.5);
    ctx.stroke();
  }
  ctx.restore();

  // Chetlarni qorong'ilashtiruvchi vinyetka.
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);

  // Diagonal "tezlik" chiziqlari.
  ctx.save();
  ctx.strokeStyle = "rgba(195,244,0,0.10)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(W - 380 + i * 46, 0);
    ctx.lineTo(W + 40 + i * 46, 420);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCorners(ctx: CanvasRenderingContext2D) {
  const inset = 44;
  const len = 64;
  ctx.save();
  ctx.strokeStyle = "rgba(195,244,0,0.55)";
  ctx.lineWidth = 4;
  ctx.lineCap = "square";
  const corners: [number, number, number, number][] = [
    [inset, inset, 1, 1],
    [W - inset, inset, -1, 1],
    [inset, H - inset, 1, -1],
    [W - inset, H - inset, -1, -1],
  ];
  for (const [x, y, dx, dy] of corners) {
    ctx.beginPath();
    ctx.moveTo(x, y + dy * len);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * len, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawLogo(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const s = size / 32;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = 3;
  ctx.shadowColor = "rgba(195,244,0,0.6)";
  ctx.shadowBlur = 10;
  ctx.strokeStyle = LIME;
  ctx.beginPath();
  ctx.moveTo(6, 28);
  ctx.lineTo(16, 5);
  ctx.lineTo(26, 28);
  ctx.stroke();
  ctx.shadowColor = "rgba(0,219,233,0.6)";
  ctx.strokeStyle = CYAN;
  ctx.beginPath();
  ctx.moveTo(10.5, 19);
  ctx.lineTo(21.5, 19);
  ctx.stroke();
  ctx.restore();
}

function drawTrophy(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  const s = size / 24;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  // Kosa
  ctx.beginPath();
  ctx.moveTo(7, 3);
  ctx.lineTo(17, 3);
  ctx.lineTo(17, 9);
  ctx.bezierCurveTo(17, 12.5, 14.8, 14.5, 12, 14.5);
  ctx.bezierCurveTo(9.2, 14.5, 7, 12.5, 7, 9);
  ctx.closePath();
  ctx.fill();
  // Quloqlar
  ctx.beginPath();
  ctx.moveTo(7, 5);
  ctx.lineTo(4, 5);
  ctx.bezierCurveTo(4, 8.5, 5.5, 10, 7.3, 10.3);
  ctx.moveTo(17, 5);
  ctx.lineTo(20, 5);
  ctx.bezierCurveTo(20, 8.5, 18.5, 10, 16.7, 10.3);
  ctx.stroke();
  // Oyoq
  ctx.beginPath();
  ctx.moveTo(12, 14.5);
  ctx.lineTo(12, 18);
  ctx.moveTo(8, 21);
  ctx.lineTo(16, 21);
  ctx.moveTo(9.5, 18);
  ctx.lineTo(14.5, 18);
  ctx.stroke();
  ctx.restore();
}

interface Row {
  title: string;
  value: string;
  note?: string;
}

function buildRows(data: ShareCardData): { heading: string; accent: string; rows: Row[]; trophy: boolean } {
  if (data.records.length > 0) {
    return {
      heading: data.records.length > 1 ? "YANGI SHAXSIY REKORDLAR" : "YANGI SHAXSIY REKORD",
      accent: LIME,
      trophy: true,
      rows: data.records.slice(0, 3).map((r) => ({
        title: r.exerciseName,
        value: formatSet(r.weightKg, r.reps),
        note: `avval ${formatSet(r.previousWeightKg, r.previousReps)}`,
      })),
    };
  }
  const strength = data.exercises
    .filter((e) => e.sets.length > 0)
    .map((e) => {
      const best = e.sets.reduce((a, b) => (b.weightKg > a.weightKg || (b.weightKg === a.weightKg && b.reps > a.reps) ? b : a));
      const volume = e.sets.reduce((sum, s) => sum + s.weightKg * s.reps, 0);
      return { e, best, volume };
    })
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 4)
    .map(({ e, best }) => ({
      title: e.exerciseName,
      value: formatSet(best.weightKg, best.reps),
      note: `${e.sets.length} podxod`,
    }));
  const cardio = data.cardio.slice(0, Math.max(0, 4 - strength.length)).map((c) => ({
    title: c.label,
    value: `${c.durationMin} daq`,
    note: "kardio",
  }));
  return { heading: "BUGUNGI MASHQLAR", accent: CYAN, trophy: false, rows: [...strength, ...cardio] };
}

export function drawShareCard(ctx: CanvasRenderingContext2D, data: ShareCardData, fonts: ShareCardFonts) {
  ctx.textBaseline = "alphabetic";
  drawBackground(ctx);
  drawCorners(ctx);

  // --- Sarlavha: logo + nom + sana
  drawLogo(ctx, PAD, 118, 76);
  ctx.fillStyle = WHITE;
  ctx.font = `italic 700 66px ${fonts.display}`;
  setSpacing(ctx, 1);
  ctx.textAlign = "left";
  ctx.fillText("AURAFIT", PAD + 98, 180);
  ctx.font = `500 28px ${fonts.mono}`;
  setSpacing(ctx, 3);
  ctx.fillStyle = MUTED;
  ctx.textAlign = "right";
  ctx.fillText(formatDate(data.finishedAt), W - PAD, 172);

  // Ajratuvchi chiziq
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.fillRect(PAD, 252, W - PAD * 2, 2);
  ctx.fillStyle = LIME;
  ctx.fillRect(PAD, 251, 140, 4);

  // --- Vertikal joylashuv: kontent bloki sarlavha va pastki qism orasida
  // markazlashtiriladi, mashqlar soni ko'p bo'lsa ham pastki qismga tegmaydi.
  const { heading, accent, rows, trophy } = buildRows(data);
  const rowH = 104;
  const panelHeight = rows.length > 0 ? 128 + rows.length * rowH + 20 : 0;
  const blockHeight = 776 + panelHeight;
  const regionTop = 330;
  const regionBottom = H - 260;
  const top = regionTop + 30 + Math.max(0, (regionBottom - regionTop - blockHeight) / 2);

  // --- Asosiy ko'rsatkich
  const hasVolume = data.totalVolumeKg > 0;
  const heroValue = hasVolume ? formatThousands(data.totalVolumeKg) : `~${formatThousands(data.caloriesBurned)}`;
  const heroUnit = hasVolume ? "KG" : "KCAL";
  const heroCaption = hasVolume ? "KO'TARILGAN UMUMIY YUK" : "YOQILGAN KALORIYA";

  ctx.textAlign = "left";
  ctx.font = `600 30px ${fonts.mono}`;
  setSpacing(ctx, 8);
  ctx.fillStyle = LIME;
  ctx.fillRect(PAD, top - 16, 14, 14);
  ctx.fillText("MASHG'ULOT YAKUNLANDI", PAD + 34, top);

  setSpacing(ctx, -4);
  let heroSize = 300;
  const unitGap = 24;
  const maxHeroWidth = W - PAD * 2;
  const measureHero = () => {
    ctx.font = `italic 700 ${heroSize}px ${fonts.display}`;
    const valueW = ctx.measureText(heroValue).width;
    ctx.font = `italic 700 ${Math.round(heroSize * 0.36)}px ${fonts.display}`;
    const unitW = ctx.measureText(heroUnit).width;
    return valueW + unitGap + unitW;
  };
  while (measureHero() > maxHeroWidth && heroSize > 140) heroSize -= 8;
  const heroBaseline = top + 306;
  ctx.font = `italic 700 ${heroSize}px ${fonts.display}`;
  const valueWidth = ctx.measureText(heroValue).width;
  const heroGrad = ctx.createLinearGradient(PAD, heroBaseline - heroSize, PAD, heroBaseline);
  heroGrad.addColorStop(0, "#ffffff");
  heroGrad.addColorStop(1, "#e3f7a1");
  ctx.save();
  ctx.shadowColor = "rgba(195,244,0,0.35)";
  ctx.shadowBlur = 48;
  ctx.fillStyle = heroGrad;
  ctx.fillText(heroValue, PAD - 6, heroBaseline);
  ctx.restore();
  ctx.font = `italic 700 ${Math.round(heroSize * 0.36)}px ${fonts.display}`;
  setSpacing(ctx, 2);
  ctx.fillStyle = LIME;
  ctx.fillText(heroUnit, PAD - 6 + valueWidth + unitGap, heroBaseline);

  ctx.font = `500 28px ${fonts.mono}`;
  setSpacing(ctx, 6);
  ctx.fillStyle = MUTED;
  ctx.fillText(heroCaption, PAD, heroBaseline + 70);

  // --- Uch ko'rsatkich kartochkasi
  const duration = durationParts(data.startedAt, data.finishedAt);
  const tiles = [
    { label: "DAVOMIYLIK", value: duration.value, unit: duration.unit, color: WHITE },
    { label: "PODXODLAR", value: String(data.totalSets), unit: "PODXOD", color: WHITE },
    hasVolume
      ? { label: "KALORIYA", value: `~${formatThousands(data.caloriesBurned)}`, unit: "KCAL", color: LIME }
      : { label: "MASHQLAR", value: String(data.exercises.length + data.cardio.length), unit: "TA", color: LIME },
  ];
  const tileGap = 26;
  const tileW = (W - PAD * 2 - tileGap * 2) / 3;
  const tileY = top + 466;
  const tileH = 230;
  tiles.forEach((tile, i) => {
    const x = PAD + i * (tileW + tileGap);
    ctx.save();
    roundRect(ctx, x, tileY, tileW, tileH, 32);
    ctx.fillStyle = "rgba(255,255,255,0.045)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = i === 2 ? LIME : "rgba(195,244,0,0.5)";
    ctx.fillRect(x + 30, tileY + 34, 26, 4);
    ctx.textAlign = "left";
    ctx.font = `500 22px ${fonts.mono}`;
    setSpacing(ctx, 4);
    ctx.fillStyle = MUTED;
    ctx.fillText(tile.label, x + 30, tileY + 78);
    ctx.font = `italic 700 88px ${fonts.display}`;
    setSpacing(ctx, -1);
    ctx.fillStyle = tile.color;
    ctx.fillText(ellipsize(ctx, tile.value, tileW - 56), x + 28, tileY + 170);
    ctx.font = `500 22px ${fonts.mono}`;
    setSpacing(ctx, 4);
    ctx.fillStyle = MUTED;
    ctx.fillText(tile.unit, x + 30, tileY + 204);
  });

  // --- Rekordlar yoki bugungi mashqlar
  if (rows.length > 0) {
    const panelY = top + 746;
    const panelH = panelHeight;
    ctx.save();
    roundRect(ctx, PAD, panelY, W - PAD * 2, panelH, 40);
    const pg = ctx.createLinearGradient(PAD, panelY, W - PAD, panelY + panelH);
    pg.addColorStop(0, trophy ? "rgba(195,244,0,0.10)" : "rgba(0,219,233,0.08)");
    pg.addColorStop(1, "rgba(255,255,255,0.02)");
    ctx.fillStyle = pg;
    ctx.fill();
    ctx.strokeStyle = trophy ? "rgba(195,244,0,0.45)" : "rgba(0,219,233,0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    let tx = PAD + 44;
    if (trophy) {
      ctx.save();
      ctx.shadowColor = "rgba(195,244,0,0.6)";
      ctx.shadowBlur = 18;
      drawTrophy(ctx, tx, panelY + 40, 52, LIME);
      ctx.restore();
      tx += 72;
    } else {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(tx + 10, panelY + 66, 10, 0, Math.PI * 2);
      ctx.fill();
      tx += 40;
    }
    ctx.textAlign = "left";
    ctx.font = `600 28px ${fonts.mono}`;
    setSpacing(ctx, 6);
    ctx.fillStyle = accent;
    ctx.fillText(heading, tx, panelY + 76);

    rows.forEach((row, i) => {
      const rowTop = panelY + 128 + i * rowH;
      if (i > 0) {
        ctx.fillStyle = "rgba(255,255,255,0.07)";
        ctx.fillRect(PAD + 44, rowTop - 8, W - PAD * 2 - 88, 2);
      }
      ctx.textAlign = "right";
      ctx.font = `700 40px ${fonts.mono}`;
      setSpacing(ctx, 0);
      ctx.fillStyle = accent;
      const valueW = ctx.measureText(row.value).width;
      ctx.fillText(row.value, W - PAD - 44, rowTop + 50);

      ctx.textAlign = "left";
      ctx.font = `600 40px ${fonts.body}`;
      ctx.fillStyle = WHITE;
      ctx.fillText(ellipsize(ctx, row.title, W - PAD * 2 - 88 - valueW - 40), PAD + 44, rowTop + 48);
      if (row.note) {
        ctx.font = `400 26px ${fonts.body}`;
        ctx.fillStyle = MUTED;
        ctx.fillText(row.note, PAD + 44, rowTop + 84);
      }
    });
  }

  // --- Pastki qism
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.fillRect(PAD, H - 196, W - PAD * 2, 2);
  ctx.textAlign = "left";
  ctx.font = `500 30px ${fonts.mono}`;
  setSpacing(ctx, 2);
  ctx.fillStyle = WHITE;
  ctx.fillText(SITE, PAD, H - 120);
  ctx.font = `400 24px ${fonts.body}`;
  setSpacing(ctx, 0);
  ctx.fillStyle = MUTED;
  ctx.fillText("Sun'iy intellektli fitnes murabbiy", PAD, H - 80);
  ctx.textAlign = "right";
  ctx.font = `italic 700 52px ${fonts.display}`;
  setSpacing(ctx, 1);
  ctx.fillStyle = LIME;
  ctx.fillText("#AURAFIT", W - PAD, H - 92);

  const bar = ctx.createLinearGradient(0, 0, W, 0);
  bar.addColorStop(0, LIME);
  bar.addColorStop(1, CYAN);
  ctx.fillStyle = bar;
  ctx.fillRect(0, H - 10, W, 10);
}

export async function renderShareCard(data: ShareCardData, fonts: ShareCardFonts): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("CANVAS_UNAVAILABLE");
  drawShareCard(ctx, data, fonts);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("CANVAS_EXPORT_FAILED"))), "image/png"),
  );
}
