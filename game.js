let game;
let player, enemies, stars, score = 0, damage = 0, scoreText, damageBar, gameOver = false;
let backgroundMusic, collectSound;
let planetEnemies = [];  // Arreglo para manejar múltiples planetas enemigos

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,  // Ajuste para responsividad
    height: window.innerHeight, // Ajuste para responsividad
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

function preload() {
    console.log("Cargando recursos...");
    this.load.image('background', 'https://labs.phaser.io/assets/skies/space3.png');
    this.load.image('star', 'https://labs.phaser.io/assets/demoscene/star.png');
    this.load.spritesheet('character1', 'https://labs.phaser.io/assets/sprites/phaser-dude.png', { frameWidth: 32, frameHeight: 48 });
    this.load.spritesheet('enemy', 'https://labs.phaser.io/assets/sprites/ufo.png', { frameWidth: 32, frameHeight: 32 });
    this.load.image('planet', 'https://labs.phaser.io/assets/sprites/shinyball.png'); // Planeta enemigo
}

function create() {
    console.log("Creando escena...");
    
    // Añadir el fondo
    this.add.image(config.width / 2, config.height / 2, 'background').setDisplaySize(config.width, config.height);

    // Iniciar la música de fondo
    startBackgroundMusic();

    // Crear el sonido de recoger estrellas
    collectSound = new Audio('music.mp3');

    // Crear el jugador
    player = this.physics.add.sprite(100, 100, 'character1').setScale(1.5);
    player.setCollideWorldBounds(true);

    // Crear enemigos (naves)
    enemies = this.physics.add.group({
        key: 'enemy',
        repeat: 5,
        setXY: { x: 120, y: 120, stepX: 120 }
    });

    enemies.children.iterate(function (child) {
        child.setBounce(1);
        child.setCollideWorldBounds(true);
        child.setVelocity(Phaser.Math.Between(-100, 100), Phaser.Math.Between(-100, 100));
    });

    // Crear estrellas (coleccionables)
    createStars.call(this);

    this.physics.add.collider(enemies, enemies);

    // Detección de colisión entre el jugador y las estrellas
    this.physics.add.overlap(player, stars, collectStar, null, this);

    // Detección de colisión entre el jugador y los enemigos
    this.physics.add.collider(player, enemies, hitEnemy, null, this);

    // Texto de puntuación y barra de daño dentro del juego
    scoreText = this.add.text(16, 16, 'Puntuación: 0', { fontSize: '32px', fill: '#fff' });
    damageBar = this.add.graphics();
    updateDamageBar();

    // Escuchar eventos de movimiento del cursor
    this.input.on('pointermove', function (pointer) {
        if (!gameOver) {
            player.x = pointer.x;
            player.y = pointer.y;
        }
    });
}

function update() {
    if (gameOver) {
        return;
    }

    // Crear nuevos planetas enemigos cada 80 puntos
    if (score >= 80 && score % 80 === 0 && planetEnemies.length < score / 80) {
        createPlanetEnemy.call(this);
    }

    // Hacer que cada planeta enemigo siga al jugador
    planetEnemies.forEach((planetEnemy) => {
        this.physics.moveToObject(planetEnemy, player, 100 + (score / 10)); // Aumentar la velocidad según el puntaje
    });

    // Regenerar estrellas si todas han sido recogidas
    if (stars.countActive(true) === 0) {
        createStars.call(this);
    }

    // Verificar si el puntaje llega a 500
    if (score >= 500) {
        gameOver = true;
        this.physics.pause();
        player.setTint(0x00ff00); // Tint el jugador para indicar que ha ganado
        stopBackgroundMusic();
        
        // Mostrar mensaje de victoria
        const menuContainer = document.getElementById('menu-container');
        if (menuContainer) {
            menuContainer.style.display = 'block';
            menuContainer.innerHTML = `
                <h1 class="display-4 text-success">¡Felicidades, Ganaste!</h1>
                <button id="restart-button" class="btn btn-primary btn-lg m-2">Reintentar</button>
                <button id="exit-button" class="btn btn-danger btn-lg m-2">Salir</button>
            `;
            document.getElementById('restart-button').addEventListener('click', restartGame);
            document.getElementById('exit-button').addEventListener('click', exitGame);
        }
    }
}

function createPlanetEnemy() {
    let planetEnemy = this.physics.add.sprite(Phaser.Math.Between(100, config.width - 100), Phaser.Math.Between(100, config.height - 100), 'planet').setScale(1.5);
    planetEnemy.setBounce(1);
    planetEnemy.setCollideWorldBounds(true);
    enemies.add(planetEnemy); // Añadir el planeta al grupo de enemigos
    planetEnemies.push(planetEnemy); // Añadir el planeta al arreglo de planetas

    // Detección de colisión entre el jugador y el planeta enemigo
    this.physics.add.collider(player, planetEnemy, hitEnemy, null, this);
}

function createStars() {
    stars = this.physics.add.group();

    for (let i = 0; i < 50; i++) {
        let x = Phaser.Math.Between(50, config.width - 50);
        let y = Phaser.Math.Between(50, config.height - 50);
        let star = stars.create(x, y, 'star');
        star.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
        star.setScale(0.8);
    }

    this.physics.add.overlap(player, stars, collectStar, null, this); // Asegura que las nuevas estrellas sean detectadas
}

function collectStar(player, star) {
    star.disableBody(true, true);
    score += 10;
    scoreText.setText('Puntuación: ' + score);  // Actualiza el texto del puntaje

    // Reproducir el sonido de recoger estrellas
    collectSound.play().catch(error => {
        console.error("Error al reproducir el sonido de recoger estrellas: ", error);
    });
}

function hitEnemy(player, enemy) {
    damage += 25; // Aumentar el daño en 25 puntos por colisión
    updateDamageBar();  // Actualizar la barra de daño

    if (damage >= 100) {
        gameOver = true;
        this.physics.pause();
        player.setTint(0xff0000);

        // Detener la música
        stopBackgroundMusic();

        // Cambiar el texto del menú a "Juego Terminado"
        const menuContainer = document.getElementById('menu-container');
        if (menuContainer) {
            menuContainer.style.display = 'block';
            menuContainer.innerHTML = `
                <h1 class="display-4 text-danger">¡Juego Terminado!</h1>
                <button id="restart-button" class="btn btn-primary btn-lg m-2">Reintentar</button>
                <button id="exit-button" class="btn btn-danger btn-lg m-2">Salir</button>
            `;
            document.getElementById('restart-button').addEventListener('click', restartGame);
            document.getElementById('exit-button').addEventListener('click', exitGame);
        }
    } else {
        player.clearTint();
        player.setPosition(100, 100); // Reubicar al jugador después de ser golpeado
    }
}

function updateDamageBar() {
    damageBar.clear();
    damageBar.fillStyle(0xff0000, 1);
    damageBar.fillRect(16, 56, (config.width / 4) * (damage / 100), 20); // Dibujar la barra de daño
    damageBar.lineStyle(2, 0xffffff);
    damageBar.strokeRect(16, 56, config.width / 4, 20); // Bordes de la barra de daño
}

function startGame() {
    console.log("Iniciando el juego...");

    // Crear el juego solo cuando se presiona el botón de inicio
    if (game) {
        game.destroy(true); // Destruir juego anterior si existe
    }
    game = new Phaser.Game(config);

    // Ocultar el contenedor del menú, el botón de inicio, el botón de salida, y cualquier mensaje anterior
    const menuContainer = document.getElementById('menu-container');
    const gameOverText = document.getElementById('game-over-text');
    const restartButton = document.getElementById('restart-button');

    if (menuContainer) {
        menuContainer.style.display = 'none';
    }
    if (gameOverText) {
        gameOverText.style.display = 'none';
    }
    if (restartButton) {
        restartButton.style.display = 'none';
    }

    // Restablecer variables
    gameOver = false;
    score = 0;
    damage = 0;
    planetEnemies = [];  // Reiniciar la lista de planetas enemigos
    updateDamageBar(); // Reiniciar la barra de daño
}

function restartGame() {
    console.log("Reiniciando el juego...");
    startGame(); // Utiliza la función startGame para reiniciar el juego completo
}

function exitGame() {
    // Lógica para salir del juego o redirigir a otra página
    alert("Gracias por jugar. ¡Hasta la próxima!");
    window.close(); // Esto intentará cerrar la ventana actual
}

// Añadir eventos de los botones de inicio y salida
document.getElementById('start-button').addEventListener('click', startGame);
document.getElementById('exit-button').addEventListener('click', exitGame);

// Redimensionar el juego al tamaño de la ventana
window.addEventListener('resize', () => {
    if (game) {
        game.scale.resize(window.innerWidth, window.innerHeight);
    }
});

function startBackgroundMusic() {
    backgroundMusic = new Audio('musica.mp3');
    backgroundMusic.loop = true;  // Loopa la música para que no se detenga
    backgroundMusic.volume = 0.5;  // Ajusta el volumen (0.0 a 1.0)
    backgroundMusic.play().then(() => {
        console.log("Música de fondo reproduciéndose.");
    }).catch(error => {
        console.error("Error al reproducir la música de fondo: ", error);
    });
}

function stopBackgroundMusic() {
    if (backgroundMusic) {
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0; // Reiniciar la música
        console.log("Música de fondo detenida.");
    }
}
