// 관계도 SVG → PNG 내려받기(브라우저 전용). 서버 없이 화면의 SVG를 그대로 그림으로 굳힌다.
// 클래스(Tailwind·CSS 변수)는 그림 안에서 안 먹으므로 계산된 스타일을 속성으로 새겨 넣는다.

const STYLE_PROPS = ["fill", "stroke", "stroke-width", "font-size", "font-family", "font-weight", "opacity", "fill-opacity"] as const;

function freezeStyles(original: Element, clone: Element) {
  const src = original.children;
  const dst = clone.children;
  const cs = getComputedStyle(original);
  if (original instanceof SVGElement) {
    for (const prop of STYLE_PROPS) {
      const v = cs.getPropertyValue(prop);
      if (v) clone.setAttribute(prop, v);
    }
    clone.removeAttribute("class");
  }
  for (let i = 0; i < src.length; i++) {
    if (dst[i]) freezeStyles(src[i], dst[i]);
  }
}

export interface PngOptions {
  /** 인쇄용 흑백 — 색을 밝기값으로 바꾸고 배경은 흰색. */
  monochrome?: boolean;
}

/** 픽셀을 밝기값(ITU-R BT.601)으로 — 색맹·흑백 인쇄에서도 진하기 차이는 남는다. */
export function toGrayscale(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    const y = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    data[i] = y;
    data[i + 1] = y;
    data[i + 2] = y;
  }
}

/** 화면의 SVG를 PNG Blob으로. scale은 선명도(2 = 레티나). */
export function svgToPngBlob(svg: SVGSVGElement, scale = 2, options: PngOptions = {}): Promise<Blob> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  freezeStyles(svg, clone);
  const width = svg.width.baseVal.value || svg.clientWidth;
  const height = svg.height.baseVal.value || svg.clientHeight;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  // 배경 — 화면의 surface 색을 그대로.
  const bg = options.monochrome ? "#ffffff" : getComputedStyle(svg).backgroundColor || "#ffffff";
  const xml = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("canvas 2d 없음"));
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      if (options.monochrome) {
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        toGrayscale(image.data);
        ctx.putImageData(image, 0, 0);
      }
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("PNG 변환 실패"))), "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("SVG를 그리지 못했어요."));
    };
    img.src = url;
  });
}

/** 파일명 — 작품 제목 + 날짜. 파일명에 못 쓰는 글자는 뺀다. */
export function pngFileName(projectTitle: string, date = new Date(), monochrome = false): string {
  const safe = projectTitle.replace(/[\\/:*?"<>|]/g, "").trim() || "작품";
  const ymd = date.toISOString().slice(0, 10);
  return `${safe}-관계도${monochrome ? "-흑백" : ""}-${ymd}.png`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
