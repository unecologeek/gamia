import * as THREE from 'three';


class DateLineCrossingGeometry extends THREE.BufferGeometry {
    constructor(data, radius = 2.05) {
        super();

        const positions = [];
        const indices = [];

        if (data.coordinates) {
            data.coordinates.forEach(ring => {
                // Détecter si le pays traverse la ligne de changement de date
                const crossesDateLine = this.detectDateLineCrossing(ring);
                if (!crossesDateLine) {
                    // Si le pays ne traverse pas la ligne, utiliser la géométrie standard
                    this.processNormalRing(ring, positions, indices, radius);
                    return;
                }

                // Diviser le polygone en deux parties au niveau de la ligne de changement de date
                const [westPart, eastPart] = this.splitAtDateLine(ring);

                // Traiter chaque partie séparément
                if (westPart.length >= 3) this.processNormalRing(westPart, positions, indices, radius);
                if (eastPart.length >= 3) this.processNormalRing(eastPart, positions, indices, radius);
            });
        }

        this.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        this.setIndex(indices);
        this.computeVertexNormals();
    }

    detectDateLineCrossing(ring) {
        let previousLon = ring[0][0];
        for (let i = 1; i < ring.length; i++) {
            const currentLon = ring[i][0];
            // Si la différence de longitude est supérieure à 180°, le pays traverse la ligne
            if (Math.abs(currentLon - previousLon) > 180) {
                return true;
            }
            previousLon = currentLon;
        }
        return false;
    }

    splitAtDateLine(ring) {
        const westPart = [];
        const eastPart = [];

        let previousPoint = ring[0];
        westPart.push(previousPoint);

        for (let i = 1; i < ring.length; i++) {
            const currentPoint = ring[i];
            const [prevLon, prevLat] = previousPoint;
            const [currentLon, currentLat] = currentPoint;

            // Détecter le croisement de la ligne de changement de date
            if (Math.abs(currentLon - prevLon) > 180) {
                // Calculer le point d'intersection avec la ligne de changement de date
                const t = (180 - Math.abs(prevLon)) / Math.abs(currentLon - prevLon);
                const intersectionLat = prevLat + t * (currentLat - prevLat);

                // Ajouter les points d'intersection aux deux parties
                if (prevLon < 0) {
                    westPart.push([180, intersectionLat]);
                    eastPart.push([-180, intersectionLat]);
                } else {
                    westPart.push([-180, intersectionLat]);
                    eastPart.push([180, intersectionLat]);
                }

                // Commencer une nouvelle partie
                if (currentLon > 0) {
                    westPart.push(currentPoint);
                } else {
                    eastPart.push(currentPoint);
                }
            } else {
                // Ajouter le point à la partie appropriée
                if (currentLon > 0) {
                    westPart.push(currentPoint);
                } else {
                    eastPart.push(currentPoint);
                }
            }

            previousPoint = currentPoint;
        }

        return [westPart, eastPart];
    }

    processNormalRing(ring, positions, indices, radius) {
        const startIndex = positions.length / 3;
        const vertices = [];

        // Convertir les coordonnées en vertices
        ring.forEach(coord => {
            if (Array.isArray(coord) && coord.length >= 2) {
                const [lon, lat] = coord;
                const phi = (90 - lat) * (Math.PI / 180);
                const theta = (lon + 180) * (Math.PI / 180);

                const x = -Math.sin(phi) * Math.cos(theta) * radius;
                const y = Math.cos(phi) * radius;
                const z = Math.sin(phi) * Math.sin(theta) * radius;

                vertices.push(x, y, z);
                positions.push(x, y, z);
            }
        });

        if (vertices.length >= 9) {
            // Calculer le centre et la normale
            const center = new THREE.Vector3();
            for (let i = 0; i < vertices.length; i += 3) {
                center.add(new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2]));
            }
            center.divideScalar(vertices.length / 3);

            const normal = center.clone().normalize();
            const tangent = new THREE.Vector3(normal.y, normal.z, normal.x);
            const bitangent = new THREE.Vector3().crossVectors(normal, tangent);
            tangent.crossVectors(bitangent, normal);

            // Projeter les points sur le plan tangent
            const points2D = [];
            for (let i = 0; i < vertices.length; i += 3) {
                const p = new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2]);
                const v = p.clone().sub(center);
                points2D.push(new THREE.Vector2(
                    v.dot(tangent),
                    v.dot(bitangent)
                ));
            }

            // Triangulation
            const triangles = THREE.ShapeUtils.triangulateShape(points2D, []);
            triangles.forEach(triangle => {
                indices.push(
                    startIndex + triangle[0],
                    startIndex + triangle[1],
                    startIndex + triangle[2]
                );
            });
        }
    }
}

export default DateLineCrossingGeometry;