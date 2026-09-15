// PWA 아이콘·OG 이미지 생성 — `node scripts/make-icons.mjs`. sharp(Next.js가 함께 설치)로
// SVG를 PNG로 굽는다. 결과물은 public/icons, public/og.png (커밋한다 — 빌드 때마다 만들지 않는다).
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";

const BLUE = "#0066ff";
const icon = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${pad ? 0 : 112}" fill="${BLUE}"/>
  <g transform="translate(${pad ? 96 : 64} ${pad ? 96 : 64}) scale(${pad ? 0.625 : 0.75})">
    <rect x="72" y="40" width="300" height="400" rx="28" fill="#ffffff" opacity="0.35"/>
    <rect x="120" y="72" width="300" height="400" rx="28" fill="#ffffff"/>
    <rect x="168" y="150" width="204" height="22" rx="11" fill="${BLUE}"/>
    <rect x="168" y="208" width="204" height="22" rx="11" fill="${BLUE}" opacity="0.6"/>
    <rect x="168" y="266" width="140" height="22" rx="11" fill="${BLUE}" opacity="0.6"/>
  </g>
</svg>`;

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#ffffff"/>
  <rect x="0" y="0" width="1200" height="12" fill="${BLUE}"/>
  <text x="96" y="250" font-family="Pretendard, Apple SD Gothic Neo, Malgun Gothic, sans-serif" font-size="72" font-weight="700" fill="#171717">쓰기 시작하는 데</text>
  <text x="96" y="345" font-family="Pretendard, Apple SD Gothic Neo, Malgun Gothic, sans-serif" font-size="72" font-weight="700" fill="${BLUE}">5분이면 충분해요</text>
  <text x="96" y="430" font-family="Pretendard, Apple SD Gothic Neo, Malgun Gothic, sans-serif" font-size="32" fill="#737373">로그인 없이, 내 브라우저에만 저장되는 웹소설 집필 에디터</text>
  <text x="96" y="560" font-family="Pretendard, sans-serif" font-size="36" font-weight="700" fill="#171717">builbook</text>
</svg>`;

await mkdir("public/icons", { recursive: true });
const base = Buffer.from(icon(false));
const mask = Buffer.from(icon(true));
await sharp(base).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(base).resize(512, 512).png().toFile("public/icons/icon-512.png");
await sharp(base).resize(180, 180).png().toFile("public/icons/apple-touch-icon.png");
await sharp(mask).resize(512, 512).png().toFile("public/icons/icon-512-maskable.png");
await sharp(Buffer.from(og)).png().toFile("public/og.png");
await writeFile("public/icons/icon.svg", icon(false));
console.log("icons written to public/icons, public/og.png");
