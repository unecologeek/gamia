import * as THREE from 'three';

class Map3DGeometry extends THREE.BufferGeometry {
    constructor(data, radius = 2.05) {
        super();

        const positions = [];
        const indices = [];

        if (data.coordinates) {
            data.coordinates.forEach(ring => {
                const startIndex = positions.length / 3;
                const vertices = [];

                // Convertir les coordonnées en points 3D
                ring.forEach(point => {
                    const [lon, lat] = point;
                    const phi = (90 - lat) * Math.PI / 180;
                    const theta = (lon + 180) * Math.PI / 180;

                    const x = -radius * Math.sin(phi) * Math.cos(theta);
                    const y = radius * Math.cos(phi);
                    const z = radius * Math.sin(phi) * Math.sin(theta);

                    vertices.push(new THREE.Vector3(x, y, z));
                    positions.push(x, y, z);
                });

                if (vertices.length >= 3) {
                    const center = new THREE.Vector3();
                    vertices.forEach(v => center.add(v));
                    center.divideScalar(vertices.length);

                    const normal = center.clone().normalize();
                    const tangent = new THREE.Vector3(1, 0, 0);
                    if (Math.abs(normal.dot(tangent)) > 0.99) {
                        tangent.set(0, 1, 0);
                    }
                    const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();
                    tangent.crossVectors(bitangent, normal);

                    const points2D = [];
                    vertices.forEach(v => {
                        const p = v.clone().sub(center);
                        points2D.push(new THREE.Vector2(
                            p.dot(tangent),
                            p.dot(bitangent)
                        ));
                    });

                    const triangles = THREE.ShapeUtils.triangulateShape(points2D, []);
                    triangles.forEach(triangle => {
                        indices.push(
                            startIndex + triangle[0],
                            startIndex + triangle[1],
                            startIndex + triangle[2]
                        );
                    });
                }
            });
        }

        this.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        this.setIndex(indices);
        this.computeVertexNormals();
    }

    latLonToPoint(lat, lon, radius) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);

        return new THREE.Vector3(
            -radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.cos(phi),
            radius * Math.sin(phi) * Math.sin(theta)
        );
    }

    getBoundingBox(ring) {
        let minLon = Infinity, maxLon = -Infinity;
        let minLat = Infinity, maxLat = -Infinity;

        ring.forEach(coord => {
            if (Array.isArray(coord) && coord.length >= 2) {
                const [lon, lat] = coord;
                minLon = Math.min(minLon, lon);
                maxLon = Math.max(maxLon, lon);
                minLat = Math.min(minLat, lat);
                maxLat = Math.max(maxLat, lat);
            }
        });

        return { minLon, maxLon, minLat, maxLat };
    }

    createGridPoints(boundingBox, ring, radius) {
        const { minLon, maxLon, minLat, maxLat } = boundingBox;
        const points = [];
        const gridSize = 2; // Degrés entre chaque point de la grille

        for (let lon = minLon; lon <= maxLon; lon += gridSize) {
            for (let lat = minLat; lat <= maxLat; lat += gridSize) {
                // Vérifier si le point est à l'intérieur du polygone
                if (this.isPointInPolygon([lon, lat], ring)) {
                    const point = this.latLonToPoint(lat, lon, radius);
                    points.push(point);
                }
            }
        }

        return points;
    }

    isPointInPolygon(point, polygon) {
        const [x, y] = point;
        let inside = false;

        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i][0], yi = polygon[i][1];
            const xj = polygon[j][0], yj = polygon[j][1];

            const intersect = ((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

            if (intersect) inside = !inside;
        }

        return inside;
    }

    findNearestGridPoints(point, gridPoints, count) {
        return gridPoints
            .map((p, index) => ({
                index,
                distance: point.distanceTo(p)
            }))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, count)
            .map(p => p.index);
    }

    isLargeCountry(ring) {
        if (!Array.isArray(ring) || ring.length === 0) {
            console.warn("Invalid ring data:", ring);
            return false;
        }
    
        let minLon = Infinity;
        let maxLon = -Infinity;
        let minLat = Infinity;
        let maxLat = -Infinity;
    
        console.log("Analyzing ring:", ring);
    
        ring.forEach(coord => {
            if (Array.isArray(coord) && coord.length >= 2) {
                const [lon, lat] = coord;
    
                // Ajuster les longitudes pour gérer la ligne de changement de date
                const adjustedLon = lon < 0 ? lon + 360 : lon;
    
                minLon = Math.min(minLon, adjustedLon);
                maxLon = Math.max(maxLon, adjustedLon);
                minLat = Math.min(minLat, lat);
                maxLat = Math.max(maxLat, lat);
            } else {
                console.warn("Invalid coordinate format:", coord);
            }
        });
    
        const lonSpan = maxLon - minLon;
        const latSpan = maxLat - minLat;
    
        console.log(`Longitude span: ${lonSpan}, Latitude span: ${latSpan}`);
    
        return lonSpan > 90 || latSpan > 45;
    }
}

export default Map3DGeometry;