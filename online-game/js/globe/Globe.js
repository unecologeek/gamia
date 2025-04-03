import Map3DGeometry from 'Map3DGeometry.js';
import LargeCountryGeometry from 'LargeCountryGeometry.js';
import DateLineCrossingGeometry from 'DateLineCrossingGeometry.js';
import GlobeControls from 'GlobeControls.js';
import CountryManager from 'CountryManager.js';
import GlobeRenderer from 'GlobeRenderer.js';

class Globe {
    constructor(container) {
        this.container = container;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
     //   this.controls = new OrbitControls(this.camera, this.renderer.domElement);

        this.globeGroup = new THREE.Group(); // Groupe principal pour tous les éléments du globe
        this.earth = null;
        this.clouds = null;
        this.countries = new Map(); // Map pour stocker les pays par leur code ISO A2
        this.countryNameToCode = new Map(); // Map pour l'autocomplétion: nom -> code ISO A2
        this.isAnimating = false; // Nouveau flag pour bloquer les interactions pendant l'animation
        this.currentQuaternion = new THREE.Quaternion(); // Quaternion actuel du globe
        this.targetQuaternion = new THREE.Quaternion(); // Quaternion cible pour l'animation
        this.rotationSpeed = 0.0002;
        this.isDragging = false;
        this.mouseX = 0;
        this.mouseY = 0;
        this.currentTargetCountry = null; // Pays actuellement à deviner
        this.controlsEnabled = true; // Nouvel état pour les contrôles

        // Configuration des limites de rotation et zoom
        this.maxPolarAngle = (30 * Math.PI) / 180;
        this.elasticityFactor = 0.5;
        this.springVelocity = 0;  // Nouvelle propriété pour la vitesse du ressort
        this.springDamping = 0.8; // Facteur d'amortissement
        this.springStrength = 0.2; // Force du ressort
        this.minZoom = 3;
        this.maxZoom = 9;
        this.currentZoom = 5;

        this.rotationVelocity = new THREE.Vector2();
        this.rotationDamping = 0.95;

        // Axes de rotation fixes dans le référentiel de la scène
        this.worldUp = new THREE.Vector3(0, 1, 0);
        this.worldRight = new THREE.Vector3(1, 0, 0);

        // Boutons de contrôle
        this.createControlButtons();

        this.init();
    }

    init() {
        // Setup renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.container.appendChild(this.renderer.domElement);

        // Setup camera
        this.camera.position.z = this.currentZoom;

        // Réinitialiser la rotation du globe
        this.globeGroup.quaternion.identity();

        // Inclinaison de la Terre (en radians)
        const earthTilt = THREE.MathUtils.degToRad(23.5); // Convertir 23.5 degrés en radians
        this.globeGroup.rotation.x = earthTilt;

        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight.position.set(5, 3, 5);
        this.scene.add(directionalLight);

        // Add globe group to scene
        this.scene.add(this.globeGroup);

        // Create Earth
        this.createEarth();
     //   this.loadCountries();
        // Setup event listeners
        this.setupEventListeners();
        window.addEventListener('resize', () => this.onWindowResize(), false);

        // Start animation loop
        this.animate();
    }

    createEarth() {
        const textureLoader = new THREE.TextureLoader();

        console.log('Creating Earth...');


        // Create base Earth with modified rendering properties
        const geometry = new THREE.SphereGeometry(2, 64, 64);
        const material = new THREE.MeshPhongMaterial({
            map: textureLoader.load('assets/compress_carte-monde_mixNasa_darkblue_3600i.jpg'),
            bumpMap: textureLoader.load('assets/8081_earthbump2k.jpg'),
            specularMap: textureLoader.load('assets/earthSurfaceSpecular_l.webp'),
            bumpScale: 0.25,
            transparent: true,
            opacity: 0.9,
            depthWrite: true,
            depthTest: true
        });

        this.earth = new THREE.Mesh(geometry, material);
        this.earth.renderOrder = 0;
        this.globeGroup.add(this.earth);

        // Add clouds with modified rendering properties
        const cloudGeometry = new THREE.SphereGeometry(2.01, 64, 64);
        const cloudMaterial = new THREE.MeshPhongMaterial({
            map: textureLoader.load('assets/earthSurfaceSpecular_l.webp'),
            transparent: true,
            opacity: 0.2,
            depthWrite: false,
            depthTest: true
        });
        this.clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
        this.clouds.renderOrder= 2;

        this.globeGroup.add(this.clouds);
    }

    // Fonction pour générer une couleur aléatoire
    getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '0x';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return parseInt(color, 16);
    }


    async loadCountries() {
        try {
            const response = await fetch('assets/ne_110m_admin_0_countries.geojson');
            const data = await response.json();

            data.features.forEach(feature => {
                const countryCode = feature.properties.ISO_A2;
                if (!countryCode) {
                    console.error("Country without ISO A2 code:", feature.properties);
                    return;
                }


                const names = {
                    en: feature.properties.NAME_EN || feature.properties.NAME,
                    fr: feature.properties.NAME_FR || feature.properties.NAME,
                    es: feature.properties.NAME_ES || feature.properties.NAME,
                    ar: feature.properties.NAME_AR || feature.properties.NAME,
                    bn: feature.properties.NAME_BN || feature.properties.NAME,
                    de: feature.properties.NAME_DE || feature.properties.NAME,
                    el: feature.properties.NAME_EL || feature.properties.NAME,
                    hi: feature.properties.NAME_HI || feature.properties.NAME,
                    he: feature.properties.NAME_HE || feature.properties.NAME,
                    hu: feature.properties.NAME_HU || feature.properties.NAME,
                    id: feature.properties.NAME_ID || feature.properties.NAME,
                    it: feature.properties.NAME_IT || feature.properties.NAME,
                    ja: feature.properties.NAME_JA || feature.properties.NAME,
                    ko: feature.properties.NAME_KO || feature.properties.NAME,
                    nl: feature.properties.NAME_NL || feature.properties.NAME,
                    pl: feature.properties.NAME_PL || feature.properties.NAME,
                    pt: feature.properties.NAME_PT || feature.properties.NAME,
                    ru: feature.properties.NAME_RU || feature.properties.NAME,
                    sv: feature.properties.NAME_SV || feature.properties.NAME,
                    tr: feature.properties.NAME_TR || feature.properties.NAME,
                    uk: feature.properties.NAME_UK || feature.properties.NAME,
                    ur: feature.properties.NAME_UR || feature.properties.NAME,
                    vi: feature.properties.NAME_VI || feature.properties.NAME,
                    zh: feature.properties.NAME_ZH || feature.properties.NAME,
                    zht: feature.properties.NAME_ZHT || feature.properties.NAME
                };

                console.log('Loading country:',  feature.properties.NAME_FR + " " +countryCode);

                Object.values(names).forEach(name => {
                    if (name) {
                        this.countryNameToCode.set(name.toLowerCase(), countryCode);
                    }
                });

                const coordinates = feature.geometry.coordinates;
                const countryGroup = new THREE.Group();

                // Créer un matériau de base pour le pays avec des propriétés modifiées
                const randomColor = this.getRandomColor();
                const baseMaterial = new THREE.MeshPhongMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.3,
                    side: THREE.DoubleSide,
                    depthWrite: false,
                    depthTest: true,
                    shininess: 0,
                    flatShading: true,
                    polygonOffset: true,
                    polygonOffsetFactor: 1,
                    polygonOffsetUnits: 1
                });

                let allMeshes = [];

                if (feature.geometry.type === 'Polygon') {
                    const meshes = this.createCountryShape(coordinates, countryGroup, baseMaterial);
                    allMeshes = allMeshes.concat(meshes);
                } else if (feature.geometry.type === 'MultiPolygon') {
                    coordinates.forEach(polygon => {
                        const meshes = this.createCountryShape(polygon, countryGroup, baseMaterial);
                        allMeshes = allMeshes.concat(meshes);
                    });
                }

                if (countryGroup.children.length > 0) {

                    allMeshes.forEach(mesh => {
                        mesh.material.color.setHex(randomColor);
                        mesh.material.opacity = 0.3;
                        mesh.material.transparent = true;
                        mesh.material.depthWrite = true;
                        mesh.material.depthTest = true;
                        mesh.material.side = THREE.FrontSide;
                        mesh.material.needsUpdate = true;
                        mesh.renderOrder = 0;
                    });

                    if (coordinates && coordinates[0]) {
                        console.log(`Checking if country is large: ${feature.properties.NAME}`);
                        console.log(`Coordinates[0]:`, coordinates[0]);

                        if (this.isLargeCountry(coordinates[0])) {
                            console.log(`Country detected as large: ${feature.properties.NAME}`);
                            allMeshes.forEach(mesh => {
                                this.fillMeshHoles(mesh, feature.properties.NAME);
                            });
                        }
                    } else {
                        console.warn(`Invalid coordinates for country: ${feature.properties.NAME}`);
                    }

                    const countryData = {
                        names: names,
                        group: countryGroup,
                        meshes: allMeshes,
                        code: countryCode,
                        originalColor: randomColor
                    };

                    this.countries.set(countryCode, countryData);
                    this.globeGroup.add(countryGroup);
                }
            });

            return this.getCountryNamesList();
        } catch (error) {
            console.error('Error loading countries:', error);
            return [];
        }
    }

    createCountryShape(coordinates, group, material) {
        const meshes = [];
        coordinates.forEach((ring, ringIndex) => {
            const geometry = new Map3DGeometry({ coordinates: [ring], radius: 2.05 });

            const mesh = new THREE.Mesh(geometry, material.clone());
            mesh.renderOrder = 1;

            // Configuration du matériau
            mesh.material.depthTest = true;
            mesh.material.depthWrite = true;
            mesh.material.transparent = true;
            mesh.material.side = THREE.DoubleSide;
            mesh.material.flatShading = true;
            mesh.material.wireframe = false;
            mesh.material.needsUpdate = true;

            group.add(mesh);
            meshes.push(mesh);

            // Contours
            const lineGeometry = new THREE.BufferGeometry();
            const linePositions = [];
            ring.forEach((coord) => {
                if (Array.isArray(coord) && coord.length >= 2) {
                    const [lon, lat] = coord;
                    const point = this.latLonToVector3(lat, lon, 2.06);
                    linePositions.push(point.x, point.y, point.z);
                }
            });

            if (linePositions.length >= 6) {
                linePositions.push(linePositions[0], linePositions[1], linePositions[2]);
            }

            lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
            const lineMaterial = new THREE.LineBasicMaterial({ 
                color: 0xFFFFFF,
                transparent: true,
                opacity: 0.4,
                depthWrite: true,
                depthTest: true,
                linewidth: 1
            });
            const line = new THREE.Line(lineGeometry, lineMaterial);
            line.renderOrder = 999;
            group.add(line);
        });
        return meshes;
    }

    latLonToVector3(lat, lon, radius) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);
        const x = -radius * Math.sin(phi) * Math.cos(theta);
        const z = radius * Math.sin(phi) * Math.sin(theta);
        const y = radius * Math.cos(phi);
        return new THREE.Vector3(x, y, z);
    }

    highlightCountry(countryName) {
        this.countries.forEach(country => {
            country.meshes.forEach(mesh => {
                mesh.material.color.setHex(0x4A90E2); // Bleu clair
                mesh.material.opacity = 0.2; // Très légère opacité
            });
        });

        const country = this.countries.get(countryName.toUpperCase());
        if (country) {
            country.meshes.forEach(mesh => {
                mesh.material.color.setHex(0x4CAF50); // Vert
                mesh.material.opacity = 1; // Opacité totale
            });
        }
    }

    wrongGuess(countryCode) {
        const guessedCountry = this.countries.get(countryCode.toUpperCase());
        if (!guessedCountry) {
            console.error("Pays deviné non trouvé:", countryCode);
            return;
        }

        // Mettre le pays mal deviné en rouge
        guessedCountry.meshes.forEach(mesh => {
            mesh.material.color.setHex(0xFF0000);
            mesh.material.opacity = 1.0;
            mesh.material.transparent = true;
            mesh.material.depthWrite = true;
            mesh.material.depthTest = true;
            mesh.material.side = THREE.FrontSide;
            mesh.material.needsUpdate = true;
            mesh.renderOrder = 2;
        });
    }

    correctGuess(countryName) {
        const country = this.countries.get(countryName.toUpperCase());
        if (country) {
            country.meshes.forEach(mesh => {
                mesh.material.color.setHex(0x4CAF50); // Vert
                mesh.material.opacity = 1; // Opacité totale
                country.group.scale.set(1.1, 1.1, 1.1);
            });
        }
    }

    // Méthode utilitaire pour obtenir les informations d'un pays
    getCountryInfo(countryName) {
        return this.countries.get(countryName.toUpperCase());
    }


    applyInertia() {
        if (!this.isDragging) {
            // Apply damping to the velocity
            this.rotationVelocity.x *= this.rotationDamping;
            this.rotationVelocity.y *= this.rotationDamping;
    
            // Apply the velocity to the rotation
            const euler = new THREE.Euler();
            euler.setFromQuaternion(this.globeGroup.quaternion, 'YXZ');
            euler.y += this.rotationVelocity.x;
            euler.x += this.rotationVelocity.y;
    
            // Apply polar constraints
            euler.x = THREE.MathUtils.clamp(
                euler.x,
                -this.maxPolarAngle,
                this.maxPolarAngle
            );
    
            // Convert back to quaternion
            this.globeGroup.quaternion.setFromEuler(euler);
    
            // Stop applying inertia if velocity is very small
            if (Math.abs(this.rotationVelocity.x) > 0.001 || Math.abs(this.rotationVelocity.y) > 0.001) {
                requestAnimationFrame(() => this.applyInertia());
            }
        }
    }


    setupEventListeners() {

        // Gestion du zoom avec la molette de la souris et le pincement tactile
        this.container.addEventListener('wheel', (e) => {
        if (!this.controlsEnabled || this.isAnimating) return;
            e.preventDefault();
            this.handleZoom(e.deltaY * 0.001);
        }, { passive: false });

                
        // Support du pincement tactile pour le zoom
        let initialDistance = 0;
        this.container.addEventListener('touchstart', (e) => {
            if (!this.controlsEnabled || this.isAnimating) return;
            if (e.touches.length === 2) {
                initialDistance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
            }
        });

        this.container.addEventListener('touchmove', (e) => {
            if (!this.controlsEnabled || this.isAnimating) return;
            if (e.touches.length === 2) {
                e.preventDefault();
                const currentDistance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                const delta = (initialDistance - currentDistance) * 0.01;
                this.handleZoom(delta);
                initialDistance = currentDistance;
            }
        }, { passive: false });

        // Gestion du clavier pour la rotation et le zoom
        document.addEventListener('keydown', (e) => {
            // Vérifier si l'élément actif est un input ou fait partie de l'autocomplétion
            const activeElement = document.activeElement;
            if (activeElement && (
                activeElement.tagName === 'INPUT' ||
                activeElement.closest('.autocomplete-wrapper')
            )) {
                return; // Ne pas traiter les événements clavier si le focus est sur l'autocomplétion
            }

            if (!this.controlsEnabled || this.isAnimating) return;

            const ROTATION_SPEED = 0.1;
            const ZOOM_SPEED = 0.2;

            switch(e.key) {
                case 'ArrowLeft':
                    this.rotateGlobe(-ROTATION_SPEED, 0);
                    break;
                case 'ArrowRight':
                    this.rotateGlobe(ROTATION_SPEED, 0);
                    break;
                case 'ArrowUp':
                    this.rotateGlobe(0, -ROTATION_SPEED);
                    break;
                case 'ArrowDown':
                    this.rotateGlobe(0, ROTATION_SPEED);
                    break;
                case '+':
                case '=':
                    this.handleZoom(-ZOOM_SPEED);
                    break;
                case '-':
                case '_':
                    this.handleZoom(ZOOM_SPEED);
                    break;
            }
        });

        // Gestion de la souris
        document.addEventListener('mousedown', (e) => {
            if (!this.controlsEnabled || this.isAnimating) return;
            
            this.isDragging = true;
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;

        });

        document.addEventListener('mousemove', (e) => {
            if (!this.controlsEnabled || !this.isDragging || this.isAnimating) return;
            const deltaX = e.clientX - this.mouseX;
            const deltaY = e.clientY - this.mouseY;
            this.rotateGlobe(deltaX * 0.005, deltaY * 0.005);
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });

        document.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.applyInertia();
        });

        // Gestion du tactile
        let touchStartX, touchStartY;

        this.container.addEventListener('touchstart', (e) => {
            if (!this.controlsEnabled || this.isAnimating || e.touches.length !== 1) return;
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        });

        this.container.addEventListener('touchmove', (e) => {
            if (!this.controlsEnabled || this.isAnimating || e.touches.length !== 1) return;
            e.preventDefault();
            const deltaX = e.touches[0].clientX - touchStartX;
            const deltaY = e.touches[0].clientY - touchStartY;
            this.rotateGlobe(deltaX * 0.005, deltaY * 0.005);
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: false });

        // Gestion de l'accessibilité du focus
        this.container.setAttribute('tabindex', '0');
        this.container.setAttribute('role', 'application');
        this.container.setAttribute('aria-label', 'Globe terrestre interactif');
    }

    // Méthode utilitaire pour gérer le zoom
    handleZoom(delta) {
        const newZoom = this.currentZoom + delta;
        if (newZoom >= this.minZoom && newZoom <= this.maxZoom) {
            this.currentZoom = newZoom;
            this.camera.position.z = this.currentZoom;
        }
    }

    // Méthode utilitaire pour la rotation du globe avec élasticité
    rotateGlobe(deltaX, deltaY) {
        if (!this.controlsEnabled || this.isAnimating) return;

        // Convert current orientation to Euler angles
        const euler = new THREE.Euler();
        euler.setFromQuaternion(this.globeGroup.quaternion, 'YXZ');

        // Apply rotations with more natural mapping
        euler.y += deltaX * 0.5; // Horizontal rotation (left/right)
        euler.x += deltaY * 0.5; // Vertical rotation (up/down)

        // Update velocity
        this.rotationVelocity.x -= deltaX * 0.005;
        this.rotationVelocity.y -= deltaY * 0.005;

        // Apply polar constraints
        euler.x = THREE.MathUtils.clamp(
            euler.x,
            -this.maxPolarAngle,
            this.maxPolarAngle
        );

        // Update velocity for inertia
        this.rotationVelocity.x = -deltaX * 0.005;
        this.rotationVelocity.y = -deltaY * 0.005;

        // Convert back to quaternion
        this.globeGroup.quaternion.setFromEuler(euler);
    }



    // Nouvelle méthode pour mettre à jour l'animation du ressort
    updateSpring() {
        const currentEuler = new THREE.Euler();
        currentEuler.setFromQuaternion(this.globeGroup.quaternion, 'YXZ');

        const maxAngle = this.maxPolarAngle;
        const minAngle = -this.maxPolarAngle;

        // Vérifier si on est toujours hors des limites
        if (currentEuler.x > maxAngle || currentEuler.x < minAngle) {
            const targetAngle = currentEuler.x > maxAngle ? maxAngle : minAngle;
            const distanceFromLimit = currentEuler.x - targetAngle;

            // Appliquer la force du ressort
            const springForce = -distanceFromLimit * this.springStrength;
            this.springVelocity += springForce;

            // Appliquer l'amortissement
            this.springVelocity *= this.springDamping;

            // Mettre à jour la position
            currentEuler.x = targetAngle + this.springVelocity;

            // Appliquer la rotation
            const targetQuaternion = new THREE.Quaternion();
            targetQuaternion.setFromEuler(currentEuler);
            this.globeGroup.quaternion.copy(targetQuaternion);

            // Continuer l'animation si le mouvement est encore significatif
            if (Math.abs(this.springVelocity) > 0.001) {
                requestAnimationFrame(() => this.updateSpring());
            }
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Apply constraints continuously
        if (!this.isAnimating) {
            this.applyRotationConstraints();
        }

        this.renderer.render(this.scene, this.camera);
    }

    applyRotationConstraints() {
        const euler = new THREE.Euler();
        euler.setFromQuaternion(this.globeGroup.quaternion, 'YXZ');
    
        // Limiter la latitude (axe X)
        euler.x = THREE.MathUtils.clamp(
            euler.x,
            -this.maxPolarAngle,
            this.maxPolarAngle
        );
    
        // Limiter la longitude (axe Y)
        const maxLongitude = Math.PI; // Exemple : limiter à une rotation complète
        euler.y = THREE.MathUtils.clamp(
            euler.y,
            -maxLongitude,
            maxLongitude
        );
    
        // Convert back to quaternion
        this.globeGroup.quaternion.setFromEuler(euler);
    }


    // Méthode pour calculer le centre d'un pays
    calculateCountryCenter(countryData) {
        let sumX = 0, sumY = 0, sumZ = 0;
        let totalPoints = 0;

        countryData.group.children.forEach(child => {
            if (child instanceof THREE.Mesh) {
                const geometry = child.geometry;
                const positions = geometry.attributes.position.array;

                for (let i = 0; i < positions.length; i += 3) {
                    sumX += positions[i];
                    sumY += positions[i + 1];
                    sumZ += positions[i + 2];
                    totalPoints++;
                }
            }
        });

        if (totalPoints === 0) {
            return new THREE.Vector3(0, 0, 1);
        }

        // Calculer le centre en faisant la moyenne des points
        const centerPoint = new THREE.Vector3(
            sumX / totalPoints,
            sumY / totalPoints,
            sumZ / totalPoints
        );

        // Normaliser le point pour qu'il soit sur la surface du globe
        centerPoint.normalize().multiplyScalar(2);



        return centerPoint;
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    // Méthode pour orienter le globe vers un pays
    orientToCountry(countryCode) {
        console.log('Country code requested:', countryCode);

        // Obtenir le pays demandé sans modifier le pays à deviner
        const targetCountry = this.countries.get(countryCode.toUpperCase());
        if (!targetCountry) {
            console.error("Pays non trouvé:", countryCode);
            return;
        }

        // Bloquer les contrôles pendant l'animation
        this.isAnimating = true;

        // Étape 1 : Redresser le globe verticalement tout en conservant la rotation en longitude
        const currentEuler = new THREE.Euler().setFromQuaternion(this.globeGroup.quaternion, 'YXZ');
        const verticalQuaternion = new THREE.Quaternion();
        verticalQuaternion.setFromEuler(new THREE.Euler(0, currentEuler.y, 0, 'YXZ'));

        this.currentQuaternion.copy(this.globeGroup.quaternion);

        // Durée de chaque étape
        const duration = 1000;
        const startTime = Date.now();

        const animateVertical = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = this.easeInOutCubic(progress);

            // Interpolation vers la position verticale
            this.globeGroup.quaternion.slerpQuaternions(
                this.currentQuaternion,
                verticalQuaternion,
                easeProgress
            );

            if (progress < 1) {
                requestAnimationFrame(animateVertical);
            } else {
                // Une fois vertical, passer à l'étape 2 avec le pays cible
                this.rotateToCountry(targetCountry);
            }

            this.renderer.render(this.scene, this.camera);
        };

        animateVertical();
    }

    // Nouvelle méthode pour la deuxième étape de rotation vers le pays
    rotateToCountry(country) {
        

        // Stage 1: Ensure vertical orientation
        this.ensureVerticalOrientation(() => {

            // Calculate the country's center point
        const targetPoint = this.calculateCountryCenter(country);
        targetPoint.normalize();

        // Convert target point to spherical coordinates
        const spherical = new THREE.Spherical().setFromVector3(targetPoint);

        // Calculate target longitude and latitude
        // Careful conversion considering Three.js coordinate system
        const targetLongitude = -spherical.theta; 
        const targetLatitude = Math.PI/2 - spherical.phi;


            // Stage 2: Rotate to country's longitude
            this.rotateToLongitude(targetLongitude, () => {
                // Stage 3: Rotate to country's latitude
                this.rotateToLatitude(targetLatitude);
            });
        });
    }

    ensureVerticalOrientation(onComplete) {
        // Reset to completely vertical orientation


        const currentEuler = new THREE.Euler().setFromQuaternion(this.globeGroup.quaternion, 'YXZ');
        const verticalQuaternion = new THREE.Quaternion();
        verticalQuaternion.setFromEuler(new THREE.Euler(0, currentEuler.y, 0, 'YXZ'));

        const duration = 1000;
        const startTime = Date.now();
        const currentQuaternion = this.globeGroup.quaternion.clone();



        const animateVertical = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = this.easeInOutCubic(progress);

            this.globeGroup.quaternion.slerpQuaternions(
                currentQuaternion,
                verticalQuaternion,
                easeProgress
            );

            if (progress < 1) {
                requestAnimationFrame(animateVertical);
            } else {
                this.globeGroup.quaternion.copy(verticalQuaternion);
                if (onComplete) onComplete();
            }

            this.renderer.render(this.scene, this.camera);
        };

        animateVertical();
    }

    rotateToLongitude(targetLongitude, onComplete) {
        // Get current rotation
        const currentEuler = new THREE.Euler().setFromQuaternion(this.globeGroup.quaternion, 'YXZ');

        // Keep the current latitude (X rotation), change only longitude (Y rotation)
        const longitudeQuaternion = new THREE.Quaternion();
        longitudeQuaternion.setFromEuler(new THREE.Euler(currentEuler.x, targetLongitude, 0, 'YXZ'));

        const duration = 1000;
        const startTime = Date.now();
        const currentQuaternion = this.globeGroup.quaternion.clone();


        const animateLongitude = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = this.easeInOutCubic(progress);


            this.globeGroup.quaternion.slerpQuaternions(
                currentQuaternion,
                longitudeQuaternion,
                easeProgress
            );

            if (progress < 1) {
                requestAnimationFrame(animateLongitude);
            } else {
                this.globeGroup.quaternion.copy(longitudeQuaternion);  // Apply final rotation
                if (onComplete) onComplete();
            }

            this.renderer.render(this.scene, this.camera);
        };

        animateLongitude();
    }

    getShortestLatitudeRotation(currentLat, targetLat) {
        let delta = targetLat - currentLat;

        // Normalize rotation to avoid sudden flips
        if (delta > Math.PI) delta -= 2 * Math.PI;
        if (delta < -Math.PI) delta += 2 * Math.PI;

        return currentLat + delta;
    }
    rotateToLatitude(targetLatitude) {
        const currentEuler = new THREE.Euler().setFromQuaternion(this.globeGroup.quaternion, 'YXZ');

        // Get shortest path to target latitude
        const finalLatitude = this.getShortestLatitudeRotation(currentEuler.x, targetLatitude);

        // Apply only the latitude change first
        const latitudeQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(finalLatitude, 0, 0, 'YXZ'));

        // Multiply with the current longitude to avoid axis flips
        const targetQuaternion = new THREE.Quaternion().multiplyQuaternions(latitudeQuaternion, this.globeGroup.quaternion);

        const duration = 1000;
        const startTime = Date.now();
        const startQuaternion = this.globeGroup.quaternion.clone();

        const animateLatitude = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = this.easeInOutCubic(progress);

            this.globeGroup.quaternion.slerpQuaternions(
                startQuaternion,
                targetQuaternion,
                easeProgress
            );

            if (progress < 1) {
                requestAnimationFrame(animateLatitude);
            } else {
                this.globeGroup.quaternion.copy(targetQuaternion);
                this.isAnimating = false;
            }

            this.renderer.render(this.scene, this.camera);
        };

        animateLatitude();
    }




    // Nouvelle méthode pour la rotation en latitude
    rotateLatitude(latitude) {

        // Créer la rotation en latitude autour de l'axe X
     //    const latRotation = new THREE.Quaternion();
    //     latRotation.setFromAxisAngle(new THREE.Vector3(1, 0, 0), latitude);

        // Créer la rotation finale en décomposant la rotation actuelle
        const currentEuler = new THREE.Euler().setFromQuaternion(this.globeGroup.quaternion, 'YXZ');
        const finalRotation = new THREE.Quaternion();

        // Recréer la rotation avec la longitude actuelle et la nouvelle latitude
        finalRotation.setFromEuler(new THREE.Euler(latitude, currentEuler.y, 0, 'YXZ'));

        // Sauvegarder l'état actuel
        this.currentQuaternion.copy(this.globeGroup.quaternion);

        // Animation de la rotation en latitude
        const duration = 1000;
        const startTime = Date.now();

        const animateLatitude = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = this.easeInOutCubic(progress);

            // Interpolation pour la latitude
            this.globeGroup.quaternion.slerpQuaternions(
                this.currentQuaternion,
                finalRotation,
                easeProgress
            );

            if (progress < 1) {
                requestAnimationFrame(animateLatitude);
            } else {
                // Animation terminée
                this.globeGroup.quaternion.copy(finalRotation);
                this.isAnimating = false;
            }

            this.renderer.render(this.scene, this.camera);
        };

        animateLatitude();
    }

    // Animation de rotation vers une position cible avec quaternions
    animateToQuaternion() {
        const duration = 2000;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = this.easeInOutCubic(progress);

            // Interpolation sphérique entre les quaternions
            this.globeGroup.quaternion.slerpQuaternions(
                this.currentQuaternion,
                this.targetQuaternion,
                easeProgress
            );

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Assurer que nous sommes exactement à la position cible
                this.globeGroup.quaternion.copy(this.targetQuaternion);
                this.isAnimating = false;
            }

            this.renderer.render(this.scene, this.camera);
        };

        animate();
    }

    // Fonction d'easing pour une animation fluide
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    // Mise en évidence du pays cible
    highlightTargetCountry() {
        // Réinitialiser tous les pays avec leur couleur aléatoire et faible opacité
        this.countries.forEach(country => {
            country.meshes.forEach(mesh => {
                mesh.material.color.setHex(country.originalColor);
                mesh.material.opacity = 0.3;
                mesh.material.transparent = true;
                mesh.material.depthWrite = true;
                mesh.material.depthTest = true;
                mesh.material.side = THREE.FrontSide;
                mesh.material.needsUpdate = true;
                mesh.renderOrder = 0;
            });
        });

        // Mettre en évidence le pays cible en vert fluo avec opacité maximale
        if (this.currentTargetCountry) {
            this.currentTargetCountry.meshes.forEach(mesh => {
                mesh.material.color.setHex(0x00FF00); // Vert fluo
                mesh.material.opacity = 1.0;
            });
        }
    }

    // Méthode pour obtenir un pays aléatoire
    getRandomCountry() {
        // Convertir la Map en tableau de pays
        const countriesArray = Array.from(this.countries.values());
        // Sélectionner un pays aléatoire
        console.log('Available countries:', countriesArray);
        if (countriesArray.length === 0) return null;
        return countriesArray[Math.floor(Math.random() * countriesArray.length)];
    }

    // Méthode pour démarrer une nouvelle partie
    async startNewGame() {
        console.log("=== startNewGame ===");
        const randomCountry = this.getRandomCountry();
        if (!randomCountry) {
            console.error("Pas de pays sélectionné pour la nouvelle partie");
            return null;
        }
      //  getCountryByCode(gameData[0])
        // Sauvegarder le pays à deviner
        this.currentTargetCountry = randomCountry;

        console.log("Pays Cible", this.currentTargetCountry);
        console.log("Pays Cible", randomCountry);
        // Réinitialiser tous les pays
        this.countries.forEach(country => {
            country.meshes.forEach(mesh => {
                mesh.material.color.setHex(country.originalColor);
                mesh.material.opacity = 0.3;
                mesh.material.transparent = true;
                mesh.material.depthWrite = true;
                mesh.material.depthTest = true;
                mesh.material.side = THREE.FrontSide;
                mesh.material.needsUpdate = true;
                mesh.renderOrder = 0;
            });
        });

        // Mettre en évidence le pays à deviner
        this.currentTargetCountry.meshes.forEach(mesh => {
            mesh.material.color.setHex(0x00FF00);
            mesh.material.opacity = 1.0;
            mesh.material.transparent = true;
            mesh.material.depthWrite = true;
            mesh.material.depthTest = true;
            mesh.material.side = THREE.FrontSide;
            mesh.material.needsUpdate = true;
            mesh.renderOrder = 1;
        });

        console.log("Pays Cible B", this.currentTargetCountry);
        console.log("Pays Cible B", randomCountry);
        // Orienter le globe vers le pays à deviner
        this.orientToCountry(this.currentTargetCountry.code);

        return this.currentTargetCountry;
    }

    // Méthode pour obtenir un pays par son code ISO A2
    getCountryByCode(code) {
        if (!code) return null;
        return this.countries.get(code.toUpperCase());
    }

    // Nouvelle méthode pour obtenir la liste des noms de pays pour l'autocomplétion
    getCountryNamesList() {
        const names = [];
        this.countries.forEach(country => {
            if (country.names.fr) names.push(country.names.fr);
            if (country.names.en) names.push(country.names.en);
            if (country.names.es) names.push(country.names.es);
            if (country.names.ar) names.push(country.names.ar);
            if (country.names.bn) names.push(country.names.bn);
            if (country.names.de) names.push(country.names.de);
            if (country.names.el) names.push(country.names.el);
            if (country.names.hi) names.push(country.names.hi);
            if (country.names.he) names.push(country.names.he);
            if (country.names.hu) names.push(country.names.hu);
            if (country.names.id) names.push(country.names.id);
            if (country.names.it) names.push(country.names.it);
            if (country.names.ja) names.push(country.names.ja);
            if (country.names.ko) names.push(country.names.ko);
            if (country.names.nl) names.push(country.names.nl);
            if (country.names.pl) names.push(country.names.pl);
            if (country.names.pt) names.push(country.names.pt);
            if (country.names.ru) names.push(country.names.ru);
            if (country.names.sv) names.push(country.names.sv);
            if (country.names.tr) names.push(country.names.tr);
            if (country.names.uk) names.push(country.names.uk);
            if (country.names.ur) names.push(country.names.ur);
            if (country.names.vi) names.push(country.names.vi);
            if (country.names.zh) names.push(country.names.zh);
            if (country.names.zht) names.push(country.names.zht);
        });

        return names.sort();
    }

    // Nouvelle méthode pour obtenir un pays à partir de son nom dans n'importe quelle langue
    getCountryByName(name) {
        if (!name) return null;
        const code = this.countryNameToCode.get(name.toLowerCase());
        if (!code) {
            console.error("No country code found for name:", name);
            return null;
        }
        const country = this.countries.get(code);
        if (!country) {
            console.error("No country found for code:", code);
            return null;
        }
        return country;
    }

    // Nouvelle méthode pour activer/désactiver les contrôles
    setControlsEnabled(enabled) {
        this.controlsEnabled = enabled;
        if (this.controls) {
            this.controls.enabled = enabled;
        }
    }

    // Méthode pour déterminer si un pays est "grand"
    isLargeCountry(ring) {
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

    // Méthode utilitaire pour détecter si un pays traverse la ligne de changement de date
    detectDateLineCrossing(ring) {
        let previousLon = ring[0][0];
        for (let i = 1; i < ring.length; i++) {
            const currentLon = ring[i][0];
            if (Math.abs(currentLon - previousLon) > 180) {
                return true;
            }
            previousLon = currentLon;
        }
        return false;
    }

    createControlButtons() {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'globe-controls';
        buttonContainer.style.cssText = `
            position: absolute;
            bottom: 20px;
            right: 20px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            z-index: 1000;
        `;

        const createButton = (text, onClick) => {
            const button = document.createElement('button');
            button.textContent = text;
            button.style.cssText = `
                padding: 8px 16px;
                background: rgba(255, 255, 255, 0.8);
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: background-color 0.3s;
            `;
            button.addEventListener('mouseover', () => {
                button.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            });
            button.addEventListener('mouseout', () => {
                button.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
            });
            button.addEventListener('click', onClick);
            return button;
        };

        const resetButton = createButton('Reset View', () => this.orientToCountry(this.currentTargetCountry.code));


        buttonContainer.appendChild(resetButton);
        this.container.appendChild(buttonContainer);
    }

    resetView() {
        
        this.isAnimating = true;
        const targetQuaternion = new THREE.Quaternion();
        this.animateToQuaternion(targetQuaternion, () => {
            this.currentZoom = 5;
            this.camera.position.z = this.currentZoom;
            this.isAnimating = false;
        });
    }

    fillMeshHoles(mesh, countryName) {
        const geometry = mesh.geometry;

        // Vérifier si la géométrie a des indices
        if (!geometry.index) {
            console.warn(`La géométrie de ${countryName} n'a pas d'indices, impossible de combler les trous.`);
            return;
        }

        const positions = Array.from(geometry.attributes.position.array);
        const indices = Array.from(geometry.index.array);

        // Trouver les bords non connectés (trous)
        const edgeMap = new Map();
        for (let i = 0; i < indices.length; i += 3) {
            const a = indices[i];
            const b = indices[i + 1];
            const c = indices[i + 2];

            this.addEdgeToMap(edgeMap, a, b);
            this.addEdgeToMap(edgeMap, b, c);
            this.addEdgeToMap(edgeMap, c, a);
        }

        // Trouver les boucles de bords (trous)
        const holes = [];
        edgeMap.forEach((value, key) => {
            if (value.length === 1) {
                const start = key;
                const loop = [start];
                let current = value[0];

                while (current !== start) {
                    loop.push(current);
                    const nextEdges = edgeMap.get(current);
                    if (!nextEdges || nextEdges.length !== 1) break;
                    current = nextEdges[0];
                }

                if (loop.length > 2) {
                    holes.push(loop);
                }
            }
        });

        if (holes.length === 0) {
            console.log(`Aucun trou détecté pour ${countryName}.`);
            return;
        }

        console.log(`Comblement des trous pour ${countryName}.`);

        // Combler les trous
        const newPositions = [];
        const newIndices = [];
        holes.forEach(hole => {
            const center = new THREE.Vector3();
            hole.forEach(index => {
                center.add(new THREE.Vector3(
                    positions[index * 3],
                    positions[index * 3 + 1],
                    positions[index * 3 + 2]
                ));
            });
            center.divideScalar(hole.length);

            // Ajouter le centre comme un nouveau sommet
            const centerIndex = positions.length / 3;
            positions.push(center.x, center.y, center.z);

            // Créer des triangles pour combler le trou
            for (let i = 0; i < hole.length; i++) {
                const a = hole[i];
                const b = hole[(i + 1) % hole.length];
                newIndices.push(a, b, centerIndex);
            }
        });

        // Fusionner les nouvelles positions et indices avec la géométrie existante
        const mergedGeometry = new THREE.BufferGeometry();
        mergedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        mergedGeometry.setIndex([...indices, ...newIndices]);
        mergedGeometry.computeVertexNormals();

        // Remplacer la géométrie du mesh par la nouvelle géométrie fusionnée
        mesh.geometry.dispose(); // Libérer la mémoire de l'ancienne géométrie
        mesh.geometry = mergedGeometry;
    }

    addEdgeToMap(edgeMap, a, b) {
        if (!edgeMap.has(a)) edgeMap.set(a, []);
        if (!edgeMap.has(b)) edgeMap.set(b, []);
        edgeMap.get(a).push(b);
        edgeMap.get(b).push(a);
    }
}

export default Globe;