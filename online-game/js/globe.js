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

                // Convert coordinates to 3D points
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
                }
            });
        }

        this.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        this.setIndex(indices);
        this.computeVertexNormals();
    }
}

class Globe {
    constructor(container, scene, camera, renderer) {
        this.container = container;
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.globeGroup = new THREE.Group();
        this.scene.add(this.globeGroup);
    }

    async loadCountries() {
        // Load and process country data
    }

    highlightCountry(countryName) {
        // Highlight a specific country
    }
}

export default Globe;