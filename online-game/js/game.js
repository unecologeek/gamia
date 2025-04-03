export default class Game {
    constructor(globe) {
        this.globe = globe;
        this.countryInput = document.getElementById('country-input');
        this.countryOptions = document.getElementById('country-options');
        this.score = 0;
        this.currentRound = 1;
        this.guessesLeft = 5;
        this.targetCountry = this.globe.getRandomCountry();
        this.globe.currentTargetCountry = this.targetCountry;
        this.countryNames = this.globe.getCountryNamesList() || [];
        this.setupUI();
        
    }

    setupUI() {
        // Mise à jour des informations du jeu
        this.updateGameInfo();

        // Gestion de l'autocomplete
        this.countryInput.addEventListener('input', () => this.handleInput());

        // Afficher toutes les options lorsque l'input reçoit le focus
        this.countryInput.addEventListener('focus', () => {
            this.showOptions(this.countryNames); // Affiche toutes les options disponibles
        });

        // Gestion de la soumission
        this.countryInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.handleGuess();
            }
        });

        // Fermer les options lors d'un clic en dehors
        document.addEventListener('click', (e) => {
            if (!this.countryInput.contains(e.target) && !this.countryOptions.contains(e.target)) {
                this.countryOptions.style.display = 'none';
            }
        });
    }

    updateGameInfo() {
        document.getElementById('round').textContent = `Round: ${this.currentRound}/3`;
        document.getElementById('score').textContent = `Score: ${this.score}`;
        document.getElementById('guesses-left').textContent = `Guesses left: ${this.guessesLeft}`;
    }

    handleInput() {
        console.log('Input:', this.countryInput.value);
        console.log('all:', this.countryNames);
    
        const input = this.countryInput.value.toLowerCase();
        if (input.length < 1) {
            this.countryOptions.style.display = 'none';
            return;
        }
    
        // Prioriser les pays qui commencent par la séquence
        const startsWithMatches = this.countryNames.filter(name =>
            name.toLowerCase().startsWith(input)
        );
    
        // Ajouter les pays qui contiennent la séquence ailleurs
        const containsMatches = this.countryNames.filter(name =>
            !name.toLowerCase().startsWith(input) && name.toLowerCase().includes(input)
        );
    
        // Combiner les deux listes
        const matches = [...startsWithMatches, ...containsMatches];
    
        console.log("Correspondances trouvées:", matches);
        this.showOptions(matches);
    }

    showOptions(matches) {
        this.countryOptions.innerHTML = '';
        if (matches.length > 0) {
            matches.forEach(country => {
                const option = document.createElement('div');
                option.className = 'country-option';
                option.textContent = country;
                option.addEventListener('click', () => {
                    console.log("Pays sélectionné:", country);
                    this.countryInput.value = country;
                    this.countryOptions.style.display = 'none';
                    this.handleGuess();
                });
                this.countryOptions.appendChild(option);
            });
            this.countryOptions.style.display = 'block';
        } else {
            this.countryOptions.style.display = 'none';
        }
    }

    handleGuess() {
        const guess = this.countryInput.value.trim();
        if (!guess) return;

        console.log("Tentative de deviner:", guess);

        // Obtenir le pays deviné à partir du nom
        const guessedCountry = this.globe.getCountryByName(guess);
        if (!guessedCountry) {
            console.log("Pays non trouvé:", guess);
            return;
        }

        console.log("Pays deviné:", guessedCountry.code);
        console.log("Pays à deviner:", this.targetCountry.code);

        // Orienter le globe vers le pays deviné
        this.globe.orientToCountry(guessedCountry.code);

        // Vérifier si c'est le bon pays en comparant les codes ISO A2
        if (guessedCountry.code === this.targetCountry.code) {
            console.log("Bonne réponse!");
            this.handleCorrectGuess();
        } else {
            console.log("Mauvaise réponse!");
            this.globe.wrongGuess(guessedCountry.code);
            this.handleWrongGuess();
        }

        // Vider l'input et cacher les options
        this.countryInput.value = '';
        this.countryOptions.style.display = 'none';
    }

    handleCorrectGuess() {
        // Mettre à jour le score avant l'animation
        this.score++;
        this.updateGameInfo();

        // Mettre en évidence le pays en vert
        this.targetCountry.meshes.forEach(mesh => {
            mesh.material.color.setHex(0x00FF00);
            mesh.material.opacity = 1.0;
        });

        // Passer au round suivant ou terminer le jeu
        setTimeout(() => {
            if (this.currentRound < 3) {
                this.currentRound++;
                this.startNewRound();
            } else {
                this.endGame();
            }
        }, 1500);
    }

    handleWrongGuess() {
        this.guessesLeft--;
        this.updateGameInfo();

        if (this.guessesLeft === 0) {
            setTimeout(() => {
                if (this.currentRound < 3) {
                    this.currentRound++;
                    this.startNewRound();
                } else {
                    this.endGame();
                }
            }, 1500);
        }
    }

    startNewRound() {
        this.guessesLeft = 5;

        this.targetCountry.color = 0x0000FF;
        // Obtenir un nouveau pays cible
        this.targetCountry = this.globe.getRandomCountry();
        this.globe.currentTargetCountry  = this.targetCountry;

        if (!this.targetCountry) {
            console.error("Impossible de démarrer un nouveau round : pas de pays cible");
            return;
        }

        console.log("Nouveau pays cible:", this.targetCountry);

        // Réinitialiser les couleurs de tous les pays
        this.globe.countries.forEach(country => {
            country.meshes.forEach(mesh => {
                mesh.material.color.setHex(country.originalColor);
                mesh.material.opacity = 0.3;
            });
        });

        // Mettre en évidence le pays cible en vert
        this.targetCountry.meshes.forEach(mesh => {
            mesh.material.color.setHex(0x00FF00);
            mesh.material.opacity = 1.0;
        });

        // Orienter le globe vers le pays cible
        this.globe.orientToCountry(this.targetCountry.code);

        this.updateGameInfo();
    }

    endGame() {
        alert(`Game Over! Final score: ${this.score}`);
        // Réinitialiser le jeu
        this.score = 0;
        this.currentRound = 1;
        this.guessesLeft = 3;
        this.startNewRound();
    }

    start() {
        // ... game start logic ...

        
        this.targetCountry.meshes.forEach(mesh => {
            mesh.material.color.setHex(0x00FF00); // Vert fluo
            mesh.material.opacity = 1.0;
        });
            this.globe.orientToCountry(this.targetCountry.code);
    }
} 