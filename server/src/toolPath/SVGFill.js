export function svgToSegments(svg, options = {}) {
    const segments = [];

    if (!options.fillEnabled) {
        for (const shape of svg.shapes) {
            if (!shape.visibility) continue;
            for (const path of shape.paths) {
                for (let i = 0; i < path.points.length - 1; i++) {
                    segments.push({start: path.points[i], end: path.points[i + 1]});
                }
            }
        }
        return segments;
    }

    const lineSpacing = 1 / options.fillDensity;

    for (const shape of svg.shapes) {
        if (!shape.visibility) continue;

        // Emit outline as vector segments so filled shapes keep a crisp boundary.
        for (const path of shape.paths) {
            for (let i = 0; i < path.points.length - 1; i++) {
                segments.push({start: path.points[i], end: path.points[i + 1]});
            }
        }

        if (!shape.fill) continue;

        const closedPaths = shape.paths.filter(p => p.closed);
        if (closedPaths.length === 0) continue;

        let minY = Infinity;
        let maxY = -Infinity;
        for (const path of closedPaths) {
            for (const [, y] of path.points) {
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
        if (!isFinite(minY)) continue;

        for (let y = minY; y <= maxY; y += lineSpacing) {
            const crossings = [];
            for (const path of closedPaths) {
                const pts = path.points;
                for (let i = 0; i < pts.length - 1; i++) {
                    const [x1, y1] = pts[i];
                    const [x2, y2] = pts[i + 1];
                    if (x1 === x2 && y1 === y2) continue;
                    if (y1 === y2) continue;
                    const lo = Math.min(y1, y2);
                    const hi = Math.max(y1, y2);
                    // Half-open [lo, hi) to avoid double-counting shared vertices.
                    if (y < lo || y >= hi) continue;
                    const x = x1 + (y - y1) * (x2 - x1) / (y2 - y1);
                    crossings.push(x);
                }
            }
            crossings.sort((a, b) => a - b);
            for (let i = 0; i + 1 < crossings.length; i += 2) {
                segments.push({
                    start: [crossings[i], y],
                    end: [crossings[i + 1], y]
                });
            }
        }
    }

    return segments;
}
