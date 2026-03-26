/**
 * Converts an SVG element inside a container to a PNG and triggers a download.
 *
 * @param container - The wrapper element that contains the SVG to export.
 * @param filename  - Desired download filename (include .png extension).
 * @param padding   - Extra white padding around the image in pixels (default 24).
 */
export function downloadSvgAsPng(
    container: HTMLElement | null,
    filename: string,
    padding = 24
): void {
    if (!container) return;

    const svg = container.querySelector("svg");
    if (!svg) return;

    // Clone & serialise the SVG
    const clone = svg.cloneNode(true) as SVGElement;
    const svgData = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width + padding * 2;
        canvas.height = img.height + padding * 2;

        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, padding, padding);

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
