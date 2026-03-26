/**
 * Converts an SVG element inside a container to a high-quality PNG and
 * triggers a download.
 *
 * @param container - The wrapper element that contains the SVG to export.
 * @param filename  - Desired download filename (include .png extension).
 * @param scale     - Resolution multiplier for sharp output (default 3×).
 * @param padding   - Extra white padding in CSS pixels (default 24).
 */
export function downloadSvgAsPng(
    container: HTMLElement | null,
    filename: string,
    scale = 3,
    padding = 24
): void {
    if (!container) return;

    const svg = container.querySelector("svg");
    if (!svg) return;

    // Read the original rendered size
    const { width: svgW, height: svgH } = svg.getBoundingClientRect();

    // Clone the SVG and force an explicit size so the rasterised image
    // respects the scale multiplier.
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute("width", String(svgW * scale));
    clone.setAttribute("height", String(svgH * scale));

    const svgData = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
        const scaledPadding = padding * scale;
        const canvas = document.createElement("canvas");
        canvas.width = img.width + scaledPadding * 2;
        canvas.height = img.height + scaledPadding * 2;

        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, scaledPadding, scaledPadding);

        URL.revokeObjectURL(url);

        const pngUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    img.src = url;
}
